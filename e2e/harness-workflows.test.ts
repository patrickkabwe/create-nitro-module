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
    readonly name: string
    readonly devDependencies?: Record<string, string>
    readonly scripts?: Record<string, string>
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
    const iosDir: string = path.join(rootDir, 'example', 'ios')
    const project: string | undefined = (await readdir(iosDir)).find(name =>
        name.endsWith('.xcodeproj')
    )
    expect(project).toBeDefined()
    const xcodeProject: string = await readText(
        path.join(iosDir, project!, 'project.pbxproj')
    )
    expect(xcodeProject).toContain('IPHONEOS_DEPLOYMENT_TARGET = 16.0;')
    expect(xcodeProject).not.toContain('IPHONEOS_DEPLOYMENT_TARGET = 15.1;')
    const examplePackageJson = JSON.parse(
        await readText(path.join(rootDir, 'example', 'package.json'))
    ) as PackageJson
    const scripts = examplePackageJson.scripts

    expect(scripts?.spm).toBe(
        'node ./harness-spm/setup.mjs && react-native spm'
    )
    expect(scripts?.pod).toBeUndefined()
    expect(scripts?.['test:harness']).toBe('react-native-harness')
    expect(scripts?.['test:harness:android']).toBe(
        'react-native-harness --harnessRunner android'
    )
    expect(scripts?.['test:harness:ios']).toBe(
        'react-native-harness --harnessRunner ios'
    )
    expect(
        examplePackageJson.devDependencies?.['@react-native-harness/ui']
    ).toBe('1.6.0')
    expect(
        await readText(
            path.join(rootDir, 'example', 'harness-spm', 'Package.swift')
        )
    ).toContain('name: "HarnessUI"')
    expect(
        await readText(
            path.join(rootDir, 'example', 'harness-spm', 'setup.mjs')
        )
    ).toContain('copyFile')
}

const assertTemplateDependencyVersions = async (
    rootDir: string,
    packagePath: string
): Promise<void> => {
    const packageJson = JSON.parse(
        await readText(path.join(rootDir, packagePath, 'package.json'))
    ) as PackageJson
    const devDependencies = packageJson.devDependencies

    expect(devDependencies?.['nitro-core']).toBe(
        '1.0.0-alpha.nightly.84.gc5ad5050ce94'
    )
    expect(devDependencies?.nitrogen).toBe(
        '1.0.0-alpha.nightly.84.gc5ad5050ce94'
    )
    expect(devDependencies?.['react-native']).toBe('0.88.0')
    expect(devDependencies?.['react-native-nitro-modules']).toBe(
        '1.0.0-alpha.nightly.84.gc5ad5050ce94'
    )
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
    const releaseWorkflow = await readText(
        path.join(expectation.rootDir, '.github', 'workflows', 'release.yml')
    )
    const iosSetup: string = await readText(
        path.join(
            expectation.rootDir,
            '.github',
            'scripts',
            'prepare-ios-harness.sh'
        )
    )
    expect(iosSetup).toContain('xcrun simctl install')
    expect(iosWorkflow).toContain(
        'bash .github/scripts/prepare-ios-harness.sh example 27.0'
    )
    expect(iosWorkflow.indexOf('name: Prepare iOS Harness app')).toBeLessThan(
        iosWorkflow.indexOf('- name: Run React Native Harness')
    )

    for (const workflow of [
        androidBuildWorkflow,
        iosBuildWorkflow,
        androidWorkflow,
        iosWorkflow,
        releaseWorkflow,
    ]) {
        const installStep = workflow.indexOf('run: bun install')
        const codegenStep = workflow.indexOf('run: bun run codegen')
        expect(installStep).toBeGreaterThan(-1)
        expect(codegenStep).toBeGreaterThan(installStep)
        expect(workflow).toContain("node-version: '24'")
        expect(workflow).not.toContain('codegen && bun run build')
    }
    for (const workflow of [androidBuildWorkflow, iosBuildWorkflow]) {
        expect(workflow).toContain("'**/package.json'")
        expect(workflow).toContain(expectation.harnessWorkflowPath)
    }
    expect(androidWorkflow.indexOf('run: bun run codegen')).toBeLessThan(
        androidWorkflow.indexOf('name: Build Android app')
    )
    expect(iosWorkflow.indexOf('run: bun run codegen')).toBeLessThan(
        iosWorkflow.indexOf('name: Set up Swift Package Manager')
    )
    expect(releaseWorkflow.indexOf('run: bun run codegen')).toBeLessThan(
        releaseWorkflow.indexOf('run: bun release')
    )

    expect(androidWorkflow).toContain(
        'uses: callstackincubator/react-native-harness@v1.6.0'
    )
    expect(androidWorkflow).toContain('chmod +x ./gradlew')
    expect(androidWorkflow).toContain('projectRoot: example')
    expect(iosWorkflow).toContain(
        'uses: callstackincubator/react-native-harness@v1.6.0'
    )
    expect(iosWorkflow).toContain('projectRoot: example')
    expect(androidWorkflow).toContain(expectation.harnessWorkflowPath)
    expect(iosWorkflow).toContain(expectation.harnessWorkflowPath)
    expect(androidBuildWorkflow).toContain(expectation.androidBuildWorkflowPath)
    expect(iosBuildWorkflow).toContain(expectation.iosBuildWorkflowPath)
    expect(iosBuildWorkflow).not.toContain('$$exampleApp$$')
    expect(iosBuildWorkflow).toContain('run codegen')
    expect(iosBuildWorkflow).toContain('run spm')
    expect(iosBuildWorkflow).toContain('.xcodeproj')
    expect(iosBuildWorkflow).not.toContain('pod install')
    expect(iosWorkflow).toContain('run spm')
    expect(iosWorkflow).not.toContain('.xcworkspace')
    for (const workflow of [androidWorkflow, iosWorkflow]) {
        expect(workflow).toContain(
            'harnessArgs: --json --outputFile=harness-results.json'
        )
        expect(workflow).toContain(
            'name: Upload Harness evidence\n        if: always()'
        )
        expect(workflow).toContain('example/__tests__/__image_snapshots__/')
        expect(workflow).toContain('example/harness-results.json')
        expect(workflow).toContain('include-hidden-files: true')
    }
}

const assertHarnessConfigContent = async (rootDir: string): Promise<void> => {
    const harnessConfig = await readText(
        path.join(rootDir, 'example', 'rn-harness.config.mjs')
    )

    expect(harnessConfig).toContain('platformReadyTimeout: 600000')
    expect(harnessConfig).toContain('bridgeTimeout: 300000')
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
    expect(harnessTest).toContain('await screen.screenshot(view)')
    expect(harnessTest).toContain(`name: '${testID}-native-view'`)
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
        const moduleTest = await readText(
            path.join(
                project.rootDir,
                'example',
                '__tests__',
                'rootharness.harness.tsx'
            )
        )
        expect(moduleTest).toContain('expect(result).toBe(3)')
        expect(moduleTest).toContain('1 + 2 = {result}')
        expect(moduleTest).toContain('await screen.screenshot(view)')
        expect(moduleTest).toContain("name: 'rootharness-module-result'")

        await assertWorkflowFiles(project.rootDir)
        await assertHarnessScripts(project.rootDir)
        await assertTemplateDependencyVersions(project.rootDir, '.')
        await assertHarnessConfigContent(project.rootDir)
        await assertHarnessWorkflowContent({
            androidBuildWorkflowPath: 'android/**',
            harnessWorkflowPath: 'src/**',
            iosBuildWorkflowPath: 'apple/**',
            rootDir: project.rootDir,
        })
    }, 120_000)

    test('generates build and harness workflows for the monorepo project layout', async () => {
        const project = await createProject('monoharness', true, 'module')
        const packagePath = `packages/react-native-${project.packageName}`
        const workspacePackage = JSON.parse(
            await readText(path.join(project.rootDir, 'package.json'))
        ) as PackageJson
        const libraryPackage = JSON.parse(
            await readText(
                path.join(project.rootDir, packagePath, 'package.json')
            )
        ) as PackageJson

        expect(workspacePackage.name).not.toBe(libraryPackage.name)

        await assertWorkflowFiles(project.rootDir)
        await assertHarnessScripts(project.rootDir)
        await assertTemplateDependencyVersions(project.rootDir, packagePath)
        await assertHarnessConfigContent(project.rootDir)
        await assertHarnessWorkflowContent({
            androidBuildWorkflowPath: `${packagePath}/android/**`,
            harnessWorkflowPath: `${packagePath}/src/**`,
            iosBuildWorkflowPath: `${packagePath}/apple/**`,
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
