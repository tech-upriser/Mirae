import { LayoutDashboard, BarChart3, Calendar, Settings, User, Users } from 'lucide-react';
import { Link, useLocation } from 'react-router';
import { BrandLogo } from './BrandLogo';
import { useUser } from '../contexts/UserContext';

interface SidebarProps {
  onManageResumesOpen: () => void;
  onSocialPortfolioOpen: () => void;
  onLogoutOpen: () => void;
}

export function Sidebar({
  onManageResumesOpen,
  onSocialPortfolioOpen,
  onLogoutOpen,
}: SidebarProps) {
  const location = useLocation();
  const { user } = useUser();

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Analytics', path: '/analytics', icon: BarChart3 },
    { name: 'Calendar', path: '/calendar', icon: Calendar },
    { name: 'Contacts', path: '/contacts', icon: Users },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  // Get user initials for fallback
  const getUserInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 bg-secondary text-secondary-foreground flex flex-col z-10 overflow-visible">
      <div className="p-6 border-b border-secondary-foreground/20">
        <div className="flex items-center gap-3">
          <BrandLogo className="h-12 w-12 flex-shrink-0" />
          <h1 className="text-2xl tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
            <span className="text-secondary-foreground">Mirae</span>
          </h1>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <div className="w-2 h-2 rounded-full bg-secondary-foreground animate-pulse"></div>
          <span className="text-xs text-secondary-foreground/80">Connected</span>
        </div>
      </div>

      <nav className="flex-1 p-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-md mb-2 transition-all duration-200
                ${isActive
                  ? 'bg-secondary-foreground/10 text-secondary-foreground border-l-4 border-secondary-foreground shadow-lg font-bold'
                  : 'text-secondary-foreground/80 hover:bg-secondary-foreground/5 hover:text-secondary-foreground'
                }
              `}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-secondary-foreground/20">
        <Link
          to="/settings"
          className="w-full flex items-center gap-3 p-3 rounded-md bg-secondary-foreground/5 hover:bg-secondary-foreground/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary-foreground/30 transition-colors text-left cursor-pointer"
        >
          {/* Profile Avatar */}
          <span className="w-10 h-10 rounded-full bg-secondary-foreground/20 flex items-center justify-center overflow-hidden">
            {user?.profilePhoto ? (
              <img
                src={user.profilePhoto}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-5 h-5 text-card-foreground" />
            )}
          </span>
          <span className="text-left flex flex-col">
            <span className="text-sm font-bold text-secondary-foreground">
              {user?.name || 'Mirae User'}
            </span>
            {(user as any)?.tagline && (
              <span className="text-xs text-secondary-foreground/80">{(user as any).tagline}</span>
            )}
          </span>
        </Link>
      </div>
    </aside>
  );
}
