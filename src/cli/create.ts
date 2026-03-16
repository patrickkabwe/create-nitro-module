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

const SUPPORTED_PLATFORM_VALUES = Object.values(SupportedPlatform)
const SUPPORTED_LANG_VALUES: SupportedLang[] = [
    SupportedLang.SWIFT,
    SupportedLang.KOTLIN,
    SupportedLang.CPP,
]

const parseListOption = (value?: string) =>
    value
        ?.split(',')
        .map(item => item.trim().toLowerCase())
        .filter(Boolean) ?? []

const getAllowedLanguageSelections = (
    platforms: SupportedPlatform[],
    packageType: Nitro
) => {
    const availableLanguages = Array.from(
        new Set(platforms.flatMap(platform => PLATFORM_LANGUAGE_MAP[platform]))
    ).filter(lang => packageType !== Nitro.View || lang !== SupportedLang.CPP)

    if (
        platforms.includes(SupportedPlatform.IOS) &&
        platforms.includes(SupportedPlatform.ANDROID)
    ) {
        return [
            [SupportedLang.SWIFT, SupportedLang.KOTLIN],
            ...(packageType === Nitro.Module ? [[SupportedLang.CPP]] : []),
        ]
    }

    return availableLanguages.map(lang => [lang])
}

const hasMatchingSelection = (
    selectedLangs: SupportedLang[],
    allowedSelection: SupportedLang[]
) =>
    selectedLangs.length === allowedSelection.length &&
    selectedLangs.every(lang => allowedSelection.includes(lang))

const formatLanguageSelection = (langs: SupportedLang[]) =>
    langs.map(lang => (lang === SupportedLang.CPP ? 'c++' : lang)).join(', ')

const parsePlatformsOption = (value?: string) => {
    const platforms = Array.from(
        new Set(
            parseListOption(value).map(platform => {
                if (
                    !SUPPORTED_PLATFORM_VALUES.includes(
                        platform as SupportedPlatform
                    )
                ) {
                    throw new Error(
                        `Invalid platform "${platform}". Supported platforms: ${SUPPORTED_PLATFORM_VALUES.join(', ')}`
                    )
                }

                return platform as SupportedPlatform
            })
        )
    )

    return platforms.length > 0
        ? platforms
        : [SupportedPlatform.IOS, SupportedPlatform.ANDROID]
}

const parseLangsOption = (
    value: string | undefined,
    platforms: SupportedPlatform[],
    packageType: Nitro
) => {
    const allowedSelections = getAllowedLanguageSelections(
        platforms,
        packageType
    )

    if (!value) {
        return packageType === Nitro.View
            ? resolveViewLanguages(platforms)
            : allowedSelections[0]
    }

    const langs = Array.from(
        new Set(
            parseListOption(value).map(lang => {
                if (!SUPPORTED_LANG_VALUES.includes(lang as SupportedLang)) {
                    throw new Error(
                        `Invalid language "${lang}". Supported languages: ${SUPPORTED_LANG_VALUES.join(', ')}`
                    )
                }

                return lang as SupportedLang
            })
        )
    )

    const isAllowedSelection = allowedSelections.some(selection =>
        hasMatchingSelection(langs, selection)
    )

    if (!isAllowedSelection) {
        throw new Error(
            `Invalid language selection for ${platforms.join(', ')} (${packageType}). Allowed selections: ${allowedSelections.map(formatLanguageSelection).join(' | ')}`
        )
    }

    return langs
}

export const createModule = async (
    packageName: string,
    options: CreateModuleOptions
) => {
    let packageType = Nitro.Module
    let moduleFactory: NitroModuleFactory | null = null
    let spinnerStarted = false
    const spinner = p.spinner()
    try {
        if (options.moduleDir) {
            const moduleDirExists = await dirExist(options.moduleDir)
            if (!moduleDirExists) {
                mkdirSync(options.moduleDir, { recursive: true })
            }
        }

        if (
            options.packageType &&
            ![Nitro.Module, Nitro.View].includes(options.packageType)
        ) {
            console.log(
                kleur.red(
                    `Invalid package type ${options.packageType}. Please use either "${Nitro.Module}" or "${Nitro.View}".`
                )
            )
            process.exit(1)
        }

        const usedPm = detectPackageManager()
        const answers = await getUserAnswers(packageName, usedPm, options)
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
                    kleur.red(
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
        spinnerStarted = true

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
        if (spinnerStarted) {
            spinner.stop(
                kleur.red(
                    `Failed to create Nitro ${packageType}: ${(error as Error).message}`
                )
            )
        } else {
            console.log(
                kleur.red(
                    `Failed to create Nitro ${packageType}: ${(error as Error).message}`
                )
            )
        }
        process.exit(1)
    }
}

const selectLanguages = async (
    platforms: SupportedPlatform[],
    packageType: Nitro
) => {
    const options = getAllowedLanguageSelections(platforms, packageType).map(
        langs => {
            if (
                langs.includes(SupportedLang.SWIFT) &&
                langs.includes(SupportedLang.KOTLIN)
            ) {
                return {
                    label: 'Swift & Kotlin',
                    value: langs,
                    hint: `Use Swift and Kotlin to build your Nitro ${packageType.toLowerCase()} for iOS and Android`,
                }
            }

            const [lang] = langs
            return {
                label: capitalize(lang === SupportedLang.CPP ? 'c++' : lang),
                value: langs,
                hint:
                    lang === SupportedLang.CPP &&
                    platforms.includes(SupportedPlatform.IOS) &&
                    platforms.includes(SupportedPlatform.ANDROID)
                        ? 'Use C++ to share code between iOS and Android'
                        : `Use ${lang === SupportedLang.CPP ? 'C++' : capitalize(lang)} to build your Nitro ${packageType.toLowerCase()} for ${platforms.join(' and ')}`,
            }
        }
    )

    const selectedLangs = await p.select({
        message: kleur.cyan('Which language(s) would you like to use?'),
        options,
    })

    if (p.isCancel(selectedLangs)) return selectedLangs
    return selectedLangs
}

const resolveViewLanguages = (platforms: SupportedPlatform[]) => {
    const langs = new Set<SupportedLang>()
    if (platforms.includes(SupportedPlatform.IOS)) {
        langs.add(SupportedLang.SWIFT)
    }
    if (platforms.includes(SupportedPlatform.ANDROID)) {
        langs.add(SupportedLang.KOTLIN)
    }
    return Array.from(langs)
}

const getUserAnswers = async (
    name: string,
    usedPm?: PackageManager,
    options?: CreateModuleOptions
): Promise<UserAnswers> => {
    if (options?.ci) {
        const platforms = parsePlatformsOption(options.platforms)
        const packageType = options?.packageType || Nitro.Module

        return {
            packageName: name,
            description: `${kleur.yellow(`react-native-${name}`)} is a react native package built with Nitro`,
            platforms,
            packageType,
            langs: parseLangsOption(options.langs, platforms, packageType),
            pm: usedPm || 'pnpm',
        }
    }

    const group = await p.group(
        {
            packageName: async () => {
                if (name) {
                    return name
                }
                return p.text({
                    message: kleur.cyan('Enter your package name'),
                    defaultValue: name,
                    initialValue: name,
                    validate(value) {
                        const packageName = value?.trim()
                        return validatePackageName(packageName)
                    },
                })
            },
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
            packageType: async () => {
                if (options?.packageType) {
                    return options.packageType
                }

                return p.select({
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
                })
            },
            langs: async ({ results }) => {
                if (!results.platforms || !results.packageType) {
                    throw new Error('Missing required selections')
                }
                if (results.packageType === Nitro.View) {
                    return resolveViewLanguages(results.platforms)
                }
                return await selectLanguages(
                    results.platforms,
                    results.packageType
                )
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
