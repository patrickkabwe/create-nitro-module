---
sidebar_position: 3
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Commands

This document provides an overview of the commands available in the Nitro Module CLI.

## Usage

```bash
Usage: create-nitro-module [options] [command] [name]

A CLI tool that simplifies creating React Native modules powered by Nitro Modules.

Arguments:
  name                                Name of the module to create

Options:
  -v, --version                       Output the version number
  -d, --module-dir <moduleDirectory>  Directory to create the module in
  -s, --skip-example                  Skip example app generation
  -h, --help                          Display help for command
```

## Commands

### create

Create a new Nitro Module. If no module name is provided, you will be prompted for one.

```bash
create [moduleName]
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
    <TabItem value="pnpm" label="Pnpm">
    ```bash
    pnpm create nitro-module@latest my-awesome-module
    ```
    </TabItem>
    <TabItem value="yarn" label="Yarn">
    ```bash
    yarn create nitro-module@latest my-awesome-module
    ```
    </TabItem>
    <TabItem value="global" label="Global">
    ```bash
    nitro-module@latest create my-awesome-module
    ```
    </TabItem>
</Tabs>

<!-- ### generate

Generate a hybrid object into the package directory.

```bash
generate <moduleName>
```

#### Example

```bash
# Using bun
bun create nitro-module@latest generate my-awesome-module

# Using npx
npx create-nitro-module@latest generate my-awesome-module

# Using pnpm
pnpm create nitro-module@latest generate my-awesome-module

# Using yarn
yarn create nitro-module@latest generate my-awesome-module

# Using global install
nitro-module@latest generate my-awesome-module
``` -->

For additional support, please [open an issue](https://github.com/patrickkabwe/create-nitro-module/issues) on our GitHub repository.
