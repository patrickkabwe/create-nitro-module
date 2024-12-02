import { toPascalCase } from './utils.js'

export const appExampleCode = (moduleName: string, packagePrefix: string) => `
import React from 'react';
import { Text, View } from 'react-native';
import { ${toPascalCase(moduleName)} } from '${packagePrefix}${moduleName}';

function App(): React.JSX.Element {
  return (
    <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
      <Text style={{fontSize:40, color:'green'}}>
      {${toPascalCase(moduleName)}.sumNum(1, 2)}
      </Text>
    </View>
  );
}
export default App;
    `

export const specCode = (moduleName: string, platformLang: string) => `
import { type HybridObject } from 'react-native-nitro-modules'

export interface ${toPascalCase(
  moduleName
)} extends HybridObject<{ ${platformLang} }> {
sumNum(num1: number, num2: number): number
}
`

export const exportCode = (moduleName: string) => `
export {} from './specs/${moduleName}.nitro'
import { NitroModules } from 'react-native-nitro-modules'
import type { ${toPascalCase(moduleName)} as ${toPascalCase(
  moduleName
)}Spec } from './specs/${moduleName}.nitro'

export const ${toPascalCase(moduleName)} =
  NitroModules.createHybridObject<${toPascalCase(
    moduleName
  )}Spec>('${toPascalCase(moduleName)}')
  `
