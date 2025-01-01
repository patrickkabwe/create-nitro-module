import { cp } from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { getSwiftCode } from '../code-snippets/code.ios'
import { IOS_MODULE_NAME_TAG } from '../constants'
import {
    SupportedLang,
    type FileGenerator,
    type GenerateModuleConfig,
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

        // Copy iOS template files
        await createFolder(config.cwd, 'ios')
        const iosFolderPath = path.join(
            __dirname,
            '..',
            'assets',
            'template',
            'ios'
        )
        const unnamedPodspecFilePath = path.join(
            __dirname,
            '..',
            'assets',
            'template',
            `${IOS_MODULE_NAME_TAG}.podspec`
        )
        const podspecFilePath = path.join(
            config.cwd,
            `${toPascalCase(config.moduleName)}.podspec`
        )
        await cp(iosFolderPath, path.join(config.cwd, 'ios'), {
            recursive: true,
        })

        await cp(unnamedPodspecFilePath, podspecFilePath)

        // Create a podspec file
        const replacements = {
            [IOS_MODULE_NAME_TAG]: toPascalCase(config.moduleName),
            'mrousavy/nitro':
                `${name.replaceAll(' ', '')}/${config.finalModuleName}`.toLowerCase(),
        }

        await createModuleFile(
            config.cwd,
            `${toPascalCase(config.moduleName)}.podspec`,
            await replacePlaceholder({
                filePath: podspecFilePath,
                replacements,
            })
        )

        // Create a Bridge.h file
        const bridgeFilePath = path.join(config.cwd, 'ios', 'Bridge.h')

        const bridgeReplacements = {
            [IOS_MODULE_NAME_TAG]: config.moduleName,
            'Created by Marc Rousavy on 22.07.24.': `Created by ${name} on ${new Date().toLocaleDateString()}`, //TODO: user regex
        }

        await createModuleFile(
            config.cwd,
            'ios/Bridge.h',
            await replacePlaceholder({
                filePath: bridgeFilePath,
                replacements: bridgeReplacements,
            })
        )
        if (config.langs.includes(SupportedLang.SWIFT)) {
            await createModuleFile(
                config.cwd,
                `ios/Hybrid${toPascalCase(config.moduleName)}.swift`,
                getSwiftCode(config.moduleName, `${config.funcName}`)
            )
        }
    }
}
