package com.homeservices.customer

import android.app.Activity
import android.content.Intent
import android.content.IntentSender
import android.location.LocationManager
import android.os.Build
import android.provider.Settings
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.google.android.gms.common.api.ResolvableApiException
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.LocationSettingsRequest

/**
 * Device Location (GPS/network) settings — separate from app runtime permission.
 */
class LocationSettingsModule(
  private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext), ActivityEventListener {

  private var pendingPromise: Promise? = null

  init {
    reactContext.addActivityEventListener(this)
  }

  override fun getName(): String = NAME

  private fun readLocationEnabled(): Boolean {
    val lm =
      reactContext.getSystemService(LocationManager::class.java) ?: return false
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
      lm.isLocationEnabled
    } else {
      @Suppress("DEPRECATION")
      lm.isProviderEnabled(LocationManager.GPS_PROVIDER) ||
        lm.isProviderEnabled(LocationManager.NETWORK_PROVIDER)
    }
  }

  @ReactMethod
  fun isLocationEnabled(promise: Promise) {
    try {
      promise.resolve(readLocationEnabled())
    } catch (e: Exception) {
      promise.reject("E_LOCATION_CHECK", e.message, e)
    }
  }

  @ReactMethod
  fun openLocationSettings(promise: Promise) {
    try {
      val intent = Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS)
      val activity = currentActivity
      if (activity != null) {
        activity.startActivity(intent)
      } else {
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        reactContext.startActivity(intent)
      }
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("E_OPEN_SETTINGS", e.message, e)
    }
  }

  /**
   * Prefer Play Services location-settings resolution dialog.
   * Resolves: "enabled" | "cancelled" | "opened_settings"
   */
  @ReactMethod
  fun promptEnableLocation(promise: Promise) {
    if (pendingPromise != null) {
      promise.reject("E_IN_PROGRESS", "Location prompt already in progress")
      return
    }

    try {
      if (readLocationEnabled()) {
        promise.resolve(RESULT_ENABLED)
        return
      }
    } catch (_: Exception) {
      // Continue to resolution / settings fallback.
    }

    val activity = currentActivity
    if (activity == null) {
      openLocationSettingsAndResolve(promise)
      return
    }

    pendingPromise = promise

    @Suppress("DEPRECATION")
    val request =
      LocationRequest.create().apply {
        priority = LocationRequest.PRIORITY_BALANCED_POWER_ACCURACY
        interval = 10_000L
        fastestInterval = 5_000L
      }
    val settingsRequest =
      LocationSettingsRequest.Builder()
        .addLocationRequest(request)
        .setAlwaysShow(true)
        .build()

    LocationServices.getSettingsClient(activity)
      .checkLocationSettings(settingsRequest)
      .addOnSuccessListener {
        val p = pendingPromise
        pendingPromise = null
        p?.resolve(RESULT_ENABLED)
      }
      .addOnFailureListener { error ->
        if (error is ResolvableApiException) {
          try {
            error.startResolutionForResult(activity, REQUEST_CHECK_SETTINGS)
          } catch (_: IntentSender.SendIntentException) {
            val p = pendingPromise
            pendingPromise = null
            if (p != null) {
              openLocationSettingsAndResolve(p)
            }
          }
        } else {
          val p = pendingPromise
          pendingPromise = null
          if (p != null) {
            openLocationSettingsAndResolve(p)
          }
        }
      }
  }

  private fun openLocationSettingsAndResolve(promise: Promise) {
    try {
      val intent = Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS)
      val activity = currentActivity
      if (activity != null) {
        activity.startActivity(intent)
      } else {
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        reactContext.startActivity(intent)
      }
      promise.resolve(RESULT_OPENED_SETTINGS)
    } catch (e: Exception) {
      promise.reject("E_OPEN_SETTINGS", e.message, e)
    }
  }

  override fun onActivityResult(
    activity: Activity,
    requestCode: Int,
    resultCode: Int,
    data: Intent?,
  ) {
    if (requestCode != REQUEST_CHECK_SETTINGS) {
      return
    }
    val promise = pendingPromise ?: return
    pendingPromise = null
    if (resultCode == Activity.RESULT_OK) {
      promise.resolve(RESULT_ENABLED)
    } else {
      promise.resolve(RESULT_CANCELLED)
    }
  }

  override fun onNewIntent(intent: Intent) = Unit

  companion object {
    const val NAME = "AkanshoLocationSettings"
    private const val REQUEST_CHECK_SETTINGS = 61234
    private const val RESULT_ENABLED = "enabled"
    private const val RESULT_CANCELLED = "cancelled"
    private const val RESULT_OPENED_SETTINGS = "opened_settings"
  }
}
