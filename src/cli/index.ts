#!/usr/bin/env node

import { Command } from 'commander'
import packageJson from '../../package.json'
import { createModule } from './create'

const program = new Command()
program
    .name(packageJson.name)
    .description(packageJson.description)
    .version(`CLI Version: ${packageJson.version}`, '-v, --version')
    .argument('[name]', 'name of the module to create')
    .option(
        '-d, --module-dir <moduleDirectory>',
        'directory to create the module in'
    )
    .option('-e, --skip-example', 'skip example app generation')
    .option('-i, --skip-install', 'skip installing dependencies')
    .option('--ci', 'run in CI mode')
    .action(createModule)

program.allowUnknownOption().parse(process.argv)
