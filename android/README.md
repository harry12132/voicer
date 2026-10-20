# Voicer for Android (prototype)

This native Android companion prototype lets an NFC tag trigger a recording download and looping playback. It is separate from the existing Vite website.

## How it works

1. Install the Android app on the Samsung phone.
2. Host the audio file at a direct, publicly reachable HTTPS URL. The server must return the audio file itself, not an HTML download page.
3. Write a **URI NDEF record** to the NFC tag using this pattern:

   `voicer://play?src=https%3A%2F%2Fexample.com%2Frecordings%2Fvoice.mp3&title=My%20recording`

   Replace the example URL with your own audio URL. Percent-encode special characters in the URL and title.
4. Scan the tag. Android should route the URI to Voicer if the app is installed and the NFC record is written in the expected format.
5. Voicer downloads the audio into its app cache the first time, then plays the cached file on repeat. A later scan of the same URL reuses the cached copy rather than downloading it again.
6. Use the app's **Stop playback** button to stop playback.

## Important limits

- The tag is a trigger, not audio storage. NTAG215 has too little user memory for a normal recording.
- The first scan needs internet access. Later scans can use the cached file, but Android may clear app cache to free storage.
- The audio URL must be a direct HTTPS media URL, not a Google Drive preview page or an HTML webpage.
- Android controls whether an NFC scan can launch an app and start audio without extra interaction. Device settings, Android version, lock state, and tag-writing format can change behaviour. This prototype does not promise silent playback on every Samsung device. It does not execute shell commands from the NFC tag.
- This is a prototype and has not yet been verified on a physical Samsung phone. Download and playback failures may need further debugging.

## Build

Open the `android/` folder in Android Studio with a current Android SDK installed, then build the app. The project uses Gradle Kotlin DSL, Android Gradle Plugin 8.9.2, Kotlin 2.0.21, and Media3 1.5.1.
