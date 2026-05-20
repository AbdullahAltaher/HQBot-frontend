import { useState } from 'react'
import logo from './qawasim_chatbot_logo.svg'
import './Settings.css'

export default function Settings({ user, onClose, onLogout, settings, onSettingsChange }) {
  const [localSettings, setLocalSettings] = useState(settings)

  function update(key, value) {
    const updated = { ...localSettings, [key]: value }
    setLocalSettings(updated)
    onSettingsChange(updated)
  }

  const ar = localSettings.language === 'ar'

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={e => e.stopPropagation()}>

        <div className="settings-header">
          <img src={logo} alt="logo" style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid rgba(201,168,76,0.2)' }} />
          <h2>{ar ? 'الإعدادات' : 'Settings'}</h2>
          <button className="settings-close" onClick={onClose}>✕</button>
        </div>

        {/* USER */}
        <div className="settings-section">
          <div className="settings-section-title">{ar ? '◆ المستخدم' : '◆ User'}</div>
          <div className="settings-row">
            <div className="settings-user-info">
              <div className="settings-avatar">{user[0].toUpperCase()}</div>
              <span>{user}</span>
            </div>
            <button className="settings-logout-btn" onClick={onLogout}>
              {ar ? 'خروج' : 'Logout'}
            </button>
          </div>
        </div>

        {/* APPEARANCE */}
        <div className="settings-section">
          <div className="settings-section-title">{ar ? '◆ المظهر' : '◆ Appearance'}</div>

          <div className="settings-row">
            <span className="settings-label">{ar ? 'الوضع' : 'Mode'}</span>
            <div className="settings-toggle-group">
              <button className={`toggle-option ${localSettings.theme === 'dark' ? 'active' : ''}`}
                onClick={() => update('theme', 'dark')}>
                🌙 {ar ? 'داكن' : 'Dark'}
              </button>
              <button className={`toggle-option ${localSettings.theme === 'light' ? 'active' : ''}`}
                onClick={() => update('theme', 'light')}>
                ☀️ {ar ? 'فاتح' : 'Light'}
              </button>
            </div>
          </div>

          <div className="settings-row">
            <span className="settings-label">{ar ? 'حجم الخط' : 'Font Size'}</span>
            <div className="settings-toggle-group">
              <button className={`toggle-option ${localSettings.fontSize === 'small' ? 'active' : ''}`}
                onClick={() => update('fontSize', 'small')}
                style={{ fontSize: 12 }}>A</button>
              <button className={`toggle-option ${localSettings.fontSize === 'medium' ? 'active' : ''}`}
                onClick={() => update('fontSize', 'medium')}
                style={{ fontSize: 15 }}>A</button>
              <button className={`toggle-option ${localSettings.fontSize === 'large' ? 'active' : ''}`}
                onClick={() => update('fontSize', 'large')}
                style={{ fontSize: 19 }}>A</button>
            </div>
          </div>
        </div>

        {/* LANGUAGE */}
        <div className="settings-section">
          <div className="settings-section-title">{ar ? '◆ اللغة' : '◆ Language'}</div>
          <div className="settings-row">
            <span className="settings-label">{ar ? 'لغة الواجهة' : 'Interface Language'}</span>
            <div className="settings-toggle-group">
              <button className={`toggle-option ${localSettings.language === 'ar' ? 'active' : ''}`}
                onClick={() => update('language', 'ar')}>عربي</button>
              <button className={`toggle-option ${localSettings.language === 'en' ? 'active' : ''}`}
                onClick={() => update('language', 'en')}>English</button>
            </div>
          </div>
        </div>

        {/* TTS */}
        <div className="settings-section">
          <div className="settings-section-title">{ar ? '◆ الصوت' : '◆ Voice'}</div>
          <div className="settings-row">
            <span className="settings-label">{ar ? 'قراءة الإجابات بصوت' : 'Read answers aloud'}</span>
            <div className="settings-toggle-group">
              <button className={`toggle-option ${localSettings.tts ? 'active' : ''}`}
                onClick={() => update('tts', true)}>
                {ar ? 'تفعيل' : 'On'}
              </button>
              <button className={`toggle-option ${!localSettings.tts ? 'active' : ''}`}
                onClick={() => update('tts', false)}>
                {ar ? 'إيقاف' : 'Off'}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}