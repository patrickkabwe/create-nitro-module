import { readFile } from "fs/promises";
import path from "path";
import { cppCode, hppCode } from "../code-snippets/code.cpp";
import { FileGenerator, GenerateModuleConfig, SupportedPlatform } from "../types";
import { createFolder, createModuleFile, toPascalCase } from "../utils";
import { AndroidFileGenerator } from "./android-file-generator";
import { IOSFileGenerator } from "./ios-file-generator";

export class CppFileGenerator implements FileGenerator {
    constructor(private fileGenerators: FileGenerator[]) { }

    async generate(config: GenerateModuleConfig): Promise<void> {
        await createFolder(config.cwd, 'cpp');
        await this.generateCppCodeFiles(config);

        for (const generator of this.fileGenerators) {
            if (generator instanceof AndroidFileGenerator && config.platforms.includes(SupportedPlatform.ANDROID)) {
                await generator.generate(config);
                // add generate objects to CMakeLists.txt
                const cmakeListsPath = path.join(config.cwd, 'android', 'CMakeLists.txt');
                let cmakeListsContent = await readFile(cmakeListsPath, { encoding: 'utf-8' });

                cmakeListsContent = cmakeListsContent.replace('src/main/cpp/cpp-adapter.cpp', '')
                cmakeListsContent = cmakeListsContent.replace(
                    'add_library(${PACKAGE_NAME} SHARED',
                    "add_library(${PACKAGE_NAME} SHARED \n\t" +
                    `src/main/cpp/cpp-adapter.cpp\n\t../cpp/Hybrid${toPascalCase(config.moduleName)}.cpp\n\t../cpp/Hybrid${toPascalCase(config.moduleName)}.hpp`);

                await createModuleFile(config.cwd, 'android/CMakeLists.txt', cmakeListsContent);
            } else if (generator instanceof IOSFileGenerator && config.platforms.includes(SupportedPlatform.IOS)) {
                await generator.generate(config);
            } else {
                throw new Error("Unsupported platform");
            }
        }
    }

    async generateCppCodeFiles(config: GenerateModuleConfig) {
        const cppPath = path.join('cpp', `Hybrid${toPascalCase(config.moduleName)}.cpp`)
        const hppPath = path.join('cpp', `Hybrid${toPascalCase(config.moduleName)}.hpp`)
        await createModuleFile(
            config.cwd,
            cppPath,
            cppCode(toPascalCase(config.moduleName), `${config.funcName}`)
        )

        await createModuleFile(
            config.cwd,
            hppPath,
            hppCode(toPascalCase(config.moduleName), `${config.funcName}`)
        )
    }
}