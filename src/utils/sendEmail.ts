import logger from './logger';

// Email configuration interface
interface EmailOptions {
  email: string;
  subject: string;
  message?: string;
  html?: string;
}

const SENDGRID_ENDPOINT = 'https://api.sendgrid.com/v3/mail/send';

/**
 * Whether outbound email is configured. Requires both an API key and a verified
 * sender address. When either is missing we skip sending (no-op) so the app
 * behaves exactly as before until the client supplies real credentials.
 */
export const isEmailConfigured = (): boolean => {
  const key = process.env.SENDGRID_API_KEY?.trim();
  const from = process.env.SENDGRID_FROM_EMAIL?.trim();
  return Boolean(key && from);
};

/**
 * Send a transactional email via the SendGrid v3 HTTP API.
 *
 * - If email is not configured (missing key / sender), this is a safe no-op that
 *   logs and returns `{ skipped: true }` — preserving the previous behaviour.
 * - Never throws on a delivery failure: order flows must not break because an
 *   email couldn't be sent. Failures are logged and returned as `{ success: false }`.
 *
 * @param options - Email options (recipient, subject, content)
 */
export const sendEmail = async (options: EmailOptions): Promise<any> => {
  // Validate recipient to preserve previous behaviour for callers.
  if (!options.email || !options.email.includes('@')) {
    throw new Error('Invalid recipient email address');
  }

  if (!isEmailConfigured()) {
    logger.info(`📭 Email disabled (no SendGrid config). Skipping "${options.subject}" to ${options.email}`);
    return { success: true, provider: 'disabled', skipped: true };
  }

  const fromEmail = process.env.SENDGRID_FROM_EMAIL!.trim();
  const fromName = (process.env.FROM_NAME || 'BELOVI Boutique').trim();

  const payload = {
    personalizations: [{ to: [{ email: options.email }] }],
    from: { email: fromEmail, name: fromName },
    subject: options.subject,
    content: [
      options.html
        ? { type: 'text/html', value: options.html }
        : { type: 'text/plain', value: options.message || '' },
    ],
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
 * Report whether email delivery is available (configured).
 */
export const verifyEmailConnection = async (): Promise<boolean> => {
  const configured = isEmailConfigured();
  logger.info(configured ? '✉️  Email delivery is configured (SendGrid)' : '📭 Email delivery is disabled');
  return configured;
};

/**
 * Close email connection (no-op, kept for compatibility).
 */
export const closeEmailConnection = (): void => {
  // No-op — HTTP API needs no teardown.
};
