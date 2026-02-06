import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Icons } from './Icons';
import './Layout.css';
import { useAuth } from '../context/AuthContext';

const Layout = ({ children, title, showHeader = true, hideSidebar = false }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    if (logout) logout();
    navigate('/');
  };

  return (
    <div className={`app-layout ${hideSidebar ? 'hide-sidebar' : ''}`}>
      {!hideSidebar && <Sidebar user={user} onLogout={handleLogout} />}

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="mobile-overlay" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Main Content */}
      <main className="main-content">
        {showHeader && (
          <header className="content-header">
            <div className="header-left">
              <button 
                className="mobile-menu-btn"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Toggle menu"
              >
                <Icons.Menu size={24} />
              </button>
              {title && <h1 className="page-title">{title}</h1>}
            </div>
            
            <div className="header-right">
              <div className="header-search">
                <Icons.Search size={18} />
                <input type="text" placeholder="Rechercher..." />
              </div>
              
              <button className="header-icon-btn notification-btn">
                <Icons.Bell size={20} />
                <span className="notification-badge">3</span>
              </button>
              
              <div className="header-user">
                <div className="header-avatar">
                  {user?.nom?.charAt(0) || user?.username?.charAt(0) || 'U'}
                </div>
              </div>
            </div>
          </header>
        )}

        <div className="content-body">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
