package com.homeservices.customer

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/** Lets JS dismiss the native 3D splash once the matching JS overlay is on screen. */
class NativeSplashModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "NativeSplashModule"

  @ReactMethod
  fun hide() {
    MainActivity.hideSplash()
  }
}
