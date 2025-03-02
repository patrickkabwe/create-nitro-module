import { toPascalCase } from '../utils'

export const appExampleCode = (
    moduleName: string,
    finalModuleName: string,
    funcName: string,
    isHybridView: boolean
) => `import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { ${toPascalCase(moduleName)} } from '${finalModuleName}';

function App(): React.JSX.Element {
  return (
    <View style={styles.container}>
        ${isHybridView
        ? `<${toPascalCase(moduleName)} isRed={true} style={styles.view} />`
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
  ${isHybridView
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
) => `import { type HybridObject } from 'react-native-nitro-modules'

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
  resolver: {
    unstable_enablePackageExports: true,
  },
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
  "extends": "@react-native/typescript-config/tsconfig.json",
  "compilerOptions": {
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "${finalModuleName}": ["../src"]
    }
  }
}`

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

const androidWorkaround = async () => {
 const androidOnLoadFile = path.join(
   process.cwd(),
   'nitrogen/generated/android',
   '${moduleName}OnLoad.cpp'
 )
 ${isHybridView
        ? `
 const viewManagerFile = path.join(
   process.cwd(),
   'nitrogen/generated/android/kotlin/com/margelo/nitro/${moduleName.toLowerCase()}/views',
   'Hybrid${moduleName}Manager.kt'
 )

 const viewManagerStr = await readFile(viewManagerFile, { encoding: 'utf8' })
 await writeFile(viewManagerFile, viewManagerStr.replace('com.margelo.nitro.${moduleName.toLowerCase()}.*', 'com.${moduleName.toLowerCase()}.*'))
`
        : ''
    }
 
 const str = await readFile(androidOnLoadFile, { encoding: 'utf8' })
 await writeFile(androidOnLoadFile, str.replace('margelo/nitro/', ''))
}
androidWorkaround()`
