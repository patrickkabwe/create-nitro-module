#!/usr/bin/env node

import { Command } from "commander";
import packageJson from "../package.json" assert { type: "json" };
import { createModule, generateModule } from "./create.js";

const program = new Command();
program
  .name("create-nitro-modules")
  .description(packageJson.description)
  .version("Create nitro version: 0.1.0", "-v, --version")
  .option(
    "-p, --platform <type>",
    "specify type of platform can be ios or android or both"
  )
  .option("-n, --name <string>", "specify the name of nitro module")
  .action(createModule);

program
  .command("generate <name>")
  .description("generate a hybrid object into the package directory")
  .action(generateModule);

program.parse();
