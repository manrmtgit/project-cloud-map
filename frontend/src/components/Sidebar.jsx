import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Icons } from './Icons';
import './Sidebar.css';

const Sidebar = ({ user, onLogout }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState(['signalements']);
  const location = useLocation();

  const toggleMenu = (menuId) => {
    setExpandedMenus(prev => 
      prev.includes(menuId) 
        ? prev.filter(id => id !== menuId)
        : [...prev, menuId]
    );
  };

  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: Icons.Dashboard,
      path: '/manager'
    },
    {
      id: 'signalements',
      label: 'Signalements',
      icon: Icons.MapPin,
      submenu: [
        { label: 'Liste des signalements', path: '/manager/signalements', icon: Icons.List },
        { label: 'Carte', path: '/manager/map', icon: Icons.Map },
        { label: 'Nouveau signalement', path: '/manager/signalements/new', icon: Icons.Plus },
      ]
    },
    {
      id: 'sync',
      label: 'Synchronisation',
      icon: Icons.Cloud,
      submenu: [
        { label: 'État Firebase', path: '/manager/sync', icon: Icons.Sync },
        { label: 'Historique', path: '/manager/sync/history', icon: Icons.Clock },
      ]
    },
    {
      id: 'statistiques',
      label: 'Statistiques',
      icon: Icons.BarChart,
      path: '/manager/stats'
    },
    {
      id: 'parametres',
      label: 'Paramètres',
      icon: Icons.Settings,
      path: '/manager/settings'
    }
  ];

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''}`}>
      {/* Logo Header */}
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="logo-icon">
            <Icons.Road size={28} />
          </div>
          {!collapsed && (
            <div className="logo-text">
              <span className="logo-title">CloudMap</span>
              <span className="logo-subtitle">Route Manager</span>
            </div>
          )}
        </div>
        <button 
          className="sidebar-toggle"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? <Icons.ChevronRight size={20} /> : <Icons.ChevronLeft size={20} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <ul className="nav-list">
          {navItems.map((item) => (
            <li key={item.id} className="nav-item">
              {item.submenu ? (
                <>
                  <button 
                    className={`nav-link nav-link-expandable ${expandedMenus.includes(item.id) ? 'expanded' : ''}`}
                    onClick={() => toggleMenu(item.id)}
                  >
                    <span className="nav-icon">
                      <item.icon size={20} />
                    </span>
                    {!collapsed && (
                      <>
                        <span className="nav-label">{item.label}</span>
                        <span className="nav-chevron">
                          <Icons.ChevronDown size={16} />
                        </span>
                      </>
                    )}
                  </button>
                  {!collapsed && expandedMenus.includes(item.id) && (
                    <ul className="nav-submenu">
                      {item.submenu.map((subItem, index) => (
                        <li key={index}>
                          <NavLink 
                            to={subItem.path}
                            className={({ isActive }) => `nav-sublink ${isActive ? 'active' : ''}`}
                          >
                            <span className="nav-icon">
                              <subItem.icon size={16} />
                            </span>
                            <span className="nav-label">{subItem.label}</span>
                          </NavLink>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              ) : (
                <NavLink 
                  to={item.path}
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                  <span className="nav-icon">
                    <item.icon size={20} />
                  </span>
                  {!collapsed && <span className="nav-label">{item.label}</span>}
                </NavLink>
              )}
            </li>
          ))}
        </ul>
      </nav>

      {/* User Section */}
      <div className="sidebar-footer">
        <div className="user-section">
          <div className="user-avatar">
            {user?.nom?.charAt(0) || 'U'}
          </div>
          {!collapsed && (
            <div className="user-info">
              <span className="user-name">{user?.nom || 'Utilisateur'}</span>
              <span className="user-role">{user?.role || 'Manager'}</span>
            </div>
          )}
          {!collapsed && (
            <button className="logout-btn" onClick={onLogout} title="Déconnexion">
              <Icons.LogOut size={18} />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
