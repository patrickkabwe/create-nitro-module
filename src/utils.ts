import kleur from 'kleur'
import { execSync } from 'node:child_process'
import { access, cp, mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
    type GenerateModuleConfig,
    type PlatformLangMap,
    SupportedLang,
    SupportedPlatform,
} from './types'

type AutolinkingImplementation = {
    language: string
    implementationClassName: string
}

type AutolinkingEntry = {
    all?: AutolinkingImplementation
    ios?: AutolinkingImplementation
    android?: AutolinkingImplementation
}

type AutolinkingConfig = {
    [key: string]: AutolinkingEntry
}

export const validatePackageName = (input: string): string => {
    if (input.length === 0) {
        return 'Package name is required'
    }

    if (/[A-Z]/.test(input)) {
        return 'Package name should be lowercase'
    }

    if (
        input.toLowerCase().includes('react-native') ||
        input.toLowerCase().includes('react')
    ) {
        return `Package name cannot contain ${kleur.red('react-native')} or ${kleur.red('react')}`
    }

    if (input.includes('@') || input.includes('/')) {
        return 'Namespaced packages (e.g., @org/module) are not supported'
    }

    if (!/^[a-z0-9-]+$/.test(input)) {
        return 'Package name can only contain lowercase letters, numbers, and hyphens'
    }

    return ''
}

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

export const generateAutolinking = (
    moduleName: string,
    platformLangs: PlatformLangMap
): AutolinkingConfig => {
    const className = `Hybrid${moduleName}`
    const langs = Object.values(platformLangs)

    // If all platforms use C++, use the "all" shorthand
    if (langs.every(lang => lang === SupportedLang.CPP)) {
        return {
            [moduleName]: {
                all: {
                    language: SupportedLang.CPP,
                    implementationClassName: className,
                },
            },
        }
    }

    const entry: AutolinkingEntry = {}

    if (platformLangs[SupportedPlatform.IOS]) {
        entry.ios = {
            language: platformLangs[SupportedPlatform.IOS],
            implementationClassName: className,
        }
    }
    if (platformLangs[SupportedPlatform.ANDROID]) {
        entry.android = {
            language: platformLangs[SupportedPlatform.ANDROID],
            implementationClassName: className,
        }
    }

    return { [moduleName]: entry }
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
    let fileContent: string
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
        await cp(path.join(...paths, file), path.join(config.cwd, file), {
            recursive: true,
        })
    }
}

export const detectPackageManager = () => {
    const userAgent = process.env.npm_config_user_agent
    if (!userAgent) return
    if (userAgent.startsWith('npm')) return 'npm'
    if (userAgent.startsWith('yarn')) return 'yarn'
    if (userAgent.startsWith('bun')) return 'bun'
    if (userAgent.startsWith('pnpm')) return 'pnpm'
    return 'bun'
}

export const capitalize = (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1)
}
