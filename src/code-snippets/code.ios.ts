import { toPascalCase } from '../utils'

export const getSwiftCode = (
    moduleName: string,
    funcName: string
) => `import Foundation

class Hybrid${toPascalCase(moduleName)}: Hybrid${toPascalCase(moduleName)}Spec {
    func ${funcName}(num1: Double, num2: Double) throws -> Double {
        return num1 + num2
    }
}
`

export const getSwiftViewCode = (moduleName: string) => `import Foundation
import UIKit

class Hybrid${toPascalCase(moduleName)} : Hybrid${toPascalCase(moduleName)}Spec {
  // UIView
  var view: UIView = UIView()

  // Props
  var isRed: Bool = false {
    didSet {
      view.backgroundColor = isRed ? .red : .black
    }
  }
}
`
