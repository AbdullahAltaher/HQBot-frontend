import { useState, useEffect } from 'react'
import logo from './qawasim_chatbot_logo.svg'
import './Settings.css'

export default function Settings({ user, onClose, onLogout, settings, onSettingsChange }) {
  const [localSettings, setLocalSettings] = useState(settings)

  function update(key, value) {
    const updated = { ...localSettings, [key]: value }
    setLocalSettings(updated)
    onSettingsChange(updated)
  }

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={e => e.stopPropagation()}>
        <div className="settings-header">
          <img src={logo} alt="logo" style={{ width: 32, height: 32 }} />
          <h2>{localSettings.language === 'ar' ? 'الإعدادات' : 'Settings'}</h2>
          <button className="settings-close" onClick={onClose}>✕</button>
        </div>

        {/* USER */}
        <div className="settings-section">
          <div className="settings-section-title">
            {localSettings.language === 'ar' ? '👤 المستخدم' : '👤 User'}
          </div>
          <div className="settings-row">
            <div className="settings-user-info">
              <div className="settings-avatar">{user[0].toUpperCase()}</div>
              <span>{user}</span>
            </div>
            <button className="settings-logout-btn" onClick={onLogout}>
              {localSettings.language === 'ar' ? 'تسجيل خروج' : 'Logout'}
            </button>
          </div>
        </div>

        {/* APPEARANCE */}
        <div className="settings-section">
          <div className="settings-section-title">
            {localSettings.language === 'ar' ? '🎨 المظهر' : '🎨 Appearance'}
          </div>

          {/* DARK/LIGHT MODE */}
          <div className="settings-row">
            <span className="settings-label">
              {localSettings.language === 'ar' ? 'الوضع' : 'Mode'}
            </span>
            <div className="settings-toggle-group">
              <button
                className={`toggle-option ${localSettings.theme === 'dark' ? 'active' : ''}`}
                onClick={() => update('theme', 'dark')}
              >🌙 {localSettings.language === 'ar' ? 'داكن' : 'Dark'}</button>
              <button
                className={`toggle-option ${localSettings.theme === 'light' ? 'active' : ''}`}
                onClick={() => update('theme', 'light')}
              >☀️ {localSettings.language === 'ar' ? 'فاتح' : 'Light'}</button>
            </div>
          </div>

          {/* FONT SIZE */}
          <div className="settings-row">
            <span className="settings-label">
              {localSettings.language === 'ar' ? 'حجم الخط' : 'Font Size'}
            </span>
            <div className="settings-toggle-group">
              <button
                className={`toggle-option ${localSettings.fontSize === 'small' ? 'active' : ''}`}
                onClick={() => update('fontSize', 'small')}
              >A</button>
              <button
                className={`toggle-option ${localSettings.fontSize === 'medium' ? 'active' : ''}`}
                onClick={() => update('fontSize', 'medium')}
                style={{ fontSize: 16 }}
              >A</button>
              <button
                className={`toggle-option ${localSettings.fontSize === 'large' ? 'active' : ''}`}
                onClick={() => update('fontSize', 'large')}
                style={{ fontSize: 20 }}
              >A</button>
            </div>
          </div>
        </div>

        {/* LANGUAGE */}
        <div className="settings-section">
          <div className="settings-section-title">
            {localSettings.language === 'ar' ? '🌐 اللغة' : '🌐 Language'}
          </div>
          <div className="settings-row">
            <span className="settings-label">
              {localSettings.language === 'ar' ? 'لغة الواجهة' : 'Interface Language'}
            </span>
            <div className="settings-toggle-group">
              <button
                className={`toggle-option ${localSettings.language === 'ar' ? 'active' : ''}`}
                onClick={() => update('language', 'ar')}
              >عربي</button>
              <button
                className={`toggle-option ${localSettings.language === 'en' ? 'active' : ''}`}
                onClick={() => update('language', 'en')}
              >English</button>
            </div>
          </div>
        </div>

        {/* TTS */}
        <div className="settings-section">
          <div className="settings-section-title">
            {localSettings.language === 'ar' ? '🔊 تحويل النص لصوت' : '🔊 Text to Speech'}
          </div>
          <div className="settings-row">
            <span className="settings-label">
              {localSettings.language === 'ar' ? 'قراءة الإجابات بصوت' : 'Read answers aloud'}
            </span>
            <div className="settings-toggle-group">
              <button
                className={`toggle-option ${localSettings.tts ? 'active' : ''}`}
                onClick={() => update('tts', true)}
              >{localSettings.language === 'ar' ? 'تفعيل' : 'On'}</button>
              <button
                className={`toggle-option ${!localSettings.tts ? 'active' : ''}`}
                onClick={() => update('tts', false)}
              >{localSettings.language === 'ar' ? 'إيقاف' : 'Off'}</button>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}