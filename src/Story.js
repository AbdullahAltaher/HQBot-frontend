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
    label: 'أمواج البحر',
    icon: '🌊',
    color: '#38bdf8',
    colorDim: 'rgba(56,189,248,0.08)',
    colorBorder: 'rgba(56,189,248,0.2)',
    sfxUrl: 'https://cdn.pixabay.com/audio/2022/03/15/audio_1e25b9f8da.mp3',
    gradient: 'radial-gradient(ellipse at 50% 100%, rgba(56,189,248,0.06) 0%, transparent 70%)',
  },
  desert: {
    label: 'رياح الصحراء',
    icon: '🌵',
    color: '#f59e0b',
    colorDim: 'rgba(245,158,11,0.08)',
    colorBorder: 'rgba(245,158,11,0.2)',
    sfxUrl: 'https://cdn.pixabay.com/audio/2022/07/26/audio_124bdb5128.mp3',
    gradient: 'radial-gradient(ellipse at 50% 100%, rgba(245,158,11,0.06) 0%, transparent 70%)',
  },
  battle: {
    label: 'أجواء المعركة',
    icon: '⚔️',
    color: '#ef4444',
    colorDim: 'rgba(239,68,68,0.08)',
    colorBorder: 'rgba(239,68,68,0.2)',
    sfxUrl: 'https://cdn.pixabay.com/audio/2022/03/10/audio_270f27c0a1.mp3',
    gradient: 'radial-gradient(ellipse at 50% 100%, rgba(239,68,68,0.06) 0%, transparent 70%)',
  },
  palace: {
    label: 'موسيقى القصر',
    icon: '🎵',
    color: '#a78bfa',
    colorDim: 'rgba(167,139,250,0.08)',
    colorBorder: 'rgba(167,139,250,0.2)',
    sfxUrl: 'https://cdn.pixabay.com/audio/2022/10/25/audio_946b06d1e8.mp3',
    gradient: 'radial-gradient(ellipse at 50% 100%, rgba(167,139,250,0.06) 0%, transparent 70%)',
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
  const [sfxVolume, setSfxVolume] = useState(0.3)
  const [voiceEnabled, setVoiceEnabled] = useState(true)
  const [sfxEnabled, setSfxEnabled] = useState(true)

  const sfxRef = useRef(null)
  const voiceAudioRef = useRef(null)
  const typingRef = useRef(null)
  const indexRef = useRef(0)

  const moodConfig = MOOD_CONFIG[mood] || MOOD_CONFIG.sea

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAll()
    }
  }, [])

  function stopAll() {
    if (sfxRef.current) {
      sfxRef.current.pause()
      sfxRef.current = null
    }
    if (voiceAudioRef.current) {
      voiceAudioRef.current.pause()
      voiceAudioRef.current = null
    }
    if (typingRef.current) {
      clearInterval(typingRef.current)
      typingRef.current = null
    }
  }

  async function startStory() {
    const finalTopic = customTopic.trim() || topic
    if (!finalTopic) return
    setLoading(true)
    setError('')
    try {
      const res = await axios.post('https://hqbot-backend.onrender.com/api/story', {
        topic: finalTopic
      })
      setStory(res.data.story)
      setMood(res.data.mood || 'sea')
      setTypingDone(false)
      setDisplayed('')
      setPhase('story')
      setTimeout(() => beginNarration(res.data.story, res.data.mood || 'sea'), 400)
    } catch (err) {
      setError(err.response?.data?.error || 'حدث خطأ. حاول مرة أخرى.')
    }
    setLoading(false)
  }

  async function beginNarration(storyText, storyMood) {
    const config = MOOD_CONFIG[storyMood] || MOOD_CONFIG.sea

    // Start SFX
    if (sfxEnabled) {
      try {
        const sfx = new Audio(config.sfxUrl)
        sfx.loop = true
        sfx.volume = sfxVolume
        sfxRef.current = sfx
        await sfx.play()
      } catch {}
    }

    setIsPlaying(true)

    // Start typewriter
    indexRef.current = 0
    typingRef.current = setInterval(() => {
      indexRef.current += 2
      if (indexRef.current >= storyText.length) {
        setDisplayed(storyText)
        setTypingDone(true)
        clearInterval(typingRef.current)
        typingRef.current = null
      } else {
        setDisplayed(storyText.slice(0, indexRef.current))
      }
    }, 20)

    // Start voice narration
    if (voiceEnabled) {
      try {
        const cleanText = storyText.replace(/#+\s/g, '').replace(/\*/g, '').trim()
        const res = await fetch('https://hqbot-backend.onrender.com/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: cleanText.slice(0, 4000) })
        })
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const audio = new Audio(url)
        voiceAudioRef.current = audio
        audio.onended = () => {
          setIsPlaying(false)
          fadeOutSfx()
        }
        audio.play()
      } catch {}
    }
  }

  function fadeOutSfx() {
    if (!sfxRef.current) return
    const sfx = sfxRef.current
    const fadeInterval = setInterval(() => {
      if (sfx.volume > 0.02) {
        sfx.volume = Math.max(0, sfx.volume - 0.02)
      } else {
        sfx.pause()
        clearInterval(fadeInterval)
      }
    }, 100)
  }

  function togglePlayPause() {
    if (isPlaying) {
      voiceAudioRef.current?.pause()
      sfxRef.current?.pause()
      setIsPlaying(false)
    } else {
      voiceAudioRef.current?.play()
      if (sfxRef.current) {
        sfxRef.current.volume = sfxVolume
        sfxRef.current.play()
      }
      setIsPlaying(true)
    }
  }

  function handleSfxVolume(e) {
    const vol = parseFloat(e.target.value)
    setSfxVolume(vol)
    if (sfxRef.current) sfxRef.current.volume = vol
  }

  function skipTyping() {
    if (typingRef.current) {
      clearInterval(typingRef.current)
      typingRef.current = null
    }
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
  }

  return (
    <div className="story-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="story-modal" style={{ '--mood-color': moodConfig.color, '--mood-dim': moodConfig.colorDim, '--mood-border': moodConfig.colorBorder, '--mood-gradient': moodConfig.gradient }}>

        <div className="story-header">
          <span className="story-badge">📖 وضع القصة</span>
          <button className="story-close" onClick={() => { stopAll(); onClose() }}>✕</button>
        </div>

        {/* SETUP */}
        {phase === 'setup' && (
          <div className="story-setup">
            <div className="story-title-wrap">
              <h2 className="story-main-title">اختر حدثاً تاريخياً</h2>
              <p className="story-main-desc">سيحوّله الذكاء الاصطناعي إلى رواية سينمائية منطوقة</p>
            </div>

            <div className="story-options-row">
              <button
                className={`story-option-toggle ${voiceEnabled ? 'active' : ''}`}
                onClick={() => setVoiceEnabled(v => !v)}
              >
                🎙️ الصوت {voiceEnabled ? 'مفعّل' : 'معطّل'}
              </button>
              <button
                className={`story-option-toggle ${sfxEnabled ? 'active' : ''}`}
                onClick={() => setSfxEnabled(s => !s)}
              >
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
                  <span>{t.label}</span>
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

            <button
              className="story-start-btn"
              onClick={startStory}
              disabled={(!topic && !customTopic.trim()) || loading}
            >
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

        {/* STORY */}
        {phase === 'story' && (
          <div className="story-content">
            <div className="story-atmosphere-bg" />

            {/* Controls */}
            <div className="story-controls">
              <button className="story-play-btn" onClick={togglePlayPause}>
                {isPlaying ? '⏸' : '▶'} {isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
              </button>

              <div className="story-vol-wrap">
                <span className="story-vol-icon">🎵</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={sfxVolume}
                  onChange={handleSfxVolume}
                  className="story-vol-slider"
                />
              </div>

              <div className="story-mood-badge">
                {moodConfig.icon} {moodConfig.label}
              </div>
            </div>

            {/* Text */}
            <div className="story-body">
              <div className="story-text" dir="rtl">
                {displayed}
                {!typingDone && <span className="story-cursor" />}
              </div>
            </div>

            {/* Actions */}
            <div className="story-actions">
              {!typingDone && (
                <button className="story-skip-btn" onClick={skipTyping}>تخطي ←</button>
              )}
              {typingDone && (
                <>
                  <button className="story-start-btn" style={{ flex: 2 }} onClick={resetStory}>
                    ✨ قصة جديدة
                  </button>
                  <button className="story-outline-btn" style={{ flex: 1 }} onClick={() => { stopAll(); onClose() }}>
                    إغلاق
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}