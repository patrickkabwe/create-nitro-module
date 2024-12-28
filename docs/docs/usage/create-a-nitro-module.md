---
sidebar_position: 2
---

# Creating a Nitro Module

This guide will walk you through creating a Nitro Module with and without an example app, as well as specifying a directory.

## With example app

To create a Nitro Module along with an example app, use the following command. This will generate a new module and an example app to help you get started quickly.

```bash
# Using bun
bun create nitro-module my-awesome-module

# Using npx
npx create-nitro-module my-awesome-module

# Using pnpm
pnpm create nitro-module my-awesome-module

# Using yarn
yarn create nitro-module my-awesome-module

# Using global install
nitro-module my-awesome-module
```

## Without example app

If you prefer to create a Nitro Module without an example app, use the following command. This will generate only the module, without any additional example app.

```bash
# Using bun
bun create nitro-module my-awesome-module --skip-example

# Using npx
npx create-nitro-module my-awesome-module --skip-example

# Using pnpm
pnpm create nitro-module my-awesome-module --skip-example

# Using yarn
yarn create nitro-module my-awesome-module --skip-example

# Using global install
nitro-module my-awesome-module --skip-example
```

The `--skip-example` flag indicates that the example app should be skipped.

## Specifying a directory

If you prefer to create a Nitro Module within a specific directory, use the following command:

```bash
# Using bun
bun create nitro-module my-awesome-module --module-dir packages

# Using npx
npx create-nitro-module my-awesome-module --module-dir packages

# Using pnpm
pnpm create nitro-module my-awesome-module --module-dir packages

# Using yarn
yarn create nitro-module my-awesome-module --module-dir packages

# Using global install
nitro-module my-awesome-module --module-dir packages
```

This command will create a new Nitro Module in the specified directory.