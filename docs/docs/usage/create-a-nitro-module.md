---
sidebar_position: 2
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Creating a Nitro Module

This guide will walk you through creating a Nitro Module with and without an example app, as well as specifying a directory.

## With example app

To create a Nitro Module along with an example app, use the following command. This will generate a new module and an example app to help you get started quickly.

<Tabs groupId="cli">
  <TabItem value="bun" label="Bun" default>
  ```bash
  bun create nitro-module@latest my-awesome-module
  ```
  </TabItem>
  <TabItem value="npx" label="Npx" default>
  ```bash
  npx create-nitro-module@latest my-awesome-module
  ```
  </TabItem>
  <TabItem value="pnpm" label="Pnpm" default>
  ```bash
  pnpm create nitro-module@latest my-awesome-module
  ```
  </TabItem>
  <TabItem value="yarn" label="Yarn" default>
  ```bash
  yarn create nitro-module@latest my-awesome-module
  ```
  </TabItem>
  <TabItem value="global" label="Global" default>
  ```bash
  nitro-module create my-awesome-module
  ```
  :::warning

  Make sure you have installed the Nitro Module CLI globally to use the `nitro-module` command. You can install it using the following command:
  `npm install -g create-nitro-module@latest`
  :::
  </TabItem>
</Tabs>

## Without example app

If you prefer to create a Nitro Module without an example app, use the following command. This will generate only the module, without any additional example app.

<Tabs groupId="cli">
  <TabItem value="bun" label="Bun" default>
  ```bash
  bun create nitro-module@latest my-awesome-module --skip-example
  ```
  </TabItem>
  <TabItem value="npx" label="Npx">
  ```bash
  npx create-nitro-module@latest my-awesome-module --skip-example
  ```
  </TabItem>
  <TabItem value="pnpm" label="Pnpm">
  ```bash
  pnpm create nitro-module@latest my-awesome-module --skip-example
  ```
  </TabItem>
  <TabItem value="yarn" label="Yarn">
  ```bash
  yarn create nitro-module@latest my-awesome-module --skip-example
  ```
  </TabItem>
  <TabItem value="global" label="Global">
  ```bash
  nitro-module create my-awesome-module --skip-example
  ```
  </TabItem>
</Tabs>

The `--skip-example` flag indicates that the example app should be skipped.

## Specifying a directory

If you prefer to create a Nitro Module within a specific directory, use the following command:

<Tabs groupId="cli">
  <TabItem value="bun" label="Bun" default>
  ```bash
  bun create nitro-module@latest my-awesome-module --module-dir packages
  ```
  </TabItem>
  <TabItem value="npx" label="Npx">
  ```bash
  npx create-nitro-module@latest my-awesome-module --module-dir packages
  ```
  </TabItem>
  <TabItem value="pnpm" label="Pnpm">
  ```bash
  pnpm create nitro-module@latest my-awesome-module --module-dir packages
  ```
  </TabItem>
  <TabItem value="yarn" label="Yarn">
  ```bash
  yarn create nitro-module@latest my-awesome-module --module-dir packages
  ```
  </TabItem>
  <TabItem value="global" label="Global">
  ```bash
  nitro-module create my-awesome-module --module-dir packages
  ```
  </TabItem>
</Tabs>

This command will create a Nitro Module within the `packages` directory as shown in the example above.
