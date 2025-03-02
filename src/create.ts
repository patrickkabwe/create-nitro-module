import { mkdirSync, rmSync } from 'fs'
import inquirer from 'inquirer'
import kleur from 'kleur'
import ora from 'ora'
import path from 'path'
import projectPackageJsonFile from '../package.json'
import { generateInstructions, SUPPORTED_PLATFORMS } from './constants'
import { NitroModuleFactory } from './generate-nitro-module'
import {
    CreateModuleOptions,
    ExampleType,
    Nitro,
    PLATFORM_LANGUAGE_MAP,
} from './types'
import { detectPackageManager, dirExist } from './utils'

export const createModule = async (
    name: string,
    options: CreateModuleOptions
) => {
    const spinner = ora()
    try {
        if (typeof name !== 'string') {
            name = ''
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

        const moduleFactory = new NitroModuleFactory({
            langs: answers.langs,
            moduleName: name,
            platforms: answers.platforms,
            pm: answers.pm,
            cwd: options.moduleDir || process.cwd(),
            spinner,
            moduleType: answers.moduleType,
            finalModuleName: 'react-native-' + name.toLowerCase(),
            skipInstall: options.skipInstall,
            skipExample: options.skipExample,
            exampleType: answers.exampleType,
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
                `Failed to create Nitro module: ${(error as Error).message}`
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
            if (input.trim().length < 1) {
                return kleur.red('⚠️  Module name cannot be empty')
            }
            return true
        },
    })

    const exampleType = await inquirer.prompt({
        type: 'list',
        message: kleur.cyan('What type of module would you like to create?'),
        name: 'name',
        choices: ['expo', 'cli', 'both'], // Thinking if i should have this?
        default: 'cli',
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
        exampleType:
            exampleType.name === 'expo' ? ExampleType.Expo : ExampleType.CLI,
    }
}
