#!/bin/bash

trap 'exit' INT

PLATFORM=${1:-}
EXAMPLE_DIR=${2:-}
PACKAGE_TYPE=${3:-}

echo "🚀 Running e2e video recording for $PLATFORM"

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
    if [ $? -ne 0 ]; then
      echo "❌ iOS build failed!"
      exit 1
    fi
  else
    echo "⚠️  xcpretty not found. Install with: gem install xcpretty"
    $buildCmd
    if [ $? -ne 0 ]; then
      echo "❌ iOS build failed!"
      exit 1
    fi
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
  if [ $? -ne 0 ]; then
    echo "❌ Android build failed!"
    exit 1
  fi
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

echo "🎬 Using flow file for recording: $test_file"

if [ ! -f "$test_file" ]; then
  echo "❌ Error! Flow file not found: $test_file"
  echo ""
  exit 1
fi

# Create output directory for videos
mkdir -p e2e-artifacts

recordCmd="maestro record \"$test_file\" -e APP_ID=$APP_ID --local"
echo "🎯 Recording test video: $recordCmd"
echo "📱 APP_ID: $APP_ID"


if ! eval "$recordCmd --debug-output e2e-artifacts/$PACKAGE_TYPE"; then
    echo "Recording ${test_file} failed. Retrying in 30 seconds..."
    sleep 30
    if ! eval "$recordCmd --debug-output e2e-artifacts/$PACKAGE_TYPE-retry-1"; then
        echo "Recording ${test_file} failed again. Retrying for the last time in 120 seconds..."
        sleep 120
        if ! eval "$recordCmd --debug-output e2e-artifacts/$PACKAGE_TYPE-retry-2"; then
            echo "Recording ${test_file} failed again. Exiting..."
            exit 1
        fi
    fi
fi