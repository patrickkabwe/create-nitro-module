import kleur from 'kleur'
import { exec } from 'node:child_process'
import {
  access,
  copyFile,
  mkdir,
  readFile,
  rm,
  stat,
  writeFile
} from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import util from 'node:util'
import nitroJsonFile from '../assets/nitro-temp.json'
import packageJsonFile from '../assets/package.json'
import tsconfigFile from '../assets/tsconfig.json'
import workspacePackageJsonFile from '../assets/workspace-package.json'
import projectPackageJsonFile from '../package.json'
import { androidManifestCode, androidSettingsGradleCode, getKotlinCode } from './code.android.js'
import { getSwiftCode } from './code.ios.js'
import { appExampleCode, exportCode, metroConfig, specCode } from './code.js.js'
import {
  ANDROID_CXX_LIB_NAME_TAG,
  ANDROID_NAME_SPACE_TAG,
  CXX_NAME_SPACE_TAG,
  IOS_MODULE_NAME_TAG,
  JS_PACKAGE_NAME_TAG,
  messages,
  nosIcon
} from './constants.js'
import { NitroSpinner } from './nitro-spinner.js'
import {
  dirExist,
  generateAutolinking,
  getGitUserInfo,
  mapPlatformToLanguage,
  replaceHyphen,
  replaceTag,
  toPascalCase,
} from './utils.js'

const execAsync = util.promisify(exec)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export enum SupportedLang {
  SWIFT = 'swift',
  KOTLIN = 'kotlin',
  CPP = 'c++',
}

export enum SupportedPlatform {
  IOS = 'ios',
  ANDROID = 'android',
}

type PackageManager = 'bun' | 'pnpm' | 'yarn' | 'npm'

type Generate = {
  pm: PackageManager
  moduleName: string
  moduleDir?: string
  skipExample?: boolean
  langs: SupportedLang[]
  platforms: SupportedPlatform[]
}

type PlatformLang = {
  langs: SupportedLang[]
  platforms: SupportedPlatform[]
}

export class FileGenerator {
  private tmpDir = ''
  private cwd = process.cwd()
  private packagePrefix = 'react-native-' as const
  private funcName = 'sum' as const
  private finalModuleName = ''
  private moduleName = ''
  private androidPackageName = ''
  private spinner: NitroSpinner

  constructor(spinner: NitroSpinner) {
    this.spinner = spinner
  }

  public async generate({ moduleName, langs, platforms, pm, moduleDir, skipExample }: Generate) {
    this.tmpDir = `/tmp/${moduleName}`
    this.moduleName = moduleName
    this.finalModuleName = `${this.packagePrefix}${moduleName}`.toLowerCase()
    this.androidPackageName = `com.${replaceHyphen(this.moduleName)}`

    if (moduleDir) {
      this.cwd = `${this.cwd}/${moduleDir}`
    } else {
      this.cwd = `${this.cwd}/${this.finalModuleName}`
    }

    this.spinner.start(kleur.yellow(messages.creating))
    await this.generateFolder()
    await this.cloneNitroTemplate()
    await this.copyFiles()
    await this.generateNitroJson({ platforms, langs })

    if (langs.includes(SupportedLang.SWIFT) || langs.includes(SupportedLang.CPP)) {
      await this.generatePodJson()
      await this.generateIOSBridgeFile(langs.includes(SupportedLang.SWIFT))
    }
    if (langs.includes(SupportedLang.KOTLIN) || langs.includes(SupportedLang.CPP)) {
      await this.generateAndroidFiles()
    }

    await this.generatePackageJsonFile(skipExample)
    await this.generateJSFiles({ platforms, langs })
    await this.createCustomAndroidPackageNameWorkaround()
    this.spinner.succeed(kleur.green(messages.creating))

    if (skipExample) {
      this.spinner.succeed(kleur.green(messages.success))
      console.log(nosIcon(this.finalModuleName, pm))
      console.log(
        kleur.dim(`Create Nitro Module - ${projectPackageJsonFile.description}\n`)
      )
      return
    }

    this.spinner.update(kleur.yellow(messages.generating))
    await this.cloneNitroExample(pm)
    this.spinner.succeed(kleur.green(messages.generating))

    this.spinner.update(kleur.yellow(messages.installing))
    await this.prepare(pm ?? 'bun')
    this.spinner.succeed(kleur.green(messages.installing))

    await rm(`${this.tmpDir}`, { recursive: true, force: true })
    this.spinner.succeed(kleur.green(messages.success))
    console.log(nosIcon(this.finalModuleName, pm))

    console.log(
      kleur.dim(`Create Nitro Module - ${projectPackageJsonFile.description}\n`)
    )
  }

  private async cloneNitroTemplate() {
    const nitroFolder = '/tmp/nitro'
    const exists = await dirExist(nitroFolder)
    await rm(this.tmpDir, { recursive: true, force: true })
    const cloneCmd = `git clone --depth 1 https://github.com/mrousavy/nitro ${nitroFolder}`
    if (exists) {
      const fileStats = await stat(nitroFolder)
      const shouldClone = fileStats.mtimeMs < Date.now() - 1000 * 60 * 60 * 24
      if (shouldClone) {
        await rm(nitroFolder, { recursive: true, force: true })
        await execAsync(cloneCmd)
      }
    } else {
      await execAsync(cloneCmd)
    }
  }

  private async copyFiles() {
    await execAsync(`cp -R /tmp/nitro/packages/template ${this.tmpDir}`)

    const filesToCopy = ['babel.config.js', '.watchmanconfig', '.gitignore']
    for (const file of filesToCopy) {
      await copyFile(
        path.join(this.tmpDir, file),
        path.join(this.cwd, this.finalModuleName, file)
      )
    }
  }

  private async generateNitroJson({ langs }: PlatformLang) {
    const replacements = {
      [ANDROID_NAME_SPACE_TAG]: replaceHyphen(this.moduleName),
      [CXX_NAME_SPACE_TAG]: replaceHyphen(this.moduleName),
      [IOS_MODULE_NAME_TAG]: toPascalCase(this.moduleName),
      [ANDROID_CXX_LIB_NAME_TAG]: toPascalCase(this.moduleName),
    }
    nitroJsonFile.autolinking = generateAutolinking(
      toPascalCase(this.moduleName),
      langs
    )
    await this.generateModuleFile(
      'nitro.json',
      await this.replacePlaceholder({
        replacements,
        data: JSON.stringify(nitroJsonFile, null, 2),
      })
    )
  }

  private async generatePodJson() {
    const podspecFilePath = path.join(
      this.tmpDir,
      `${IOS_MODULE_NAME_TAG}.podspec`
    )
    const { name } = getGitUserInfo()
    const replacements = {
      [IOS_MODULE_NAME_TAG]: toPascalCase(this.moduleName),
      'mrousavy/nitro':
        `${name.replaceAll(' ', '')}/${this.finalModuleName}`.toLowerCase(),
    }

    await this.generateModuleFile(
      `${toPascalCase(this.moduleName)}.podspec`,
      await this.replacePlaceholder({
        filePath: podspecFilePath,
        replacements,
      })
    )
  }

  private async generateIOSBridgeFile(generateSwiftFile: boolean) {
    await this.generateFolder('ios')
    const { name } = getGitUserInfo()

    const bridgeFilePath = path.join(this.tmpDir, 'ios', 'Bridge.h')

    const replacements = {
      [IOS_MODULE_NAME_TAG]: this.moduleName,
      'Created by Marc Rousavy on 22.07.24.': `Created by ${name} on ${new Date().toLocaleDateString()}`, //TODO: user regex
    }

    await this.generateModuleFile(
      'ios/Bridge.h',
      await this.replacePlaceholder({
        filePath: bridgeFilePath,
        replacements,
      })
    )
    if (generateSwiftFile) {
      await this.generateModuleFile(
        `ios/${toPascalCase(this.moduleName)}.swift`,
        getSwiftCode(this.moduleName, this.funcName)
      )
    }

  }

  private async generateAndroidFiles() {
    await this.generateFolder('android/src/main/cpp')
    await this.generateFolder(
      `android/src/main/java/com/${replaceHyphen(this.moduleName)}`
    )

    await this.generateModuleFile(
      `android/src/main/AndroidManifest.xml`,
      androidManifestCode
    )
    await this.generateModuleFile(
      `android/src/main/java/${this.androidPackageName
        .split('.')
        .join('/')}/${toPascalCase(this.moduleName)}.kt`,
      getKotlinCode(this.moduleName, this.androidPackageName, this.funcName)
    )
    await this.generateGradleFile()
    await this.generateCMakeFile()
    await this.generateCPPFile()
    await this.generatePackageFile()
  }

  private async generateGradleFile() {
    const gradleFile = 'build.gradle'
    const gradlePropertiesFile = 'gradle.properties'
    const prefixPath = 'android'
    const gradleFilePath = path.join(this.tmpDir, prefixPath, gradleFile)
    const gradlePropertiesFilePath = path.join(
      this.tmpDir,
      prefixPath,
      gradlePropertiesFile
    )

    const replacements = {
      [`com.margelo.nitro.${ANDROID_NAME_SPACE_TAG}`]: this.androidPackageName,
      [ANDROID_CXX_LIB_NAME_TAG]: toPascalCase(this.moduleName),
    }

    await this.generateModuleFile(
      `${prefixPath}/${gradleFile}`,
      await this.replacePlaceholder({
        filePath: gradleFilePath,
        replacements,
      })
    )
    await this.generateModuleFile(
      `${prefixPath}/${gradlePropertiesFile}`,
      await this.replacePlaceholder({
        filePath: gradlePropertiesFilePath,
        replacements,
      })
    )
  }

  private async generateCMakeFile() {
    const cmakeListFile = 'CMakeLists.txt'
    const prefixPath = 'android'
    const cmakeListFilePath = path.join(this.tmpDir, prefixPath, cmakeListFile)
    const replacements = {
      [ANDROID_CXX_LIB_NAME_TAG]: toPascalCase(this.moduleName),
    }
    await this.generateModuleFile(
      `${prefixPath}/${cmakeListFile}`,
      await this.replacePlaceholder({
        filePath: cmakeListFilePath,
        replacements,
      })
    )
  }

  private async generateCPPFile() {
    const cppAdapterFile = 'cpp-adapter.cpp'
    const prefixPath = 'android/src/main/cpp'
    const cppAdapterFilePath = path.join(
      this.tmpDir,
      prefixPath,
      cppAdapterFile
    )

    const replacements = {
      [ANDROID_CXX_LIB_NAME_TAG]: toPascalCase(this.moduleName),
      [ANDROID_NAME_SPACE_TAG]: replaceHyphen(this.moduleName),
    }

    await this.generateModuleFile(
      `${prefixPath}/${cppAdapterFile}`,
      await this.replacePlaceholder({
        filePath: cppAdapterFilePath,
        replacements,
      })
    )
  }

  private async generatePackageFile() {
    const androidPackageFile = `${toPascalCase(this.moduleName)}Package.java`
    const prefixPath = `android/src/main/java`
    const androidPackageFilePath = path.join(
      this.tmpDir,
      prefixPath + `/com/margelo/nitro/${ANDROID_NAME_SPACE_TAG}`,
      `${ANDROID_CXX_LIB_NAME_TAG}Package.java`
    )

    const replacements = {
      [`com.margelo.nitro.${ANDROID_NAME_SPACE_TAG}`]: this.androidPackageName,
      [`${ANDROID_CXX_LIB_NAME_TAG}Package`]: androidPackageFile.split('.')[0],
      [ANDROID_CXX_LIB_NAME_TAG]: toPascalCase(this.moduleName),
    }

    await this.generateModuleFile(
      `${prefixPath}/${this.androidPackageName
        .split('.')
        .join('/')}/${androidPackageFile}`,
      await this.replacePlaceholder({
        filePath: androidPackageFilePath,
        replacements,
      })
    )
  }

  private async generatePackageJsonFile(skipExample?: boolean) {
    const { name } = getGitUserInfo()
    const userName = name.replaceAll(' ', '').toLowerCase()

    const packageJsonFilePath = path.join(
      this.cwd + `/${this.finalModuleName}`,
      'package.json'
    )
    packageJsonFile.name = this.finalModuleName
    packageJsonFile.author = name
    packageJsonFile.repository = `https://github.com/${userName}/${this.finalModuleName}.git`
    packageJsonFile.bugs = `https://github.com/${userName}/${this.finalModuleName}/issues`
    packageJsonFile.homepage = `https://github.com/${userName}/${this.finalModuleName}#readme`

    // Workspace package json
    if (!skipExample) {
      const workspacePackageJsonFilePath = path.join(this.cwd, 'package.json')
      workspacePackageJsonFile.name = this.finalModuleName
      workspacePackageJsonFile.repository = `https://github.com/${userName}/${this.finalModuleName}.git`
      workspacePackageJsonFile.author = name
      workspacePackageJsonFile.workspaces = [
        this.finalModuleName.toLowerCase(),
        'example',
      ]
      await writeFile(
        workspacePackageJsonFilePath,
        JSON.stringify(workspacePackageJsonFile, null, 2),
        { encoding: 'utf8' }
      )
    }


    // tsconfig
    const tsconfigFilePath = path.join(
      this.cwd + `/${this.finalModuleName}`,
      'tsconfig.json'
    )

    await writeFile(
      packageJsonFilePath,
      JSON.stringify(packageJsonFile, null, 2),
      { encoding: 'utf8' }
    )

    await writeFile(tsconfigFilePath, JSON.stringify(tsconfigFile, null, 2), {
      encoding: 'utf8',
    })
  }

  private async generateJSFiles({ platforms, langs }: PlatformLang) {
    const platformToLangMap = mapPlatformToLanguage(platforms, langs)

    const platformLang = Object.entries(platformToLangMap)
      .map(([platform, lang]) => `${platform}: '${lang.toLowerCase()}'`)
      .join(', ')

    await this.generateFolder('src/specs')
    await this.generateModuleFile(
      `/src/specs/${this.moduleName}.nitro.ts`,
      specCode(this.moduleName, platformLang, this.funcName)
    )
    await this.generateModuleFile('/src/index.ts', exportCode(this.moduleName))
  }

  private async cloneNitroExample(pm: PackageManager) {
    const exists = await dirExist('./example')

    if (!exists) {
      await rm(`${this.tmpDir}`, { recursive: true, force: true })
      const packageManager = pm === 'bun' ? 'bunx' : 'npx'
      await execAsync(
        `${packageManager} -y @react-native-community/cli@latest init ${toPascalCase(this.moduleName)}Example --directory ${this.cwd}/example --skip-install`
      )
    }
    await rm(path.join(this.cwd, 'example/.git'), {
      recursive: true,
      force: true,
    })

    const packageJsonPath = path.join(this.cwd, 'example/package.json')
    const packageJsonStr = await readFile(packageJsonPath, {
      encoding: 'utf8',
    })
    const packageJson = JSON.parse(packageJsonStr)
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

    await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2), {
      encoding: 'utf8',
    })

    const reactNativeConfigPath = path.join(
      this.cwd,
      'example/react-native.config.js'
    )

    const replacements = {
      [JS_PACKAGE_NAME_TAG]: this.finalModuleName,
    }

    const reactNativeConfig = await this.replacePlaceholder({
      filePath: path.join(__dirname, '..', 'assets', 'react-native.config.js'),
      replacements,
    })

    await writeFile(reactNativeConfigPath, reactNativeConfig, {
      encoding: 'utf8',
    })

    const appPath = path.join(this.cwd, 'example/App.tsx')
    await writeFile(
      appPath,
      appExampleCode(this.moduleName, this.packagePrefix, this.funcName),
      { encoding: 'utf8' }
    )

    const metroConfigPath = path.join(this.cwd, 'example/metro.config.js')

    await writeFile(
      metroConfigPath,
      metroConfig,
      { encoding: 'utf8' }
    )

    const androidSettingsGradlePath = path.join(
      this.cwd,
      'example/android/settings.gradle'
    )

    await writeFile(
      androidSettingsGradlePath,
      androidSettingsGradleCode(toPascalCase(this.moduleName)),
      { encoding: 'utf8' }
    )

    const androidBuildGradlePath = path.join(
      this.cwd,
      'example/android/app/build.gradle'
    )

    const androidBuildGradle = await readFile(androidBuildGradlePath, {
      encoding: 'utf8',
    })

    const gradleReplacements = {
      '// reactNativeDir = file("../../node_modules/react-native")': 'reactNativeDir = file("../../../node_modules/react-native")',
      '// codegenDir = file("../../node_modules/@react-native/codegen")': 'codegenDir = file("../../../node_modules/@react-native/codegen")',
      '// cliFile = file("../../node_modules/react-native/cli.js")': 'cliFile = file("../../../node_modules/react-native/cli.js")',
      '// hermesCommand = "$rootDir/my-custom-hermesc/bin/hermesc"': 'hermesCommand = "$rootDir/../../node_modules/react-native/sdks/hermesc/%OS-BIN%/hermesc"',
    }

    const toWrite = await this.replacePlaceholder({
      data: androidBuildGradle,
      replacements: gradleReplacements,
    })

    await writeFile(androidBuildGradlePath, toWrite, { encoding: 'utf8' })
  }

  private async prepare(pm: PackageManager) {
    await execAsync(`cd ${this.cwd}/${this.finalModuleName}; rm -rf nitrogen; ${pm} install`)
    await execAsync(
      `cd ${this.cwd}/${this.finalModuleName}; ${pm} codegen; cd ..`
    )
    await execAsync(`cd ${this.cwd}/example;`)
    // Android custom package workaround
    // AwesomeLibraryOnLoad.cpp
    // tmp/tem/awesome-library/nitrogen/generated/android/AwesomeLibraryOnLoad.cpp
    const androidOnLoadFile = path.join(
      this.cwd,
      this.finalModuleName,
      'nitrogen/generated/android',
      `${toPascalCase(this.moduleName)}OnLoad.cpp`
    )

    try {
      await access(androidOnLoadFile)
    } catch {
      return
    }

    const str = await readFile(androidOnLoadFile, { encoding: 'utf8' })
    await writeFile(androidOnLoadFile, str.replace('margelo/nitro/', ''))
  }

  async generateJSTemplateFile({ platforms, langs }: PlatformLang) {
    const platformToLangMap = mapPlatformToLanguage(platforms, langs)

    const platformLang = Object.entries(platformToLangMap)
      .map(([platform, lang]) => `${platform}: '${lang}'`)
      .join(', ')

    const specCode = `
import { type HybridObject } from 'react-native-nitro-modules'

export interface ${toPascalCase(
      this.moduleName
    )} extends HybridObject<{ ${platformLang} }> { }
  `

    await this.generateFolder('/src/specs')
    await this.generateModuleFile(
      `/src/specs/${this.moduleName}.nitro.ts`,
      specCode
    )
  }

  private async generateFolder(dir?: string) {
    await mkdir(
      path.join(this.cwd, `${this.finalModuleName}/${dir ?? ''}`),
      { recursive: true }
    )
  }

  private async generateModuleFile(fileName: string, data: string) {
    const filePath = path.join(this.cwd, this.finalModuleName, fileName)
    await writeFile(filePath, data, { encoding: 'utf8' })
  }

  private async replacePlaceholder({
    filePath,
    replacements,
    data,
  }: {
    filePath?: string
    replacements: Record<string, string>
    data?: string
  }) {
    let fileContent
    if (data) {
      fileContent = data
    } else if (filePath) {
      fileContent = await readFile(filePath, { encoding: 'utf8' })
    } else {
      throw new Error(
        'Error generate files. make sure you are passing data or filePath'
      )
    }

    return Object.entries(replacements).reduce(
      (acc, [tag, value]) => replaceTag(tag, acc, value),
      fileContent
    )
  }

  async createCustomAndroidPackageNameWorkaround() {
    const code = `/**
 * @file This script is auto-generated by create-nitro-module and should not be edited.
 *
 * @description This script applies a workaround for Android by modifying the '<ModuleName>OnLoad.cpp' file.
 * It reads the file content and removes the 'margelo/nitro/' string from it. This enables support for custom package names.
 *
 * @module create-nitro-module
 */
const path = require('node:path')
const { writeFile, readFile } = require('node:fs/promises')

const androidWorkaround = async () => {
  const androidOnLoadFile = path.join(
    process.cwd(),
    'nitrogen/generated/android',
    '${toPascalCase(this.moduleName)}OnLoad.cpp'
  )

  const str = await readFile(androidOnLoadFile, { encoding: 'utf8' })
  await writeFile(androidOnLoadFile, str.replace('margelo/nitro/', ''))
}
androidWorkaround()
`
    const androidWorkaroundPath = path.join(
      this.cwd,
      this.finalModuleName,
      'post-script.js',
    )

    await writeFile(androidWorkaroundPath, code)
  }
}
