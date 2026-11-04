# 6-digit email code (2FA) setup

Flow: email + password → app shows the code screen → backend emails a 6-digit code → user types it → app opens.
Codes last 10 minutes, allow 5 tries, and can be re-sent every 30 seconds. Only a hash of the code is stored.

Email goes out through **Resend** over HTTPS, because Render's free tier blocks SMTP (ports 25/465/587), so Nodemailer + Gmail will not work there.

## 1. Rotate the leaked keys first
`backend/.env` was committed in git history (commits `99d927a`, `2e6a294`) and the repo is public.
- Firebase console → Project settings → Service accounts → delete the old key, **Generate new private key**.
- Groq console → API keys → revoke the old key, create a new one.
- Cloudinary → Settings → API keys → regenerate.
- Put the new values in Render → your service → **Environment** (not in git).

## 2. Create a Resend account
1. Sign up at https://resend.com (free tier).
2. **API Keys → Create API key** (permission: Sending access). Copy it (`re_...`).
3. For testing you can send from `onboarding@resend.dev`, but Resend only delivers those to **your own signup email**.
   To send to anyone: **Domains → Add domain**, add the DNS records it shows, wait for "Verified", then use e.g. `Aquastainable <codes@yourdomain.com>`.

## 3. Add environment variables on Render
Render → aquastainable service → Environment → add:

| Key | Value |
|---|---|
| `RESEND_API_KEY` | `re_...` from step 2 |
| `OTP_FROM_EMAIL` | `Aquastainable <onboarding@resend.dev>` (or your verified domain address) |
| `AUTH_ENFORCED` | `false` for now |
| `OTP_REQUIRED` | `false` for now |

Optional for testing only: `OTP_DEV_LOG=true` prints the code in the Render logs.

Save → Render redeploys. Firebase Admin is already set up, so nothing else is needed in the Firebase console
(the code uses Firestore collection `otpCodes` and a custom claim `mfaAt`; both are created automatically).

## 4. Turn it on in the app
Create `Aquastainable/.env` (Expo reads `EXPO_PUBLIC_*` at build time):
```
EXPO_PUBLIC_OTP_ENABLED=true
```
Restart Expo with `npx expo start -c`. Sign in: you should land on the code screen and get the email.

## 5. Enforce it on the server
Once the new app build is the one in use (it sends the Firebase ID token on every request):
- Set `AUTH_ENFORCED=true`: requests without a valid token are rejected, and users can only touch their own data.
- Set `OTP_REQUIRED=true`: every API call needs the code to have been confirmed for the current sign-in.

## Troubleshooting
- **"We could not send your code"**: check the Render logs. A 403 from Resend usually means the `from` address/domain is not verified, or you sent from `onboarding@resend.dev` to an email that isn't your Resend account email.
- **Stuck on the code screen after a correct code**: make sure the app calls `getIdToken(true)` (it does in `useAuthApi.verifyOtp`) and that `OTP_REQUIRED` is only on after step 4 works.
- **401 everywhere after enabling `AUTH_ENFORCED`**: an old app build is still running. Rebuild/restart Expo.
