import { exec } from "node:child_process";
import {
  access,
  copyFile,
  mkdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import util from "node:util";
import packageJsonFile from "./assets/package.json" assert { type: "json" };
import tsconfigFile from "./assets/tsconfig.json" assert { type: "json" };
import workspacePackageJsonFile from "./assets/workspace-package.json" assert { type: "json" };
import { androidManifestCode, getKotlinCode } from "./code.android.js";
import { getSwiftCode } from "./code.ios.js";
import { appExampleCode, exportCode, specCode } from "./code.js.js";
import {
  ANDROID_CXX_LIB_NAME_TAG,
  ANDROID_NAME_SPACE_TAG,
  CXX_NAME_SPACE_TAG,
  IOS_MODULE_NAME_TAG,
} from "./constants.js";
import {
  generateAutolinking,
  getGitUserInfo,
  mapPlatformToLanguage,
  replaceTag,
  toPascalCase,
} from "./utils.js";

const execAsync = util.promisify(exec);

export enum SupportedLang {
  SWIFT = "swift",
  KOTLIN = "kotlin",
  CPP = "c++",
}

export enum SupportedPlatform {
  IOS = "ios",
  ANDROID = "android",
}

type Generate = {
  pm: "bun" | "pnpm" | "yarn" | "npm";
  moduleName: string;
  langs: SupportedLang[];
  platforms: SupportedPlatform[];
};

type PlatformLang = {
  langs: SupportedLang[];
  platforms: SupportedPlatform[];
};

class FileGenerator {
  private tmpDir: string;
  private cwd = process.cwd();
  private packagePrefix = "react-native-";
  private moduleName: string;
  private androidPackageName: string;

  constructor() {}

  public async generate({ moduleName, langs, platforms, pm }: Generate) {
    this.tmpDir = `/tmp/${moduleName}`;
    this.moduleName = moduleName;
    this.androidPackageName = `com.${this.moduleName.toLowerCase()}`;

    await this.generateFolder();
    await this.cloneNitroTemplate();
    await this.copyFiles();
    await this.generateNitroJson({ platforms, langs });
    if (
      !langs.includes(SupportedLang.KOTLIN) ||
      !langs.includes(SupportedLang.CPP)
    ) {
      await this.generatePodJson();
      await this.generateIOSBridgeFile();
    }
    if (
      !langs.includes(SupportedLang.KOTLIN) ||
      !langs.includes(SupportedLang.CPP)
    ) {
      await this.generateAndroidFiles(); //TODO: check if there ias need to add android files
    }
    await this.generatePackageJsonFile();
    await this.generateJSFiles({ platforms, langs });
    await this.cloneNitroExample();
    await this.prepare(pm ?? "bun");
    await rm(`${this.tmpDir}`, { recursive: true, force: true });
  }

  private async cloneNitroTemplate() {
    let exists: boolean = false;
    try {
      await access("/tmp/nitro");
      exists = true;
    } catch (error) {
      exists = false;
    }

    if (!exists) {
      await rm(`${this.tmpDir}`, { recursive: true, force: true });
      await execAsync(
        "git clone --depth 1 https://github.com/mrousavy/nitro /tmp/nitro"
      );
    }
  }

  private async cloneNitroExample() {
    let exists: boolean = false;
    try {
      await access("./example");
      exists = true;
    } catch (error) {
      exists = false;
    }

    if (!exists) {
      await rm(`${this.tmpDir}`, { recursive: true, force: true });
      await execAsync(
        "git clone --depth 1 https://github.com/patrickkabwe/nitro-example example"
      );
    }
    await rm(path.join(this.cwd, "example/.git"), {
      recursive: true,
      force: true,
    });

    const packageJsonPath = path.join(this.cwd, "example/package.json");
    const packageJsonStr = await readFile(packageJsonPath, {
      encoding: "utf8",
    });
    const packageJson = JSON.parse(packageJsonStr);
    packageJson.scripts = {
      ...packageJson.scripts,
      ios: "react-native run-ios --simulator='iPhone 16'",
      start: "react-native start --reset-cache",
      pod: "pod install --project-directory=ios",
    };
    packageJson.dependencies = {
      ...packageJson.dependencies,
      "react-native-nitro-modules": "*",
      [`${this.packagePrefix}${this.moduleName}`]: "*",
    };

    await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2), {
      encoding: "utf8",
    });

    const appPath = path.join(this.cwd, "example/App.tsx");
    await writeFile(
      appPath,
      appExampleCode(this.moduleName, this.packagePrefix),
      { encoding: "utf8" }
    );
  }

  private async prepare(pm: string) {
    await execAsync(`${pm} install`);
    await execAsync(`cd ${this.moduleName}; rm -rf nitrogen`);
    await execAsync(`cd ${this.moduleName}; ${pm} specs; ${pm} run build`);
    await execAsync(
      `cd ${this.moduleName}; pod install --project-directory=./ios; cd ..`
    );
  }

  private async copyFiles() {
    await execAsync(`cp -R /tmp/nitro/packages/template ${this.tmpDir}`);

    const filesToCopy = [
      "react-native.config.js",
      "babel.config.js",
      ".watchmanconfig",
      ".gitignore",
    ];
    for (const file of filesToCopy) {
      await copyFile(
        path.join(this.tmpDir, file),
        path.join(process.cwd(), this.moduleName, file)
      );
    }
  }

  private async generateNitroJson({ langs }: PlatformLang) {
    const replacements = {
      [ANDROID_NAME_SPACE_TAG]: this.moduleName.toLowerCase(),
      [CXX_NAME_SPACE_TAG]: this.moduleName.toLowerCase(),
      [IOS_MODULE_NAME_TAG]: toPascalCase(this.moduleName),
      [ANDROID_CXX_LIB_NAME_TAG]: toPascalCase(this.moduleName),
    };
    const nitroFilePath = path.join(this.tmpDir, "nitro.json");
    const nitroJsonFile = await readFile(nitroFilePath, { encoding: "utf8" });
    let nitroJson = JSON.parse(nitroJsonFile);

    nitroJson = {
      $schema:
        "https://raw.githubusercontent.com/patrickkabwe/nitro-cli/refs/heads/main/src/assets/nitro-schema.json",
      ...nitroJson,
      autolinking: generateAutolinking(toPascalCase(this.moduleName), langs),
    };

    await this.generateFile(
      "nitro.json",
      await this.replacePlaceholder({
        replacements,
        data: JSON.stringify(nitroJson, null, 2),
      })
    );
  }

  private async generatePodJson() {
    const podspecFilePath = path.join(
      this.tmpDir,
      `${IOS_MODULE_NAME_TAG}.podspec`
    );
    const { name } = getGitUserInfo();
    const replacements = {
      [IOS_MODULE_NAME_TAG]: toPascalCase(this.moduleName),
      "mrousavy/nitro": `${name
        .replaceAll(" ", "")
        .toLowerCase()}/${this.moduleName.toLowerCase()}`,
    };

    await this.generateFile(
      `${toPascalCase(this.moduleName)}.podspec`,
      await this.replacePlaceholder({ filePath: podspecFilePath, replacements })
    );
  }

  private async generateIOSBridgeFile() {
    await this.generateFolder("ios");
    const { name } = getGitUserInfo();

    const bridgeFilePath = path.join(this.tmpDir, "ios", "Bridge.h");

    const replacements = {
      [IOS_MODULE_NAME_TAG]: this.moduleName,
      "Created by Marc Rousavy on 22.07.24.": `Created by ${name} on ${new Date().toLocaleDateString()}`, //TODO: user regex
    };

    await this.generateFile(
      "ios/Bridge.h",
      await this.replacePlaceholder({ filePath: bridgeFilePath, replacements })
    );
    await this.generateFile(
      `ios/${toPascalCase(this.moduleName)}.swift`,
      getSwiftCode(this.moduleName)
    );
  }

  private async generateAndroidFiles() {
    await this.generateFolder("android/src/main/cpp");
    await this.generateFolder(
      `android/src/main/java/com/${this.moduleName.toLowerCase()}`
    );

    await this.generateFile(
      `android/src/main/AndroidManifest.xml`,
      androidManifestCode
    );
    await this.generateFile(
      `android/src/main/java/${this.androidPackageName
        .split(".")
        .join("/")}/${toPascalCase(this.moduleName)}.kt`,
      getKotlinCode(this.moduleName, this.androidPackageName)
    );
    await this.generateGradleFile();
    await this.generateCMakeFile();
    await this.generateCPPFile();
    await this.generatePackageFile();
  }

  private async generateGradleFile() {
    const gradleFile = "build.gradle";
    const gradlePropertiesFile = "gradle.properties";
    const prefixPath = "android";
    const gradleFilePath = path.join(this.tmpDir, prefixPath, gradleFile);
    const gradlePropertiesFilePath = path.join(
      this.tmpDir,
      prefixPath,
      gradlePropertiesFile
    );

    const replacements = {
      [`com.margelo.nitro.${ANDROID_NAME_SPACE_TAG}`]: `com.${this.moduleName.toLowerCase()}`,
      [ANDROID_CXX_LIB_NAME_TAG]: this.moduleName,
    };

    await this.generateFile(
      `${prefixPath}/${gradleFile}`,
      await this.replacePlaceholder({ filePath: gradleFilePath, replacements })
    );
    await this.generateFile(
      `${prefixPath}/${gradlePropertiesFile}`,
      await this.replacePlaceholder({
        filePath: gradlePropertiesFilePath,
        replacements,
      })
    );
  }

  private async generateCMakeFile() {
    const cmakeListFile = "CMakeLists.txt";
    const prefixPath = "android";
    const cmakeListFilePath = path.join(this.tmpDir, prefixPath, cmakeListFile);
    const replacements = {
      [ANDROID_CXX_LIB_NAME_TAG]: this.moduleName,
    };
    await this.generateFile(
      `${prefixPath}/${cmakeListFile}`,
      await this.replacePlaceholder({
        filePath: cmakeListFilePath,
        replacements,
      })
    );
  }

  private async generateCPPFile() {
    const cppAdapterFile = "cpp-adapter.cpp";
    const prefixPath = "android/src/main/cpp";
    const cppAdapterFilePath = path.join(
      this.tmpDir,
      prefixPath,
      cppAdapterFile
    );

    const replacements = {
      [ANDROID_CXX_LIB_NAME_TAG]: this.moduleName,
      [ANDROID_NAME_SPACE_TAG]: this.moduleName.toLowerCase(),
    };

    await this.generateFile(
      `${prefixPath}/${cppAdapterFile}`,
      await this.replacePlaceholder({
        filePath: cppAdapterFilePath,
        replacements,
      })
    );
  }

  private async generatePackageFile() {
    const androidPackageFile = `${toPascalCase(this.moduleName)}Package.java`;
    const prefixPath = `android/src/main/java`;
    const androidPackageFilePath = path.join(
      this.tmpDir,
      prefixPath + `/com/margelo/nitro/${ANDROID_NAME_SPACE_TAG}`,
      `${ANDROID_CXX_LIB_NAME_TAG}Package.java`
    );

    const replacements = {
      [`com.margelo.nitro.${ANDROID_NAME_SPACE_TAG}`]: this.androidPackageName,
      [`${ANDROID_CXX_LIB_NAME_TAG}Package`]: androidPackageFile.split(".")[0],
      [ANDROID_CXX_LIB_NAME_TAG]: this.moduleName,
    };

    await this.generateFile(
      `${prefixPath}/${this.androidPackageName
        .split(".")
        .join("/")}/${androidPackageFile}`,
      await this.replacePlaceholder({
        filePath: androidPackageFilePath,
        replacements,
      })
    );
  }

  private async generatePackageJsonFile() {
    const { name } = getGitUserInfo();
    const userName = name.replaceAll(" ", "").toLowerCase();
    const moduleName = `${this.packagePrefix}${this.moduleName}`.toLowerCase();
    // package json
    const packageJsonFilePath = path.join(
      this.cwd + `/${this.moduleName}`,
      "package.json"
    );
    packageJsonFile.name = moduleName;
    packageJsonFile.author = name;
    packageJsonFile.repository = `https://github.com/${userName}/${moduleName}.git`;
    packageJsonFile.bugs = `https://github.com/${userName}/${moduleName}/issues`;
    packageJsonFile.homepage = `https://github.com/${userName}/${moduleName}#readme`;

    // Workspace package json
    const workspacePackageJsonFilePath = path.join(this.cwd, "package.json");
    workspacePackageJsonFile.name = moduleName;
    workspacePackageJsonFile.repository = `https://github.com/${userName}/${moduleName}.git`;
    workspacePackageJsonFile.author = name;
    workspacePackageJsonFile.workspaces = [
      this.moduleName.toLowerCase(),
      "example",
    ];

    // tsconfig
    const tsconfigFilePath = path.join(
      this.cwd + `/${this.moduleName}`,
      "tsconfig.json"
    );

    // tsconfigFilePath

    await writeFile(
      packageJsonFilePath,
      JSON.stringify(packageJsonFile, null, 2),
      { encoding: "utf8" }
    );
    await writeFile(
      workspacePackageJsonFilePath,
      JSON.stringify(workspacePackageJsonFile, null, 2),
      { encoding: "utf8" }
    );
    await writeFile(tsconfigFilePath, JSON.stringify(tsconfigFile, null, 2), {
      encoding: "utf8",
    });
  }

  private async generateJSFiles({ platforms, langs }: PlatformLang) {
    const platformToLangMap = mapPlatformToLanguage(platforms, langs);

    const platformLang = Object.entries(platformToLangMap)
      .map(([platform, lang]) => `${platform}: '${lang.toLowerCase()}'`)
      .join(", ");

    await this.generateFolder("src/specs");
    await this.generateFile(
      `/src/specs/${this.moduleName}.nitro.ts`,
      specCode(this.moduleName, platformLang)
    );
    await this.generateFile("/src/index.ts", exportCode(this.moduleName));
  }

  async generateJSTemplateFile({ platforms, langs }: PlatformLang) {
    const platformToLangMap = mapPlatformToLanguage(platforms, langs);

    const platformLang = Object.entries(platformToLangMap)
      .map(([platform, lang]) => `${platform}: '${lang}'`)
      .join(", ");

    const specCode = `
import { type HybridObject } from 'react-native-nitro-modules'

export interface ${toPascalCase(
      this.moduleName
    )} extends HybridObject<{ ${platformLang} }> { }
  `;

    await this.generateFolder("/src/specs");
    await this.generateFile(`/src/specs/${this.moduleName}.nitro.ts`, specCode);
  }

  private async generateFolder(dir?: string) {
    await mkdir(path.join(process.cwd(), `${this.moduleName}/${dir ?? ""}`), {
      recursive: true,
    });
  }

  private async generateFile(fileName: string, data: any) {
    const filePath = path.join(process.cwd(), this.moduleName, fileName);
    await writeFile(filePath, data, { encoding: "utf8" });
  }

  private async replacePlaceholder({
    filePath,
    replacements,
    data,
  }: {
    filePath?: string;
    replacements: Record<string, string>;
    data?: string;
  }) {
    let fileContent;
    if (data) {
      fileContent = data;
    } else if (filePath) {
      fileContent = await readFile(filePath, { encoding: "utf8" });
    } else {
      throw new Error(
        "Error generate files. make sure you are passing data or filePath"
      );
    }

    return Object.entries(replacements).reduce(
      (acc, [tag, value]) => replaceTag(tag, acc, value),
      fileContent
    );
  }
}

export const fileGenerator = new FileGenerator();
