import { useAuth } from '../context/AuthContext';
import { useCardContext } from '../context/CardContext';
import MetricsCard from '../components/MetricsCard';
import RewardDistributionChart from '../components/RewardDistributionChart';
import SpendChart from '../components/SpendChart';
import CardPerformanceGauge from '../components/CardPerformanceGauge';
import CreditCardTable from '../components/CreditCardTable';
import RecommendationSidebar from '../components/RecommendationSidebar';

export default function Dashboard() {
  const { user } = useAuth();
  const { userCards } = useCardContext();
  
  const firstName = user?.name ? user.name.split(' ')[0] : 'Chetanya';

  return (
    <div className="dashboard-grid">
      {/* 75% Left Main Dashboard */}
      <div className="dashboard-main">
        
        {/* Header Section */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
            Hey {firstName}! <span>👋</span>
          </h1>
          <p style={{ fontSize: '15px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Let’s optimize your credit cards
          </p>
        </div>

        {/* Metrics Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '32px' }}>
          <MetricsCard 
            title="Cards Compared" 
            value={userCards.length.toString()}
            subtitle="active cards" 
            trendValue="+12%" 
            trendColor="green" 
          />
          <MetricsCard 
            title="Average Reward Value" 
            value="₹0.58" 
            subtitle="per reward point" 
            trendValue="+4.8%" 
            trendColor="green" 
          />
          <MetricsCard 
            title="Estimated Rewards" 
            value="₹8,100" 
            subtitle="this month" 
            trendValue="+16%" 
            trendColor="green" 
          />
        </div>
        
        {/* Charts Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '32px' }}>
          <RewardDistributionChart />
          <SpendChart />
          <CardPerformanceGauge />
        </div>

        {/* Main Table Section */}
        <CreditCardTable />

      </div>

      {/* 25% Right Sidebar */}
      <RecommendationSidebar />
    </div>
  );
}
