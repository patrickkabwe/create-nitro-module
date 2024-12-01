import inquirer from 'inquirer'
import kleur from 'kleur'
import ora from 'ora'
import { nosIcon } from './constants.js'
import { fileGenerator } from './generate-file.js'

interface PlatformLanguageMap {
  [key: string]: string[]
}

const PLATFORM_LANGUAGE_MAP: PlatformLanguageMap = {
  ios: ['swift', 'cpp'],
  android: ['kotlin', 'cpp'],
}

const PLATFORMS = ['ios', 'android']

export const createModule = async (name: string) => {
  if (typeof name !== 'string') {
    name = ''
  }
  const spinner = ora()
  try {
    const answers = await getCreateModuleAnswer(name)
    spinner.start(kleur.yellow('🔄 Creating your Nitro Module...'))
    await fileGenerator.generate({
      langs: answers.langs,
      moduleName: answers.moduleName,
      platforms: answers.platforms,
      pm: answers.pm,
    })
    console.log(nosIcon)
    console.log(
      kleur.cyan().dim('Nitro CLI - Build Cross-Platform Native Modules\n')
    )
    spinner.succeed(kleur.green('✨ Nitro Module created successfully!'))
  } catch (error) {
    spinner.fail(
      kleur.red(`❌ Failed to create nitro module: ${(error as Error).message}`)
    )
  }
}

export const generateModule = () => {
  throw new Error('Not Implemented')
}

const getCreateModuleAnswer = async (name: string) => {
  const moduleName = await inquirer.prompt([
    {
      type: 'input',
      message: kleur.cyan('📝 What is the name of your module?'),
      name: 'name',
      when: !name,
      validate: (input: string) => {
        if (input.trim().length < 1) {
          return kleur.red('⚠️  Module name cannot be empty')
        }
        return true
      },
    },
  ])

  const platforms = await inquirer.prompt({
    type: 'checkbox',
    message: kleur.cyan('🎯 Select target platforms:'),
    name: 'names',
    choices: PLATFORMS,
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
          const requiredNative = platform === 'ios' ? 'swift' : 'kotlin'
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
  return {
    moduleName: moduleName.name || name,
    platforms: platforms.names,
    langs: langs.names,
    pm: pm.name,
  }
}
