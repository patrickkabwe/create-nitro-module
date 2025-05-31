---
sidebar_position: 1
---

# Introduction

A CLI tool that simplifies creating React Native modules powered by Nitro Modules.

[![Version](https://img.shields.io/npm/v/create-nitro-module.svg)](https://www.npmjs.com/package/create-nitro-module)
[![Downloads](https://img.shields.io/npm/dm/create-nitro-module.svg)](https://www.npmjs.com/package/create-nitro-module)
[![License](https://img.shields.io/npm/l/create-nitro-module.svg)](https://github.com/patrickkabwe/create-nitro-module/LICENSE)

![CLI Demo](https://raw.githubusercontent.com/patrickkabwe/create-nitro-module/refs/heads/main/assets/nitro-module-cli.gif)

## Features

- 📱 Pre-configured iOS & Android native module templates
- 📦 Automatic linking and installation
- 📚 TypeScript support out of the box
- 🔧 Zero configuration required
- ⚙️ Automated ios/android build with GitHub Actions
- 📦 Semantic Release

## Project Structure

```bash
.
├── example
├── AwesomeLibrary.podspec
├── android
├── ios
├── src
│    ├── index.ts
│    └── specs|views
│         └── awesome-library.nitro.ts
│   ├── nitrogen
│   ├── nitro.json
│   ├── babel.config.js
│   ├── package.json
│   └── tsconfig.json
├── bun.lockb
└── package.json
```