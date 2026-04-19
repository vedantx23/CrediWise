/**
 * SpendDial.jsx — D3.js arc/gauge chart
 * Animates as user types monthly spend.
 * Below ₹10k = red arc, ₹10-30k = amber, ₹30k+ = green
 * Centre: "Your effective reward rate: X.X%"
 */
import { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import { inrShort, pct } from '../utils/format.js'

const W = 260
const H = 160
const CX = W / 2
const CY = H - 10
const R_OUTER = 110
const R_INNER = 75
const START_ANGLE = -Math.PI * 0.85
const END_ANGLE   =  Math.PI * 0.85

function spendToColor(total) {
  if (total < 10000)  return '#ef4444'   // red
  if (total < 30000)  return '#f59e0b'   // amber
  return '#10b981'                        // green
}

export default function SpendDial({ totalMonthly = 0, effectiveRate = 0 }) {
  const svgRef = useRef(null)

  useEffect(() => {
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const arcScale = d3.scaleLinear()
      .domain([0, 100000])
      .range([START_ANGLE, END_ANGLE])
      .clamp(true)

    const fillAngle = arcScale(totalMonthly)
    const color     = spendToColor(totalMonthly)

    // Background track
    const bgArc = d3.arc()
      .innerRadius(R_INNER)
      .outerRadius(R_OUTER)
      .startAngle(START_ANGLE)
      .endAngle(END_ANGLE)
      .cornerRadius(4)

    svg.append('path')
      .attr('d', bgArc())
      .attr('transform', `translate(${CX},${CY})`)
      .attr('fill', '#1e1e30')

    // Tick marks
    const ticks = [0, 10000, 20000, 30000, 50000, 75000, 100000]
    ticks.forEach(val => {
      const angle = arcScale(val) - Math.PI / 2
      const x1 = CX + (R_OUTER + 6) * Math.cos(angle)
      const y1 = CY + (R_OUTER + 6) * Math.sin(angle)
      const x2 = CX + (R_OUTER + 2) * Math.cos(angle)
      const y2 = CY + (R_OUTER + 2) * Math.sin(angle)
      svg.append('line')
        .attr('x1', x1).attr('y1', y1)
        .attr('x2', x2).attr('y2', y2)
        .attr('stroke', '#2d2d45').attr('stroke-width', 1.5)
    })

    // Filled arc (animated)
    const fillArc = d3.arc()
      .innerRadius(R_INNER)
      .outerRadius(R_OUTER)
      .startAngle(START_ANGLE)
      .cornerRadius(4)

    const path = svg.append('path')
      .attr('transform', `translate(${CX},${CY})`)
      .attr('fill', color)
      .style('filter', `drop-shadow(0 0 8px ${color}88)`)

    path.datum({ endAngle: START_ANGLE })
      .attr('d', d => fillArc(d))
      .transition()
      .duration(500)
      .ease(d3.easeCubicOut)
      .attrTween('d', function(d) {
        const interp = d3.interpolate(d.endAngle, fillAngle)
        return t => {
          d.endAngle = interp(t)
          return fillArc(d)
        }
      })

    // Needle
    const needleAngle = arcScale(totalMonthly) - Math.PI / 2
    const nx = CX + (R_INNER - 8) * Math.cos(needleAngle)
    const ny = CY + (R_INNER - 8) * Math.sin(needleAngle)
    svg.append('circle')
      .attr('cx', CX).attr('cy', CY)
      .attr('r', 5)
      .attr('fill', '#fff')
    svg.append('line')
      .attr('x1', CX).attr('y1', CY)
      .attr('x2', nx).attr('y2', ny)
      .attr('stroke', '#fff').attr('stroke-width', 2)
      .attr('stroke-linecap', 'round')

  }, [totalMonthly])

  return (
    <div className="spend-dial-container flex-col">
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} width={W} height={H} />

      {/* Centre text overlay */}
      <div className="-mt-6 text-center">
        <p className="text-vault-muted text-xs mb-0.5">Monthly spend</p>
        <p className={`font-mono font-bold text-xl ${
          totalMonthly < 10000 ? 'text-red-400' :
          totalMonthly < 30000 ? 'text-amber-400' :
          'text-emerald-400'
        }`}>
          {inrShort(totalMonthly)}
        </p>
        {effectiveRate > 0 && (
          <p className="text-vault-textDim text-xs mt-0.5 font-mono">
            Eff. reward rate: <span className="text-vault-gold font-semibold">{pct(effectiveRate)}</span>
          </p>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 text-xs text-vault-muted font-mono">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block"/>{'< ₹10K'}</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block"/>₹10-30K</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"/>₹30K+</span>
      </div>
    </div>
  )
}
