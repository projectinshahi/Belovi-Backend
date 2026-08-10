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
const OTP_TTL_MS = 10 * 60 * 1000;
/** Wrong codes tolerated before the pending registration is discarded. */
const MAX_OTP_ATTEMPTS = 5;
/** Codes issued per pending registration, the first included. */
const MAX_OTP_SENDS = 5;
/** Minimum wait between sends, so "resend" can't be used to mail-bomb. */
const RESEND_COOLDOWN_MS = 60 * 1000;

/** Six digits from a CSPRNG — `Math.random` is predictable and unfit here. */
const generateOtp = () => crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');

const otpEmailHtml = (name: string, otp: string) => `
  <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eaeaea; border-radius: 10px; overflow: hidden; background-color: #ffffff;">
    <div style="background-color: #111827; padding: 30px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px; letter-spacing: 2px; text-transform: uppercase;">BELOVI</h1>
    </div>
    <div style="padding: 40px 30px;">
      <h2 style="color: #111827; font-size: 20px; margin-top: 0;">Verify your email</h2>
      <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
        Hello ${name},<br><br>
        Use this code to finish creating your BELOVI account.
      </p>
      <div style="margin: 32px 0; text-align: center;">
        <span style="display: inline-block; font-size: 34px; letter-spacing: 12px; font-weight: bold; color: #111827; background: #f9fafb; border: 1px solid #eaeaea; border-radius: 8px; padding: 18px 26px 18px 38px;">${otp}</span>
      </div>
      <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
        The code expires in 10 minutes. If you didn't ask to create an account,
        you can ignore this email — nothing has been created.
      </p>
    </div>
    <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #eaeaea;">
      <p style="color: #9ca3af; font-size: 13px; margin: 0;">© ${new Date().getFullYear()} BELOVI. All rights reserved.</p>
    </div>
  </div>
`;

/**
 * Mail a code, and report honestly whether it left the building.
 *
 * `sendEmail` is a deliberate no-op when SendGrid isn't configured — right for
 * order receipts, wrong here: the customer would be sent to a verification
 * screen to wait for a message that was never going to arrive. So a skipped or
 * failed send is an error for this flow, and the pending record is not kept.
 */
const deliverOtp = async (email: string, name: string, otp: string): Promise<boolean> => {
  if (!isEmailConfigured()) {
    /**
     * Local escape hatch: print the code to the server console so registration
     * can be exercised before SendGrid credentials exist.
     *
     * Two conditions, deliberately. A single `NODE_ENV !== 'production'` check
     * would switch this on by itself on any deploy that forgot to set NODE_ENV
     * — and `ENV.NODE_ENV` already defaults to 'development' when unset, so
     * that is the likely case, not the unlikely one. The explicit opt-in means
     * codes can only ever reach a log file somewhere someone typed this in.
     */
    if (ENV.NODE_ENV !== 'production' && process.env.OTP_CONSOLE_FALLBACK === 'true') {
      logger.warn(
        `🔑 DEV ONLY — email is not configured. Verification code for ${email}: ${otp}`
      );
      return true;
    }
    logger.error(
      'Registration OTP requested but email delivery is not configured. ' +
        'Set SENDGRID_API_KEY and SENDGRID_FROM_EMAIL (a verified sender), ' +
        'or set OTP_CONSOLE_FALLBACK=true for local development.'
    );
    return false;
  }
  const result = await sendEmail({
    email,
    subject: 'Your BELOVI verification code',
    html: otpEmailHtml(name, otp),
  });
  return Boolean(result?.success) && !result?.skipped;
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

  // Re-registering the same address before verifying replaces the record, so a
  // stale code can never be used and attempts don't accumulate across tries.
  const pending = await PendingRegistration.findOneAndUpdate(
    { email: normalized },
    {
      email: normalized,
      name: name.trim(),
      passwordHash: await bcrypt.hash(password, 10),
      otpHash: await bcrypt.hash(otp, 10),
      otpExpiresAt: new Date(now.getTime() + OTP_TTL_MS),
      attempts: 0,
      resendCount: 1,
      lastSentAt: now,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  if (!(await deliverOtp(normalized, pending.name, otp))) {
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

  if (pending.attempts >= MAX_OTP_ATTEMPTS) {
    await PendingRegistration.deleteOne({ _id: pending._id });
    return errorResponse(
      res,
      429,
      'Too many incorrect attempts. Please start again.'
    );
  }

  if (!(await bcrypt.compare(otp, pending.otpHash))) {
    pending.attempts += 1;
    await pending.save();
    const left = MAX_OTP_ATTEMPTS - pending.attempts;
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
    await PendingRegistration.deleteOne({ _id: pending._id });
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
    name: pending.name,
    email: pending.email,
    password: pending.passwordHash,
    role: 'customer',
    isActive: true,
    isVerified: true, // the address is proven — that is the point of this flow
  });
  user.unmarkModified('password');

  try {
    await user.save();
  } catch (error: any) {
    if (error?.code === 11000) {
      await PendingRegistration.deleteOne({ _id: pending._id });
      return errorResponse(
        res,
        409,
        'An account with this email already exists. Please sign in instead.'
      );
    }
    throw error;
  }

  // Used once, then gone: the code cannot be replayed.
  await PendingRegistration.deleteOne({ _id: pending._id });

  const token = generateToken(user._id.toString(), user.role);
  setSessionCookie(res, token);

  successResponse(res, 201, 'Account created successfully', sessionPayload(user, token));
});

/** Step 2b — issue a fresh code for a registration already in progress. */
export const resendRegistrationOtp = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;
  const normalized = normalizeEmail(email);

  const pending = await PendingRegistration.findOne({ email: normalized });
  if (!pending) {
    return errorResponse(res, 404, 'This verification has expired. Please start again.');
  }

  const waitMs = pending.lastSentAt.getTime() + RESEND_COOLDOWN_MS - Date.now();
  if (waitMs > 0) {
    return errorResponse(
      res,
      429,
      `Please wait ${Math.ceil(waitMs / 1000)}s before requesting another code.`
    );
  }

  if (pending.resendCount >= MAX_OTP_SENDS) {
    return errorResponse(
      res,
      429,
      'Too many codes requested. Please start again in a little while.'
    );
  }

  const otp = generateOtp();
  pending.otpHash = await bcrypt.hash(otp, 10);
  pending.otpExpiresAt = new Date(Date.now() + OTP_TTL_MS);
  pending.lastSentAt = new Date();
  pending.resendCount += 1;
  // A new code resets the attempt budget — the old one is void either way.
  pending.attempts = 0;
  await pending.save();

  if (!(await deliverOtp(normalized, pending.name, otp))) {
    return errorResponse(
      res,
      503,
      'We could not send the verification email just now. Please try again shortly.'
    );
  }

  successResponse(res, 200, 'A new code is on its way', pendingPayload(pending));
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
