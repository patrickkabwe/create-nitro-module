import { afterAll, describe, expect, test } from 'bun:test'
import { execFile } from 'node:child_process'
import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'

type GeneratedProject = {
    readonly packageName: string
    readonly rootDir: string
}

type WorkflowExpectation = {
    readonly androidBuildWorkflowPath: string
    readonly iosBuildWorkflowPath: string
    readonly harnessWorkflowPath: string
    readonly rootDir: string
}

type PackageJson = {
    readonly devDependencies?: Record<string, string>
}

const execFileAsync = promisify(execFile)
const generatedRoots: string[] = []

const createProject = async (
    packageName: string,
    monorepo: boolean,
    packageType: 'module' | 'view'
): Promise<GeneratedProject> => {
    const rootDir = await mkdtemp(path.join(os.tmpdir(), 'nitro-cli-e2e-'))
    generatedRoots.push(rootDir)
    const gitConfigPath = path.join(rootDir, 'gitconfig')

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
        packageName,
        '--module-dir',
        rootDir,
        '--platforms',
        'ios,android',
        '--langs',
        'swift,kotlin',
        '--include-harness',
        '--skip-install',
        '--ci',
        '--package-type',
        packageType,
    ]

    if (monorepo) {
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

    return {
        packageName,
        rootDir: path.join(rootDir, `react-native-${packageName}`),
    }
}

const readText = async (filePath: string): Promise<string> =>
    await readFile(filePath, { encoding: 'utf8' })

const assertWorkflowFiles = async (rootDir: string): Promise<void> => {
    const workflowDir = path.join(rootDir, '.github', 'workflows')
    const workflowFiles = await readdir(workflowDir)

    expect(workflowFiles.toSorted()).toEqual([
        'android-build.yml',
        'harness-android.yml',
        'harness-ios.yml',
        'ios-build.yml',
        'release.yml',
    ])
}

const assertHarnessScripts = async (rootDir: string): Promise<void> => {
    const examplePackageJson = JSON.parse(
        await readText(path.join(rootDir, 'example', 'package.json'))
    ) as { readonly scripts?: Record<string, string> }
    const scripts = examplePackageJson.scripts

    expect(scripts?.['test:harness']).toBe('react-native-harness')
    expect(scripts?.['test:harness:android']).toContain(
        'chmod +x android/gradlew'
    )
    expect(scripts?.['test:harness:android']).toContain(
        'react-native-harness --harnessRunner android'
    )
    expect(scripts?.['test:harness:ios']).toContain(
        'react-native-harness --harnessRunner ios'
    )
}

const assertTemplateDependencyVersions = async (
    rootDir: string,
    packagePath: string
): Promise<void> => {
    const packageJson = JSON.parse(
        await readText(path.join(rootDir, packagePath, 'package.json'))
    ) as PackageJson
    const devDependencies = packageJson.devDependencies

    expect(devDependencies?.nitrogen).toBe('^0.37.1')
    expect(devDependencies?.['react-native']).toBe('0.87.1')
    expect(devDependencies?.['react-native-nitro-modules']).toBe('^0.37.1')
}

const assertHarnessWorkflowContent = async (
    expectation: WorkflowExpectation
): Promise<void> => {
    const androidBuildWorkflow = await readText(
        path.join(
            expectation.rootDir,
            '.github',
            'workflows',
            'android-build.yml'
        )
    )
    const iosBuildWorkflow = await readText(
        path.join(expectation.rootDir, '.github', 'workflows', 'ios-build.yml')
    )
    const androidWorkflow = await readText(
        path.join(
            expectation.rootDir,
            '.github',
            'workflows',
            'harness-android.yml'
        )
    )
    const iosWorkflow = await readText(
        path.join(
            expectation.rootDir,
            '.github',
            'workflows',
            'harness-ios.yml'
        )
    )

    expect(androidWorkflow).toContain(
        'uses: callstackincubator/react-native-harness@v1.2.0'
    )
    expect(androidWorkflow).toContain('chmod +x ./gradlew')
    expect(androidWorkflow).toContain('projectRoot: example')
    expect(iosWorkflow).toContain(
        'uses: callstackincubator/react-native-harness@v1.2.0'
    )
    expect(iosWorkflow).toContain('projectRoot: example')
    expect(androidWorkflow).toContain(expectation.harnessWorkflowPath)
    expect(iosWorkflow).toContain(expectation.harnessWorkflowPath)
    expect(androidBuildWorkflow).toContain(expectation.androidBuildWorkflowPath)
    expect(iosBuildWorkflow).toContain(expectation.iosBuildWorkflowPath)
    expect(iosBuildWorkflow).not.toContain('$$exampleApp$$')
}

const assertHarnessConfigContent = async (rootDir: string): Promise<void> => {
    const harnessConfig = await readText(
        path.join(rootDir, 'example', 'rn-harness.config.mjs')
    )

    expect(harnessConfig).toContain('platformReadyTimeout: 600000')
    expect(harnessConfig).toContain('bridgeTimeout: 300000')
}

const assertMetroConfigContent = async (rootDir: string): Promise<void> => {
    const metroConfig = await readText(
        path.join(rootDir, 'example', 'metro.config.js')
    )

    expect(metroConfig).toContain('unstable_enablePackageExports: false')
}

const assertHarnessViewTestContent = async (
    rootDir: string,
    harnessFileName: string,
    testID: string
): Promise<void> => {
    const harnessTest = await readText(
        path.join(
            rootDir,
            'example',
            '__tests__',
            `${harnessFileName}.harness.tsx`
        )
    )

    expect(harnessTest).toContain(
        "import { StyleSheet, View } from 'react-native'"
    )
    expect(harnessTest).toContain('collapsable={false}')
    expect(harnessTest).toContain(`testID="${testID}"`)
}

afterAll(async () => {
    await Promise.all(
        generatedRoots.map(rootDir =>
            rm(rootDir, { recursive: true, force: true })
        )
    )
})

describe('React Native Harness workflow generation', () => {
    test('generates build and harness workflows for the default project layout', async () => {
        const project = await createProject('rootharness', false, 'module')

        await assertWorkflowFiles(project.rootDir)
        await assertHarnessScripts(project.rootDir)
        await assertTemplateDependencyVersions(project.rootDir, '.')
        await assertHarnessConfigContent(project.rootDir)
        await assertMetroConfigContent(project.rootDir)
        await assertHarnessWorkflowContent({
            androidBuildWorkflowPath: 'android/**',
            harnessWorkflowPath: 'src/**',
            iosBuildWorkflowPath: 'ios/**',
            rootDir: project.rootDir,
        })
    }, 120_000)

    test('generates build and harness workflows for the monorepo project layout', async () => {
        const project = await createProject('monoharness', true, 'module')
        const packagePath = `packages/react-native-${project.packageName}`

        await assertWorkflowFiles(project.rootDir)
        await assertHarnessScripts(project.rootDir)
        await assertTemplateDependencyVersions(project.rootDir, packagePath)
        await assertHarnessConfigContent(project.rootDir)
        await assertMetroConfigContent(project.rootDir)
        await assertHarnessWorkflowContent({
            androidBuildWorkflowPath: `${packagePath}/android/**`,
            harnessWorkflowPath: `${packagePath}/src/**`,
            iosBuildWorkflowPath: `${packagePath}/ios/**`,
            rootDir: project.rootDir,
        })
    }, 120_000)

    test('generates stable harness test queries for native views', async () => {
        const project = await createProject('viewharness', false, 'view')

        await assertHarnessViewTestContent(
            project.rootDir,
            'viewharness',
            'viewharness'
        )
    }, 120_000)
})
