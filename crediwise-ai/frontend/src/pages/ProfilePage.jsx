import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../api'
import toast from 'react-hot-toast'
import { User, Mail, Shield, LogOut } from 'lucide-react'

export default function ProfilePage() {
  const { user, logout } = useAuth()
  const [name, setName] = useState(user?.name || '')
  const [saving, setSaving] = useState(false)
  const [pw, setPw] = useState({current:'',new:'',confirm:''})
  const [pwSaving, setPwSaving] = useState(false)

  const updateName = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      await api.put('/auth/profile', { name })
      const stored = JSON.parse(localStorage.getItem('crediwise_user')||'{}')
      stored.name = name
      localStorage.setItem('crediwise_user', JSON.stringify(stored))
      toast.success('Profile updated')
    } catch (err) { toast.error(err.response?.data?.message||'Failed') }
    finally { setSaving(false) }
  }

  const changePw = async (e) => {
    e.preventDefault()
    if (pw.new !== pw.confirm) return toast.error("Passwords don't match")
    setPwSaving(true)
    try {
      await api.put('/auth/password', { currentPassword: pw.current, newPassword: pw.new })
      toast.success('Password changed')
      setPw({current:'',new:'',confirm:''})
    } catch (err) { toast.error(err.response?.data?.message||'Failed') }
    finally { setPwSaving(false) }
  }

  return (
    <div style={{padding:'32px 40px',maxWidth:600}}>
      <h1 style={title}>Profile</h1>

      {/* Info */}
      <div style={card}>
        <div style={{display:'flex',alignItems:'center',gap:16,marginBottom:20}}>
          <div style={{width:56,height:56,borderRadius:'50%',background:'linear-gradient(135deg,var(--gold-bright),var(--gold-mid))',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <User size={28} color="#0a0e1a"/>
          </div>
          <div>
            <div style={{fontSize:18,fontWeight:300,fontFamily:'var(--font-display)',color:'var(--plat-white)'}}>{user?.name}</div>
            <div style={{fontSize:12,color:'var(--plat-muted)',display:'flex',alignItems:'center',gap:4}}><Mail size={12}/>{user?.email}</div>
          </div>
        </div>

        <form onSubmit={updateName} style={{display:'flex',gap:12,alignItems:'flex-end'}}>
          <div style={{flex:1,...grp}}>
            <label style={lbl}>Display Name</label>
            <input style={inp} value={name} onChange={e=>setName(e.target.value)} required/>
          </div>
          <button style={btnG} disabled={saving}>{saving?'Saving...':'Update'}</button>
        </form>
      </div>

      {/* Change Password */}
      <div style={{...card,marginTop:20}}>
        <h3 style={{fontSize:14,color:'var(--plat-muted)',marginBottom:16,display:'flex',alignItems:'center',gap:8}}><Shield size={16}/>Change Password</h3>
        <form onSubmit={changePw} style={{display:'flex',flexDirection:'column',gap:14}}>
          <div style={grp}><label style={lbl}>Current Password</label><input style={inp} type="password" value={pw.current} onChange={e=>setPw({...pw,current:e.target.value})} required/></div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <div style={grp}><label style={lbl}>New Password</label><input style={inp} type="password" value={pw.new} onChange={e=>setPw({...pw,new:e.target.value})} required/></div>
            <div style={grp}><label style={lbl}>Confirm</label><input style={inp} type="password" value={pw.confirm} onChange={e=>setPw({...pw,confirm:e.target.value})} required/></div>
          </div>
          <button style={{...btnG,alignSelf:'flex-start'}} disabled={pwSaving}>{pwSaving?'Changing...':'Change Password'}</button>
        </form>
      </div>

      {/* Logout */}
      <button onClick={logout} style={{...btnSec,marginTop:20,display:'flex',alignItems:'center',gap:8,color:'#ef4444'}}>
        <LogOut size={16}/> Sign Out
      </button>
    </div>
  )
}

const title={fontSize:24,fontWeight:300,fontFamily:'var(--font-display)',color:'var(--plat-white)',letterSpacing:'0.04em',marginBottom:24}
const card={background:'var(--bg-surface)',border:'1px solid var(--gold-dim)',borderRadius:12,padding:'24px 28px'}
const grp={display:'flex',flexDirection:'column',gap:5}
const lbl={fontSize:11,fontWeight:500,color:'var(--plat-muted)',letterSpacing:'0.04em'}
const inp={background:'var(--bg-raised)',border:'1px solid var(--gold-dim)',borderRadius:8,padding:'9px 12px',fontSize:13,color:'var(--plat-white)',outline:'none',width:'100%',boxSizing:'border-box'}
const btnG={background:'linear-gradient(135deg,var(--gold-bright),var(--gold-mid))',color:'#0a0e1a',border:'none',borderRadius:8,padding:'10px 20px',fontSize:13,fontWeight:600,cursor:'pointer'}
const btnSec={background:'var(--bg-raised)',border:'1px solid var(--gold-dim)',borderRadius:8,padding:'10px 20px',fontSize:13,cursor:'pointer'}

