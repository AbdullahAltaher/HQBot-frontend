import { useState } from 'react'
import logo from './qawasim_chatbot_logo.svg'
import './Login.css'

export default function Login({ onEnter }) {
  const [step, setStep] = useState('splash')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const CORRECT_PASSWORD = 'q2024'

  function handleSplash() {
    setStep('name')
  }

  function handleName(e) {
    e.preventDefault()
    if (!name.trim()) return
    if (name.trim().toLowerCase() === 'soso') {
      setStep('soso')
    } else {
      setStep('password')
    }
  }

  function handlePassword(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setTimeout(() => {
      if (password === CORRECT_PASSWORD) {
        onEnter(name.trim())
      } else {
        setError('كلمة المرور غير صحيحة')
        setLoading(false)
      }
    }, 600)
  }

  return (
    <div className="login-page">
      <div className="login-bg" />

      {/* SPLASH */}
      {step === 'splash' && (
        <div className="login-card splash animate-in">
          <img src={logo} alt="logo" className="login-logo" />
          <h1 className="login-title">QAWASIM</h1>
          <p className="login-subtitle">HISTORY · AI</p>
          <p className="login-desc">
            مساعد ذكي متخصص في تاريخ القواسم والخليج العربي<br />
            مبني على مصادر موثقة من مكتبة سلطان القاسمي
          </p>
          <div className="login-features">
            <div className="feature">
              <span>📚</span>
              <span>مصادر موثقة</span>
            </div>
            <div className="feature">
              <span>🔍</span>
              <span>بحث دقيق</span>
            </div>
            <div className="feature">
              <span>🤖</span>
              <span>ذكاء اصطناعي</span>
            </div>
          </div>
          <button className="login-btn" onClick={handleSplash}>
            ابدأ الآن
            <span>←</span>
          </button>
          <p className="login-hint">مدعوم بتقنية Claude AI · Cohere · pgvector</p>
        </div>
      )}

      {/* NAME */}
      {step === 'name' && (
        <div className="login-card animate-in">
          <img src={logo} alt="logo" className="login-logo-sm" />
          <h2 className="login-card-title">أهلاً بك 👋</h2>
          <p className="login-card-desc">ما اسمك؟ حتى نستطيع مخاطبتك</p>
          <form onSubmit={handleName} className="login-form">
            <input
              className="login-input"
              type="text"
              placeholder="اكتب اسمك هنا..."
              value={name}
              onChange={e => setName(e.target.value)}
              dir="auto"
              autoFocus
            />
            <button
              className="login-btn"
              type="submit"
              disabled={!name.trim()}
            >
              التالي ←
            </button>
          </form>
        </div>
      )}

      {/* SOSO SPECIAL PAGE */}
      {step === 'soso' && (
        <div className="login-card animate-in" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 60, marginBottom: 16 }}>🌸💕</div>
          <h2 className="login-card-title" style={{ fontSize: 28, lineHeight: 1.6 }}>
            مرحبااااا السااااع غناااتيييي
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', margin: '16px 0 32px', fontSize: 16 }}>
            منورة الموقع فديتج✨
          </p>
          <button
            className="login-btn"
            onClick={() => setStep('password')}
          >
            فداا←
          </button>
        </div>
      )}

      {/* PASSWORD */}
      {step === 'password' && (
        <div className="login-card animate-in">
          <img src={logo} alt="logo" className="login-logo-sm" />
          <h2 className="login-card-title">مرحباً {name}! 🔐</h2>
          <p className="login-card-desc">أدخل كلمة المرور للدخول</p>
          <form onSubmit={handlePassword} className="login-form">
            <input
              className={`login-input ${error ? 'error' : ''}`}
              type="password"
              placeholder="كلمة المرور..."
              value={password}
              onChange={e => { setPassword(e.target.value); setError('') }}
              autoFocus
            />
            {error && <p className="login-error">{error}</p>}
            <button
              className="login-btn"
              type="submit"
              disabled={!password || loading}
            >
              {loading ? '...' : 'دخول ←'}
            </button>
          </form>
          <button className="back-btn" onClick={() => setStep('name')}>
            ← رجوع
          </button>
        </div>
      )}
    </div>
  )
}