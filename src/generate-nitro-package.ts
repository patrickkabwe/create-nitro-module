import kleur from 'kleur'
import { exec } from 'node:child_process'
import { readFile, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import util from 'node:util'
import templatePackageJson from '../assets/template/package.json'
import { androidSettingsGradleCode } from './code-snippets/code.android'
import {
    appExampleCode,
    babelConfig,
    exampleTsConfig,
    metroConfig,
} from './code-snippets/code.js'
import {
    ANDROID_CXX_LIB_NAME_TAG,
    ANDROID_NAME_SPACE_TAG,
    AUTHOR_TAG,
    CXX_NAME_SPACE_TAG,
    DESCRIPTION_TAG,
    foldersToRemoveFromExampleApp,
    IOS_MODULE_NAME_TAG,
    JS_PACKAGE_NAME_TAG,
    LICENSE_YEAR_TAG,
    messages,
    packagesToRemoveFromExampleApp,
} from './constants'
import { AndroidFileGenerator } from './file-generators/android-file-generator'
import { CppFileGenerator } from './file-generators/cpp-file-generator'
import { IOSFileGenerator } from './file-generators/ios-file-generator'
import { JSFileGenerator } from './file-generators/js-file-generator'
import {
    FileGenerator,
    GenerateModuleConfig,
    Nitro,
    SupportedLang,
} from './types'
import {
    copyTemplateFiles,
    createFolder,
    createModuleFile,
    dirExist,
    generateAutolinking,
    getGitUserInfo,
    replaceHyphen,
    replacePlaceholder,
    toPascalCase,
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
        this.config.finalPackageName = `${this.config.prefix}${this.config.packageName}`
        this.config.cwd = path.join(
            this.config.cwd,
            this.config.finalPackageName
        )
    }

    async createNitroModule() {
        const dirExists = await dirExist(this.config.cwd)
        if (dirExists) {
            throw new Error(
                'Looks like the directory with the same name already exists.'
            )
        }
        await createFolder(this.config.cwd)
        const supportedLanguages = [...this.config.langs, SupportedLang.JS]
        for (const lang of supportedLanguages) {
            const generator = this.generators.get(lang)
            if (!generator) {
                throw new Error(`Unsupported language: ${lang}`)
            }
            await generator.generate(this.config)
        }
        await this.copyNitroTemplateFiles()
        await this.replaceNitroJsonPlaceholders()
        await this.updatePackageJsonConfig(this.config.skipExample)
        await this.updateTemplateFiles()

        if (!this.config.skipExample) {
            this.config.spinner.message(messages.generating)
            await this.createExampleApp()
            await this.configureExamplePackageJson()
            await this.syncExampleAppConfigurations()
            await this.setupWorkflows()
            await this.gitInit()
            this.config.spinner.stop(kleur.cyan(messages.generating + 'Done'))
        }
        if (!this.config.skipInstall && !this.config.skipExample) {
            this.config.spinner.start(messages.installing)
            await this.installDependenciesAndRunCodegen()
            this.config.spinner.stop(kleur.cyan(messages.installing + 'Done'))
        }
    }

    private async replaceNitroJsonPlaceholders() {
        const nitroJsonContent = await readFile(
            path.join(this.config.cwd, 'nitro.json'),
            { encoding: 'utf-8' }
        )
        const replacements = {
            [ANDROID_NAME_SPACE_TAG]: replaceHyphen(this.config.packageName),
            [CXX_NAME_SPACE_TAG]: replaceHyphen(this.config.packageName),
            [IOS_MODULE_NAME_TAG]: toPascalCase(this.config.packageName),
            [ANDROID_CXX_LIB_NAME_TAG]: toPascalCase(this.config.packageName),
        }
        const newNitroJsonContent = JSON.parse(nitroJsonContent)
        newNitroJsonContent.autolinking = generateAutolinking(
            toPascalCase(this.config.packageName),
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

    private getPostCodegenScript() {
        let script = `${this.config.pm} --cwd example pod`
        if (this.config.pm === 'npm') {
            script = `${this.config.pm} --prefix example run pod`
        } else if (this.config.pm === 'pnpm') {
            script = `pnpm --filter ./example pod`
        }
        return script
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
        newWorkspacePackageJsonFile.name = this.config.finalPackageName
        newWorkspacePackageJsonFile.description = this.config.description
        newWorkspacePackageJsonFile.repository = `https://github.com/${userName}/${this.config.finalPackageName}.git`
        newWorkspacePackageJsonFile.bugs = `https://github.com/${userName}/${this.config.finalPackageName}/issues`
        newWorkspacePackageJsonFile.homepage = `https://github.com/${userName}/${this.config.finalPackageName}#readme`
        newWorkspacePackageJsonFile.author = name
        newWorkspacePackageJsonFile.scripts = {
            ...newWorkspacePackageJsonFile.scripts,
            build: `${this.config.pm} run typecheck && bob build`,
            codegen: `nitro-codegen --logLevel="debug" && ${this.config.pm} run build${this.config.langs.includes(SupportedLang.KOTLIN) ? ' && node post-script.js' : ''}`,
            postcodegen: this.getPostCodegenScript(),
        }

        newWorkspacePackageJsonFile.keywords = [
            ...newWorkspacePackageJsonFile.keywords,
            this.config.finalPackageName,
        ]

        if (this.config.pm === 'yarn') {
            await execAsync('corepack enable', { cwd: this.config.cwd })
            await execAsync('yarn set version 4.6.0', { cwd: this.config.cwd })
            await execAsync('yarn config set enableImmutableInstalls false', {
                cwd: this.config.cwd,
            })
            await execAsync('yarn config set nodeLinker node-modules', {
                cwd: this.config.cwd,
            })
            await execAsync('corepack disable', { cwd: this.config.cwd })
        } else if (this.config.pm === 'pnpm') {
            const workspaceDirs = ['example']
            const yamlContent = `packages:\n${workspaceDirs.map(d => `  - '${d}'`).join('\n')}\n`

            const WORKSPACE_FILENAME = 'pnpm-workspace.yaml'
            await writeFile(
                path.join(this.config.cwd, WORKSPACE_FILENAME),
                yamlContent,
                { encoding: 'utf8' }
            )
            delete newWorkspacePackageJsonFile.workspaces
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

    private async updateTemplateFiles() {
        const readmePath = path.join(this.config.cwd, 'README.md')
        const licensePath = path.join(this.config.cwd, 'LICENSE')

        const replacements = {
            [JS_PACKAGE_NAME_TAG]: this.config.finalPackageName,
            $$command$$:
                this.config.pm === 'npm'
                    ? 'npm install'
                    : `${this.config.pm} add`,
            [DESCRIPTION_TAG]: this.config.description,
            [AUTHOR_TAG]: getGitUserInfo().name,
            [LICENSE_YEAR_TAG]: new Date().getFullYear().toString(),
        }

        const readmeContents = await replacePlaceholder({
            filePath: readmePath,
            replacements,
        })

        const licenseContents = await replacePlaceholder({
            filePath: licensePath,
            replacements,
        })

        await writeFile(readmePath, readmeContents, {
            encoding: 'utf8',
        })
        await writeFile(licensePath, licenseContents, {
            encoding: 'utf8',
        })
    }

    private async copyNitroTemplateFiles() {
        const filesToCopy = [
            '.watchmanconfig',
            'babel.config.js',
            'nitro.json',
            'tsconfig.json',
            'gitignore',
            'README.md',
            'package.json',
            '.github',
            'release.config.cjs',
            'LICENSE',
        ]

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
        const packageManager =
            this.config.pm === 'bun'
                ? 'bunx'
                : this.config.pm === 'pnpm'
                    ? 'pnpx'
                    : 'npx -y'

        const reactNativeVersion =
            templatePackageJson.devDependencies['react-native']

        const args = `${packageManager} \
            @react-native-community/cli@latest init ${toPascalCase(this.config.packageName)}Example \
            --package-name com.${replaceHyphen(this.config.packageName)}example \
            --directory example --skip-install --skip-git-init --version ${reactNativeVersion}`

        await execAsync(args, { cwd: this.config.cwd })

        // Setup App.tsx
        const appPath = path.join(this.config.cwd, 'example', 'App.tsx')
        await writeFile(
            appPath,
            appExampleCode(
                this.config.packageName,
                this.config.finalPackageName,
                `${this.config.funcName}`,
                this.config.packageType === Nitro.View
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
        const examplePackageJsonStr = await readFile(packageJsonPath, {
            encoding: 'utf8',
        })
        const exampleAppPackageJson = JSON.parse(examplePackageJsonStr)

        exampleAppPackageJson.name = `${this.config.finalPackageName}-example`

        exampleAppPackageJson.scripts = {
            ...exampleAppPackageJson.scripts,
            ios: "react-native run-ios --simulator='iPhone 16'",
            start: 'react-native start --reset-cache',
            pod: 'bundle install && bundle exec pod install --project-directory=ios',
        }

        const nitroKey = `react-native-nitro-modules`
        exampleAppPackageJson.dependencies = {
            ...exampleAppPackageJson.dependencies,
            [nitroKey]: templatePackageJson.devDependencies[nitroKey] ?? '*',
        }

        exampleAppPackageJson.devDependencies = {
            ...exampleAppPackageJson.devDependencies,
            'babel-plugin-module-resolver': '^5.0.2',
        }

        packagesToRemoveFromExampleApp.forEach(pkg => {
            delete exampleAppPackageJson.devDependencies[pkg]
        })

        await writeFile(
            packageJsonPath,
            JSON.stringify(exampleAppPackageJson, null, 2),
            { encoding: 'utf8' }
        )
    }

    private async syncExampleAppConfigurations() {
        const reactNativeConfigPath = path.join(
            this.config.cwd,
            'example',
            'react-native.config.js'
        )

        const replacements = {
            [JS_PACKAGE_NAME_TAG]: this.config.finalPackageName,
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

        // await writeFile(reactNativeConfigPath, reactNativeConfig, {
        //     encoding: 'utf8',
        // })
        // Setup metro.config.js
        const metroConfigPath = path.join(
            this.config.cwd,
            'example',
            'metro.config.js'
        )

        // await writeFile(metroConfigPath, metroConfig, { encoding: 'utf8' })

        // Setup babel.config.js
        const babelConfigPath = path.join(
            this.config.cwd,
            'example',
            'babel.config.js'
        )

        // await writeFile(babelConfigPath, babelConfig, { encoding: 'utf8' })

        // Setup tsconfig.json
        const tsConfigPath = path.join(
            this.config.cwd,
            'example',
            'tsconfig.json'
        )

        // await writeFile(
        //     tsConfigPath,
        //     exampleTsConfig(this.config.finalPackageName),
        //     { encoding: 'utf8' }
        // )

        const androidSettingsGradlePath = path.join(
            this.config.cwd,
            'example',
            'android',
            'settings.gradle'
        )

        await writeFile(
            androidSettingsGradlePath,
            androidSettingsGradleCode(toPascalCase(this.config.packageName)),
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

        const androidBuildGradleData = await replacePlaceholder({
            data: androidBuildGradle,
            replacements: gradleReplacements,
        })

        // await writeFile(androidBuildGradlePath, androidBuildGradleData, { encoding: 'utf8' })

        const filesToWrite = [
            { saveTo: reactNativeConfigPath, data: reactNativeConfig },
            { saveTo: metroConfigPath, data: metroConfig },
            { saveTo: babelConfigPath, data: babelConfig },
            {
                saveTo: tsConfigPath,
                data: exampleTsConfig(this.config.finalPackageName),
            },
            {
                saveTo: androidSettingsGradlePath,
                data: androidSettingsGradleCode(
                    toPascalCase(this.config.packageName)
                ),
            },
            { saveTo: androidBuildGradlePath, data: androidBuildGradleData },
        ]
        await Promise.all(
            filesToWrite.map(async item => {
                const { saveTo, data } = item
                await writeFile(saveTo, data, { encoding: 'utf8' })
            })
        )

        for (const folder of foldersToRemoveFromExampleApp) {
            await rm(path.join(this.config.cwd, 'example', folder), {
                recursive: true,
                force: true,
            })
        }
    }

    private async installDependenciesAndRunCodegen() {
        await execAsync(`${this.config.pm} install`, { cwd: this.config.cwd })
        let packageManager =
            this.config.pm === 'npm' ? 'npx --yes' : this.config.pm
        let codegenCommand = `${packageManager} nitro-codegen --logLevel="debug" && ${this.config.pm} run build${this.config.langs.includes(SupportedLang.KOTLIN) ? ' && node post-script.js' : ''}`
        await execAsync(codegenCommand, { cwd: this.config.cwd })
    }

    private async gitInit() {
        await execAsync('git init', { cwd: this.config.cwd })
        await execAsync('git add .', { cwd: this.config.cwd })
        await execAsync('git commit -m "initial commit"', {
            cwd: this.config.cwd,
        })
    }

    private async setupWorkflows() {
        const iosBuildWorkflowPath = path.join(
            this.config.cwd,
            '.github',
            'workflows',
            'ios-build.yml'
        )

        const iosBuildWorkflow = await readFile(iosBuildWorkflowPath, {
            encoding: 'utf8',
        })

        const iosBuildReplacements = {
            $$exampleApp$$: `${toPascalCase(this.config.packageName)}Example`,
        }

        const iosBuildWorkflowContent = await replacePlaceholder({
            data: iosBuildWorkflow,
            replacements: iosBuildReplacements,
        })

        await writeFile(iosBuildWorkflowPath, iosBuildWorkflowContent, {
            encoding: 'utf8',
        })
    }
}
