package app.voicer.android

import android.content.Intent
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.session.MediaSession
import androidx.media3.session.MediaSessionService

class PlaybackService : MediaSessionService() {
    private var player: ExoPlayer? = null
    private var mediaSession: MediaSession? = null

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
                player?.apply {
                    setMediaItem(MediaItem.Builder()
                        .setUri(source)
                        .setMediaMetadata(
                            androidx.media3.common.MediaMetadata.Builder()
                                .setTitle(title)
                                .setArtist("Voicer")
                                .build()
                        )
                        .build())
                    prepare()
                    playWhenReady = true
                }
            }
        }
        return super.onStartCommand(intent, flags, startId)
    }

    override fun onGetSession(controllerInfo: MediaSession.ControllerInfo): MediaSession? = mediaSession

    override fun onDestroy() {
        mediaSession?.run {
            player.release()
            release()
        }
        mediaSession = null
        player = null
        super.onDestroy()
    }

    companion object {
        const val ACTION_PLAY = "app.voicer.android.action.PLAY"
        const val EXTRA_SOURCE = "source"
        const val EXTRA_TITLE = "title"
    }
}
