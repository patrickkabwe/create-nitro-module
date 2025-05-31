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
        const nitroSpecFolder =
            config.packageType === Nitro.View ? '/src/views' : '/src/specs'

        await createFolder(config.cwd, nitroSpecFolder)
        const platformToLangMap = mapPlatformToLanguage(
            config.platforms,
            config.langs
        )

        const platformLang = Object.entries(platformToLangMap)
            .map(([platform, lang]) => `${platform}: '${lang.toLowerCase()}'`)
            .join(', ')

        switch (config.packageType) {
            case Nitro.View:
                await this.generateNitroViewFiles(config, platformLang)
                break
            case Nitro.Module:
                await this.generateNitroModuleFiles(config, platformLang)
                break
            default:
                throw new Error('Invalid module type')
        }
    }

    async generateNitroViewFiles(
        config: GenerateModuleConfig,
        platformLang: string
    ): Promise<void> {
        await createModuleFile(
            config.cwd,
            `/src/views/${config.packageName}.nitro.ts`,
            nitroViewSpecCode(config.packageName, platformLang)
        )
        await createModuleFile(
            config.cwd,
            '/src/index.ts',
            nitroViewCode(config.packageName)
        )
    }

    async generateNitroModuleFiles(
        config: GenerateModuleConfig,
        platformLang: string
    ): Promise<void> {
        await createModuleFile(
            config.cwd,
            `/src/specs/${config.packageName}.nitro.ts`,
            nitroModuleSpecCode(
                config.packageName,
                platformLang,
                `${config.funcName}`
            )
        )
        await createModuleFile(
            config.cwd,
            '/src/index.ts',
            nitroModuleCode(config.packageName)
        )
    }
}
