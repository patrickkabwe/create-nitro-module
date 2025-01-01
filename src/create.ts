import { rmSync } from 'fs'
import inquirer from 'inquirer'
import kleur from 'kleur'
import ora from 'ora'
import path from 'path'
import projectPackageJsonFile from '../package.json'
import { nosIcon, SUPPORTED_PLATFORMS } from './constants'
import { NitroModuleFactory } from './generate-nitro-module'
import {
    CreateModuleOptions,
    NitroModuleType,
    PLATFORM_LANGUAGE_MAP,
} from './types'
import { dirExist } from './utils'

export const createModule = async (
    name: string,
    options: CreateModuleOptions
) => {
    const spinner = ora().start()
    try {
        if (typeof name !== 'string') {
            name = ''
        }

        if (options.moduleDir) {
            const moduleDirExists = await dirExist(options.moduleDir)
            if (!moduleDirExists) {
                throw new Error(
                    `Module directory does not exist: ${options.moduleDir}`
                )
            }
        }

        const answers = await getUserAnswers(name)
        name = answers.moduleName

        const moduleFactory = new NitroModuleFactory({
            langs: answers.langs,
            moduleName: name,
            platforms: answers.platforms,
            pm: answers.pm,
            cwd: options.moduleDir || process.cwd(),
            spinner,
            moduleType: NitroModuleType.HybridObject,
            finalModuleName: 'react-native-' + name.toLowerCase(),
        })

        await moduleFactory.createNitroModule()

        console.log(nosIcon(`react-native-${name.toLowerCase()}`, answers.pm))
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

const getUserAnswers = async (name: string) => {
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

    const pm = await inquirer.prompt({
        type: 'list',
        message: kleur.cyan('📦 Select package manager:'),
        name: 'name',
        choices: ['bun', 'yarn', 'pnpm', 'npm'],
        default: 'bun',
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
    }
}
