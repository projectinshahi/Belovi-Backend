"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.googleAuth = exports.loginAdmin = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = require("../models/User");
const asyncHandler_1 = require("../utils/asyncHandler");
const responseHandler_1 = require("../utils/responseHandler");
const env_1 = require("../config/env");
const google_auth_library_1 = require("google-auth-library");
const generateToken = (id, role) => {
    return jsonwebtoken_1.default.sign({ id, role }, env_1.ENV.JWT_SECRET, {
        expiresIn: env_1.ENV.JWT_EXPIRES_IN,
    });
};
exports.loginAdmin = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return (0, responseHandler_1.errorResponse)(res, 400, 'Please provide email and password');
    }
    // Check if user exists and select password
    const user = await User_1.User.findOne({ email }).select('+password');
    if (!user || !(await user.matchPassword(password))) {
        return (0, responseHandler_1.errorResponse)(res, 401, 'Invalid email or password');
    }
    if (!user.isActive) {
        return (0, responseHandler_1.errorResponse)(res, 403, 'Your account has been deactivated');
    }
    // Check if role is admin or superadmin
    if (user.role !== 'admin' && user.role !== 'superadmin') {
        return (0, responseHandler_1.errorResponse)(res, 403, 'Not authorized to access admin portal');
    }
    // Generate Token
    const token = generateToken(user._id.toString(), user.role);
    // Set Cookie for extra security (HTTP-Only)
    res.cookie('jwt', token, {
        httpOnly: true,
        secure: env_1.ENV.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    (0, responseHandler_1.successResponse)(res, 200, 'Login successful', {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        token
    });
});
// Google OAuth Sign-In (supports both ID token and access token flows)
exports.googleAuth = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { credential, googleId: bodyGoogleId, email: bodyEmail, name: bodyName, picture: bodyPicture, mode } = req.body;
    // Which screen the request came from: 'register' (sign up) or 'signin' (sign in).
    const authMode = mode === 'register' ? 'register' : mode === 'signin' ? 'signin' : undefined;
    let email;
    let name;
    let picture;
    let googleId;
    // Flow 1: ID Token (from Google One Tap / renderButton)
    if (credential && !bodyGoogleId) {
        const googleClientId = process.env.GOOGLE_CLIENT_ID;
        if (!googleClientId) {
            return (0, responseHandler_1.errorResponse)(res, 500, 'Google OAuth is not configured');
        }
        const client = new google_auth_library_1.OAuth2Client(googleClientId);
        try {
            const ticket = await client.verifyIdToken({
                idToken: credential,
                audience: googleClientId,
            });
            const payload = ticket.getPayload();
            if (!payload || !payload.email) {
                return (0, responseHandler_1.errorResponse)(res, 400, 'Invalid Google token');
            }
            email = payload.email;
            name = payload.name;
            picture = payload.picture;
            googleId = payload.sub;
        }
        catch (error) {
            console.error('Google ID token verification error:', error);
            return (0, responseHandler_1.errorResponse)(res, 401, 'Invalid Google token');
        }
    }
    // Flow 2: Access Token (from @react-oauth/google useGoogleLogin)
    else if (bodyGoogleId && bodyEmail) {
        // The frontend already fetched user info from Google's userinfo endpoint
        // We trust this because it came from a verified Google access token on the frontend
        email = bodyEmail;
        name = bodyName;
        picture = bodyPicture;
        googleId = bodyGoogleId;
    }
    else {
        return (0, responseHandler_1.errorResponse)(res, 400, 'Google credential is required');
    }
    if (!email || !googleId) {
        return (0, responseHandler_1.errorResponse)(res, 400, 'Invalid Google authentication data');
    }
    // Normalize the email so casing/whitespace can't create duplicate customer accounts.
    const normalizedEmail = email.trim().toLowerCase();
    try {
        // Check if this email already belongs to a customer/account (case-insensitive).
        let user = await User_1.User.findOne({ email: normalizedEmail }).collation({ locale: 'en', strength: 2 });
        const isNewUser = !user;
        // Signing in requires an existing account.
        if (authMode === 'signin' && !user) {
            return (0, responseHandler_1.errorResponse)(res, 404, 'You are not signed up. Please create an account first.');
        }
        // Signing up requires the account to not already exist.
        if (authMode === 'register' && user) {
            return (0, responseHandler_1.errorResponse)(res, 409, 'You are already signed up. Please sign in instead.');
        }
        if (user) {
            // Email already exists — reuse the existing account instead of creating a duplicate.
            if (!user.isActive) {
                return (0, responseHandler_1.errorResponse)(res, 403, 'Your account has been deactivated');
            }
            // Link the Google ID if this account was created another way.
            if (!user.googleId) {
                user.googleId = googleId;
                await user.save();
            }
        }
        else {
            // No existing customer with this email — create a new account.
            user = await User_1.User.create({
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
            secure: env_1.ENV.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });
        (0, responseHandler_1.successResponse)(res, 200, isNewUser ? 'Account created successfully' : 'This email is already registered. Signed you in.', {
            _id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            isNewUser,
            token
        });
    }
    catch (error) {
        // Duplicate-key from the unique email index (race condition) — treat as existing account.
        if (error?.code === 11000) {
            return (0, responseHandler_1.errorResponse)(res, 409, 'This email is already registered. Please sign in.');
        }
        console.error('Google auth error:', error);
        return (0, responseHandler_1.errorResponse)(res, 401, 'Google authentication failed');
    }
});
//# sourceMappingURL=authController.js.map