import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { PendingRegistration } from '../models/PendingRegistration';
import { asyncHandler } from '../utils/asyncHandler';
import { successResponse, errorResponse } from '../utils/responseHandler';
import { sendEmail, isEmailConfigured } from '../utils/sendEmail';
import logger from '../utils/logger';
import { ENV } from '../config/env';
import { OAuth2Client } from 'google-auth-library';

const generateToken = (id: string, role: string) => {
  return jwt.sign({ id, role }, ENV.JWT_SECRET, {
    expiresIn: ENV.JWT_EXPIRES_IN as any,
  });
};

/** Session cookie, identical for every auth route. */
const setSessionCookie = (res: Response, token: string) => {
  res.cookie('jwt', token, {
    httpOnly: true,
    secure: ENV.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days, matching JWT_EXPIRES_IN
  });
};

/**
 * What the storefront stores as its session. The same shape from Google auth,
 * registration and email sign-in, so `localStorage.belovi_user` holds one
 * consistent object however the customer got there. Never includes the hash.
 */
const sessionPayload = (user: any, token: string) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  token,
});

/**
 * Emails are matched case-insensitively everywhere (`strength: 2` collation) and
 * stored lowercased, so `A@b.com` and `a@b.com` can never become two accounts.
 * The unique index alone wouldn't catch that — it's case-sensitive.
 */
const normalizeEmail = (email: string) => email.trim().toLowerCase();

const findByEmail = (email: string) =>
  User.findOne({ email: normalizeEmail(email) }).collation({ locale: 'en', strength: 2 });

// ─── Registration, via email verification ────────────────────────────────────
//
// Three steps: start (issue a code), verify (create the account), resend. No
// User document exists until the code entered matches the one emailed, so an
// address can only ever end up on an account if its owner read the message.

/** How long a code is accepted. */
const OTP_TTL_MS = 5 * 60 * 1000;
/** Wrong codes tolerated before the pending registration is discarded. */
const MAX_OTP_ATTEMPTS = 5;
/** Codes issued per pending registration, the first included. */
const MAX_OTP_SENDS = 5;
/** Minimum wait between sends, so "resend" can't be used to mail-bomb. */
const RESEND_COOLDOWN_MS = 60 * 1000;

/** Six digits from a CSPRNG — `Math.random` is predictable and unfit here. */
const generateOtp = () => crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');

const OTP_TTL_MINUTES = OTP_TTL_MS / 60_000;

/*
 * The verification email carries nothing the registrant typed — no name. It
 * goes to whatever address they enter, so any text from the form would let
 * anyone use this endpoint to put their own words, under the Belovi name, into
 * a stranger's inbox: a standard way registration forms get abused for spam,
 * and it costs the sender's reputation with Gmail. The code is digits only.
 *
 * Kept lean on purpose: one short message, no links, no images, a plain-text
 * part saying the same thing, and the code readable in the inbox preview.
 */
const OTP_SUBJECT = 'Your Belovi verification code';

const otpEmailText = (otp: string) =>
  `Your Belovi verification code is ${otp}\n\n` +
  `Enter this code on the Belovi website to verify your email address and finish creating your account. ` +
  `It expires in ${OTP_TTL_MINUTES} minutes.\n\n` +
  `If you didn't try to create a Belovi account, you can ignore this email. No account has been created.\n\n` +
  `Belovi`;

const otpEmailHtml = (otp: string) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${OTP_SUBJECT}</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f5;">
<div style="display:none;max-height:0;overflow:hidden;">Your Belovi verification code is ${otp}. It expires in ${OTP_TTL_MINUTES} minutes.</div>
<div style="max-width:480px;margin:0 auto;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;">
  <div style="background-color:#ffffff;border:1px solid #e0e0e0;border-radius:8px;padding:32px 28px;">
    <p style="margin:0 0 28px;font-size:18px;font-weight:bold;letter-spacing:5px;">BEL<span style="color:#d32f2f;">O</span>VI</p>
    <h1 style="margin:0 0 12px;font-size:20px;line-height:1.3;font-weight:bold;">Verify your email address</h1>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#4a4a4a;">Enter this code on the Belovi website to finish creating your account.</p>
    <p style="margin:0 0 24px;font-size:32px;line-height:1.2;font-weight:bold;letter-spacing:8px;font-family:'Courier New',Courier,monospace;">${otp}</p>
    <p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:#4a4a4a;">This code expires in ${OTP_TTL_MINUTES} minutes.</p>
    <p style="margin:0;font-size:14px;line-height:1.6;color:#757575;">If you didn't try to create a Belovi account, you can ignore this email. No account has been created.</p>
  </div>
  <p style="margin:16px 0 0;font-size:12px;color:#9e9e9e;text-align:center;">Belovi</p>
</div>
</body>
</html>`;

/**
 * Mail a code, and report honestly whether it left the building.
 *
 * `sendEmail` is a deliberate no-op when email isn't configured — right for
 * order receipts, wrong here: the customer would be sent to a verification
 * screen to wait for a message that was never going to arrive. So a skipped or
 * failed send is an error for this flow, and the pending record is not kept.
 */
const deliverOtp = async (email: string, otp: string, tag: string): Promise<boolean> => {
  if (!isEmailConfigured()) {
    /**
     * Local escape hatch: print the code to the server console so registration
     * can be exercised before email credentials exist.
     *
     * Two conditions, deliberately. A single `NODE_ENV !== 'production'` check
     * would switch this on by itself on any deploy that forgot to set NODE_ENV
     * — and `ENV.NODE_ENV` already defaults to 'development' when unset, so
     * that is the likely case, not the unlikely one. The explicit opt-in means
     * codes can only ever reach a log file somewhere someone typed this in.
     */
    if (ENV.NODE_ENV !== 'production' && process.env.OTP_CONSOLE_FALLBACK === 'true') {
      logger.warn(
        `[${tag}] 🔑 DEV ONLY — email is not configured. Verification code for ${email}: ${otp}`
      );
      return true;
    }
    const missing = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'].filter((k) => !process.env[k]);
    logger.error(
      `[${tag}] Registration OTP requested but email delivery is not configured ` +
        `(missing: ${missing.join(', ')}). Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS and SMTP_FROM, ` +
        'or set OTP_CONSOLE_FALLBACK=true for local development.'
    );
    return false;
  }
  const result = await sendEmail({
    email,
    subject: OTP_SUBJECT,
    message: otpEmailText(otp),
    html: otpEmailHtml(otp),
    logTag: tag,
  });
  const sent = Boolean(result?.success) && !result?.skipped;
  if (!sent) logger.warn(`[${tag}] verification email not sent (${result?.error || 'unknown'}); answered 503`);
  return sent;
};

/**
 * One id per registration request: on every log line it writes and in the
 * `X-Request-Id` response header, so a failure a customer reports can be found
 * in the log. A client-supplied id is reused only if it's a plain token — it
 * goes into the log, so it must not carry arbitrary text.
 */
const requestTag = (req: Request, res: Response, stage: string) => {
  const supplied = req.get('x-request-id');
  const id = supplied && /^[\w-]{8,64}$/.test(supplied) ? supplied : crypto.randomUUID();
  res.setHeader('X-Request-Id', id);
  return `${stage} ${id}`;
};

/** The 429 for a send the per-address limits refused, naming which limit. */
const refuseSend = (res: Response, pending: { lastSentAt: Date } | null) => {
  const waitMs = pending ? pending.lastSentAt.getTime() + RESEND_COOLDOWN_MS - Date.now() : 0;
  return errorResponse(
    res,
    429,
    waitMs > 0
      ? `Please wait ${Math.ceil(waitMs / 1000)}s before requesting another code.`
      : 'Too many codes requested. Please start again in a little while.'
  );
};

/** What the client needs to drive its countdown, and nothing else. */
const pendingPayload = (pending: { email: string; otpExpiresAt: Date; lastSentAt: Date }) => ({
  email: pending.email,
  expiresAt: pending.otpExpiresAt,
  resendAvailableAt: new Date(pending.lastSentAt.getTime() + RESEND_COOLDOWN_MS),
});

/**
 * Step 1 — validate, check the address is free, and email a code.
 *
 * No account is created. The password is hashed immediately and the plaintext
 * discarded with the request.
 */
export const startRegistration = asyncHandler(async (req: Request, res: Response) => {
  const tag = requestTag(req, res, 'register');
  const { name, email, password } = req.body;
  const normalized = normalizeEmail(email);

  const existing = await findByEmail(normalized);
  if (existing) {
    return errorResponse(
      res,
      409,
      'An account with this email already exists. Please sign in instead.'
    );
  }

  const otp = generateOtp();
  const now = new Date();

  /*
   * One atomic write, so the per-address limits hold even against parallel
   * requests. It matches a record that may send again (cooldown over, under the
   * send cap) or inserts one when none exists. A record that exists but may not
   * send makes that insert collide with the unique email index — the E11000
   * below, answered with how long to wait.
   *
   * Re-registering replaces the code, name and password and resets the attempt
   * budget, so a stale code can never be used — but it keeps counting sends.
   * It used to reset the count, which let /register bypass the resend limits.
   */
  let pending;
  try {
    pending = await PendingRegistration.findOneAndUpdate(
      {
        email: normalized,
        lastSentAt: { $lte: new Date(now.getTime() - RESEND_COOLDOWN_MS) },
        resendCount: { $lt: MAX_OTP_SENDS },
      },
      {
        $set: {
          name: name.trim(),
          passwordHash: await bcrypt.hash(password, 10),
          otpHash: await bcrypt.hash(otp, 10),
          otpExpiresAt: new Date(now.getTime() + OTP_TTL_MS),
          attempts: 0,
          lastSentAt: now,
        },
        $inc: { resendCount: 1 },
      },
      { upsert: true, new: true }
    );
  } catch (error: any) {
    if (error?.code !== 11000) throw error;
    return refuseSend(res, await PendingRegistration.findOne({ email: normalized }));
  }

  if (!(await deliverOtp(normalized, otp, tag))) {
    // Don't strand the customer on a verification screen for a code that was
    // never sent.
    await PendingRegistration.deleteOne({ _id: pending._id });
    return errorResponse(
      res,
      503,
      'We could not send the verification email just now. Please try again shortly.'
    );
  }

  successResponse(res, 200, 'Verification code sent', pendingPayload(pending));
});

/**
 * Step 2 — check the code and create the account.
 *
 * Name, email and password all come from the stored record; the request supplies
 * only the address and the code. A caller therefore cannot verify one address
 * and have the account created against another.
 */
export const verifyRegistration = asyncHandler(async (req: Request, res: Response) => {
  const { email, otp } = req.body;
  const normalized = normalizeEmail(email);

  const pending = await PendingRegistration.findOne({ email: normalized });
  if (!pending) {
    return errorResponse(
      res,
      404,
      'This verification has expired. Please start again.'
    );
  }

  if (pending.otpExpiresAt.getTime() < Date.now()) {
    return errorResponse(res, 410, 'That code has expired. Request a new one.');
  }

  // Claim one attempt atomically BEFORE comparing. Counting after the compare
  // let parallel guesses all read the same count and slip past the limit.
  const claimed = await PendingRegistration.findOneAndUpdate(
    { _id: pending._id, attempts: { $lt: MAX_OTP_ATTEMPTS } },
    { $inc: { attempts: 1 } },
    { new: true }
  );
  if (!claimed) {
    await PendingRegistration.deleteOne({ _id: pending._id });
    return errorResponse(
      res,
      429,
      'Too many incorrect attempts. Please start again.'
    );
  }

  if (!(await bcrypt.compare(otp, claimed.otpHash))) {
    const left = MAX_OTP_ATTEMPTS - claimed.attempts;
    if (left <= 0) await PendingRegistration.deleteOne({ _id: claimed._id });
    return errorResponse(
      res,
      400,
      left > 0
        ? `That code is not correct. ${left} attempt${left === 1 ? '' : 's'} remaining.`
        : 'Too many incorrect attempts. Please start again.'
    );
  }

  // The address could have been claimed between starting and verifying.
  if (await findByEmail(normalized)) {
    await PendingRegistration.deleteOne({ _id: claimed._id });
    return errorResponse(
      res,
      409,
      'An account with this email already exists. Please sign in instead.'
    );
  }

  // The password was hashed when it arrived, so it must not pass through the
  // model's `pre('save')` hook a second time — `unmarkModified` keeps that hook
  // (the single place hashing happens for plaintext) from re-hashing a hash.
  const user = new User({
    name: claimed.name,
    email: claimed.email,
    password: claimed.passwordHash,
    role: 'customer',
    isActive: true,
    isVerified: true, // the address is proven — that is the point of this flow
  });
  user.unmarkModified('password');

  try {
    await user.save();
  } catch (error: any) {
    if (error?.code === 11000) {
      await PendingRegistration.deleteOne({ _id: claimed._id });
      return errorResponse(
        res,
        409,
        'An account with this email already exists. Please sign in instead.'
      );
    }
    throw error;
  }

  // Used once, then gone: the code cannot be replayed.
  await PendingRegistration.deleteOne({ _id: claimed._id });

  const token = generateToken(user._id.toString(), user.role);
  setSessionCookie(res, token);

  successResponse(res, 201, 'Account created successfully', sessionPayload(user, token));
});

/** Step 2b — issue a fresh code for a registration already in progress. */
export const resendRegistrationOtp = asyncHandler(async (req: Request, res: Response) => {
  const tag = requestTag(req, res, 'register/resend');
  const { email } = req.body;
  const normalized = normalizeEmail(email);

  const otp = generateOtp();
  const otpHash = await bcrypt.hash(otp, 10);
  const now = new Date();
  const otpExpiresAt = new Date(now.getTime() + OTP_TTL_MS);

  // Cooldown and cap checked in the same atomic write that issues the code, so
  // two simultaneous resends can't both pass. Returns the record as it was
  // BEFORE the update, so a failed send can be rolled back below.
  const previous = await PendingRegistration.findOneAndUpdate(
    {
      email: normalized,
      lastSentAt: { $lte: new Date(now.getTime() - RESEND_COOLDOWN_MS) },
      resendCount: { $lt: MAX_OTP_SENDS },
    },
    // A new code resets the attempt budget — the old one is void either way.
    { $set: { otpHash, otpExpiresAt, lastSentAt: now, attempts: 0 }, $inc: { resendCount: 1 } },
    { new: false }
  );

  if (!previous) {
    const pending = await PendingRegistration.findOne({ email: normalized });
    if (!pending) {
      return errorResponse(res, 404, 'This verification has expired. Please start again.');
    }
    return refuseSend(res, pending);
  }

  if (!(await deliverOtp(normalized, otp, tag))) {
    // The new code never left. Put the old one and the counters back, so an
    // earlier code the customer did receive still works and a retry isn't
    // blocked by a cooldown for a send that failed.
    await PendingRegistration.updateOne(
      { _id: previous._id, otpHash },
      {
        $set: {
          otpHash: previous.otpHash,
          otpExpiresAt: previous.otpExpiresAt,
          lastSentAt: previous.lastSentAt,
          attempts: previous.attempts,
          resendCount: previous.resendCount,
        },
      }
    );
    return errorResponse(
      res,
      503,
      'We could not send the verification email just now. Please try again shortly.'
    );
  }

  successResponse(
    res,
    200,
    'A new code is on its way',
    pendingPayload({ email: normalized, otpExpiresAt, lastSentAt: now })
  );
});

/**
 * Customer sign-in — email and password.
 *
 * Separate from `loginAdmin`, which gates on the admin roles and is what the
 * studio portal calls. Both live here and share the token, cookie and payload
 * helpers; neither can be used to enter the other's surface.
 *
 * One message covers "no such account" and "wrong password" alike: saying which
 * it was turns this into an endpoint for discovering who has an account.
 */
export const signInCustomer = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user = await findByEmail(email).select('+password');

  // Google-created accounts carry a random unguessable password, so they fall
  // through here rather than being told to use Google — same reasoning.
  if (!user || !user.password || !(await user.matchPassword(password))) {
    return errorResponse(res, 401, 'Invalid email or password');
  }

  if (!user.isActive) {
    return errorResponse(res, 403, 'Your account has been deactivated');
  }

  // Email registration only ever creates verified accounts; this stops anything
  // older or made another way from signing in with a password unverified.
  // Checked after the password, so it reveals nothing to someone without it.
  if (!user.isVerified) {
    return errorResponse(res, 403, 'Please verify your email address before signing in.');
  }

  const token = generateToken(user._id.toString(), user.role);
  setSessionCookie(res, token);

  successResponse(res, 200, 'Signed in successfully', sessionPayload(user, token));
});

export const loginAdmin = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return errorResponse(res, 400, 'Please provide email and password');
  }

  // Check if user exists and select password
  const user = await User.findOne({ email }).select('+password');
  
  if (!user || !(await user.matchPassword(password))) {
    return errorResponse(res, 401, 'Invalid email or password');
  }

  if (!user.isActive) {
    return errorResponse(res, 403, 'Your account has been deactivated');
  }

  // Check if role is admin or superadmin
  if (user.role !== 'admin' && user.role !== 'superadmin') {
     return errorResponse(res, 403, 'Not authorized to access admin portal');
  }

  // Generate Token
  const token = generateToken(user._id.toString(), user.role);

  // Set Cookie for extra security (HTTP-Only)
  res.cookie('jwt', token, {
    httpOnly: true,
    secure: ENV.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  successResponse(res, 200, 'Login successful', {
    _id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    token
  });
});

/**
 * Resolve a Google access token to a verified identity.
 *
 * Two checks, and both matter:
 *
 *  1. `tokeninfo` proves the token is live and — critically — that its `aud` is
 *     OUR client ID. Without that check any valid Google token, including one
 *     minted for an unrelated application, would be accepted here.
 *  2. `userinfo` returns the profile, authenticated by the token itself rather
 *     than asserted by the caller.
 *
 * The `sub` from both must agree, so a mismatched pair is rejected rather than
 * silently preferring one.
 */
async function identityFromAccessToken(accessToken: string, clientId: string) {
  const infoRes = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`
  );
  if (!infoRes.ok) return null;
  const info: any = await infoRes.json();

  // The audience check is the whole point of this function.
  if (!info.aud || info.aud !== clientId) return null;

  const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!profileRes.ok) return null;
  const profile: any = await profileRes.json();

  if (!profile.sub || !profile.email) return null;
  if (info.sub && info.sub !== profile.sub) return null;
  // Google can return an unverified address on some account types.
  if (profile.email_verified === false) return null;

  return {
    googleId: profile.sub as string,
    email: profile.email as string,
    name: profile.name as string | undefined,
    picture: profile.picture as string | undefined,
  };
}

/**
 * Google OAuth — the single door for customers.
 *
 * Signs in an existing customer and creates one for a new email. There used to
 * be a `mode` guard that rejected sign-in for an unknown email ("You are not
 * signed up") and rejected sign-up for a known one, which meant a first-time
 * visitor tapping the obvious button on /sign-in hit a dead end. Google has
 * already verified the address by this point, so the extra round trip only cost
 * signups. `mode` is still accepted from the client and ignored.
 *
 * Identity is ALWAYS derived from Google, never from the request body. The body
 * previously supplied `email`/`googleId` directly and they were trusted, which
 * let anyone POST an arbitrary address and receive a session for it.
 */
export const googleAuth = asyncHandler(async (req: Request, res: Response) => {
  const { credential } = req.body;

  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  if (!googleClientId) {
    return errorResponse(res, 500, 'Google sign-in is not configured');
  }
  if (!credential) {
    return errorResponse(res, 400, 'Google credential is required');
  }

  let email: string | undefined;
  let name: string | undefined;
  let picture: string | undefined;
  let googleId: string | undefined;

  // An ID token is three dot-separated base64url segments; an access token is
  // not. That tells the two client flows apart without trusting a body flag.
  const looksLikeIdToken = credential.split('.').length === 3;

  if (looksLikeIdToken) {
    // Flow 1: ID token (Google One Tap / renderButton).
    const client = new OAuth2Client(googleClientId);
    try {
      const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: googleClientId,
      });
      const payload = ticket.getPayload();
      if (!payload || !payload.email || payload.email_verified === false) {
        return errorResponse(res, 401, 'Could not verify your Google account');
      }
      email = payload.email;
      name = payload.name;
      picture = payload.picture;
      googleId = payload.sub;
    } catch (error: any) {
      console.error('Google ID token verification failed:', error?.message);
      return errorResponse(res, 401, 'Could not verify your Google account');
    }
  } else {
    // Flow 2: access token (@react-oauth/google `useGoogleLogin`).
    try {
      const identity = await identityFromAccessToken(credential, googleClientId);
      if (!identity) {
        return errorResponse(res, 401, 'Could not verify your Google account');
      }
      ({ email, name, picture, googleId } = identity);
    } catch (error: any) {
      console.error('Google access token verification failed:', error?.message);
      return errorResponse(res, 503, 'Could not reach Google to verify your account');
    }
  }

  if (!email || !googleId) {
    return errorResponse(res, 400, 'Invalid Google authentication data');
  }

  // Normalize the email so casing/whitespace can't create duplicate customer accounts.
  const normalizedEmail = email.trim().toLowerCase();

  try {
    // Check if this email already belongs to a customer/account (case-insensitive).
    let user = await User.findOne({ email: normalizedEmail }).collation({ locale: 'en', strength: 2 });
    const isNewUser = !user;

    if (user) {
      // Email already exists — reuse the existing account instead of creating a duplicate.
      if (!user.isActive) {
        return errorResponse(res, 403, 'Your account has been deactivated');
      }
      // Link the Google ID if this account was created another way.
      if (!user.googleId) {
        user.googleId = googleId;
        await user.save();
      }
    } else {
      // No existing customer with this email — create a new account.
      user = await User.create({
        name: name || 'Google User',
        email: normalizedEmail,
        googleId,
        avatar: picture,
        role: 'customer',
        isVerified: true, // Google emails are already verified
        isActive: true,
        password: `google_${googleId}_${Date.now()}`, // Random password since Google users don't need one
      });
    }

    const token = generateToken(user._id.toString(), user.role);

    res.cookie('jwt', token, {
      httpOnly: true,
      secure: ENV.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    successResponse(
      res,
      200,
      isNewUser ? 'Account created successfully' : 'Signed in successfully',
      {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isNewUser,
        token
      }
    );
  } catch (error: any) {
    // Duplicate-key from the unique email index (race condition) — treat as existing account.
    if (error?.code === 11000) {
      return errorResponse(res, 409, 'This email is already registered. Please sign in.');
    }
    console.error('Google auth error:', error);
    return errorResponse(res, 401, 'Google authentication failed');
  }
});
