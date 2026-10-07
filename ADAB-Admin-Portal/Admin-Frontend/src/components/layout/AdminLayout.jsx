import { Outlet } from 'react-router-dom';
import AdminHeader from './AdminHeader';
import AdminSidebar from './AdminSidebar';

export default function AdminLayout() {
  return (
    <div className="min-h-screen text-slate-800 pb-16 lg:pb-0">
      <AdminHeader />
      <div className="max-w-[1440px] mx-auto px-3 sm:px-4 py-4 sm:py-5 flex flex-col lg:flex-row gap-5">
        <AdminSidebar />
        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
