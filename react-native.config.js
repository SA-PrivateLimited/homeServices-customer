module.exports = {
  project: {
    ios: {},
    android: {},
  },
  assets: ['./src/assets/fonts/'],
  dependencies: {
    // Exclude react-native-maps from autolinking (has compatibility issues)
    'react-native-maps': {
      platforms: {
        android: null, // disable Android platform, as it's not needed
      },
    },
  },
};
