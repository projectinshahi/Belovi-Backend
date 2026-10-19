// Run: npx ts-node src/controllers/authController.test.ts
//
// Registration + email OTP, exercised through the real Express app.
// - Database: a throwaway database on a LOCAL MongoDB (TEST_MONGODB_URI, default
//   mongodb://127.0.0.1:27017), dropped afterwards. Refuses any other host, so
//   the configured (possibly production) database is never touched.
// - Email: nodemailer's transport is replaced with an in-memory fake. No real
//   email is sent; tests read the code from the captured message.
import assert from 'assert';
import crypto from 'crypto';
import net, { type AddressInfo } from 'net';
import { Writable } from 'stream';
import winston from 'winston';
import nodemailer from 'nodemailer';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import app from '../app';
import logger from '../utils/logger';
import { ENV } from '../config/env';
import { User } from '../models/User';
import { PendingRegistration } from '../models/PendingRegistration';
import { closeEmailConnection, connectViaOs } from '../utils/sendEmail';

const LOCAL_URI = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017';
if (!/^mongodb:\/\/(127\.0\.0\.1|localhost)(:\d+)?\/?$/.test(LOCAL_URI)) {
  throw new Error('Refusing to run: TEST_MONGODB_URI must be a local MongoDB (127.0.0.1 / localhost).');
}
const DB_NAME = `belovi_auth_test_${process.pid}`;

// ── Fakes ────────────────────────────────────────────────────────────────────

// Overrides whatever .env loaded: no real SMTP host is ever contacted.
process.env.SMTP_HOST = 'smtp.test.invalid';
process.env.SMTP_PORT = '587';
process.env.SMTP_USER = 'sender@test.invalid';
process.env.SMTP_PASS = 'not-a-real-password';
process.env.SMTP_FROM = 'sender@test.invalid';
process.env.OTP_CONSOLE_FALLBACK = 'false';

// Log lines go to memory instead of logs/*.log, so tests can inspect them and
// test addresses never reach the project's log files.
const logLines: string[] = [];
logger.clear();
logger.add(
  new winston.transports.Stream({
    stream: new Writable({
      write(chunk, _enc, done) {
        logLines.push(String(chunk));
        done();
      },
    }),
  })
);

interface Mail { to: string; subject: string; text?: string; html?: string }
const outbox: Mail[] = [];
let smtpFailure: { code: string; message: string } | null = null;

(nodemailer as any).createTransport = () => ({
  sendMail: async (m: any) => {
    if (smtpFailure) throw Object.assign(new Error(smtpFailure.message), { code: smtpFailure.code });
    outbox.push({ to: m.to, subject: m.subject, text: m.text, html: m.html });
    return { messageId: `<test-${outbox.length}@local>` };
  },
  verify: async () => true,
  close: () => {},
});

// ── HTTP helpers ─────────────────────────────────────────────────────────────

let base = '';
let ipSeq = 0;
/** A fresh client IP per request, so per-IP limiters don't bleed between tests. */
const freshIp = () => `10.9.${Math.floor(++ipSeq / 250)}.${(ipSeq % 250) + 1}`;

interface Reply { status: number; json: any; text: string; headers: Headers }

async function call(
  method: string,
  path: string,
  body?: unknown,
  opts: { ip?: string; raw?: boolean; token?: string; headers?: Record<string, string> } = {}
): Promise<Reply> {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Forwarded-For': opts.ip ?? freshIp(),
      ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
      ...opts.headers,
    },
    body: body === undefined ? undefined : opts.raw ? (body as string) : JSON.stringify(body),
  });
  const text = await res.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch { /* not JSON */ }
  // No response, on any route or outcome, may carry a hash or a bcrypt string.
  assert.ok(!/passwordHash|otpHash|\$2[aby]\$/.test(text), `secret material in response: ${text}`);
  return { status: res.status, json, text, headers: res.headers };
}

const post = (path: string, body: unknown, opts?: { ip?: string; raw?: boolean }) =>
  call('POST', `/api/v1/auth${path}`, body, opts);

const codeIn = (mail: Mail) => {
  const m = mail.text?.match(/\b(\d{6})\b/);
  assert.ok(m, `no 6-digit code in email text: ${mail.text}`);
  return m[1];
};

const PASSWORD = 'Str0ng!Pass';
const details = (email = 'asha@example.com', extra: Record<string, unknown> = {}) => ({
  name: 'Asha Menon',
  email,
  password: PASSWORD,
  ...extra,
});

/** Register and return the code that was emailed. */
async function register(body = details()) {
  const r = await post('/register', body);
  assert.strictEqual(r.status, 200, r.text);
  return codeIn(outbox[outbox.length - 1]);
}

/** Lift the resend cooldown without waiting a minute. */
const skipCooldown = (email: string) =>
  PendingRegistration.updateOne({ email }, { lastSentAt: new Date(Date.now() - 61_000) });

// ── Tests ────────────────────────────────────────────────────────────────────

const tests: [string, () => Promise<void>][] = [];
const test = (name: string, fn: () => Promise<void>) => tests.push([name, fn]);

// Registration validation

test('valid registration emails one code and stores only hashes', async () => {
  const r = await post('/register', details());
  assert.strictEqual(r.status, 200, r.text);
  assert.deepStrictEqual(Object.keys(r.json.data).sort(), ['email', 'expiresAt', 'resendAvailableAt']);
  const ttl = new Date(r.json.data.expiresAt).getTime() - Date.now();
  assert.ok(ttl > 4.9 * 60_000 && ttl <= 5 * 60_000, `expiry should be 5 minutes, got ${ttl}ms`);

  assert.strictEqual(outbox.length, 1);
  const mail = outbox[0];
  assert.strictEqual(mail.to, 'asha@example.com');
  const code = codeIn(mail);
  assert.ok(mail.html?.includes(code), 'HTML part carries the code');
  assert.ok(!mail.text!.includes(PASSWORD) && !mail.html!.includes(PASSWORD), 'password never emailed');

  const pending = await PendingRegistration.findOne({ email: 'asha@example.com' }).lean();
  assert.ok(pending);
  assert.match(pending.passwordHash, /^\$2[aby]\$/);
  assert.match(pending.otpHash, /^\$2[aby]\$/);
  assert.ok(!JSON.stringify(pending).includes(code), 'plaintext code not stored');
  assert.strictEqual(await User.countDocuments(), 0, 'no account before verification');
});

test('missing required fields are rejected', async () => {
  for (const body of [{}, { name: 'Asha' }, { name: 'Asha', email: 'a@example.com' }, { email: 'a@example.com', password: PASSWORD }]) {
    assert.strictEqual((await post('/register', body)).status, 400, JSON.stringify(body));
  }
  assert.strictEqual(outbox.length, 0);
});

test('invalid and over-long emails are rejected', async () => {
  for (const email of ['not-an-email', 'a@b', '@example.com', `${'x'.repeat(250)}@example.com`]) {
    assert.strictEqual((await post('/register', details(email))).status, 400, email);
  }
});

test('whitespace is trimmed and the email normalized', async () => {
  await register({ name: '   Asha   ', email: '  Asha@Example.COM  ', password: PASSWORD });
  const pending = await PendingRegistration.findOne().lean();
  assert.strictEqual(pending!.email, 'asha@example.com');
  assert.strictEqual(pending!.name, 'Asha');
  assert.strictEqual(outbox[0].to, 'asha@example.com');
});

test('password length bounds: 8 minimum, 64 characters / 72 bytes maximum', async () => {
  assert.strictEqual((await post('/register', details('a@example.com', { password: 'Sh0rt!' }))).status, 400);
  const tooLong = 'Aa1!' + 'x'.repeat(61); // 65 characters
  assert.strictEqual((await post('/register', details('b@example.com', { password: tooLong }))).status, 400);
  const tooManyBytes = 'Aa1!' + '€'.repeat(30); // 34 characters, 94 bytes
  const r = await post('/register', details('c@example.com', { password: tooManyBytes }));
  assert.strictEqual(r.status, 400);
  assert.match(r.text, /too long/i);
  const max = 'Aa1!' + 'x'.repeat(60); // exactly 64
  assert.strictEqual((await post('/register', details('d@example.com', { password: max }))).status, 200);
});

test('password policy: upper, lower, number and symbol each required', async () => {
  for (const password of ['alllower1!', 'ALLUPPER1!', 'NoNumbers!!', 'NoSymbol123']) {
    assert.strictEqual((await post('/register', details('p@example.com', { password }))).status, 400, password);
  }
});

test('name rules: length, control characters, international names accepted', async () => {
  assert.strictEqual((await post('/register', details('n1@example.com', { name: 'A' }))).status, 400);
  assert.strictEqual((await post('/register', details('n2@example.com', { name: 'x'.repeat(101) }))).status, 400);
  assert.strictEqual((await post('/register', details('n3@example.com', { name: 'Asha\u0007' }))).status, 400);
  assert.strictEqual((await post('/register', details('n4@example.com', { name: "José O'Brien-Nair" }))).status, 200);
  assert.strictEqual((await post('/register', details('n5@example.com', { name: 'അനു' }))).status, 200);
});

test('wrong types and malformed JSON are rejected cleanly', async () => {
  assert.strictEqual((await post('/register', details(123 as any))).status, 400);
  assert.strictEqual((await post('/register', details('t@example.com', { password: { $gt: '' } }))).status, 400);
  assert.strictEqual((await post('/register', '{"name": "Asha", ', { raw: true })).status, 400);
  assert.strictEqual(await PendingRegistration.countDocuments(), 0);
});

test('client cannot set role, verification or other fields', async () => {
  for (const extra of [{ role: 'admin' }, { isVerified: true }, { isActive: true }, { _id: 'x' }]) {
    const r = await post('/register', details('r@example.com', extra));
    assert.strictEqual(r.status, 400, JSON.stringify(extra));
  }
  assert.strictEqual(await PendingRegistration.countDocuments(), 0);
});

test('an existing account gets 409 and no email', async () => {
  await User.create({ name: 'Existing', email: 'taken@example.com', password: PASSWORD, isVerified: true });
  const r = await post('/register', details('TAKEN@Example.com'));
  assert.strictEqual(r.status, 409);
  assert.strictEqual(outbox.length, 0);
});

test('concurrent registrations for one address send exactly one code', async () => {
  const replies = await Promise.all(Array.from({ length: 6 }, () => post('/register', details('race@example.com'))));
  const statuses = replies.map((r) => r.status).sort();
  assert.strictEqual(statuses.filter((s) => s === 200).length, 1, `statuses: ${statuses}`);
  assert.ok(statuses.every((s) => s === 200 || s === 429), `statuses: ${statuses}`);
  assert.strictEqual(outbox.length, 1);
  assert.strictEqual(await PendingRegistration.countDocuments({ email: 'race@example.com' }), 1);
});

test('re-registering cannot bypass the cooldown or reset the send count', async () => {
  await register();
  const again = await post('/register', details());
  assert.strictEqual(again.status, 429);
  assert.match(again.json.message, /wait \d+s/);
  await skipCooldown('asha@example.com');
  await register();
  const pending = await PendingRegistration.findOne({ email: 'asha@example.com' }).lean();
  assert.strictEqual(pending!.resendCount, 2);
});

test('nothing the registrant typed reaches the email', async () => {
  // The form can be filled in with any address, so the name must not become a
  // way to put someone's own text into a Belovi email to a stranger.
  const name = 'Claim your prize at evil.example';
  await register(details('x@example.com', { name }));
  const mail = outbox[0];
  for (const part of [mail.subject, mail.text!, mail.html!]) {
    assert.ok(!part.includes('evil.example') && !part.includes('Claim your prize'), `registrant text leaked: ${part.slice(0, 80)}`);
  }
});

test('the verification email is a complete, lean message', async () => {
  const code = await register();
  const mail = outbox[0];
  assert.strictEqual(mail.subject, 'Your Belovi verification code');
  assert.match(mail.html!, /^<!doctype html>/i);
  assert.match(mail.html!, /<meta name="viewport"/);
  assert.match(mail.html!, /<html lang="en">/);
  assert.ok(!/<a\s|<img\s|https?:\/\//i.test(mail.html!), 'no links or images');
  assert.ok(mail.text!.includes(code) && mail.html!.includes(code));
  assert.match(mail.text!, /expires in 5 minutes/);
  assert.match(mail.html!, /expires in 5 minutes/);
});

// OTP delivery and verification

test('SMTP authentication failure returns 503 and leaves nothing behind', async () => {
  smtpFailure = { code: 'EAUTH', message: 'Invalid login: 535-5.7.8 Username and Password not accepted' };
  const r = await post('/register', details());
  assert.strictEqual(r.status, 503);
  assert.ok(!/EAUTH|535|Password not accepted|test\.invalid/.test(r.text), 'no SMTP detail leaks to the client');
  assert.strictEqual(await PendingRegistration.countDocuments(), 0);
});

test('SMTP connection failure returns 503', async () => {
  smtpFailure = { code: 'ECONNECTION', message: 'connect ECONNREFUSED' };
  assert.strictEqual((await post('/register', details())).status, 503);
  assert.strictEqual(await PendingRegistration.countDocuments(), 0);
});

test('the correct code creates one verified account and a session', async () => {
  const code = await register();
  const r = await post('/register/verify', { email: 'asha@example.com', otp: code });
  assert.strictEqual(r.status, 201, r.text);
  assert.ok(r.json.data.token);
  assert.strictEqual(r.json.data.role, 'customer');
  assert.deepStrictEqual(Object.keys(r.json.data).sort(), ['_id', 'email', 'name', 'role', 'token']);
  assert.match(r.headers.get('set-cookie') || '', /jwt=.*HttpOnly.*SameSite=Strict/i);

  const user = await User.findOne({ email: 'asha@example.com' }).select('+password');
  assert.ok(user && user.isVerified && user.isActive && user.role === 'customer');
  assert.notStrictEqual(user.password, PASSWORD);
  assert.ok(await bcrypt.compare(PASSWORD, user.password!), 'stored hash matches the chosen password');
  assert.strictEqual(await PendingRegistration.countDocuments(), 0);
});

test('an incorrect code is rejected with attempts remaining', async () => {
  const code = await register();
  const wrong = code === '123456' ? '654321' : '123456';
  const r = await post('/register/verify', { email: 'asha@example.com', otp: wrong });
  assert.strictEqual(r.status, 400);
  assert.match(r.json.message, /4 attempts remaining/);
});

test('malformed codes are rejected before any lookup', async () => {
  await register();
  for (const otp of ['12345', '1234567', '12a456', 123456 as any, '']) {
    assert.strictEqual((await post('/register/verify', { email: 'asha@example.com', otp })).status, 400, String(otp));
  }
  const pending = await PendingRegistration.findOne().lean();
  assert.strictEqual(pending!.attempts, 0, 'malformed input does not spend attempts');
});

test('an expired code is rejected (server time)', async () => {
  const code = await register();
  await PendingRegistration.updateOne({}, { otpExpiresAt: new Date(Date.now() - 1000) });
  const r = await post('/register/verify', { email: 'asha@example.com', otp: code });
  assert.strictEqual(r.status, 410);
  assert.strictEqual(await User.countDocuments(), 0);
});

test('a code cannot be used twice', async () => {
  const code = await register();
  assert.strictEqual((await post('/register/verify', { email: 'asha@example.com', otp: code })).status, 201);
  assert.strictEqual((await post('/register/verify', { email: 'asha@example.com', otp: code })).status, 404);
  assert.strictEqual(await User.countDocuments(), 1);
});

test('a resend invalidates the previous code', async () => {
  const first = await register();
  await skipCooldown('asha@example.com');
  const r = await post('/register/resend', { email: 'asha@example.com' });
  assert.strictEqual(r.status, 200, r.text);
  const second = codeIn(outbox[outbox.length - 1]);
  if (first !== second) {
    assert.strictEqual((await post('/register/verify', { email: 'asha@example.com', otp: first })).status, 400);
  }
  assert.strictEqual((await post('/register/verify', { email: 'asha@example.com', otp: second })).status, 201);
});

test('a code with leading zeros survives the round trip', async () => {
  const original = crypto.randomInt;
  (crypto as any).randomInt = () => 42;
  try {
    const code = await register();
    assert.strictEqual(code, '000042');
    assert.strictEqual((await post('/register/verify', { email: 'asha@example.com', otp: '000042' })).status, 201);
  } finally {
    (crypto as any).randomInt = original;
  }
});

test('five wrong codes end the registration', async () => {
  const code = await register();
  const wrong = code === '000000' ? '111111' : '000000';
  for (let i = 1; i <= 4; i++) {
    const r = await post('/register/verify', { email: 'asha@example.com', otp: wrong });
    assert.strictEqual(r.status, 400);
    assert.match(r.json.message, new RegExp(`${5 - i} attempt`));
  }
  const fifth = await post('/register/verify', { email: 'asha@example.com', otp: wrong });
  assert.strictEqual(fifth.status, 400);
  assert.match(fifth.json.message, /Too many incorrect attempts/);
  // Even the right code is now useless.
  assert.strictEqual((await post('/register/verify', { email: 'asha@example.com', otp: code })).status, 404);
  assert.strictEqual(await User.countDocuments(), 0);
});

test('resend respects the cooldown', async () => {
  await register();
  const r = await post('/register/resend', { email: 'asha@example.com' });
  assert.strictEqual(r.status, 429);
  assert.match(r.json.message, /Please wait \d+s/);
  assert.strictEqual(outbox.length, 1);
});

test('resend respects the per-address cap', async () => {
  await register();
  await PendingRegistration.updateOne({}, { resendCount: 5, lastSentAt: new Date(Date.now() - 61_000) });
  const r = await post('/register/resend', { email: 'asha@example.com' });
  assert.strictEqual(r.status, 429);
  assert.match(r.json.message, /Too many codes/);
});

test('a failed resend keeps the earlier code working and the cooldown clear', async () => {
  const first = await register();
  await skipCooldown('asha@example.com');
  smtpFailure = { code: 'ETIMEDOUT', message: 'Greeting never received' };
  assert.strictEqual((await post('/register/resend', { email: 'asha@example.com' })).status, 503);
  smtpFailure = null;
  // Not blocked by a cooldown for the send that failed…
  const pending = await PendingRegistration.findOne().lean();
  assert.ok(pending!.lastSentAt.getTime() < Date.now() - 60_000);
  assert.strictEqual(pending!.resendCount, 1);
  // …and the code that did arrive still works.
  assert.strictEqual((await post('/register/verify', { email: 'asha@example.com', otp: first })).status, 201);
});

test('resend for an unknown address is 404', async () => {
  assert.strictEqual((await post('/register/resend', { email: 'nobody@example.com' })).status, 404);
});

test('parallel wrong guesses cannot exceed the attempt limit', async () => {
  const code = await register();
  const wrong = code === '000000' ? '111111' : '000000';
  const replies = await Promise.all(
    Array.from({ length: 15 }, () => post('/register/verify', { email: 'asha@example.com', otp: wrong }))
  );
  const counted = replies.filter((r) => r.status === 400).length;
  assert.ok(counted <= 5, `${counted} guesses were evaluated; the limit is 5`);
  assert.strictEqual((await post('/register/verify', { email: 'asha@example.com', otp: code })).status, 404);
  assert.strictEqual(await User.countDocuments(), 0);
});

test('parallel correct verifications create exactly one account', async () => {
  const code = await register();
  const replies = await Promise.all(
    Array.from({ length: 6 }, () => post('/register/verify', { email: 'asha@example.com', otp: code }))
  );
  const created = replies.filter((r) => r.status === 201).length;
  assert.strictEqual(created, 1, `statuses: ${replies.map((r) => r.status)}`);
  assert.strictEqual(await User.countDocuments({ email: 'asha@example.com' }), 1);
});

test('verification cannot be skipped or pointed at another address', async () => {
  assert.strictEqual((await post('/register/verify', { email: 'ghost@example.com', otp: '123456' })).status, 404);
  const code = await register(details('owner@example.com'));
  assert.strictEqual((await post('/register/verify', { email: 'other@example.com', otp: code })).status, 404);
  assert.strictEqual((await post('/signin', { email: 'owner@example.com', password: PASSWORD })).status, 401);
  assert.strictEqual(await User.countDocuments(), 0);
});

// Delivery diagnostics

test('SMTP sockets are opened through the OS resolver', async () => {
  const server = net.createServer((s) => {
    s.on('error', () => {}); // the client hangs up first; that reset is expected
    s.end('220 test\r\n');
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const port = (server.address() as AddressInfo).port;
  const open = (host: string) =>
    new Promise<{ err: any; so: any }>((resolve) => connectViaOs({ host, port }, (err, so) => resolve({ err, so })));
  try {
    // A hostname, resolved by the OS (not nodemailer's own DNS queries).
    const ok = await open('localhost');
    assert.ifError(ok.err);
    assert.ok(ok.so.connection instanceof net.Socket);
    ok.so.connection.destroy();
  } finally {
    await new Promise((r) => server.close(r));
  }
  const refused = await open('127.0.0.1');
  assert.ok(refused.err && refused.err.code, 'a refused connection reports an error code');
  assert.strictEqual(refused.so, undefined);
});

test('each registration request has an id, in its response header and its log lines', async () => {
  const r = await post('/register', details());
  const id = r.headers.get('x-request-id') || '';
  assert.match(id, /^[0-9a-f-]{36}$/);
  assert.ok(logLines.some((l) => l.includes(`register ${id}`) && l.includes('SMTP accepted')), 'accepted send logged with the id');
});

test('a failed send logs the code, the hint and the request id', async () => {
  smtpFailure = { code: 'EAUTH', message: 'Invalid login: 535-5.7.8 Username and Password not accepted' };
  const r = await post('/register', details());
  assert.strictEqual(r.status, 503);
  const id = r.headers.get('x-request-id');
  const line = logLines.find((l) => l.includes(`register ${id}`) && l.includes('SMTP send failed'));
  assert.ok(line, 'failure logged with the request id');
  assert.match(line!, /EAUTH/);
  assert.match(line!, /check SMTP_USER and SMTP_PASS/);
  assert.ok(logLines.some((l) => l.includes(`register ${id}`) && l.includes('answered 503')));
});

test('a client request id is reused only when it is a plain token', async () => {
  const good = await call('POST', '/api/v1/auth/register', details('g@example.com'), { headers: { 'X-Request-Id': 'support-ticket-1234' } });
  assert.strictEqual(good.headers.get('x-request-id'), 'support-ticket-1234');
  const bad = await call('POST', '/api/v1/auth/register', details('b@example.com'), { headers: { 'X-Request-Id': 'fake] ADMIN LOGIN OK [' } });
  assert.match(bad.headers.get('x-request-id') || '', /^[0-9a-f-]{36}$/);
});

// Accounts and sign-in

test('verified customers sign in with exactly the password they chose', async () => {
  // These patterns used to be stripped by the XSS sanitiser before hashing.
  const password = 'Bonus=Pass1!javascript:';
  const code = await register(details('kai@example.com', { password }));
  assert.strictEqual((await post('/register/verify', { email: 'kai@example.com', otp: code })).status, 201);
  const ok = await post('/signin', { email: 'KAI@example.com', password });
  assert.strictEqual(ok.status, 200, ok.text);
  assert.strictEqual((await post('/signin', { email: 'kai@example.com', password: 'BPass1!' })).status, 401);
});

test('unverified accounts cannot sign in with a password', async () => {
  await User.create({ name: 'Old', email: 'old@example.com', password: PASSWORD, isVerified: false });
  const r = await post('/signin', { email: 'old@example.com', password: PASSWORD });
  assert.strictEqual(r.status, 403);
  assert.match(r.json.message, /verify your email/i);
  // A wrong password still gets the generic answer — nothing about verification.
  assert.strictEqual((await post('/signin', { email: 'old@example.com', password: 'Wr0ng!Pass' })).status, 401);
});

test('the new session works on an existing protected route', async () => {
  const code = await register();
  const v = await post('/register/verify', { email: 'asha@example.com', otp: code });
  const authed = await call('GET', '/api/v1/cart', undefined, { token: v.json.data.token });
  assert.strictEqual(authed.status, 200, authed.text);
  assert.strictEqual((await call('GET', '/api/v1/cart')).status, 401);
});

test('admin login is unaffected', async () => {
  await User.create({ name: 'Admin', email: 'admin@example.com', password: PASSWORD, role: 'admin', isVerified: true });
  assert.strictEqual((await post('/login', { email: 'admin@example.com', password: PASSWORD })).status, 200);
  assert.strictEqual((await post('/login', { email: 'admin@example.com', password: 'Wr0ng!Pass' })).status, 401);
});

test('the per-IP code limiter answers in JSON', async () => {
  const ip = '10.200.0.1';
  for (let i = 0; i < 3; i++) await post('/register', details(`limit${i}@example.com`), { ip });
  const r = await post('/register', details('limit3@example.com'), { ip });
  assert.strictEqual(r.status, 429);
  assert.strictEqual(r.json?.success, false);
  assert.match(r.json.message, /Too many verification codes/);
});

test('a database outage returns a generic 500 in production', async () => {
  const previous = ENV.NODE_ENV;
  ENV.NODE_ENV = 'production';
  mongoose.set('bufferTimeoutMS', 1500);
  await mongoose.disconnect();
  try {
    const r = await post('/register', details());
    assert.strictEqual(r.status, 500);
    assert.strictEqual(r.json.message, 'Something went wrong. Please try again.');
    assert.strictEqual(r.json.errors ?? undefined, undefined, 'no stack trace');
  } finally {
    ENV.NODE_ENV = previous;
    // No background index or collection creation: either would recreate the
    // database after the runner drops it.
    await mongoose.connect(LOCAL_URI, { dbName: DB_NAME, autoIndex: false, autoCreate: false });
  }
});

// ── Runner ───────────────────────────────────────────────────────────────────

(async () => {
  await mongoose.connect(LOCAL_URI, { dbName: DB_NAME, serverSelectionTimeoutMS: 5000 });
  await Promise.all([User.init(), PendingRegistration.init()]); // unique indexes in place
  const server = app.listen(0);
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  let failed = 0;
  for (const [name, fn] of tests) {
    await User.deleteMany({});
    await PendingRegistration.deleteMany({});
    outbox.length = 0;
    logLines.length = 0;
    smtpFailure = null;
    closeEmailConnection();
    try {
      await fn();
      // Whatever the test did, no log line may carry a password, the SMTP
      // password, or a code that was emailed.
      const secrets = [PASSWORD, process.env.SMTP_PASS!, ...outbox.map((m) => m.text?.match(/\b(\d{6})\b/)?.[1])]
        .filter((s): s is string => Boolean(s));
      const leaked = logLines.find((l) => secrets.some((s) => l.includes(s)));
      assert.ok(!leaked, `secret in log: ${leaked}`);
      console.log(`PASS  ${name}`);
    } catch (err: any) {
      failed++;
      console.log(`FAIL  ${name}\n      ${err?.message || err}`);
    }
  }

  server.close();
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  console.log(`\n${tests.length - failed}/${tests.length} passed`);
  process.exit(failed ? 1 : 0);
})().catch(async (err) => {
  console.error('Test run aborted:', err);
  await mongoose.connection.dropDatabase().catch(() => {});
  process.exit(1);
});
