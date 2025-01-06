import { execSync } from 'child_process'
import { access, copyFile, mkdir, readFile, writeFile } from 'fs/promises'
import path from 'path'
import { GenerateModuleConfig, SupportedLang } from './types'

type AutolinkingConfig = {
    [key: string]: Partial<Record<SupportedLang | 'cpp', string>>
}

export const LANGS = ['c++', 'swift', 'kotlin'] as const

export const replaceTag = (tag: string, oldValue: string, newValue: string) => {
    return oldValue?.replaceAll(tag, newValue)
}

export const replaceHyphen = (str: string) => {
    return str.toLowerCase()?.replaceAll('-', '')
}

export const getGitUserInfo = () => {
    try {
        const name = execSync('git config user.name').toString().trim()
        const email = execSync('git config user.email').toString().trim()
        return { name, email }
    } catch (error) {
        console.error('Error getting Git user info:', error)
        return { name: '', email: '' }
    }
}

export const toPascalCase = (str: string) => {
    return str
        .split(/[-_\s]+/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join('')
}

export const mapPlatformToLanguage = (
    platforms: string[],
    selectedLangs: string[]
): Record<string, string> => {
    const result: Record<string, string> = {}
    const [cpp, swift, kotlin] = LANGS

    platforms.forEach(platform => {
        if (selectedLangs.includes(swift) || selectedLangs.includes(kotlin)) {
            result[platform] = platform === 'ios' ? swift : kotlin
        } else {
            result[platform] = cpp
        }
    })

    return result
}

export const generateAutolinking = (
    moduleName: string,
    langs: SupportedLang[]
): AutolinkingConfig => {
    if (
        !langs.some(lang =>
            [SupportedLang.SWIFT, SupportedLang.KOTLIN].includes(lang)
        )
    ) {
        return {
            [moduleName]: {
                cpp: `Hybrid${moduleName}`,
            },
        }
    }

    const languageConfig = langs.reduce(
        (config, lang) => {
            if ([SupportedLang.SWIFT, SupportedLang.KOTLIN].includes(lang)) {
                config[lang] = `Hybrid${moduleName}`
            }
            return config
        },
        {} as Partial<Record<SupportedLang, string>>
    )

    return Object.keys(languageConfig).length > 0
        ? { [moduleName]: languageConfig }
        : {}
}

export const validateTemplate = (answer: string[]) => {
    return answer.length > 0 || 'You must choose at least one template'
}

export const validateLang = (choices: string[]) => {
    if (!choices.length) {
        return 'You must choose at least one lang'
    }

    if (
        choices.includes(SupportedLang.SWIFT) &&
        choices.includes(SupportedLang.KOTLIN) &&
        choices.includes(SupportedLang.CPP)
    ) {
        return 'You can not choose swift, kotlin and c++. use either swift with kotlin or c++'
    }
    if (
        choices.includes(SupportedLang.SWIFT) &&
        choices.includes(SupportedLang.CPP)
    ) {
        return 'You can not choose swift and c++. use either swift with kotlin or c++'
    }
    if (
        choices.includes(SupportedLang.KOTLIN) &&
        choices.includes(SupportedLang.CPP)
    ) {
        return 'You can not choose kotlin and c++. use either swift with kotlin or c++'
    }
    return true
}

export const dirExist = async (dir: string) => {
    try {
        await access(dir)
        return true
    } catch {
        return false
    }
}

export const createFolder = async (cwd: string, dir?: string) => {
    await mkdir(path.join(cwd, dir ?? ''), { recursive: true })
}

export const createModuleFile = async (
    cwd: string,
    fileName: string,
    data: string
) => {
    const filePath = path.join(cwd, fileName)
    await writeFile(filePath, data, { encoding: 'utf8', mode: 0o755 }) // use other mode if needed
}

export const replacePlaceholder = async ({
    filePath,
    replacements,
    data,
}: {
    filePath?: string
    replacements: Record<string, string>
    data?: string
}) => {
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

export const copyTemplateFiles = async (
    config: GenerateModuleConfig,
    paths: string[],
    filesToCopy: string[]
) => {
    for (const file of filesToCopy) {
        await copyFile(path.join(...paths, file), path.join(config.cwd, file))
    }
}
