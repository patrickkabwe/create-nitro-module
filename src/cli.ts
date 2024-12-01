#!/usr/bin/env node

import { Command } from 'commander'
import packageJson from '../package.json'
import { createModule, generateModule } from './create.js'

const program = new Command()
program
  .name('nitro-module')
  .description(packageJson.description)
  .version('Create nitro version: 0.1.0', '-v, --version')
  .action(createModule)

program
  .command('create [moduleName]')
  .description(
    'create a new nitro module. If no moduleName is provided, you will be prompted for one.'
  )
  .action(createModule)

program
  .command('generate <moduleName>')
  .description('generate a hybrid object into the package directory')
  .action(generateModule)

program.allowUnknownOption().parse(process.argv)
