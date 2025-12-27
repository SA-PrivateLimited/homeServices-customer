# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Add any project specific keep options here:

# Keep native methods
-keepclassmembers class * {
    native <methods>;
}

# Keep React Native
-keep,allowobfuscation @interface com.facebook.proguard.annotations.DoNotStrip
-keep,allowobfuscation @interface com.facebook.proguard.annotations.KeepGettersAndSetters
-keep,allowobfuscation @interface com.facebook.common.internal.DoNotStrip

-keep @com.facebook.proguard.annotations.DoNotStrip class *
-keep @com.facebook.common.internal.DoNotStrip class *
-keepclassmembers class * {
    @com.facebook.proguard.annotations.DoNotStrip *;
    @com.facebook.common.internal.DoNotStrip *;
}

-keepclassmembers @com.facebook.proguard.annotations.KeepGettersAndSetters class * {
  void set*(***);
  *** get*();
}

-keep class * implements com.facebook.react.bridge.JavaScriptModule { *; }
-keep class * implements com.facebook.react.bridge.NativeModule { *; }
-keepclassmembers,includedescriptorclasses class * { native <methods>; }
-keepclassmembers class *  { @com.facebook.react.uimanager.annotations.ReactProp <methods>; }
-keepclassmembers class *  { @com.facebook.react.uimanager.annotations.ReactPropGroup <methods>; }

-dontwarn com.facebook.react.**
-keep,includedescriptorclasses class com.facebook.react.bridge.** { *; }

# Keep Hermes
-keep class com.facebook.hermes.unicode.** { *; }
-keep class com.facebook.jni.** { *; }

# Optimize code (remove logging, debugging code)
-assumenosideeffects class android.util.Log {
    public static boolean isLoggable(java.lang.String, int);
    public static int v(...);
    public static int i(...);
    public static int w(...);
    public static int d(...);
    public static int e(...);
}

# Keep react-native-dotenv classes (needed for environment variables)
-keep class com.mihirsoni.源头.source.dotenv.** { *; }
-keepclassmembers class com.mihirsoni.源头.source.dotenv.** { *; }

# Keep environment variable imports
-keep class env.** { *; }
-keepclassmembers class env.** { *; }

# Keep fetch and network classes
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep error classes for better debugging
-keep class * extends java.lang.Exception
-keepclassmembers class * extends java.lang.Exception {
    <fields>;
    <methods>;
}

# Remove unused code
-optimizationpasses 5
-dontusemixedcaseclassnames
-dontskipnonpubliclibraryclasses
-verbose
