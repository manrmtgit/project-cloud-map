import React from 'react';
import { NavLink } from 'react-router-dom';
import './Sidebar.css';

const Sidebar = ({ user, onLogout, mobileOpen, onClose, collapsed, onToggleCollapse }) => {
  const isManager = user?.role === 'MANAGER' || user?.role === 'manager';

  const navItems = [
    { label: 'Carte', icon: 'fa-solid fa-map-location-dot', path: '/' },
    { label: 'Tableau de bord', icon: 'fa-solid fa-chart-pie', path: '/dashboard', manager: true },
    { label: 'Gestion', icon: 'fa-solid fa-list-check', path: '/manager', manager: true },
    { label: 'Statistiques', icon: 'fa-solid fa-chart-line', path: '/stats', manager: true },
    { label: 'Mon profil', icon: 'fa-regular fa-user', path: '/profile' },
  ];

  const filteredNav = navItems.filter(item => !item.manager || isManager);

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
      {/* Logo */}
      <div className="sidebar-brand">
        <div className="brand-icon">
          <i className="fa-solid fa-road"></i>
        </div>
        {!collapsed && (
          <div className="brand-text">
            <span className="brand-name">CloudMap</span>
            <span className="brand-sub">Signalement routier</span>
          </div>
        )}
        <button className="collapse-btn" onClick={onToggleCollapse} title={collapsed ? 'Ouvrir' : 'Réduire'}>
          <i className={`fa-solid fa-chevron-${collapsed ? 'right' : 'left'}`}></i>
        </button>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {filteredNav.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={onClose}
            title={collapsed ? item.label : ''}
          >
            <i className={item.icon}></i>
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Footer user */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="user-avatar">{user?.nom?.charAt(0) || 'U'}</div>
          {!collapsed && (
            <>
              <div className="user-details">
                <span className="user-name">{user?.nom || 'Utilisateur'}</span>
                <span className="user-role">{user?.role || ''}</span>
              </div>
              <button className="logout-btn" onClick={onLogout} title="Déconnexion">
                <i className="fa-solid fa-right-from-bracket"></i>
              </button>
            </>
          )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
