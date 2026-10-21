// swift-tools-version: 6.4

import PackageDescription

let package = Package(
  name: "$$iosModuleName$$",
  platforms: [.iOS(.v16)]
)

addNitrogenTargets(to: package, swiftSources: ["apple"])
