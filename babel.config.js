module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module:react-native-dotenv',
      {
        moduleName: '@env',
        path: '.env',
        safe: false,
        allowUndefined: true,
        blocklist: null,
        allowlist: ['OPEN_AI_API_KEY', 'OPENAI_API_KEY', 'RAZORPAY_KEY_ID', 'PAYMENT_API_URL_DEV', 'PAYMENT_API_URL_PROD', 'ONESIGNAL_REST_API_KEY', 'APP_NAME', 'COPYRIGHT_OWNER', 'AGORA_APP_ID', 'GOOGLE_MAPS_API_KEY'],
        verbose: true,
      },
    ],
  ],
  // Exclude react-native-agora specs from codegen processing
  exclude: [
    /node_modules\/react-native-agora\/src\/specs\/.*\.tsx$/,
  ],
};
