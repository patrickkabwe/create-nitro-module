import { toPascalCase } from './utils.js'

export const getSwiftCode = (moduleName: string) =>
  `import Foundation

class ${toPascalCase(moduleName)}: Hybrid${toPascalCase(moduleName)}Spec {
    func sumNum(num1: Double, num2: Double) throws -> Double{
        return num1 + num2
    }
}
`
