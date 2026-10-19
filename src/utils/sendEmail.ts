import net from 'net';
import nodemailer, { type Transporter } from 'nodemailer';
import logger from './logger';

// Email configuration interface
interface EmailOptions {
  email: string;
  subject: string;
  /** Plain-text body. Sent alongside `html` as its readable alternative. */
  message?: string;
  html?: string;
  /** Prefixed to this send's log lines, e.g. a request id, to correlate them. */
  logTag?: string;
}

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
  if (!host || !user || !pass) return null;
  const port = Number(process.env.SMTP_PORT) || 587;
  return { host, port, user, pass, from: process.env.SMTP_FROM?.trim() || user };
};

const sendGridConfigured = () =>
  Boolean(process.env.SENDGRID_API_KEY?.trim() && process.env.SENDGRID_FROM_EMAIL?.trim());

/**
 * Whether outbound email is configured: SMTP first, else SendGrid. When neither
 * is, sending is a safe no-op so order flows behave as before.
 */
export const isEmailConfigured = (): boolean => Boolean(smtpConfig()) || sendGridConfigured();

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
export const connectViaOs = (
  options: { host?: string; port?: number | string },
  callback: (err: Error | null, socketOptions?: { connection: net.Socket }) => void
) => {
  const port = Number(options.port) || 587;
  let settled = false;
  const settle = (err: Error | null, socket?: net.Socket) => {
    if (settled) return;
    settled = true;
    callback(err, socket ? { connection: socket } : undefined);
  };
  const socket = net.connect({ host: options.host, port });
  socket.setTimeout(CONNECTION_TIMEOUT_MS, () => {
    socket.destroy();
    settle(Object.assign(new Error(`Connection to ${options.host}:${port} timed out`), { code: 'ETIMEDOUT' }));
  });
  // Stays attached after connecting so a late error can't go unhandled;
  // nodemailer adds its own handlers once it takes the socket.
  socket.on('error', (err) => settle(Object.assign(err, { code: (err as any).code || 'ECONNECTION' })));
  socket.once('connect', () => {
    socket.setTimeout(0); // nodemailer's socketTimeout governs from here
    settle(null, socket);
  });
};

/** `be…@gmail.com` — enough to recognise the account in a log, not to copy it. */
const maskAddress = (addr: string) => addr.replace(/^(.{2}).*(@.*)$/, '$1…$2');

/**
 * A plain-language pointer for the server log, next to the raw error, so the
 * next person reading it doesn't have to decode nodemailer's error codes.
 */
const smtpHint = (err: any): string => {
  const code = err?.code;
  const message = String(err?.message || '');
  if (code === 'EAUTH') return 'the SMTP server rejected the login: check SMTP_USER and SMTP_PASS (for Gmail, an App Password)';
  if (/certificate/i.test(message)) return 'TLS certificate not trusted: something between this machine and the SMTP server is intercepting TLS (antivirus mail/HTTPS scanning, a proxy)';
  if (code === 'ETIMEDOUT' || code === 'ECONNECTION' || code === 'ESOCKET' || code === 'EDNS') return `could not reach ${process.env.SMTP_HOST}:${process.env.SMTP_PORT || 587}: no network, the port is blocked, or a proxy/antivirus is in the way`;
  if (code === 'EENVELOPE' || code === 'EMESSAGE') return 'the SMTP server refused the sender or a recipient';
  return 'unexpected SMTP error';
};

/** One pooled transporter for the process, created on first use. */
let transporter: Transporter | null = null;

const getTransporter = (): Transporter | null => {
  if (transporter) return transporter;
  const c = smtpConfig();
  if (!c) return null;
  transporter = nodemailer.createTransport({
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
    getSocket: connectViaOs,
  });
  return transporter;
};

const fromName = () => (process.env.FROM_NAME || 'Belovi').trim();

/**
 * Send a transactional email over SMTP (preferred) or the SendGrid HTTP API.
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
export const sendEmail = async (options: EmailOptions): Promise<any> => {
  // Validate recipient to preserve previous behaviour for callers.
  if (!options.email || !options.email.includes('@')) {
    throw new Error('Invalid recipient email address');
  }

  const tag = options.logTag ? `[${options.logTag}] ` : '';
  const smtp = getTransporter();
  if (smtp) {
    const started = Date.now();
    try {
      const info = await smtp.sendMail({
        from: { name: fromName(), address: smtpConfig()!.from },
        to: options.email,
        subject: options.subject,
        text: options.message,
        html: options.html,
      });
      logger.info(
        `${tag}✉️  SMTP accepted "${options.subject}" for ${options.email} in ${Date.now() - started}ms (${info.response || 'no reply text'})`
      );
      return { success: true, provider: 'smtp', messageId: info.messageId };
    } catch (err: any) {
      // `code` is nodemailer's category (EAUTH, ECONNECTION, ETIMEDOUT, EENVELOPE…)
      // and `responseCode`/message carry the server's reply — never the credentials.
      logger.error(
        `${tag}SMTP send failed for ${options.email} after ${Date.now() - started}ms: ` +
          `${err?.code || 'ERROR'}${err?.responseCode ? ` ${err.responseCode}` : ''} ${err?.message || err} — ${smtpHint(err)}`
      );
      return { success: false, provider: 'smtp', error: err?.code || 'SEND_FAILED' };
    }
  }

  if (!sendGridConfigured()) {
    logger.info(`📭 Email disabled (no SMTP or SendGrid config). Skipping "${options.subject}" to ${options.email}`);
    return { success: true, provider: 'disabled', skipped: true };
  }

  const fromEmail = process.env.SENDGRID_FROM_EMAIL!.trim();

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
        Authorization: `Bearer ${process.env.SENDGRID_API_KEY!.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      logger.error(`SendGrid send failed (${res.status}) for ${options.email}: ${detail}`);
      return { success: false, provider: 'sendgrid', status: res.status };
    }

    logger.info(`✉️  Email sent to ${options.email}: "${options.subject}"`);
    return { success: true, provider: 'sendgrid', messageId: res.headers.get('x-message-id') };
  } catch (err: any) {
    // Swallow the error so callers (order/payment flows) are never broken by email.
    logger.error(`SendGrid request error for ${options.email}: ${err?.message || err}`);
    return { success: false, provider: 'sendgrid', error: err?.message };
  }
};

/**
 * Check email delivery at startup: SMTP settings are complete and the server
 * accepts the login. Logs the outcome and never throws — a mail outage must not
 * stop the shop from serving; registration reports it as 503 instead.
 */
export const verifyEmailConnection = async (): Promise<boolean> => {
  const partial = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'].filter((k) => !process.env[k]);
  if (partial.length && partial.length < 3) {
    logger.error(`SMTP is partly configured — missing ${partial.join(', ')}. SMTP email is disabled.`);
  }

  const smtp = getTransporter();
  if (smtp) {
    const c = smtpConfig()!;
    // What the process actually loaded, minus secrets: the password is reported
    // only as present.
    const summary =
      `${c.host}:${c.port} (${c.port === 465 ? 'implicit TLS' : 'STARTTLS required'}), ` +
      `user ${maskAddress(c.user)}, from ${c.from}, password set`;
    try {
      await smtp.verify();
      logger.info(`✉️  SMTP email delivery ready — ${summary}`);
      return true;
    } catch (err: any) {
      logger.error(`SMTP login check failed — ${summary}: ${err?.code || 'ERROR'} ${err?.message || err} — ${smtpHint(err)}`);
      return false;
    }
  }

  const configured = sendGridConfigured();
  logger.info(configured ? '✉️  Email delivery is configured (SendGrid)' : '📭 Email delivery is disabled');
  return configured;
};

/** Close the SMTP pool; the next send opens a fresh one. */
export const closeEmailConnection = (): void => {
  transporter?.close();
  transporter = null;
};
