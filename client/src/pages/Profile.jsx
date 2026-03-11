import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCardContext } from '../context/CardContext';
import { FiEdit3, FiShield, FiCreditCard, FiBarChart2, FiChevronRight, FiLock, FiLogOut, FiUser, FiMail, FiCalendar, FiAward, FiTrendingUp, FiStar, FiDollarSign, FiX, FiCheck, FiSave } from 'react-icons/fi';
import api from '../api';
import toast from 'react-hot-toast';
import './Profile.css';

export default function Profile() {
  const { user, logout } = useAuth();
  const { userCards } = useCardContext();
  const navigate = useNavigate();

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');
  const [editEmail, setEditEmail] = useState(user?.email || '');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'March 2026';

  const firstName = user?.name ? user.name.split(' ')[0] : 'User';
  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      toast.error('Name cannot be empty');
      return;
    }
    setSaving(true);
    try {
      await api.put('/auth/profile', { name: editName.trim() });
      // Update local storage
      const updatedUser = { ...user, name: editName.trim() };
      localStorage.setItem('crediwise_user', JSON.stringify(updatedUser));
      toast.success('Profile updated successfully!');
      setIsEditing(false);
      // Reload to reflect changes
      window.location.reload();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('All password fields are required');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    setSaving(true);
    try {
      await api.put('/auth/password', { currentPassword, newPassword });
      toast.success('Password changed successfully!');
      setShowPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const quickActions = [
    {
      icon: <FiCreditCard />,
      color: 'purple',
      title: 'Manage Cards',
      desc: 'Add, edit, or remove credit cards',
      action: () => navigate('/cards')
    },
    {
      icon: <FiBarChart2 />,
      color: 'cyan',
      title: 'View Spending',
      desc: 'Analyze your spending patterns',
      action: () => navigate('/spending')
    },
    {
      icon: <FiStar />,
      color: 'orange',
      title: 'Get Recommendations',
      desc: 'Find the best card for each spend',
      action: () => navigate('/rewards')
    },
    {
      icon: <FiLock />,
      color: 'green',
      title: 'Change Password',
      desc: 'Update your account password',
      action: () => setShowPasswordModal(true)
    },
    {
      icon: <FiLogOut />,
      color: 'red',
      title: 'Sign Out',
      desc: 'Log out of your account',
      action: handleLogout
    }
  ];

  const recentActivity = [
    { dot: 'purple', title: 'Profile updated', time: 'Just now', desc: 'You viewed your profile' },
    { dot: 'green', title: `${userCards.length} cards active`, time: 'Currently', desc: 'Cards being tracked' },
    { dot: 'cyan', title: 'Reward optimization', time: 'Ongoing', desc: 'Maximizing your cashback' },
    { dot: 'orange', title: 'Account created', time: memberSince, desc: 'Welcome to CrediWise!' },
  ];

  return (
    <div className="profile-page">
      <div className="profile-content">
        
        {/* Hero Section */}
        <div className="profile-hero">
          <div className="profile-banner" />
          <div className="profile-hero-body">
            <div className="profile-avatar-large">
              <img 
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name || 'User'}`} 
                alt="Profile Avatar" 
              />
              <div className="profile-avatar-badge" title="Edit avatar">
                <FiEdit3 />
              </div>
            </div>
            <div className="profile-hero-info">
              <h1>{user?.name || 'User'}</h1>
              <p className="profile-email">{user?.email || 'user@example.com'}</p>
              <span className="profile-role-badge">
                <FiShield style={{ fontSize: '12px' }} />
                {user?.role || 'user'}
              </span>
            </div>
            <div className="profile-hero-actions">
              {!isEditing ? (
                <button className="btn btn-primary" onClick={() => setIsEditing(true)}>
                  <FiEdit3 /> Edit Profile
                </button>
              ) : (
                <>
                  <button className="btn btn-secondary" onClick={() => { setIsEditing(false); setEditName(user?.name || ''); }}>
                    <FiX /> Cancel
                  </button>
                  <button className="btn btn-primary" onClick={handleSaveProfile} disabled={saving}>
                    <FiSave /> {saving ? 'Saving...' : 'Save'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="profile-stats-strip">
          <div className="profile-stat-item" style={{ '--stat-color': 'var(--accent-purple)' }}>
            <div className="profile-stat-icon">💳</div>
            <div className="profile-stat-value">{userCards.length}</div>
            <div className="profile-stat-label">Active Cards</div>
          </div>
          <div className="profile-stat-item" style={{ '--stat-color': 'var(--accent-cyan)' }}>
            <div className="profile-stat-icon">🎯</div>
            <div className="profile-stat-value">₹8.1K</div>
            <div className="profile-stat-label">Estimated Rewards</div>
          </div>
          <div className="profile-stat-item" style={{ '--stat-color': 'var(--accent-green)' }}>
            <div className="profile-stat-icon">📊</div>
            <div className="profile-stat-value">₹0.58</div>
            <div className="profile-stat-label">Avg Point Value</div>
          </div>
          <div className="profile-stat-item" style={{ '--stat-color': 'var(--accent-orange)' }}>
            <div className="profile-stat-icon">⭐</div>
            <div className="profile-stat-value">+12%</div>
            <div className="profile-stat-label">Monthly Growth</div>
          </div>
        </div>

        {/* Main Sections */}
        <div className="profile-sections">
          
          {/* Left: Personal Info */}
          <div className="profile-section-card">
            <div className="profile-section-header">
              <div className="profile-section-title">
                <FiUser className="section-icon" />
                Personal Information
              </div>
            </div>
            <div className="profile-form">
              <div className="profile-form-row">
                <div className="profile-field">
                  <label className="profile-field-label">Full Name</label>
                  {isEditing ? (
                    <input
                      type="text"
                      className="profile-field-input"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Enter your name"
                    />
                  ) : (
                    <div className="profile-field-value">{user?.name || '—'}</div>
                  )}
                </div>
                <div className="profile-field">
                  <label className="profile-field-label">Email Address</label>
                  <div className="profile-field-value">{user?.email || '—'}</div>
                </div>
              </div>
              <div className="profile-form-row">
                <div className="profile-field">
                  <label className="profile-field-label">Account Role</label>
                  <div className="profile-field-value" style={{ textTransform: 'capitalize' }}>
                    {user?.role || 'user'}
                  </div>
                </div>
                <div className="profile-field">
                  <label className="profile-field-label">Member Since</label>
                  <div className="profile-field-value">{memberSince}</div>
                </div>
              </div>
              <div className="profile-form-row">
                <div className="profile-field">
                  <label className="profile-field-label">Cards Tracked</label>
                  <div className="profile-field-value">{userCards.length} credit cards</div>
                </div>
                <div className="profile-field">
                  <label className="profile-field-label">Account Status</label>
                  <div className="profile-field-value" style={{ color: 'var(--accent-green)', fontWeight: 600 }}>
                    ● Active
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
            
            {/* Quick Actions */}
            <div className="profile-section-card">
              <div className="profile-section-header">
                <div className="profile-section-title">
                  <FiTrendingUp className="section-icon" />
                  Quick Actions
                </div>
              </div>
              <div className="profile-quick-actions">
                {quickActions.map((action, i) => (
                  <div key={i} className="profile-action-item" onClick={action.action}>
                    <div className={`profile-action-icon ${action.color}`}>
                      {action.icon}
                    </div>
                    <div className="profile-action-info">
                      <h4>{action.title}</h4>
                      <p>{action.desc}</p>
                    </div>
                    <FiChevronRight className="profile-action-arrow" />
                  </div>
                ))}
              </div>
            </div>

            {/* Activity */}
            <div className="profile-section-card">
              <div className="profile-section-header">
                <div className="profile-section-title">
                  <FiAward className="section-icon" />
                  Activity
                </div>
              </div>
              <div className="profile-activity-list">
                {recentActivity.map((item, i) => (
                  <div key={i} className="profile-activity-item">
                    <div className={`profile-activity-dot ${item.dot}`} />
                    <div className="profile-activity-content">
                      <h4>{item.title}</h4>
                      <p>{item.time} — {item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="password-modal-overlay" onClick={() => setShowPasswordModal(false)}>
          <div className="password-modal" onClick={e => e.stopPropagation()}>
            <h3><FiLock /> Change Password</h3>
            <div className="password-modal-form">
              <div className="profile-field">
                <label className="profile-field-label">Current Password</label>
                <input
                  type="password"
                  className="profile-field-input"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                />
              </div>
              <div className="profile-field">
                <label className="profile-field-label">New Password</label>
                <input
                  type="password"
                  className="profile-field-input"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min 6 chars)"
                />
              </div>
              <div className="profile-field">
                <label className="profile-field-label">Confirm New Password</label>
                <input
                  type="password"
                  className="profile-field-input"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                />
              </div>
              <div className="password-modal-actions">
                <button className="btn btn-secondary" onClick={() => setShowPasswordModal(false)}>
                  Cancel
                </button>
                <button className="btn btn-primary" onClick={handleChangePassword} disabled={saving}>
                  {saving ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
