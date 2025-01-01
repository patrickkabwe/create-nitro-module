#!/usr/bin/env node

import { Command } from 'commander'
import packageJson from '../package.json'
import { createModule } from './create'

const program = new Command()
program
    .name(packageJson.name)
    .description(packageJson.description)
    .version(`CLI Version: ${packageJson.version}`, '-v, --version')
    .argument('[name]', 'Name of the module to create')
    .option(
        '-d, --module-dir <moduleDirectory>',
        'Directory to create the module in'
    )
    .option('-s, --skip-example', 'Skip example app generation')
    .option('-si, --skip-install', 'Skip installing dependencies')
    .action(createModule)

program
    .command('create [moduleName]')
    .description(
        'create a new nitro module. If no moduleName is provided, you will be prompted for one.'
    )
    .action(createModule)
    .option(
        '-d, --module-dir <moduleDirectory>',
        'Directory to create the module in'
    )
    .option('-s, --skip-example', 'Skip example app generation')
    .option('-si, --skip-install', 'Skip installing dependencies')

program.allowUnknownOption().parse(process.argv)
