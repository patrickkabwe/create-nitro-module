import {
    type PackageManager,
    type PlatformLangMap,
    SupportedLang,
} from './types'

export type NativeToolingLang =
    SupportedLang.SWIFT | SupportedLang.KOTLIN | SupportedLang.CPP

type NativeToolingDefinition = {
    label: string
    hint: string
    scripts: Record<string, string>
    /** Package name -> fallback version range if the registry lookup fails. */
    devDependencies: Record<string, string>
    /** Shown after generation when the toolchain needs something extra. */
    prerequisite?: string
}

const CPP_SOURCES = `$(find cpp -type f \\( -name '*.cpp' -o -name '*.hpp' -o -name '*.h' \\))`

/**
 * Linter/formatter tooling offered per native language. The scripts are added to
 * the generated package's package.json only for the languages the user selected.
 *
 * Where an npm package vendors the real binary it is added as a devDependency so
 * the scripts work on any machine after a plain install. Swift is the exception:
 * no npm package ships the SwiftLint/SwiftFormat binaries (the `swiftlint`
 * package only shells out to a Homebrew install), so those stay global tools.
 */
export const NATIVE_TOOLING: Record<
    NativeToolingLang,
    NativeToolingDefinition
> = {
    [SupportedLang.SWIFT]: {
        label: 'Swift',
        hint: 'swift format (ships with the Xcode toolchain)',
        scripts: {
            // `swift format` is Apple's official formatter and is what the Nitro
            // repo itself uses. It needs no install beyond Xcode, unlike
            // SwiftLint/SwiftFormat which would require Homebrew.
            // --strict promotes findings to a non-zero exit; without it
            // `swift format lint` only prints warnings and always exits 0.
            'lint:swift': 'swift format lint --strict --recursive ios',
            'format:swift': 'swift format --in-place --recursive ios',
        },
        devDependencies: {},
    },
    [SupportedLang.KOTLIN]: {
        label: 'Kotlin',
        hint: 'ktlint (bundled as a devDependency)',
        scripts: {
            'lint:kotlin': 'ktlint "android/src/**/*.kt"',
            'format:kotlin': 'ktlint --format "android/src/**/*.kt"',
        },
        devDependencies: { '@naturalcycles/ktlint': '^1.16.1' },
        prerequisite: 'a JDK on PATH (already required to build Android)',
    },
    [SupportedLang.CPP]: {
        label: 'C++',
        hint: 'clang-format (bundled as a devDependency)',
        scripts: {
            // clang-tidy is deliberately not used here: the nitrogen specs
            // include <NitroModules/...>, a header prefix that only exists once
            // CocoaPods/CMake build the module, so it cannot resolve from a
            // plain package script without a compilation database.
            'lint:cpp': `clang-format --dry-run --Werror ${CPP_SOURCES}`,
            'format:cpp': `clang-format -i ${CPP_SOURCES}`,
        },
        devDependencies: { 'clang-format': '^1.8.0' },
    },
}

/**
 * devDependency name -> fallback range for every selected toolchain.
 */
export const getNativeToolingDevDependencies = (
    langs: NativeToolingLang[]
): Record<string, string> =>
    Object.assign(
        {},
        ...NATIVE_TOOLING_LANGS.filter(lang => langs.includes(lang)).map(
            lang => NATIVE_TOOLING[lang].devDependencies
        )
    )

/**
 * Human-readable prerequisites for the selected toolchains, for the post-create
 * instructions.
 */
export const getNativeToolingPrerequisites = (
    langs: NativeToolingLang[]
): { label: string; prerequisite: string }[] =>
    NATIVE_TOOLING_LANGS.filter(lang => langs.includes(lang))
        .filter(lang => NATIVE_TOOLING[lang].prerequisite != null)
        .map(lang => ({
            label: NATIVE_TOOLING[lang].label,
            prerequisite: NATIVE_TOOLING[lang].prerequisite as string,
        }))

export const NATIVE_TOOLING_LANGS = Object.keys(
    NATIVE_TOOLING
) as NativeToolingLang[]

/**
 * Mirrors the ktlint config the Nitro repo uses for its own Kotlin sources, so
 * generated modules follow the same conventions as Nitro itself.
 * https://github.com/mrousavy/nitro/blob/main/config/.editorconfig
 */
export const KTLINT_EDITOR_CONFIG = `[*.{kt,kts}]
ktlint_standard_filename = disabled
ktlint_standard_function-expression-body = disabled

[*]
indent_style = space
indent_size = 2
`

/**
 * Mirrors the clang-format config used by react-native-mmkv, the reference
 * production Nitro Module. `AllowShortFunctionsOnASingleLine: Empty` matches
 * React Native core as well, so generated C++ lines up with the wider ecosystem.
 * https://github.com/mrousavy/react-native-mmkv/blob/main/.clang-format
 */
export const CLANG_FORMAT_CONFIG = `# Standard
BasedOnStyle: llvm
Standard: c++20

# Indentation
IndentWidth: 2
ColumnLimit: 140

# Includes
SortIncludes: CaseSensitive
SortUsingDeclarations: true

# Pointer and reference alignment
PointerAlignment: Left
ReferenceAlignment: Left
ReflowComments: true

# Line breaking options
BreakBeforeBraces: Attach
BreakConstructorInitializers: BeforeColon
AlwaysBreakTemplateDeclarations: true
AllowShortFunctionsOnASingleLine: Empty
IndentCaseLabels: true
NamespaceIndentation: Inner
`

export const isNativeToolingLang = (
    lang: SupportedLang
): lang is NativeToolingLang =>
    NATIVE_TOOLING_LANGS.includes(lang as NativeToolingLang)

/**
 * The languages a linter/formatter can be offered for, derived from the
 * per-platform language selection so the prompt only lists relevant tooling.
 */
export const getNativeToolingCandidates = (
    platformLangs: PlatformLangMap
): NativeToolingLang[] => {
    const selected = new Set(Object.values(platformLangs))
    return NATIVE_TOOLING_LANGS.filter(lang => selected.has(lang))
}

/**
 * package.json scripts for the selected tooling, plus `lint:native` /
 * `format:native` aggregates that run every selected toolchain.
 */
export const getNativeToolingScripts = (
    langs: NativeToolingLang[],
    pm: PackageManager
): Record<string, string> => {
    const ordered = NATIVE_TOOLING_LANGS.filter(lang => langs.includes(lang))

    if (ordered.length === 0) {
        return {}
    }

    const scripts: Record<string, string> = {}
    const lintScripts: string[] = []
    const formatScripts: string[] = []

    for (const lang of ordered) {
        for (const [name, command] of Object.entries(
            NATIVE_TOOLING[lang].scripts
        )) {
            scripts[name] = command
            if (name.startsWith('lint:')) {
                lintScripts.push(name)
            } else {
                formatScripts.push(name)
            }
        }
    }

    scripts['lint:native'] = lintScripts
        .map(name => `${pm} run ${name}`)
        .join(' && ')
    scripts['format:native'] = formatScripts
        .map(name => `${pm} run ${name}`)
        .join(' && ')

    return scripts
}
