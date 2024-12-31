export const cppCode = (moduleName: string, funcName: string) => `#include "Hybrid${moduleName}.hpp"

namespace margelo::nitro::${moduleName.toLowerCase()} {

double Hybrid${moduleName}::${funcName}(double a, double b) {
    return a + b;
}

} // namespace margelo::nitro::${moduleName.toLowerCase()}
`

export const hppCode = (moduleName: string, funcName: string) => `#pragma once
#include <vector>
#include "Hybrid${moduleName}Spec.hpp"

namespace margelo::nitro::${moduleName.toLowerCase()} {
class Hybrid${moduleName} : public Hybrid${moduleName}Spec {
    public:
        Hybrid${moduleName}() : HybridObject(TAG), Hybrid${moduleName}Spec() {}
       
        double ${funcName}(double a, double b) override;
    };
} // namespace margelo::nitro::${moduleName.toLowerCase()}
`
