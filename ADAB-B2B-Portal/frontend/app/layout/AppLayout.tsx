import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

/**
 * Responsibility: Orchestrates the high-level structural shell of the application.
 * Layout: Responsive & Collapsible Sidebar (Drawer on mobile, Collapsible on desktop) + Header + Content.
 */
const AppLayout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sidebar_collapsed') === 'true';
    }
    return false;
  });

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('sidebar_collapsed', String(next));
      return next;
    });
  };

  return (
    <div className="flex h-screen bg-[#F8F9FA] dark:bg-dark-app-primary text-gray-900 dark:text-dark-text-primary overflow-hidden relative font-sans transition-colors duration-200">
      {/* Sidebar Component with responsive & collapsible props */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={closeSidebar}
        isCollapsed={isCollapsed}
        onToggleCollapse={toggleCollapse}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Header with Menu and Collapse Triggers */}
        <Header
          onMenuClick={toggleSidebar}
          isCollapsed={isCollapsed}
          onToggleCollapse={toggleCollapse}
        />

        {/* Dynamic Route Content */}
        <main className="flex-1 overflow-y-auto custom-scrollbar bg-[#F8F9FA] dark:bg-dark-app-primary transition-colors duration-200">
          <div className="p-4 sm:p-6 md:p-8 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-2 duration-500">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AppLayout;