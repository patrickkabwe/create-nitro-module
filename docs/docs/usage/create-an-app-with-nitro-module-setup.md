---
sidebar_position: 3
---

# Create a React Native App with Nitro Module Setup

This guide will walk you through creating a new React Native app with Nitro Module setup using a predefined template.

## Create a New App

To create a new React Native app with Nitro Module setup, use the following command:

```bash
npx @react-native-community/cli init MyNitroApp --template react-native-nitro-module-template
```

This command initializes a new React Native app named `MyNitroApp` using the `react-native-nitro-module-template`.

## Project Structure

After running the command, your project structure will look like this:

```bash
MyNitroApp
├── android/              # Android application source
├── ios/                  # iOS application source
├── src/                  # React Native app code
├── packages/             # JavaScript/TypeScript module packages
│   └── my-nitro-module/  # Example of a nitro module
│       ├── __tests__/    # Test files
│       ├── android/      # Android native module implementation
│       ├── ios/          # iOS native module implementation
│       └── src/          # native module specs
├── package.json          # Project configuration
├── tsconfig.json         # TypeScript settings
└── README.md             # Documentation
```

- **android/**: Contains the Android-specific code and configuration.
- **ios/**: Contains the iOS-specific code and configuration.
- **src/**: Contains the source code of your React Native app.
- **packages/**: Contains the JavaScript/TypeScript module packages.
    - **my-nitro-module/**: Example of a nitro module.
        - **\_**_tests_**\_/**: Contains test files.
        - **android/**: Contains the Android native module implementation.
        - **ios/**: Contains the iOS native module implementation.
        - **src/**: Contains the native module specs.
- **package.json**: Contains the metadata about the project and its dependencies.
- **tsconfig.json**: Contains the TypeScript configuration.
- **README.md**: Contains the documentation for your project.

For additional support, please [open an issue](https://github.com/patrickkabwe/create-nitro-module/issues) on our GitHub repository.
