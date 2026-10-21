import { afterAll, describe, expect, test } from 'bun:test'
import { execFile } from 'node:child_process'
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'

type Scenario = {
    readonly name: string
    readonly platforms: string
    readonly langs: string
    readonly packageType: 'module' | 'view'
    readonly decorators: readonly string[]
    readonly nativeFiles: readonly string[]
}

type PackageJson = {
    readonly main: string
    readonly 'react-native': string
    readonly imports: { readonly '#nitro/*': string }
    readonly files: readonly string[]
    readonly scripts: {
        readonly codegen: string
        readonly postcodegen?: string
    }
    readonly devDependencies: {
        readonly 'nitro-core': string
        readonly nitrogen: string
        readonly 'react-native-nitro-modules': string
        readonly 'react-native': string
    }
    readonly peerDependenciesMeta: {
        readonly 'nitro-core': { readonly optional: boolean }
        readonly 'react-native-nitro-modules': { readonly optional: boolean }
    }
    readonly swiftpmConfig?: {
        readonly name: string
        readonly dependencies: readonly string[]
    }
}

const execFileAsync = promisify(execFile)
const roots: string[] = []
const scenarios: readonly Scenario[] = [
    {
        name: 'swift',
        platforms: 'ios',
        langs: 'swift',
        packageType: 'module',
        decorators: ['iOS'],
        nativeFiles: ['apple/HybridSample.swift'],
    },
    {
        name: 'kotlin',
        platforms: 'android',
        langs: 'kotlin',
        packageType: 'module',
        decorators: ['Android'],
        nativeFiles: [
            'android/src/main/java/com/margelo/nitro/sample/HybridSample.kt',
        ],
    },
    {
        name: 'cpp',
        platforms: 'ios,android',
        langs: 'c++',
        packageType: 'module',
        decorators: ['iOS', 'Android'],
        nativeFiles: ['cpp/HybridSample.hpp'],
    },
    {
        name: 'mixed',
        platforms: 'ios,android',
        langs: 'c++,kotlin',
        packageType: 'module',
        decorators: ['iOS', 'Android'],
        nativeFiles: [
            'cpp/HybridSample.hpp',
            'android/src/main/java/com/margelo/nitro/sample/HybridSample.kt',
        ],
    },
    {
        name: 'view',
        platforms: 'ios,android',
        langs: 'swift,kotlin',
        packageType: 'view',
        decorators: ['iOS', 'Android'],
        nativeFiles: [
            'apple/HybridSample.swift',
            'android/src/main/java/com/margelo/nitro/sample/HybridSample.kt',
        ],
    },
    {
        name: 'swift-kotlin',
        platforms: 'ios,android',
        langs: 'swift,kotlin',
        packageType: 'module',
        decorators: ['iOS', 'Android'],
        nativeFiles: [
            'apple/HybridSample.swift',
            'android/src/main/java/com/margelo/nitro/sample/HybridSample.kt',
        ],
    },
    {
        name: 'swift-cpp',
        platforms: 'ios,android',
        langs: 'swift,c++',
        packageType: 'module',
        decorators: ['iOS', 'Android'],
        nativeFiles: ['apple/HybridSample.swift', 'cpp/HybridSample.hpp'],
    },
    {
        name: 'cpp-ios',
        platforms: 'ios',
        langs: 'c++',
        packageType: 'module',
        decorators: ['iOS'],
        nativeFiles: ['cpp/HybridSample.hpp'],
    },
    {
        name: 'cpp-android',
        platforms: 'android',
        langs: 'c++',
        packageType: 'module',
        decorators: ['Android'],
        nativeFiles: ['cpp/HybridSample.hpp'],
    },
    {
        name: 'view-ios',
        platforms: 'ios',
        langs: 'swift',
        packageType: 'view',
        decorators: ['iOS'],
        nativeFiles: ['apple/HybridSample.swift'],
    },
    {
        name: 'view-android',
        platforms: 'android',
        langs: 'kotlin',
        packageType: 'view',
        decorators: ['Android'],
        nativeFiles: [
            'android/src/main/java/com/margelo/nitro/sample/HybridSample.kt',
        ],
    },
]

afterAll(async () => {
    await Promise.all(
        roots.map(root => rm(root, { recursive: true, force: true }))
    )
})

describe('Nitro V1 templates', () => {
    test.each(scenarios)(
        '$name generates a consistent V1 package',
        async scenario => {
            const root: string = await mkdtemp(
                path.join(os.tmpdir(), 'nitro-v1-e2e-')
            )
            roots.push(root)
            await execFileAsync(
                'node',
                [
                    'lib/cli/index.js',
                    'sample',
                    '--module-dir',
                    root,
                    '--platforms',
                    scenario.platforms,
                    '--langs',
                    scenario.langs,
                    '--package-type',
                    scenario.packageType,
                    '--skip-example',
                    '--skip-install',
                    '--ci',
                ],
                {
                    cwd: path.resolve(import.meta.dir, '..'),
                    env: {
                        ...process.env,
                        CI: 'true',
                        npm_config_user_agent: 'bun',
                    },
                }
            )

            const packageDir: string = path.join(root, 'react-native-sample')
            expect(
                await readFile(
                    path.join(packageDir, 'react-native.config.js'),
                    'utf8'
                )
            ).toContain('componentDescriptors: []')
            const packageJson: PackageJson = JSON.parse(
                await readFile(path.join(packageDir, 'package.json'), 'utf8')
            ) as PackageJson
            const spec: string = await readFile(
                path.join(packageDir, 'src/specs/sample.nitro.ts'),
                'utf8'
            )
            const entry: string = await readFile(
                path.join(packageDir, 'src/index.ts'),
                'utf8'
            )
            const config: string = await readFile(
                path.join(packageDir, 'nitro.json'),
                'utf8'
            )

            expect(packageJson.devDependencies['nitro-core']).toBe(
                '1.0.0-alpha.nightly.84.gc5ad5050ce94'
            )
            expect(packageJson.devDependencies.nitrogen).toBe(
                packageJson.devDependencies['nitro-core']
            )
            expect(
                packageJson.devDependencies['react-native-nitro-modules']
            ).toBe(packageJson.devDependencies['nitro-core'])
            expect(packageJson.devDependencies['react-native']).toBe('0.88.0')
            expect(
                packageJson.peerDependenciesMeta['nitro-core'].optional
            ).toBe(true)
            expect(
                packageJson.peerDependenciesMeta['react-native-nitro-modules']
                    .optional
            ).toBe(true)
            expect(packageJson.imports['#nitro/*']).toBe(
                './nitrogen/generated/shared/javascript/*.cjs'
            )
            expect(packageJson.main).toBe('./lib/module/index.js')
            expect(packageJson['react-native']).toBe(packageJson.main)
            expect(config).not.toContain('autolinking')
            expect(packageJson.scripts.postcodegen).toBeUndefined()
            expect(packageJson.scripts.codegen).not.toContain('post-script')
            await expect(
                stat(path.join(packageDir, 'post-script.js'))
            ).rejects.toMatchObject({ code: 'ENOENT' })
            expect(spec).toContain("export * from '#nitro/Sample'")
            for (const decorator of ['iOS', 'Android']) {
                expect(spec.includes(`@${decorator}(`)).toBe(
                    scenario.decorators.includes(decorator)
                )
            }

            if (scenario.packageType === 'module') {
                expect(spec).toContain(
                    'export declare class Sample extends HybridObject'
                )
                expect(spec).toContain(
                    'sum(num1: number, num2: number): number'
                )
                expect(spec).toContain('constructor()')
                expect(spec).not.toContain('static sum')
                expect(entry).toBe(
                    "import { Sample as SampleHybrid } from './specs/sample.nitro'\n\nexport const Sample = new SampleHybrid()\n"
                )
                for (const nativeFile of scenario.nativeFiles) {
                    const native: string = await readFile(
                        path.join(packageDir, nativeFile),
                        'utf8'
                    )
                    if (nativeFile.endsWith('.swift')) {
                        expect(native).toContain('  func sum')
                        expect(native).not.toContain('static func sum')
                    }
                    if (nativeFile.endsWith('.kt')) {
                        expect(native).not.toContain('companion object')
                        expect(native).toContain(
                            'package com.margelo.nitro.sample'
                        )
                        expect(native).toContain('override fun sum')
                    }
                    if (nativeFile.endsWith('.hpp')) {
                        expect(native).toContain(
                            'double sum(double a, double b) override;'
                        )
                        expect(native).not.toContain('static double sum')
                        expect(native).not.toContain('HybridObject(TAG)')
                        expect(spec).toContain(
                            'include: \'"HybridSample.hpp"\''
                        )
                    }
                }
            } else {
                expect(spec).toContain(
                    'export declare class Sample extends HybridView'
                )
                expect(spec).not.toContain('constructor(')
                expect(entry).toContain('SampleComponent as Sample')
                expect(entry).toContain('Sample as SampleRef')
                expect(entry).not.toContain('getHostComponent')
            }

            if (scenario.decorators.includes('iOS')) {
                expect(packageJson.swiftpmConfig).toEqual({
                    name: 'Sample',
                    dependencies: ['react-native-nitro-modules'],
                })
                expect(packageJson.files).toContain('Package.swift')
                const manifest: string = await readFile(
                    path.join(packageDir, 'Package.swift'),
                    'utf8'
                )
                expect(manifest).toContain('swift-tools-version: 6.4')
                expect(manifest).toContain(
                    'addNitrogenTargets(to: package, swiftSources: ["apple"])'
                )
                expect(packageJson.files).toContain('apple/**/*.swift')
                await expect(
                    stat(path.join(packageDir, 'ios'))
                ).rejects.toMatchObject({
                    code: 'ENOENT',
                })
                const podspec: string = await readFile(
                    path.join(packageDir, 'Sample.podspec'),
                    'utf8'
                )
                expect(podspec).not.toContain('add_nitrogen_files')
            } else {
                expect(packageJson.swiftpmConfig).toBeUndefined()
                await expect(
                    stat(path.join(packageDir, 'Package.swift'))
                ).rejects.toMatchObject({ code: 'ENOENT' })
            }
            if (scenario.decorators.includes('Android')) {
                const adapter: string = await readFile(
                    path.join(
                        packageDir,
                        'android/src/main/cpp/cpp-adapter.cpp'
                    ),
                    'utf8'
                )
                expect(adapter).toContain(
                    '#include <Sample/private/SampleOnLoad.hpp>'
                )
            }
        }
    )
})
