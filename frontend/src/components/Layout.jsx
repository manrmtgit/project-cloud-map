import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';
import './Layout.css';

const Layout = ({ children, hideSidebar = false, showHeader = true }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const pageTitle = () => {
    const map = {
      '/': 'Carte',
      '/dashboard': 'Tableau de bord',
      '/manager': 'Gestion',
      '/profile': 'Mon profil',
      '/stats': 'Statistiques'
    };
    return map[location.pathname] || '';
  };

  return (
    <div className={`app-layout ${hideSidebar ? 'no-sidebar' : ''} ${sidebarCollapsed ? 'sidebar-is-collapsed' : ''}`}>
      {!hideSidebar && (
        <>
          <Sidebar
            user={user}
            onLogout={handleLogout}
            mobileOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          />
          {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}
        </>
      )}

      <main className={`main-area ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        {showHeader && (
          <header className="top-header">
            <div className="header-left">
              {!hideSidebar && (
                <button className="menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
                  <i className="fa-solid fa-bars"></i>
                </button>
              )}
              <button className="collapse-toggle" onClick={() => setSidebarCollapsed(!sidebarCollapsed)} title={sidebarCollapsed ? 'Ouvrir le menu' : 'Réduire le menu'}>
                <i className={`fa-solid fa-chevron-${sidebarCollapsed ? 'right' : 'left'}`}></i>
              </button>
              <h1 className="page-title">{pageTitle()}</h1>
            </div>

            <div className="header-right">
              <div className="header-search">
                <i className="fa-solid fa-magnifying-glass"></i>
                <input type="text" placeholder="Rechercher..." />
              </div>

              <button className="icon-btn">
                <i className="fa-regular fa-bell"></i>
              </button>

              {user && (
                <div className="profile-dropdown" onClick={() => setShowProfileMenu(!showProfileMenu)}>
                  <div className="avatar-sm">{user.nom?.charAt(0) || 'U'}</div>
                  <div className="profile-info">
                    <span className="profile-name">{user.nom || 'Utilisateur'}</span>
                    <span className="profile-role">{user.role || ''}</span>
                  </div>
                  <i className="fa-solid fa-chevron-down"></i>

                  {showProfileMenu && (
                    <div className="dropdown-menu" onClick={e => e.stopPropagation()}>
                      <div className="dropdown-item" onClick={() => { navigate('/profile'); setShowProfileMenu(false); }}>
                        <i className="fa-regular fa-user"></i> Mon profil
                      </div>
                      <div className="dropdown-divider" />
                      <div className="dropdown-item danger" onClick={handleLogout}>
                        <i className="fa-solid fa-right-from-bracket"></i> Déconnexion
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </header>
        )}

        <div className="content-area">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
