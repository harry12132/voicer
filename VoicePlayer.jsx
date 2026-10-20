
import { useEffect, useRef, useState } from "react";

export default function VoicePlayer({
  src = "/recordings/voice.mp3",
  title = "A voice message",
  artist = "Personal Audio",
  artwork = "/artwork.png",
}) {
  const audioRef = useRef(null);
  const [status, setStatus] = useState("Loading recording...");

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    let cancelled = false;

    async function startPlayback() {
      try {
        await audio.play();

        if (!cancelled) {
          setStatus("Playing");
        }
      } catch (error) {
        if (!cancelled) {
          setStatus(
            error.name === "NotAllowedError"
              ? "Playback needs permission from your browser."
              : "Unable to play this recording."
          );
        }
      }
    }

    function updateMediaSession() {
      if (!("mediaSession" in navigator)) return;

      navigator.mediaSession.metadata =
        new MediaMetadata({
          title,
          artist,
          artwork: [
            {
              src: artwork,
              sizes: "512x512",
              type: "image/png",
            },
          ],
        });

      navigator.mediaSession.setActionHandler(
        "play",
        () => audio.play()
      );

      navigator.mediaSession.setActionHandler(
        "pause",
        () => audio.pause()
      );

      navigator.mediaSession.setActionHandler(
        "seekbackward",
        () => {
          audio.currentTime = Math.max(
            0,
            audio.currentTime - 10
          );
        }
      );

      navigator.mediaSession.setActionHandler(
        "seekforward",
        () => {
          audio.currentTime = Math.min(
            audio.duration || Infinity,
            audio.currentTime + 10
          );
        }
      );
    }

    audio.addEventListener(
      "loadedmetadata",
      startPlayback,
      { once: true }
    );

    audio.addEventListener("playing", () => {
      if (!cancelled) setStatus("Playing");
    });

    audio.addEventListener("pause", () => {
      if (!cancelled && !audio.ended) {
        setStatus("Paused");
      }
    });

    audio.addEventListener("ended", () => {
      if (!cancelled) setStatus("Finished");
    });

    updateMediaSession();

    audio.load();

    // Attempt autoplay immediately as well.
    startPlayback();

    return () => {
      cancelled = true;

      audio.pause();
      audio.removeAttribute("src");
      audio.load();

      if ("mediaSession" in navigator) {
        navigator.mediaSession.metadata = null;
      }
    };
  }, [src, title, artist, artwork]);

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#111",
        color: "#fff",
        fontFamily: "system-ui",
      }}
    >
      <section style={{ textAlign: "center" }}>
        <h1>{title}</h1>
        <p>{status}</p>

        <audio
          ref={audioRef}
          src={src}
          preload="auto"
          controls
          playsInline
        />
      </section>
    </main>
  );
}
