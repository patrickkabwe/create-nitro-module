import * as p from '@clack/prompts'
import { mkdirSync, rmSync } from 'fs'
import kleur from 'kleur'
import path from 'path'
import projectPackageJsonFile from '../../package.json'
import { generateInstructions } from '../constants'
import { NitroModuleFactory } from '../generate-nitro-module'
import {
    CreateModuleOptions,
    Nitro,
    PackageManager,
    PLATFORM_LANGUAGE_MAP,
    SupportedLang,
    SupportedPlatform,
} from '../types'
import { detectPackageManager, dirExist, validateModuleName } from '../utils'

export const createModule = async (
    name: string,
    options: CreateModuleOptions
) => {
    let moduleType = Nitro.Module
    const spinner = p.spinner()
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
        moduleType = answers.moduleType

        const moduleFactory = new NitroModuleFactory({
            langs: answers.langs,
            moduleName: name,
            platforms: answers.platforms,
            pm: answers.pm,
            cwd: options.moduleDir || process.cwd(),
            spinner: p.spinner(),
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

        spinner.start(
            kleur.dim(
                `Create Nitro Module - ${projectPackageJsonFile.description}\n`
            )
        )
    } catch (error) {
        spinner.stop()
        console.log(
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

const getUserAnswers = async (name: string, usedPm?: PackageManager) => {
    // const moduleName = await inquirer.prompt({
    //     type: 'input',
    //     message: kleur.cyan('📝 What is the name of your module?'),
    //     name: 'name',
    //     when: !name,
    //     default: 'awesome-library',
    //     validate: (input: string) => {
    //         const result = validateModuleName(input)
    //         if (result !== true) {
    //             return kleur.red(`⚠️  ${result}`)
    //         }
    //         return true
    //     },
    // })

    // const platforms = await inquirer.prompt({
    //     type: 'checkbox',
    //     message: kleur.cyan('🎯 Select target platforms:'),
    //     name: 'names',
    //     choices: SUPPORTED_PLATFORMS,
    //     validate: answers => {
    //         if (answers.length < 1) {
    //             return kleur.red('⚠️  You must choose at least one platform')
    //         }
    //         return true
    //     },
    // })

    // const availableLanguages = new Set<string>()
    // platforms.names.forEach((platform: string) => {
    //     PLATFORM_LANGUAGE_MAP[platform].forEach(lang =>
    //         availableLanguages.add(lang)
    //     )
    // })

    // const langs = await inquirer.prompt({
    //     type: 'checkbox',
    //     message: kleur.cyan('💻 Select programming languages:'),
    //     name: 'names',
    //     choices: Array.from(availableLanguages),
    //     validate: choices => {
    //         if (choices.length < 1) {
    //             return kleur.red('⚠️  You must choose at least one language')
    //         }

    //         let answers: string[] = []

    //         for (let c of choices) {
    //             answers.push(c.value as string)
    //         }

    //         const hasCpp = answers.some(lang => lang === 'cpp')
    //         const hasNative = answers.some(
    //             lang => lang === 'swift' || lang === 'kotlin'
    //         )

    //         if (hasCpp && hasNative) {
    //             return kleur.red(
    //                 '⚠️  C++ cannot be selected along with Swift or Kotlin'
    //             )
    //         }

    //         if (!hasCpp) {
    //             for (const platform of platforms.names) {
    //                 const requiredNative =
    //                     platform === 'ios' ? 'swift' : 'kotlin'
    //                 if (!answers.includes(requiredNative)) {
    //                     return kleur.red(
    //                         `⚠️  When not using C++, you must select ${requiredNative} for ${platform}`
    //                     )
    //                 }
    //             }
    //         }

    //         return true
    //     },
    // })

    // const moduleType = await inquirer.prompt({
    //     type: 'list',
    //     message: kleur.cyan('📦 Select module type:'),
    //     name: 'name',
    //     choices: ['Nitro Module', 'Nitro View'],
    //     default: 'Nitro Module',
    //     when: !langs.names.includes('cpp'),
    // })

    // const pm = await inquirer.prompt({
    //     type: 'list',
    //     message: kleur.cyan('📦 Select package manager:'),
    //     name: 'name',
    //     choices: ['bun', 'yarn', 'npm'],
    //     default: usedPm || 'yarn',
    //     when: usedPm === undefined,
    // })

    // const packageName = await inquirer.prompt({
    //     type: 'confirm',
    //     message: kleur.cyan(
    //         `✨ Your package name will be called: "${kleur.green('react-native-' + (moduleName.name || name).toLowerCase())}" would you like to continue?`
    //     ),
    //     name: 'name',
    //     choices: ['y', 'n'],
    //     default: true,
    // })

    // if (!packageName.name) {
    //     process.exit(0)
    // }

    const group = await p.group(
        {
            moduleName: () =>
                p.text({
                    message: kleur.cyan('📝 What is the name of your module?'),
                    defaultValue: name,
                    initialValue: name,
                    validate(value) {
                        if (value.length === 0) {
                            return 'Module name is required'
                        }
                        return ''
                    },
                }),
            platforms: () =>
                p.multiselect({
                    message: kleur.cyan('🎯 Select target platforms:'),
                    options: [
                        {
                            label: 'iOS',
                            value: 'ios',
                            hint: 'Swift, C++',
                        },
                        {
                            label: 'Android',
                            value: 'android',
                            hint: 'Kotlin, C++',
                        },
                    ],
                    initialValues: ['ios', 'android'],
                    required: true,
                }),
            moduleType: () =>
                p.select({
                    message: kleur.cyan('📦 Select module type:'),
                    options: [
                        {
                            label: 'Nitro Module',
                            value: Nitro.Module,
                        },
                        {
                            label: 'Nitro View',
                            value: Nitro.View,
                        },
                    ],
                    initialValue: Nitro.Module,
                }),
            langs: async ({ results }) => {
                const availableLanguages = new Set<string>()
                results.platforms?.forEach((platform: string) => {
                    PLATFORM_LANGUAGE_MAP[platform].forEach(lang =>
                        availableLanguages.add(lang)
                    )
                })
                const langs = Array.from(availableLanguages)
                const hasCpp = langs.some(lang => lang === 'cpp')
                const hasNative = langs.some(
                    lang => lang === 'swift' || lang === 'kotlin'
                )

                if (hasCpp && hasNative) {
                    return kleur.red(
                        '⚠️  C++ cannot be selected along with Swift or Kotlin'
                    )
                }

                if (!hasCpp) {
                    for (const platform of results.platforms || []) {
                        const requiredNative =
                            platform === 'ios' ? 'swift' : 'kotlin'
                        if (!langs.includes(requiredNative)) {
                            return kleur.red(
                                `⚠️  When not using C++, you must select ${requiredNative} for ${platform}`
                            )
                        }
                    }
                }

                return p.multiselect({
                    message: kleur.cyan('💻 Select programming languages:'),
                    options: langs.map(lang => ({
                        label: lang.charAt(0).toUpperCase() + lang.slice(1),
                        value: lang,
                    })),
                    required: true,
                })
            },
            pm: () =>
                p.select({
                    message: kleur.cyan('📦 Select package manager:'),
                    options: [
                        {
                            label: 'bun',
                            value: 'bun',
                        },
                        {
                            label: 'yarn',
                            value: 'yarn',
                        },
                        {
                            label: 'npm',
                            value: 'npm',
                        },
                    ],
                    initialValue: usedPm || 'yarn',
                }),
        },
        {
            onCancel(opts) {
                console.log('Cancelled')
                process.exit(0)
            },
        }
    )

    const packageName = await p.confirm({
        message: kleur.cyan(
            `✨ Your package name will be called: "${kleur.green('react-native-' + (group.moduleName || name).toLowerCase())}" would you like to continue?`
        ),
    })

    if (!packageName) {
        process.exit(0)
    }

    return {
        moduleName: group.moduleName,
        platforms: group.platforms as SupportedPlatform[],
        langs: group.langs as SupportedLang[],
        pm: group.pm,
        moduleType: group.moduleType,
    }
}
