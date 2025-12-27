#!/bin/bash

# Load environment variables
source ~/.zshrc 2>/dev/null || true

# Set Android SDK paths if not already set
export ANDROID_HOME=${ANDROID_HOME:-$HOME/Library/Android/sdk}
export PATH=$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$ANDROID_HOME/tools:$ANDROID_HOME/tools/bin:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH

# Run the React Native Android command
cd "$(dirname "$0")"
npx react-native run-android "$@"

