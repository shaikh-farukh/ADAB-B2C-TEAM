import { NavLink } from 'react-router-dom';

export default function AdminSidebar() {
  const getNavClass = ({ isActive }) =>
    isActive
      ? "nav-on w-full text-left px-3 py-2.5 rounded-xl flex items-center gap-2.5"
      : "w-full text-left px-3 py-2.5 rounded-xl flex items-center gap-2.5 text-slate-600 hover:bg-slate-50";

  return (
    <aside className="lg:w-64 lg:p-0 shrink-0">
      <nav className="card p-2 text-sm sticky top-20">
        <div className="nav-label">Overview</div>
        <NavLink to="/" className={getNavClass}><i className="fa-solid fa-gauge-high w-4"></i> Dashboard</NavLink>
        <NavLink to="/approvals" className={getNavClass}><i className="fa-solid fa-check-to-slot w-4 text-amber-500"></i> Approvals</NavLink>
        <div className="nav-label">Portals</div>
        <NavLink to="/sellers" className={getNavClass}><i className="fa-solid fa-store w-4 text-green-600"></i> Sellers</NavLink>
        <NavLink to="/customers" className={getNavClass}><i className="fa-solid fa-users w-4 text-blue-600"></i> Customers</NavLink>
        <div className="nav-label">System</div>
        <NavLink to="/reports" className={getNavClass}><i className="fa-solid fa-chart-line w-4"></i> Reports</NavLink>
        <NavLink to="/audit" className={getNavClass}><i className="fa-solid fa-list-check w-4"></i> Audit Log</NavLink>
        <NavLink to="/settings" className={getNavClass}><i className="fa-solid fa-gear w-4"></i> Settings</NavLink>
      </nav>
    </aside>
  );
}
