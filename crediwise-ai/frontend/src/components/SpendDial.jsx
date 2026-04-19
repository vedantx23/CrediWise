import { useEffect, useRef } from 'react'
import * as d3 from 'd3'

export default function SpendDial({ totalMonthlySpend = 0, effectiveRate = 0 }) {
  const svgRef = useRef(null)

  const W = 300, H = 170
  const cx = W / 2, cy = H - 10
  const R_outer = 120, R_inner = 100

  const getColor = v => {
    if (v <= 10000)  return 'var(--status-crit-fg)'
    if (v <= 30000)  return 'var(--status-warn-fg)'
    return 'var(--status-pass-fg)'
  }

  useEffect(() => {
    const svg = d3.select(svgRef.current)
    svg.selectAll('.dial-dynamic').remove()

    const arcGen = d3.arc().innerRadius(R_inner).outerRadius(R_outer).startAngle(-Math.PI)

    svg.append('path').attr('class','dial-dynamic dial-track')
      .attr('transform', `translate(${cx},${cy})`)
      .attr('d', arcGen.endAngle(0)())
      .attr('fill', 'var(--plat-muted)').attr('opacity', 0.2)

    const MAX = 60000
    const fraction = Math.min(totalMonthlySpend / MAX, 1)
    const endAngle = -Math.PI + fraction * Math.PI
    const color = getColor(totalMonthlySpend)

    const path = svg.append('path').attr('class','dial-dynamic dial-fill')
      .attr('transform', `translate(${cx},${cy})`)
      .attr('fill', color)
      .attr('filter', effectiveRate > 3 ? 'url(#dial-glow)' : 'none')

    path.datum({ endAngle: -Math.PI }).attr('d', arcGen)
    path.transition().duration(500).ease(d3.easeCubicOut)
      .attrTween('d', d => {
        const i = d3.interpolate(d.endAngle, endAngle)
        return t => { d.endAngle = i(t); return arcGen(d) }
      })

    const nx = Math.cos(endAngle - Math.PI/2) * 90
    const ny = Math.sin(endAngle - Math.PI/2) * 90

    svg.append('line').attr('class','dial-dynamic')
      .attr('x1',cx).attr('y1',cy).attr('x2',cx).attr('y2',cy)
      .attr('stroke','var(--gold-bright)').attr('stroke-width',2).attr('stroke-linecap','round')
      .transition().duration(500).ease(d3.easeCubicOut)
      .attr('x2', cx+nx).attr('y2', cy+ny)

    svg.append('circle').attr('class','dial-dynamic')
      .attr('cx',cx).attr('cy',cy).attr('r',4).attr('fill','var(--gold-bright)')
      .transition().duration(500).ease(d3.easeCubicOut)
      .attr('cx', cx+nx).attr('cy', cy+ny)

  }, [totalMonthlySpend, effectiveRate])

  const inr = v => {
    if (v >= 100000) return `₹${(v/100000).toFixed(1)}L`
    if (v >= 1000)   return `₹${(v/1000).toFixed(0)}K`
    return `₹${v}`
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
      <svg ref={svgRef} width={W} height={H}>
        <defs>
          <filter id="dial-glow">
            <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#4ADE80" floodOpacity="0.4"/>
          </filter>
        </defs>
        <text x={cx-110} y={H-4} fill="var(--plat-muted)" fontSize="9" fontFamily="var(--font-mono)" textAnchor="middle">₹0</text>
        <text x={cx}     y={H-4} fill="var(--plat-muted)" fontSize="9" fontFamily="var(--font-mono)" textAnchor="middle">₹30K</text>
        <text x={cx+110} y={H-4} fill="var(--plat-muted)" fontSize="9" fontFamily="var(--font-mono)" textAnchor="middle">₹60K</text>
        <text x={cx} y={cy-28} textAnchor="middle" fill="var(--gold-bright)" fontSize="32" fontFamily="var(--font-display)" fontWeight="300">{effectiveRate.toFixed(1)}%</text>
        <text x={cx} y={cy-10} textAnchor="middle" fill="var(--plat-muted)" fontSize="9" fontFamily="var(--font-ui)" fontWeight="500" letterSpacing="0.15em">EFFECTIVE RATE</text>
      </svg>
      <div style={{ fontFamily:'var(--font-mono)', fontSize:12, color:'var(--plat-cool)', letterSpacing:'0.1em' }}>
        {inr(totalMonthlySpend)} / month
      </div>
    </div>
  )
}
