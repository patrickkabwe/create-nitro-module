#!/usr/bin/env bash
set -euo pipefail

example_dir="$(cd "$1" && pwd)"
ios_version="$2"
: "${GITHUB_ENV:?This script must run in GitHub Actions}"

# shellcheck disable=SC2016
simulator="$(xcrun simctl list devices available --json | IOS_VERSION="$ios_version" node -e '
const fs = require("node:fs");
const data = JSON.parse(fs.readFileSync(0, "utf8"));
const version = process.env.IOS_VERSION;
const devices = Object.entries(data.devices).flatMap(([runtime, entries]) =>
  runtime.endsWith(`iOS-${version.replaceAll(".", "-")}`)
    ? entries.filter(device => device.isAvailable && device.name.startsWith("iPhone"))
    : []
);
const selected = devices.find(device => device.state === "Booted") ?? devices[0];
if (!selected) throw new Error(`No available iPhone simulator for iOS ${version}`);
console.log(`${selected.udid}|${selected.name}|${selected.state}`);
')"
IFS='|' read -r simulator_id device_model simulator_state <<< "$simulator"

app_path="$(find "$example_dir/ios/build/Build/Products/Debug-iphonesimulator" -maxdepth 1 -type d -name '*.app' -print -quit)"
if [ -z "$app_path" ]; then
  echo "::error::No built iOS app found (example_dir=$example_dir)"
  exit 1
fi

if [ "$simulator_state" = Shutdown ]; then
  xcrun simctl boot "$simulator_id"
fi
xcrun simctl bootstatus "$simulator_id" -b
# Harness 1.6's appinfo probe rejects the missing-app exit code on iOS 27.
xcrun simctl install "$simulator_id" "$app_path"

printf 'DEVICE_MODEL=%s\nIOS_VERSION=%s\nHARNESS_APP_PATH=%s\n' \
  "$device_model" "$ios_version" "$app_path" >> "$GITHUB_ENV"
