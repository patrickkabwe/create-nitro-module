# create-nitro-module

## 1.0.3

### Patch Changes

- 97d9762: chore: upgrade to nitro 0.21.0

## 1.0.2

### Patch Changes

- 53da891: fix: support yarn workspaces using yarn v3
  chore: improve dependency installation

## 1.0.1

### Patch Changes

- 614095c: fix - failed to copy .gitignore

## 1.0.0

### Major Changes

- 7e2456d: ### Major Changes

    #### Features

    - Added template to assets
    - Added generate-nitro-module functionality
    - Added new `--skip-install` flag to skip dependency installation

    #### Documentation

    - Improved documentation

    #### Refactoring

    - Organized code structure
    - Added file generator for each language

    #### Bug Fixes

    - Fixed ignore paths

    #### Other

    - Removed nitro-schema.json
    - Updated naming convention to follow nitro standards

## 0.20.2

### Patch Changes

- 3684e69: feat: reduce cli npm size by ignoring the `nitro-module-cli.gif`
  fix: no such file or directory error

## 0.20.1

### Patch Changes

- 823f643: docs: adds docs url and updates readme docs

## 0.20.0

### Minor Changes

- 604ef36: - feat: add support for --module-dir
    - feat: add support for --skip-example

## 0.19.0

### Minor Changes

- afb99f0: - feat(BREAKING CHANGE): generate root module folder
    - feat: add nitro schema url
    - feat: upgrade rn version
    - chore: remove unnecessary packages
    - feat: remove hybridContext and memorySize from swift example 😍
    - feat: generate example app based on module name 🚀
    - feat: `bun create nitro-module <moduleName>` now works!! 🚀

## 0.18.8

### Patch Changes

- fb67977: fix: linking issue when using a custom android package name

## 0.18.7

### Patch Changes

- 89dba2d: fix assets folder not found

## 0.18.6

### Patch Changes

- a50e84c: - fix: nitro tags
    - chore: prefix lib name with react-native-
    - fix: windows paths
    - feat: adds react-native.config.js to locally autolink the module

## 0.18.5

### Patch Changes

- b0789c4: add git urls to package.json

## 0.18.4

### Patch Changes

- 32b9edb: - Fix build issue on android
    - Adds new confirmation question
    - Adds nitro-spinner
    - Refactor cli

## 0.18.3

### Patch Changes

- 1272085: adds nitro-module gif file and modifies docs

## 0.18.2

### Patch Changes

- 96e751f: - Fix bug where `bun create nitro-module [name]` was not working
    - Minify the tsconfig file
    - Update eslint rules to meet project needs

## 0.18.1

### Patch Changes

- 4d882b0: add npm keywords and adds read and write permission to the release gha

## 0.18.0

### Minor Changes

- initial release
