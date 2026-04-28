import { useState, useEffect, useCallback } from 'react'
import api from '../api'
import toast from 'react-hot-toast'

const CATEGORIES = ['Food & Dining','Travel','Shopping','Entertainment','Health & Medical','Utilities & Bills','Education','Other']
const COLORS = {'Food & Dining':'#f59e0b','Travel':'#06b6d4','Shopping':'#ec4899','Entertainment':'#8b5cf6','Health & Medical':'#10b981','Utilities & Bills':'#6366f1','Education':'#f97316','Other':'#64748b'}
const EMPTY = {date:new Date().toISOString().split('T')[0],amount:'',category:'Food & Dining',payment_instrument_id:'',note:''}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState([])
  const [instruments, setInstruments] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [submitting, setSubmitting] = useState(false)
  const [filterMonth, setFilterMonth] = useState('')
  const [filterCat, setFilterCat] = useState('All')

  const fetchAll = useCallback(async()=>{
    try {
      const [eR,iR] = await Promise.all([
        api.get('/expenses',{params:{month:filterMonth||undefined,category:filterCat!=='All'?filterCat:undefined}}),
        api.get('/instruments')
      ])
      setExpenses(eR.data.expenses)
      setInstruments(iR.data.instruments)
    } catch{ toast.error('Failed to load expenses') }
    finally{ setLoading(false) }
  },[filterMonth,filterCat])

  useEffect(()=>{fetchAll()},[fetchAll])

  const openAdd=()=>{setForm(EMPTY);setEditingId(null);setShowModal(true)}
  const openEdit=(e)=>{setForm({date:e.date,amount:e.amount,category:e.category,payment_instrument_id:e.payment_instrument_id||'',note:e.note||''});setEditingId(e.id);setShowModal(true)}
  const handleSubmit=async(ev)=>{
    ev.preventDefault();setSubmitting(true)
    try{
      if(editingId){await api.put(`/expenses/${editingId}`,form);toast.success('Updated')}
      else{await api.post('/expenses',form);toast.success('Added')}
      setShowModal(false);fetchAll()
    }catch(e){toast.error(e.response?.data?.message||'Failed')}
    finally{setSubmitting(false)}
  }
  const handleDelete=async(id)=>{
    if(!confirm('Delete this expense?'))return
    try{await api.delete(`/expenses/${id}`);toast.success('Deleted');fetchAll()}catch{toast.error('Failed')}
  }

  const total=expenses.reduce((s,e)=>s+e.amount,0)

  return (
    <div style={{padding:'32px 40px',maxWidth:1100}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
        <div>
          <h1 style={titleStyle}>Expenses</h1>
          <p style={{fontSize:13,color:'var(--plat-muted)'}}>{expenses.length} records • ₹{total.toLocaleString('en-IN',{minimumFractionDigits:2})} total</p>
        </div>
        <button style={btnGold} onClick={openAdd}>+ Add Expense</button>
      </div>

      {/* Filters */}
      <div style={{display:'flex',gap:12,marginBottom:20}}>
        <input type="month" style={inputS} value={filterMonth} onChange={e=>setFilterMonth(e.target.value)}/>
        <select style={inputS} value={filterCat} onChange={e=>setFilterCat(e.target.value)}>
          <option value="All">All Categories</option>
          {CATEGORIES.map(c=><option key={c}>{c}</option>)}
        </select>
        {(filterMonth||filterCat!=='All')&&<button style={btnSec} onClick={()=>{setFilterMonth('');setFilterCat('All')}}>Clear</button>}
      </div>

      {/* Table */}
      <div style={cardS}>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
          <thead>
            <tr>{['Date','Category','Note','Card','Amount',''].map(h=>(
              <th key={h} style={thS}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {loading?(<tr><td colSpan={6} style={{padding:40,textAlign:'center',color:'var(--plat-muted)'}}>Loading...</td></tr>)
            :expenses.length===0?(<tr><td colSpan={6} style={{padding:40,textAlign:'center',color:'var(--plat-muted)'}}>No expenses. Add your first!</td></tr>)
            :expenses.map(exp=>(
              <tr key={exp.id} style={{borderBottom:'1px solid rgba(212,175,55,0.06)'}}>
                <td style={tdS}>{exp.date}</td>
                <td style={tdS}><span style={{background:`${COLORS[exp.category]||'#64748b'}20`,color:COLORS[exp.category]||'#64748b',padding:'2px 8px',borderRadius:4,fontSize:11}}>{exp.category}</span></td>
                <td style={{...tdS,color:'var(--plat-muted)',maxWidth:180,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{exp.note||'—'}</td>
                <td style={tdS}>{exp.instrument_name||<span style={{color:'var(--plat-muted)'}}>Cash</span>}</td>
                <td style={{...tdS,fontWeight:600,color:'#ef4444'}}>−₹{exp.amount.toLocaleString('en-IN')}</td>
                <td style={tdS}>
                  <button onClick={()=>openEdit(exp)} style={iconBtn}>✏️</button>
                  <button onClick={()=>handleDelete(exp.id)} style={iconBtn}>🗑</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal&&(
        <div style={backdrop} onClick={e=>e.target===e.currentTarget&&setShowModal(false)}>
          <div style={modal}>
            <h2 style={{fontSize:18,fontFamily:'var(--font-display)',color:'var(--gold-bright)',marginBottom:20}}>{editingId?'Edit Expense':'Add Expense'}</h2>
            <form onSubmit={handleSubmit} style={{display:'flex',flexDirection:'column',gap:14}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div style={grp}><label style={lbl}>Date</label><input type="date" style={inputS} value={form.date} onChange={e=>setForm({...form,date:e.target.value})} required/></div>
                <div style={grp}><label style={lbl}>Amount (₹)</label><input type="number" style={inputS} placeholder="0.00" min="0.01" step="0.01" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} required/></div>
              </div>
              <div style={grp}><label style={lbl}>Category</label>
                <select style={inputS} value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>
                  {CATEGORIES.map(c=><option key={c}>{c}</option>)}
                </select>
              </div>
              <div style={grp}><label style={lbl}>Payment Card</label>
                <select style={inputS} value={form.payment_instrument_id} onChange={e=>setForm({...form,payment_instrument_id:e.target.value})}>
                  <option value="">Cash / Untracked</option>
                  {instruments.map(i=><option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
              </div>
              <div style={grp}><label style={lbl}>Note</label><input style={inputS} placeholder="e.g. Swiggy order" value={form.note} onChange={e=>setForm({...form,note:e.target.value})}/></div>
              <div style={{display:'flex',gap:12,justifyContent:'flex-end',marginTop:8}}>
                <button type="button" style={btnSec} onClick={()=>setShowModal(false)}>Cancel</button>
                <button type="submit" style={btnGold} disabled={submitting}>{submitting?'Saving...':editingId?'Update':'Add'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

const titleStyle={fontSize:24,fontWeight:300,fontFamily:'var(--font-display)',color:'var(--plat-white)',letterSpacing:'0.04em'}
const cardS={background:'var(--bg-surface)',border:'1px solid var(--gold-dim)',borderRadius:12,overflow:'hidden'}
const thS={textAlign:'left',padding:'10px 14px',color:'var(--plat-muted)',fontWeight:500,borderBottom:'1px solid var(--gold-dim)',fontSize:11,letterSpacing:'0.06em',textTransform:'uppercase'}
const tdS={padding:'10px 14px',color:'var(--plat-white)'}
const inputS={background:'var(--bg-raised)',border:'1px solid var(--gold-dim)',borderRadius:8,padding:'9px 12px',fontSize:13,color:'var(--plat-white)',outline:'none',width:'100%',boxSizing:'border-box'}
const btnGold={background:'linear-gradient(135deg,var(--gold-bright),var(--gold-mid))',color:'#0a0e1a',border:'none',borderRadius:8,padding:'10px 20px',fontSize:13,fontWeight:600,cursor:'pointer'}
const btnSec={background:'var(--bg-raised)',border:'1px solid var(--gold-dim)',borderRadius:8,padding:'10px 20px',fontSize:13,color:'var(--plat-muted)',cursor:'pointer'}
const iconBtn={background:'none',border:'none',cursor:'pointer',fontSize:14,padding:4}
const backdrop={position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}
const modal={background:'var(--bg-surface)',border:'1px solid var(--gold-dim)',borderRadius:16,padding:'28px 32px',maxWidth:480,width:'100%'}
const grp={display:'flex',flexDirection:'column',gap:5}
const lbl={fontSize:11,fontWeight:500,color:'var(--plat-muted)',letterSpacing:'0.04em'}

