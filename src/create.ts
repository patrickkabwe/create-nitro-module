import { mkdirSync, rmSync } from 'fs'
import inquirer from 'inquirer'
import kleur from 'kleur'
import ora from 'ora'
import path from 'path'
import projectPackageJsonFile from '../package.json'
import { generateInstructions, SUPPORTED_PLATFORMS } from './constants'
import { NitroModuleFactory } from './generate-nitro-module'
import { CreateModuleOptions, Nitro, PLATFORM_LANGUAGE_MAP } from './types'
import { detectPackageManager, dirExist, validateModuleName } from './utils'

export const createModule = async (
    name: string,
    options: CreateModuleOptions
) => {
    const spinner = ora()
    let moduleType = Nitro.Module
    try {
        if (typeof name !== 'string') {
            name = ''
        } else {
            const validationResult = validateModuleName(name)
            if (validationResult !== true) {
                throw new Error(`Invalid module name: ${validationResult}`)
            }
        }

        if (options.moduleDir) {
            const moduleDirExists = await dirExist(options.moduleDir)
            if (!moduleDirExists) {
                mkdirSync(options.moduleDir, { recursive: true })
            }
        }

        const usedPm = detectPackageManager()
        const answers = await getUserAnswers(name, usedPm)
        name = answers.moduleName
        answers.pm = usedPm || answers.pm
        moduleType = answers.moduleType

        const moduleFactory = new NitroModuleFactory({
            langs: answers.langs,
            moduleName: name,
            platforms: answers.platforms,
            pm: answers.pm,
            cwd: options.moduleDir || process.cwd(),
            spinner,
            moduleType,
            finalModuleName: 'react-native-' + name.toLowerCase(),
            skipInstall: options.skipInstall,
            skipExample: options.skipExample,
        })

        await moduleFactory.createNitroModule()

        console.log(
            generateInstructions({
                moduleName: `react-native-${name.toLowerCase()}`,
                pm: answers.pm,
                skipExample: options.skipExample,
                skipInstall: options.skipInstall,
            })
        )

        spinner.succeed(
            kleur.dim(
                `Create Nitro Module - ${projectPackageJsonFile.description}\n`
            )
        )
    } catch (error) {
        spinner.fail(
            kleur.red(
                `Failed to create Nitro ${moduleType}: ${(error as Error).message}`
            )
        )
        if (name) {
            const modulePath = path.join(
                process.cwd(),
                'react-native-' + name.toLowerCase()
            )
            rmSync(modulePath, { recursive: true, force: true })
        }
        process.exit(1)
    }
}

const getUserAnswers = async (name: string, usedPm?: string) => {
    const moduleName = await inquirer.prompt({
        type: 'input',
        message: kleur.cyan('📝 What is the name of your module?'),
        name: 'name',
        when: !name,
        default: 'awesome-library',
        validate: (input: string) => {
            const result = validateModuleName(input)
            if (result !== true) {
                return kleur.red(`⚠️  ${result}`)
            }
            return true
        },
    })

    const platforms = await inquirer.prompt({
        type: 'checkbox',
        message: kleur.cyan('🎯 Select target platforms:'),
        name: 'names',
        choices: SUPPORTED_PLATFORMS,
        validate: answers => {
            if (answers.length < 1) {
                return kleur.red('⚠️  You must choose at least one platform')
            }
            return true
        },
    })

    const availableLanguages = new Set<string>()
    platforms.names.forEach((platform: string) => {
        PLATFORM_LANGUAGE_MAP[platform].forEach(lang =>
            availableLanguages.add(lang)
        )
    })

    const langs = await inquirer.prompt({
        type: 'checkbox',
        message: kleur.cyan('💻 Select programming languages:'),
        name: 'names',
        choices: Array.from(availableLanguages),
        validate: choices => {
            if (choices.length < 1) {
                return kleur.red('⚠️  You must choose at least one language')
            }

            let answers: string[] = []

            for (let c of choices) {
                answers.push(c.value as string)
            }

            const hasCpp = answers.some(lang => lang === 'cpp')
            const hasNative = answers.some(
                lang => lang === 'swift' || lang === 'kotlin'
            )

            if (hasCpp && hasNative) {
                return kleur.red(
                    '⚠️  C++ cannot be selected along with Swift or Kotlin'
                )
            }

            if (!hasCpp) {
                for (const platform of platforms.names) {
                    const requiredNative =
                        platform === 'ios' ? 'swift' : 'kotlin'
                    if (!answers.includes(requiredNative)) {
                        return kleur.red(
                            `⚠️  When not using C++, you must select ${requiredNative} for ${platform}`
                        )
                    }
                }
            }

            return true
        },
    })

    const moduleType = await inquirer.prompt({
        type: 'list',
        message: kleur.cyan('📦 Select module type:'),
        name: 'name',
        choices: ['Nitro Module', 'Nitro View'],
        default: 'Nitro Module',
        when: !langs.names.includes('cpp'),
    })

    const pm = await inquirer.prompt({
        type: 'list',
        message: kleur.cyan('📦 Select package manager:'),
        name: 'name',
        choices: ['bun', 'yarn', 'npm'],
        default: usedPm || 'yarn',
        when: usedPm === undefined,
    })

    const packageName = await inquirer.prompt({
        type: 'confirm',
        message: kleur.cyan(
            `✨ Your package name will be called: "${kleur.green('react-native-' + (moduleName.name || name).toLowerCase())}" would you like to continue?`
        ),
        name: 'name',
        choices: ['y', 'n'],
        default: true,
    })

    if (!packageName.name) {
        process.exit(0)
    }

    return {
        moduleName: moduleName.name || name,
        platforms: platforms.names,
        langs: langs.names.includes('cpp') ? ['c++'] : langs.names,
        pm: pm.name,
        moduleType:
            moduleType.name === 'Nitro View' ? Nitro.View : Nitro.Module,
    }
}
