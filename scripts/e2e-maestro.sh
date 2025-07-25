#!/bin/bash

trap 'exit' INT

PLATFORM=${1:-}
EXAMPLE_DIR=${2:-}
PACKAGE_TYPE=${3:-}

echo "🚀 Running e2e tests for $PLATFORM"

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


APP_ID=""
SCHEME=""

if [ "$PACKAGE_TYPE" == "module" ]; then
    APP_ID="com.testmoduleexample"
    SCHEME="TestModuleExample"
elif [ "$PACKAGE_TYPE" == "view" ]; then
    APP_ID="com.testviewexample"
    SCHEME="TestViewExample"
else
    echo "Error! You must pass either 'module' or 'view'"
    echo ""
    exit 1
fi


if [ "$PLATFORM" == "ios" ]; then
  cd $EXAMPLE_DIR/ios
  
  # Only run pod install if Pods directory doesn't exist or Podfile.lock is newer
  if [ ! -d "Pods" ] || [ "Podfile.lock" -nt "Pods/Manifest.lock" ]; then
    echo "📦 Installing/updating Pods..."
    pod install
  else
    echo "✅ Skipping pod install - Pods are up to date"
  fi
  
  # Get iPhone 16 simulator ID dynamically
  iphone16Id=$(xcrun simctl list devices | grep "iPhone 16 (" | grep -E '\(Booted\)|\(Shutdown\)' | head -1 | grep -E -o '\([0-9A-F-]{36}\)' | tr -d '()')
  echo "📱 Using iPhone 16 simulator with ID: $iphone16Id"

  # Build the app with optimizations and pretty output
  export USE_CCACHE=1

  buildCmd="xcodebuild \
    CC=clang CPLUSPLUS=clang++ LD=clang LDPLUSPLUS=clang++ \
    -derivedDataPath build \
    -UseModernBuildSystem=YES \
    -workspace $SCHEME.xcworkspace \
    -configuration Release \
    -scheme $SCHEME \
    -destination id=$iphone16Id \
    -parallelizeTargets \
    -jobs $(sysctl -n hw.ncpu) \
    CODE_SIGNING_ALLOWED=NO"

  echo "🔨 Building iOS app..."
  echo $buildCmd
  # Check if xcpretty is available
  if command -v xcpretty >/dev/null 2>&1; then
    set -o pipefail && $buildCmd | xcpretty
  else
    echo "⚠️  xcpretty not found. Install with: gem install xcpretty"
    $buildCmd
  fi
  
  # Launch the simulator if not already booted
  if ! xcrun simctl list devices | grep "$iphone16Id" | grep -q "Booted"; then
    echo "🚀 Booting simulator..."
    xcrun simctl boot $iphone16Id
  else
    echo "✅ Simulator already booted"
  fi
  # Wait for 10 seconds
  sleep 10
  
  # Find and install the built app
  APP_PATH=$(find build/Build/Products/Release-iphonesimulator -name "*.app" | head -1)
  echo "📲 Installing app from: $APP_PATH"
  xcrun simctl install $iphone16Id "$APP_PATH"
  
  cd ../../..
else
  cd $EXAMPLE_DIR/android
  chmod +x ./gradlew
  
  # Build with optimizations and pretty output
  echo "🔨 Building Android app..."
  ./gradlew assembleRelease --no-daemon --build-cache --parallel --console=rich
  APK_PATH="app/build/outputs/apk/release/app-release.apk"
  
  # Install the APK
  echo "📲 Installing APK: $APK_PATH"
  adb install -r $APK_PATH
  
  # Stop Gradle daemon to free up memory
  echo "🧹 Stopping Gradle daemon..."
  ./gradlew --stop
  cd ../../..
fi

echo "📂 Script directory: $(pwd)"
echo ""

test_file="e2e-tests/$PACKAGE_TYPE.e2e.yaml"

echo "🧪 Using test file: $test_file"

if [ ! -f "$test_file" ]; then
  echo "❌ Error! Test file not found: $test_file"
  echo ""
  exit 1
fi

testCmd="maestro test \"$test_file\" -e APP_ID=$APP_ID --flatten-debug-output"
echo "🎯 Running test: $testCmd"
echo "📱 APP_ID: $APP_ID"


if ! eval "$testCmd --debug-output e2e-artifacts/$PACKAGE_TYPE"; then
    echo "Test ${test_file} failed. Retrying in 30 seconds..."
    sleep 30
    if ! eval "$testCmd --debug-output e2e-artifacts/$PACKAGE_TYPE-retry-1"; then
        echo "Test ${test_file} failed again. Retrying for the last time in 120 seconds..."
        sleep 120
        if ! eval "$testCmd --debug-output e2e-artifacts/$PACKAGE_TYPE-retry-2"; then
            echo "Test ${test_file} failed again. Exiting..."
            exit 1
        fi
    fi
fi