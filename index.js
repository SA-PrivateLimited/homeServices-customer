// Import polyfills FIRST - before any other imports
import './polyfills';

import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';

// Firebase Messaging removed — push uses WebSocket / local notifications later.
AppRegistry.registerComponent(appName, () => App);
