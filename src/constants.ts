import kleur from 'kleur'
import type { InstructionsParams } from './types'

export const SUPPORTED_PLATFORMS = ['ios', 'android']

export const ANDROID_NAME_SPACE_TAG = '$$androidNamespace$$'
export const ANDROID_CXX_LIB_NAME_TAG = '$$androidCxxLibName$$'
export const CXX_NAME_SPACE_TAG = '$$cxxNamespace$$'
export const IOS_MODULE_NAME_TAG = '$$iosModuleName$$'
export const JS_PACKAGE_NAME_TAG = '$$packageName$$'

export const messages = {
    creating: 'Creating your Nitro Module...',
    generating: 'Generating example app...',
    installing: 'Installing dependencies...',
    runningCodegen: '🚀 Running codegen...',
    success: '✨ Nitro Module created successfully!',
} as const

export const packagesToRemoveFromExampleApp = [
    "@types/react",
    "@types/react-test-renderer",
    "babel-jest",
    "eslint",
    "jest",
    "prettier",
    "react-test-renderer",
    "typescript",
]

export const foldersToRemoveFromExampleApp = []

export const NITRO_GRAPHIC = `   
   ┌─────┐
   │ ⏲️  |
   │╭───╮│
   ││${kleur.red().bold(' N ')}││
   ││${kleur.red().bold('→O←')}││
   ││${kleur.red().bold(' S ')}││
   │╰───╯│
   │     │
   └─┬─┬─┘
     │ │
     └─┘`

export const generateInstructions = ({ moduleName, pm, skipInstall, skipExample }: InstructionsParams) => `
${kleur.cyan().bold(NITRO_GRAPHIC)}
     
${kleur.red().bold('Next steps:')}

${!skipInstall ? '' : `Install dependencies:

   ${kleur.green(`${pm} install`)}         ${kleur.dim('# Install dependencies')}
   ${kleur.green(`${pm} codegen`)}         ${kleur.dim('# Generate native interfaces from TypeScript definitions')}\n`}
${skipExample ? '' : `Run your example app:

   ${kleur.green('cd example')}
   ${kleur.green(`${pm} pod`)}            ${kleur.dim('# Install CocoaPods dependencies (iOS)')}
   ${kleur.green(`${pm} ios|android`)}    ${kleur.dim('# Run your example app')}`}
   
Begin development:
   ${kleur.green(`cd ${moduleName}`)}
 
   ${kleur.cyan('Define your module:')}
   ${kleur.white('src/specs/')}         ${kleur.dim('# Define your module specifications. e.g. src/specs/myModule.nitro.ts')}
   ${kleur.green(`${pm} codegen`)}        ${kleur.dim('# Generates native interfaces from TypeScript definitions')}
   
   ${kleur.cyan('Implement native code:')}
   ${kleur.white('ios/')}               ${kleur.dim('# iOS native implementation using swift')}
   ${kleur.white('android/')}           ${kleur.dim('# Android native implementation using kotlin')}
   ${kleur.white('cpp/')}               ${kleur.dim('# C++ native implementation. Shareable between iOS and Android (Will be generated if cpp was selected)')}
   
   ${kleur.green('Run your example app to test changes!')}

${kleur.yellow('Pro Tips:')}
${kleur.dim('• iOS:')} Open ${kleur.green('example/ios/example.xcworkspace')} in Xcode for native debugging
${kleur.dim('• Android:')} Open ${kleur.green('example/android')} in Android Studio
${kleur.dim('• Metro:')} Clear cache with ${kleur.green(`${pm} start`)} if needed

${kleur.yellow('Need help?')} Create an issue: ${kleur.blue().underline('https://github.com/patrickkabwe/create-nitro-module/issues')}

${kleur.yellow('Love this tool?')} Leave a ⭐️ on ${kleur.blue().underline('https://github.com/patrickkabwe/create-nitro-module')}
`