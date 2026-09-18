import { afterAll, describe, expect, test } from 'bun:test'
import { execFile } from 'node:child_process'
import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'

type CreateProjectOptions = {
    readonly langs: string
    readonly monorepo: boolean
    readonly nativeTooling?: string
    readonly packageName: string
}

type GeneratedProject = {
    readonly packageDir: string
    readonly rootDir: string
}

type PackageJson = {
    readonly devDependencies?: Record<string, string>
    readonly files?: readonly string[]
    readonly scripts?: Record<string, string>
}

const execFileAsync = promisify(execFile)
const generatedRoots: string[] = []

const createProject = async (
    options: CreateProjectOptions
): Promise<GeneratedProject> => {
    const moduleDir = await mkdtemp(path.join(os.tmpdir(), 'nitro-cli-e2e-'))
    generatedRoots.push(moduleDir)
    const gitConfigPath = path.join(moduleDir, 'gitconfig')

    await writeFile(
        gitConfigPath,
        [
            '[user]',
            '    name = Nitro CLI E2E',
            '    email = e2e@example.com',
            '',
        ].join('\n'),
        { encoding: 'utf8' }
    )

    const args = [
        'lib/cli/index.js',
        options.packageName,
        '--module-dir',
        moduleDir,
        '--platforms',
        'ios,android',
        '--langs',
        options.langs,
        '--skip-example',
        '--skip-install',
        '--ci',
    ]

    if (options.nativeTooling != null) {
        args.push('--native-tooling', options.nativeTooling)
    }

    if (options.monorepo) {
        args.push('--monorepo')
    }

    await execFileAsync('node', args, {
        cwd: path.resolve(import.meta.dir, '..'),
        env: {
            ...process.env,
            CI: 'true',
            GIT_CONFIG_GLOBAL: gitConfigPath,
            GIT_CONFIG_NOSYSTEM: '1',
        },
        maxBuffer: 1024 * 1024 * 20,
    })

    const finalPackageName = `react-native-${options.packageName}`
    const rootDir = path.join(moduleDir, finalPackageName)

    return {
        packageDir: options.monorepo
            ? path.join(rootDir, 'packages', finalPackageName)
            : rootDir,
        rootDir,
    }
}

const readPackageJson = async (dir: string): Promise<PackageJson> =>
    JSON.parse(
        await readFile(path.join(dir, 'package.json'), { encoding: 'utf8' })
    ) as PackageJson

const fileExists = async (filePath: string): Promise<boolean> => {
    try {
        await access(filePath)
        return true
    } catch {
        return false
    }
}

afterAll(async () => {
    await Promise.all(
        generatedRoots.map(rootDir =>
            rm(rootDir, { recursive: true, force: true })
        )
    )
})

describe('native linter and formatter scripts', () => {
    test('adds no tooling scripts when none is requested', async () => {
        const project = await createProject({
            langs: 'swift,kotlin',
            monorepo: false,
            packageName: 'toolingoff',
        })
        const scripts =
            (await readPackageJson(project.packageDir)).scripts ?? {}

        expect(
            Object.keys(scripts).filter(
                name => name.startsWith('lint:') || name.startsWith('format:')
            )
        ).toEqual([])
    }, 120_000)

    test('adds swift and kotlin scripts for a swift/kotlin package', async () => {
        const project = await createProject({
            langs: 'swift,kotlin',
            monorepo: false,
            nativeTooling: 'all',
            packageName: 'toolingnative',
        })
        const scripts =
            (await readPackageJson(project.packageDir)).scripts ?? {}

        expect(scripts['lint:swift']).toBe(
            'swift format lint --strict --recursive ios'
        )
        expect(scripts['format:swift']).toBe(
            'swift format --in-place --recursive ios'
        )
        expect(scripts['lint:kotlin']).toBe('ktlint "android/src/**/*.kt"')
        expect(scripts['format:kotlin']).toBe(
            'ktlint --format "android/src/**/*.kt"'
        )
        expect(scripts['lint:native']).toContain('run lint:swift')
        expect(scripts['lint:native']).toContain('run lint:kotlin')
        expect(scripts['format:native']).toContain('run format:swift')
        expect(scripts['format:native']).toContain('run format:kotlin')
        expect(scripts['lint:cpp']).toBeUndefined()
    }, 120_000)

    test('adds only c++ scripts for a c++ package', async () => {
        const project = await createProject({
            langs: 'c++',
            monorepo: false,
            nativeTooling: 'c++',
            packageName: 'toolingcpp',
        })
        const scripts =
            (await readPackageJson(project.packageDir)).scripts ?? {}

        expect(scripts['lint:cpp']).toContain('clang-format --dry-run --Werror')
        expect(scripts['format:cpp']).toContain('clang-format -i')
        expect(scripts['lint:swift']).toBeUndefined()
        expect(scripts['lint:kotlin']).toBeUndefined()
    }, 120_000)

    test('writes only the config files the selected tooling needs', async () => {
        const cppOnly = await createProject({
            langs: 'c++',
            monorepo: false,
            nativeTooling: 'c++',
            packageName: 'toolingcppconf',
        })
        const kotlinOnly = await createProject({
            langs: 'swift,kotlin',
            monorepo: false,
            nativeTooling: 'kotlin',
            packageName: 'toolingktconf',
        })
        const none = await createProject({
            langs: 'swift,kotlin',
            monorepo: false,
            packageName: 'toolingnoconf',
        })

        expect(
            await fileExists(path.join(cppOnly.packageDir, '.clang-format'))
        ).toBe(true)
        expect(
            await fileExists(path.join(cppOnly.packageDir, '.editorconfig'))
        ).toBe(false)

        expect(
            await fileExists(path.join(kotlinOnly.packageDir, '.editorconfig'))
        ).toBe(true)
        expect(
            await fileExists(path.join(kotlinOnly.packageDir, '.clang-format'))
        ).toBe(false)

        expect(
            await fileExists(path.join(none.packageDir, '.clang-format'))
        ).toBe(false)
        expect(
            await fileExists(path.join(none.packageDir, '.editorconfig'))
        ).toBe(false)
    }, 180_000)

    test('bundles the tool binaries as devDependencies', async () => {
        const cppAndKotlin = await createProject({
            langs: 'c++,kotlin',
            monorepo: false,
            nativeTooling: 'all',
            packageName: 'toolingdeps',
        })
        const swiftOnly = await createProject({
            langs: 'swift,kotlin',
            monorepo: false,
            nativeTooling: 'swift',
            packageName: 'toolingswiftdeps',
        })

        const bundled =
            (await readPackageJson(cppAndKotlin.packageDir)).devDependencies ??
            {}
        expect(bundled['clang-format']).toBeDefined()
        expect(bundled['@naturalcycles/ktlint']).toBeDefined()

        // SwiftLint/SwiftFormat have no npm distribution, so nothing is added.
        const swiftDeps =
            (await readPackageJson(swiftOnly.packageDir)).devDependencies ?? {}
        expect(swiftDeps['clang-format']).toBeUndefined()
        expect(swiftDeps['@naturalcycles/ktlint']).toBeUndefined()
    }, 180_000)

    test('rejects tooling for a language the package does not use', async () => {
        await expect(
            createProject({
                langs: 'swift,kotlin',
                monorepo: false,
                nativeTooling: 'c++',
                packageName: 'toolinginvalid',
            })
        ).rejects.toThrow()
    }, 120_000)

    test('delegates tooling scripts from the monorepo workspace root', async () => {
        const project = await createProject({
            langs: 'swift,kotlin',
            monorepo: true,
            nativeTooling: 'all',
            packageName: 'toolingmono',
        })
        const rootScripts =
            (await readPackageJson(project.rootDir)).scripts ?? {}
        const packageWorkspacePath = 'packages/react-native-toolingmono'

        for (const scriptName of [
            'lint:swift',
            'format:swift',
            'lint:kotlin',
            'format:kotlin',
            'lint:native',
            'format:native',
        ]) {
            expect(rootScripts[scriptName]).toContain(packageWorkspacePath)
            expect(rootScripts[scriptName]).toContain(scriptName)
        }
    }, 120_000)
})

describe('monorepo README placement', () => {
    test('keeps the README inside the package for the default layout', async () => {
        const project = await createProject({
            langs: 'swift,kotlin',
            monorepo: false,
            packageName: 'readmeroot',
        })

        expect(await fileExists(path.join(project.rootDir, 'README.md'))).toBe(
            true
        )
        expect((await readPackageJson(project.packageDir)).files).toContain(
            'README.md'
        )
    }, 120_000)

    test('moves the README to the workspace root for a monorepo', async () => {
        const project = await createProject({
            langs: 'swift,kotlin',
            monorepo: true,
            packageName: 'readmemono',
        })

        expect(await fileExists(path.join(project.rootDir, 'README.md'))).toBe(
            true
        )
        expect(
            await fileExists(path.join(project.packageDir, 'README.md'))
        ).toBe(false)

        const readme = await readFile(path.join(project.rootDir, 'README.md'), {
            encoding: 'utf8',
        })
        expect(readme).toContain('react-native-readmemono')
        expect((await readPackageJson(project.packageDir)).files).not.toContain(
            'README.md'
        )
    }, 120_000)
})
