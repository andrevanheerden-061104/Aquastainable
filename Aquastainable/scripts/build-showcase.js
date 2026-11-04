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
          // app.html may be served as /app.html, /app or /app/ (e.g. "npx serve"
          // strips .html). Any of those means "start of the app".
          var path = location.pathname;
          while (path.length > 1 && path.charAt(path.length - 1) === '/') path = path.slice(0, -1);
          var isAppPage = path === '' || path === '/' || path === '/app' || path === '/app.html';
          var route = isAppPage ? '/' : location.pathname;
          history.replaceState(null, '', route + location.hash);
        } catch (e) {}
      })();
    </script>
    <script>
      // Inside the phone mock-up the app fills the whole screen, under the drawn
      // status bar (top) and home bar (bottom). Tell the safe-area library about
      // them: it reads its insets from the padding of a hidden element it adds.
      if (window.self !== window.top) {
        document.write('<style>body > div[style*="transition-property: padding"]{padding-top:50px !important;padding-bottom:28px !important;}</style>');
      }
    </script>
    <style>html,body{background:#0B0D11}</style>`;
appHtml = appHtml.replace('<meta charset="utf-8" />', `<meta charset="utf-8" />\n    ${boot}`);
fs.writeFileSync(path.join(dist, 'app.html'), appHtml);
fs.rmSync(appHtmlPath);

// 2. The phone mock-up page (computer/tablet). Phones are sent straight to the app.
fs.copyFileSync(path.join(root, 'showcase', 'index.html'), path.join(dist, 'index.html'));

console.log('\nDone: dist/index.html (phone mock-up) + dist/app.html (app).');
console.log('Preview locally with:  npx serve dist');
