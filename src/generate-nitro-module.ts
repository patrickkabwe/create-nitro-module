import { exec } from 'node:child_process'
import { readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import util from 'node:util'
import { androidSettingsGradleCode } from './code-snippets/code.android'
import {
    appExampleCode,
    babelConfig,
    exampleTsConfig,
    metroConfig
} from './code-snippets/code.js'
import {
    ANDROID_CXX_LIB_NAME_TAG,
    ANDROID_NAME_SPACE_TAG,
    CXX_NAME_SPACE_TAG,
    foldersToRemoveFromExampleApp,
    IOS_MODULE_NAME_TAG,
    JS_PACKAGE_NAME_TAG,
    messages,
    packagesToRemoveFromExampleApp
} from './constants'
import { AndroidFileGenerator } from './file-generators/android-file-generator'
import { CppFileGenerator } from './file-generators/cpp-file-generator'
import { IOSFileGenerator } from './file-generators/ios-file-generator'
import { JSFileGenerator } from './file-generators/js-file-generator'
import { FileGenerator, GenerateModuleConfig, SupportedLang } from './types'
import {
    copyTemplateFiles,
    createFolder,
    createModuleFile,
    dirExist,
    generateAutolinking,
    getGitUserInfo,
    replaceHyphen,
    replacePlaceholder,
    toPascalCase
} from './utils'

const execAsync = util.promisify(exec)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export class NitroModuleFactory {
    private generators: Map<SupportedLang, FileGenerator>

    constructor(private config: GenerateModuleConfig) {
        const androidGenerator = new AndroidFileGenerator()
        const iosGenerator = new IOSFileGenerator()
        this.generators = new Map<SupportedLang, FileGenerator>([
            [SupportedLang.KOTLIN, androidGenerator],
            [SupportedLang.SWIFT, iosGenerator],
            [
                SupportedLang.CPP,
                new CppFileGenerator([androidGenerator, iosGenerator]),
            ],
            [SupportedLang.JS, new JSFileGenerator()],
        ])
        this.config.funcName = 'sum'
        this.config.prefix = 'react-native-'
        this.config.finalModuleName = `${this.config.prefix}${this.config.moduleName}`
        this.config.cwd = path.join(
            this.config.cwd,
            this.config.finalModuleName
        )
    }

    async createNitroModule() {
        const dirExists = await dirExist(this.config.cwd)
        if (dirExists) {
            throw new Error("Looks like the directory with the same name already exists.")
        }
        await createFolder(this.config.cwd)
        const supportedLanguages = [...this.config.langs, SupportedLang.JS]
        this.config.spinner.start(messages.creating)
        for (const lang of supportedLanguages) {
            const generator = this.generators.get(lang)
            if (!generator) {
                throw new Error(`Unsupported language: ${lang}`)
            }
            await generator.generate(this.config)
        }
        await this.copyPackageFiles()
        await this.replaceNitroJsonPlaceholders()
        await this.updatePackageJsonConfig(this.config.skipExample)
        if (!this.config.skipExample) {
            this.config.spinner.text = messages.generating
            await this.createExampleApp()
            await this.configureExamplePackageJson()
            await this.syncExampleAppConfigurations()
            await this.gitInit()
        }
        if (!this.config.skipInstall && !this.config.skipExample) {
            this.config.spinner.text = messages.installing
            await this.runCodegenAndInstallDependencies()
        }
        this.config.spinner.succeed()
    }

    private async replaceNitroJsonPlaceholders() {
        const nitroJsonContent = await readFile(
            path.join(this.config.cwd, 'nitro.json'),
            { encoding: 'utf-8' }
        )
        const replacements = {
            [ANDROID_NAME_SPACE_TAG]: replaceHyphen(this.config.moduleName),
            [CXX_NAME_SPACE_TAG]: replaceHyphen(this.config.moduleName),
            [IOS_MODULE_NAME_TAG]: toPascalCase(this.config.moduleName),
            [ANDROID_CXX_LIB_NAME_TAG]: toPascalCase(this.config.moduleName),
        }
        const newNitroJsonContent = JSON.parse(nitroJsonContent)
        newNitroJsonContent.autolinking = generateAutolinking(
            toPascalCase(this.config.moduleName),
            this.config.langs
        )
        await createModuleFile(
            this.config.cwd,
            'nitro.json',
            await replacePlaceholder({
                replacements,
                data: JSON.stringify(newNitroJsonContent, null, 2),
            })
        )
    }

    private async updatePackageJsonConfig(skipExample?: boolean) {
        const { name } = getGitUserInfo()
        const userName = name.replaceAll(' ', '').toLowerCase()

        const workspacePackageJsonFilePath = path.join(
            this.config.cwd,
            'package.json'
        )
        const workspacePackageJsonFile = await readFile(
            workspacePackageJsonFilePath,
            { encoding: 'utf8' }
        )
        const newWorkspacePackageJsonFile = JSON.parse(workspacePackageJsonFile)
        newWorkspacePackageJsonFile.name = this.config.finalModuleName
        newWorkspacePackageJsonFile.repository = `https://github.com/${userName}/${this.config.finalModuleName}.git`
        newWorkspacePackageJsonFile.bugs = `https://github.com/${userName}/${this.config.finalModuleName}/issues`
        newWorkspacePackageJsonFile.homepage = `https://github.com/${userName}/${this.config.finalModuleName}#readme`
        newWorkspacePackageJsonFile.author = name
        newWorkspacePackageJsonFile.scripts = {
            ...newWorkspacePackageJsonFile.scripts,
            postcodegen: `bun run build${this.config.langs.includes(SupportedLang.KOTLIN) ? ' && node post-script.js' : ''}`
        }

        if (this.config.pm === 'yarn') {
            newWorkspacePackageJsonFile.packageManager = "yarn@3.6.1"
        }

        if (skipExample) {
            delete newWorkspacePackageJsonFile.workspaces
        }
        await writeFile(
            workspacePackageJsonFilePath,
            JSON.stringify(newWorkspacePackageJsonFile, null, 2),
            { encoding: 'utf8' }
        )
    }

    private async copyPackageFiles() {
        const filesToCopy = [
            '.watchmanconfig',
            'babel.config.js',
            'nitro.json',
            'tsconfig.json',
            'gitignore',
            'README.md',
            'package.json'
        ]
        if (this.config.pm === 'yarn') {
            filesToCopy.push('.yarnrc.yml', '.yarn',)
        }
        await copyTemplateFiles(
            this.config,
            [__dirname, '..', 'assets', 'template'],
            filesToCopy
        )
        const oldGitIgnorePath = path.join(this.config.cwd, 'gitignore')
        const newGitIgnorePath = path.join(this.config.cwd, '.gitignore')
        await rename(oldGitIgnorePath, newGitIgnorePath)
    }

    private async createExampleApp() {
        const packageManager = this.config.pm === 'bun' ? 'bunx' : 'npx'

        const args = `${packageManager} -y @react-native-community/cli@latest init ${toPascalCase(this.config.moduleName)}Example --directory example --skip-install --skip-git-init --version 0.76.5`

        await execAsync(args, { cwd: this.config.cwd })

        // Setup App.tsx
        const appPath = path.join(this.config.cwd, 'example', 'App.tsx')
        await writeFile(
            appPath,
            appExampleCode(
                this.config.moduleName,
                this.config.finalModuleName,
                `${this.config.funcName}`
            ),
            { encoding: 'utf8' }
        )
    }

    private async configureExamplePackageJson() {
        const packageJsonPath = path.join(
            this.config.cwd,
            'example',
            'package.json'
        )
        const packageJsonStr = await readFile(packageJsonPath, {
            encoding: 'utf8',
        })
        const packageJson = JSON.parse(packageJsonStr)

        packageJson.name = `${this.config.finalModuleName}-example`

        packageJson.scripts = {
            ...packageJson.scripts,
            ios: "react-native run-ios --simulator='iPhone 16'",
            start: 'react-native start --reset-cache',
            pod: 'pod install --project-directory=ios',
        }
        packageJson.dependencies = {
            ...packageJson.dependencies,
            'react-native-nitro-modules': '*',
        }

        packagesToRemoveFromExampleApp.forEach((pkg) => {
            delete packageJson.devDependencies[pkg]
        })

        await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2), {
            encoding: 'utf8',
        })
    }

    private async syncExampleAppConfigurations() {
        const reactNativeConfigPath = path.join(
            this.config.cwd,
            'example',
            'react-native.config.js'
        )

        const replacements = {
            [JS_PACKAGE_NAME_TAG]: this.config.finalModuleName,
        }

        const reactNativeConfig = await replacePlaceholder({
            filePath: path.join(
                __dirname,
                '..',
                'assets',
                'react-native.config.js'
            ),
            replacements,
        })

        await writeFile(reactNativeConfigPath, reactNativeConfig, {
            encoding: 'utf8',
        })
        // Setup metro.config.js
        const metroConfigPath = path.join(
            this.config.cwd,
            'example',
            'metro.config.js'
        )

        await writeFile(metroConfigPath, metroConfig, { encoding: 'utf8' })

        // Setup babel.config.js
        const babelConfigPath = path.join(
            this.config.cwd,
            'example',
            'babel.config.js'
        )

        await writeFile(babelConfigPath, babelConfig, { encoding: 'utf8' })

        // Setup tsconfig.json
        const tsConfigPath = path.join(
            this.config.cwd,
            'example',
            'tsconfig.json'
        )

        await writeFile(
            tsConfigPath,
            exampleTsConfig(this.config.finalModuleName),
            { encoding: 'utf8' }
        )

        const androidSettingsGradlePath = path.join(
            this.config.cwd,
            'example',
            'android',
            'settings.gradle'
        )

        await writeFile(
            androidSettingsGradlePath,
            androidSettingsGradleCode(toPascalCase(this.config.moduleName)),
            { encoding: 'utf8' }
        )

        const androidBuildGradlePath = path.join(
            this.config.cwd,
            'example',
            'android',
            'app',
            'build.gradle'
        )

        const androidBuildGradle = await readFile(androidBuildGradlePath, {
            encoding: 'utf8',
        })

        const gradleReplacements = {
            '// reactNativeDir = file("../../node_modules/react-native")':
                'reactNativeDir = file("../../../node_modules/react-native")',
            '// codegenDir = file("../../node_modules/@react-native/codegen")':
                'codegenDir = file("../../../node_modules/@react-native/codegen")',
            '// cliFile = file("../../node_modules/react-native/cli.js")':
                'cliFile = file("../../../node_modules/react-native/cli.js")',
            '// hermesCommand = "$rootDir/my-custom-hermesc/bin/hermesc"':
                'hermesCommand = "$rootDir/../../node_modules/react-native/sdks/hermesc/%OS-BIN%/hermesc"',
        }

        const toWrite = await replacePlaceholder({
            data: androidBuildGradle,
            replacements: gradleReplacements,
        })

        await writeFile(androidBuildGradlePath, toWrite, { encoding: 'utf8' })

        for (const folder of foldersToRemoveFromExampleApp) {
            await execAsync(`rm -rf ${path.join(this.config.cwd, 'example', folder)}`)
        }
    }

    private async runCodegenAndInstallDependencies() {
        await execAsync(`${this.config.pm} install`, { cwd: this.config.cwd })
        await execAsync(`${this.config.pm} codegen`, { cwd: this.config.cwd })
    }

    private async gitInit() {
        await execAsync('git init', { cwd: this.config.cwd })
        await execAsync('git add .', { cwd: this.config.cwd })
        await execAsync('git commit -m "initial commit"', { cwd: this.config.cwd })
    }
}
