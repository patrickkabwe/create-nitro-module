import { readFile } from 'fs/promises'
import path from 'path'
import { cppCode, hppCode } from '../code-snippets/code.cpp'
import {
    type FileGenerator,
    type GenerateModuleConfig,
    SupportedPlatform,
} from '../types'
import { createFolder, createModuleFile, toPascalCase } from '../utils'
import { AndroidFileGenerator } from './android-file-generator'
import { IOSFileGenerator } from './ios-file-generator'

export class CppFileGenerator implements FileGenerator {
    constructor(private fileGenerators: FileGenerator[]) {}

    async generate(config: GenerateModuleConfig): Promise<void> {
        await createFolder(config.cwd, 'cpp')
        await this.generateCppCodeFiles(config)

        for (const generator of this.fileGenerators) {
            if (
                generator instanceof AndroidFileGenerator &&
                config.platforms.includes(SupportedPlatform.ANDROID)
            ) {
                await generator.generate(config)
                await this.updateAndroidCMakeLists(config)
                continue
            }

            if (
                generator instanceof IOSFileGenerator &&
                config.platforms.includes(SupportedPlatform.IOS)
            ) {
                await generator.generate(config)
                continue
            }

            // Skip generators for platforms that were not selected
            if (
                (generator instanceof AndroidFileGenerator &&
                    !config.platforms.includes(SupportedPlatform.ANDROID)) ||
                (generator instanceof IOSFileGenerator &&
                    !config.platforms.includes(SupportedPlatform.IOS))
            ) {
                continue
            }

            throw new Error('Unsupported platform')
        }
    }

    async generateCppCodeFiles(config: GenerateModuleConfig) {
        await createFolder(config.cwd, 'cpp')

        const cppPath = path.join(
            'cpp',
            `Hybrid${toPascalCase(config.packageName)}.cpp`
        )
        const hppPath = path.join(
            'cpp',
            `Hybrid${toPascalCase(config.packageName)}.hpp`
        )
        await createModuleFile(
            config.cwd,
            cppPath,
            cppCode(toPascalCase(config.packageName), `${config.funcName}`)
        )

        await createModuleFile(
            config.cwd,
            hppPath,
            hppCode(toPascalCase(config.packageName), `${config.funcName}`)
        )
    }

    async updateAndroidCMakeLists(config: GenerateModuleConfig) {
        const cmakeListsPath = path.join(
            config.cwd,
            'android',
            'CMakeLists.txt'
        )
        let cmakeListsContent = await readFile(cmakeListsPath, {
            encoding: 'utf-8',
        })

        const hybridCppPath = `../cpp/Hybrid${toPascalCase(config.packageName)}.cpp`

        if (cmakeListsContent.includes(hybridCppPath)) {
            return
        }

        cmakeListsContent = cmakeListsContent.replace(
            'src/main/cpp/cpp-adapter.cpp',
            ''
        )
        cmakeListsContent = cmakeListsContent.replace(
            'add_library(${PACKAGE_NAME} SHARED',
            'add_library(${PACKAGE_NAME} SHARED \n\t' +
                `src/main/cpp/cpp-adapter.cpp\n\t${hybridCppPath}`
        )

        await createModuleFile(
            config.cwd,
            'android/CMakeLists.txt',
            cmakeListsContent
        )
    }
}
