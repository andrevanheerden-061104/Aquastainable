// Builds the web version inside a phone mock-up, ready for Vercel.
//
//   npm run build:showcase         -> real app (your Firebase + Render backend)
//   npm run build:showcase:demo    -> sample data, no backend needed
//
// Output: dist/
//   index.html  phone mock-up page (from showcase/index.html)
//   app.html    the Expo web app, shown inside the phone (or full screen on a real phone)
//   _expo/, assets/ ...
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const dist = path.join(root, 'dist');
const demo = process.argv.includes('--demo') || process.env.EXPO_PUBLIC_DEMO === '1';

const env = { ...process.env, SHOWCASE: '1', ...(demo ? { EXPO_PUBLIC_DEMO: '1' } : {}) };
fs.rmSync(dist, { recursive: true, force: true });
console.log(`Exporting web app (${demo ? 'demo data' : 'live backend'})…`);
const expoCli = require.resolve('expo/bin/cli', { paths: [root] });
execSync(`"${process.execPath}" "${expoCli}" export --platform web --output-dir dist`, { cwd: root, env, stdio: 'inherit' });

// 1. The app page: start the router at ?route=… (or the current path), so it works
//    both inside the phone frame and when opened directly.
const appHtmlPath = path.join(dist, 'index.html');
let appHtml = fs.readFileSync(appHtmlPath, 'utf8');
const boot = `<script>
      (function () {
        try {
          var params = new URLSearchParams(location.search);
          var route = params.get('route');
          if (!route) route = location.pathname === '/app.html' ? '/' : location.pathname;
          history.replaceState(null, '', route);
        } catch (e) {}
      })();
    </script>
    <style>html,body{background:#101217}</style>`;
appHtml = appHtml.replace('<meta charset="utf-8" />', `<meta charset="utf-8" />\n    ${boot}`);
fs.writeFileSync(path.join(dist, 'app.html'), appHtml);
fs.rmSync(appHtmlPath);

// 2. The phone mock-up page.
const text = demo
  ? {
      MODE_CAPTION: 'sample data',
      MODE_INTRO: 'The real app running with sample tanks, fish and chats.',
      MODE_CODE_TIP: 'Then type any 6 digits on the code screen; it checks itself.',
      MODE_NOTE: 'Sample data only: this version does not talk to the live backend.',
    }
  : {
      MODE_CAPTION: 'live app',
      MODE_INTRO: 'The live app: sign in with your account to see your own tanks, fish and chats.',
      MODE_CODE_TIP: 'If 2-step sign-in is on, type the 6-digit code from your email; it checks itself.',
      MODE_NOTE: 'This is the live app connected to the Aquastainable backend.',
    };
let page = fs.readFileSync(path.join(root, 'showcase', 'index.html'), 'utf8');
for (const [key, value] of Object.entries(text)) page = page.split(`{{${key}}}`).join(value);
fs.writeFileSync(path.join(dist, 'index.html'), page);

console.log('\nDone: dist/index.html (phone mock-up) + dist/app.html (app).');
console.log('Preview locally with:  npx serve dist');
