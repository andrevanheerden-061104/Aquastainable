// Live web version inside the phone mock-up, for development.
//
//   npm run web:phone
//
// Starts the normal Expo web dev server (port 8081, live reload like Expo Go) and a
// small page on http://localhost:3000 that shows it inside the phone frame.
// Save a file and the app in the phone updates by itself; no rebuild needed.
const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');
const path = require('path');

const root = path.join(__dirname, '..');
const APP_PORT = Number(process.env.APP_PORT || 8081);
const FRAME_PORT = Number(process.env.FRAME_PORT || 3000);
const appUrl = `http://localhost:${APP_PORT}`;

// 1. Expo dev server (same as `npx expo start --web`).
const expoCli = require.resolve('expo/bin/cli', { paths: [root] });
const expo = spawn(process.execPath, [expoCli, 'start', '--web', '--port', String(APP_PORT), ...process.argv.slice(2)], {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, BROWSER: 'none' }, // we open the phone page instead
});

// 2. The phone frame page, pointing at the dev server.
const page = () => fs.readFileSync(path.join(root, 'showcase', 'index.html'), 'utf8')
  .split('src="/app.html"').join(`src="${appUrl}"`)
  .split("location.replace('/app.html')").join(`location.replace('${appUrl}')`);

const server = http.createServer((req, res) => {
  if (req.url === '/favicon.ico') {
    res.writeHead(302, { Location: `${appUrl}/favicon.ico` });
    return res.end();
  }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(page());
});

server.listen(FRAME_PORT, () => {
  console.log(`\n  Phone mock-up (live): http://localhost:${FRAME_PORT}\n  App on its own:       ${appUrl}\n`);
  if (!process.env.CI) {
    const url = `http://localhost:${FRAME_PORT}`;
    const opener = process.platform === 'win32' ? ['cmd', ['/c', 'start', '', url]]
      : process.platform === 'darwin' ? ['open', [url]] : ['xdg-open', [url]];
    setTimeout(() => spawn(opener[0], opener[1], { stdio: 'ignore', detached: true }).on('error', () => {}).unref(), 4000);
  }
});

const stop = () => { server.close(); expo.kill(); process.exit(0); };
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
expo.on('exit', (code) => { server.close(); process.exit(code ?? 0); });
