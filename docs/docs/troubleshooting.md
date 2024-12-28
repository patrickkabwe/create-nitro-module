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

1. **Module Not Found**

   If a module is not found, ensure it is properly installed and linked:

   ```bash
   npm install <module-name>
   npx react-native link <module-name>
   ```

2. **Command Not Found**

   If a CLI command is not recognized, ensure the CLI is installed globally:

   ```bash
   npm install -g create-nitro-module
   ```

3. **Permission Denied**

   If you encounter permission issues, try running the command with `sudo`:

   ```bash
   sudo <command>
   ```

For additional support, please [open an issue](https://github.com/patrickkabwe/create-nitro-module/issues) on our GitHub repository.
