import { toPascalCase } from '../utils'

export const getSwiftCode = (
    moduleName: string,
    funcName: string,
    userName: string
) => `//
//  Hybrid${toPascalCase(moduleName)}.swift
//
//  Created by ${userName} on ${new Date().toLocaleDateString()}.
//

import NitroModules

final class Hybrid${toPascalCase(moduleName)}: Hybrid${toPascalCase(moduleName)}Spec {
  func ${funcName}(num1: Double, num2: Double) throws -> Double {
    return num1 + num2
  }
}
`

export const getSwiftViewCode = (moduleName: string, userName: string) => `//
//  Hybrid${toPascalCase(moduleName)}.swift
//
//  Created by ${userName} on ${new Date().toLocaleDateString()}.
//

import NitroModules
import UIKit

final class Hybrid${toPascalCase(moduleName)}: Hybrid${toPascalCase(moduleName)}Spec {
  // UIView
  let view: UIView

  override init() throws {
    view = UIView()
    try super.init()
  }

  // Props
  var isRed: Bool = false {
    didSet {
      view.backgroundColor = isRed ? .red : .black
    }
  }
}
`
