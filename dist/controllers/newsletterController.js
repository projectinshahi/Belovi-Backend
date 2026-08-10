"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteSubscriber = exports.getSubscribers = exports.subscribe = void 0;
const Newsletter_1 = require("../models/Newsletter");
const asyncHandler_1 = require("../utils/asyncHandler");
const responseHandler_1 = require("../utils/responseHandler");
const zohoCampaigns_1 = require("../utils/zohoCampaigns");
const sendEmail_1 = require("../utils/sendEmail");
/**
 * Branded confirmation email sent directly by our backend on every valid
 * subscription. This is independent of Zoho's double opt-in email (whose
 * deliverability depends on a verified sender domain in the Zoho dashboard) —
 * so the subscriber gets a confirmation the moment an email provider
 * (SENDGRID_API_KEY + SENDGRID_FROM_EMAIL) is configured, regardless of Zoho.
 */
const buildConfirmationEmail = (email) => ({
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
const sendConfirmation = async (email) => {
    try {
        const result = await (0, sendEmail_1.sendEmail)(buildConfirmationEmail(email));
        console.log(`   ✉️  confirmation email:`, JSON.stringify(result));
        return result;
    }
    catch (err) {
        console.log('   ⚠️  confirmation email error:', err?.message || err);
        return { success: false, error: err?.message };
    }
};
// POST /newsletter/subscribe  (public)
exports.subscribe = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    console.log('\n📨 [Newsletter] Subscribe request received');
    console.log('   body:', JSON.stringify(req.body));
    const email = String(req.body.email || '').trim().toLowerCase();
    const source = req.body.source ? String(req.body.source).trim() : undefined;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        console.log('   ❌ invalid email, rejecting');
        return (0, responseHandler_1.errorResponse)(res, 400, 'Please provide a valid email address.');
    }
    const existing = await Newsletter_1.Newsletter.findOne({ email });
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
        const zoho = await (0, zohoCampaigns_1.subscribeToZohoList)(email, source);
        console.log('   ← Zoho result:', JSON.stringify(zoho));
        // Send our own confirmation only on a genuine re-subscribe, not on every
        // repeat submit of an already-active address (that would be spammy).
        const emailResult = wasReactivated ? await sendConfirmation(email) : undefined;
        return (0, responseHandler_1.successResponse)(res, 200, 'You are already on the list.', {
            email,
            zoho,
            emailSent: emailResult ? !emailResult.skipped && emailResult.success !== false : false,
        });
    }
    await Newsletter_1.Newsletter.create({ email, source });
    console.log(`   ✅ saved ${email} to MongoDB`);
    // Mirror the subscriber into Zoho Campaigns. This is best-effort: the local
    // record is the source of truth, so a Zoho outage or misconfiguration must
    // not fail the subscription. Failures are logged inside the helper.
    console.log('   → calling Zoho Campaigns...');
    const zoho = await (0, zohoCampaigns_1.subscribeToZohoList)(email, source);
    console.log('   ← Zoho result:', JSON.stringify(zoho));
    // Our own branded confirmation email (best-effort, independent of Zoho).
    const emailResult = await sendConfirmation(email);
    return (0, responseHandler_1.successResponse)(res, 201, 'Subscribed successfully.', {
        email,
        zoho,
        emailConfigured: (0, sendEmail_1.isEmailConfigured)(),
        emailSent: !emailResult.skipped && emailResult.success !== false,
    });
});
// GET /newsletter/admin  (admin)
exports.getSubscribers = (0, asyncHandler_1.asyncHandler)(async (_req, res) => {
    const subscribers = await Newsletter_1.Newsletter.find().sort({ createdAt: -1 });
    return (0, responseHandler_1.successResponse)(res, 200, 'Subscribers fetched successfully', subscribers);
});
// DELETE /newsletter/admin/:id  (admin)
exports.deleteSubscriber = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const sub = await Newsletter_1.Newsletter.findByIdAndDelete(req.params.id);
    if (!sub) {
        return (0, responseHandler_1.errorResponse)(res, 404, 'Subscriber not found');
    }
    return (0, responseHandler_1.successResponse)(res, 200, 'Subscriber removed successfully', { id: req.params.id });
});
//# sourceMappingURL=newsletterController.js.map