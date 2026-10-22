import { copyFile, readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

const exampleManifestUrl = new URL('../package.json', import.meta.url)
const require = createRequire(exampleManifestUrl)
const uiManifestPath = require.resolve('@react-native-harness/ui/package.json')
const { version } = JSON.parse(await readFile(uiManifestPath, 'utf8'))
const expected = '1.6.0'

if (version !== expected) {
    throw new Error(
        `Harness UI SwiftPM support requires ${expected}; installed ${version}`
    )
}

await Promise.all(
    ['Package.swift', 'react-native-spm-prefix.h'].map(file =>
        copyFile(
            new URL(file, import.meta.url),
            join(dirname(uiManifestPath), file)
        )
    )
)
