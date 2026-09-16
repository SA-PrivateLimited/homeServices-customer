package com.homeservices.customer

import android.graphics.Color
import android.os.Bundle
import android.view.ViewGroup
import android.view.ViewTreeObserver
import android.widget.ImageView
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.ReactRootView
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import java.lang.ref.WeakReference

class MainActivity : ReactActivity() {

  private var nativePoster: ImageView? = null

  override fun onCreate(savedInstanceState: Bundle?) {
    keepOnScreen = true
    activityRef = WeakReference(this)
    val splashScreen = installSplashScreen()
    splashScreen.setKeepOnScreenCondition { keepOnScreen }
    super.onCreate(savedInstanceState)
    splashScreen.setOnExitAnimationListener { splashView ->
      splashView.remove()
    }
    attachNativePoster()
    nativePoster?.let { poster ->
      poster.viewTreeObserver.addOnPreDrawListener(
          object : ViewTreeObserver.OnPreDrawListener {
            override fun onPreDraw(): Boolean {
              poster.viewTreeObserver.removeOnPreDrawListener(this)
              keepOnScreen = false
              return true
            }
          },
      )
    }
    window.decorView.postDelayed({ hideSplash() }, 10_000)
  }

  override fun onDestroy() {
    if (activityRef?.get() === this) {
      activityRef = null
    }
    nativePoster = null
    super.onDestroy()
  }

  override fun getMainComponentName(): String = "HomeServices"

  override fun createReactActivityDelegate(): ReactActivityDelegate =
      object : DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled) {
        override fun createRootView(): ReactRootView {
          return super.createRootView().apply { setBackgroundColor(SPLASH_SKY) }
        }

        override fun createRootView(bundle: Bundle?): ReactRootView {
          return super.createRootView(bundle).apply { setBackgroundColor(SPLASH_SKY) }
        }
      }

  private fun attachNativePoster() {
    if (nativePoster != null) {
      return
    }
    val poster =
        ImageView(this).apply {
          setImageResource(R.drawable.boot_splash_art)
          scaleType = ImageView.ScaleType.FIT_XY
          setBackgroundColor(SPLASH_SKY)
          elevation = 100f
        }
    (window.decorView as ViewGroup).addView(
        poster,
        ViewGroup.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT,
        ),
    )
    nativePoster = poster
  }

  private fun removeNativePoster() {
    keepOnScreen = false
    nativePoster?.let { view ->
      (view.parent as? ViewGroup)?.removeView(view)
    }
    nativePoster = null
  }

  companion object {
    private val SPLASH_SKY = Color.parseColor("#ABD7FE")

    @Volatile
    var keepOnScreen: Boolean = true

    @Volatile
    private var activityRef: WeakReference<MainActivity>? = null

    fun hideSplash() {
      val activity = activityRef?.get() ?: return
      activity.runOnUiThread { activity.removeNativePoster() }
    }
  }
}
