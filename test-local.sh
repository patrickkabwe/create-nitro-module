#!/bin/bash
set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check for expect
command -v expect >/dev/null 2>&1 || { 
    echo "Installing expect..."
    brew install expect
}

# Cleanup function
cleanup() {
    echo -e "${BLUE}🧹 Cleaning up...${NC}"
    rm -rf react-native-test-module
    rm -f test-module.exp
}

# Error handler
handle_error() {
    echo -e "${RED}❌ Error on line $1${NC}"
    cleanup
    exit 1
}

trap 'handle_error $LINENO' ERR

# Create expect script
cat << 'EOF' > test-module.exp
#!/usr/bin/expect -f
set timeout 30
spawn bun create nitro-module test-module

# Module name
expect "📝 What is the name of your module?"
send "test-module\r"

# Platform selection
expect "🎯 Select target platforms:"
sleep 1
send \x20
sleep 1
send \x1B\[B
sleep 1
send \x20
send \r

# Language selection
expect "💻 Select programming languages:"
sleep 1
send \x20
sleep 1
send \x1B\[B\x1B\[B
sleep 1
send \x20
send \r

# Package manager
expect "📦 Select package manager:"
send \r

# Confirm package name
expect "✨ Your package name will be called:"
send "y\r"

expect eof
EOF

chmod +x test-module.exp

# Install, build and link bun
bun install
bun run build
bun link

# Generate module
echo -e "${BLUE}🎯 Generating module...${NC}"
./test-module.exp

# Build iOS/Android
if [ -d "react-native-test-module" ]; then
    cd react-native-test-module/example
    bun pod
    cd ios
    xcodebuild -workspace TestModuleExample.xcworkspace \
        -scheme TestModuleExample \
        -sdk iphonesimulator \
        -configuration Debug \
        -destination 'platform=iOS Simulator,name=iPhone 16' build

    cd ../android
    ./gradlew assembleDebug --no-daemon
    ./gradlew --stop
    cd ../../..
else
    echo -e "${RED}❌ Module generation failed${NC}"
    cleanup
    exit 1
fi

cleanup
echo -e "${GREEN}✅ Test completed${NC}"