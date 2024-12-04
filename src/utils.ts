import { execSync } from 'child_process'
import { SupportedLang } from './generate-file.js'

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
        cpp: moduleName,
      },
    }
  }

  const languageConfig = langs.reduce(
    (config, lang) => {
      if ([SupportedLang.SWIFT, SupportedLang.KOTLIN].includes(lang)) {
        config[lang] = moduleName
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
