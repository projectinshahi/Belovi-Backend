import { Request, Response } from 'express';
import { Newsletter } from '../models/Newsletter';
import { asyncHandler } from '../utils/asyncHandler';
import { successResponse, errorResponse } from '../utils/responseHandler';
import { subscribeToZohoList } from '../utils/zohoCampaigns';
import { sendEmail, isEmailConfigured } from '../utils/sendEmail';

/**
 * Branded confirmation email sent directly by our backend on every valid
 * subscription. This is independent of Zoho's double opt-in email (whose
 * deliverability depends on a verified sender domain in the Zoho dashboard) —
 * so the subscriber gets a confirmation the moment an email provider
 * (SENDGRID_API_KEY + SENDGRID_FROM_EMAIL) is configured, regardless of Zoho.
 */
const buildConfirmationEmail = (email: string) => ({
  email,
  subject: 'You’re on the list — Notes from the Studio',
  html: `<!doctype html>
<html><body style="margin:0;background:#f5f0e8;font-family:Georgia,'Times New Roman',serif;color:#1c1a15;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f0e8;padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px;background:#faf6ef;border:1px solid #ddd3c2;">
        <tr><td style="padding:44px 44px 8px;text-align:center;">
          <div style="font-family:Georgia,serif;letter-spacing:8px;text-transform:uppercase;font-size:20px;color:#1c1a15;">BELOVI</div>
          <div style="font-family:Arial,sans-serif;letter-spacing:5px;text-transform:uppercase;font-size:9px;color:#6f675a;margin-top:6px;">by BELOVI</div>
        </td></tr>
        <tr><td style="padding:24px 44px 8px;text-align:center;">
          <p style="font-family:Arial,sans-serif;text-transform:uppercase;letter-spacing:3px;font-size:11px;color:#83653a;margin:0 0 14px;">Notes from the Studio</p>
          <h1 style="font-family:Georgia,serif;font-weight:normal;font-size:30px;line-height:1.2;color:#1c1a15;margin:0 0 18px;">You’re on the list.</h1>
          <p style="font-family:Arial,sans-serif;font-size:15px;line-height:1.75;color:#6f675a;margin:0;">
            Thank you for subscribing. You’ll receive slow letters about clothing, climate,
            and getting dressed for the life you’re actually living — nothing more, nothing rushed.
          </p>
        </td></tr>
        <tr><td style="padding:28px 44px 44px;text-align:center;">
          <a href="${process.env.FRONTEND_URL || 'https://www.instagram.com/belovi.in/'}"
             style="display:inline-block;background:#1c1a15;color:#f5f0e8;font-family:Arial,sans-serif;text-transform:uppercase;letter-spacing:2px;font-size:11px;text-decoration:none;padding:14px 28px;">
            Explore the Collection
          </a>
        </td></tr>
        <tr><td style="padding:20px 44px 40px;text-align:center;border-top:1px solid #ddd3c2;">
          <p style="font-family:Arial,sans-serif;font-size:11px;color:#9a9284;margin:0;">
            BELOVI · Registered in Kochi, Kerala<br/>
            You received this because ${email} subscribed at belovi.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`,
});

/**
 * Send the branded confirmation email — never throws, never blocks the response.
 * A no-op (logged) until SENDGRID_API_KEY + SENDGRID_FROM_EMAIL are configured.
 */
const sendConfirmation = async (email: string) => {
  try {
    const result = await sendEmail(buildConfirmationEmail(email));
    console.log(`   ✉️  confirmation email:`, JSON.stringify(result));
    return result;
  } catch (err: any) {
    console.log('   ⚠️  confirmation email error:', err?.message || err);
    return { success: false, error: err?.message };
  }
};

// POST /newsletter/subscribe  (public)
export const subscribe = asyncHandler(async (req: Request, res: Response) => {
  console.log('\n📨 [Newsletter] Subscribe request received');
  console.log('   body:', JSON.stringify(req.body));

  const email = String(req.body.email || '').trim().toLowerCase();
  const source = req.body.source ? String(req.body.source).trim() : undefined;

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.log('   ❌ invalid email, rejecting');
    return errorResponse(res, 400, 'Please provide a valid email address.');
  }

  const existing = await Newsletter.findOne({ email });
  if (existing) {
    console.log(`   ℹ️  ${email} already in DB (isActive=${existing.isActive})`);
    const wasReactivated = !existing.isActive;
    if (wasReactivated) {
      existing.isActive = true;
      await existing.save();
    }
    // Push to Zoho too — covers contacts added before Zoho was wired up, or a
    // resubscribe after a previous unsubscribe. Best-effort; never blocks.
    console.log('   → calling Zoho Campaigns...');
    const zoho = await subscribeToZohoList(email, source);
    console.log('   ← Zoho result:', JSON.stringify(zoho));
    // Send our own confirmation only on a genuine re-subscribe, not on every
    // repeat submit of an already-active address (that would be spammy).
    const emailResult = wasReactivated ? await sendConfirmation(email) : undefined;
    return successResponse(res, 200, 'You are already on the list.', {
      email,
      zoho,
      emailSent: emailResult ? !emailResult.skipped && emailResult.success !== false : false,
    });
  }

  await Newsletter.create({ email, source });
  console.log(`   ✅ saved ${email} to MongoDB`);

  // Mirror the subscriber into Zoho Campaigns. This is best-effort: the local
  // record is the source of truth, so a Zoho outage or misconfiguration must
  // not fail the subscription. Failures are logged inside the helper.
  console.log('   → calling Zoho Campaigns...');
  const zoho = await subscribeToZohoList(email, source);
  console.log('   ← Zoho result:', JSON.stringify(zoho));

  // Our own branded confirmation email (best-effort, independent of Zoho).
  const emailResult = await sendConfirmation(email);

  return successResponse(res, 201, 'Subscribed successfully.', {
    email,
    zoho,
    emailConfigured: isEmailConfigured(),
    emailSent: !emailResult.skipped && emailResult.success !== false,
  });
});

// GET /newsletter/admin  (admin)
export const getSubscribers = asyncHandler(async (_req: Request, res: Response) => {
  const subscribers = await Newsletter.find().sort({ createdAt: -1 });
  return successResponse(res, 200, 'Subscribers fetched successfully', subscribers);
});

// DELETE /newsletter/admin/:id  (admin)
export const deleteSubscriber = asyncHandler(async (req: Request, res: Response) => {
  const sub = await Newsletter.findByIdAndDelete(req.params.id);
  if (!sub) {
    return errorResponse(res, 404, 'Subscriber not found');
  }
  return successResponse(res, 200, 'Subscriber removed successfully', { id: req.params.id });
});
