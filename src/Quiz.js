import { useState } from 'react'
import axios from 'axios'
import './Quiz.css'

const BOOKS = [
  { id: 'taht-rayat-alihtelal-full', label: 'تحت راية الاحتلال' },
  { id: 'سرد الذات', label: 'سرد الذات' },
  { id: 'تاريخ_نجد_الحديث_وملحقاته', label: 'تاريخ نجد الحديث' },
]

const DIFFICULTIES = [
  { id: 'easy', label: 'سهل', color: '#4ade80' },
  { id: 'medium', label: 'متوسط', color: '#38bdf8' },
  { id: 'hard', label: 'صعب', color: '#f87171' },
]

export default function Quiz({ onClose }) {
  const [phase, setPhase] = useState('setup')
  const [book, setBook] = useState('')
  const [difficulty, setDifficulty] = useState('medium')
  const [questions, setQuestions] = useState([])
  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState(null)
  const [answers, setAnswers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showExplanation, setShowExplanation] = useState(false)

  async function startQuiz() {
    if (!book) return
    setLoading(true)
    setError('')
    try {
      const res = await axios.post('https://hqbot-backend.onrender.com/api/quiz', {
        book,
        difficulty
      })
      setQuestions(res.data.questions)
      setCurrent(0)
      setSelected(null)
      setAnswers([])
      setShowExplanation(false)
      setPhase('quiz')
    } catch {
      setError('حدث خطأ في تحميل الأسئلة. حاول مرة أخرى.')
    }
    setLoading(false)
  }

  function handleAnswer(idx) {
    if (selected !== null) return
    setSelected(idx)
    setShowExplanation(true)
    setAnswers(prev => [...prev, {
      question: current,
      selected: idx,
      correct: questions[current].correct
    }])
  }

  function nextQuestion() {
    if (current + 1 >= questions.length) {
      setPhase('result')
    } else {
      setCurrent(c => c + 1)
      setSelected(null)
      setShowExplanation(false)
    }
  }

  const score = answers.filter(a => a.selected === a.correct).length

  return (
    <div className="quiz-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="quiz-modal">

        <div className="quiz-header">
          <div className="quiz-header-left">
            <span className="quiz-badge">🎯 وضع الاختبار</span>
            {phase === 'quiz' && (
              <span className="quiz-progress">{current + 1} / {questions.length}</span>
            )}
          </div>
          <button className="quiz-close" onClick={onClose}>✕</button>
        </div>

        {/* SETUP */}
        {phase === 'setup' && (
          <div className="quiz-setup">
            <h2 className="quiz-title">اختر الكتاب والمستوى</h2>
            <p className="quiz-desc">سيتم توليد 5 أسئلة من محتوى الكتاب الحقيقي</p>

            <div className="quiz-section-label">الكتاب</div>
            <div className="quiz-book-grid">
              {BOOKS.map(b => (
                <button
                  key={b.id}
                  className={`quiz-book-btn ${book === b.id ? 'active' : ''}`}
                  onClick={() => setBook(b.id)}
                >
                  📖 {b.label}
                </button>
              ))}
            </div>

            <div className="quiz-section-label">المستوى</div>
            <div className="quiz-diff-grid">
              {DIFFICULTIES.map(d => (
                <button
                  key={d.id}
                  className={`quiz-diff-btn ${difficulty === d.id ? 'active' : ''}`}
                  style={difficulty === d.id ? { borderColor: d.color, color: d.color, background: `${d.color}12` } : {}}
                  onClick={() => setDifficulty(d.id)}
                >
                  {d.label}
                </button>
              ))}
            </div>

            {error && <p className="quiz-error">{error}</p>}

            <button
              className="quiz-start-btn"
              onClick={startQuiz}
              disabled={!book || loading}
            >
              {loading ? (
                <span className="quiz-loading">
                  <span className="quiz-dot" />
                  <span className="quiz-dot" style={{ animationDelay: '0.2s' }} />
                  <span className="quiz-dot" style={{ animationDelay: '0.4s' }} />
                </span>
              ) : 'ابدأ الاختبار ←'}
            </button>
          </div>
        )}

        {/* QUIZ */}
        {phase === 'quiz' && questions[current] && (
          <div className="quiz-question-wrap">
            <div className="quiz-progress-bar">
              <div
                className="quiz-progress-fill"
                style={{ width: `${((current) / questions.length) * 100}%` }}
              />
            </div>

            <div className="quiz-score-live">
              النتيجة: {answers.filter(a => a.selected === a.correct).length} / {answers.length}
            </div>

            <p className="quiz-q-text" dir="rtl">{questions[current].question}</p>

            <div className="quiz-options">
              {questions[current].options.map((opt, idx) => {
                let cls = 'quiz-option'
                if (selected !== null) {
                  if (idx === questions[current].correct) cls += ' correct'
                  else if (idx === selected && selected !== questions[current].correct) cls += ' wrong'
                  else cls += ' dim'
                }
                return (
                  <button
                    key={idx}
                    className={cls}
                    onClick={() => handleAnswer(idx)}
                    dir="rtl"
                  >
                    <span className="quiz-option-letter">
                      {['أ', 'ب', 'ج', 'د'][idx]}
                    </span>
                    {opt}
                  </button>
                )
              })}
            </div>

            {showExplanation && (
              <div className="quiz-explanation" dir="rtl">
                <span className="quiz-exp-icon">💡</span>
                {questions[current].explanation}
              </div>
            )}

            {selected !== null && (
              <button className="quiz-next-btn" onClick={nextQuestion}>
                {current + 1 >= questions.length ? 'عرض النتيجة' : 'السؤال التالي ←'}
              </button>
            )}
          </div>
        )}

        {/* RESULT */}
        {phase === 'result' && (
          <div className="quiz-result">
            <div className="quiz-score-circle">
              <span className="quiz-score-num">{score}</span>
              <span className="quiz-score-total">/ {questions.length}</span>
            </div>

            <h2 className="quiz-result-title">
              {score === questions.length ? '🏆 ممتاز! أتقنت الكتاب' :
               score >= questions.length * 0.7 ? '🎉 أحسنت! نتيجة جيدة' :
               score >= questions.length * 0.4 ? '📚 جيد، استمر في التعلم' :
               '💪 حاول مرة أخرى'}
            </h2>

            <div className="quiz-answers-review">
              {questions.map((q, i) => {
                const a = answers[i]
                const isCorrect = a && a.selected === q.correct
                return (
                  <div key={i} className={`quiz-review-item ${isCorrect ? 'correct' : 'wrong'}`} dir="rtl">
                    <span className="quiz-review-icon">{isCorrect ? '✓' : '✗'}</span>
                    <span className="quiz-review-q">{q.question}</span>
                  </div>
                )
              })}
            </div>

            <div className="quiz-result-btns">
              <button className="quiz-start-btn" onClick={() => {
                setPhase('setup')
                setBook('')
                setQuestions([])
                setAnswers([])
              }}>
                اختبار جديد
              </button>
              <button className="quiz-outline-btn" onClick={onClose}>
                إغلاق
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}