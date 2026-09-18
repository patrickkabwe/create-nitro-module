const path = require('node:path')

const semanticRelease = require(
    path.join(process.cwd(), 'node_modules/semantic-release')
).default
const releaseConfig = require(
    process.env.PRERELEASE_CONFIG ??
        path.join(process.cwd(), 'release.prerelease.config.cjs')
)

const args = new Set(process.argv.slice(2))

semanticRelease({
    ...releaseConfig,
    dryRun: args.has('--dry-run'),
    noCi: args.has('--no-ci'),
}).catch(error => {
    console.error(error)
    process.exitCode = 1
})
