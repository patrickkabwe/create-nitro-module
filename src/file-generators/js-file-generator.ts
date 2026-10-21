import {
    nitroModuleCode,
    nitroModuleSpecCode,
    nitroViewCode,
    nitroViewSpecCode,
} from '../code-snippets/code.js'
import type { FileGenerator, GenerateModuleConfig } from '../types'
import { Nitro } from '../types'
import { createFolder, createModuleFile } from '../utils'

export class JSFileGenerator implements FileGenerator {
    async generate(config: GenerateModuleConfig): Promise<void> {
        const nitroSpecFolder = '/src/specs'

        await createFolder(config.cwd, nitroSpecFolder)

        switch (config.packageType) {
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
            `/src/specs/${config.packageName}.nitro.ts`,
            nitroViewSpecCode(config.packageName, config.platformLangs)
        )
        await createModuleFile(
            config.cwd,
            '/src/index.ts',
            nitroViewCode(config.packageName)
        )
    }

    async generateNitroModuleFiles(
        config: GenerateModuleConfig
    ): Promise<void> {
        await createModuleFile(
            config.cwd,
            `/src/specs/${config.packageName}.nitro.ts`,
            nitroModuleSpecCode(
                config.packageName,
                config.platformLangs,
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
