// Reads app.json. For web builds inside the phone mock-up (npm run build:showcase)
// and the demo build, export the web app as a single page.
module.exports = ({ config }) => {
  const singlePage = process.env.SHOWCASE === '1' || process.env.EXPO_PUBLIC_DEMO === '1';
  if (!singlePage) return config;
  return { ...config, web: { ...config.web, output: 'single' } };
};
