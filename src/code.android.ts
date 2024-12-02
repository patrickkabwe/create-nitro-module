import { replaceHyphen, toPascalCase } from './utils.js'

export const androidManifestCode = `
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
</manifest>
`

export const getKotlinCode = (moduleName: string, packageT: string) => `
package ${packageT}

import com.margelo.nitro.${replaceHyphen(moduleName)}.Hybrid${toPascalCase(
  moduleName
)}Spec

class ${toPascalCase(moduleName)}: Hybrid${toPascalCase(moduleName)}Spec() {
    override val memorySize: Long
        get() = 5
    
    override fun sumNum(num1: Double, num2: Double): Double {
        return num1 + num2
    }
}
`
