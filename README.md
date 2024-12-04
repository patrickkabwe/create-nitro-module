# 🚀 Nitro Module CLI

A CLI tool that simplifies creating React Native modules powered by Nitro Modules.

[![Version](https://img.shields.io/npm/v/create-nitro-module.svg)](https://www.npmjs.com/package/create-nitro-module)
[![Downloads](https://img.shields.io/npm/dm/create-nitro-module.svg)](https://www.npmjs.com/package/create-nitro-module)
[![License](https://img.shields.io/npm/l/create-nitro-module.svg)](LICENSE)

![CLI Demo](https://raw.githubusercontent.com/patrickkabwe/nitro-cli/refs/heads/main/assets/nitro-module-cli.gif)

## Features

- 📱 Pre-configured iOS & Android native module templates
- 📦 Automatic linking and installation
- 📚 TypeScript support out of the box

## Project Structure

```
.
├── bun.lockb
├── example
├── react-native-awesome-library
│   ├── AwesomeLibrary.podspec
│   ├── android
│   ├── ios
│   ├── src
│       ├── index.ts
│       └── specs
│   ├── nitrogen
│   ├── nitro.json
│   ├── babel.config.js
│   ├── package.json
│   └── tsconfig.json
└── package.json
```

## Installation & Usage

### Quick Start
```bash
# Using bun
bun create nitro-module

# Using npx
npx create-nitro-module

# Using pnpm
pnpm create nitro-module

# Using yarn
yarn create nitro-module

# Using global install
nitro-module
```

### CLI Commands
```bash
Usage: create-nitro-module [options] [command]

Options:
  -v, --version          output the version number
  -h, --help             display help for command

Commands:
  create [moduleName]    create a new nitro module. If no moduleName is provided, 
                        you will be prompted for one.
  generate <moduleName>  generate a hybrid object into the package directory
```

### Examples
```bash
# Create a new module
bun create nitro-module my-awesome-module

cd example

bun android # build android app

bun ios # build ios app
```

## Troubleshooting

### iOS Build Issues
1. **Pod Install Fails**
   ```bash
   cd yourpackage/ios
   pod deintegrate
   pod install
   ```

2. **Missing Header Files**
   - Clean build folder in Xcode
   - Ensure all native dependencies are properly linked
   - Rebuild the project

### Android Build Issues
1. **Gradle Sync Failed**
   ```bash
   cd yourpackage/android
   ./gradlew clean
   ./gradlew build
   ```

2. **Missing Dependencies**
   - Check `build.gradle` for correct dependencies
   - Sync project with Gradle files
   - Invalidate caches and restart Android Studio


For additional support, please [open an issue](https://github.com/patrickkabwe/nitro-module-cli/issues) on our GitHub repository.