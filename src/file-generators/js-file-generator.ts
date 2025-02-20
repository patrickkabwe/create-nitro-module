import {
    nitroModuleCode,
    nitroModuleSpecCode,
    nitroViewCode,
    nitroViewSpecCode,
} from '../code-snippets/code.js'
import type { FileGenerator, GenerateModuleConfig } from '../types'
import { Nitro } from '../types'
import { createFolder, createModuleFile, mapPlatformToLanguage } from '../utils'

export class JSFileGenerator implements FileGenerator {
    async generate(config: GenerateModuleConfig): Promise<void> {
        await createFolder(config.cwd, '/src/specs')
        switch (config.moduleType) {
            case Nitro.View:
                await this.generateNitroViewFiles(config)
                break
            case Nitro.Module:
                await this.generateNitroModuleFiles(config)
                break
            default:
                throw new Error('Invalid module type')
        }
    }

    async generateNitroViewFiles(config: GenerateModuleConfig): Promise<void> {
        await createModuleFile(
            config.cwd,
            `/src/specs/${config.moduleName}.nitro.ts`,
            nitroViewSpecCode(config.moduleName)
        )
        await createModuleFile(
            config.cwd,
            '/src/index.ts',
            nitroViewCode(config.moduleName)
        )
    }

    async generateNitroModuleFiles(
        config: GenerateModuleConfig
    ): Promise<void> {
        const platformToLangMap = mapPlatformToLanguage(
            config.platforms,
            config.langs
        )

        const platformLang = Object.entries(platformToLangMap)
            .map(([platform, lang]) => `${platform}: '${lang.toLowerCase()}'`)
            .join(', ')

        await createModuleFile(
            config.cwd,
            `/src/specs/${config.moduleName}.nitro.ts`,
            nitroModuleSpecCode(
                config.moduleName,
                platformLang,
                `${config.funcName}`
            )
        )
        await createModuleFile(
            config.cwd,
            '/src/index.ts',
            nitroModuleCode(config.moduleName)
        )
    }
}
