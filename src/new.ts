import { readFile, writeFile } from 'fs/promises'
import inquirer from 'inquirer'
import kleur from 'kleur'
import ora from 'ora'
import path from 'path'
import { SUPPORTED_PLATFORMS } from './constants'
import { Nitro, PLATFORM_LANGUAGE_MAP } from './types'
import {
    detectPackageManager,
    dirExist,
    toPascalCase,
    validateModuleName,
} from './utils'

const moduleDir = {
    [Nitro.Module]: 'specs',
    [Nitro.View]: 'views',
}

export const newModule = async (
    type: string,
    name: string
) => {
    const spinner = ora()
    try {
        if (!name || !type) {
            throw new Error('Name and type are required')
        }
        if (type !== 'module' && type !== 'view') {
            throw new Error('Invalid type')
        }
        if (!validateModuleName(name)) {
            throw new Error('Invalid module name')
        }

        const answers = await getAnswers()
        const moduleType = type === 'module' ? Nitro.Module : Nitro.View

        if (answers.languages.includes('cpp') && moduleType === Nitro.View) {
            throw new Error('C++ is not supported for views')
        }

        const dirToCheck = moduleDir[moduleType]
        const pm = detectPackageManager()

        const moduleDirExists = await dirExist(
            path.join(process.cwd(), dirToCheck)
        )

        if (!moduleDirExists) {
            throw new Error(
                `${dirToCheck} directory does not exist. Please create a nitro ${type} module first with: '${pm} create nitro-module ${name}'`
            )
        }

        //TODO:
        // read the nitro.json file
        // keep existing autolinking config
        // add new module to autolinking config
        // generate android and ios (swift and kotlin) code
        // cpp for module only

        const nitroJson = await readFile(
            path.join(process.cwd(), 'nitro.json'),
            'utf8'
        )
        const nitroJsonObj = JSON.parse(nitroJson)

        const autolinkingConfig = nitroJsonObj.autolinking
        const moduleName = toPascalCase(name)

        const isIOS = answers.platforms.includes('ios')
        const isAndroid = answers.platforms.includes('android')

        autolinkingConfig[moduleName] =
            isIOS && isAndroid
                ? {
                    swift: `Hybrid${toPascalCase(name)}`,
                    kotlin: `Hybrid${toPascalCase(name)}`,
                }
                : isIOS
                    ? {
                        swift: `Hybrid${toPascalCase(name)}`,
                    }
                    : isAndroid
                        ? {
                            kotlin: `Hybrid${toPascalCase(name)}`,
                        }
                        : {
                            cpp: `Hybrid${toPascalCase(name)}`,
                        }
        nitroJsonObj.autolinking = autolinkingConfig
        await writeFile(
            path.join(process.cwd(), 'nitro.json'),
            JSON.stringify(nitroJsonObj, null, 2)
        )
    } catch (error) {
        spinner.fail(
            kleur.red(`Failed to create Nitro: ${(error as Error).message}`)
        )
    }
}

const getAnswers = async () => {
    const platforms = await inquirer.prompt({
        type: 'checkbox',
        name: 'platforms',
        message: 'What is the platform of the module?',
        choices: SUPPORTED_PLATFORMS,
        validate: answers => {
            if (answers.length < 1) {
                return kleur.red('⚠️  You must choose at least one platform')
            }
            return true
        },
    })

    const availableLanguages = new Set<string>()
    platforms.platforms.forEach((platform: string) => {
        PLATFORM_LANGUAGE_MAP[platform].forEach(lang =>
            availableLanguages.add(lang)
        )
    })

    const languages = await inquirer.prompt({
        type: 'checkbox',
        name: 'languages',
        message: 'What is the language of the module?',
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
                for (const platform of platforms.platforms) {
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
    return { platforms: platforms.platforms, languages: languages.languages }
}
