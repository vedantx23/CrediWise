import './MetricsCard.css';

export default function MetricsCard({ title, value, subtitle, trendValue, trendColor = 'green' }) {
  return (
    <div className="card metrics-card">
      <div className="metrics-header">
        <h3 className="metrics-title">{title}</h3>
      </div>
      <div className="metrics-body">
        <div className="metrics-value">{value}</div>
        <div className={`metrics-trend trend-${trendColor}`}>
          {trendValue}
        </div>
      </div>
      <div className="metrics-subtitle">{subtitle}</div>
    </div>
  );
}
