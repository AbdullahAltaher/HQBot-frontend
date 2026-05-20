import { useState, useRef, useEffect, useCallback } from 'react'
import axios from 'axios'
import ReactMarkdown from 'react-markdown'
import logo from './qawasim_chatbot_logo.svg'
import Login from './Login'
import Settings from './Settings'
import Quiz from './Quiz'
import Story from './Story'
import { useEntityProcessor } from './EntityText'
import './App.css'

const DEFAULT_SETTINGS = { theme: 'dark', fontSize: 'medium', language: 'ar', tts: false }
const FONT_SIZES = { small: '13px', medium: '15px', large: '18px' }

const UI = {
  ar: {
    newChat: '+ محادثة جديدة', noChats: 'لا توجد محادثات',
    assistant: 'مساعد القواسم التاريخي',
    welcomeDesc: 'اسألني عن تاريخ القواسم والخليج ونجد وآل سعود',
    placeholder: 'اسأل عن التاريخ العربي...', hint: 'Enter للإرسال · Shift+Enter لسطر جديد',
    copy: 'نسخ', copied: '✓ تم', source: 'مصدر',
    error: 'حدث خطأ في الاتصال. يرجى المحاولة مرة أخرى.',
    hello: 'أهلاً', canHelp: '، كيف يمكنني مساعدتك؟',
    badge: 'RAG · CLAUDE', stop: 'إيقاف', speak: 'استمع',
    related: 'أسئلة مقترحة', quiz: 'اختبار', story: 'قصة'
  },
  en: {
    newChat: '+ New Chat', noChats: 'No chats yet',
    assistant: 'Qawasim History Assistant',
    welcomeDesc: 'Ask me about Qawasim history, Sharjah, Najd and Al Saud',
    placeholder: 'Ask about history...', hint: 'Enter to send · Shift+Enter for new line',
    copy: 'Copy', copied: '✓ Done', source: 'Source',
    error: 'Connection error. Please try again.',
    hello: 'Hello', canHelp: ', how can I help you?',
    badge: 'RAG · CLAUDE', stop: 'Stop', speak: 'Listen',
    related: 'Suggested questions', quiz: 'Quiz', story: 'Story'
  }
}

const SUGGESTIONS = {
  ar: ['من هم القواسم؟', 'ما هي معاهدة 1820؟', 'ما تاريخ نجد وآل سعود؟', 'من هو سلطان بن صقر؟'],
  en: ['Who are the Qawasim?', 'What is the 1820 treaty?', 'History of Najd and Al Saud?', 'Who is Sultan bin Saqr?']
}

let chatIdCounter = 1

function loadChatsFromStorage(u) { try { const d = localStorage.getItem(`chats_${u}`); return d ? JSON.parse(d) : [] } catch { return [] } }
function saveChatsToStorage(u, c) { try { localStorage.setItem(`chats_${u}`, JSON.stringify(c)) } catch {} }
function loadSettings() { try { const d = localStorage.getItem('app_settings'); return d ? { ...DEFAULT_SETTINGS, ...JSON.parse(d) } : DEFAULT_SETTINGS } catch { return DEFAULT_SETTINGS } }
function saveSettings(s) { try { localStorage.setItem('app_settings', JSON.stringify(s)) } catch {} }
function applyTheme(t) { if (t === 'light') document.body.classList.add('light'); else document.body.classList.remove('light') }
function applyFontSize(s) { document.documentElement.style.setProperty('--chat-font-size', FONT_SIZES[s]) }

// Custom ReactMarkdown components that apply entity highlighting to text nodes
function useMarkdownComponents() {
  const processText = useEntityProcessor()

  return {
    p: ({ children }) => <p>{processChildren(children, processText)}</p>,
    li: ({ children }) => <li>{processChildren(children, processText)}</li>,
    strong: ({ children }) => <strong>{processChildren(children, processText)}</strong>,
    h1: ({ children }) => <h1>{processChildren(children, processText)}</h1>,
    h2: ({ children }) => <h2>{processChildren(children, processText)}</h2>,
    h3: ({ children }) => <h3>{processChildren(children, processText)}</h3>,
  }
}

function processChildren(children, processText) {
  if (!children) return children
  if (typeof children === 'string') return processText(children)
  if (Array.isArray(children)) {
    return children.map((child, i) => {
      if (typeof child === 'string') return <span key={i}>{processText(child)}</span>
      return child
    })
  }
  return children
}

function TTSButton({ text, ui }) {
  const [speaking, setSpeaking] = useState(false)
  const audioRef = useRef(null)
  async function toggleSpeak() {
    if (speaking) { audioRef.current?.pause(); audioRef.current = null; setSpeaking(false); return }
    const clean = text.replace(/[#*`_]/g, '').replace(/\[.*?\]/g, '').replace(/\s+/g, ' ').trim()
    setSpeaking(true)
    try {
      const res = await fetch('https://hqbot-backend.onrender.com/api/tts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: clean })
      })
      const blob = await res.blob()
      const audio = new Audio(URL.createObjectURL(blob))
      audioRef.current = audio
      audio.onended = () => setSpeaking(false)
      audio.onerror = () => setSpeaking(false)
      audio.play()
    } catch { setSpeaking(false) }
  }
  return <button className="copy-btn" onClick={toggleSpeak}>{speaking ? `⏹ ${ui.stop}` : `🔊 ${ui.speak}`}</button>
}

function CopyButton({ text, ui }) {
  const [copied, setCopied] = useState(false)
  function copy() { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }
  return <button className="copy-btn" onClick={copy}>{copied ? ui.copied : ui.copy}</button>
}

function AssistantMessage({ msg, settings, ui, onSendMessage }) {
  const questions = msg.suggestedQuestions || []
  const components = useMarkdownComponents()
  return (
    <div className="message assistant">
      <div className="assistant-row">
        <div className="ai-avatar"><img src={logo} alt="logo" style={{ width: 14, height: 14 }} /></div>
        <div className="assistant-bubble" dir="auto">
          <ReactMarkdown components={components}>{msg.text}</ReactMarkdown>
          {questions.length > 0 && (
            <div className="related-questions">
              <p className="related-title">◆ {ui.related}</p>
              {questions.map((q, qi) => <button key={qi} className="related-btn" onClick={() => onSendMessage(q)}>{q}</button>)}
            </div>
          )}
        </div>
      </div>
      {msg.sources?.length > 0 && (
        <div className="sources">
          {msg.sources.slice(0, 4).map((s, j) => (
            <span key={j} className="source-tag">{s.metadata?.title || ui.source} · {Math.round(s.similarity * 100)}%</span>
          ))}
        </div>
      )}
      <div className="message-actions">
        <CopyButton text={msg.text} ui={ui} />
        {settings.tts && <TTSButton text={msg.text} ui={ui} />}
      </div>
    </div>
  )
}

function TypingMessage({ fullText, sources, suggestedQuestions, onDone, settings, ui, onSendMessage }) {
  const [displayed, setDisplayed] = useState('')
  const [done, setDone] = useState(false)
  const idx = useRef(0)
  const components = useMarkdownComponents()

  useEffect(() => {
    if (!fullText) return
    idx.current = 0; setDisplayed(''); setDone(false)
    const iv = setInterval(() => {
      idx.current += 3
      if (idx.current >= fullText.length) { setDisplayed(fullText); setDone(true); clearInterval(iv); onDone?.() }
      else setDisplayed(fullText.slice(0, idx.current))
    }, 12)
    return () => clearInterval(iv)
  }, [fullText])

  const questions = done ? (suggestedQuestions || []) : []

  return (
    <div className="message assistant">
      <div className="assistant-row">
        <div className="ai-avatar"><img src={logo} alt="logo" style={{ width: 14, height: 14 }} /></div>
        <div className="assistant-bubble" dir="auto">
          <ReactMarkdown components={components}>{displayed}</ReactMarkdown>
          {!done && <span className="cursor" />}
          {done && questions.length > 0 && (
            <div className="related-questions">
              <p className="related-title">◆ {ui.related}</p>
              {questions.map((q, qi) => <button key={qi} className="related-btn" onClick={() => onSendMessage(q)}>{q}</button>)}
            </div>
          )}
        </div>
      </div>
      {done && sources?.length > 0 && (
        <div className="sources">
          {sources.slice(0, 4).map((s, j) => (
            <span key={j} className="source-tag">{s.metadata?.title || ui.source} · {Math.round(s.similarity * 100)}%</span>
          ))}
        </div>
      )}
      {done && (
        <div className="message-actions">
          <CopyButton text={fullText} ui={ui} />
          {settings.tts && <TTSButton text={fullText} ui={ui} />}
        </div>
      )}
    </div>
  )
}

function ThinkingDots() {
  return (
    <div className="message assistant">
      <div className="assistant-row">
        <div className="ai-avatar"><img src={logo} alt="logo" style={{ width: 14, height: 14 }} /></div>
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
  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])
  function submitRename() { if (editVal.trim()) onRename(editVal.trim()); setEditing(false) }
  return (
    <div className={`chat-item ${active ? 'active' : ''}`} onClick={onClick}
      onMouseEnter={() => setHovering(true)} onMouseLeave={() => setHovering(false)}>
      <span className="chat-icon">◈</span>
      {editing ? (
        <input ref={inputRef} className="chat-rename-input" value={editVal}
          onChange={e => setEditVal(e.target.value)} onBlur={submitRename}
          onKeyDown={e => { if (e.key === 'Enter') submitRename(); if (e.key === 'Escape') setEditing(false) }}
          onClick={e => e.stopPropagation()} />
      ) : <span className="chat-title">{chat.title}</span>}
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
  const [showQuiz, setShowQuiz] = useState(false)
  const [showStory, setShowStory] = useState(false)
  const [settings, setSettings] = useState(loadSettings)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)
  const bottomRef = useRef(null)
  const textareaRef = useRef(null)

  const ui = UI[settings.language]
  const suggestions = SUGGESTIONS[settings.language]
  const activeChat = chats.find(c => c.id === activeChatId)
  const messages = activeChat?.messages || []

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])

  useEffect(() => { setSidebarOpen(!isMobile) }, [isMobile])
  useEffect(() => { applyTheme(settings.theme); applyFontSize(settings.fontSize) }, [settings])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

  useEffect(() => {
    if (!user) return
    const saved = loadChatsFromStorage(user)
    if (saved.length > 0) { setChats(saved); setActiveChatId(saved[0].id) }
    else createNewChat(user)
  }, [user])

  function handleSettingsChange(s) { setSettings(s); saveSettings(s); applyTheme(s.theme); applyFontSize(s.fontSize) }
  function handleLogout() { window.speechSynthesis?.cancel(); setUser(null); setChats([]); setActiveChatId(null); setShowSettings(false) }

  function createNewChat(username) {
    const id = `chat_${Date.now()}_${chatIdCounter++}`
    const newC = { id, title: 'محادثة جديدة', messages: [] }
    setChats(prev => { const u = [newC, ...prev]; saveChatsToStorage(username || user, u); return u })
    setActiveChatId(id); setInput('')
    if (isMobile) setSidebarOpen(false)
    return id
  }

  function updateChats(u) { setChats(u); saveChatsToStorage(user, u) }
  function deleteChat(id) {
    const r = chats.filter(c => c.id !== id)
    if (r.length === 0) createNewChat()
    else { updateChats(r); if (activeChatId === id) setActiveChatId(r[0].id) }
  }
  function renameChat(id, t) { updateChats(chats.map(c => c.id === id ? { ...c, title: t } : c)) }

  const sendMessage = useCallback(async (text) => {
    const question = text || input.trim()
    if (!question || loading) return
    let currentChatId = activeChatId
    if (!currentChatId) currentChatId = createNewChat()
    setInput(''); if (isMobile) setSidebarOpen(false)
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    const currentMessages = chats.find(c => c.id === currentChatId)?.messages || []
    const newMessages = [...currentMessages, { role: 'user', text: question }]
    const firstUser = newMessages.find(m => m.role === 'user')
    const title = firstUser ? firstUser.text.slice(0, 30) + (firstUser.text.length > 30 ? '...' : '') : 'محادثة'
    const updatedWithUser = chats.map(c => c.id === currentChatId ? { ...c, messages: newMessages, title } : c)
    updateChats(updatedWithUser); setLoading(true)
    try {
      const res = await axios.post('https://hqbot-backend.onrender.com/api/chat', {
        question, history: currentMessages.slice(-6).map(m => ({ role: m.role, text: m.text }))
      })
      const withAnswer = [...newMessages, {
        role: 'assistant', text: res.data.answer, sources: res.data.sources,
        suggestedQuestions: res.data.suggestedQuestions || [], typing: true
      }]
      updateChats(updatedWithUser.map(c => c.id === currentChatId ? { ...c, messages: withAnswer, title } : c))
    } catch {
      const withError = [...newMessages, { role: 'assistant', text: ui.error, typing: true }]
      updateChats(updatedWithUser.map(c => c.id === currentChatId ? { ...c, messages: withError, title } : c))
    }
    setLoading(false)
  }, [input, loading, chats, activeChatId, user, ui, isMobile])

  function handleKey(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }
  function handleInput(e) {
    setInput(e.target.value)
    const t = textareaRef.current; t.style.height = 'auto'
    t.style.height = Math.min(t.scrollHeight, 160) + 'px'
  }

  const showWelcome = messages.length === 0 && !loading
  if (!user) return <Login onEnter={setUser} />

  return (
    <div className="app">
      {showSettings && <Settings user={user} onClose={() => setShowSettings(false)} onLogout={handleLogout} settings={settings} onSettingsChange={handleSettingsChange} />}
      {showQuiz && <Quiz onClose={() => setShowQuiz(false)} />}
      {showStory && <Story onClose={() => setShowStory(false)} />}
      {sidebarOpen && isMobile && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      <div className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <button className="new-chat-btn" onClick={() => createNewChat()}>{ui.newChat}</button>
          <button className="toggle-btn" onClick={() => setSidebarOpen(false)}>✕</button>
        </div>
        <div className="chat-list">
          {chats.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--ink-ghost)', fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}>{ui.noChats}</div>
          ) : chats.map(chat => (
            <ChatItem key={chat.id} chat={chat} active={chat.id === activeChatId}
              onClick={() => { setActiveChatId(chat.id); if (isMobile) setSidebarOpen(false) }}
              onDelete={() => deleteChat(chat.id)} onRename={t => renameChat(chat.id, t)} />
          ))}
        </div>
        <div className="sidebar-footer">
          <div className="sidebar-info">
            <img src={logo} alt="logo" style={{ width: 22, height: 22, borderRadius: '50%', border: '1px solid var(--gold-border)' }} />
            <span>{user}</span>
          </div>
          <div style={{ display: 'flex', gap: 5 }}>
            <button className="settings-btn" onClick={() => setShowStory(true)} title={ui.story}>📖</button>
            <button className="settings-btn" onClick={() => setShowQuiz(true)} title={ui.quiz}>🎯</button>
            <button className="settings-btn" onClick={() => setShowSettings(true)}>⚙️</button>
          </div>
        </div>
      </div>

      <div className="main">
        <header className="header">
          <button className="toggle-btn open-btn" onClick={() => setSidebarOpen(true)}>☰</button>
          <img src={logo} alt="logo" className="header-logo" />
          <h1>{ui.assistant}</h1>
          <button className="settings-btn-header" onClick={() => setShowStory(true)} title={ui.story}>📖</button>
          <button className="settings-btn-header" onClick={() => setShowQuiz(true)} title={ui.quiz}>🎯</button>
          <button className="settings-btn-header" onClick={() => setShowSettings(true)}>⚙️</button>
          <span className="header-badge">{ui.badge}</span>
        </header>

        <div className="messages">
          {showWelcome && (
            <div className="welcome">
              <img src={logo} alt="logo" className="welcome-logo" />
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, letterSpacing: '0.06em', color: 'var(--ink)' }}>
                {ui.hello} {user}{ui.canHelp}
              </h2>
              <p>{ui.welcomeDesc}</p>
              <div className="suggestions">
                {suggestions.map((s, i) => <button key={i} className="suggestion" onClick={() => sendMessage(s)}>{s}</button>)}
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button onClick={() => setShowStory(true)} style={{ padding: '9px 18px', background: 'var(--gold-glow)', border: '1px solid var(--gold-border)', borderRadius: 8, color: 'var(--gold)', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-display)', letterSpacing: '0.08em', textTransform: 'uppercase', transition: 'all 0.2s' }}>
                  📖 {settings.language === 'ar' ? 'وضع القصة' : 'Story Mode'}
                </button>
                <button onClick={() => setShowQuiz(true)} style={{ padding: '9px 18px', background: 'var(--gold-glow)', border: '1px solid var(--gold-border)', borderRadius: 8, color: 'var(--gold)', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-display)', letterSpacing: '0.08em', textTransform: 'uppercase', transition: 'all 0.2s' }}>
                  🎯 {settings.language === 'ar' ? 'الاختبار' : 'Quiz'}
                </button>
              </div>
            </div>
          )}

          {messages.map((msg, i) => {
            if (msg.role === 'user') return (
              <div key={i} className="message user">
                <div className="user-bubble" dir="auto">{msg.text}</div>
              </div>
            )
            const isLast = i === messages.length - 1
            if (msg.typing && isLast) return (
              <TypingMessage key={i} fullText={msg.text} sources={msg.sources}
                suggestedQuestions={msg.suggestedQuestions || []} settings={settings} ui={ui}
                onSendMessage={sendMessage}
                onDone={() => setChats(prev => {
                  const u = prev.map(c => { if (c.id !== activeChatId) return c; return { ...c, messages: c.messages.map((m, idx) => idx === i ? { ...m, typing: false } : m) } })
                  saveChatsToStorage(user, u); return u
                })} />
            )
            return <AssistantMessage key={i} msg={msg} settings={settings} ui={ui} onSendMessage={sendMessage} />
          })}

          {loading && <ThinkingDots />}
          <div ref={bottomRef} />
        </div>

        <div className="input-area">
          <div className="input-box">
            <textarea ref={textareaRef} value={input} onChange={handleInput} onKeyDown={handleKey}
              placeholder={ui.placeholder} dir="auto" rows={1} />
            <button className="send-btn" onClick={() => sendMessage()} disabled={loading || !input.trim()}>
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