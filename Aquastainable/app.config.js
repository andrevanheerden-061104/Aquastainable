// Reads app.json. For the phone-preview build (EXPO_PUBLIC_DEMO=1) it exports the web
// app as a single page so it can be hosted inside the preview frame.
module.exports = ({ config }) => {
  if (process.env.EXPO_PUBLIC_DEMO !== '1') return config;
  return { ...config, web: { ...config.web, output: 'single' } };
};
