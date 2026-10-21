import {
    Nitro,
    type PackageManager,
    type PlatformLangMap,
    SupportedLang,
    SupportedPlatform,
} from '../types'
import { toPascalCase } from '../utils'

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

const platformDecoratorImports = (platformLangs: PlatformLangMap): string =>
    Object.keys(platformLangs)
        .map(platform =>
            platform === SupportedPlatform.IOS ? 'iOS' : 'Android'
        )
        .join(', ')

const platformDecorators = (
    moduleName: string,
    platformLangs: PlatformLangMap
): string =>
    Object.entries(platformLangs)
        .map(([platform, language]) => {
            const decorator: string =
                platform === SupportedPlatform.IOS ? 'iOS' : 'Android'
            const className: string = `Hybrid${toPascalCase(moduleName)}`
            const include: string =
                language === SupportedLang.CPP
                    ? `, include: '"${className}.hpp"'`
                    : ''
            return `@${decorator}({
  language: '${language}',
  implementation: { className: '${className}'${include} },
})`
        })
        .join('\n')

export const nitroModuleSpecCode = (
    moduleName: string,
    platformLangs: PlatformLangMap,
    funcName: string
): string => `import { ${platformDecoratorImports(platformLangs)}, type HybridObject } from 'nitro-core'

${platformDecorators(moduleName, platformLangs)}
export declare class ${toPascalCase(moduleName)} extends HybridObject {
  constructor()

  ${funcName}(num1: number, num2: number): number
}
export * from '#nitro/${toPascalCase(moduleName)}'
`

export const nitroViewSpecCode = (
    moduleName: string,
    platformLangs: PlatformLangMap
): string => `import { ${platformDecoratorImports(platformLangs)}, type HybridView } from 'react-native-nitro-modules'

${platformDecorators(moduleName, platformLangs)}
export declare class ${toPascalCase(moduleName)} extends HybridView {
  isRed: boolean
}
export * from '#nitro/${toPascalCase(moduleName)}'
`

// Nitro Module index.ts code
export const nitroModuleCode = (
    moduleName: string
): string => `import { ${toPascalCase(moduleName)} as ${toPascalCase(moduleName)}Hybrid } from './specs/${moduleName}.nitro'

export const ${toPascalCase(moduleName)} = new ${toPascalCase(moduleName)}Hybrid()
`

// Nitro View index.ts code
export const nitroViewCode = (
    moduleName: string
): string => `export { ${toPascalCase(moduleName)}Component as ${toPascalCase(moduleName)} } from './specs/${moduleName}.nitro'
export type { ${toPascalCase(moduleName)} as ${toPascalCase(moduleName)}Ref } from './specs/${moduleName}.nitro'
`

export const metroConfig =
    (): string => `const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
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

export const babelConfig = (
    packageRelativePath = '..'
) => `const path = require('path');
const pak = require('${packageRelativePath}/package.json');

module.exports = api => {
  api.cache(true);
  return {
    presets: ['module:@react-native/babel-preset'],
    parserOpts: { plugins: ['decorators'] },
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
    "resolvePackageJsonImports": true,
    "paths": {
      "${finalModuleName}": ["./${packageRelativePath}/src"]
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
                  `androidPlatform({
      name: 'android',
      device: androidEmulator(process.env.AVD_NAME ?? 'Pixel_7_API_36', {
        apiLevel: Number(process.env.DEVICE_API_LEVEL ?? '36'),
        profile: process.env.DEVICE_PROFILE ?? 'pixel_7',
        diskSize: process.env.AVD_DISK_SIZE ?? '1G',
        heapSize: process.env.AVD_HEAP_SIZE ?? '1G',
        snapshot: {
          enabled: process.env.CI === 'true',
        },
      }),
      bundleId: '${androidBundleId}',
    })`,
              ]),
        ...(iosBundleId == null
            ? []
            : [
                  `applePlatform({
      name: 'ios',
      device: appleSimulator(
        process.env.DEVICE_MODEL ?? 'iPhone 17 Pro',
        process.env.IOS_VERSION ?? '27.0'
      ),
      bundleId: '${iosBundleId}',
    })`,
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
  platformReadyTimeout: 600000,
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
        return `import React from 'react'
import { Text, View } from 'react-native'
import { describe, it, expect, render } from 'react-native-harness'
import { screen } from '@react-native-harness/ui'
import { ${toPascalCase(moduleName)} } from '${finalModuleName}'

describe('${toPascalCase(moduleName)}', () => {
  it('calls the native implementation', async () => {
    const result = ${toPascalCase(moduleName)}.${funcName}(1, 2)
    expect(result).toBe(3)

    await render(
      <View
        collapsable={false}
        testID="${moduleName}-result"
        style={{ width: 300, padding: 24, backgroundColor: 'white' }}
      >
        <Text style={{ color: 'black', fontSize: 24 }}>1 + 2 = {result}</Text>
      </View>
    )

    const view = await screen.findByTestId('${moduleName}-result')
    const screenshot = await screen.screenshot(view)
    expect(screenshot).not.toBeNull()
    await expect(screenshot).toMatchImageSnapshot({ name: '${moduleName}-module-result' })
  })
})
`
    }

    return `import React from 'react'
import { StyleSheet, View } from 'react-native'
import { describe, it, expect, render } from 'react-native-harness'
import { screen } from '@react-native-harness/ui'
import { ${toPascalCase(moduleName)} } from '${finalModuleName}'

describe('${toPascalCase(moduleName)}', () => {
  it('renders the native view', async () => {
    await render(
      <View collapsable={false} testID="${moduleName}">
        <${toPascalCase(moduleName)}
          isRed={true}
          style={styles.view}
        />
      </View>
    )

    const view = await screen.findByTestId('${moduleName}')

    expect(view.nativeId).toBeDefined()
    const screenshot = await screen.screenshot(view)
    expect(screenshot).not.toBeNull()
    await expect(screenshot).toMatchImageSnapshot({ name: '${moduleName}-native-view' })
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
    if (packageManager === 'yarn') {
        return `      - name: Setup Yarn
        run: |
          npm install --prefix "$RUNNER_TEMP/ci-tools" corepack@0.36.0
          echo "$RUNNER_TEMP/ci-tools/node_modules/.bin" >> "$GITHUB_PATH"
          "$RUNNER_TEMP/ci-tools/node_modules/.bin/corepack" enable
`
    }

    if (packageManager !== 'bun') {
        return ''
    }

    return `      - uses: oven-sh/setup-bun@v2
`
}

const getHarnessCodegenBuildStep = (packageManager: PackageManager): string => {
    return `
      - name: Run codegen and build
        run: ${getPackageManagerRunCommand(packageManager, 'codegen')}
`
}

const getHarnessJobCode = (
    exampleAppName: string,
    packageManager: PackageManager,
    platform: SupportedPlatform
) => {
    if (platform === SupportedPlatform.ANDROID) {
        return `  test:
    name: Test Android Harness
    runs-on: ubuntu-latest
    env:
      AVD_DISK_SIZE: 1G
      AVD_HEAP_SIZE: 1G
      AVD_NAME: Pixel_7_API_36
      DEVICE_API_LEVEL: '36'
      DEVICE_ARCH: x86_64
      DEVICE_PROFILE: pixel_7
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '24'
${getPackageManagerSetupStep(packageManager)}

      - name: Install dependencies
        run: ${packageManager} install
${getHarnessCodegenBuildStep(packageManager)}
      - name: Setup JDK 17
        uses: actions/setup-java@v5
        with:
          distribution: 'zulu'
          java-version: '17'
          cache: 'gradle'

      - name: Build Android app
        working-directory: example/android
        run: |
          chmod +x ./gradlew
          ./gradlew :app:assembleDebug --no-daemon --build-cache -PreactNativeArchitectures=\${{ env.DEVICE_ARCH }}

      - name: Run React Native Harness
        uses: callstackincubator/react-native-harness@v1.6.0
        with:
          app: android/app/build/outputs/apk/debug/app-debug.apk
          runner: android
          projectRoot: example
          packageManager: ${packageManager}
          harnessArgs: --json --outputFile=harness-results.json
          uploadVisualTestArtifacts: false

      - name: Upload Harness evidence
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: harness-${platform}
          path: |
            example/__tests__/__image_snapshots__/
            example/harness-results.json
            example/.harness/crash-reports/
          include-hidden-files: true
          if-no-files-found: warn
          retention-days: 14

      - name: Stop Gradle
        if: always()
        working-directory: example/android
        run: |
          chmod +x ./gradlew
          ./gradlew --stop`
    }

    return `  test:
    name: Test iOS Harness
    runs-on: xcode-27
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '24'
${getPackageManagerSetupStep(packageManager)}

      - name: Install dependencies
        run: ${packageManager} install
${getHarnessCodegenBuildStep(packageManager)}
      - name: Select Xcode
        run: sudo xcode-select -s /Applications/Xcode.app/Contents/Developer

      - name: Set up Swift Package Manager
        working-directory: example
        run: ${getPackageManagerRunCommand(packageManager, 'spm')}

      - name: Build iOS app
        working-directory: example/ios
        run: |
          set -o pipefail && xcodebuild \
            CC=clang CPLUSPLUS=clang++ LD=clang LDPLUSPLUS=clang++ \
            -derivedDataPath build -UseModernBuildSystem=YES \
            -project ${exampleAppName}.xcodeproj \
            -scheme ${exampleAppName} \
            -sdk iphonesimulator \
            -configuration Debug \
            build \
            CODE_SIGNING_ALLOWED=NO

      - name: Run React Native Harness
        uses: callstackincubator/react-native-harness@v1.6.0
        with:
          app: ios/build/Build/Products/Debug-iphonesimulator/${exampleAppName}.app
          runner: ios
          projectRoot: example
          packageManager: ${packageManager}
          harnessArgs: --json --outputFile=harness-results.json
          uploadVisualTestArtifacts: false

      - name: Upload Harness evidence
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: harness-${platform}
          path: |
            example/__tests__/__image_snapshots__/
            example/harness-results.json
            example/.harness/crash-reports/
          include-hidden-files: true
          if-no-files-found: warn
          retention-days: 14`
}

export const harnessWorkflowCode = (
    exampleAppName: string,
    packageManager: PackageManager,
    platform: SupportedPlatform
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
      - 'apple/**'
      - 'cpp/**'
      - 'src/**'
      - 'nitrogen/**'
      - '*.podspec'
      - 'Package.swift'
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
      - 'apple/**'
      - 'cpp/**'
      - 'src/**'
      - 'nitrogen/**'
      - '*.podspec'
      - 'Package.swift'
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
${getHarnessJobCode(exampleAppName, packageManager, platform)}
`
