---
sidebar_position: 3
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Commands

This document provides an overview of the commands available in the Nitro Module CLI.

## Usage

```bash
Usage: create-nitro-module [options] [name]

A CLI tool that simplifies creating React Native modules powered by Nitro Modules.

Arguments:
  name                                name of the module to create

Options:
  -v, --version                       output the version number
  -d, --module-dir <moduleDirectory>  directory to create the module in
  -e, --skip-example                  skip example app generation
  -i, --skip-install                  skip installing dependencies
  -h, --help                          display help for command
```

#### Example

<Tabs groupId="cli">
    <TabItem value="bun" label="Bun" default>
    ```bash
    bun create nitro-module@latest my-awesome-module
    ```
    </TabItem>
    <TabItem value="npx" label="Npx">
    ```bash
    npx create-nitro-module@latest my-awesome-module
    ```
    </TabItem>
    <TabItem value="yarn" label="Yarn">
    ```bash
    yarn create nitro-module@latest my-awesome-module
    ```
    </TabItem>
    <TabItem value="pnpm" label="Pnpm">
    ```bash
    pnpm create nitro-module@latest my-awesome-module
    ```
    </TabItem>
</Tabs>

For additional support, please [open an issue](https://github.com/patrickkabwe/create-nitro-module/issues) on our GitHub repository.
