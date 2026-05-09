import { NavLink } from 'react-router-dom';
import { Home, Users, CalendarDays, User } from 'lucide-react';

const links = [
  { to: '/dashboard', icon: Home, label: 'Home' },
  { to: '/groups', icon: Users, label: 'Groups' },
  { to: '/events', icon: CalendarDays, label: 'Events' },
  { to: '/profile', icon: User, label: 'Profile' },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 md:hidden safe-area-pb">
      <div className="flex items-center justify-around h-16">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                isActive ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'
              }`
            }
          >
            <Icon className="w-5 h-5" />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
