import { useEffect, useMemo, useRef, useState } from 'react'
import { AudioLines, Check, CircleHelp, Headphones, Heart, Link2, Pause, Play, RotateCcw, SkipBack, SkipForward, Upload, Volume2, VolumeX, Waves, X } from 'lucide-react'

function formatTime(value) {
  if (!Number.isFinite(value) || value < 0) return '0:00'
  return Math.floor(value / 60) + ':' + String(Math.floor(value % 60)).padStart(2, '0')
}
function readMessage() {
  const p = new URLSearchParams(window.location.search)
  return {
    title: p.get('title') || 'A message for you',
    subtitle: p.get('subtitle') || 'A little moment, saved in sound.',
    src: p.get('src') || '/recordings/voice.mp3',
    artwork: p.get('artwork') || '',
  }
}
function Waveform({ progress, playing, onSeek }) {
  const bars = useMemo(() => Array.from({ length: 64 }, (_, i) => 14 + Math.abs(Math.sin(i * 12.9898 + 78.233) * Math.cos(i * .67)) * 72), [])
  return <button className="waveform" type="button" aria-label="Seek through audio" onClick={e => {
    const r = e.currentTarget.getBoundingClientRect()
    onSeek(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)))
  }}>{bars.map((h, i) => <span key={i} className={'wave-bar' + (i / bars.length <= progress ? ' wave-bar--active' : '') + (playing ? ' wave-bar--live' : '')} style={{ height: h + '%', animationDelay: ((i % 12) * .045) + 's' }} />)}</button>
}
export default function App() {
  const audioRef = useRef(null)
  const uploadRef = useRef(null)
  const objectUrl = useRef(null)
  const initial = useMemo(readMessage, [])
  const [src, setSrc] = useState(initial.src)
  const [title, setTitle] = useState(initial.title)
  const [subtitle, setSubtitle] = useState(initial.subtitle)
  const [artwork, setArtwork] = useState(initial.artwork)
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(.85)
  const [muted, setMuted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modal, setModal] = useState('')
  const [copied, setCopied] = useState(false)
  const progress = duration > 0 ? current / duration : 0

  // NFC landing-page behaviour: try to start immediately and keep the message looping.
  // Mobile browsers may block audible autoplay; the existing Play button remains the fallback.
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.loop = true
    const attemptAutoplay = () => { audio.play().catch(() => {}) }
    if (audio.readyState >= 2) attemptAutoplay()
    else audio.addEventListener('canplay', attemptAutoplay, { once: true })
    return () => audio.removeEventListener('canplay', attemptAutoplay)
  }, [src])

  useEffect(() => {
    const a = audioRef.current
    if (!a) return
    const time = () => setCurrent(a.currentTime || 0)
    const meta = () => { setDuration(Number.isFinite(a.duration) ? a.duration : 0); setLoading(false); setError('') }
    const play = () => setPlaying(true)
    const pause = () => setPlaying(false)
    const wait = () => setLoading(true)
    const ready = () => { setLoading(false); setError('') }
    const fail = () => { setLoading(false); setPlaying(false); setError('This recording could not be loaded. Check the audio URL and try again.') }
    const events = [['timeupdate', time], ['durationchange', meta], ['loadedmetadata', meta], ['play', play], ['pause', pause], ['ended', pause], ['waiting', wait], ['canplay', ready], ['error', fail]]
    events.forEach(([name, fn]) => a.addEventListener(name, fn))
    return () => events.forEach(([name, fn]) => a.removeEventListener(name, fn))
  }, [])

  useEffect(() => {
    if (!('mediaSession' in navigator) || !window.MediaMetadata) return
    navigator.mediaSession.metadata = new window.MediaMetadata({
      title, artist: subtitle || 'Voicer', album: 'Voicer',
      artwork: artwork ? [{ src: artwork, sizes: '512x512', type: 'image/png' }] : [],
    })
    const a = audioRef.current
    const handlers = {
      play: () => a?.play().catch(() => {}),
      pause: () => a?.pause(),
      seekbackward: d => { if (a) a.currentTime = Math.max(0, a.currentTime - (d.seekOffset || 10)) },
      seekforward: d => { if (a) a.currentTime = Math.min(a.duration || Infinity, a.currentTime + (d.seekOffset || 10)) },
      seekto: d => { if (a && Number.isFinite(d.seekTime)) a.currentTime = d.seekTime },
    }
    Object.entries(handlers).forEach(([action, handler]) => {
      try { navigator.mediaSession.setActionHandler(action, handler) } catch { /* Browser does not support this action. */ }
    })
    return () => Object.keys(handlers).forEach(action => {
      try { navigator.mediaSession.setActionHandler(action, null) } catch { /* Unsupported action. */ }
    })
  }, [title, subtitle, artwork, src])

  useEffect(() => {
    if ('mediaSession' in navigator && navigator.mediaSession.setPositionState && duration > 0) {
      try { navigator.mediaSession.setPositionState({ duration, playbackRate: audioRef.current?.playbackRate || 1, position: Math.min(current, duration) }) } catch { /* Position state is optional. */ }
    }
  }, [current, duration])

  useEffect(() => () => { if (objectUrl.current) URL.revokeObjectURL(objectUrl.current) }, [])

  async function togglePlay() {
    const a = audioRef.current
    if (!a) return
    setError('')
    if (a.paused) {
      try { await a.play() } catch { setError('Tap play to start your message. Your browser may need a tap before sound can begin.') }
    } else a.pause()
  }
  function seek(fraction) {
    const a = audioRef.current
    if (a && Number.isFinite(a.duration)) a.currentTime = Math.max(0, Math.min(a.duration, fraction * a.duration))
  }
  function jump(seconds) {
    const a = audioRef.current
    if (a) a.currentTime = Math.max(0, Math.min(a.duration || Infinity, a.currentTime + seconds))
  }
  function chooseFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('audio/')) { setError('Choose an audio file, such as MP3, M4A, WAV or OGG.'); return }
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current)
    objectUrl.current = URL.createObjectURL(file)
    audioRef.current?.pause()
    setSrc(objectUrl.current)
    setTitle(file.name.replace(/\.[^.]+$/, '') || 'Your recording')
    setSubtitle('Playing from this device')
    setCurrent(0); setDuration(0); setLoading(true); setError('')
  }
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch { setError('Copying is blocked by this browser. Copy the page URL from the address bar.') }
  }

  return <main className="app-shell">
    <div className="ambient ambient--one" /><div className="ambient ambient--two" />
    <header className="topbar">
      <a className="brand" href="/" aria-label="Voicer home"><span className="brand-mark"><AudioLines size={19} /></span><span>voicer<span className="brand-period">.</span></span></a>
      <button className="icon-button help-button" onClick={() => setModal('info')} aria-label="About Voicer"><CircleHelp size={19} /></button>
    </header>

    <section className="player-layout">
      <div className="eyebrow"><span className="status-dot" /> A LITTLE SOMETHING, JUST FOR YOU</div>
      <div className="artwork-wrap"><div className="artwork-shadow" /><div className="artwork">
        {artwork ? <img className="artwork-image" src={artwork} alt="" /> : <div className="artwork-art" aria-hidden="true">
          <div className="art-orbit art-orbit--one" /><div className="art-orbit art-orbit--two" />
          <div className="art-core"><Waves size={54} strokeWidth={1.15} /></div>
          <span className="art-star art-star--one">✳</span><span className="art-star art-star--two">✦</span>
          <span className="art-dot art-dot--one" /><span className="art-dot art-dot--two" />
        </div>}
        <span className="artwork-label"><span /> VOICER ORIGINAL</span>
      </div></div>

      <div className="message-heading"><div className="message-copy"><h1>{title}</h1><p>{subtitle}</p></div>
        <button className="save-button" aria-label="Share or save this message" onClick={() => setModal('share')}><Heart size={21} /></button>
      </div>

      <audio ref={audioRef} src={src} preload="auto" playsInline autoPlay loop />
      <div className="timeline"><Waveform playing={playing} progress={progress} onSeek={seek} /><div className="time-row"><span>{formatTime(current)}</span><span>{duration ? '−' + formatTime(Math.max(0, duration - current)) : '−0:00'}</span></div></div>

      {error && <div className="error-message" role="status"><span>{error}</span><button onClick={() => setError('')} aria-label="Dismiss error"><X size={15} /></button></div>}

      <div className="controls">
        <button className="secondary-control" onClick={() => seek(Math.max(0, progress - .1))} aria-label="Go back"><SkipBack size={21} /></button>
        <button className="skip-control" onClick={() => jump(-10)} aria-label="Back ten seconds"><RotateCcw size={17} /><span>10</span></button>
        <button className="play-button" onClick={togglePlay} aria-label={playing ? 'Pause message' : 'Play message'}>{loading && !playing ? <span className="loader" /> : playing ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" />}</button>
        <button className="skip-control" onClick={() => jump(10)} aria-label="Forward ten seconds"><RotateCcw className="forward-icon" size={17} /><span>10</span></button>
        <button className="secondary-control" onClick={() => seek(Math.min(1, progress + .1))} aria-label="Go forward"><SkipForward size={21} /></button>
      </div>

      <div className="utility-row">
        <div className="volume-control"><button className="tiny-icon" onClick={() => { const m = !muted; setMuted(m); if (audioRef.current) audioRef.current.muted = m }} aria-label={muted ? 'Unmute' : 'Mute'}>{muted || volume === 0 ? <VolumeX size={17} /> : <Volume2 size={17} />}</button>
          <input aria-label="Volume" type="range" min="0" max="1" step=".01" value={muted ? 0 : volume} onChange={e => { const v = Number(e.target.value); setVolume(v); setMuted(false); if (audioRef.current) { audioRef.current.volume = v; audioRef.current.muted = false } }} />
        </div>
        <button className="share-button" onClick={() => setModal('share')}><Link2 size={15} /> Share message</button>
        <button className="tiny-icon upload-trigger" onClick={() => uploadRef.current?.click()} aria-label="Choose audio file" title="Choose audio file"><Upload size={17} /></button>
        <input ref={uploadRef} className="visually-hidden" type="file" accept="audio/*" onChange={chooseFile} />
      </div>
      {src.startsWith('blob:') && <p className="local-note">This file plays only on this device. Upload it to your website to use it with an NFC tag.</p>}
      <div className="nfc-note"><span className="nfc-icon"><Waves size={18} /></span><span>Tap your tag. Keep this moment.</span><span className="note-dot">·</span><span>Made with care</span></div>
    </section>

    <footer className="footer"><span>VOICER © {new Date().getFullYear()}</span><span>Sound makes a moment stay.</span></footer>

    {modal && <div className="modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setModal('') }}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <button className="modal-close" onClick={() => setModal('')} aria-label="Close"><X size={19} /></button>
        <div className="modal-symbol">{modal === 'info' ? <Headphones size={25} /> : <Link2 size={24} />}</div>
        <p className="modal-kicker">{modal === 'info' ? 'A SMALL THING WITH A BIG FEELING' : 'PASS THE FEELING ON'}</p>
        <h2 id="modal-title">{modal === 'info' ? 'A voice, kept close.' : 'Share this moment.'}</h2>
        {modal === 'info' ? <>
          <p>Voicer turns an NFC tap into a personal listening moment. Put a link to this page on a tag and let someone hear a message made just for them.</p>
          <div className="modal-tip"><span>01</span><p>Host your audio file online in <code>public/recordings/</code>.</p></div>
          <div className="modal-tip"><span>02</span><p>Put the live HTTPS page URL onto your NFC tag.</p></div>
          <div className="modal-tip"><span>03</span><p>Your phone may require a tap before playing audio. This is a browser security rule.</p></div>
          <button className="modal-primary" onClick={() => setModal('')}>Got it</button>
        </> : <>
          <p>Copy this page's link and write it to an NFC tag. The recording must be hosted online for other people to hear it.</p>
          <div className="share-url"><span>{window.location.href}</span></div>
          <button className="modal-primary" onClick={copyLink}>{copied ? <><Check size={17} /> Copied</> : <><Link2 size={17} /> Copy page link</>}</button>
          <p className="share-footnote">For another recording, add <code>?src=/recordings/name.mp3&amp;title=Your%20Message</code> to the URL.</p>
        </>}
      </section>
    </div>}
  </main>
}
