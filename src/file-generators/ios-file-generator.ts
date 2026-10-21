import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getSwiftCode, getSwiftViewCode } from '../code-snippets/code.swift'
import { IOS_MODULE_NAME_TAG } from '../constants'
import {
    type FileGenerator,
    type GenerateModuleConfig,
    Nitro,
    SupportedLang,
    SupportedPlatform,
} from '../types'
import {
    createFolder,
    createModuleFile,
    getGitUserInfo,
    replacePlaceholder,
    toPascalCase,
} from '../utils'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export class IOSFileGenerator implements FileGenerator {
    async generate(config: GenerateModuleConfig): Promise<void> {
        const { name } = getGitUserInfo()

        await createFolder(config.cwd, 'apple')
        const templatePath: string = path.join(
            __dirname,
            '..',
            'assets',
            'template'
        )
        const replacements: Record<string, string> = {
            [IOS_MODULE_NAME_TAG]: toPascalCase(config.packageName),
        }
        await createModuleFile(
            config.cwd,
            `${toPascalCase(config.packageName)}.podspec`,
            await replacePlaceholder({
                filePath: path.join(
                    templatePath,
                    `${IOS_MODULE_NAME_TAG}.podspec`
                ),
                replacements,
            })
        )
        await createModuleFile(
            config.cwd,
            'Package.swift',
            await replacePlaceholder({
                filePath: path.join(templatePath, 'Package.swift'),
                replacements,
            })
        )
        if (
            config.platformLangs[SupportedPlatform.IOS] === SupportedLang.SWIFT
        ) {
            const isHybridView = config.packageType === Nitro.View
            await createModuleFile(
                config.cwd,
                `apple/Hybrid${toPascalCase(config.packageName)}.swift`,
                isHybridView
                    ? getSwiftViewCode(config.packageName, name)
                    : getSwiftCode(
                          config.packageName,
                          `${config.funcName}`,
                          name
                      )
            )
        }
    }
}
