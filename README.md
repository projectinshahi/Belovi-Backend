# 🚀 Heedy Backend - Quick Guide

## 📧 Email Configuration (Resend)
Order emails now use **Resend API** (replacing Nodemailer).

### 1. Update API Key
- Get a key from [resend.com](https://resend.com)
- Update `.env`: `RESEND_API_KEY=re_your_key`

### 2. Local SSL Workaround
If you see SSL errors locally, the code automatically handles it in `development` mode. No action needed.



## ☁️ Deployment (Vercel/AWS)
Add these environment variables to your production dashboard:
- `RESEND_API_KEY`: Your Resend key
- `RESEND_FROM_EMAIL`: `onboarding@resend.dev` (or your verified domain)
- `NODE_ENV`: `production`

---

## 🔒 Security Status
We have implemented:
- ✅ **Rate Limiting** (All endpoints + Auth/OTP)
- ✅ **Input Sanitization** (XSS & NoSQL injection)
- ✅ **Input Validation** (Zod schemas)
- ✅ **Secure Logging** (Winston)
- ✅ **Helmet & HSTS** (Security headers)

### 🔴 CRITICAL - Manual Actions Required:
1. **Rotate Secrets**: Generate new `JWT_SECRET` and rotate `MONGODB_URI`, `CLOUDINARY_API_SECRET`, etc.
2. **Git Security**: Add `.env` to `.gitignore` and remove it from history: `git rm --cached .env`
3. **Install Packages**: Run `npm install express-rate-limit express-mongo-sanitize winston`
4. **Logs Directory**: Create a `logs` folder: `mkdir logs`

---

## 🧪 Testing
- Test email: `node test-resend.js`
- Test order flow: `node test-order-email.js`
