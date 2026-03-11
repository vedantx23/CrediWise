import { NavLink, Link } from 'react-router-dom';
import { FiSearch, FiBell } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

const NAV_PILLS = [
  { label: 'Dashboard', path: '/' },
  { label: 'Cards', path: '/cards' },
  { label: 'Rewards', path: '/rewards' },
  { label: 'Spending', path: '/spending' },
  { label: 'Insights', path: '/insights' }
];

export default function Navbar() {
  const { user } = useAuth();
  return (
    <nav className="navbar-top">
      {/* Left side: Logo */}
      <div className="navbar-logo">
        <div className="logo-icon"></div>
        <h2>CrediWise</h2>
      </div>

      {/* Center Navbar Pills */}
      <div className="navbar-pills">
        {NAV_PILLS.map((pill) => (
          <NavLink
            key={pill.path}
            to={pill.path}
            className={({ isActive }) => (isActive ? 'nav-pill active' : 'nav-pill')}
          >
            {pill.label}
          </NavLink>
        ))}
      </div>

      {/* Right side: Search, Notifications, Avatar */}
      <div className="navbar-actions">
        <div className="search-box">
          <FiSearch className="search-icon" />
          <input type="text" placeholder="Search..." />
        </div>
        <button className="icon-btn">
          <FiBell />
        </button>
        <Link to="/profile" className="profile-avatar" title="View Profile">
          <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name || 'User'}`} alt="User Profile" />
        </Link>
      </div>
    </nav>
  );
}
