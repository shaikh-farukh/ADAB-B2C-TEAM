import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  LogOut,
  ShoppingBag,
  UserPlus,
  ClipboardList,
  Users,
  Factory,
  History,
  Grid,
  ShoppingCart,
  LifeBuoy,
  ShieldCheck,
  Lock,
  Mail,
  X,
  CircleDollarSign,
  Landmark,
  Megaphone,
  Compass,
  Package,
  Store,
  Truck,
  FileText,
  PieChart,
  Clock,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  MapPin,
  Search,
  Star,
  Map
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import authService from '../../services/authService';
import { useNavigate } from 'react-router-dom';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

/**
 * Responsibility: Main vertical navigation container.
 * Features: Responsive drawer on mobile, Collapsible icon/full mode on desktop with sleek dark mode support.
 */
const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, isCollapsed = false, onToggleCollapse }) => {
  const { role, setLoggedIn } = useAuthStore();
  const navigate = useNavigate();

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

  type NavItem = { label: string; path: string; icon: any };
  type NavGroup = { section?: string; items: NavItem[] };

  const manufacturerNav: NavGroup[] = [
    { items: [{ label: 'Dashboard', path: `/manufacturer/dashboard`, icon: LayoutDashboard }] },
    {
      section: 'DISCOVERY',
      items: [
        { label: 'Shops By Area', path: `/discovery/area`, icon: MapPin },
        { label: 'Product Availability', path: `/discovery/product`, icon: Search },
        { label: 'Shops Near Me', path: `/discovery/shops-near-me`, icon: Compass },
        { label: 'Featured Shops', path: `/discovery/featured-shops`, icon: Star },
      ]
    },
    {
      section: 'CATALOG',
      items: [
        { label: 'Products', path: `/manufacturer/products`, icon: ShoppingBag },
      ]
    },
    {
      section: 'SALES',
      items: [
        { label: 'Orders', path: `/manufacturer/orders`, icon: ClipboardList },
        { label: 'Distributors', path: `/manufacturer/distributors`, icon: Users },
        { label: 'Invitations', path: `/manufacturer/requests`, icon: UserPlus },
      ]
    },
    {
      section: 'LOGISTICS',
      items: [
        { label: 'Logistics Providers', path: `/manufacturer/logistics`, icon: Truck },
        { label: 'Drivers', path: `/manufacturer/drivers`, icon: Users },
        { label: 'Vehicles', path: `/manufacturer/vehicles`, icon: Truck },
      ]
    },
    {
      section: 'FINANCE',
      items: [
        { label: 'Reconciliation', path: `/manufacturer/reconciliation`, icon: PieChart },
        { label: 'Aging Report', path: `/manufacturer/aging-report`, icon: Clock },
        { label: 'Ledger Statement', path: `/manufacturer/ledger`, icon: FileText },
        { label: 'Settlements', path: `/manufacturer/settlements`, icon: Landmark },
      ]
    },
    {
      section: 'MARKETING',
      items: [
        { label: 'Campaign Manager', path: `/manufacturer/campaigns`, icon: Megaphone },
        { label: 'Market Coverage', path: `/common/market-coverage`, icon: Compass },
      ]
    },
    {
      section: 'SUPPORT',
      items: [
        { label: 'Activity Logs', path: `/manufacturer/audit-logs`, icon: History },
        { label: 'Help & Support', path: `/common/help`, icon: LifeBuoy },
        { label: 'Contact Us', path: `/common/contact`, icon: Mail },
      ]
    },
    {
      section: 'LEGAL',
      items: [
        { label: 'Terms & Conditions', path: `/common/terms`, icon: ShieldCheck },
        { label: 'Privacy Policy', path: `/common/privacy`, icon: Lock },
      ]
    }
  ];

  const distributorNav: NavGroup[] = [
    { items: [{ label: 'Dashboard', path: `/distributor/dashboard`, icon: LayoutDashboard }] },
    {
      section: 'DISCOVERY',
      items: [
        { label: 'Shops By Area', path: `/discovery/area`, icon: MapPin },
        { label: 'Product Availability', path: `/discovery/product`, icon: Search },
        { label: 'Shops Near Me', path: `/discovery/shops-near-me`, icon: Compass },
        { label: 'Featured Shops', path: `/discovery/featured-shops`, icon: Star },
      ]
    },
    {
      section: 'PROCUREMENT',
      items: [
        { label: 'Manufacturers', path: `/distributor/manufacturers`, icon: Factory },
        { label: 'Invitations', path: `/distributor/request-status`, icon: History },
        { label: 'Product Catalog', path: `/distributor/catalog`, icon: Grid },
        { label: 'My Cart', path: `/distributor/cart`, icon: ShoppingCart },
      ]
    },
    {
      section: 'ORDERS',
      items: [
        { label: 'My Orders', path: `/distributor/orders`, icon: ClipboardList },
        { label: 'Shop Orders', path: `/distributor/shop-orders`, icon: Store },
      ]
    },
    {
      section: 'INVENTORY',
      items: [
        { label: 'Inventory', path: `/distributor/inventory`, icon: Package },
      ]
    },
    {
      section: 'LOGISTICS',
      items: [
        { label: 'Territory', path: `/distributor/territory`, icon: Map },
        { label: 'Logistics Providers', path: `/distributor/logistics`, icon: Truck },
        { label: 'Drivers', path: `/distributor/drivers`, icon: Users },
        { label: 'Vehicles', path: `/distributor/vehicles`, icon: Truck },
      ]
    },
    {
      section: 'FINANCE',
      items: [
        { label: 'Payments', path: `/distributor/payments`, icon: CircleDollarSign },
        { label: 'Ledger Statement', path: `/distributor/ledger`, icon: FileText },
      ]
    },
    {
      section: 'MARKETING',
      items: [
        { label: 'Market Coverage', path: `/common/market-coverage`, icon: Compass },
      ]
    },
    {
      section: 'SUPPORT',
      items: [
        { label: 'Activity Logs', path: `/distributor/audit-logs`, icon: History },
        { label: 'Help & Support', path: `/common/help`, icon: LifeBuoy },
        { label: 'Contact Us', path: `/common/contact`, icon: Mail },
      ]
    },
    {
      section: 'LEGAL',
      items: [
        { label: 'Terms & Conditions', path: `/common/terms`, icon: ShieldCheck },
        { label: 'Privacy Policy', path: `/common/privacy`, icon: Lock },
      ]
    }
  ];

  const adminNav: NavGroup[] = [
    { items: [{ label: 'Master Dashboard', path: `/admin/dashboard`, icon: LayoutDashboard }] },
    {
      section: 'OPERATIONS',
      items: [
        { label: 'KYC Approvals', path: `/admin/kyc-approvals`, icon: ShieldCheck },
        { label: 'Activity Logs', path: `/admin/audit-logs`, icon: History },
      ]
    },
    {
      section: 'SETTINGS',
      items: [
        { label: 'Platform Fees', path: `/admin/platform-settings`, icon: CircleDollarSign },
      ]
    }
  ];

  const navItems = role === 'admin'
    ? adminNav
    : role === 'manufacturer' 
      ? manufacturerNav 
      : role === 'distributor' 
        ? distributorNav 
        : [];

  return (
    <>
      {/* Dark Overlay for mobile */}
      <div 
        className={cn(
          "fixed inset-0 bg-gray-950/60 backdrop-blur-sm z-40 transition-opacity duration-300 lg:hidden",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Sidebar Container */}
      <aside 
        className={cn(
          "fixed inset-y-0 left-0 z-50 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col transition-all duration-300 ease-in-out lg:relative lg:translate-x-0 shadow-xl lg:shadow-none",
          isCollapsed ? "w-20" : "w-64",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Floating Desktop Collapse/Expand Tab on the Border */}
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex absolute -right-3.5 top-20 z-50 w-7 h-7 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full items-center justify-center text-gray-500 dark:text-gray-300 hover:text-adab-green dark:hover:text-adab-green hover:border-adab-green dark:hover:border-adab-green shadow-md transition-all active:scale-95"
            title={isCollapsed ? "Expand Sidebar (Click to expand)" : "Collapse Sidebar (Click to collapse)"}
            aria-label="Toggle Sidebar Collapse"
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        )}

        {/* Logo & Header Section */}
        <div className={cn(
          "h-16 flex items-center justify-between border-b border-gray-100 dark:border-gray-800/80 bg-white dark:bg-gray-900 transition-all duration-300",
          isCollapsed ? "px-2 justify-center" : "px-5"
        )}>
          {!isCollapsed ? (
            <>
              <div 
                onClick={onToggleCollapse}
                className="flex items-center gap-3 group cursor-pointer overflow-hidden flex-1 select-none"
                title="Click to collapse sidebar"
              >
                <img 
                  src="/directory/logo.jpeg" 
                  alt="ADAB Logo" 
                  className="h-9 w-9 object-cover rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 shrink-0"
                  onError={(e) => {
                    e.currentTarget.src = "https://raw.githubusercontent.com/lucide-react/lucide/main/icons/shopping-cart.svg";
                  }}
                />
                <div className="flex flex-col truncate">
                  <span className="text-base font-black text-gray-900 dark:text-white tracking-tight leading-none">ADAB</span>
                  <span className="text-[10px] font-bold text-adab-green uppercase tracking-widest leading-tight">B2B Portal</span>
                </div>
              </div>

              {/* Desktop Collapse Icon Button in Header */}
              {onToggleCollapse && (
                <button
                  onClick={onToggleCollapse}
                  className="hidden lg:flex p-1.5 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors ml-1"
                  title="Collapse Sidebar"
                  aria-label="Collapse Sidebar"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}
            </>
          ) : (
            <button 
              onClick={onToggleCollapse}
              className="flex items-center justify-center p-1 group cursor-pointer hover:scale-105 transition-transform" 
              title="Click to expand sidebar"
            >
              <img 
                src="/directory/logo.jpeg" 
                alt="ADAB Logo" 
                className="h-9 w-9 object-cover rounded-xl shadow-sm border border-gray-100 dark:border-gray-800"
                onError={(e) => {
                  e.currentTarget.src = "https://raw.githubusercontent.com/lucide-react/lucide/main/icons/shopping-cart.svg";
                }}
              />
            </button>
          )}

          {/* Close Button for mobile drawer */}
          <button 
            onClick={onClose}
            className="lg:hidden p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
            aria-label="Close Mobile Sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Section with Custom Scrollbar */}
        <nav className={cn(
          "flex-1 py-4 overflow-y-auto custom-scrollbar space-y-5 transition-all duration-300",
          isCollapsed ? "px-2" : "px-3"
        )}>
          {navItems.map((group, groupIdx) => (
            <div key={groupIdx}>
              {group.section && (
                <div className={cn("mb-2", isCollapsed ? "px-1 text-center" : "px-3")}>
                  {!isCollapsed ? (
                    <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{group.section}</span>
                  ) : (
                    <div className="h-px bg-gray-200 dark:bg-gray-800 my-2 mx-auto w-6" />
                  )}
                </div>
              )}
              <div className="space-y-1">
                {group.items.map((item) => (
                  <NavLink
                    key={item.label}
                    to={item.path}
                    onClick={onClose}
                    title={isCollapsed ? item.label : undefined}
                    className={({ isActive }) => cn(
                      "flex items-center rounded-xl transition-all duration-200 group relative",
                      isCollapsed 
                        ? "justify-center p-2.5" 
                        : "px-3 py-2.5 text-[13px]",
                      isActive
                        ? "bg-adab-green/10 dark:bg-adab-green/20 text-adab-green dark:text-adab-green font-bold shadow-sm" 
                        : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800/60 font-medium"
                    )}
                  >
                    {({ isActive }) => (
                      <>
                        <item.icon className={cn(
                          "w-5 h-5 shrink-0 transition-colors",
                          !isCollapsed && "mr-3",
                          isActive 
                            ? "text-adab-green dark:text-adab-green drop-shadow-[0_0_6px_rgba(107,207,45,0.4)]" 
                            : "text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200"
                        )} />
                        
                        {!isCollapsed && (
                          <span className="truncate">{item.label}</span>
                        )}

                        {/* Hover Tooltip in Collapsed Mode */}
                        {isCollapsed && (
                          <span className="absolute left-full ml-3 px-2.5 py-1 bg-gray-900 dark:bg-gray-800 text-white text-xs font-semibold rounded-lg shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 border border-gray-700">
                            {item.label}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* System Footer & Expand/Collapse Trigger */}
        <div className={cn(
          "p-3 border-t border-gray-100 dark:border-gray-800/80 bg-gray-50/50 dark:bg-gray-900/60 transition-all duration-300",
          isCollapsed ? "px-2" : "px-3"
        )}>
          {/* Bottom Expand Toggle in Collapsed Mode */}
          {onToggleCollapse && isCollapsed && (
            <button
              onClick={onToggleCollapse}
              className="w-full mb-3 flex items-center justify-center p-2 text-gray-400 hover:text-adab-green hover:bg-white dark:hover:bg-gray-800 rounded-xl transition-all border border-gray-200 dark:border-gray-800 shadow-sm"
              title="Expand Sidebar"
              aria-label="Expand Sidebar"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}

          <div className={cn(
            "flex items-center transition-all duration-300",
            isCollapsed ? "justify-center flex-col gap-2" : "justify-between px-1"
          )}>
            <div className="flex items-center space-x-2" title="Server Status: Online">
              <div className="w-2 h-2 rounded-full bg-adab-green animate-pulse"></div>
              {!isCollapsed && (
                <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest whitespace-nowrap">Online</span>
              )}
            </div>

            <button 
              onClick={handleLogout} 
              className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;

