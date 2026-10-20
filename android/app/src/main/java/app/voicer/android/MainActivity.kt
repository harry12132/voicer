package app.voicer.android

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import android.view.Gravity
import android.graphics.Color
import android.view.ViewGroup
import android.widget.Toast
import java.util.concurrent.Executors

class MainActivity : Activity() {
    private lateinit var status: TextView
    private val executor = Executors.newSingleThreadExecutor()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        showHome()
        handleTrigger(intent)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleTrigger(intent)
    }

    private fun showHome() {
        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setPadding(32, 32, 32, 32)
            setBackgroundColor(Color.rgb(248, 248, 246))
        }
        val title = TextView(this).apply {
            text = "voicer"
            textSize = 36f
            setTextColor(Color.rgb(20, 20, 20))
            gravity = Gravity.CENTER
        }
        status = TextView(this).apply {
            text = "Scan a Voicer NFC tag to download and play its recording on repeat."
            textSize = 16f
            setTextColor(Color.DKGRAY)
            gravity = Gravity.CENTER
            setPadding(0, 20, 0, 28)
        }
        val stop = Button(this).apply {
            text = "Stop playback"
            setOnClickListener {
                stopService(Intent(this@MainActivity, PlaybackService::class.java))
                status.text = "Playback stopped."
            }
        }
        layout.addView(title, ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT)
        layout.addView(status, ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT)
        layout.addView(stop)
        setContentView(layout)
    }

    private fun handleTrigger(intent: Intent?) {
        val uri = intent?.data ?: return
        if (uri.scheme != "voicer" || uri.host != "play") return

        val source = uri.getQueryParameter("src")
        if (source.isNullOrBlank() || !source.startsWith("https://")) {
            status.text = "This tag needs a valid HTTPS audio URL."
            Toast.makeText(this, "Voicer tag has no valid HTTPS audio URL", Toast.LENGTH_LONG).show()
            return
        }

        val title = uri.getQueryParameter("title")?.takeIf { it.isNotBlank() } ?: "Voicer recording"
        status.text = "Downloading recording…"
        val serviceIntent = Intent(this, PlaybackService::class.java).apply {
            action = PlaybackService.ACTION_PLAY
            putExtra(PlaybackService.EXTRA_SOURCE, source)
            putExtra(PlaybackService.EXTRA_TITLE, title)
        }
        try {
            startForegroundService(serviceIntent)
        } catch (e: Exception) {
            status.text = "Couldn't start playback: ${e.localizedMessage ?: "unknown error"}"
            Toast.makeText(this, status.text, Toast.LENGTH_LONG).show()
            return
        }
        status.text = "Downloading or loading saved recording: $title"
    }

    override fun onDestroy() {
        executor.shutdown()
        super.onDestroy()
    }
}
