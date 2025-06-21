import * as p from '@clack/prompts'
import { mkdirSync, rmSync } from 'fs'
import kleur from 'kleur'
import path from 'path'
import projectPackageJsonFile from '../../package.json'
import { generateInstructions, messages } from '../constants'
import { NitroModuleFactory } from '../generate-nitro-package'
import {
    CreateModuleOptions,
    Nitro,
    PackageManager,
    PLATFORM_LANGUAGE_MAP,
    SupportedLang,
    SupportedPlatform,
    UserAnswers,
} from '../types'
import {
    capitalize,
    detectPackageManager,
    dirExist,
    validatePackageName,
} from '../utils'

export const createModule = async (
    packageName: string,
    options: CreateModuleOptions
) => {
    let packageType = Nitro.Module
    let moduleFactory: NitroModuleFactory | null = null
    const spinner = p.spinner()
    try {
        if (options.moduleDir) {
            const moduleDirExists = await dirExist(options.moduleDir)
            if (!moduleDirExists) {
                mkdirSync(options.moduleDir, { recursive: true })
            }
        }

        const usedPm = detectPackageManager()
        const answers = await getUserAnswers(packageName, usedPm, options.ci)
        packageName = answers.packageName
        packageType = answers.packageType

        moduleFactory = new NitroModuleFactory({
            description: answers.description,
            langs: answers.langs,
            packageName,
            platforms: answers.platforms,
            pm: answers.pm,
            cwd: options.moduleDir || process.cwd(),
            spinner,
            packageType,
            finalPackageName: 'react-native-' + packageName.toLowerCase(),
            skipInstall: options.skipInstall,
            skipExample: options.skipExample,
        })


        const modulePath = path.join(
            process.cwd(),
            'react-native-' + packageName.toLowerCase()
        )
        const dirExists = await dirExist(modulePath)

        if (dirExists) {
            const confirm = await p.confirm({
                message:
                    'Looks like the directory with the same name already exists.' +
                    ' Would you like to overwrite the existing directory? (yes/no)' +
                    kleur.yellow(
                        ' This will delete the existing directory and all its contents.'
                    ),
                initialValue: true,
                active: 'yes',
                inactive: 'no',
            })
            if (p.isCancel(confirm)) {
                process.exit(1)
            } else if (confirm) {
                rmSync(modulePath, { recursive: true, force: true })
            } else {
                console.log(kleur.red('Cancelled'))
                process.exit(1)
            }
        }

        spinner.start(
            messages.creating.replace('{packageType}', capitalize(packageType))
        )

        await moduleFactory.createNitroModule()

        console.log(
            generateInstructions({
                moduleName: `react-native-${packageName.toLowerCase()}`,
                pm: answers.pm,
                skipExample: options.skipExample,
                skipInstall: options.skipInstall,
            })
        )

        spinner.stop(
            kleur.dim(
                `Create Nitro Module - ${projectPackageJsonFile.description}\n`
            )
        )
    } catch (error) {
        if (packageName) {
            const modulePath = path.join(
                process.cwd(),
                'react-native-' + packageName.toLowerCase()
            )
            rmSync(modulePath, { recursive: true, force: true })
        }
        spinner.stop(
            kleur.red(
                `Failed to create Nitro ${packageType}: ${(error as Error).message}`
            ),
            1
        )
    }
}

const selectLanguages = async (
    platforms: SupportedPlatform[],
    packageType: Nitro
) => {
    const availableLanguages = Array.from(
        new Set(platforms.flatMap(platform => PLATFORM_LANGUAGE_MAP[platform]))
    ).filter(lang => packageType !== Nitro.View || lang !== SupportedLang.CPP)

    const options =
        platforms.includes(SupportedPlatform.IOS) &&
            platforms.includes(SupportedPlatform.ANDROID)
            ? [
                {
                    label: 'Swift & Kotlin',
                    value: [SupportedLang.SWIFT, SupportedLang.KOTLIN],
                    hint: `Use Swift and Kotlin to build your Nitro ${packageType.toLowerCase()} for iOS and Android`,
                },
                ...(packageType === Nitro.Module
                    ? [
                        {
                            label: 'C++',
                            value: [SupportedLang.CPP],
                            hint: 'Use C++ to share code between iOS and Android',
                        },
                    ]
                    : []),
            ]
            : availableLanguages.map(lang => ({
                label: capitalize(lang),
                value: [lang],
                hint: `Use ${lang === SupportedLang.CPP ? 'C++' : capitalize(lang)} to build your Nitro ${packageType.toLowerCase()} for ${platforms.join(' and ')}`,
            }))

    const selectedLangs = await p.select({
        message: kleur.cyan('Which language(s) would you like to use?'),
        options,
    })

    if (p.isCancel(selectedLangs)) return selectedLangs
    return selectedLangs
}

const getUserAnswers = async (
    name: string,
    usedPm?: PackageManager,
    ci?: boolean
): Promise<UserAnswers> => {
    if (ci) {
        return {
            packageName: name,
            description: `${kleur.yellow(`react-native-${name}`)} is a react native package built with Nitro`,
            platforms: [SupportedPlatform.IOS, SupportedPlatform.ANDROID],
            packageType: Nitro.Module,
            langs: [SupportedLang.SWIFT, SupportedLang.KOTLIN],
            pm: usedPm || 'pnpm',
        }
    }

    const group = await p.group(
        {
            packageName: () =>
                p.text({
                    message: kleur.cyan('Enter your package name'),
                    defaultValue: name,
                    initialValue: name,
                    validate(value) {
                        const packageName = value?.trim()
                        return validatePackageName(packageName)
                    },
                }),
            description: async ({ results }) => {
                const defaultMessage = `react-native-${results.packageName} is a react native package built with Nitro`
                return await p.text({
                    message: kleur.cyan('Enter a description for your package'),
                    defaultValue: defaultMessage,
                    initialValue: defaultMessage,
                    placeholder: defaultMessage,
                    validate(value) {
                        if (value?.trim().length === 0) {
                            return 'Package description is required'
                        }
                        return ''
                    },
                })
            },
            platforms: () =>
                p.multiselect({
                    message: kleur.cyan('Which platform(s) are you targeting?'),
                    options: [
                        {
                            label: 'iOS',
                            value: SupportedPlatform.IOS,
                        },
                        {
                            label: 'Android',
                            value: SupportedPlatform.ANDROID,
                        },
                    ],
                    initialValues: [
                        SupportedPlatform.IOS,
                        SupportedPlatform.ANDROID,
                    ],
                    required: true,
                }),
            packageType: () =>
                p.select({
                    message: kleur.cyan('Select your package type'),
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
                if (!results.platforms || !results.packageType) {
                    throw new Error('Missing required selections')
                }
                const selectedLangs = await selectLanguages(
                    results.platforms,
                    results.packageType
                )
                return selectedLangs
            },
            pm: async () => {
                if (usedPm) {
                    const confirm = await p.confirm({
                        message: kleur.cyan(
                            `${kleur.bold(kleur.green(usedPm))} detected! Would you like to continue?`
                        ),
                    })
                    if (p.isCancel(confirm)) {
                        process.exit(0)
                    } else if (confirm) {
                        return usedPm
                    }
                }

                return p.select<PackageManager>({
                    message: kleur.cyan(
                        'Which package manager would you like to use?'
                    ),
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
                        {
                            label: 'pnpm',
                            value: 'pnpm',
                        },
                    ],
                })
            },
            packageNameConfirmation: async ({ results }) => {
                const packageName = results.packageName
                if (!packageName) {
                    return false
                }
                const packageNameConfirmation = await p.confirm({
                    message: kleur.cyan(
                        `Your package name will be called: ${kleur.bold(kleur.green('react-native-' + packageName.toLowerCase()))} would you like to continue?`
                    ),
                })
                if (!packageNameConfirmation) {
                    console.log(
                        kleur.red('Package name confirmation cancelled')
                    )
                    process.exit(1)
                }
                return packageNameConfirmation
            },
        },
        {
            onCancel() {
                console.log(kleur.red('Cancelled'))
                process.exit(1)
            },
        }
    )

    return {
        packageName: group.packageName,
        packageType: group.packageType,
        platforms: group.platforms,
        langs: group.langs as SupportedLang[],
        pm: group.pm,
        description: group.description as string,
    }
}
