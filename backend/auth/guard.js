// Auth guard for every API route.
//
// 1. Reads "Authorization: Bearer <Firebase ID token>" and verifies it with Firebase Admin.
// 2. Blocks requests that try to act as a different user (userId / user_id in the URL,
//    body or query must match the signed-in user). This closes the hole where anyone
//    could read or delete another user's tanks by changing the userId.
// 3. When OTP_REQUIRED=true, also requires that the 6-digit email code was confirmed
//    for this sign-in (custom claim mfaAt >= the token's auth_time).
//
// Roll-out switches (Render > Environment):
//   AUTH_ENFORCED=true  -> requests without a valid token are rejected (turn on once the
//                          updated app, which sends the token, is in use)
//   OTP_REQUIRED=true   -> 6-digit code required after every sign-in

const PUBLIC_PATHS = ['/health', '/signin', '/signup', '/ai/health'];
const OTP_EXEMPT_PREFIXES = ['/auth/otp'];

const isTrue = (value) => String(value || '').toLowerCase() === 'true';

// User ids that appear in the URL path of existing routes.
function userIdFromPath(path) {
  const patterns = [/^\/tanks\/([^/]+)/, /^\/fish\/user\/([^/]+)/, /^\/plants\/user\/([^/]+)/];
  for (const pattern of patterns) {
    const match = path.match(pattern);
    if (match) return decodeURIComponent(match[1]);
  }
  return null;
}

function claimedUserIds(req) {
  const ids = [
    userIdFromPath(req.path),
    req.body && (req.body.userId || req.body.user_id),
    req.query && (req.query.userId || req.query.user_id),
  ];
  return ids.filter((id) => typeof id === 'string' && id.trim()).map((id) => id.trim());
}

function createAuthGuard({ auth }) {
  return async function authGuard(req, res, next) {
    if (req.method === 'OPTIONS' || PUBLIC_PATHS.includes(req.path)) return next();

    const enforced = isTrue(process.env.AUTH_ENFORCED);
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';

    if (!token) {
      if (!enforced) return next(); // legacy clients still work until AUTH_ENFORCED is on
      return res.status(401).json({ error: 'Please sign in again.', code: 'auth/missing-token' });
    }
    if (!auth) return res.status(503).json({ error: 'Auth is not configured on the server.' });

    let decoded;
    try {
      decoded = await auth.verifyIdToken(token);
    } catch (error) {
      return res.status(401).json({ error: 'Your session has expired. Please sign in again.', code: 'auth/invalid-token' });
    }

    req.user = { uid: decoded.uid, email: decoded.email || '', token: decoded };

    const mismatch = claimedUserIds(req).find((id) => id !== decoded.uid);
    if (mismatch) return res.status(403).json({ error: 'You can only access your own aquarium data.', code: 'auth/wrong-user' });

    const otpExempt = OTP_EXEMPT_PREFIXES.some((prefix) => req.path.startsWith(prefix));
    if (isTrue(process.env.OTP_REQUIRED) && !otpExempt) {
      const verifiedAt = Number(decoded.mfaAt || 0);
      const signedInAt = Number(decoded.auth_time || 0);
      if (!verifiedAt || verifiedAt < signedInAt) {
        return res.status(403).json({ error: 'Enter the 6-digit code we emailed you.', code: 'auth/otp-required' });
      }
    }

    return next();
  };
}

module.exports = { createAuthGuard };
