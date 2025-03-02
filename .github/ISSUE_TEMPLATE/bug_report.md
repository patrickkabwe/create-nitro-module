---
name: Bug report
about: Create a report to help us improve
title: 'Module creation fails with mixed-case module names'
labels: bug
assignees: patrickkabwe
---

**Describe the bug**
When attempting to create a new Nitro module with a mixed-case name (e.g., "MediaKit"), the CLI rejects the name but doesn't provide a helpful error message explaining that only lowercase names are allowed.

**To Reproduce**
Steps to reproduce the behavior:

1. Install nitro-cli globally
2. Run `nitro create MyModule`
3. The command fails with an error message that doesn't clearly explain the lowercase naming requirement
4. See error: `Invalid module name: Module name should be lowercase`

**Expected behavior**
The CLI should either:

1. Automatically convert the module name to lowercase and inform the user, or
2. Provide a more descriptive error message explaining the naming conventions (e.g., "Module names must be lowercase, contain only letters, numbers, and hyphens. Example: 'media-kit' or 'mediakit'")

**Screenshots**
N/A

**Additional context**
This can be confusing for new users who are used to PascalCase naming conventions in JavaScript/TypeScript projects. The same issue occurs when users try to use namespaced packages like "@org/module-name" or when they include the "react-native-" prefix manually.

This affects both direct CLI usage via command line arguments and the interactive prompt mode.
