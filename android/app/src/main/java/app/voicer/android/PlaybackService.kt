package app.voicer.android

import android.content.Intent
import android.net.Uri
import android.util.Log
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.session.MediaSession
import androidx.media3.session.MediaSessionService
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest

class PlaybackService : MediaSessionService() {
    private var player: ExoPlayer? = null
    private var mediaSession: MediaSession? = null
    @Volatile private var requestNumber = 0

    override fun onCreate() {
        super.onCreate()
        val exoPlayer = ExoPlayer.Builder(this).build().apply {
            repeatMode = Player.REPEAT_MODE_ONE
        }
        player = exoPlayer
        mediaSession = MediaSession.Builder(this, exoPlayer).build()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_PLAY) {
            val source = intent.getStringExtra(EXTRA_SOURCE)
            val title = intent.getStringExtra(EXTRA_TITLE) ?: "Voicer recording"
            if (!source.isNullOrBlank() && source.startsWith("https://")) {
                val thisRequest = ++requestNumber
                Thread {
                    try {
                        val audioFile = getOrDownloadAudio(source)
                        if (thisRequest != requestNumber) return@Thread
                        runOnMain {
                            if (thisRequest != requestNumber) return@runOnMain
                            player?.apply {
                                setMediaItem(
                                    MediaItem.Builder()
                                        .setUri(Uri.fromFile(audioFile))
                                        .setMediaMetadata(
                                            MediaMetadata.Builder()
                                                .setTitle(title)
                                                .setArtist("Voicer")
                                                .build()
                                        )
                                        .build()
                                )
                                prepare()
                                playWhenReady = true
                            }
                        }
                    } catch (e: Exception) {
                        Log.e(TAG, "Could not download or play Voicer audio", e)
                        stopSelf(startId)
                    }
                }.start()
            }
        }
        return super.onStartCommand(intent, flags, startId)
    }

    private fun getOrDownloadAudio(source: String): File {
        val digest = MessageDigest.getInstance("SHA-256")
            .digest(source.toByteArray(Charsets.UTF_8))
            .joinToString("") { "%02x".format(it) }
        val extension = URL(source).path.substringAfterLast('.', "mp3")
            .lowercase()
            .takeIf { it in setOf("mp3", "m4a", "aac", "wav", "ogg", "opus", "mp4") } ?: "mp3"
        val directory = File(cacheDir, "voicer-audio").apply { mkdirs() }
        val destination = File(directory, "$digest.$extension")
        if (destination.exists() && destination.length() > 0L) return destination

        val partial = File(directory, "$digest.download")
        val connection = (URL(source).openConnection() as HttpURLConnection).apply {
            connectTimeout = 15000
            readTimeout = 30000
            instanceFollowRedirects = true
            requestMethod = "GET"
        }
        try {
            connection.connect()
            if (connection.responseCode !in 200..299) {
                throw IllegalStateException("Audio server returned HTTP ${connection.responseCode}")
            }
            connection.inputStream.use { input ->
                partial.outputStream().buffered().use { output -> input.copyTo(output) }
            }
            if (partial.length() == 0L) throw IllegalStateException("Downloaded audio file is empty")
            if (!partial.renameTo(destination)) {
                partial.copyTo(destination, overwrite = true)
                partial.delete()
            }
            return destination
        } finally {
            connection.disconnect()
        }
    }

    private fun runOnMain(action: () -> Unit) {
        android.os.Handler(mainLooper).post(action)
    }

    override fun onGetSession(controllerInfo: MediaSession.ControllerInfo): MediaSession? = mediaSession

    override fun onDestroy() {
        requestNumber++
        player?.release()
        mediaSession?.release()
        mediaSession = null
        player = null
        super.onDestroy()
    }

    companion object {
        private const val TAG = "VoicerPlayback"
        const val ACTION_PLAY = "app.voicer.android.action.PLAY"
        const val EXTRA_SOURCE = "source"
        const val EXTRA_TITLE = "title"
    }
}
