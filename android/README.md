# Voicer for Android (prototype)

This is a native Android companion prototype for NFC-triggered, looping voice playback. It is separate from the existing Vite website.

## How it is intended to work

1. Install the Android app on the Samsung phone.
2. Write a **URI NDEF record** to the NFC tag using this pattern:

   `voicer://play?src=https%3A%2F%2Fexample.com%2Frecordings%2Fvoice.mp3&title=My%20recording`

   Replace the example URL with a publicly reachable HTTPS audio file. The URL must be percent-encoded when it contains special characters.
3. Scan the tag. If Android routes the URI to Voicer, the app requests background media playback and repeats the recording.
4. Use the app's Stop playback button to stop the service.

## Important platform limitation

Android controls whether an NFC scan can launch an app and start audio without extra interaction. Device settings, Android version, lock state, and tag-writing format can change the behaviour. This prototype does **not** promise silent playback on every Samsung device. Android may show an app screen or require the user to unlock/confirm. It does not execute shell commands from the NFC tag.

The app requires an HTTPS audio file. It does not yet upload recordings, provide an account system, or build a release APK.

## Build

Open the `android/` folder in Android Studio with a current Android SDK installed, then build the app. The project uses Gradle Kotlin DSL, Android Gradle Plugin 8.9.2, Kotlin 2.0.21, and Media3 1.5.1.

Test on the actual Samsung phone before relying on the NFC launch behaviour.
