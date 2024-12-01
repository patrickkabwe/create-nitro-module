# 🚀 Nitro Module CLI

A CLI tool that simplifies creating React Native modules powered by Nitro Modules.

[![Version](https://img.shields.io/npm/v/create-nitro-module.svg)](https://www.npmjs.com/package/create-nitro-module)
[![Downloads](https://img.shields.io/npm/dm/create-nitro-module.svg)](https://www.npmjs.com/package/create-nitro-module)
[![License](https://img.shields.io/npm/l/create-nitro-module.svg)](LICENSE)

![CLI Demo](./assets/nitro-module-cli.gif)

## 📦 Quick Start

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

## ⚡️ Options

```bash
Usage: nitro-module [options] [command]

A CLI tool that simplifies creating React Native modules powered by Nitro Modules.

Options:
  -v, --version          output the version number
  -h, --help             display help for command

Commands:
  create [moduleName]    create a new nitro module. If no moduleName is provided, you will be prompted for one.
  generate <moduleName>  generate a hybrid object into the package directory
```

## 🎯 Examples

```bash
# Create a new module
bun create nitro-module my-awesome-module
```

## What's Inside?

- 📱 Pre-configured iOS & Android native module templates
- 📦 Automatic linking and installation
- 📚 TypeScript support out of the box
