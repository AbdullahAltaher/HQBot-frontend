import { useState, useRef, useEffect, useCallback } from 'react'
import axios from 'axios'
import ReactMarkdown from 'react-markdown'
import logo from './qawasim_chatbot_logo.svg'
import Login from './Login'
import Settings from './Settings'
import './App.css'

const DEFAULT_SETTINGS = {
  theme: 'dark',
  fontSize: 'medium',
  language: 'ar',
  tts: false
}

const FONT_SIZES = { small: '13px', medium: '15px', large: '18px' }

const UI = {
  ar: {
    newChat: 'محادثة جديدة',
    noChats: 'لا توجد محادثات بعد',
    assistant: 'مساعد التاريخ والشعر العربي',
    welcome: 'كيف يمكنني مساعدتك؟',
    welcomeDesc: 'اسألني عن تاريخ القواسم والخليج ونجد وآل سعود',
    placeholder: 'اسأل عن التاريخ والشعر العربي...',
    hint: 'Enter للإرسال · Shift+Enter لسطر جديد',
    copy: 'نسخ',
    copied: '✓ تم',
    source: 'مصدر',
    error: 'حدث خطأ في الاتصال. يرجى المحاولة مرة أخرى.',
    hello: 'أهلاً',
    canHelp: '، كيف يمكنني مساعدتك؟',
    badge: 'RAG · CLAUDE',
    stop: 'إيقاف',
    speak: 'استمع',
    related: 'أسئلة مقترحة'
  },
  en: {
    newChat: 'New Chat',
    noChats: 'No chats yet',
    assistant: 'Qawasim History Assistant',
    welcome: 'How can I help you?',
    welcomeDesc: 'Ask me about Qawasim history, Sharjah, Najd and Al Saud',
    placeholder: 'Ask about history and Arabic poetry...',
    hint: 'Enter to send · Shift+Enter for new line',
    copy: 'Copy',
    copied: '✓ Done',
    source: 'Source',
    error: 'Connection error. Please try again.',
    hello: 'Hello',
    canHelp: ', how can I help you?',
    badge: 'RAG · CLAUDE',
    stop: 'Stop',
    speak: 'Listen',
    related: 'Suggested questions'
  }
}

const SUGGESTIONS = {
  ar: ['من هم القواسم؟', 'ما هي معاهدة 1820؟', 'ما تاريخ نجد وآل سعود؟', 'من هو سلطان بن صقر؟'],
  en: ['Who are the Qawasim?', 'What is the 1820 treaty?', 'History of Najd and Al Saud?', 'Who is Sultan bin Saqr?']
}

let chatIdCounter = 1

function loadChatsFromStorage(username) {
  try {
    const data = localStorage.getItem(`chats_${username}`)
    return data ? JSON.parse(data) : []
  } catch { return [] }
}

function saveChatsToStorage(username, chats) {
  try {
    localStorage.setItem(`chats_${username}`, JSON.stringify(chats))
  } catch {}
}

function loadSettings() {
  try {
    const data = localStorage.getItem('app_settings')
    return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS
  } catch { return DEFAULT_SETTINGS }
}

function saveSettings(settings) {
  try {
    localStorage.setItem('app_settings', JSON.stringify(settings))
  } catch {}
}

function applyTheme(theme) {
  if (theme === 'light') document.body.classList.add('light')
  else document.body.classList.remove('light')
}

function applyFontSize(size) {
  document.documentElement.style.setProperty('--chat-font-size', FONT_SIZES[size])
}

function TTSButton({ text, lang, ui }) {
  const [speaking, setSpeaking] = useState(false)
  const audioRef = useRef(null)

  async function toggleSpeak() {
    if (speaking) {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
      setSpeaking(false)
      return
    }
    const cleanText = text.replace(/[#*`_]/g, '').replace(/\[.*?\]/g, '').replace(/\s+/g, ' ').trim()
    setSpeaking(true)
    try {
      const res = await fetch('https://hqbot-backend.onrender.com/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: cleanText })
      })
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audioRef.current = audio
      audio.onended = () => setSpeaking(false)
      audio.onerror = () => setSpeaking(false)
      audio.play()
    } catch {
      setSpeaking(false)
    }
  }

  return (
    <button className="copy-btn" onClick={toggleSpeak}>
      {speaking ? `⏹ ${ui.stop}` : `🔊 ${ui.speak}`}
    </button>
  )
}

function CopyButton({ text, ui }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button className="copy-btn" onClick={copy}>
      {copied ? ui.copied : ui.copy}
    </button>
  )
}

function AssistantMessage({ msg, settings, ui, onSendMessage }) {
  const questions = msg.suggestedQuestions || []
  return (
    <div className="message assistant">
      <div className="assistant-row">
        <div className="ai-avatar">
          <img src={logo} alt="logo" style={{ width: 14, height: 14 }} />
        </div>
        <div className="assistant-bubble" dir="auto">
          <ReactMarkdown>{msg.text}</ReactMarkdown>
          {questions.length > 0 && (
            <div className="related-questions">
              <p className="related-title">💡 {ui.related}</p>
              {questions.map((q, qi) => (
                <button key={qi} className="related-btn" onClick={() => onSendMessage(q)}>{q}</button>
              ))}
            </div>
          )}
        </div>
      </div>
      {msg.sources && msg.sources.length > 0 && (
        <div className="sources">
          {msg.sources.slice(0, 4).map((s, j) => (
            <span key={j} className="source-tag">
              {s.metadata?.title || ui.source} · {Math.round(s.similarity * 100)}%
            </span>
          ))}
        </div>
      )}
      <div className="message-actions">
        <CopyButton text={msg.text} ui={ui} />
        {settings.tts && <TTSButton text={msg.text} lang={settings.language} ui={ui} />}
      </div>
    </div>
  )
}

function TypingMessage({ fullText, sources, suggestedQuestions, onDone, settings, ui, onSendMessage }) {
  const [displayed, setDisplayed] = useState('')
  const [done, setDone] = useState(false)
  const index = useRef(0)

  useEffect(() => {
    if (!fullText) return
    index.current = 0
    setDisplayed('')
    setDone(false)
    const interval = setInterval(() => {
      index.current += 3
      if (index.current >= fullText.length) {
        setDisplayed(fullText)
        setDone(true)
        clearInterval(interval)
        onDone && onDone()
      } else {
        setDisplayed(fullText.slice(0, index.current))
      }
    }, 12)
    return () => clearInterval(interval)
  }, [fullText])

  const questions = done ? (suggestedQuestions || []) : []

  return (
    <div className="message assistant">
      <div className="assistant-row">
        <div className="ai-avatar">
          <img src={logo} alt="logo" style={{ width: 14, height: 14 }} />
        </div>
        <div className="assistant-bubble" dir="auto">
          <ReactMarkdown>{displayed}</ReactMarkdown>
          {!done && <span className="cursor" />}
          {done && questions.length > 0 && (
            <div className="related-questions">
              <p className="related-title">💡 {ui.related}</p>
              {questions.map((q, qi) => (
                <button key={qi} className="related-btn" onClick={() => onSendMessage(q)}>{q}</button>
              ))}
            </div>
          )}
        </div>
      </div>
      {done && sources && sources.length > 0 && (
        <div className="sources">
          {sources.slice(0, 4).map((s, j) => (
            <span key={j} className="source-tag">
              {s.metadata?.title || ui.source} · {Math.round(s.similarity * 100)}%
            </span>
          ))}
        </div>
      )}
      {done && (
        <div className="message-actions">
          <CopyButton text={fullText} ui={ui} />
          {settings.tts && <TTSButton text={fullText} lang={settings.language} ui={ui} />}
        </div>
      )}
    </div>
  )
}

function ThinkingDots() {
  return (
    <div className="message assistant">
      <div className="assistant-row">
        <div className="ai-avatar">
          <img src={logo} alt="logo" style={{ width: 14, height: 14 }} />
        </div>
        <div className="assistant-bubble">
          <span className="cursor" style={{ marginLeft: 2 }} />
          <span className="cursor" style={{ animationDelay: '0.3s', marginLeft: 5 }} />
          <span className="cursor" style={{ animationDelay: '0.6s', marginLeft: 5 }} />
        </div>
      </div>
    </div>
  )
}

function ChatItem({ chat, active, onClick, onDelete, onRename }) {
  const [hovering, setHovering] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editVal, setEditVal] = useState(chat.title)
  const inputRef = useRef(null)

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  function submitRename() {
    if (editVal.trim()) onRename(editVal.trim())
    setEditing(false)
  }

  return (
    <div
      className={`chat-item ${active ? 'active' : ''}`}
      onClick={onClick}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <span className="chat-icon">◈</span>
      {editing ? (
        <input
          ref={inputRef}
          className="chat-rename-input"
          value={editVal}
          onChange={e => setEditVal(e.target.value)}
          onBlur={submitRename}
          onKeyDown={e => {
            if (e.key === 'Enter') submitRename()
            if (e.key === 'Escape') setEditing(false)
          }}
          onClick={e => e.stopPropagation()}
        />
      ) : (
        <span className="chat-title">{chat.title}</span>
      )}
      {(hovering || active) && !editing && (
        <div className="chat-actions" onClick={e => e.stopPropagation()}>
          <button className="chat-action-btn" onClick={() => { setEditing(true); setEditVal(chat.title) }}>✏️</button>
          <button className="chat-action-btn" onClick={onDelete}>🗑</button>
        </div>
      )}
    </div>
  )
}

export default function App() {
  const [user, setUser] = useState(null)
  const [chats, setChats] = useState([])
  const [activeChatId, setActiveChatId] = useState(null)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [settings, setSettings] = useState(loadSettings)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)
  const bottomRef = useRef(null)
  const textareaRef = useRef(null)

  const ui = UI[settings.language]
  const suggestions = SUGGESTIONS[settings.language]
  const activeChat = chats.find(c => c.id === activeChatId)
  const messages = activeChat?.messages || []

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    setSidebarOpen(!isMobile)
  }, [isMobile])

  useEffect(() => {
    applyTheme(settings.theme)
    applyFontSize(settings.fontSize)
  }, [settings])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    if (!user) return
    const saved = loadChatsFromStorage(user)
    if (saved.length > 0) {
      setChats(saved)
      setActiveChatId(saved[0].id)
    } else {
      createNewChat(user)
    }
  }, [user])

  function handleSettingsChange(newSettings) {
    setSettings(newSettings)
    saveSettings(newSettings)
    applyTheme(newSettings.theme)
    applyFontSize(newSettings.fontSize)
  }

  function handleLogout() {
    window.speechSynthesis?.cancel()
    setUser(null)
    setChats([])
    setActiveChatId(null)
    setShowSettings(false)
  }

  function createNewChat(username) {
    const id = `chat_${Date.now()}_${chatIdCounter++}`
    const newC = { id, title: ui.newChat, messages: [] }
    setChats(prev => {
      const updated = [newC, ...prev]
      saveChatsToStorage(username || user, updated)
      return updated
    })
    setActiveChatId(id)
    setInput('')
    if (isMobile) setSidebarOpen(false)
    return id
  }

  function updateChats(updatedChats) {
    setChats(updatedChats)
    saveChatsToStorage(user, updatedChats)
  }

  function deleteChat(id) {
    const remaining = chats.filter(c => c.id !== id)
    if (remaining.length === 0) createNewChat()
    else {
      updateChats(remaining)
      if (activeChatId === id) setActiveChatId(remaining[0].id)
    }
  }

  function renameChat(id, newTitle) {
    updateChats(chats.map(c => c.id === id ? { ...c, title: newTitle } : c))
  }

  const sendMessage = useCallback(async (text) => {
    const question = text || input.trim()
    if (!question || loading) return

    let currentChatId = activeChatId
    if (!currentChatId) currentChatId = createNewChat()

    setInput('')
    if (isMobile) setSidebarOpen(false)
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    const currentMessages = chats.find(c => c.id === currentChatId)?.messages || []
    const newMessages = [...currentMessages, { role: 'user', text: question }]
    const firstUser = newMessages.find(m => m.role === 'user')
    const title = firstUser
      ? firstUser.text.slice(0, 30) + (firstUser.text.length > 30 ? '...' : '')
      : ui.newChat

    const updatedWithUser = chats.map(c =>
      c.id === currentChatId ? { ...c, messages: newMessages, title } : c
    )
    updateChats(updatedWithUser)
    setLoading(true)

    try {
      const res = await axios.post('https://hqbot-backend.onrender.com/api/chat', {
        question,
        history: currentMessages.slice(-6).map(m => ({ role: m.role, text: m.text }))
      })
      const withAnswer = [...newMessages, {
        role: 'assistant',
        text: res.data.answer,
        sources: res.data.sources,
        suggestedQuestions: res.data.suggestedQuestions || [],
        typing: true
      }]
      updateChats(updatedWithUser.map(c =>
        c.id === currentChatId ? { ...c, messages: withAnswer, title } : c
      ))
    } catch {
      const withError = [...newMessages, {
        role: 'assistant',
        text: ui.error,
        typing: true
      }]
      updateChats(updatedWithUser.map(c =>
        c.id === currentChatId ? { ...c, messages: withError, title } : c
      ))
    }
    setLoading(false)
  }, [input, loading, chats, activeChatId, user, ui, isMobile])

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  function handleInput(e) {
    setInput(e.target.value)
    const t = textareaRef.current
    t.style.height = 'auto'
    t.style.height = Math.min(t.scrollHeight, 160) + 'px'
  }

  const showWelcome = messages.length === 0 && !loading

  if (!user) return <Login onEnter={(name) => setUser(name)} />

  return (
    <div className="app">
      {showSettings && (
        <Settings
          user={user}
          onClose={() => setShowSettings(false)}
          onLogout={handleLogout}
          settings={settings}
          onSettingsChange={handleSettingsChange}
        />
      )}

      {sidebarOpen && isMobile && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      <div className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <button className="new-chat-btn" onClick={() => createNewChat()}>
            <span>+</span> {ui.newChat}
          </button>
          <button className="toggle-btn" onClick={() => setSidebarOpen(false)}>✕</button>
        </div>
        <div className="chat-list">
          {chats.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 12, letterSpacing: '0.04em' }}>
              {ui.noChats}
            </div>
          ) : (
            chats.map(chat => (
              <ChatItem
                key={chat.id}
                chat={chat}
                active={chat.id === activeChatId}
                onClick={() => {
                  setActiveChatId(chat.id)
                  if (isMobile) setSidebarOpen(false)
                }}
                onDelete={() => deleteChat(chat.id)}
                onRename={(newTitle) => renameChat(chat.id, newTitle)}
              />
            ))
          )}
        </div>
        <div className="sidebar-footer">
          <div className="sidebar-info">
            <img src={logo} alt="logo" style={{ width: 24, height: 24, borderRadius: '50%', border: '1px solid var(--border-dim)' }} />
            <span>{user}</span>
          </div>
          <button className="settings-btn" onClick={() => setShowSettings(true)}>⚙️</button>
        </div>
      </div>

      <div className="main">
        <header className="header">
          <button className="toggle-btn open-btn" onClick={() => setSidebarOpen(true)}>☰</button>
          <img src={logo} alt="logo" className="header-logo" />
          <h1>{ui.assistant}</h1>
          <button className="settings-btn-header" onClick={() => setShowSettings(true)}>⚙️</button>
          <span className="header-badge">{ui.badge}</span>
        </header>

        <div className="messages">
          {showWelcome && (
            <div className="welcome">
              <img src={logo} alt="logo" className="welcome-logo" />
              <h2>{ui.hello} {user}{ui.canHelp}</h2>
              <p>{ui.welcomeDesc}</p>
              <div className="suggestions">
                {suggestions.map((s, i) => (
                  <button key={i} className="suggestion" onClick={() => sendMessage(s)}>{s}</button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => {
            if (msg.role === 'user') {
              return (
                <div key={i} className="message user">
                  <div className="user-bubble" dir="auto">{msg.text}</div>
                </div>
              )
            }
            const isLast = i === messages.length - 1
            if (msg.typing && isLast) {
              return (
                <TypingMessage
                  key={i}
                  fullText={msg.text}
                  sources={msg.sources}
                  suggestedQuestions={msg.suggestedQuestions || []}
                  settings={settings}
                  ui={ui}
                  onSendMessage={sendMessage}
                  onDone={() => {
                    setChats(prev => {
                      const updated = prev.map(c => {
                        if (c.id !== activeChatId) return c
                        const updatedMsgs = c.messages.map((m, idx) =>
                          idx === i ? { ...m, typing: false } : m
                        )
                        return { ...c, messages: updatedMsgs }
                      })
                      saveChatsToStorage(user, updated)
                      return updated
                    })
                  }}
                />
              )
            }
            return (
              <AssistantMessage
                key={i}
                msg={msg}
                settings={settings}
                ui={ui}
                onSendMessage={sendMessage}
              />
            )
          })}

          {loading && <ThinkingDots />}
          <div ref={bottomRef} />
        </div>

        <div className="input-area">
          <div className="input-box">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInput}
              onKeyDown={handleKey}
              placeholder={ui.placeholder}
              dir="auto"
              rows={1}
            />
            <button
              className="send-btn"
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
            >
              <svg className="send-icon" viewBox="0 0 24 24">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
          <p className="hint">{ui.hint}</p>
        </div>
      </div>
    </div>
  )
}