import { exportCode, specCode } from '../code-snippets/code.js'
import type { FileGenerator, GenerateModuleConfig } from '../types'
import {
    createFolder,
    createModuleFile,
    mapPlatformToLanguage
} from '../utils'

export class JSFileGenerator implements FileGenerator {
    async generate(config: GenerateModuleConfig): Promise<void> {
        const platformToLangMap = mapPlatformToLanguage(
            config.platforms,
            config.langs
        )

        const platformLang = Object.entries(platformToLangMap)
            .map(([platform, lang]) => `${platform}: '${lang.toLowerCase()}'`)
            .join(', ')

        await createFolder(config.cwd, '/src/specs')
        await createModuleFile(
            config.cwd,
            `/src/specs/${config.moduleName}.nitro.ts`,
            specCode(config.moduleName, platformLang, `${config.funcName}`)
        )
        await createModuleFile(
            config.cwd,
            '/src/index.ts',
            exportCode(config.moduleName)
        )
    }
}
