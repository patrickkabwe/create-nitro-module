import { replaceHyphen, toPascalCase } from '../utils'

export const androidManifestCode = `<manifest xmlns:android="http://schemas.android.com/apk/res/android">
</manifest>
`

export const getKotlinCode = (
    moduleName: string,
    packageName: string,
    funcName: string
) => `package ${packageName}

import com.margelo.nitro.${replaceHyphen(moduleName)}.Hybrid${toPascalCase(
    moduleName
)}Spec

class Hybrid${toPascalCase(moduleName)}: Hybrid${toPascalCase(moduleName)}Spec() {    
    override fun ${funcName}(num1: Double, num2: Double): Double {
        return num1 + num2
    }
}
`

export const androidSettingsGradleCode = (
    moduleName: string
) => `pluginManagement { includeBuild("../../node_modules/@react-native/gradle-plugin") }
plugins { id("com.facebook.react.settings") }
extensions.configure(com.facebook.react.ReactSettingsExtension){ ex -> ex.autolinkLibrariesFromCommand() }
rootProject.name = '${moduleName}Example'
include ':app'
includeBuild('../../node_modules/@react-native/gradle-plugin')
`

export const getKotlinViewCode = (
    moduleName: string,
    packageName: string
) => `package ${packageName}

import android.graphics.Color
import android.view.View
import androidx.annotation.Keep
import com.facebook.proguard.annotations.DoNotStrip
import com.margelo.nitro.NitroModules
import com.margelo.nitro.${replaceHyphen(moduleName)}.Hybrid${toPascalCase(
    moduleName
)}Spec

@Keep
@DoNotStrip
class Hybrid${toPascalCase(moduleName)}: Hybrid${toPascalCase(moduleName)}Spec() {
    // View
    override val view: View = View(NitroModules.applicationContext)

    // Props
    private var _isRed: Boolean = false
    override var isRed: Boolean
        get() = _isRed
        set(value) {
            _isRed = value
            view.setBackgroundColor(
                if (value) Color.RED
                else Color.BLACK
            )
        }
}
`
