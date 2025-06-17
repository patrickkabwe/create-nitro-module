# Troubleshooting

This section provides solutions to common issues you might encounter while using the Nitro Module CLI.

### iOS Build Issues

1. **Pod Install Fails**

    If you encounter issues during `pod install`, try the following steps:

    ```bash
    cd yourpackage/ios
    pod deintegrate
    pod install
    ```

2. **Missing Header Files**

    If Xcode reports missing header files, follow these steps:

    - Clean the build folder in Xcode (`Product` -> `Clean Build Folder`).
    - Ensure all native dependencies are properly linked.
    - Rebuild the project.

### Android Build Issues

1. **Gradle Sync Failed**

    If Gradle sync fails, try cleaning and rebuilding the project:

    ```bash
    cd yourpackage/android
    ./gradlew clean
    ./gradlew build
    ```

2. **Missing Dependencies**

    If you encounter missing dependencies, check the following:

    - Ensure `build.gradle` contains the correct dependencies.
    - Sync the project with Gradle files.
    - Invalidate caches and restart Android Studio.

### General Issues

1. **Error Invalid Version: latest**

    If you encounter an invalid version error, this is due to an issue with the CLI: See issue: [Invalid Version: latest](https://github.com/react-native-community/cli/issues/2486)

    ```bash
    ✖ Failed to create nitro module: Command failed: bunx -y @react-native-community/cli@latest init TestToSpeechExample --directory path/react-native-module/example --skip-install
    Resolving dependencies
    Resolved, downloaded and extracted [2]
    Saved lockfile
    error Invalid Version: latest.
    ```

    To resolve this issue, use the following command: keep trying until it works.

2. **Command Not Found**

    If a CLI command is not recognized, ensure the CLI is installed globally:

    ```bash
    npm install -g create-nitro-module@latest
    # or
    pnpm add -g create-nitro-module@latest
    # or
    yarn global add create-nitro-module@latest
    # or
    bun i -g create-nitro-module@latest
    ```

3. **Permission Denied**

    If you encounter permission issues, try running the command with `sudo`:

    ```bash
    sudo <command>
    ```

For additional support, please [open an issue](https://github.com/patrickkabwe/create-nitro-module/issues) on our GitHub repository.
