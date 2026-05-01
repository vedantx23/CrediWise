import VaultCard from './VaultCard';
import './MetricsCard.css';

export default function MetricsCard({ title, value, subtitle, trendValue, trendColor = 'green' }) {
  return (
    <VaultCard className="metrics-card">
      <div className="metrics-header">
        <h3 className="metrics-title" style={{ fontFamily: 'var(--font-ui)', color: 'var(--plat-bright)' }}>{title}</h3>
      </div>
      <div className="metrics-body">
        <div className="metrics-value" style={{ fontFamily: 'var(--font-display)', color: 'var(--gold-bright)', fontSize: '32px' }}>{value}</div>
        <div className={`metrics-trend trend-${trendColor}`} style={{ fontFamily: 'var(--font-mono)', color: 'var(--gold-hot)' }}>
          {trendValue}
        </div>
      </div>
      <div className="metrics-subtitle" style={{ fontFamily: 'var(--font-ui)', color: 'var(--plat-cool)' }}>{subtitle}</div>
    </VaultCard>
  );
}
