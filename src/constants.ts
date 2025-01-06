import kleur from 'kleur'

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

export const foldersToRemoveFromExampleApp = [
   "__tests__",
]

type InstructionsParams = {
   moduleName: string
   pm: string
   skipInstall?: boolean
   skipExample?: boolean
}

export const generateInstructions = ({ moduleName, pm, skipInstall, skipExample }: InstructionsParams) => `
${kleur.cyan().bold(`   
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
     └─┘`)}
     
${kleur.red().bold('Next steps:')}

${skipExample ? '' : `Run your example app:
   ${kleur.green('cd example')}
   ${kleur.green(`${pm} ios`)}            ${kleur.dim('# Run iOS example')}
   ${kleur.green(`${pm} android`)}        ${kleur.dim('# Run Android example')}`}

${skipInstall ? '' : `Install dependencies:
   ${kleur.green(`${pm} install`)}         ${kleur.dim('# Install dependencies')}`}
   ${kleur.green(`${pm} codegen`)}          ${kleur.dim('# Generate native interfaces from TypeScript definitions')}

Begin development:
${skipExample ? '' : `${kleur.green(`cd ${moduleName}/example`)}`}
   ${kleur.green(`${pm} pod`)}            ${kleur.dim('# Install CocoaPods dependencies (iOS)')}
   ${kleur.green(`${pm} ios|android`)}    ${kleur.dim('# Run your example app')}
 
   
   ${kleur.cyan('Define your module:')}
   ${kleur.white('src/specs/')}         ${kleur.dim('# Define your module specifications. e.g. src/specs/myModule.nitro.ts')}
   ${kleur.green(`${pm} codegen`)}        ${kleur.dim('# Generates native interfaces from TypeScript definitions')}
   
   ${kleur.cyan('Implement native code:')}
   ${kleur.white('ios/')}               ${kleur.dim('# iOS native implementation')}
   ${kleur.white('android/')}           ${kleur.dim('# Android native implementation')}
   
   ${kleur.green('Run your example app to test changes!')}

${kleur.yellow('Pro Tips:')}
${kleur.dim('• iOS:')} Open ${kleur.green('example/ios/example.xcworkspace')} in Xcode for native debugging
${kleur.dim('• Android:')} Open ${kleur.green('example/android')} in Android Studio
${kleur.dim('• Metro:')} Clear cache with ${kleur.green(`${pm} start`)} if needed

${kleur.yellow('Need help?')} Create an issue: ${kleur.blue().underline('https://github.com/patrickkabwe/create-nitro-module/issues')}

${kleur.yellow('Love this tool?')} Leave a ⭐️ on ${kleur.blue().underline('https://github.com/patrickkabwe/create-nitro-module')}
`
