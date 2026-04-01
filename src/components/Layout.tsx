import { Outlet, NavLink } from 'react-router-dom';
import { Timer, Plus, BarChart3, Flag } from 'lucide-react';

export default function Layout() {
  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-content">
          <NavLink to="/" className="logo">
            <Flag size={28} />
            <span>KartTimer</span>
          </NavLink>
          <nav className="main-nav">
            <NavLink to="/" end className="nav-link">
              <Timer size={18} />
              <span>Sessions</span>
            </NavLink>
            <NavLink to="/new" className="nav-link">
              <Plus size={18} />
              <span>New Session</span>
            </NavLink>
            <NavLink to="/stats" className="nav-link">
              <BarChart3 size={18} />
              <span>Stats</span>
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
