package com.homeservices.customer

import android.app.Application
import android.content.ActivityNotFoundException
import android.util.Log
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.load
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.soloader.SoLoader

class MainApplication : Application(), ReactApplication {

  override val reactNativeHost: ReactNativeHost =
      object : DefaultReactNativeHost(this) {
        override fun getPackages(): List<ReactPackage> =
            PackageList(this).packages.apply {
              add(LocationSettingsPackage())
              add(NativeSplashPackage())
            }

        override fun getJSMainModuleName(): String = "index"

        override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

        override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
        override val isHermesEnabled: Boolean = BuildConfig.IS_HERMES_ENABLED
      }

  override val reactHost: ReactHost
    get() = getDefaultReactHost(applicationContext, reactNativeHost)

  override fun onCreate() {
    super.onCreate()
    installRecaptchaCrashGuard()
    SoLoader.init(this, false)
    FlipperInitializer.init(this)
    if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
      // If you opted-in for the New Architecture, we load the native entry point for this app.
      load()
    }
  }

  /**
   * Firebase Phone Auth may open RecaptchaActivity, which starts a browser Intent.
   * If no Activity can handle it, Android throws ActivityNotFoundException on the main
   * thread and force-finishes the whole process (looks like the app "closed").
   * Swallow only that specific crash so the user stays in the app.
   */
  private fun installRecaptchaCrashGuard() {
    val previous = Thread.getDefaultUncaughtExceptionHandler()
    Thread.setDefaultUncaughtExceptionHandler { thread, throwable ->
      if (isFirebaseRecaptchaBrowserCrash(throwable)) {
        Log.e(
          "AkanshoCustomer",
          "Suppressed Firebase reCAPTCHA browser ActivityNotFoundException " +
            "(install Chrome / fix package visibility). App will stay open.",
          throwable,
        )
        return@setDefaultUncaughtExceptionHandler
      }
      previous?.uncaughtException(thread, throwable)
    }
  }

  private fun isFirebaseRecaptchaBrowserCrash(throwable: Throwable?): Boolean {
    var t = throwable
    var depth = 0
    while (t != null && depth < 8) {
      if (t is ActivityNotFoundException) {
        val msg = (t.message ?: "") + (t.cause?.message ?: "")
        if (
          msg.contains("firebaseapp.com", ignoreCase = true) ||
            msg.contains("RecaptchaActivity", ignoreCase = true) ||
            msg.contains("firebase.auth", ignoreCase = true)
        ) {
          return true
        }
      }
      t = t.cause
      depth++
    }
    return false
  }
}
