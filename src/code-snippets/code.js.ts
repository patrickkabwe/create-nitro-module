import { toPascalCase } from '../utils'
import { Nitro, type PackageManager, SupportedPlatform } from '../types'

export const appExampleCode = (
    moduleName: string,
    finalModuleName: string,
    funcName: string,
    isHybridView: boolean
) => `import React from 'react';
import {${!isHybridView ? `Text, ` : ' '}View, StyleSheet } from 'react-native';
import { ${toPascalCase(moduleName)} } from '${finalModuleName}';

function App(): React.JSX.Element {
  return (
    <View style={styles.container}>
        ${
            isHybridView
                ? `<${toPascalCase(moduleName)} isRed={true} style={styles.view} testID="${moduleName}" />`
                : `<Text style={styles.text}>
        {${toPascalCase(moduleName)}.${funcName}(1, 2)}
        </Text>`
        }
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ${
      isHybridView
          ? `view: {
    width: 200,
    height: 200
  }`
          : `text: {
        fontSize: 40, 
        color: 'green'
    }`
  }});

export default App;`

export const nitroModuleSpecCode = (
    moduleName: string,
    platformLang: string,
    funcName: string
) => `import type { HybridObject } from 'react-native-nitro-modules'

export interface ${toPascalCase(
    moduleName
)} extends HybridObject<{ ${platformLang} }> {
  ${funcName}(num1: number, num2: number): number
}`

export const nitroViewSpecCode = (
    moduleName: string,
    platformLang: string
) => `import type {
  HybridView,
  HybridViewProps,
  HybridViewMethods,
} from 'react-native-nitro-modules'

export interface ${toPascalCase(moduleName)}Props extends HybridViewProps {
   isRed: boolean
}

export interface ${toPascalCase(moduleName)}Methods extends HybridViewMethods {}

export type ${toPascalCase(moduleName)} = HybridView<${toPascalCase(moduleName)}Props, ${toPascalCase(moduleName)}Methods, { ${platformLang} }>`

// Nitro Module index.ts code
export const nitroModuleCode = (
    moduleName: string
) => `import { NitroModules } from 'react-native-nitro-modules'
import type { ${toPascalCase(moduleName)} as ${toPascalCase(
    moduleName
)}Spec } from './specs/${moduleName}.nitro'

export const ${toPascalCase(moduleName)} =
  NitroModules.createHybridObject<${toPascalCase(
      moduleName
  )}Spec>('${toPascalCase(moduleName)}')`

// Nitro View index.ts code
export const nitroViewCode = (
    moduleName: string
) => `import { getHostComponent, type HybridRef } from 'react-native-nitro-modules'
import ${toPascalCase(moduleName)}Config from '../nitrogen/generated/shared/json/${toPascalCase(moduleName)}Config.json'
import type {
  ${toPascalCase(moduleName)}Props,
  ${toPascalCase(moduleName)}Methods,
} from './specs/${moduleName}.nitro'


export const ${toPascalCase(moduleName)} = getHostComponent<${toPascalCase(moduleName)}Props, ${toPascalCase(moduleName)}Methods>(
  '${toPascalCase(moduleName)}',
  () => ${toPascalCase(moduleName)}Config
)

export type ${toPascalCase(moduleName)}Ref = HybridRef<${toPascalCase(moduleName)}Props, ${toPascalCase(moduleName)}Methods>
`

export const metroConfig = `const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');
const root = path.resolve(__dirname, '..');

/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  watchFolders: [root],
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);`

export const babelConfig = `const path = require('path');
const pak = require('../package.json');

module.exports = api => {
  api.cache(true);
  return {
    presets: ['module:@react-native/babel-preset'],
    plugins: [
      [
        'module-resolver',
        {
          extensions: ['.js', '.ts', '.json', '.jsx', '.tsx'],
          alias: {
            [pak.name]: path.join(__dirname, '../', pak.source),
          },
        },
      ],
    ],
  };
};`

export const exampleTsConfig = (finalModuleName: string) => `{
  "extends": "@react-native/typescript-config",
  "include": ["**/*.ts", "**/*.tsx"],
  "exclude": ["**/node_modules", "**/Pods"],
  "compilerOptions": {
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "${finalModuleName}": ["../src"]
    }
  }
}`

type HarnessConfigParams = {
    androidBundleId: string | null
    appRegistryComponentName: string
    defaultRunner: SupportedPlatform
    entryPoint: string
    iosBundleId: string | null
}

const getHarnessRunnerConfig = (
    platform: SupportedPlatform,
    androidBundleId: string | null,
    iosBundleId: string | null
) => {
    if (platform === SupportedPlatform.ANDROID) {
        if (androidBundleId == null) {
            throw new Error('Android bundle id is required for Harness config')
        }

        return `androidPlatform({
      name: 'android',
      device: androidEmulator('Pixel_8_API_35'),
      bundleId: '${androidBundleId}',
    })`
    }

    if (iosBundleId == null) {
        throw new Error('iOS bundle id is required for Harness config')
    }

    return `applePlatform({
      name: 'ios',
      device: appleSimulator('iPhone 16', '18.0'),
      bundleId: '${iosBundleId}',
    })`
}

export const harnessConfigCode = ({
    androidBundleId,
    appRegistryComponentName,
    defaultRunner,
    entryPoint,
    iosBundleId,
}: HarnessConfigParams) => {
    const imports = [
        ...(androidBundleId == null
            ? []
            : [
                  "import { androidEmulator, androidPlatform } from '@react-native-harness/platform-android'",
              ]),
        ...(iosBundleId == null
            ? []
            : [
                  "import { applePlatform, appleSimulator } from '@react-native-harness/platform-apple'",
              ]),
    ].join('\n')
    const runners = [
        ...(androidBundleId == null
            ? []
            : [
                  getHarnessRunnerConfig(
                      SupportedPlatform.ANDROID,
                      androidBundleId,
                      iosBundleId
                  ),
              ]),
        ...(iosBundleId == null
            ? []
            : [
                  getHarnessRunnerConfig(
                      SupportedPlatform.IOS,
                      androidBundleId,
                      iosBundleId
                  ),
              ]),
    ].join(',\n    ')

    return `${imports}

const config = {
  entryPoint: '${entryPoint}',
  appRegistryComponentName: '${appRegistryComponentName}',
  runners: [
    ${runners}
  ],
  defaultRunner: '${defaultRunner}',
}

export default config
`
}

export const harnessJestConfigCode = () => `export default {
  preset: 'react-native',
  rootDir: '.',
  testMatch: ['<rootDir>/harness/**/*.harness.ts'],
}
`

export const harnessTestCode = (
    moduleName: string,
    finalModuleName: string,
    funcName: string,
    packageType: Nitro
) => `/// <reference types="jest" />
import { ${toPascalCase(moduleName)} } from '${finalModuleName}'

describe('${toPascalCase(moduleName)}', () => {
  it('loads the native implementation', () => {
    ${
        packageType === Nitro.Module
            ? `expect(${toPascalCase(moduleName)}.${funcName}(1, 2)).toBe(3)`
            : `expect(${toPascalCase(moduleName)}).toBeDefined()`
    }
  })
})
`

const getPackageManagerRunCommand = (
    packageManager: PackageManager,
    scriptName: string
) => {
    if (packageManager === 'yarn') {
        return `yarn ${scriptName}`
    }

    return `${packageManager} run ${scriptName}`
}

const getPackageManagerSetupStep = (packageManager: PackageManager) => {
    if (packageManager !== 'bun') {
        return ''
    }

    return `      - uses: oven-sh/setup-bun@v2
`
}

export const harnessWorkflowCode = (
    exampleAppName: string,
    packageManager: PackageManager,
    platforms: SupportedPlatform[]
) => {
    const jobs = [
        ...(platforms.includes(SupportedPlatform.ANDROID)
            ? [`  test-android:
    name: Test Android Harness
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
${getPackageManagerSetupStep(packageManager)}

      - name: Install dependencies
        run: ${packageManager} install

      - name: Setup JDK 17
        uses: actions/setup-java@v5
        with:
          distribution: 'zulu'
          java-version: '17'
          cache: 'gradle'

      - name: Build Android app
        working-directory: example/android
        run: ./gradlew assembleDebug --no-daemon --build-cache

      - name: Run React Native Harness
        uses: callstackincubator/react-native-harness/actions/android@v1.0.0
        with:
          app: example/android/app/build/outputs/apk/debug/app-debug.apk
          runner: android
          projectRoot: example`]
            : []),
        ...(platforms.includes(SupportedPlatform.IOS)
            ? [`  test-ios:
    name: Test iOS Harness
    runs-on: macOS-15
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
${getPackageManagerSetupStep(packageManager)}

      - name: Install dependencies
        run: ${packageManager} install

      - name: Setup Xcode
        uses: maxim-lobanov/setup-xcode@v1
        with:
          xcode-version: 16.4

      - name: Install Pods
        working-directory: example
        run: ${getPackageManagerRunCommand(packageManager, 'pod')}

      - name: Build iOS app
        working-directory: example/ios
        run: |
          set -o pipefail && xcodebuild \
            CC=clang CPLUSPLUS=clang++ LD=clang LDPLUSPLUS=clang++ \
            -derivedDataPath build -UseModernBuildSystem=YES \
            -workspace ${exampleAppName}.xcworkspace \
            -scheme ${exampleAppName} \
            -sdk iphonesimulator \
            -configuration Debug \
            -destination 'platform=iOS Simulator,name=iPhone 16' \
            build \
            CODE_SIGNING_ALLOWED=NO

      - name: Run React Native Harness
        uses: callstackincubator/react-native-harness/actions/ios@v1.0.0
        with:
          app: example/ios/build/Build/Products/Debug-iphonesimulator/${exampleAppName}.app
          runner: ios
          projectRoot: example`]
            : []),
    ].join('\n\n')

    return `name: Run React Native Harness

permissions:
  contents: read

on:
  push:
    branches:
      - main
    paths:
      - '.github/workflows/react-native-harness.yml'
      - 'example/**'
      - 'android/**'
      - 'ios/**'
      - 'cpp/**'
      - 'src/**'
      - 'nitrogen/**'
      - '*.podspec'
      - 'package.json'
      - 'bun.lock'
      - 'pnpm-lock.yaml'
      - 'package-lock.json'
      - 'yarn.lock'
      - 'react-native.config.js'
      - 'nitro.json'
  pull_request:
    paths:
      - '.github/workflows/react-native-harness.yml'
      - 'example/**'
      - 'android/**'
      - 'ios/**'
      - 'cpp/**'
      - 'src/**'
      - 'nitrogen/**'
      - '*.podspec'
      - 'package.json'
      - 'bun.lock'
      - 'pnpm-lock.yaml'
      - 'package-lock.json'
      - 'yarn.lock'
      - 'react-native.config.js'
      - 'nitro.json'
  workflow_dispatch:

concurrency:
  group: \${{ github.workflow }}-\${{ github.ref }}
  cancel-in-progress: true

jobs:
${jobs}
`
}

export const postScript = (moduleName: string, isHybridView: boolean) => `/**
* @file This script is auto-generated by create-nitro-module and should not be edited.
*
* @description This script applies a workaround for Android by modifying the '<ModuleName>OnLoad.cpp' file.
* It reads the file content and removes the 'margelo/nitro/' string from it. This enables support for custom package names.
*
* @module create-nitro-module
*/
const path = require('node:path')
const { writeFile, readFile } = require('node:fs/promises')
${isHybridView ? "const { readdir } = require('node:fs/promises')" : ''}

${
    isHybridView
        ? `
const updateViewManagerFiles = async (file) => {
  const viewManagerFile = path.join(
    process.cwd(),
    'nitrogen/generated/android/kotlin/com/margelo/nitro/${moduleName.toLowerCase()}/views',
    file
  )

  const viewManagerStr = await readFile(viewManagerFile, { encoding: 'utf8' })
  await writeFile(
    viewManagerFile,
    viewManagerStr.replace(
      /com\\.margelo\\.nitro\\.${moduleName.toLowerCase()}\\.\\*/g,
      'com.${moduleName.toLowerCase()}.*'
    )
  )
}  
`
        : ''
}

const androidWorkaround = async () => {
 const androidOnLoadFile = path.join(
   process.cwd(),
   'nitrogen/generated/android',
   '${moduleName}OnLoad.cpp'
 )
 ${
     isHybridView
         ? `
 const viewManagerDir = await readdir(
  path.join(
    process.cwd(),
    'nitrogen/generated/android/kotlin/com/margelo/nitro/${moduleName.toLowerCase()}/views'
  )
 )
 const viewManagerFiles = viewManagerDir.filter((file) =>
   file.endsWith('Manager.kt')
 )
 const res = await Promise.allSettled(
   viewManagerFiles.map(updateViewManagerFiles)
 )

 if (res.some((r) => r.status === 'rejected')) {
   throw new Error(\`Error updating view manager files: \$\{res\}\`)
 }
`
         : ''
 }
 
 const str = await readFile(androidOnLoadFile, { encoding: 'utf8' })
 await writeFile(androidOnLoadFile, str.replace(/margelo\\/nitro\\//g, ''))
}
androidWorkaround()`
