import { toPascalCase } from './utils.js'

export const getSwiftCode = (moduleName: string, funcName: string) =>
  `import Foundation

class ${toPascalCase(moduleName)}: Hybrid${toPascalCase(moduleName)}Spec {
    func ${funcName}(num1: Double, num2: Double) throws -> Double{
        return num1 + num2
    }
}
`
