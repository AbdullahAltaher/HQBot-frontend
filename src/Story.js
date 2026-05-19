import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import './Story.css'

const STORY_TOPICS = [
  { id: 'treaty1820', label: 'معاهدة الصلح العام 1820', icon: '⚓' },
  { id: 'qawasim', label: 'صعود القواسم وسيطرتهم على الخليج', icon: '🏴' },
  { id: 'sharjah', label: 'تأسيس إمارة الشارقة', icon: '🏰' },
  { id: 'sultan', label: 'الشيخ سلطان بن صقر والبريطانيين', icon: '⚔️' },
  { id: 'najd', label: 'توحيد نجد وظهور الدولة السعودية', icon: '🌅' },
  { id: 'abumousa', label: 'قصة جزيرة أبو موسى', icon: '🏝️' },
]

function TypewriterText({ text, speed = 18, onDone }) {
  const [displayed, setDisplayed] = useState('')
  const [done, setDone] = useState(false)
  const index = useRef(0)

  useEffect(() => {
    if (!text) return
    index.current = 0
    setDisplayed('')
    setDone(false)
    const interval = setInterval(() => {
      index.current += 2
      if (index.current >= text.length) {
        setDisplayed(text)
        setDone(true)
        clearInterval(interval)
        onDone && onDone()
      } else {
        setDisplayed(text.slice(0, index.current))
      }
    }, speed)
    return () => clearInterval(interval)
  }, [text])

  return (
    <div className="story-text" dir="rtl">
      {displayed}
      {!done && <span className="story-cursor" />}
    </div>
  )
}

export default function Story({ onClose }) {
  const [phase, setPhase] = useState('setup')
  const [topic, setTopic] = useState('')
  const [customTopic, setCustomTopic] = useState('')
  const [story, setStory] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [typingDone, setTypingDone] = useState(false)
  const storyRef = useRef(null)

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
      setTypingDone(false)
      setPhase('story')
    } catch (err) {
      setError(err.response?.data?.error || 'حدث خطأ. حاول مرة أخرى.')
    }
    setLoading(false)
  }

  function handleSkip() {
    setTypingDone(true)
  }

  return (
    <div className="story-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="story-modal">

        <div className="story-header">
          <div className="story-header-left">
            <span className="story-badge">📖 وضع القصة</span>
          </div>
          <button className="story-close" onClick={onClose}>✕</button>
        </div>

        {/* SETUP */}
        {phase === 'setup' && (
          <div className="story-setup">
            <div className="story-title-wrap">
              <h2 className="story-main-title">اختر حدثاً تاريخياً</h2>
              <p className="story-main-desc">سيحوّله الذكاء الاصطناعي إلى قصة روائية سينمائية</p>
            </div>

            <div className="story-topics">
              {STORY_TOPICS.map(t => (
                <button
                  key={t.id}
                  className={`story-topic-btn ${topic === t.label ? 'active' : ''}`}
                  onClick={() => { setTopic(t.label); setCustomTopic('') }}
                >
                  <span className="story-topic-icon">{t.icon}</span>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>

            <div className="story-divider">
              <span>أو اكتب موضوعك</span>
            </div>

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
              ) : (
                <>✨ ابدأ القصة</>
              )}
            </button>
          </div>
        )}

        {/* STORY */}
        {phase === 'story' && (
          <div className="story-content" ref={storyRef}>
            <div className="story-atmosphere">
              <div className="story-stars">
                {[...Array(20)].map((_, i) => (
                  <div
                    key={i}
                    className="story-star"
                    style={{
                      left: `${Math.random() * 100}%`,
                      top: `${Math.random() * 100}%`,
                      animationDelay: `${Math.random() * 3}s`,
                      width: Math.random() > 0.7 ? '2px' : '1px',
                      height: Math.random() > 0.7 ? '2px' : '1px',
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="story-body">
              {typingDone ? (
                <div className="story-text" dir="rtl">{story}</div>
              ) : (
                <TypewriterText
                  text={story}
                  speed={15}
                  onDone={() => setTypingDone(true)}
                />
              )}
            </div>

            <div className="story-actions">
              {!typingDone && (
                <button className="story-skip-btn" onClick={handleSkip}>
                  تخطي ←
                </button>
              )}
              {typingDone && (
                <>
                  <button
                    className="story-start-btn"
                    onClick={() => { setPhase('setup'); setStory(''); setTopic(''); setCustomTopic('') }}
                  >
                    قصة جديدة ✨
                  </button>
                  <button className="story-outline-btn" onClick={onClose}>
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