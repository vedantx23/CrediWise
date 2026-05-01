import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const SpendDial = ({ totalSpend, rewardRate }) => {
  const svgRef = useRef();

  useEffect(() => {
    if (!svgRef.current) return;

    const width = 200;
    const height = 120;
    const radius = 90;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const g = svg.append("g")
      .attr("transform", `translate(${width / 2}, ${height})`);

    const arc = d3.arc()
      .innerRadius(65)
      .outerRadius( radius)
      .startAngle(-Math.PI / 2)
      .cornerRadius(5);

    // Determine color based on spend
    let color = "#ef4444"; // Red
    if (totalSpend >= 10000 && totalSpend < 30000) color = "#f59e0b"; // Amber
    if (totalSpend >= 30000) color = "#10b981"; // Green

    const backgroundArc = arc({ endAngle: Math.PI / 2 });
    g.append("path")
      .attr("d", backgroundArc)
      .attr("fill", "#1a1a1a");

    const percent = Math.min(totalSpend / 50000, 1); // Max out at 50k for visualization
    const foregroundArc = arc({ endAngle: -Math.PI / 2 + (Math.PI * percent) });
    
    g.append("path")
      .attr("d", foregroundArc)
      .attr("fill", color)
      .style("filter", `drop-shadow(0 0 5px ${color})`);

  }, [totalSpend]);

  return (
    <div className="flex flex-col items-center bg-glass p-6 rounded-2xl border border-glass-border">
      <svg ref={svgRef} width="200" height="120"></svg>
      <div className="text-center -mt-6">
        <div className="text-3xl font-bold text-platinum">₹{totalSpend.toLocaleString('en-IN')}</div>
        <div className="text-[10px] uppercase tracking-widest text-gold opacity-80 mt-1">
          Effective Reward: <span className="text-platinum">{rewardRate}%</span>
        </div>
      </div>
    </div>
  );
};

export default SpendDial;
