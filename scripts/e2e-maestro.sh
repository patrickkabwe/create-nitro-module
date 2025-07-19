#!/bin/bash

trap 'exit' INT

PLATFORM=${1:-}
EXAMPLE_DIR=${2:-}
SCHEME=${3:-}


echo "Running e2e tests for $PLATFORM"

# Validate passed platform
case $PLATFORM in
  ios | android )
    ;;

  *)
    echo "Error! You must pass either 'android' or 'ios'"
    echo ""
    exit 1
    ;;
esac

if [ "$PLATFORM" == "ios" ]; then
  cd $EXAMPLE_DIR/ios
  pod install
  
  # Get iPhone 16 simulator ID dynamically
  iphone16Id=$(xcrun simctl list devices | grep "iPhone 16 (" | grep -E '\(Booted\)|\(Shutdown\)' | head -1 | grep -E -o '\([0-9A-F-]{36}\)' | tr -d '()')
  echo "Using iPhone 16 simulator with ID: $iphone16Id"
  
  # Boot the simulator if it's not already booted
  xcrun simctl boot "$iphone16Id" 2>/dev/null || echo "Simulator already booted or boot failed"

  # Build the app
  xcodebuild -workspace $SCHEME.xcworkspace -configuration Release -scheme $SCHEME -destination id=$iphone16Id CODE_SIGNING_ALLOWED=NO
  
  # Find and install the built app
  APP_PATH=$(find build/Build/Products/Release-iphonesimulator -name "*.app" | head -1)
  echo "Installing app from: $APP_PATH"
  xcrun simctl install $iphone16Id "$APP_PATH"
  
  # Launch the app
  BUNDLE_ID=$(plutil -extract CFBundleIdentifier raw "$APP_PATH/Info.plist")
  echo "Launching app with bundle ID: $BUNDLE_ID"
  xcrun simctl launch $iphone16Id $BUNDLE_ID
  cd ../../..
else
  cd $EXAMPLE_DIR/android
  chmod +x ./gradlew
  ./gradlew assembleRelease --no-daemon --build-cache
  APK_PATH="app/build/outputs/apk/release/app-release.apk"
  adb install -r $APK_PATH
  cd ../../..
fi

echo "Script directory: "$(pwd)""

# Get all test files
allTestFiles=$(ls ./e2e-tests/*.yaml)

echo "Found test files: $allTestFiles"

failedTests=()
for file in $allTestFiles
do
  testName=$(basename "${file%.*}")
  testCmd="maestro test \"$file\" --flatten-debug-output"
  if ! eval "$testCmd --debug-output e2e-artifacts/$testName";
  then
    echo "Test ${file} failed. Retrying in 30 seconds..."
    sleep 30
    if ! eval "$testCmd --debug-output e2e-artifacts/$testName-retry-1";
    then
      echo "Test ${file} failed again. Retrying for the last time in 120 seconds..."
      sleep 120
      if ! eval "$testCmd --debug-output e2e-artifacts/$testName-retry-2";
      then
        failedTests+=("$file")
      fi
    fi
  fi
done

if [ ${#failedTests[@]} -eq 0 ]; then
    exit 0
else
    echo "These tests failed:"
    printf '%s\n' "${failedTests[@]}"
    exit 1
fi