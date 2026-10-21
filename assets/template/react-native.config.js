/** @type {import('@react-native-community/cli-types').UserDependencyConfig} */
module.exports = {
  dependency: {
    platforms: {
      android: {
        // Nitro registers components without React Native codegen.
        componentDescriptors: [],
      },
    },
  },
}
