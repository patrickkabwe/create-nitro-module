const path = require('node:path')

const releaseConfig = require(path.join(process.cwd(), 'release.config.cjs'))

const allowedBranches = new Set(['main', 'next'])
const releaseBranch = process.env.PRERELEASE_BRANCH

if (releaseBranch == null || releaseBranch.length === 0) {
    throw new Error('PRERELEASE_BRANCH must be set to main or next')
}

if (!allowedBranches.has(releaseBranch)) {
    throw new Error(
        `Unsupported prerelease branch: ${releaseBranch}. Expected main or next.`
    )
}

/**
 * @type {import('semantic-release').GlobalConfig}
 */
module.exports = {
    ...releaseConfig,
    branches:
        releaseBranch === 'main'
            ? [{ name: 'main', channel: 'next', prerelease: 'next' }, 'next']
            : ['main', { name: 'next', channel: 'next', prerelease: 'next' }],
}
