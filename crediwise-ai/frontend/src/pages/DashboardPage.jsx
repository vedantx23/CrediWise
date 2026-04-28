import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../api'
import { BarChart3, Wallet, CreditCard, TrendingUp } from 'lucide-react'

const CATEGORY_COLORS = {
  'Food & Dining':'#f59e0b','Travel':'#06b6d4','Shopping':'#ec4899',
  'Entertainment':'#8b5cf6','Health & Medical':'#10b981',
  'Utilities & Bills':'#6366f1','Education':'#f97316','Other':'#64748b'
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)

  const firstName = user?.name ? user.name.split(' ')[0] : 'User'

  useEffect(() => {
    api.get('/analytics/summary').then(r => setAnalytics(r.data)).catch(()=>{}).finally(()=>setLoading(false))
  }, [])

  const monthTotal = analytics?.monthTotal ?? 0
  const allTotal = analytics?.allTimeTotal ?? 0
  const instCount = analytics?.instrumentCount ?? 0

  return (
    <div style={{padding:'32px 40px', maxWidth:1200}}>
      <h1 style={{fontSize:28,fontWeight:300,fontFamily:'var(--font-display)',color:'var(--plat-white)',letterSpacing:'0.04em'}}>
        Hey {firstName}! <span>👋</span>
      </h1>
      <p style={{fontSize:14,color:'var(--plat-muted)',marginTop:4,marginBottom:32}}>Here's your financial overview</p>

      {/* Metrics Row */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:20,marginBottom:32}}>
        <MetricCard icon={<Wallet size={20}/>} label="Monthly Spend" value={monthTotal>0?`₹${monthTotal.toLocaleString('en-IN')}`:'—'} sub={monthTotal>0?'this month':'No expenses yet'}/>
        <MetricCard icon={<BarChart3 size={20}/>} label="All-Time Spend" value={allTotal>0?`₹${allTotal.toLocaleString('en-IN')}`:'—'} sub="total tracked"/>
        <MetricCard icon={<CreditCard size={20}/>} label="Instruments" value={String(instCount)} sub="payment cards"/>
        <MetricCard icon={<TrendingUp size={20}/>} label="Rewards Earned" value={`₹${(analytics?.totalRewardsValue??0).toLocaleString('en-IN')}`} sub="estimated value"/>
      </div>

      {/* Category Breakdown */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
        <div style={card}>
          <h3 style={cardTitle}>Monthly Category Breakdown</h3>
          {!analytics?.categoryBreakdown?.length ? (
            <p style={{color:'var(--plat-muted)',fontSize:13,padding:20}}>No expenses this month. Add some in the Expenses tab!</p>
          ) : (
            <div style={{display:'flex',flexDirection:'column',gap:10,padding:'12px 0'}}>
              {analytics.categoryBreakdown.map(c => (
                <div key={c.category} style={{display:'flex',alignItems:'center',gap:12}}>
                  <span style={{width:10,height:10,borderRadius:'50%',background:CATEGORY_COLORS[c.category]||'#64748b',flexShrink:0}}/>
                  <span style={{flex:1,fontSize:13,color:'var(--plat-white)'}}>{c.category}</span>
                  <span style={{fontSize:13,fontWeight:600,color:'var(--gold-bright)'}}>₹{c.total.toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={card}>
          <h3 style={cardTitle}>Monthly Spend Trend</h3>
          {!analytics?.monthlyTotals?.length ? (
            <p style={{color:'var(--plat-muted)',fontSize:13,padding:20}}>Not enough data yet</p>
          ) : (
            <div style={{display:'flex',alignItems:'flex-end',gap:8,height:140,padding:'16px 0'}}>
              {analytics.monthlyTotals.map(m => {
                const max = Math.max(...analytics.monthlyTotals.map(x=>x.total),1)
                const h = Math.max((m.total/max)*120,4)
                return (
                  <div key={m.month} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
                    <span style={{fontSize:10,color:'var(--gold-bright)'}}>₹{(m.total/1000).toFixed(0)}k</span>
                    <div style={{width:'100%',height:h,background:'linear-gradient(180deg,var(--gold-bright),var(--gold-dim))',borderRadius:4}}/>
                    <span style={{fontSize:9,color:'var(--plat-muted)'}}>{m.month.slice(5)}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent expenses */}
      {analytics?.recentExpenses?.length > 0 && (
        <div style={{...card, marginTop:20}}>
          <h3 style={cardTitle}>Recent Transactions</h3>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
              <thead>
                <tr>{['Date','Category','Note','Amount'].map(h=>(
                  <th key={h} style={{textAlign:'left',padding:'8px 12px',color:'var(--plat-muted)',fontWeight:500,borderBottom:'1px solid var(--gold-dim)',fontSize:11,letterSpacing:'0.06em'}}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {analytics.recentExpenses.slice(0,8).map((e,i)=>(
                  <tr key={i} style={{borderBottom:'1px solid rgba(212,175,55,0.06)'}}>
                    <td style={{padding:'8px 12px',color:'var(--plat-muted)'}}>{e.date}</td>
                    <td style={{padding:'8px 12px'}}>
                      <span style={{background:`${CATEGORY_COLORS[e.category]||'#64748b'}20`,color:CATEGORY_COLORS[e.category]||'#64748b',padding:'2px 8px',borderRadius:4,fontSize:11}}>{e.category}</span>
                    </td>
                    <td style={{padding:'8px 12px',color:'var(--plat-muted)'}}>{e.note||'—'}</td>
                    <td style={{padding:'8px 12px',fontWeight:600,color:'#ef4444'}}>−₹{e.amount.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function MetricCard({icon, label, value, sub}) {
  return (
    <div style={card}>
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
        <span style={{color:'var(--gold-bright)'}}>{icon}</span>
        <span style={{fontSize:11,fontWeight:500,color:'var(--plat-muted)',letterSpacing:'0.06em',textTransform:'uppercase'}}>{label}</span>
      </div>
      <div style={{fontSize:24,fontWeight:300,fontFamily:'var(--font-display)',color:'var(--plat-white)',letterSpacing:'0.02em'}}>{value}</div>
      <div style={{fontSize:11,color:'var(--plat-muted)',marginTop:4}}>{sub}</div>
    </div>
  )
}

const card = {background:'var(--bg-surface)',border:'1px solid var(--gold-dim)',borderRadius:12,padding:'20px 24px'}
const cardTitle = {fontSize:13,fontWeight:500,color:'var(--plat-muted)',letterSpacing:'0.04em',marginBottom:8}

