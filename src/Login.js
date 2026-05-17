import { useState } from 'react'
import logo from './qawasim_chatbot_logo.svg'
import './Login.css'

export default function Login({ onEnter }) {
  const [step, setStep] = useState('splash') // 'splash' | 'name' | 'password'
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const CORRECT_PASSWORD = 'qawasim2024'

  function handleSplash() {
    setStep('name')
  }

  function handleName(e) {
    e.preventDefault()
    if (!name.trim()) return
    setStep('password')
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