require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "$$iosModuleName$$"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = package["author"]

  s.ios.deployment_target = "16.0"
  s.source = { :git => package["repository"], :tag => "#{s.version}" }

  # React Native CLI discovers this package through the podspec.
  # Package.swift defines its native sources and dependencies.
end
