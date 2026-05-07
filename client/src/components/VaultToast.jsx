import { createContext, useContext, useState, useCallback, useRef } from 'react'

const ToastCtx = createContext(null)

export function useToast() {
  return useContext(ToastCtx)
}

let _id = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const add = useCallback((message, type = 'info', duration = 4000) => {
    const id = ++_id
    setToasts(t => [...t.slice(-2), { id, message, type, duration, exiting: false }])
    setTimeout(() => dismiss(id), duration)
    return id
  }, [])

  const dismiss = useCallback(id => {
    setToasts(t => t.map(toast =>
      toast.id === id ? { ...toast, exiting: true } : toast
    ))
    setTimeout(() => {
      setToasts(t => t.filter(toast => toast.id !== id))
    }, 260)
  }, [])

  return (
    <ToastCtx.Provider value={{ add, dismiss }}>
      {children}
      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </ToastCtx.Provider>
  )
}

const TYPE_COLOR = {
  success: 'var(--status-pass-fg)',
  warning: 'var(--status-warn-fg)',
  error:   'var(--status-crit-fg)',
  info:    'var(--gold-mid)',
}

function ToastStack({ toasts, onDismiss }) {
  return (
    <div className="toast-stack" aria-live="polite">
      {toasts.map(t => (
        <Toast key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
      <style>{`
        .toast-stack {
          position: fixed; top: 20px; right: 20px;
          z-index: 9970;
          display: flex; flex-direction: column; gap: 10px;
          pointer-events: none;
        }
      `}</style>
    </div>
  )
}

function Toast({ toast, onDismiss }) {
  const color = TYPE_COLOR[toast.type] || TYPE_COLOR.info

  return (
    <div
      className={`vault-toast ${toast.exiting ? 'toast-exit' : 'toast-enter'}`}
      style={{ '--toast-color': color, pointerEvents: 'all' }}
      role="alert"
    >
      <div className="toast-body">
        <span className="toast-msg">{toast.message}</span>
        <button className="toast-close" onClick={() => onDismiss(toast.id)}>✕</button>
      </div>
      <div
        className="toast-bar"
        style={{ animationDuration: `${toast.duration}ms` }}
      />

      <style>{`
        .vault-toast {
          background: var(--bg-overlay);
          border-left: 3px solid var(--toast-color);
          border-radius: var(--radius-md);
          box-shadow: 0 8px 32px rgba(0,0,0,0.6);
          min-width: 280px; max-width: 360px;
          overflow: hidden;
          position: relative;
        }
        .toast-enter { animation: toast-in  300ms var(--ease-snap)  forwards; }
        .toast-exit  { animation: toast-out 250ms ease-in forwards; }

        .toast-body {
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px; padding: 14px 16px;
        }
        .toast-msg {
          font-family: var(--font-ui); font-size: 13px; font-weight: 300;
          color: var(--plat-bright); flex: 1; line-height: 1.4;
        }
        .toast-close {
          background: none; border: none; color: var(--plat-muted);
          font-size: 11px; cursor: none; padding: 2px;
          transition: color var(--dur-fast);
          flex-shrink: 0;
        }
        .toast-close:hover { color: var(--plat-white); }

        .toast-bar {
          height: 2px;
          background: var(--toast-color);
          animation: progress-shrink linear forwards;
          transform-origin: left;
        }
      `}</style>
    </div>
  )
}
