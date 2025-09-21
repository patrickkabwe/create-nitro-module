package com.$$androidNamespace$$;

import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.module.model.ReactModuleInfoProvider;
import com.facebook.react.TurboReactPackage;
import com.facebook.react.uimanager.ViewManager;
import com.margelo.nitro.$$androidNamespace$$.*;
import com.margelo.nitro.$$androidNamespace$$.views.*;


public class $$androidCxxLibName$$Package : TurboReactPackage() {
  override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? = null

  override fun getReactModuleInfoProvider(): ReactModuleInfoProvider = ReactModuleInfoProvider { emptyMap() }
  
  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager> {
    val viewManagers = ArrayList<ViewManager>()
    viewManagers.add(Hybrid$$androidCxxLibName$$Manager())
    return viewManagers
  }

  companion object {
    init {
      $$androidCxxLibName$$OnLoad.initializeNative()
    }
  }
}

