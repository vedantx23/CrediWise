import { useState, useEffect, useRef } from 'react'
import { runBoardroom } from '../api/ai'
import { useAuth } from '../context/AuthContext'
import { useCardContext } from '../context/CardContext'
import api from '../api'
import VaultCard from '../components/VaultCard'
import { VaultButton, VaultInput } from '../components/VaultForms'
import { useToast } from '../components/VaultToast'
import { ScrollReveal } from '../hooks/useScrollReveal.jsx'
import { MessageCircle, Users, Trash2, Send } from 'lucide-react'

export default function BoardroomPage() {
  const { user } = useAuth()
  const { userCards } = useCardContext()
  const [expenses, setExpenses] = useState({})
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [transcript, setTranscript] = useState([])
  const chatEndRef = useRef(null)
  const toast = useToast()

  // Fetch expenses for context
  useEffect(() => {
    const fetchExpenses = async () => {
      try {
        const res = await api.get('/expenses');
        setExpenses(res.data.monthly_spend || res.data.expenses || {});
      } catch (err) {
        console.error('Failed to fetch expenses for boardroom', err);
      }
    };
    fetchExpenses();
  }, []);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [transcript, loading])

  const handleSend = async (e) => {
    if (e) e.preventDefault()
    if (!question.trim() || loading) return

    setLoading(true)
    const currentQuestion = question
    setQuestion('')

    try {
      // Build profile for RAG
      const payload = {
        user_id: user?.id || 'anonymous',
        question: currentQuestion,
        monthly_spend: expenses || {},
        current_cards: userCards
          .map(c => c.card_id || c.id || c.Card_Name)
          .filter(id => typeof id === 'string' && id.trim() !== ''),
        income_annual: 1200000, 
        cibil_score: 750,
      }

      const res = await runBoardroom(payload)
      
      // Append the question and the agent responses to transcript
      setTranscript(prev => [
        ...prev,
        { type: 'user', content: currentQuestion, timestamp: new Date() },
        ...res.transcript.map(agent => ({ ...agent, type: 'agent', timestamp: new Date() }))
      ])
    } catch (err) {
      toast.add(err.message || 'The boardroom is currently offline.', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="boardroom-page">
      <div className="boardroom-header">
        <h1 className="vault-heading">AI Boardroom</h1>
        <p className="vault-subtext">
          Summit of the Experts. Max, Sage, and Mint debate your next financial move.
        </p>
      </div>

      <div className="boardroom-container">
        {/* ── Agents Overview ── */}
        <div className="agents-strip">
          <div className="agent-pill blue">
            <span className="agent-emoji">📊</span>
            <div className="agent-info">
              <span className="agent-name">Max</span>
              <span className="agent-role">The Accountant</span>
            </div>
          </div>
          <div className="agent-pill purple">
            <span className="agent-emoji">✈️</span>
            <div className="agent-info">
              <span className="agent-name">Sage</span>
              <span className="agent-role">The Traveler</span>
            </div>
          </div>
          <div className="agent-pill green">
            <span className="agent-emoji">🌿</span>
            <div className="agent-info">
              <span className="agent-name">Mint</span>
              <span className="agent-role">The Minimalist</span>
            </div>
          </div>
        </div>

        {/* ── Chat Display ── */}
        <div className="chat-display">
          {transcript.length === 0 && !loading && (
            <div className="chat-empty">
              <div className="empty-icon"><Users size={40} /></div>
              <h3>The boardroom is ready.</h3>
              <p>Ask a question like "Which card should I get next?" or "Is HDFC Infinia worth it for me?"</p>
              <div className="quick-prompts">
                <button onClick={() => { setQuestion("Which card should I get next?"); }}>
                  Which card should I get next?
                </button>
                <button onClick={() => { setQuestion("Optimize my travel rewards."); }}>
                  Optimize my travel rewards.
                </button>
                <button onClick={() => { setQuestion("I want to avoid annual fees."); }}>
                  I want to avoid annual fees.
                </button>
              </div>
            </div>
          )}

          <div className="transcript-list">
            {transcript.map((msg, i) => (
              <div key={i} className={`msg-row ${msg.type}`}>
                {msg.type === 'user' ? (
                  <div className="user-bubble">
                    {msg.content}
                  </div>
                ) : (
                  <div className={`agent-bubble ${msg.color}`}>
                    <div className="agent-meta">
                      <span className="agent-emoji">{msg.emoji}</span>
                      <span className="agent-identity">{msg.name} — {msg.role}</span>
                    </div>
                    <div className="agent-content">
                      {msg.response}
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            {loading && (
              <div className="msg-row agent">
                <div className="agent-bubble loading">
                  <div className="typing-indicator">
                    <span></span><span></span><span></span>
                  </div>
                  <span className="loading-text">Boardroom is debating...</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        </div>

        {/* ── Input Area ── */}
        <div className="chat-input-area">
          <form onSubmit={handleSend} className="chat-form">
            <input
              type="text"
              className="chat-input"
              placeholder="Ask the boardroom..."
              value={question}
              onChange={e => setQuestion(e.target.value)}
              disabled={loading}
            />
            <button type="submit" className="send-btn" disabled={!question.trim() || loading}>
              <Send size={18} />
            </button>
          </form>
          <div className="input-hint">
            The boardroom uses your current spending and cards for context.
          </div>
        </div>
      </div>

      <style>{`
        .boardroom-page { padding: 40px 48px; max-width: 1000px; margin: 0 auto; height: calc(100vh - 40px); display: flex; flex-direction: column; }
        .vault-heading {
          font-family: var(--font-display); font-weight: 400;
          font-size: clamp(24px, 3vw, 36px); color: var(--plat-white);
          letter-spacing: 0.05em; margin: 0 0 4px;
        }
        .vault-subtext { font-family: var(--font-ui); font-weight: 300; font-size: 15px; color: var(--plat-cool); margin-bottom: 24px; }

        .boardroom-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          background: var(--bg-surface);
          border: 1px solid var(--gold-dim);
          border-radius: var(--radius-xl);
          overflow: hidden;
          position: relative;
        }

        /* Agents Strip */
        .agents-strip {
          display: flex;
          gap: 12px;
          padding: 16px 24px;
          border-bottom: 1px solid rgba(212,175,55,0.1);
          background: rgba(212,175,55,0.02);
        }
        .agent-pill {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 16px;
          background: var(--bg-overlay);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: var(--radius-pill);
          flex: 1;
        }
        .agent-pill.blue { border-left: 3px solid #3B82F6; }
        .agent-pill.purple { border-left: 3px solid #A855F7; }
        .agent-pill.green { border-left: 3px solid #10B981; }

        .agent-emoji { font-size: 18px; }
        .agent-info { display: flex; flex-direction: column; }
        .agent-name { font-family: var(--font-ui); font-size: 13px; font-weight: 600; color: var(--plat-white); }
        .agent-role { font-family: var(--font-ui); font-size: 10px; color: var(--plat-muted); text-transform: uppercase; letter-spacing: 0.05em; }

        /* Chat Display */
        .chat-display {
          flex: 1;
          padding: 24px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
        }
        .chat-empty {
          margin: auto;
          text-align: center;
          max-width: 400px;
        }
        .empty-icon { color: var(--gold-dim); margin-bottom: 16px; opacity: 0.5; }
        .chat-empty h3 { font-family: var(--font-display); font-size: 20px; color: var(--plat-white); margin-bottom: 8px; }
        .chat-empty p { font-family: var(--font-ui); font-size: 14px; color: var(--plat-muted); margin-bottom: 24px; }

        .quick-prompts { display: flex; flex-direction: column; gap: 8px; }
        .quick-prompts button {
          background: rgba(212,175,55,0.05);
          border: 1px solid rgba(212,175,55,0.15);
          color: var(--gold-bright);
          padding: 10px 16px;
          border-radius: var(--radius-md);
          font-family: var(--font-ui);
          font-size: 13px;
          cursor: pointer;
          transition: all 200ms ease;
        }
        .quick-prompts button:hover { background: rgba(212,175,55,0.1); border-color: var(--gold-bright); }

        .transcript-list { display: flex; flex-direction: column; gap: 20px; }
        .msg-row { display: flex; width: 100%; }
        .msg-row.user { justify-content: flex-end; }
        
        .user-bubble {
          max-width: 80%;
          background: var(--gold-mid);
          color: #000;
          padding: 12px 20px;
          border-radius: 20px 20px 4px 20px;
          font-family: var(--font-ui);
          font-size: 14px;
          line-height: 1.5;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }

        .agent-bubble {
          max-width: 85%;
          background: var(--bg-raised);
          border: 1px solid rgba(255,255,255,0.05);
          padding: 16px;
          border-radius: 4px 20px 20px 20px;
          position: relative;
        }
        .agent-bubble.blue { border-left: 4px solid #3B82F6; }
        .agent-bubble.purple { border-left: 4px solid #A855F7; }
        .agent-bubble.green { border-left: 4px solid #10B981; }

        .agent-meta { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
        .agent-identity { font-family: var(--font-ui); font-size: 11px; font-weight: 600; color: var(--plat-muted); text-transform: uppercase; }
        .agent-content { font-family: var(--font-ui); font-size: 14px; color: var(--plat-bright); line-height: 1.6; white-space: pre-wrap; }

        /* Loading */
        .agent-bubble.loading { display: flex; align-items: center; gap: 12px; padding: 12px 20px; border-left: 4px solid var(--gold-dim); }
        .loading-text { font-family: var(--font-mono); font-size: 12px; color: var(--gold-dim); }
        .typing-indicator { display: flex; gap: 4px; }
        .typing-indicator span {
          width: 4px; height: 4px; background: var(--gold-dim); border-radius: 50%;
          animation: bounce 1.4s infinite ease-in-out both;
        }
        .typing-indicator span:nth-child(1) { animation-delay: -0.32s; }
        .typing-indicator span:nth-child(2) { animation-delay: -0.16s; }
        @keyframes bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }

        /* Input Area */
        .chat-input-area {
          padding: 20px 24px;
          border-top: 1px solid rgba(212,175,55,0.1);
          background: rgba(0,0,0,0.2);
        }
        .chat-form { display: flex; gap: 12px; position: relative; }
        .chat-input {
          flex: 1;
          background: var(--bg-overlay);
          border: 1px solid var(--gold-dim);
          border-radius: var(--radius-lg);
          padding: 14px 50px 14px 20px;
          color: var(--plat-white);
          font-family: var(--font-ui);
          font-size: 14px;
          outline: none;
          transition: border-color 200ms ease;
        }
        .chat-input:focus { border-color: var(--gold-bright); }
        .send-btn {
          position: absolute; right: 8px; top: 8px; bottom: 8px;
          width: 40px; height: 40px;
          background: var(--gold-mid);
          color: #000;
          border: none;
          border-radius: var(--radius-md);
          display: flex; align-items: center; justifyContent: center;
          cursor: pointer;
          transition: transform 200ms ease, background 200ms ease;
        }
        .send-btn:hover:not(:disabled) { background: var(--gold-bright); transform: scale(1.05); }
        .send-btn:disabled { opacity: 0.3; cursor: not-allowed; }
        .input-hint { font-family: var(--font-ui); font-size: 11px; color: var(--plat-muted); margin-top: 10px; text-align: center; }

        @media (max-width: 768px) {
          .boardroom-page { padding: 20px 16px; }
          .agents-strip { display: none; }
          .agent-bubble { max-width: 95%; }
        }
      `}</style>
    </div>
  )
}
