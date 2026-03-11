import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCardContext } from '../context/CardContext';
import api from '../api';
import MetricsCard from '../components/MetricsCard';
import RewardDistributionChart from '../components/RewardDistributionChart';
import SpendChart from '../components/SpendChart';
import CardPerformanceGauge from '../components/CardPerformanceGauge';
import CreditCardTable from '../components/CreditCardTable';
import RecommendationSidebar from '../components/RecommendationSidebar';

export default function Dashboard() {
  const { user } = useAuth();
  const { userCards, loading: cardsLoading } = useCardContext();
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  const firstName = user?.name ? user.name.split(' ')[0] : 'User';

  useEffect(() => {
    if (!user) return;

    const fetchAnalytics = async () => {
      setAnalyticsLoading(true);
      try {
        const res = await api.get('/analytics/summary');
        setAnalytics(res.data);
      } catch (err) {
        console.error('Failed to fetch analytics:', err);
        setAnalytics(null);
      } finally {
        setAnalyticsLoading(false);
      }
    };

    fetchAnalytics();
  }, [user]);

  // Derive metrics from analytics data
  const cardCount = userCards.length;
  const monthTotal = analytics?.monthTotal ?? 0;
  const totalRewards = analytics?.totalRewardsValue ?? 0;
  const instrumentCount = analytics?.instrumentCount ?? 0;

  // Compute average reward value per point from user cards
  const avgRewardValue = userCards.length > 0
    ? (userCards.reduce((sum, c) => sum + (c.Reward_Value_Per_Point_INR || 0), 0) / userCards.length).toFixed(2)
    : '0.00';

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
            Let's optimize your credit cards
          </p>
        </div>

        {/* Metrics Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '32px' }}>
          <MetricsCard 
            title="Cards Tracked" 
            value={cardCount.toString()}
            subtitle="active cards" 
            trendValue={cardCount > 0 ? `${cardCount} card${cardCount > 1 ? 's' : ''}` : 'No cards yet'}
            trendColor={cardCount > 0 ? 'green' : 'gray'}
          />
          <MetricsCard 
            title="Average Reward Value" 
            value={cardCount > 0 ? `₹${avgRewardValue}` : '—'}
            subtitle={cardCount > 0 ? 'per reward point' : 'Add cards to see'} 
            trendValue={cardCount > 0 ? 'Across your cards' : ''}
            trendColor="gray" 
          />
          <MetricsCard 
            title="Monthly Spend" 
            value={monthTotal > 0 ? `₹${monthTotal.toLocaleString()}` : '—'}
            subtitle={monthTotal > 0 ? 'this month' : 'No expenses yet'} 
            trendValue={totalRewards > 0 ? `₹${totalRewards.toLocaleString()} rewards` : ''}
            trendColor={totalRewards > 0 ? 'green' : 'gray'} 
          />
        </div>
        
        {/* Charts Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '32px' }}>
          <RewardDistributionChart analytics={analytics} userCards={userCards} />
          <SpendChart analytics={analytics} />
          <CardPerformanceGauge analytics={analytics} userCards={userCards} />
        </div>

        {/* Main Table Section */}
        <CreditCardTable />

      </div>

      {/* 25% Right Sidebar */}
      <RecommendationSidebar userCards={userCards} />
    </div>
  );
}
