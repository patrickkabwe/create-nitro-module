import { exec } from 'node:child_process'
import { cp, readFile, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import util from 'node:util'
import kleur from 'kleur'
import templatePackageJson from '../assets/template/package.json'
import {
    appExampleCode,
    babelConfig,
    exampleReactNativeConfig,
    exampleTsConfig,
    harnessConfigCode,
    harnessJestConfigCode,
    harnessTestCode,
    harnessWorkflowCode,
    metroConfig,
} from './code-snippets/code.js'
import { androidSettingsGradleCode } from './code-snippets/code.kotlin'
import {
    ANDROID_CXX_LIB_NAME_TAG,
    ANDROID_NAME_SPACE_TAG,
    AUTHOR_TAG,
    CXX_NAME_SPACE_TAG,
    DESCRIPTION_TAG,
    foldersToRemoveFromExampleApp,
    HARNESS_UI_VERSION,
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
    CLANG_FORMAT_CONFIG,
    getNativeToolingDevDependencies,
    getNativeToolingScripts,
    KTLINT_EDITOR_CONFIG,
} from './native-tooling'
import {
    type GenerateModuleConfig,
    Nitro,
    SupportedLang,
    SupportedPlatform,
} from './types'
import {
    copyTemplateFiles,
    createFolder,
    createModuleFile,
    getGitUserInfo,
    replaceHyphen,
    replacePlaceholder,
    toPascalCase,
} from './utils'

const execAsync = util.promisify(exec)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
type PackageJson = Record<string, unknown> & {
    name?: string
    private?: boolean
    scripts?: Record<string, string>
    workspaces?: string[]
}

export class NitroModuleFactory {
    private workspaceRoot: string

    private androidGenerator: AndroidFileGenerator
    private iosGenerator: IOSFileGenerator
    private cppGenerator: CppFileGenerator
    private jsGenerator: JSFileGenerator

    constructor(private config: GenerateModuleConfig) {
        this.androidGenerator = new AndroidFileGenerator()
        this.iosGenerator = new IOSFileGenerator()
        this.cppGenerator = new CppFileGenerator([
            this.androidGenerator,
            this.iosGenerator,
        ])
        this.jsGenerator = new JSFileGenerator()
        this.config.funcName = 'sum'
        this.config.prefix = 'react-native-'
        this.config.finalPackageName = `${this.config.prefix}${this.config.packageName}`
        this.workspaceRoot = this.config.cwd
        const packageDir = this.config.monorepo
            ? path.join(
                  this.config.cwd,
                  'packages',
                  this.config.finalPackageName
              )
            : this.config.cwd
        this.config.cwd = packageDir
    }

    private get exampleDir(): string {
        return this.config.monorepo
            ? path.join(this.workspaceRoot, 'example')
            : path.join(this.config.cwd, 'example')
    }

    private get nativeToolingScripts(): Record<string, string> {
        return getNativeToolingScripts(
            this.config.nativeTooling,
            this.config.pm
        )
    }

    /**
     * Resolves the latest published version for each tooling devDependency,
     * falling back to the pinned range when the registry is unreachable.
     */
    private async resolveNativeToolingDevDependencies(): Promise<
        Record<string, string>
    > {
        const fallbacks = getNativeToolingDevDependencies(
            this.config.nativeTooling
        )
        const names = Object.keys(fallbacks)

        if (names.length === 0) {
            return {}
        }

        if (this.config.skipInstall) {
            return fallbacks
        }

        const resolved = await Promise.all(
            names.map(async name => {
                const version = await this.getLatestVersion(name)
                return [
                    name,
                    version != null ? `^${version}` : fallbacks[name],
                ] as const
            })
        )

        return Object.fromEntries(resolved)
    }

    private get packageRelativeFromExample(): string {
        return this.config.monorepo
            ? path.posix.join('..', 'packages', this.config.finalPackageName)
            : '..'
    }

    async createNitroModule() {
        await createFolder(this.config.cwd)

        const langs = Object.values(this.config.platformLangs)
        const allCpp =
            langs.length > 0 && langs.every(l => l === SupportedLang.CPP)

        if (allCpp) {
            // All platforms use C++ — use composite CppFileGenerator
            await this.cppGenerator.generate(this.config)
        } else {
            // Mixed or native-only: generate C++ files if any platform uses C++,
            // then run per-platform generators individually
            if (langs.includes(SupportedLang.CPP)) {
                await this.cppGenerator.generateCppCodeFiles(this.config)
            }
            if (this.config.platformLangs[SupportedPlatform.IOS] != null) {
                await this.iosGenerator.generate(this.config)
            }
            if (this.config.platformLangs[SupportedPlatform.ANDROID] != null) {
                await this.androidGenerator.generate(this.config)
                if (
                    this.config.platformLangs[SupportedPlatform.ANDROID] ===
                    SupportedLang.CPP
                ) {
                    await this.cppGenerator.updateAndroidCMakeLists(this.config)
                }
            }
        }

        // Always generate JS/TS files
        await this.jsGenerator.generate(this.config)
        await this.copyNitroTemplateFiles()
        await this.replaceNitroJsonPlaceholders()
        await this.updatePackageJsonConfig(this.config.skipExample)
        await this.setupNativeTooling()
        if (this.config.monorepo) {
            await this.createWorkspaceRoot()
            if (this.config.pm === 'yarn') {
                await this.configureYarnWorkspace()
            }
        }
        await this.updateTemplateFiles()
        if (this.config.monorepo) {
            await this.configureMonorepoReleaseConfig()
        }

        if (!this.config.skipExample) {
            this.config.spinner.message(messages.generating)
            await this.createExampleApp()
            await this.configureExamplePackageJson()
            await this.syncExampleAppConfigurations()
            if (this.config.platforms.includes(SupportedPlatform.IOS)) {
                await this.configureExampleIOSDeploymentTarget()
            }
            if (this.config.includeHarness) {
                await this.setupReactNativeHarness()
            }
            await this.setupWorkflows()
            await this.gitInit()
            this.config.spinner.stop(kleur.cyan(`${messages.generating}Done`))
        }
        if (!this.config.skipInstall && !this.config.skipExample) {
            this.config.spinner.start(messages.installing)
            await this.installDependenciesAndRunCodegen()
            this.config.spinner.stop(kleur.cyan(`${messages.installing}Done`))
        }
    }

    private async getLatestVersion(pkg: string): Promise<string | null> {
        try {
            const { stdout } = await execAsync(`npm view ${pkg} version`)
            const v = stdout?.toString().trim()
            return v?.length ? v : null
        } catch {
            try {
                const { stdout } = await execAsync(`pnpm view ${pkg} version`)
                const v = stdout?.toString().trim()
                return v?.length ? v : null
            } catch {
                return null
            }
        }
    }

    private getWorkspaceRunCommand(scriptName: string): string {
        const packageWorkspacePath = `packages/${this.config.finalPackageName}`

        if (this.config.pm === 'yarn') {
            return `yarn --cwd ${packageWorkspacePath} ${scriptName}`
        }

        if (this.config.pm === 'pnpm') {
            return `pnpm --dir ${packageWorkspacePath} run ${scriptName}`
        }

        if (this.config.pm === 'npm') {
            return `npm --prefix ${packageWorkspacePath} run ${scriptName}`
        }

        return `bun run --cwd ${packageWorkspacePath} ${scriptName}`
    }

    private getExampleRunCommand(scriptName: string): string {
        if (this.config.pm === 'yarn') {
            return `yarn --cwd example ${scriptName}`
        }

        if (this.config.pm === 'pnpm') {
            return `pnpm --dir example run ${scriptName}`
        }

        if (this.config.pm === 'npm') {
            return `npm --prefix example run ${scriptName}`
        }

        return `bun run --cwd example ${scriptName}`
    }

    private async createWorkspaceRoot(): Promise<void> {
        const workspaces = this.config.skipExample
            ? ['packages/*']
            : ['packages/*', 'example']
        const rootPackageJson: PackageJson = {
            name: `${this.config.finalPackageName}-workspace`,
            private: true,
            scripts: {
                build: this.getWorkspaceRunCommand('build'),
                codegen: this.getWorkspaceRunCommand('codegen'),
                release: this.getWorkspaceRunCommand('release'),
                ...Object.fromEntries(
                    Object.keys(this.nativeToolingScripts).map(scriptName => [
                        scriptName,
                        this.getWorkspaceRunCommand(scriptName),
                    ])
                ),
                ...(this.config.includeHarness && !this.config.skipExample
                    ? {
                          'test:harness':
                              this.getExampleRunCommand('test:harness'),
                          ...(this.config.platforms.includes(
                              SupportedPlatform.ANDROID
                          )
                              ? {
                                    'test:harness:android':
                                        this.getExampleRunCommand(
                                            'test:harness:android'
                                        ),
                                }
                              : {}),
                          ...(this.config.platforms.includes(
                              SupportedPlatform.IOS
                          )
                              ? {
                                    'test:harness:ios':
                                        this.getExampleRunCommand(
                                            'test:harness:ios'
                                        ),
                                }
                              : {}),
                      }
                    : {}),
            },
            workspaces,
        }

        await writeFile(
            path.join(this.workspaceRoot, 'package.json'),
            JSON.stringify(rootPackageJson, null, 2),
            { encoding: 'utf8' }
        )

        if (this.config.pm !== 'pnpm') {
            return
        }

        await writeFile(
            path.join(this.workspaceRoot, 'pnpm-workspace.yaml'),
            `packages:\n${workspaces.map(workspace => `  - ${workspace}`).join('\n')}\n`,
            { encoding: 'utf8' }
        )
    }

    private async configureYarnWorkspace(): Promise<void> {
        const yarnCwd = this.config.monorepo
            ? this.workspaceRoot
            : this.config.cwd
        // Keep Yarn from treating a parent package as this project's root.
        await writeFile(path.join(yarnCwd, 'yarn.lock'), '', { flag: 'wx' })
        await execAsync('corepack enable', { cwd: yarnCwd })
        await execAsync('yarn set version 4.6.0', { cwd: yarnCwd })
        await execAsync('yarn config set enableImmutableInstalls false', {
            cwd: yarnCwd,
        })
        await execAsync('yarn config set nodeLinker node-modules', {
            cwd: yarnCwd,
        })
        await execAsync('corepack disable', { cwd: yarnCwd })
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
        newWorkspacePackageJsonFile.name = this.config.finalPackageName
        newWorkspacePackageJsonFile.description = this.config.description
        newWorkspacePackageJsonFile.repository = `https://github.com/${userName}/${this.config.finalPackageName}.git`
        newWorkspacePackageJsonFile.bugs = `https://github.com/${userName}/${this.config.finalPackageName}/issues`
        newWorkspacePackageJsonFile.homepage = `https://github.com/${userName}/${this.config.finalPackageName}#readme`
        newWorkspacePackageJsonFile.author = name
        newWorkspacePackageJsonFile.scripts = {
            ...newWorkspacePackageJsonFile.scripts,
            build: `${this.config.pm} run typecheck && bob build`,
            codegen: `nitrogen --logLevel="debug" && ${this.config.pm} run build`,
            ...this.nativeToolingScripts,
        }

        if (this.config.monorepo) {
            // The README lives at the workspace root for monorepos.
            newWorkspacePackageJsonFile.files = (
                newWorkspacePackageJsonFile.files as string[] | undefined
            )?.filter((file: string) => file !== 'README.md')
        }

        newWorkspacePackageJsonFile.devDependencies = {
            ...newWorkspacePackageJsonFile.devDependencies,
            ...(await this.resolveNativeToolingDevDependencies()),
        }
        if (this.config.platforms.includes(SupportedPlatform.IOS)) {
            newWorkspacePackageJsonFile.swiftpmConfig = {
                name: toPascalCase(this.config.packageName),
                dependencies: ['react-native-nitro-modules'],
            }
        }

        newWorkspacePackageJsonFile.keywords = [
            ...newWorkspacePackageJsonFile.keywords,
            this.config.finalPackageName,
        ]

        if (this.config.pm === 'pnpm') {
            const workspaceDirs = ['example']
            const yamlContent = `packages:\n${workspaceDirs.map(d => `  - ${d}`).join('\n')}\n`

            if (!this.config.monorepo) {
                const WORKSPACE_FILENAME = 'pnpm-workspace.yaml'
                await writeFile(
                    path.join(this.config.cwd, WORKSPACE_FILENAME),
                    yamlContent,
                    { encoding: 'utf8' }
                )
            }
            const NPMRC_FILENAME = '.npmrc'
            await writeFile(
                path.join(
                    this.config.monorepo ? this.workspaceRoot : this.config.cwd,
                    NPMRC_FILENAME
                ),
                'node-linker=hoisted',
                { encoding: 'utf8' }
            )
            delete newWorkspacePackageJsonFile.workspaces
        }

        if (skipExample || this.config.monorepo) {
            delete newWorkspacePackageJsonFile.workspaces
        }
        await writeFile(
            workspacePackageJsonFilePath,
            JSON.stringify(newWorkspacePackageJsonFile, null, 2),
            { encoding: 'utf8' }
        )

        if (this.config.pm === 'yarn' && !this.config.monorepo) {
            await this.configureYarnWorkspace()
        }
    }

    private async setupNativeTooling() {
        const writes: Promise<void>[] = []

        if (this.config.nativeTooling.includes(SupportedLang.CPP)) {
            writes.push(
                writeFile(
                    path.join(this.config.cwd, '.clang-format'),
                    CLANG_FORMAT_CONFIG,
                    { encoding: 'utf8' }
                )
            )
        }

        if (this.config.nativeTooling.includes(SupportedLang.KOTLIN)) {
            writes.push(
                writeFile(
                    path.join(this.config.cwd, '.editorconfig'),
                    KTLINT_EDITOR_CONFIG,
                    { encoding: 'utf8' }
                )
            )
        }

        await Promise.all(writes)
    }

    private async updateTemplateFiles() {
        const readmePath = path.join(
            this.config.monorepo ? this.workspaceRoot : this.config.cwd,
            'README.md'
        )
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

    private async configureMonorepoReleaseConfig(): Promise<void> {
        const releaseConfigPath = path.join(
            this.config.cwd,
            'release.config.cjs'
        )
        const releaseConfig = await readFile(releaseConfigPath, {
            encoding: 'utf8',
        })
        const gitAssets = this.config.skipExample
            ? "['package.json', 'CHANGELOG.md']"
            : "['package.json', 'CHANGELOG.md', '../example/package.json']"

        await writeFile(
            releaseConfigPath,
            releaseConfig.replace(
                /assets:\s*\[[^\]]+\]/,
                `assets: ${gitAssets}`
            ),
            { encoding: 'utf8' }
        )
    }

    private async copyNitroTemplateFiles() {
        const filesToCopy = [
            '.watchmanconfig',
            'babel.config.js',
            'react-native.config.js',
            'nitro.json',
            'tsconfig.json',
            'gitignore',
            'README.md',
            'package.json',
            '.github',
            'release.config.cjs',
            'LICENSE',
        ]

        if (this.config.pm === 'bun') {
            filesToCopy.push('bunfig.toml')
        }

        await copyTemplateFiles(
            this.config,
            [__dirname, '..', 'assets', 'template'],
            filesToCopy
        )
        if (this.config.monorepo) {
            await rename(
                path.join(this.config.cwd, '.github'),
                path.join(this.workspaceRoot, '.github')
            )
            await rename(
                path.join(this.config.cwd, 'README.md'),
                path.join(this.workspaceRoot, 'README.md')
            )
            if (this.config.pm === 'bun') {
                await rename(
                    path.join(this.config.cwd, 'bunfig.toml'),
                    path.join(this.workspaceRoot, 'bunfig.toml')
                )
            }
        }
        const oldGitIgnorePath = path.join(this.config.cwd, 'gitignore')
        const newGitIgnorePath = path.join(
            this.config.monorepo ? this.workspaceRoot : this.config.cwd,
            '.gitignore'
        )
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

        await execAsync(args, {
            cwd: this.config.monorepo ? this.workspaceRoot : this.config.cwd,
        })

        // Setup App.tsx
        const appPath = path.join(this.exampleDir, 'App.tsx')
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
        const packageJsonPath = path.join(this.exampleDir, 'package.json')
        const examplePackageJsonStr = await readFile(packageJsonPath, {
            encoding: 'utf8',
        })
        const exampleAppPackageJson = JSON.parse(examplePackageJsonStr)

        exampleAppPackageJson.name = `${this.config.finalPackageName}-example`

        exampleAppPackageJson.scripts = {
            ...exampleAppPackageJson.scripts,
            ios: 'react-native run-ios',
            start: 'react-native start --reset-cache',
            spm: 'react-native spm',
        }

        exampleAppPackageJson.dependencies = {
            ...exampleAppPackageJson.dependencies,
            ...(this.config.monorepo
                ? { [this.config.finalPackageName]: '*' }
                : {}),
            'nitro-core': templatePackageJson.devDependencies['nitro-core'],
            'react-native-nitro-modules':
                templatePackageJson.devDependencies[
                    'react-native-nitro-modules'
                ],
        }

        exampleAppPackageJson.devDependencies = {
            ...exampleAppPackageJson.devDependencies,
            'babel-plugin-module-resolver': '^5.0.2',
        }

        if (this.config.includeHarness) {
            const [
                reactNativeHarnessVersion,
                androidHarnessVersion,
                appleHarnessVersion,
            ] = await Promise.all([
                this.getLatestVersion('react-native-harness'),
                this.getLatestVersion('@react-native-harness/platform-android'),
                this.getLatestVersion('@react-native-harness/platform-apple'),
            ])

            exampleAppPackageJson.scripts = {
                ...exampleAppPackageJson.scripts,
                ...(this.config.platforms.includes(SupportedPlatform.IOS)
                    ? {
                          spm: 'node ./harness-spm/setup.mjs && react-native spm',
                      }
                    : {}),
                'test:harness': 'react-native-harness',
                ...(this.config.platforms.includes(SupportedPlatform.ANDROID)
                    ? {
                          'test:harness:android':
                              'react-native-harness --harnessRunner android',
                      }
                    : {}),
                ...(this.config.platforms.includes(SupportedPlatform.IOS)
                    ? {
                          'test:harness:ios':
                              'react-native-harness --harnessRunner ios',
                      }
                    : {}),
            }

            exampleAppPackageJson.devDependencies = {
                ...exampleAppPackageJson.devDependencies,
                'react-native-harness':
                    reactNativeHarnessVersion != null
                        ? `^${reactNativeHarnessVersion}`
                        : '^1.0.0',
                ...(this.config.platforms.includes(SupportedPlatform.ANDROID)
                    ? {
                          '@react-native-harness/platform-android':
                              androidHarnessVersion != null
                                  ? `^${androidHarnessVersion}`
                                  : '^1.0.0',
                      }
                    : {}),
                ...(this.config.platforms.includes(SupportedPlatform.IOS)
                    ? {
                          '@react-native-harness/platform-apple':
                              appleHarnessVersion != null
                                  ? `^${appleHarnessVersion}`
                                  : '^1.0.0',
                      }
                    : {}),
                '@react-native-harness/ui': HARNESS_UI_VERSION,
            }
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
        const packageRelativePath = this.packageRelativeFromExample
        const reactNativeConfigPath = path.join(
            this.exampleDir,
            'react-native.config.js'
        )

        const reactNativeConfig = exampleReactNativeConfig(packageRelativePath)

        // Setup metro.config.js
        const metroConfigPath = path.join(this.exampleDir, 'metro.config.js')

        // Setup babel.config.js
        const babelConfigPath = path.join(this.exampleDir, 'babel.config.js')

        // Setup tsconfig.json
        const tsConfigPath = path.join(this.exampleDir, 'tsconfig.json')

        const androidSettingsGradlePath = path.join(
            this.exampleDir,
            'android',
            'settings.gradle'
        )

        await writeFile(
            androidSettingsGradlePath,
            androidSettingsGradleCode(toPascalCase(this.config.packageName)),
            { encoding: 'utf8' }
        )

        const androidBuildGradlePath = path.join(
            this.exampleDir,
            'android',
            'app',
            'build.gradle'
        )

        const androidBuildGradle = await readFile(androidBuildGradlePath, {
            encoding: 'utf8',
        })

        const gradleReplacements: Record<string, string> = {
            '// reactNativeDir = file("../../node_modules/react-native")':
                'reactNativeDir = file("../../../node_modules/react-native")',
            '// codegenDir = file("../../node_modules/@react-native/codegen")':
                'codegenDir = file("../../../node_modules/@react-native/codegen")',
            '// cliFile = file("../../node_modules/react-native/cli.js")':
                'cliFile = file("../../../node_modules/react-native/cli.js")',
            '// hermesCommand = "$rootDir/my-custom-hermesc/bin/hermesc"':
                'hermesCommand = "$rootDir/../../node_modules/hermes-compiler/hermesc/%OS-BIN%/hermesc"',
        }

        const androidBuildGradleData = await replacePlaceholder({
            data: androidBuildGradle,
            replacements: gradleReplacements,
        })

        const filesToWrite = [
            { saveTo: reactNativeConfigPath, data: reactNativeConfig },
            { saveTo: metroConfigPath, data: metroConfig() },
            { saveTo: babelConfigPath, data: babelConfig(packageRelativePath) },
            {
                saveTo: tsConfigPath,
                data: exampleTsConfig(
                    this.config.finalPackageName,
                    packageRelativePath
                ),
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
            await rm(path.join(this.exampleDir, folder), {
                recursive: true,
                force: true,
            })
        }
    }

    private get exampleIOSProjectPath(): string {
        return path.join(
            this.exampleDir,
            'ios',
            `${toPascalCase(this.config.packageName)}Example.xcodeproj`,
            'project.pbxproj'
        )
    }

    private async configureExampleIOSDeploymentTarget(): Promise<void> {
        const project: string = await readFile(
            this.exampleIOSProjectPath,
            'utf8'
        )
        await writeFile(
            this.exampleIOSProjectPath,
            project.replaceAll(
                /IPHONEOS_DEPLOYMENT_TARGET = [\d.]+;/g,
                'IPHONEOS_DEPLOYMENT_TARGET = 16.0;'
            ),
            'utf8'
        )
    }

    private async getExampleIOSBundleId() {
        const projectFilePath = this.exampleIOSProjectPath
        const projectFileContent = await readFile(projectFilePath, {
            encoding: 'utf8',
        })
        const bundleIdMatch = projectFileContent.match(
            /PRODUCT_BUNDLE_IDENTIFIER = ([^;]+);/
        )

        if (bundleIdMatch == null) {
            throw new Error(
                `Failed to resolve iOS bundle identifier for React Native Harness from ${projectFilePath}`
            )
        }

        return bundleIdMatch[1].trim().replaceAll('"', '')
    }

    private async setupReactNativeHarness() {
        if (this.config.platforms.includes(SupportedPlatform.IOS)) {
            await cp(
                path.join(__dirname, '..', 'assets', 'harness-spm'),
                path.join(this.exampleDir, 'harness-spm'),
                { recursive: true }
            )
        }
        const exampleAppName = `${toPascalCase(this.config.packageName)}Example`
        const androidBundleId = this.config.platforms.includes(
            SupportedPlatform.ANDROID
        )
            ? `com.${replaceHyphen(this.config.packageName)}example`
            : null
        const iosBundleId = this.config.platforms.includes(
            SupportedPlatform.IOS
        )
            ? await this.getExampleIOSBundleId()
            : null
        const defaultRunner = this.config.platforms.includes(
            SupportedPlatform.ANDROID
        )
            ? SupportedPlatform.ANDROID
            : SupportedPlatform.IOS

        await createFolder(this.exampleDir, '__tests__')

        await Promise.all([
            writeFile(
                path.join(this.exampleDir, 'rn-harness.config.mjs'),
                harnessConfigCode({
                    androidBundleId,
                    appRegistryComponentName: exampleAppName,
                    defaultRunner,
                    entryPoint: './index.js',
                    iosBundleId,
                }),
                { encoding: 'utf8' }
            ),
            writeFile(
                path.join(this.exampleDir, 'jest.config.js'),
                harnessJestConfigCode(),
                { encoding: 'utf8' }
            ),
            writeFile(
                path.join(
                    this.exampleDir,
                    '__tests__',
                    `${this.config.packageName}.harness.tsx`
                ),
                harnessTestCode(
                    this.config.packageName,
                    this.config.finalPackageName,
                    `${this.config.funcName}`,
                    this.config.packageType
                ),
                { encoding: 'utf8' }
            ),
        ])
    }

    private async installDependenciesAndRunCodegen() {
        await execAsync(`${this.config.pm} install`, {
            cwd: this.config.monorepo ? this.workspaceRoot : this.config.cwd,
        })
        const packageManager =
            this.config.pm === 'npm' ? 'npx --yes' : this.config.pm
        const codegenCommand = `${packageManager} nitrogen --logLevel="debug" && ${this.config.pm} run build`
        await execAsync(codegenCommand, { cwd: this.config.cwd })
    }

    private async gitInit() {
        const gitCwd = this.config.monorepo
            ? this.workspaceRoot
            : this.config.cwd
        await execAsync('git init', { cwd: gitCwd })
        await execAsync('git add .', { cwd: gitCwd })
        await execAsync('git commit -m "initial commit"', {
            cwd: gitCwd,
        })
    }

    private async setupWorkflows() {
        const workflowRoot = this.config.monorepo
            ? this.workspaceRoot
            : this.config.cwd
        const iosBuildWorkflowPath = path.join(
            workflowRoot,
            '.github',
            'workflows',
            'ios-build.yml'
        )
        const androidBuildWorkflowPath = path.join(
            workflowRoot,
            '.github',
            'workflows',
            'android-build.yml'
        )

        const [iosBuildWorkflow, androidBuildWorkflow] = await Promise.all([
            readFile(iosBuildWorkflowPath, { encoding: 'utf8' }),
            readFile(androidBuildWorkflowPath, { encoding: 'utf8' }),
        ])

        const exampleAppName = `${toPascalCase(this.config.packageName)}Example`
        const iosBuildWorkflowContent = await replacePlaceholder({
            data: iosBuildWorkflow,
            replacements: {
                $$exampleApp$$: exampleAppName,
            },
        })

        await Promise.all([
            writeFile(
                iosBuildWorkflowPath,
                this.getWorkflowContent(iosBuildWorkflowContent),
                {
                    encoding: 'utf8',
                }
            ),
            writeFile(
                androidBuildWorkflowPath,
                this.getWorkflowContent(androidBuildWorkflow),
                {
                    encoding: 'utf8',
                }
            ),
        ])

        if (!this.config.includeHarness) {
            return
        }

        const workflowDirectoryPath = path.join(
            workflowRoot,
            '.github',
            'workflows'
        )

        const workflowWrites = this.config.platforms.map(platform =>
            writeFile(
                path.join(workflowDirectoryPath, `harness-${platform}.yml`),
                this.getWorkflowContent(
                    harnessWorkflowCode(
                        exampleAppName,
                        this.config.pm,
                        platform
                    )
                ),
                {
                    encoding: 'utf8',
                }
            )
        )

        await Promise.all(workflowWrites)
    }

    private getWorkflowContent(content: string): string {
        if (!this.config.monorepo) {
            return content
        }

        const packagePath = `packages/${this.config.finalPackageName}`
        const packagePathReplacements: Record<string, string> = {
            'cpp/**': `${packagePath}/cpp/**`,
            'android/**': `${packagePath}/android/**`,
            'apple/**': `${packagePath}/apple/**`,
            'src/**': `${packagePath}/src/**`,
            'nitrogen/**': `${packagePath}/nitrogen/**`,
            'nitrogen/generated/shared/**': `${packagePath}/nitrogen/generated/shared/**`,
            'nitrogen/generated/android/**': `${packagePath}/nitrogen/generated/android/**`,
            'nitrogen/generated/ios/**': `${packagePath}/nitrogen/generated/ios/**`,
            '*.podspec': `${packagePath}/*.podspec`,
            'Package.swift': `${packagePath}/Package.swift`,
            'package.json': `${packagePath}/package.json`,
            'react-native.config.js': `${packagePath}/react-native.config.js`,
            'nitro.json': `${packagePath}/nitro.json`,
        }

        return content
            .split('\n')
            .map(line => {
                const pathMatch = line.match(/^\s*-\s+'([^']+)'\s*$/)
                if (pathMatch == null) {
                    return line
                }

                const replacement = packagePathReplacements[pathMatch[1]]
                if (replacement == null) {
                    return line
                }

                return line.replace(pathMatch[1], replacement)
            })
            .join('\n')
    }
}
