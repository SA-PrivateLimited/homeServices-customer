const path = require('path');
const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

/**
 * Resolve @react-native-firebase/* to local shims (Mongo/JWT only).
 * Resolve monorepo sapvt-ltd-app-packages and force a single React instance.
 */
const projectRoot = __dirname;
const monorepoPackages = path.resolve(projectRoot, '../packages');
const appPackagesRoot = path.resolve(monorepoPackages, 'saPvtLtdAppPackages');
const appNodeModules = path.resolve(projectRoot, 'node_modules');

const firebaseShims = {
  // Real Firebase Auth is used for Phone OTP; keep other modules stubbed.
  '@react-native-firebase/firestore': path.resolve(
    __dirname,
    'src/shims/firestore.js',
  ),
  '@react-native-firebase/database': path.resolve(
    __dirname,
    'src/shims/database.js',
  ),
  '@react-native-firebase/messaging': path.resolve(
    __dirname,
    'src/shims/messaging.js',
  ),
  '@react-native-firebase/storage': path.resolve(
    __dirname,
    'src/shims/storage.js',
  ),
  '@react-native-firebase/functions': path.resolve(
    __dirname,
    'src/shims/functions.js',
  ),
};

const config = {
  watchFolders: [appPackagesRoot, monorepoPackages],
  resolver: {
    unstable_enableSymlinks: true,
    nodeModulesPaths: [appNodeModules],
    extraNodeModules: {
      'sapvt-ltd-app-packages': appPackagesRoot,
      react: path.resolve(appNodeModules, 'react'),
      'react-native': path.resolve(appNodeModules, 'react-native'),
    },
    // Package ships its own react as a devDependency — never bundle that copy
    blockList: [
      new RegExp(
        `${appPackagesRoot.replace(/[/\\]/g, '[/\\\\]')}[/\\\\]node_modules[/\\\\].*`,
      ),
    ],
    resolveRequest: (context, moduleName, platform) => {
      if (firebaseShims[moduleName]) {
        return {
          filePath: firebaseShims[moduleName],
          type: 'sourceFile',
        };
      }
      if (moduleName === 'sapvt-ltd-app-packages') {
        return {
          filePath: path.resolve(appPackagesRoot, 'src/index.ts'),
          type: 'sourceFile',
        };
      }
      return context.resolveRequest(context, moduleName, platform);
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
