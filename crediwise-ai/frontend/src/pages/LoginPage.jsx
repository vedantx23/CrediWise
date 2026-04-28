import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const { login, loading } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const result = await login(form.email, form.password)
    if (result.success) {
      toast.success('Welcome back!')
      navigate('/')
    } else {
      setError(result.message)
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logoWrap}>
          <svg width="48" height="48" viewBox="0 0 32 32" fill="none">
            <path d="M26 16a10 10 0 1 1-1.5-5.3" stroke="var(--gold-bright)" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
            <path d="M21 16a5 5 0 1 1-.8-2.7" stroke="var(--gold-mid)" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
          </svg>
          <h1 style={styles.title}>CrediWise</h1>
          <p style={styles.subtitle}>Smart decisions for every transaction</p>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.group}>
            <label style={styles.label}>Email Address</label>
            <input style={styles.input} type="email" placeholder="you@example.com"
              value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
          </div>
          <div style={styles.group}>
            <label style={styles.label}>Password</label>
            <input style={styles.input} type="password" placeholder="••••••••"
              value={form.password} onChange={e => setForm({...form, password: e.target.value})} required />
          </div>
          {error && <div style={styles.error}>{error}</div>}
          <button style={styles.btn} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
          <p style={styles.link}>
            Don't have an account? <Link to="/register" style={{color:'var(--gold-bright)'}}>Create one</Link>
          </p>
          <p style={{...styles.link, fontSize: 11, marginTop: 4}}>
            Demo: demo@crediwise.com / password123
          </p>
        </form>
      </div>
    </div>
  )
}

const styles = {
  page: { display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', padding:24 },
  card: { background:'var(--bg-surface)', border:'1px solid var(--gold-dim)', borderRadius:16, padding:'40px 36px', maxWidth:420, width:'100%' },
  logoWrap: { textAlign:'center', marginBottom:28 },
  title: { fontFamily:'var(--font-display)', fontSize:28, fontWeight:300, color:'var(--gold-bright)', letterSpacing:'0.08em', margin:'8px 0 4px' },
  subtitle: { fontSize:13, color:'var(--plat-muted)' },
  form: { display:'flex', flexDirection:'column', gap:16 },
  group: { display:'flex', flexDirection:'column', gap:6 },
  label: { fontSize:12, fontWeight:500, color:'var(--plat-muted)', letterSpacing:'0.04em' },
  input: { background:'var(--bg-raised)', border:'1px solid var(--gold-dim)', borderRadius:8, padding:'10px 14px', fontSize:14, color:'var(--plat-white)', outline:'none' },
  error: { background:'rgba(239,68,68,0.1)', color:'#ef4444', padding:'8px 12px', borderRadius:8, fontSize:13 },
  btn: { background:'linear-gradient(135deg, var(--gold-bright), var(--gold-mid))', color:'#0a0e1a', border:'none', borderRadius:8, padding:'12px', fontSize:15, fontWeight:600, cursor:'pointer', marginTop:4 },
  link: { textAlign:'center', fontSize:13, color:'var(--plat-muted)', marginTop:8 },
}

