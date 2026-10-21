// swift-tools-version: 6.0
// SwiftPM support for @react-native-harness/ui 1.6.0.

import PackageDescription

let package = Package(
    name: "HarnessUI",
    platforms: [.iOS("15.1")],
    products: [
        .library(name: "HarnessUI", targets: ["HarnessUI"]),
    ],
    dependencies: [
        .package(name: "ReactNative", path: "../../../../xcframeworks"),
        .package(name: "React-GeneratedCode", path: "../../../ios"),
    ],
    targets: [
        .target(
            name: "HarnessUI",
            dependencies: [.product(name: "ReactHeaders", package: "ReactNative"), .product(name: "ReactNativeHeaders", package: "ReactNative"), .product(name: "ReactNativeDependenciesHeaders", package: "ReactNative"), .product(name: "ReactAppHeaders", package: "React-GeneratedCode")],
            path: ".",
            sources: [
                "ios/HarnessUI.h",
                "ios/HarnessUI.mm",
                "ios/ViewQueryHelper.h",
                "ios/ViewQueryHelper.mm",
                "ios/ViewRegistry.h",
                "ios/ViewRegistry.mm",
            ],
            publicHeadersPath: "ios",
            cSettings: [.headerSearchPath("ios"), .headerSearchPath("."), .unsafeFlags(["-include", "react-native-spm-prefix.h"])],
            cxxSettings: [.headerSearchPath("ios"), .headerSearchPath("."), .unsafeFlags(["-include", "react-native-spm-prefix.h"]), .define("DEBUG", .when(configuration: .debug)), .define("NDEBUG", .when(configuration: .release))],
            linkerSettings: [.linkedFramework("UIKit"), .linkedFramework("Foundation"), .linkedFramework("CoreGraphics")]
        ),
    ],
    cxxLanguageStandard: .cxx20
)
