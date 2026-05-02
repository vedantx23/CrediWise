/**
 * EMIBreakeven.jsx — Chart.js break-even chart for EMI Purchase Simulator
 *
 * Shows cumulative interest (red) vs cumulative cashback (green) over months.
 * Break-even month is annotated with a vertical dashed line.
 *
 * Props:
 *   chartData      — [{ month, cumulative_interest, cumulative_cashback, net }]
 *   breakEvenMonth — int | null
 *   cardName       — string
 *   purchaseAmount — number
 */

import { useEffect, useRef } from "react";
import { inr } from "../utils/format";

export default function EMIBreakeven({
  chartData = [],
  breakEvenMonth = null,
  cardName = "your card",
  purchaseAmount = 0,
}) {
  const canvasRef = useRef(null);
  const chartRef  = useRef(null);

  useEffect(() => {
    if (!chartData.length || !canvasRef.current) return;

    // Dynamically import Chart.js to keep bundle lean
    import("chart.js/auto").then(({ default: Chart }) => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }

      const labels     = chartData.map((d) => `Mo ${d.month}`);
      const interest   = chartData.map((d) => d.cumulative_interest);
      const cashback   = chartData.map((d) => d.cumulative_cashback);
      const net        = chartData.map((d) => d.net);

      chartRef.current = new Chart(canvasRef.current, {
        type: "line",
        data: {
          labels,
          datasets: [
            {
              label:           "Cumulative EMI Interest (₹)",
              data:            interest,
              borderColor:     "#ef4444",
              backgroundColor: "rgba(239,68,68,0.08)",
              borderWidth:     2,
              pointRadius:     3,
              tension:         0.3,
              fill:            true,
            },
            {
              label:           "Cumulative Cashback Earned (₹)",
              data:            cashback,
              borderColor:     "#22c55e",
              backgroundColor: "rgba(34,197,94,0.08)",
              borderWidth:     2,
              pointRadius:     3,
              tension:         0.3,
              fill:            true,
            },
            {
              label:           "Net (Cashback − Interest)",
              data:            net,
              borderColor:     "#f59e0b",
              backgroundColor: "transparent",
              borderWidth:     1.5,
              borderDash:      [5, 3],
              pointRadius:     2,
              tension:         0.3,
            },
          ],
        },
        options: {
          responsive: true,
          animation:  { duration: 800, easing: "easeInOutQuart" },
          plugins: {
            legend: {
              labels: {
                color:     "#94a3b8",
                font:      { size: 11 },
                boxWidth:  14,
              },
            },
            tooltip: {
              callbacks: {
                label: (ctx) => ` ${ctx.dataset.label}: ${inr(ctx.parsed.y)}`,
              },
            },
            // Annotate break-even month with a vertical line
            annotation: breakEvenMonth
              ? {
                  annotations: {
                    breakEven: {
                      type:         "line",
                      xMin:         breakEvenMonth - 1,
                      xMax:         breakEvenMonth - 1,
                      borderColor:  "#38bdf8",
                      borderWidth:  2,
                      borderDash:   [6, 4],
                      label: {
                        display:    true,
                        content:    `Break-even: Mo ${breakEvenMonth}`,
                        color:      "#38bdf8",
                        font:       { size: 11 },
                        position:   "start",
                        yAdjust:    -8,
                      },
                    },
                  },
                }
              : {},
          },
          scales: {
            x: {
              ticks: { color: "#64748b", font: { size: 10 } },
              grid:  { color: "#1e293b" },
            },
            y: {
              ticks: {
                color: "#64748b",
                font:  { size: 10 },
                callback: (v) => `₹${Math.round(v / 1000)}K`,
              },
              grid: { color: "#1e293b" },
            },
          },
        },
      });
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [chartData, breakEvenMonth]);

  if (!chartData.length) return null;

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-slate-300 tracking-wide uppercase">
        EMI Break-Even Analysis — {cardName}
      </h3>
      <p className="text-xs text-slate-400">
        Purchase: <span className="text-white font-medium">{inr(purchaseAmount)}</span>
        {breakEvenMonth
          ? ` · Cashback covers interest cost by Month ${breakEvenMonth}`
          : " · Cashback never fully covers the interest cost"}
      </p>
      <div className="relative w-full" style={{ height: 280 }}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
