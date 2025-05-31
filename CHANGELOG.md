## [2.0.0-next.2](https://github.com/patrickkabwe/create-nitro-module/compare/v2.0.0-next.1...v2.0.0-next.2) (2025-05-31)

### 🐛 Bug Fixes

* ensure newline at end of package.json file ([b5d2d47](https://github.com/patrickkabwe/create-nitro-module/commit/b5d2d4761e040e53f34b1c4c7c2e738d14fab589))

### 🔄 Code Refactors

* standardize naming from moduleName to packageName across the codebase ([8df59bd](https://github.com/patrickkabwe/create-nitro-module/commit/8df59bdcebfff7e717d4e5aabb2636c60e50bf70))
* update Nitro module creation to use packageName instead of moduleName ([83207f9](https://github.com/patrickkabwe/create-nitro-module/commit/83207f9e368f984665120e1287ef7880767216f2))

### 📚 Documentation

* add Semantic Release mention to README and documentation ([e81ba14](https://github.com/patrickkabwe/create-nitro-module/commit/e81ba14cf74a344dda19280297e51efabb8be986))

### 🛠️ Other changes

* add Act configuration and update GitHub workflows ([57ffaff](https://github.com/patrickkabwe/create-nitro-module/commit/57ffaff17564446774dcacbe0284c4dd44828021))
* add Act configuration and update GitHub workflows ([9a0dc4f](https://github.com/patrickkabwe/create-nitro-module/commit/9a0dc4fb7b700bb0963d73f840b465ada8c9d80c))
* add Act configuration and update GitHub workflows ([d1800ce](https://github.com/patrickkabwe/create-nitro-module/commit/d1800ce807c98f65c0c28a32ebcaafe52b9f8b36))
* add Act configuration and update GitHub workflows ([9630cb8](https://github.com/patrickkabwe/create-nitro-module/commit/9630cb84ed352292ae38963a7b5e39f7494d514d))
* add Act configuration and update GitHub workflows ([7b901a5](https://github.com/patrickkabwe/create-nitro-module/commit/7b901a5fadb93e6b849b60fa61ff18e1873367e5))
* migrate from release-it to semantic-release for version management ([947b75a](https://github.com/patrickkabwe/create-nitro-module/commit/947b75a65bd3a23afd73f7bc4ed1e870ac2b284b))
* refine artifact naming in GitHub workflows for consistency ([0edc112](https://github.com/patrickkabwe/create-nitro-module/commit/0edc11218ef4246c8998cf015ce30d462ba892f1))
* remove generate-nitro-module and generate-nitro-views workflows from GitHub Actions ([15f3ad5](https://github.com/patrickkabwe/create-nitro-module/commit/15f3ad554c0ef7375e66c26aa7cae42ccb6e4417))
* remove npm from package manager matrix in GitHub workflows ([a5f2dd4](https://github.com/patrickkabwe/create-nitro-module/commit/a5f2dd4de11a999a71b752481454b665fe711b9f))
* rename generate-nitro-module to nitro-package ([7431ece](https://github.com/patrickkabwe/create-nitro-module/commit/7431ece019983664d2e9759710b5de025c572ea8))
* simplify artifact naming in GitHub workflows by removing package manager from the name ([1af2d24](https://github.com/patrickkabwe/create-nitro-module/commit/1af2d2497208c9dec6ceee2034d5b1c043ebee83))
* update artifact naming in GitHub workflows for clarity ([d0222f8](https://github.com/patrickkabwe/create-nitro-module/commit/d0222f815f487ffdec58088420e07287ce523fea))
* update artifact naming in GitHub workflows for clarity ([fa7b444](https://github.com/patrickkabwe/create-nitro-module/commit/fa7b4445648e331f9135a67546abe7c594c468a0))
* update artifact naming in GitHub workflows to include package manager in the name ([e8a88b5](https://github.com/patrickkabwe/create-nitro-module/commit/e8a88b5590b11f7ce63df2a444179ea5f74db6e2))
* update artifact naming in GitHub workflows to remove package manager from the name ([4cb84c6](https://github.com/patrickkabwe/create-nitro-module/commit/4cb84c6a585f3dfa1460d0d3a54ca3e335e82b57))
* update dependencies and refactor CLI entry points ([9078e13](https://github.com/patrickkabwe/create-nitro-module/commit/9078e13431cf1636dcb24bed4ad31ac98269ec9e))
* update GitHub workflow to support npm alongside bun and yarn ([a702640](https://github.com/patrickkabwe/create-nitro-module/commit/a70264080b1266a258a74476ca29bef3d26c1183))
* update publishConfig in package.json to set access to public ([ea03bb0](https://github.com/patrickkabwe/create-nitro-module/commit/ea03bb0e7ec62f2fc6ab61b639770680db4f6a7e))
* update workflow to conditionally use bun for npm package creation ([dbef309](https://github.com/patrickkabwe/create-nitro-module/commit/dbef3098b85fa0527289c0c9d3888a83989af2c5))
* use capitalize function ([b6e4e3e](https://github.com/patrickkabwe/create-nitro-module/commit/b6e4e3ed5bae6ec279626f825c501ae2e4fcd8ad))

## [2.0.0-next.1](https://github.com/patrickkabwe/create-nitro-module/compare/v1.8.11-next.3...v2.0.0-next.1) (2025-05-29)

### ⚠ BREAKING CHANGES

* use `@clack/prompts` to handle prompts

### ✨ Features

* use `@clack/prompts` to handle prompts ([31d414c](https://github.com/patrickkabwe/create-nitro-module/commit/31d414c376084d06afe181e01cff985870340524))

## [1.8.10](https://github.com/patrickkabwe/create-nitro-module/compare/v1.8.9...v1.8.10) (2025-05-29)

### 🛠️ Other changes

* **deps:** bump commander from 13.1.0 to 14.0.0 ([fefc5a7](https://github.com/patrickkabwe/create-nitro-module/commit/fefc5a7ffe2123745f91bb690e6ad6d8e5d89b69))
* **deps:** bump inquirer from 12.6.1 to 12.6.3 ([3635eb6](https://github.com/patrickkabwe/create-nitro-module/commit/3635eb696f69d3183d6f8625d8e0fe4776fb5aab))
* **deps:** bump tsup from 8.4.0 to 8.5.0 ([ae53634](https://github.com/patrickkabwe/create-nitro-module/commit/ae53634dd4f68a65299ba10d26027f404cb4855e))

## [1.8.9](https://github.com/patrickkabwe/create-nitro-module/compare/v1.8.8...v1.8.9) (2025-05-29)

### 🛠️ Other changes

* **deps-dev:** bump conventional-changelog-conventionalcommits ([e09671d](https://github.com/patrickkabwe/create-nitro-module/commit/e09671d0ba48809ab67a79b8aa7b17eb89b9bff2))

## [1.8.8](https://github.com/patrickkabwe/create-nitro-module/compare/v1.8.7...v1.8.8) (2025-05-25)

### 🛠️ Other changes

* **deps-dev:** bump eslint from 9.26.0 to 9.27.0 ([5849ca4](https://github.com/patrickkabwe/create-nitro-module/commit/5849ca45b9539400306968ad6e4b63d69a991604))
* **deps-dev:** bump semantic-release from 24.2.3 to 24.2.4 ([04db9cc](https://github.com/patrickkabwe/create-nitro-module/commit/04db9cc93df7a860ac25953c4e0b6cd26c1c5a08))

## [1.8.7](https://github.com/patrickkabwe/create-nitro-module/compare/v1.8.6...v1.8.7) (2025-05-24)

### 🛠️ Other changes

* **deps-dev:** bump @types/node from 22.15.17 to 22.15.21 ([422f1b9](https://github.com/patrickkabwe/create-nitro-module/commit/422f1b9cae7382d9ab5d4c823bb65bfd65b9d52b))

## [1.8.6](https://github.com/patrickkabwe/create-nitro-module/compare/v1.8.5...v1.8.6) (2025-05-19)

### 🐛 Bug Fixes

* release workflow ([2f8ddb8](https://github.com/patrickkabwe/create-nitro-module/commit/2f8ddb83c3b556754d704c24c19e8653303c2c53))
* release workflow ([1d76a6f](https://github.com/patrickkabwe/create-nitro-module/commit/1d76a6faa971c2c490c6484bffe565941917d826))

### 🛠️ Other changes

* update semantic-release configuration and dependencies ([f20c459](https://github.com/patrickkabwe/create-nitro-module/commit/f20c459c1b7db87b543edf28b6ff619b6816fc5d))

# create-nitro-module

## 1.7.4

### Patch Changes

- bf522ef: fix(win): rm not supported

## 1.7.3

### Patch Changes

- c6d46e6: post-script support for multiple auto linking config in nitro.json

## 1.7.2

### Patch Changes

- ad0494d: fix: intero require default issue

## 1.7.1

### Patch Changes

- 9dbb316: fix: view platform specific gen

## 1.7.0

### Minor Changes

- f93105b: feat: support nitro v0.24.1

## 1.6.1

### Patch Changes

- 1d18cd3: fix: npm support

## 1.6.0

### Minor Changes

- 70b8c55: feat: support generation of nitro views 🚀

## 1.5.0

### Minor Changes

- 6f62f69: feat: nitro-upgrade

## 1.4.0

### Minor Changes

- 56dc616: feat: upgrade to nitro v0.22.0

## 1.3.0

### Minor Changes

- 3d18ee1: feat: generates github action for the package

## 1.2.0

### Minor Changes

- 1cb1b68: chore: remove support for pnpm and update docs
  chore: use bun.lock
  fix(android): app:mergeLibDexDebug
  chore: remove unused files
  fix: correct order of next steps
  chore: formatting
  fix(yarn): use codegen to run postscript
  chore: use codegen to run postscript
  feat: add yarn workflow

## 1.1.0

### Minor Changes

- 0aae71f: feat: add support for rn 0.77.0

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
