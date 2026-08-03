package com.homeservices.customer

import android.app.Application
import com.facebook.flipper.android.AndroidFlipperClient
import com.facebook.flipper.android.utils.FlipperUtils
import com.facebook.flipper.plugins.inspector.DescriptorMapping
import com.facebook.flipper.plugins.inspector.InspectorFlipperPlugin
import com.facebook.flipper.plugins.network.NetworkFlipperPlugin

/**
 * Starts the Flipper client so Flipper Desktop can attach (debug builds only).
 * Must run after [SoLoader.init]; [react-native-flipper] JS plugins use the same client.
 */
object FlipperInitializer {
  fun init(application: Application) {
    if (!FlipperUtils.shouldEnableFlipper(application)) {
      return
    }
    val client = AndroidFlipperClient.getInstance(application)
    client.addPlugin(InspectorFlipperPlugin(application, DescriptorMapping.withDefaults()))
    client.addPlugin(NetworkFlipperPlugin())
    client.start()
  }
}
