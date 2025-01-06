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

## Project Structure

```
.
├── example
├── AwesomeLibrary.podspec
├── android
├── ios
├── src
│    ├── index.ts
│    └── specs
│         └── awesome-library.nitro.ts
│   ├── nitrogen
│   ├── nitro.json
│   ├── babel.config.js
│   ├── package.json
│   └── tsconfig.json
├── bun.lockb
└── package.json
```

<!-- ### CLI Commands

```bash
Usage: create-nitro-module [options] [command] [name]

A CLI tool that simplifies creating React Native modules powered by Nitro Modules.

Arguments:
  name                                Name of the module to create

Options:
  -v, --version                       output the version number
  -d, --module-dir <moduleDirectory>  Directory to create the module in
  -s, --skip-example                  Skip example app generation
  -h, --help                          Display help for command

Commands:
  create [moduleName]    Create a new nitro module. If no moduleName is provided,
                         you will be prompted for one.
``` -->