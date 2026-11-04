// 6-digit email code (second step after email + password).
//
// POST /auth/otp/send    -> creates a code, stores only its hash, emails it
// POST /auth/otp/verify  -> checks the code; on success sets the custom claim `mfaAt`
//                           so the guard knows this sign-in is verified
//
// Email is sent over HTTPS with Resend (https://resend.com). Render's free tier blocks
// SMTP ports (25/465/587), so Nodemailer + Gmail will NOT work there.
//
// Env vars:
//   RESEND_API_KEY   re_xxx key from resend.com
//   OTP_FROM_EMAIL   e.g. "Aquastainable <onboarding@resend.dev>" (or your verified domain)
//   OTP_DEV_LOG=true optional: also print the code in the server log (testing only)
const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const { FieldValue } = require('firebase-admin/firestore');

const CODE_TTL_MS = 10 * 60 * 1000; // code works for 10 minutes
const RESEND_COOLDOWN_MS = 30 * 1000; // wait 30 s between emails
const MAX_ATTEMPTS = 5; // wrong guesses before the code is burned

const hashCode = (code, salt) => crypto.createHash('sha256').update(`${salt}:${code}`).digest('hex');

const maskEmail = (email = '') => {
  const [name, domain] = email.split('@');
  if (!domain) return email;
  return `${name.slice(0, 2)}${'*'.repeat(Math.max(1, name.length - 2))}@${domain}`;
};

function emailHtml(code) {
  const digits = code.split('').map((digit) => `<span style="display:inline-block;width:40px;height:52px;line-height:52px;margin:0 3px;border-radius:12px;background:#1E222B;color:#F4F6F8;font-size:26px;font-weight:700;">${digit}</span>`).join('');
  return `
  <div style="background:#101217;padding:32px 16px;font-family:Montserrat,Arial,sans-serif;text-align:center;color:#F4F6F8">
    <h1 style="margin:0 0 6px;font-size:22px">Your Aquastainable code</h1>
    <p style="margin:0 0 24px;color:#A3ACBA;font-size:14px">Enter this code in the app to finish signing in.</p>
    <div>${digits}</div>
    <p style="margin:24px 0 0;color:#6E7684;font-size:12px">It expires in 10 minutes. If you didn't try to sign in, you can ignore this email.</p>
  </div>`;
}

async function sendEmail(to, code) {
  if (process.env.OTP_DEV_LOG === 'true') console.log(`[otp] code for ${to}: ${code}`);
  if (!process.env.RESEND_API_KEY) {
    if (process.env.OTP_DEV_LOG === 'true') return; // testing without email
    throw new Error('Email is not configured (RESEND_API_KEY missing).');
  }
  await axios.post('https://api.resend.com/emails', {
    from: process.env.OTP_FROM_EMAIL || 'Aquastainable <onboarding@resend.dev>',
    to: [to],
    subject: `${code} is your Aquastainable code`,
    text: `Your Aquastainable code is ${code}. It expires in 10 minutes.`,
    html: emailHtml(code),
  }, { headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` }, timeout: 10000 });
}

function createOtpRouter({ db, auth }) {
  const router = express.Router();

  // The auth guard has already verified the ID token and set req.user.
  router.use((req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Please sign in first.', code: 'auth/missing-token' });
    if (!db || !auth) return res.status(503).json({ error: 'Server is not configured.' });
    return next();
  });

  router.post('/send', async (req, res) => {
    try {
      const { uid, email } = req.user;
      if (!email) return res.status(400).json({ error: 'This account has no email address.' });

      const ref = db.collection('otpCodes').doc(uid);
      const existing = await ref.get();
      const lastSentAt = existing.exists ? Number(existing.data().lastSentAt || 0) : 0;
      const waitMs = lastSentAt + RESEND_COOLDOWN_MS - Date.now();
      if (waitMs > 0) {
        return res.status(429).json({ error: 'Please wait before asking for a new code.', resendInSeconds: Math.ceil(waitMs / 1000) });
      }

      const code = crypto.randomInt(0, 1000000).toString().padStart(6, '0');
      const salt = crypto.randomBytes(16).toString('hex');
      await ref.set({
        hash: hashCode(code, salt),
        salt,
        attempts: 0,
        expiresAt: Date.now() + CODE_TTL_MS,
        lastSentAt: Date.now(),
        createdAt: FieldValue.serverTimestamp(),
      });

      await sendEmail(email, code);
      return res.json({ sent: true, email: maskEmail(email), resendInSeconds: RESEND_COOLDOWN_MS / 1000 });
    } catch (error) {
      console.error('[otp] send failed', error?.response?.data || error);
      return res.status(500).json({ error: 'We could not send your code. Please try again.' });
    }
  });

  router.post('/verify', async (req, res) => {
    try {
      const { uid } = req.user;
      const code = String(req.body?.code || '').replace(/\D/g, '');
      if (code.length !== 6) return res.status(400).json({ error: 'Enter all 6 digits.' });

      const ref = db.collection('otpCodes').doc(uid);
      const snap = await ref.get();
      if (!snap.exists) return res.status(400).json({ error: 'Ask for a new code.', code: 'otp/none' });

      const data = snap.data();
      if (Date.now() > Number(data.expiresAt)) {
        await ref.delete();
        return res.status(400).json({ error: 'That code has expired. Ask for a new one.', code: 'otp/expired' });
      }
      if (Number(data.attempts) >= MAX_ATTEMPTS) {
        await ref.delete();
        return res.status(429).json({ error: 'Too many tries. Ask for a new code.', code: 'otp/locked' });
      }

      const expected = Buffer.from(data.hash, 'hex');
      const actual = Buffer.from(hashCode(code, data.salt), 'hex');
      if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) {
        const left = MAX_ATTEMPTS - Number(data.attempts) - 1;
        await ref.update({ attempts: FieldValue.increment(1) });
        return res.status(400).json({ error: left > 0 ? `That code isn't right. ${left} ${left === 1 ? 'try' : 'tries'} left.` : 'Too many tries. Ask for a new code.', code: 'otp/wrong', attemptsLeft: left });
      }

      await ref.delete();
      const user = await auth.getUser(uid);
      const claims = { ...(user.customClaims || {}), mfaAt: Math.floor(Date.now() / 1000) };
      await auth.setCustomUserClaims(uid, claims);
      // The app must now call user.getIdToken(true) to pick up the new claim.
      return res.json({ verified: true });
    } catch (error) {
      console.error('[otp] verify failed', error);
      return res.status(500).json({ error: 'Could not check your code. Please try again.' });
    }
  });

  return router;
}

module.exports = { createOtpRouter };
