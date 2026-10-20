# Voicer

A mobile-first voice memo player designed for NFC tags. Each tag opens a shareable URL that loads a hosted audio recording, with accessible playback controls and lock-screen metadata where supported.

## Run locally

```bash
npm install
npm run dev
```

## Add a recording

Place an MP3, M4A, OGG, or WAV file in `public/recordings/`. The default recording path is `/recordings/voice.mp3`.

You can point a tag at a different hosted recording with query parameters, for example:

`https://your-domain.example/?src=%2Frecordings%2Fgrandma.mp3&title=Grandma&subtitle=A%20little%20message`

The `src` parameter can be a relative path or an HTTPS URL. Only use audio you have permission to share.

## Deploy

Import this repository into Vercel. It detects Vite automatically. Add your recording files under `public/recordings/` and redeploy. Write the deployed HTTPS URL to your NFC tag.

## Browser notes

Browsers, especially iOS Safari, may require a tap before audio with sound can play. Voicer attempts playback when allowed and provides a clear Play button otherwise. Media Session lock-screen controls are supported where the browser and operating system allow them.