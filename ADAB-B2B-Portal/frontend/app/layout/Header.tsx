import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserCircle, LogOut, ChevronDown, User, Menu, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import authService from '../../services/authService';
import SocketStatusBadge from '../../components/common/SocketStatusBadge';
import { ThemeToggle } from '../../components/ui/ThemeToggle';
import NotificationBell from '../../components/common/NotificationBell';

interface HeaderProps {
  onMenuClick?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick, isCollapsed = false, onToggleCollapse }) => {
  const navigate = useNavigate();
  const { role, setLoggedIn } = useAuthStore();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch (e) {
      console.error('Logout API failed', e);
    } finally {
      setLoggedIn(false);
      navigate('/auth/login');
    }
  };

  const handleNavigateProfile = () => {
    navigate(`/${role}/profile-setup`);
    setIsDropdownOpen(false);
  };

  return (
    <header className="h-16 bg-white dark:bg-dark-header-bg border-b border-gray-200 dark:border-dark-border-primary flex items-center justify-between px-4 md:px-8 z-20 shadow-sm transition-colors duration-200">
      <div className="flex items-center gap-3">
        {/* Mobile menu button */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 -ml-2 text-gray-500 dark:text-dark-text-muted hover:text-gray-900 dark:hover:text-dark-text-primary hover:bg-gray-100 dark:hover:bg-dark-surface-hover rounded-lg transition-colors"
          aria-label="Toggle Mobile Menu"
        >
          <Menu className="w-6 h-6" />
        </button>

        {/* Desktop Sidebar Collapse / Expand Toggle Button */}
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex p-2 text-gray-500 dark:text-dark-text-muted hover:text-gray-900 dark:hover:text-dark-text-primary hover:bg-gray-100 dark:hover:bg-dark-surface-hover rounded-lg transition-colors"
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            aria-label="Toggle Sidebar"
          >
            {isCollapsed ? (
              <PanelLeftOpen className="w-5 h-5 text-adab-green" />
            ) : (
              <PanelLeftClose className="w-5 h-5 text-gray-500 dark:text-dark-text-muted" />
            )}
          </button>
        )}

        <div className="flex items-center gap-3 group">
          <img
            src="transparent logo.png"
            alt="ADAB"
            className="h-7 md:h-8 w-auto object-contain"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          <div className="h-4 w-px bg-gray-200 dark:bg-dark-border-primary hidden sm:block mx-1"></div>
          <span className="text-sm md:text-base font-bold text-gray-500 dark:text-dark-text-muted tracking-tight hidden sm:block uppercase tracking-widest opacity-80">
            B2B Portal
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Real-time Socket.io status badge */}
        <SocketStatusBadge />

        {/* Notifications Component */}
        <NotificationBell />

        <div className="flex items-center" ref={dropdownRef}>
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center space-x-2 md:space-x-4 pl-4 md:pl-6 border-l border-gray-200 dark:border-dark-border-primary group transition-all duration-200 focus:outline-none"
            >
              <div className="text-right hidden sm:block">
                <div className="text-sm font-semibold text-gray-900 dark:text-dark-text-primary leading-none flex items-center gap-1 group-hover:text-adab-green transition-colors">
                  <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </div>
              </div>

              <div className="relative group-hover:scale-105 transition-transform duration-200">
                <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-gray-100 dark:bg-dark-surface-elevated border border-gray-200 dark:border-dark-border-secondary flex items-center justify-center text-gray-500 dark:text-dark-text-secondary group-hover:border-adab-green/40">
                  <User className="w-4 h-4 md:w-5 md:h-5" />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 md:w-3 md:h-3 bg-adab-green border-2 border-white dark:border-dark-app-primary rounded-full"></div>
              </div>
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 mt-3 w-56 bg-white dark:bg-dark-surface-card border border-gray-200 dark:border-dark-border-primary rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 ring-4 ring-black/5 z-50">
                <div className="p-2 space-y-1">
                  <button
                    onClick={handleNavigateProfile}
                    className="w-full flex items-center px-4 py-3 text-sm font-semibold text-gray-700 dark:text-dark-text-primary hover:bg-gray-50 dark:hover:bg-dark-surface-hover rounded-xl transition-colors gap-3"
                  >
                    <div className="p-2 bg-gray-50 dark:bg-dark-surface-elevated rounded-lg text-gray-500 dark:text-dark-text-secondary">
                      <UserCircle className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <p className="leading-none mb-1">Profile Setup</p>
                      <p className="text-[10px] text-gray-400 dark:text-dark-text-muted font-bold uppercase tracking-widest leading-none">Settings & Bio</p>
                    </div>
                  </button>

                  <div className="h-px bg-gray-100 dark:bg-dark-border-primary my-1 mx-2"></div>

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center px-4 py-3 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-colors gap-3"
                  >
                    <div className="p-2 bg-red-100/60 dark:bg-red-950/50 rounded-lg text-red-600 dark:text-red-400">
                      <LogOut className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <p className="leading-none mb-1">Sign Out</p>
                      <p className="text-[10px] text-red-400 dark:text-red-500 font-bold uppercase tracking-widest leading-none">End Session</p>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
