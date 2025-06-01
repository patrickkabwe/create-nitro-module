import * as p from '@clack/prompts'

export interface UserAnswers {
    packageName: string
    description: string
    platforms: SupportedPlatform[]
    packageType: Nitro
    langs: SupportedLang[]
    pm: PackageManager
}

export enum SupportedLang {
    SWIFT = 'swift',
    KOTLIN = 'kotlin',
    CPP = 'c++',
    JS = 'js',
}

export enum SupportedPlatform {
    IOS = 'ios',
    ANDROID = 'android',
}

export type PlatformLang = {
    langs: SupportedLang[]
    platforms: SupportedPlatform[]
}

export type CreateModuleOptions = {
    ci?: boolean
    moduleDir?: string
    skipExample?: boolean
    skipInstall?: boolean
}

export type PackageManager = 'bun' | 'yarn' | 'npm'

export enum Nitro {
    Module = 'module',
    View = 'view',
}

export type GenerateModuleConfig = {
    pm: PackageManager
    cwd: string
    langs: SupportedLang[]
    prefix?: string
    spinner: ReturnType<typeof p.spinner>
    description: string
    funcName?: string
    platforms: SupportedPlatform[]
    packageType: Nitro
    packageName: string
    finalPackageName: string
} & Omit<CreateModuleOptions, 'moduleDir'>

export interface FileGenerator {
    /**
     * Generates the module files based on the platform and language
     * @param config Configuration for generating the module
     * @returns void
     */
    generate(config: GenerateModuleConfig): Promise<void>
}

export const PLATFORM_LANGUAGE_MAP: Record<string, string[]> = {
    ios: ['swift', 'cpp'],
    android: ['kotlin', 'cpp'],
}

export type InstructionsParams = {
    moduleName: string
    pm: string
    skipInstall?: boolean
    skipExample?: boolean
}
