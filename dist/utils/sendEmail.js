"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeEmailConnection = exports.verifyEmailConnection = exports.sendEmail = exports.connectViaOs = exports.isEmailConfigured = void 0;
const net_1 = __importDefault(require("net"));
const nodemailer_1 = __importDefault(require("nodemailer"));
const resend_1 = require("resend");
const logger_1 = __importDefault(require("./logger"));
const CONNECTION_TIMEOUT_MS = 10_000;
const SENDGRID_ENDPOINT = 'https://api.sendgrid.com/v3/mail/send';
/**
 * SMTP settings (Gmail with an App Password, or any SMTP server), or null when
 * they are not all present. Port 465 is implicit TLS; anything else (587) must
 * upgrade with STARTTLS, and `requireTLS` refuses to continue in plaintext if
 * the server doesn't offer it.
 */
const smtpConfig = () => {
    const host = process.env.SMTP_HOST?.trim();
    const user = process.env.SMTP_USER?.trim();
    const pass = process.env.SMTP_PASS;
    if (!host || !user || !pass)
        return null;
    const port = Number(process.env.SMTP_PORT) || 587;
    return { host, port, user, pass, from: process.env.SMTP_FROM?.trim() || user };
};
/**
 * Resend: an API key and a sender address on a domain verified in Resend.
 * Takes precedence over SMTP and SendGrid when present — exactly one provider
 * sends each message.
 */
const resendConfig = () => {
    const apiKey = process.env.RESEND_API_KEY?.trim();
    const from = process.env.FROM_EMAIL?.trim();
    return apiKey && from ? { apiKey, from } : null;
};
const sendGridConfigured = () => Boolean(process.env.SENDGRID_API_KEY?.trim() && process.env.SENDGRID_FROM_EMAIL?.trim());
/**
 * Whether outbound email is configured: Resend, else SMTP, else SendGrid. When
 * none is, sending is a safe no-op so order flows behave as before.
 */
const isEmailConfigured = () => Boolean(resendConfig()) || Boolean(smtpConfig()) || sendGridConfigured();
exports.isEmailConfigured = isEmailConfigured;
let resendClient = null;
const getResend = () => {
    const c = resendConfig();
    if (!c)
        return null;
    resendClient ??= new resend_1.Resend(c.apiKey);
    return resendClient;
};
/** Plain-language pointer for a Resend refusal, logged next to the raw error. */
const resendHint = (error) => {
    const name = error.name || '';
    if (/api_key/.test(name))
        return 'check RESEND_API_KEY (missing, invalid, or not allowed to send)';
    // Resend's shared test sender (onboarding@resend.dev) delivers only to the
    // Resend account's own address; every other recipient gets this refusal.
    if (/only send testing emails to your own email address/i.test(error.message || ''))
        return "FROM_EMAIL is Resend's test sender, which only delivers to the Resend account's own address: to email customers, verify your domain in Resend and set FROM_EMAIL to an address on it";
    if (/domain.*not verified|verify a domain|not verified/i.test(error.message || ''))
        return `FROM_EMAIL's domain is not verified in Resend: add the DNS records Resend lists for it, then verify (Resend → Domains)`;
    if (name === 'rate_limit_exceeded' || error.statusCode === 429)
        return 'Resend rate limit reached; the customer can retry after the cooldown';
    if (name === 'daily_quota_exceeded' || name === 'monthly_quota_exceeded')
        return 'Resend sending quota used up for this plan';
    if (name === 'application_error' && error.statusCode == null)
        return 'could not reach api.resend.com: no network or a proxy/firewall in the way';
    if (name === 'validation_error')
        return 'Resend rejected the message fields (sender, recipient or content)';
    return 'unexpected Resend error';
};
/**
 * Open the SMTP socket through the operating system's resolver.
 *
 * Left to itself, nodemailer resolves the host with its own DNS queries and
 * treats any non-loopback IPv6 address as working IPv6 — including the
 * link-local fe80:: address every Wi-Fi adapter carries, which cannot reach the
 * internet. On an IPv4-only network it then dialled the server's IPv6 address
 * first and waited ~21s for it to fail, past the connection timeout, so every
 * send failed with ETIMEDOUT. `net.connect()` resolves through the OS, which
 * only returns address families the machine can actually reach, and still
 * races IPv6 against IPv4 where both work.
 *
 * TLS is unaffected: nodemailer upgrades this socket itself (STARTTLS, or
 * implicit TLS on 465) and verifies the certificate against SMTP_HOST.
 */
const connectViaOs = (options, callback) => {
    const port = Number(options.port) || 587;
    let settled = false;
    const settle = (err, socket) => {
        if (settled)
            return;
        settled = true;
        callback(err, socket ? { connection: socket } : undefined);
    };
    const socket = net_1.default.connect({ host: options.host, port });
    socket.setTimeout(CONNECTION_TIMEOUT_MS, () => {
        socket.destroy();
        settle(Object.assign(new Error(`Connection to ${options.host}:${port} timed out`), { code: 'ETIMEDOUT' }));
    });
    // Stays attached after connecting so a late error can't go unhandled;
    // nodemailer adds its own handlers once it takes the socket.
    socket.on('error', (err) => settle(Object.assign(err, { code: err.code || 'ECONNECTION' })));
    socket.once('connect', () => {
        socket.setTimeout(0); // nodemailer's socketTimeout governs from here
        settle(null, socket);
    });
};
exports.connectViaOs = connectViaOs;
/** `be…@gmail.com` — enough to recognise the account in a log, not to copy it. */
const maskAddress = (addr) => addr.replace(/^(.{2}).*(@.*)$/, '$1…$2');
/**
 * A plain-language pointer for the server log, next to the raw error, so the
 * next person reading it doesn't have to decode nodemailer's error codes.
 */
const smtpHint = (err) => {
    const code = err?.code;
    const message = String(err?.message || '');
    if (code === 'EAUTH')
        return 'the SMTP server rejected the login: check SMTP_USER and SMTP_PASS (for Gmail, an App Password)';
    if (/certificate/i.test(message))
        return 'TLS certificate not trusted: something between this machine and the SMTP server is intercepting TLS (antivirus mail/HTTPS scanning, a proxy)';
    if (code === 'ETIMEDOUT' || code === 'ECONNECTION' || code === 'ESOCKET' || code === 'EDNS')
        return `could not reach ${process.env.SMTP_HOST}:${process.env.SMTP_PORT || 587}: no network, the port is blocked, or a proxy/antivirus is in the way`;
    if (code === 'EENVELOPE' || code === 'EMESSAGE')
        return 'the SMTP server refused the sender or a recipient';
    return 'unexpected SMTP error';
};
/** One pooled transporter for the process, created on first use. */
let transporter = null;
const getTransporter = () => {
    if (transporter)
        return transporter;
    const c = smtpConfig();
    if (!c)
        return null;
    transporter = nodemailer_1.default.createTransport({
        host: c.host,
        port: c.port,
        secure: c.port === 465,
        requireTLS: c.port !== 465,
        auth: { user: c.user, pass: c.pass },
        pool: true,
        maxConnections: 3,
        connectionTimeout: CONNECTION_TIMEOUT_MS,
        greetingTimeout: 10_000,
        socketTimeout: 20_000,
        getSocket: exports.connectViaOs,
    });
    return transporter;
};
const fromName = () => (process.env.FROM_NAME || 'Belovi').trim();
/**
 * Send a transactional email through Resend (preferred), SMTP, or the SendGrid
 * HTTP API — whichever is configured first, and only that one.
 *
 * - If email is not configured, this is a safe no-op that logs and returns
 *   `{ skipped: true }` — preserving the previous behaviour.
 * - Never throws on a delivery failure: order flows must not break because an
 *   email couldn't be sent. Failures are logged and returned as `{ success: false }`.
 * - `success` means the server ACCEPTED the message, not that it reached an
 *   inbox; spam filtering and bounces happen after this returns.
 *
 * @param options - Email options (recipient, subject, content)
 */
const sendEmail = async (options) => {
    // Validate recipient to preserve previous behaviour for callers.
    if (!options.email || !options.email.includes('@')) {
        throw new Error('Invalid recipient email address');
    }
    const tag = options.logTag ? `[${options.logTag}] ` : '';
    const resend = getResend();
    if (resend) {
        const started = Date.now();
        // The SDK never throws: refusals and network failures both come back as
        // `error`. `data.id` is Resend's id for the accepted message.
        const content = options.html
            ? { html: options.html, ...(options.message ? { text: options.message } : {}) }
            : { text: options.message ?? '' };
        const { data, error } = await resend.emails.send({
            from: `${fromName()} <${resendConfig().from}>`,
            to: [options.email],
            subject: options.subject,
            ...content,
        });
        if (error || !data?.id) {
            const e = error ?? { name: 'no_id', message: 'Resend returned no message id' };
            logger_1.default.error(`${tag}Resend send failed for ${options.email} after ${Date.now() - started}ms: ` +
                `${e.name}${e.statusCode ? ` ${e.statusCode}` : ''} ${e.message} — ${resendHint(e)}`);
            return { success: false, provider: 'resend', error: e.name };
        }
        logger_1.default.info(`${tag}✉️  Resend accepted "${options.subject}" for ${options.email} in ${Date.now() - started}ms (id ${data.id})`);
        return { success: true, provider: 'resend', messageId: data.id };
    }
    const smtp = getTransporter();
    if (smtp) {
        const started = Date.now();
        try {
            const info = await smtp.sendMail({
                from: { name: fromName(), address: smtpConfig().from },
                to: options.email,
                subject: options.subject,
                text: options.message,
                html: options.html,
            });
            logger_1.default.info(`${tag}✉️  SMTP accepted "${options.subject}" for ${options.email} in ${Date.now() - started}ms (${info.response || 'no reply text'})`);
            return { success: true, provider: 'smtp', messageId: info.messageId };
        }
        catch (err) {
            // `code` is nodemailer's category (EAUTH, ECONNECTION, ETIMEDOUT, EENVELOPE…)
            // and `responseCode`/message carry the server's reply — never the credentials.
            logger_1.default.error(`${tag}SMTP send failed for ${options.email} after ${Date.now() - started}ms: ` +
                `${err?.code || 'ERROR'}${err?.responseCode ? ` ${err.responseCode}` : ''} ${err?.message || err} — ${smtpHint(err)}`);
            return { success: false, provider: 'smtp', error: err?.code || 'SEND_FAILED' };
        }
    }
    if (!sendGridConfigured()) {
        logger_1.default.info(`📭 Email disabled (no Resend, SMTP or SendGrid config). Skipping "${options.subject}" to ${options.email}`);
        return { success: true, provider: 'disabled', skipped: true };
    }
    const fromEmail = process.env.SENDGRID_FROM_EMAIL.trim();
    // SendGrid requires text/plain before text/html when both are present.
    const content = [
        ...(options.message ? [{ type: 'text/plain', value: options.message }] : []),
        ...(options.html ? [{ type: 'text/html', value: options.html }] : []),
    ];
    const payload = {
        personalizations: [{ to: [{ email: options.email }] }],
        from: { email: fromEmail, name: fromName() },
        subject: options.subject,
        content: content.length ? content : [{ type: 'text/plain', value: '' }],
    };
    try {
        const res = await fetch(SENDGRID_ENDPOINT, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${process.env.SENDGRID_API_KEY.trim()}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });
        if (!res.ok) {
            const detail = await res.text().catch(() => '');
            logger_1.default.error(`SendGrid send failed (${res.status}) for ${options.email}: ${detail}`);
            return { success: false, provider: 'sendgrid', status: res.status };
        }
        logger_1.default.info(`✉️  Email sent to ${options.email}: "${options.subject}"`);
        return { success: true, provider: 'sendgrid', messageId: res.headers.get('x-message-id') };
    }
    catch (err) {
        // Swallow the error so callers (order/payment flows) are never broken by email.
        logger_1.default.error(`SendGrid request error for ${options.email}: ${err?.message || err}`);
        return { success: false, provider: 'sendgrid', error: err?.message };
    }
};
exports.sendEmail = sendEmail;
/**
 * Check email delivery at startup: SMTP settings are complete and the server
 * accepts the login. Logs the outcome and never throws — a mail outage must not
 * stop the shop from serving; registration reports it as 503 instead.
 */
const verifyEmailConnection = async () => {
    if (Boolean(process.env.RESEND_API_KEY?.trim()) !== Boolean(process.env.FROM_EMAIL?.trim())) {
        logger_1.default.error(`Resend is partly configured — missing ${process.env.RESEND_API_KEY?.trim() ? 'FROM_EMAIL' : 'RESEND_API_KEY'}. Resend email is disabled.`);
    }
    const resend = getResend();
    if (resend) {
        const from = resendConfig().from;
        const domain = from.split('@')[1]?.toLowerCase();
        const summary = `from ${fromName()} <${from}>, API key set`;
        // Listing domains needs a full-access key. A send-only key (the safer
        // choice) can't, and Resend then checks the domain on every send instead.
        const { data, error } = await resend.domains.list();
        if (error) {
            if (error.name === 'restricted_api_key') {
                logger_1.default.info(`✉️  Resend email configured — ${summary} (send-only key: domain verification is checked by Resend on each send)`);
                return true;
            }
            logger_1.default.error(`Resend check failed — ${summary}: ${error.name} ${error.message} — ${resendHint(error)}`);
            return false;
        }
        const match = data?.data?.find((d) => d.name.toLowerCase() === domain);
        if (match?.status === 'verified') {
            logger_1.default.info(`✉️  Resend email delivery ready — ${summary}, domain ${domain} verified`);
            return true;
        }
        logger_1.default.error(`Resend: ${domain} is ${match ? `"${match.status}"` : 'not added'} in this Resend account — ${summary}. ` +
            'Sends will be refused until the domain is verified (Resend → Domains, then add its DNS records).');
        return false;
    }
    const partial = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'].filter((k) => !process.env[k]);
    if (partial.length && partial.length < 3) {
        logger_1.default.error(`SMTP is partly configured — missing ${partial.join(', ')}. SMTP email is disabled.`);
    }
    const smtp = getTransporter();
    if (smtp) {
        const c = smtpConfig();
        // What the process actually loaded, minus secrets: the password is reported
        // only as present.
        const summary = `${c.host}:${c.port} (${c.port === 465 ? 'implicit TLS' : 'STARTTLS required'}), ` +
            `user ${maskAddress(c.user)}, from ${c.from}, password set`;
        try {
            await smtp.verify();
            logger_1.default.info(`✉️  SMTP email delivery ready — ${summary}`);
            return true;
        }
        catch (err) {
            logger_1.default.error(`SMTP login check failed — ${summary}: ${err?.code || 'ERROR'} ${err?.message || err} — ${smtpHint(err)}`);
            return false;
        }
    }
    const configured = sendGridConfigured();
    logger_1.default.info(configured ? '✉️  Email delivery is configured (SendGrid)' : '📭 Email delivery is disabled');
    return configured;
};
exports.verifyEmailConnection = verifyEmailConnection;
/** Close the SMTP pool; the next send opens a fresh one. */
const closeEmailConnection = () => {
    transporter?.close();
    transporter = null;
    resendClient = null;
};
exports.closeEmailConnection = closeEmailConnection;
//# sourceMappingURL=sendEmail.js.map