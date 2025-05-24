#!/usr/bin/env node

import { Command } from 'commander'
import packageJson from '../package.json'
import { createModule } from './create'
import { newModule } from './new'

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
    .action(createModule)

program
    .command('new')
    .description(
        'generates files and autolinking config for a nitro module or view with the given name within the current directory'
    )
    .argument('<type>', 'type of the module to create. (module, view)')
    .argument(
        '<name>',
        'name of the module to create. (e.g. CameraView or camera-view)'
    )
    .option(
        '-d, --module-dir <moduleDirectory>',
        'directory to create the module in'
    )
    .option(
        '-p, --platform <platform>',
        'platform to create the module for. (android, ios)'
    )
    .option(
        '-l, --language <language>',
        'language to create the module for. (swift, kotlin, cpp)'
    )
    .action(newModule)

// nitro-module new view BackCamera
// nitro-module new module BackCamera

// nitro-module new view BackCamera --module-dir ./modules

program.allowUnknownOption().parse(process.argv)
