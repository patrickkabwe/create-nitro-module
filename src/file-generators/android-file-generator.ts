import { cp, rm, writeFile } from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import {
    androidManifestCode,
    getKotlinCode,
} from '../code-snippets/code.android'
import { ANDROID_CXX_LIB_NAME_TAG, ANDROID_NAME_SPACE_TAG } from '../constants'
import { FileGenerator, GenerateModuleConfig, SupportedLang } from '../types'
import {
    createFolder,
    createModuleFile,
    replaceHyphen,
    replacePlaceholder,
    toPascalCase,
} from '../utils'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export class AndroidFileGenerator implements FileGenerator {
    private androidPackageName: string = ''

    async generate(config: GenerateModuleConfig): Promise<void> {
        this.androidPackageName = `com.${replaceHyphen(config.moduleName)}`
        await this.copyAndroidFiles(config)
        await this.generateAndroidFiles(config)
    }

    private async copyAndroidFiles(config: GenerateModuleConfig) {
        const androidPath = path.join(
            __dirname,
            '..',
            'assets/template/android'
        )
        await cp(androidPath, path.join(config.cwd, 'android'), {
            recursive: true,
        })
    }

    private async generateAndroidFiles(config: GenerateModuleConfig) {
        await createFolder(config.cwd, 'android/src/main/cpp')
        const androidNamespacePath = path.join(
            'android',
            'src',
            'main',
            'java',
            'com',
            replaceHyphen(config.moduleName)
        )
        await createFolder(config.cwd, androidNamespacePath)

        // Generate AndroidManifest file
        const androidManifestPath = path.join(
            'android',
            'src',
            'main',
            'AndroidManifest.xml'
        )
        await createModuleFile(
            config.cwd,
            androidManifestPath,
            androidManifestCode
        )

        // Only generate Kotlin file(s) if Kotlin is supported
        if (config.langs.includes(SupportedLang.KOTLIN)) {
            // Generate HybridObject file
            await createModuleFile(
                config.cwd,
                `android/src/main/java/${this.androidPackageName
                    .split('.')
                    .join('/')}/Hybrid${toPascalCase(config.moduleName)}.kt`,
                getKotlinCode(
                    config.moduleName,
                    this.androidPackageName,
                    `${config.funcName}`
                )
            )
        }
        await this.generateGradleFile(config)
        await this.generateCMakeFile(config)
        await this.generateCPPFile(config)
        await this.generatePackageFile(config)
    }

    private async generateGradleFile(config: GenerateModuleConfig) {
        const gradleFile = 'build.gradle'
        const gradlePropertiesFile = 'gradle.properties'
        const prefixPath = 'android'
        const gradleFilePath = path.join(config.cwd, prefixPath, gradleFile)
        const gradlePropertiesFilePath = path.join(
            config.cwd,
            prefixPath,
            gradlePropertiesFile
        )

        const replacements = {
            [`com.${ANDROID_NAME_SPACE_TAG}`]: this.androidPackageName,
            [ANDROID_CXX_LIB_NAME_TAG]: toPascalCase(config.moduleName),
        }

        await createModuleFile(
            config.cwd,
            `${prefixPath}/${gradleFile}`,
            await replacePlaceholder({
                filePath: gradleFilePath,
                replacements,
            })
        )
        await createModuleFile(
            config.cwd,
            `${prefixPath}/${gradlePropertiesFile}`,
            await replacePlaceholder({
                filePath: gradlePropertiesFilePath,
                replacements,
            })
        )
    }

    private async generateCMakeFile(config: GenerateModuleConfig) {
        const cmakeListFile = 'CMakeLists.txt'
        const prefixPath = 'android'
        const cmakeListFilePath = path.join(
            config.cwd,
            prefixPath,
            cmakeListFile
        )
        const replacements = {
            [ANDROID_CXX_LIB_NAME_TAG]: toPascalCase(config.moduleName),
        }
        await createModuleFile(
            config.cwd,
            `${prefixPath}/${cmakeListFile}`,
            await replacePlaceholder({
                filePath: cmakeListFilePath,
                replacements,
            })
        )
    }

    private async generateCPPFile(config: GenerateModuleConfig) {
        const cppAdapterFile = 'cpp-adapter.cpp'
        const prefixPath = 'android/src/main/cpp'
        const cppAdapterFilePath = path.join(
            config.cwd,
            prefixPath,
            cppAdapterFile
        )

        const replacements = {
            [ANDROID_CXX_LIB_NAME_TAG]: toPascalCase(config.moduleName),
            [ANDROID_NAME_SPACE_TAG]: replaceHyphen(config.moduleName),
        }

        await createModuleFile(
            config.cwd,
            `${prefixPath}/${cppAdapterFile}`,
            await replacePlaceholder({
                filePath: cppAdapterFilePath,
                replacements,
            })
        )
    }

    private async generatePackageFile(config: GenerateModuleConfig) {
        const androidPackageFile = `${toPascalCase(config.moduleName)}Package.java`
        const prefixPath = `android/src/main/java`
        const androidPackageFilePath = path.join(
            config.cwd,
            prefixPath + `/com/${ANDROID_NAME_SPACE_TAG}`,
            `${ANDROID_CXX_LIB_NAME_TAG}Package.java`
        )

        const replacements = {
            [`com.${ANDROID_NAME_SPACE_TAG}`]: this.androidPackageName,
            [`${ANDROID_CXX_LIB_NAME_TAG}Package`]:
                androidPackageFile.split('.')[0],
            [ANDROID_CXX_LIB_NAME_TAG]: toPascalCase(config.moduleName),
        }

        await createModuleFile(
            config.cwd,
            `${prefixPath}/${this.androidPackageName
                .split('.')
                .join('/')}/${androidPackageFile}`,
            await replacePlaceholder({
                filePath: androidPackageFilePath,
                replacements,
            })
        )

        await rm(path.join(androidPackageFilePath, '..'), { recursive: true })
    }
}
