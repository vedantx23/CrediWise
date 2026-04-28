/**
 * RadarChart.jsx — D3.js Radar/Spider Chart for Salary Hike Simulator
 *
 * Cards outside income range are greyed out.
 * As income increases, cards animate from grey to coloured.
 *
 * Props:
 *   data      — [{ card_id, name, in_reach, nav_annual, axes: {cat: rate} }]
 *   categories — string[] of axis labels
 *   title     — optional heading
 */

import { useEffect, useRef } from "react";
import * as d3 from "d3";

const DEFAULT_CATEGORIES = [
  "dining", "fuel", "grocery", "travel", "online", "utilities", "international",
];

const CATEGORY_LABELS = {
  dining: "Dining", fuel: "Fuel", grocery: "Grocery",
  travel: "Travel", online: "Online", utilities: "Bills", international: "Intl",
};

// Max reward rate per axis (for normalisation — scale 0–1)
const MAX_RATES = {
  dining: 10, fuel: 5, grocery: 5, travel: 8,
  online: 10, utilities: 5, international: 5,
};

export default function RadarChart({
  data = [],
  categories = DEFAULT_CATEGORIES,
  title = "Card Reward Radar",
  width = 480,
  height = 480,
}) {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!data.length || !svgRef.current) return;

    const svg    = d3.select(svgRef.current);
    const cx     = width  / 2;
    const cy     = height / 2;
    const radius = Math.min(cx, cy) - 80;
    const levels = 4;
    const n      = categories.length;
    const angleSlice = (2 * Math.PI) / n;

    svg.selectAll("*").remove();

    const g = svg.append("g").attr("transform", `translate(${cx},${cy})`);

    // ── Grid circles ──────────────────────────────────────────────────────────
    for (let lvl = 1; lvl <= levels; lvl++) {
      g.append("circle")
        .attr("r", (radius / levels) * lvl)
        .attr("fill", "none")
        .attr("stroke", "#334155")
        .attr("stroke-dasharray", "3,3")
        .attr("opacity", 0.6);
    }

    // ── Axis lines + labels ───────────────────────────────────────────────────
    categories.forEach((cat, i) => {
      const angle = angleSlice * i - Math.PI / 2;
      const x     = radius * Math.cos(angle);
      const y     = radius * Math.sin(angle);

      g.append("line")
        .attr("x1", 0).attr("y1", 0)
        .attr("x2", x).attr("y2", y)
        .attr("stroke", "#475569").attr("stroke-width", 1);

      const labelX = (radius + 28) * Math.cos(angle);
      const labelY = (radius + 28) * Math.sin(angle);

      g.append("text")
        .attr("x", labelX).attr("y", labelY)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("fill", "#94a3b8")
        .attr("font-size", "11px")
        .text(CATEGORY_LABELS[cat] || cat);
    });

    // ── Card polygons ─────────────────────────────────────────────────────────
    const colorScale = d3.scaleOrdinal(d3.schemeTableau10);

    // Show at most 6 cards to avoid clutter; prioritise in_reach
    const displayCards = [...data]
      .sort((a, b) => b.in_reach - a.in_reach || b.nav_annual - a.nav_annual)
      .slice(0, 6);

    displayCards.forEach((card, ci) => {
      const points = categories.map((cat, i) => {
        const angle    = angleSlice * i - Math.PI / 2;
        const maxRate  = MAX_RATES[cat] || 5;
        const rate     = card.axes?.[cat] || 0;
        const r        = (Math.min(rate, maxRate) / maxRate) * radius;
        return [r * Math.cos(angle), r * Math.sin(angle)];
      });

      const pathData = points.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`).join(" ") + "Z";
      const fillColor = card.in_reach ? colorScale(ci) : "#334155";
      const stroke    = card.in_reach ? colorScale(ci) : "#475569";
      const opacity   = card.in_reach ? 0.25 : 0.08;

      // Filled polygon
      const path = g.append("path")
        .attr("d", pathData)
        .attr("fill", fillColor)
        .attr("fill-opacity", 0)
        .attr("stroke", stroke)
        .attr("stroke-width", card.in_reach ? 2 : 1)
        .attr("stroke-opacity", card.in_reach ? 0.8 : 0.3);

      // Animate fill-opacity in
      path.transition()
        .duration(600)
        .delay(ci * 80)
        .attr("fill-opacity", opacity);
    });

    // ── Legend ────────────────────────────────────────────────────────────────
    const legendG = svg.append("g")
      .attr("transform", `translate(12, ${height - 10 - displayCards.length * 20})`);

    displayCards.forEach((card, ci) => {
      const color = card.in_reach ? colorScale(ci) : "#475569";
      const row   = legendG.append("g").attr("transform", `translate(0, ${ci * 20})`);
      row.append("rect")
        .attr("width", 12).attr("height", 12)
        .attr("rx", 2)
        .attr("fill", color)
        .attr("opacity", card.in_reach ? 0.9 : 0.3);
      row.append("text")
        .attr("x", 16).attr("y", 10)
        .attr("fill", card.in_reach ? "#e2e8f0" : "#64748b")
        .attr("font-size", "11px")
        .text(`${card.name}${card.in_reach ? "" : " 🔒"}  ₹${Math.round(card.nav_annual / 1000)}K/yr`);
    });

  }, [data, categories, width, height]);

  return (
    <div className="flex flex-col items-center gap-3">
      {title && (
        <h3 className="text-sm font-semibold text-slate-300 tracking-wide uppercase">
          {title}
        </h3>
      )}
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="overflow-visible"
        style={{ background: "transparent" }}
      />
    </div>
  );
}
