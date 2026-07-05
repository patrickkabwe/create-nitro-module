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

export const metroConfig = (
    packageRelativePath = '..'
) => `const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');
const root = path.resolve(__dirname, '${packageRelativePath}');

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

export const babelConfig = (
    packageRelativePath = '..'
) => `const path = require('path');
const pak = require('${packageRelativePath}/package.json');

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
            [pak.name]: path.join(__dirname, '${packageRelativePath}', pak.source),
          },
        },
      ],
    ],
  };
};`

export const exampleReactNativeConfig = (
    packageRelativePath = '..'
) => `const path = require('path')
const pkg = require('${packageRelativePath}/package.json')

/**
 * @type {import('@react-native-community/cli-types').Config}
 */
module.exports = {
    project: {
        ios: {
            automaticPodsInstallation: true,
        },
    },
    dependencies: {
        [pkg.name]: {
            root: path.join(__dirname, '${packageRelativePath}'),
        },
    },
}
`

export const exampleTsConfig = (
    finalModuleName: string,
    packageRelativePath = '..'
) => `{
  "extends": "@react-native/typescript-config",
  "include": ["**/*.ts", "**/*.tsx"],
  "exclude": ["**/node_modules", "**/Pods"],
  "compilerOptions": {
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "${finalModuleName}": ["${packageRelativePath}/src"]
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

const getIosHarnessDeviceResolverCode = () => `const resolveIosDevice = async () => {
  const targets = await getAppleRunTargets()
  const simulatorTargets = targets.filter(target => target.platform === 'ios' && target.type === 'emulator')
  const preferredName = process.env.HARNESS_IOS_SIMULATOR_NAME
  const preferredVersion = process.env.HARNESS_IOS_SIMULATOR_VERSION

  if (preferredName != null || preferredVersion != null) {
    const preferredTarget = simulatorTargets.find(target => {
      if (preferredName != null && target.device.name !== preferredName) {
        return false
      }

      if (preferredVersion != null && target.device.systemVersion !== preferredVersion) {
        return false
      }

      return true
    })

    if (preferredTarget == null) {
      throw new Error(
        \`No iOS simulator matched HARNESS_IOS_SIMULATOR_NAME=\${preferredName ?? 'unset'} and HARNESS_IOS_SIMULATOR_VERSION=\${preferredVersion ?? 'unset'}. Available simulators: \${simulatorTargets.map(target => \`\${target.device.name} (\${target.device.systemVersion})\`).join(', ') || 'none'}\`
      )
    }

    return appleSimulator(
      preferredTarget.device.name,
      preferredTarget.device.systemVersion
    )
  }

  const defaultTarget = simulatorTargets[0]
  if (defaultTarget == null) {
    throw new Error(
      \`No available iOS simulators were found for React Native Harness. Available run targets: \${targets.map(target => \`\${target.name} (\${target.description})\`).join(', ') || 'none'}\`
    )
  }

  return appleSimulator(
    defaultTarget.device.name,
    defaultTarget.device.systemVersion
  )
}

const iosDevice = await resolveIosDevice()
`

const getAndroidHarnessDeviceResolverCode = () => `const resolveAndroidDevice = async () => {
  const targets = await getAndroidRunTargets()
  const emulatorTargets = targets.filter(target => target.platform === 'android' && target.type === 'emulator')
  const preferredName = process.env.HARNESS_ANDROID_EMULATOR_NAME

  if (preferredName != null) {
    const preferredTarget = emulatorTargets.find(target => target.device.name === preferredName)

    if (preferredTarget == null) {
      throw new Error(
        \`No Android emulator matched HARNESS_ANDROID_EMULATOR_NAME=\${preferredName}. Available emulators: \${emulatorTargets.map(target => target.device.name).join(', ') || 'none'}\`
      )
    }

    return androidEmulator(preferredTarget.device.name)
  }

  const defaultTarget = emulatorTargets[0]
  if (defaultTarget == null) {
    throw new Error(
      \`No available Android emulators were found for React Native Harness. Available run targets: \${targets.map(target => \`\${target.name} (\${target.description})\`).join(', ') || 'none'}\`
    )
  }

  return androidEmulator(defaultTarget.device.name)
}

const androidDevice = await resolveAndroidDevice()
`

const getHarnessRunnerConfig = (
    platform: SupportedPlatform,
    androidBundleId: string | null,
    iosBundleId: string | null
): string => {
    if (platform === SupportedPlatform.ANDROID) {
        if (androidBundleId == null) {
            throw new Error('Android bundle id is required for Harness config')
        }

        return `androidPlatform({
      name: 'android',
      device: androidDevice,
      bundleId: '${androidBundleId}',
    })`
    }

    if (iosBundleId == null) {
        throw new Error('iOS bundle id is required for Harness config')
    }

    return `applePlatform({
      name: 'ios',
      device: iosDevice,
      bundleId: '${iosBundleId}',
    })`
}

export const harnessConfigCode = ({
    androidBundleId,
    appRegistryComponentName,
    defaultRunner,
    entryPoint,
    iosBundleId,
}: HarnessConfigParams): string => {
    const imports = [
        ...(androidBundleId == null
            ? []
            : [
                  "import { androidEmulator, androidPlatform, getRunTargets as getAndroidRunTargets } from '@react-native-harness/platform-android'",
              ]),
        ...(iosBundleId == null
            ? []
            : [
                  "import { applePlatform, appleSimulator, getRunTargets as getAppleRunTargets } from '@react-native-harness/platform-apple'",
              ]),
    ].join('\n')
    const deviceResolvers = [
        ...(iosBundleId == null ? [] : [getIosHarnessDeviceResolverCode()]),
        ...(androidBundleId == null ? [] : [getAndroidHarnessDeviceResolverCode()]),
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

${deviceResolvers}

const config = {
  entryPoint: '${entryPoint}',
  appRegistryComponentName: '${appRegistryComponentName}',
  runners: [
    ${runners}
  ],
  defaultRunner: '${defaultRunner}',
  bridgeTimeout: 300000,
}

export default config
`
}

export const harnessJestConfigCode = () => `module.exports = {
  projects: [
    {
      displayName: 'react-native-harness',
      preset: 'react-native-harness',
      testMatch: [
        '<rootDir>/__tests__/**/*.(test|spec|harness).(js|jsx|ts|tsx)',
      ],
    },
  ],
}
`

export const harnessTestCode = (
    moduleName: string,
    finalModuleName: string,
    funcName: string,
    packageType: Nitro
) => {
    if (packageType === Nitro.Module) {
        return `import { describe, it, expect } from 'react-native-harness'
import { ${toPascalCase(moduleName)} } from '${finalModuleName}'

describe('${toPascalCase(moduleName)}', () => {
  it('calls the native implementation', () => {
    expect(${toPascalCase(moduleName)}.${funcName}(1, 2)).toBe(3)
  })
})
`
    }

    return `import React from 'react'
import { StyleSheet } from 'react-native'
import { describe, it, expect, render } from 'react-native-harness'
import { screen } from '@react-native-harness/ui'
import { ${toPascalCase(moduleName)} } from '${finalModuleName}'

describe('${toPascalCase(moduleName)}', () => {
  it('renders the native view', async () => {
    await render(
      <${toPascalCase(moduleName)}
        isRed={true}
        style={styles.view}
        testID="${moduleName}"
      />
    )

    const view = await screen.findByTestId('${moduleName}')

    expect(view.nativeId).toBeDefined()
  })
})

const styles = StyleSheet.create({
  view: {
    width: 200,
    height: 200,
  },
})
`
}

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

const getHarnessCodegenBuildStep = (
    packageManager: PackageManager,
    monorepo: boolean
) => {
    if (!monorepo) {
        return ''
    }

    return `
      - name: Run codegen and build
        run: ${getPackageManagerRunCommand(packageManager, 'codegen')} && ${getPackageManagerRunCommand(packageManager, 'build')}
`
}

const getHarnessJobCode = (
    exampleAppName: string,
    packageManager: PackageManager,
    platform: SupportedPlatform,
    monorepo = false
) => {
    if (platform === SupportedPlatform.ANDROID) {
        return `  test:
    name: Test Android Harness
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '24'
${getPackageManagerSetupStep(packageManager)}

      - name: Install dependencies
        run: ${packageManager} install
${getHarnessCodegenBuildStep(packageManager, monorepo)}
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
        uses: callstackincubator/react-native-harness@v1.0.0
        with:
          app: example/android/app/build/outputs/apk/debug/app-debug.apk
          runner: android
          projectRoot: example
          packageManager: ${packageManager}`
    }

    return `  test:
    name: Test iOS Harness
    runs-on: macOS-15
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '24'
${getPackageManagerSetupStep(packageManager)}

      - name: Install dependencies
        run: ${packageManager} install
${getHarnessCodegenBuildStep(packageManager, monorepo)}
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
            build \
            CODE_SIGNING_ALLOWED=NO

      - name: Run React Native Harness
        uses: callstackincubator/react-native-harness@v1.0.0
        with:
          app: example/ios/build/Build/Products/Debug-iphonesimulator/${exampleAppName}.app
          runner: ios
          projectRoot: example
          packageManager: ${packageManager}`
}

export const harnessWorkflowCode = (
    exampleAppName: string,
    packageManager: PackageManager,
    platform: SupportedPlatform,
    monorepo = false
) => `name: Run React Native Harness ${platform === SupportedPlatform.ANDROID ? 'Android' : 'iOS'}

permissions:
  contents: read

on:
  push:
    branches:
      - main
    paths:
      - '.github/workflows/harness-${platform}.yml'
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
      - '.github/workflows/harness-${platform}.yml'
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
${getHarnessJobCode(exampleAppName, packageManager, platform, monorepo)}
`

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
   throw new Error('Error updating view manager files: ' + JSON.stringify(res))
 }
`
         : ''
 }
 
 const str = await readFile(androidOnLoadFile, { encoding: 'utf8' })
 await writeFile(androidOnLoadFile, str.replace(/margelo\\/nitro\\//g, ''))
}
androidWorkaround()`
