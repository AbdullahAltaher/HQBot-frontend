import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import './Story.css'

const STORY_TOPICS = [
  { id: 'treaty1820', label: 'معاهدة الصلح العام 1820', icon: '⚓', mood: 'sea' },
  { id: 'qawasim', label: 'صعود القواسم وسيطرتهم على الخليج', icon: '🏴', mood: 'sea' },
  { id: 'sharjah', label: 'تأسيس إمارة الشارقة', icon: '🏰', mood: 'palace' },
  { id: 'sultan', label: 'الشيخ سلطان بن صقر والبريطانيين', icon: '⚔️', mood: 'battle' },
  { id: 'najd', label: 'توحيد نجد وظهور الدولة السعودية', icon: '🌅', mood: 'desert' },
  { id: 'abumousa', label: 'قصة جزيرة أبو موسى', icon: '🏝️', mood: 'sea' },
]

const MOOD_CONFIG = {
  sea: {
    label: 'أمواج البحر', icon: '🌊',
    color: '#38bdf8', colorDim: 'rgba(56,189,248,0.08)', colorBorder: 'rgba(56,189,248,0.2)',
    gradient: 'radial-gradient(ellipse at 50% 100%, rgba(56,189,248,0.07) 0%, transparent 70%)',
  },
  desert: {
    label: 'رياح الصحراء', icon: '🌵',
    color: '#f59e0b', colorDim: 'rgba(245,158,11,0.08)', colorBorder: 'rgba(245,158,11,0.2)',
    gradient: 'radial-gradient(ellipse at 50% 100%, rgba(245,158,11,0.07) 0%, transparent 70%)',
  },
  battle: {
    label: 'أجواء المعركة', icon: '⚔️',
    color: '#ef4444', colorDim: 'rgba(239,68,68,0.08)', colorBorder: 'rgba(239,68,68,0.2)',
    gradient: 'radial-gradient(ellipse at 50% 100%, rgba(239,68,68,0.07) 0%, transparent 70%)',
  },
  palace: {
    label: 'موسيقى القصر', icon: '🎵',
    color: '#a78bfa', colorDim: 'rgba(167,139,250,0.08)', colorBorder: 'rgba(167,139,250,0.2)',
    gradient: 'radial-gradient(ellipse at 50% 100%, rgba(167,139,250,0.07) 0%, transparent 70%)',
  }
}

function buildNoiseBuffer(ctx, duration, filterFreq, filterType, lfoFreq, lfoDepth) {
  const sampleRate = ctx.sampleRate
  const length = sampleRate * duration
  const buffer = ctx.createBuffer(1, length, sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < length; i++) {
    const lfo = 1 + lfoDepth * Math.sin((2 * Math.PI * lfoFreq * i) / sampleRate)
    data[i] = (Math.random() * 2 - 1) * lfo
  }
  return buffer
}

function startAmbient(mood, volume) {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (!AudioContext) return null
    const ctx = new AudioContext()
    const masterGain = ctx.createGain()
    masterGain.gain.value = volume * 0.4
    masterGain.connect(ctx.destination)

    if (mood === 'palace') {
      // Gentle drone tones for palace
      const freqs = [110, 165, 220, 275]
      freqs.forEach(freq => {
        const osc = ctx.createOscillator()
        const g = ctx.createGain()
        const lfoOsc = ctx.createOscillator()
        const lfoGain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.value = freq
        lfoOsc.frequency.value = 0.2 + Math.random() * 0.3
        lfoGain.gain.value = 0.3
        lfoOsc.connect(lfoGain)
        lfoGain.connect(g.gain)
        g.gain.value = 0.06
        osc.connect(g)
        g.connect(masterGain)
        osc.start()
        lfoOsc.start()
      })
    } else {
      // Noise-based ambients
      const configs = {
        sea:    { filterFreq: 700,  filterType: 'lowpass',  lfoFreq: 0.15, lfoDepth: 0.7 },
        desert: { filterFreq: 1200, filterType: 'bandpass', lfoFreq: 0.08, lfoDepth: 0.5 },
        battle: { filterFreq: 300,  filterType: 'lowpass',  lfoFreq: 0.4,  lfoDepth: 0.9 },
      }
      const cfg = configs[mood] || configs.sea
      const duration = 8
      const buffer = buildNoiseBuffer(ctx, duration, cfg.filterFreq, cfg.filterType, cfg.lfoFreq, cfg.lfoDepth)

      const source = ctx.createBufferSource()
      source.buffer = buffer
      source.loop = true

      const filter = ctx.createBiquadFilter()
      filter.type = cfg.filterType
      filter.frequency.value = cfg.filterFreq
      if (cfg.filterType === 'bandpass') filter.Q.value = 0.8

      source.connect(filter)
      filter.connect(masterGain)
      source.start()
    }

    return { ctx, masterGain }
  } catch (e) {
    console.error('SFX error:', e)
    return null
  }
}

export default function Story({ onClose }) {
  const [phase, setPhase] = useState('setup')
  const [topic, setTopic] = useState('')
  const [customTopic, setCustomTopic] = useState('')
  const [story, setStory] = useState('')
  const [mood, setMood] = useState('sea')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [typingDone, setTypingDone] = useState(false)
  const [displayed, setDisplayed] = useState('')
  const [isPlaying, setIsPlaying] = useState(false)
  const [sfxVolume, setSfxVolume] = useState(0.5)
  const [voiceEnabled, setVoiceEnabled] = useState(true)
  const [sfxEnabled, setSfxEnabled] = useState(true)
  const [status, setStatus] = useState('')

  const ambientRef = useRef(null)
  const voiceAudioRef = useRef(null)
  const typingRef = useRef(null)

  useEffect(() => () => stopAll(), [])

  function stopAll() {
    if (typingRef.current) { clearInterval(typingRef.current); typingRef.current = null }
    if (voiceAudioRef.current) { voiceAudioRef.current.pause(); voiceAudioRef.current = null }
    if (ambientRef.current) {
      try { ambientRef.current.ctx.close() } catch {}
      ambientRef.current = null
    }
  }

  async function startStory() {
    const finalTopic = customTopic.trim() || topic
    if (!finalTopic) return
    setLoading(true)
    setError('')
    try {
      const res = await axios.post('https://hqbot-backend.onrender.com/api/story', { topic: finalTopic })
      const storyText = res.data.story
      const storyMood = res.data.mood || 'sea'
      setStory(storyText)
      setMood(storyMood)
      setTypingDone(false)
      setDisplayed('')
      setPhase('story')
      setTimeout(() => beginNarration(storyText, storyMood), 200)
    } catch (err) {
      setError(err.response?.data?.error || 'حدث خطأ. حاول مرة أخرى.')
    }
    setLoading(false)
  }

  async function beginNarration(storyText, storyMood) {
    setIsPlaying(true)

    // Start SFX immediately
    if (sfxEnabled) {
      const ambient = startAmbient(storyMood, sfxVolume)
      ambientRef.current = ambient
    }

    // Start typewriter immediately
    let idx = 0
    typingRef.current = setInterval(() => {
      idx += 2
      if (idx >= storyText.length) {
        setDisplayed(storyText)
        setTypingDone(true)
        clearInterval(typingRef.current)
        typingRef.current = null
      } else {
        setDisplayed(storyText.slice(0, idx))
      }
    }, 20)

    // Load TTS in parallel — plays when ready
    if (voiceEnabled) {
      setStatus('⏳ جاري تحميل الصوت...')
      try {
        const cleanText = storyText.replace(/#+\s[^\n]*/g, '').replace(/\*+/g, '').trim()
        const res = await fetch('https://hqbot-backend.onrender.com/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: cleanText.slice(0, 4000) })
        })
        if (!res.ok) throw new Error('TTS failed')
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const audio = new Audio(url)
        voiceAudioRef.current = audio
        audio.volume = 1.0
        audio.onended = () => { setIsPlaying(false); fadeOutAmbient() }
        audio.onerror = () => { setStatus(''); setIsPlaying(false) }
        await audio.play()
        setStatus('')
      } catch (e) {
        console.error('TTS error:', e)
        setStatus('')
      }
    } else {
      setStatus('')
    }
  }

  function fadeOutAmbient() {
    if (!ambientRef.current) return
    const gain = ambientRef.current.masterGain
    let vol = gain.gain.value
    const fade = setInterval(() => {
      vol -= 0.015
      if (vol <= 0) {
        gain.gain.value = 0
        clearInterval(fade)
        try { ambientRef.current?.ctx.close() } catch {}
        ambientRef.current = null
      } else {
        gain.gain.value = vol
      }
    }, 80)
  }

  function togglePlayPause() {
    if (isPlaying) {
      voiceAudioRef.current?.pause()
      if (ambientRef.current) ambientRef.current.masterGain.gain.value = 0
      setIsPlaying(false)
    } else {
      voiceAudioRef.current?.play()
      if (ambientRef.current) ambientRef.current.masterGain.gain.value = sfxVolume * 0.4
      setIsPlaying(true)
    }
  }

  function handleSfxVolume(e) {
    const vol = parseFloat(e.target.value)
    setSfxVolume(vol)
    if (ambientRef.current) ambientRef.current.masterGain.gain.value = vol * 0.4
  }

  function skipTyping() {
    if (typingRef.current) { clearInterval(typingRef.current); typingRef.current = null }
    setDisplayed(story)
    setTypingDone(true)
  }

  function resetStory() {
    stopAll()
    setPhase('setup')
    setStory('')
    setDisplayed('')
    setTopic('')
    setCustomTopic('')
    setTypingDone(false)
    setIsPlaying(false)
    setStatus('')
  }

  const moodConfig = MOOD_CONFIG[mood] || MOOD_CONFIG.sea

  return (
    <div className="story-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="story-modal" style={{
        '--mood-color': moodConfig.color,
        '--mood-dim': moodConfig.colorDim,
        '--mood-border': moodConfig.colorBorder,
        '--mood-gradient': moodConfig.gradient
      }}>

        <div className="story-header">
          <span className="story-badge">📖 وضع القصة</span>
          <button className="story-close" onClick={() => { stopAll(); onClose() }}>✕</button>
        </div>

        {phase === 'setup' && (
          <div className="story-setup">
            <div className="story-title-wrap">
              <h2 className="story-main-title">اختر حدثاً تاريخياً</h2>
              <p className="story-main-desc">سيحوّله الذكاء الاصطناعي إلى رواية سينمائية منطوقة مع مؤثرات صوتية</p>
            </div>

            <div className="story-options-row">
              <button className={`story-option-toggle ${voiceEnabled ? 'active' : ''}`} onClick={() => setVoiceEnabled(v => !v)}>
                🎙️ الصوت {voiceEnabled ? 'مفعّل' : 'معطّل'}
              </button>
              <button className={`story-option-toggle ${sfxEnabled ? 'active' : ''}`} onClick={() => setSfxEnabled(s => !s)}>
                🎵 المؤثرات {sfxEnabled ? 'مفعّلة' : 'معطّلة'}
              </button>
            </div>

            <div className="story-topics">
              {STORY_TOPICS.map(t => (
                <button
                  key={t.id}
                  className={`story-topic-btn ${topic === t.label ? 'active' : ''}`}
                  onClick={() => { setTopic(t.label); setCustomTopic(''); setMood(t.mood) }}
                >
                  <span className="story-topic-icon">{t.icon}</span>
                  <span style={{ flex: 1 }}>{t.label}</span>
                  <span className="story-topic-mood">{MOOD_CONFIG[t.mood].icon} {MOOD_CONFIG[t.mood].label}</span>
                </button>
              ))}
            </div>

            <div className="story-divider"><span>أو اكتب موضوعك</span></div>

            <input
              className="story-input"
              type="text"
              placeholder="مثال: معركة القواسم مع الإنجليز..."
              value={customTopic}
              onChange={e => { setCustomTopic(e.target.value); setTopic('') }}
              dir="rtl"
            />

            {error && <p className="story-error">{error}</p>}

            <button className="story-start-btn" onClick={startStory} disabled={(!topic && !customTopic.trim()) || loading}>
              {loading ? (
                <div className="story-loading">
                  <span className="story-dot" />
                  <span className="story-dot" style={{ animationDelay: '0.2s' }} />
                  <span className="story-dot" style={{ animationDelay: '0.4s' }} />
                  <span style={{ marginRight: 8, fontSize: 13 }}>يُنسج السرد...</span>
                </div>
              ) : '✨ ابدأ القصة المنطوقة'}
            </button>
          </div>
        )}

        {phase === 'story' && (
          <div className="story-content">
            <div className="story-atmosphere-bg" />

            <div className="story-controls">
              <button className="story-play-btn" onClick={togglePlayPause}>
                {isPlaying ? '⏸ إيقاف مؤقت' : '▶ تشغيل'}
              </button>
              <div className="story-vol-wrap">
                <span className="story-vol-icon">🎵</span>
                <input type="range" min="0" max="1" step="0.05" value={sfxVolume} onChange={handleSfxVolume} className="story-vol-slider" />
              </div>
              <div className="story-mood-badge">{moodConfig.icon} {moodConfig.label}</div>
              {status && <div className="story-status">{status}</div>}
            </div>

            <div className="story-body">
              <div className="story-text" dir="rtl">
                {displayed}
                {!typingDone && <span className="story-cursor" />}
              </div>
            </div>

            <div className="story-actions">
              {!typingDone && <button className="story-skip-btn" onClick={skipTyping}>تخطي ←</button>}
              {typingDone && (
                <>
                  <button className="story-start-btn" style={{ flex: 2 }} onClick={resetStory}>✨ قصة جديدة</button>
                  <button className="story-outline-btn" style={{ flex: 1 }} onClick={() => { stopAll(); onClose() }}>إغلاق</button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}