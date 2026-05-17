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
    welcomeDesc: 'اسألني عن تاريخ القواسم والشارقة والشعر العربي الكلاسيكي',
    placeholder: 'اسأل عن التاريخ والشعر العربي...',
    hint: 'Enter للإرسال · Shift+Enter لسطر جديد',
    copy: 'نسخ',
    copied: '✓ تم النسخ',
    source: 'مصدر',
    error: 'حدث خطأ في الاتصال. يرجى المحاولة مرة أخرى.',
    hello: 'أهلاً',
    canHelp: '، كيف يمكنني مساعدتك؟',
    badge: 'RAG · Claude',
    stop: 'إيقاف',
    speak: 'استمع',
    related: 'أسئلة مقترحة:'
  },
  en: {
    newChat: 'New Chat',
    noChats: 'No chats yet',
    assistant: 'Qawasim History Assistant',
    welcome: 'How can I help you?',
    welcomeDesc: 'Ask me about Qawasim history, Sharjah, and classical Arabic poetry',
    placeholder: 'Ask about history and Arabic poetry...',
    hint: 'Enter to send · Shift+Enter for new line',
    copy: 'Copy',
    copied: '✓ Copied',
    source: 'Source',
    error: 'Connection error. Please try again.',
    hello: 'Hello',
    canHelp: ', how can I help you?',
    badge: 'RAG · Claude',
    stop: 'Stop',
    speak: 'Listen',
    related: 'Suggested questions:'
  }
}

const SUGGESTIONS = {
  ar: ['من هم القواسم؟', 'ما هي معاهدة 1820؟', 'من هو سلطان بن صقر؟', 'ما قصة اجتماع الطماشة؟'],
  en: ['Who are the Qawasim?', 'What is the 1820 treaty?', 'Who is Sultan bin Saqr?', 'What is the Tamashe meeting?']
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

function parseRelatedQuestions(text) {
  const match = text.match(/## أسئلة مقترحة:([\s\S]*?)$/)
  if (!match) return { cleanText: text, questions: [] }
  const questionsBlock = match[1]
  const questions = questionsBlock
    .split('\n')
    .map(q => q.replace(/^[-*\d.]\s*/, '').trim())
    .filter(q => q.length > 5)
    .slice(0, 3)
  const cleanText = text.replace(/## أسئلة مقترحة:([\s\S]*?)$/, '').trim()
  return { cleanText, questions }
}

function TTSButton({ text, lang, ui }) {
  const [speaking, setSpeaking] = useState(false)

  function toggleSpeak() {
    if (speaking) {
      window.speechSynthesis.cancel()
      setSpeaking(false)
      return
    }
    const cleanText = text
      .replace(/[#*`_]/g, '')
      .replace(/\[.*?\]/g, '')
      .replace(/\d+%/g, '')
      .replace(/taht-rayat[^\s]*/gi, '')
      .replace(/qawasim-history[^\s]*/gi, '')
      .replace(/··/g, '')
      .replace(/\s+/g, ' ')
      .trim()

    const utterance = new SpeechSynthesisUtterance(cleanText)
    utterance.lang = lang === 'ar' ? 'ar-SA' : 'en-US'
    utterance.rate = 0.85
    utterance.pitch = 1

    const setVoiceAndSpeak = () => {
      const voices = window.speechSynthesis.getVoices()
      const arabicVoice = voices.find(v => v.lang.startsWith('ar') && v.localService)
        || voices.find(v => v.lang.startsWith('ar'))
      if (arabicVoice) utterance.voice = arabicVoice
      utterance.onend = () => setSpeaking(false)
      utterance.onerror = () => setSpeaking(false)
      window.speechSynthesis.speak(utterance)
      setSpeaking(true)
    }

    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.onvoiceschanged = setVoiceAndSpeak
    } else {
      setVoiceAndSpeak()
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
  const { cleanText, questions } = parseRelatedQuestions(msg.text)
  return (
    <div className="message assistant">
      <div className="assistant-row">
        <div className="ai-avatar">
          <img src={logo} alt="logo" style={{ width: 16, height: 16 }} />
        </div>
        <div className="assistant-bubble" dir="auto">
          <ReactMarkdown>{cleanText}</ReactMarkdown>
          {questions.length > 0 && (
            <div className="related-questions">
              <p className="related-title">💡 {ui.related}</p>
              {questions.map((q, qi) => (
                <button
                  key={qi}
                  className="related-btn"
                  onClick={() => onSendMessage(q)}
                >{q}</button>
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
        {settings.tts && <TTSButton text={cleanText} lang={settings.language} ui={ui} />}
      </div>
    </div>
  )
}

function TypingMessage({ fullText, sources, onDone, settings, ui, onSendMessage }) {
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

  const { cleanText, questions } = parseRelatedQuestions(displayed)

  return (
    <div className="message assistant">
      <div className="assistant-row">
        <div className="ai-avatar">
          <img src={logo} alt="logo" style={{ width: 16, height: 16 }} />
        </div>
        <div className="assistant-bubble" dir="auto">
          <ReactMarkdown>{cleanText}</ReactMarkdown>
          {!done && <span className="cursor" />}
          {done && questions.length > 0 && (
            <div className="related-questions">
              <p className="related-title">💡 {ui.related}</p>
              {questions.map((q, qi) => (
                <button
                  key={qi}
                  className="related-btn"
                  onClick={() => onSendMessage(q)}
                >{q}</button>
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
          {settings.tts && <TTSButton text={cleanText} lang={settings.language} ui={ui} />}
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
          <img src={logo} alt="logo" style={{ width: 16, height: 16 }} />
        </div>
        <div className="assistant-bubble">
          <span className="cursor" style={{ marginLeft: 2 }} />
          <span className="cursor" style={{ animationDelay: '0.3s', marginLeft: 4 }} />
          <span className="cursor" style={{ animationDelay: '0.6s', marginLeft: 4 }} />
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
      <span className="chat-icon">💬</span>
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
          <button className="chat-action-btn" onClick={onDelete}>🗑️</button>
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
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [settings, setSettings] = useState(loadSettings)
  const bottomRef = useRef(null)
  const textareaRef = useRef(null)

  const ui = UI[settings.language]
  const suggestions = SUGGESTIONS[settings.language]
  const activeChat = chats.find(c => c.id === activeChatId)
  const messages = activeChat?.messages || []

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
    window.speechSynthesis.cancel()
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
  }, [input, loading, chats, activeChatId, user, ui])

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

      <div className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <button className="new-chat-btn" onClick={() => createNewChat()}>
            <span>+</span> {ui.newChat}
          </button>
          <button className="toggle-btn" onClick={() => setSidebarOpen(false)}>✕</button>
        </div>
        <div className="chat-list">
          {chats.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
              {ui.noChats}
            </div>
          ) : (
            chats.map(chat => (
              <ChatItem
                key={chat.id}
                chat={chat}
                active={chat.id === activeChatId}
                onClick={() => setActiveChatId(chat.id)}
                onDelete={() => deleteChat(chat.id)}
                onRename={(newTitle) => renameChat(chat.id, newTitle)}
              />
            ))
          )}
        </div>
        <div className="sidebar-footer">
          <div className="sidebar-info">
            <img src={logo} alt="logo" style={{ width: 28, height: 28 }} />
            <span>{user}</span>
          </div>
          <button className="settings-btn" onClick={() => setShowSettings(true)}>⚙️</button>
        </div>
      </div>

      <div className="main">
        <header className="header">
          {!sidebarOpen && (
            <button className="toggle-btn open-btn" onClick={() => setSidebarOpen(true)}>☰</button>
          )}
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