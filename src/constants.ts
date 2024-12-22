import kleur from 'kleur'

export const ANDROID_NAME_SPACE_TAG = '$$androidNamespace$$'
export const ANDROID_CXX_LIB_NAME_TAG = '$$androidCxxLibName$$'
export const CXX_NAME_SPACE_TAG = '$$cxxNamespace$$'
export const IOS_MODULE_NAME_TAG = '$$iosModuleName$$'
export const JS_PACKAGE_NAME_TAG = '$$packageName$$'

export const messages = {
   creating: '🔄 Creating your Nitro Module...',
   cloning: '📦 Cloning app template...',
   installing: '📦 Installing packages...',
   success: '✨ Nitro Module created successfully!',
}

export const nosIcon = (moduleName: string, pm: string) => `
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

${kleur.yellow('1)')} Run your example app:
   ${kleur.green('cd example')}
   ${kleur.green(`${pm} ios`)}      ${kleur.dim('# Run iOS example')}
   ${kleur.green(`${pm} android`)}  ${kleur.dim('# Run Android example')}

${kleur.yellow('2)')} Begin development:
   ${kleur.green(`cd ${moduleName}`)}
   ${kleur.green(`${pm} pod`)}      ${kleur.dim('# Install CocoaPods dependencies (iOS)')}
   ${kleur.green(`${pm} start`)}    ${kleur.dim('# Start Metro bundler')}
   
   ${kleur.cyan('Define your module:')}
   ${kleur.white('src/specs/')}     ${kleur.dim('# Define your module specifications')}
   ${kleur.green(`${pm} codegen`)}  ${kleur.dim('# Generates native interfaces from TypeScript definitions')}
   
   ${kleur.cyan('Implement native code:')}
   ${kleur.white('ios/')}          ${kleur.dim('# iOS native implementation')}
   ${kleur.white('android/')}      ${kleur.dim('# Android native implementation')}
   
   ${kleur.green('Run your example app to test changes!')}

${kleur.yellow('Pro Tips:')}
${kleur.dim('• iOS:')} Open ${kleur.green('example/ios/example.xcworkspace')} in Xcode for native debugging
${kleur.dim('• Android:')} Open ${kleur.green('example/android')} in Android Studio
${kleur.dim('• Metro:')} Clear cache with ${kleur.green(`${pm} start`)} if needed

${kleur.yellow('Need help?')} Create an issue: ${kleur.blue().underline('https://github.com/mrousavy/nitro/issues')}

${kleur.yellow('Love this tool?')} Leave a ⭐️ on ${kleur.blue().underline('https://github.com/patrickkabwe/create-nitro-module')}
`
