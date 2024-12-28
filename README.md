# 🚀 Nitro Module CLI

A CLI tool that simplifies creating React Native modules powered by Nitro Modules.

[![Version](https://img.shields.io/npm/v/create-nitro-module.svg)](https://www.npmjs.com/package/create-nitro-module)
[![Downloads](https://img.shields.io/npm/dm/create-nitro-module.svg)](https://www.npmjs.com/package/create-nitro-module)
[![License](https://img.shields.io/npm/l/create-nitro-module.svg)](LICENSE)
[![Docs](https://img.shields.io/badge/docs-available-brightgreen.svg)](https://patrickkabwe.github.io/create-nitro-module/)

![CLI Demo](https://raw.githubusercontent.com/patrickkabwe/nitro-cli/refs/heads/main/assets/nitro-module-cli.gif)

## Features

- 📱 Pre-configured iOS & Android native module templates
- 📦 Automatic linking and installation
- 📚 TypeScript support out of the box

## Project Structure

```
.
├── example
├── react-native-awesome-library
│   ├── AwesomeLibrary.podspec
│   ├── android
│   ├── ios
│   ├── src
│       ├── index.ts
│       └── specs
│         └── awesome-library.nitro.ts
│   ├── nitrogen
│   ├── nitro.json
│   ├── babel.config.js
│   ├── package.json
│   └── tsconfig.json
├── bun.lockb
└── package.json
```

## Installation & Usage

For detailed installation and usage instructions, please visit our [documentation](https://patrickkabwe.github.io/create-nitro-module/).

### Quick Start
```bash
# Using bun
bun create nitro-module@latest my-nitro-module

# Using npx
npx create-nitro-module@latest my-nitro-module

# Using pnpm
pnpm create nitro-module@latest my-nitro-module

# Using yarn
yarn create nitro-module@latest my-nitro-module

# Using global install
npm install -g create-nitro-module@latest
nitro-module create my-nitro-module
```

