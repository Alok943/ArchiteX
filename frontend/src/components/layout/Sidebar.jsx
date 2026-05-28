import { NavLink } from 'react-router-dom';
import { LayoutDashboard, CheckCircle, TerminalSquare, BarChart2, Shield } from 'lucide-react';
import clsx from 'clsx';

const navItems = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Validation Engine', path: '/validation', icon: CheckCircle },
  { name: 'Playground', path: '/playground', icon: TerminalSquare },
  { name: 'Metrics', path: '/metrics', icon: BarChart2 },
];

export function Sidebar() {
  return (
    <>
      {/* Desktop/Tablet Sidebar */}
      <nav className="hidden md:flex flex-col bg-surface-container border-r border-outline-variant h-full fixed left-0 top-0 z-50 transition-all duration-300 w-16 xl:hover:w-60 group">
        <div className="flex items-center h-16 px-4 shrink-0 overflow-hidden border-b border-outline-variant/50">
          <Shield className="w-8 h-8 text-primary shrink-0" />
          <span className="ml-4 font-headline-md text-primary-gradient-text whitespace-nowrap opacity-0 xl:group-hover:opacity-100 transition-opacity duration-300">
            Architex
          </span>
        </div>
        
        <div className="flex-1 py-4 flex flex-col gap-2 px-2 overflow-hidden">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => clsx(
                "flex items-center px-2 py-3 rounded-md transition-colors whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                isActive 
                  ? "bg-primary/10 text-primary" 
                  : "text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface"
              )}
            >
              <item.icon className="w-6 h-6 shrink-0" />
              <span className="ml-4 font-label-xs text-xs tracking-wider uppercase opacity-0 xl:group-hover:opacity-100 transition-opacity duration-300">
                {item.name}
              </span>
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Mobile Bottom Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full h-16 bg-surface-container border-t border-outline-variant z-50 flex items-center justify-around px-2 pb-safe">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => clsx(
              "flex flex-col items-center justify-center p-2 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-primary/50 transition-colors",
              isActive 
                ? "text-primary" 
                : "text-on-surface-variant hover:text-on-surface"
            )}
          >
            <item.icon className="w-5 h-5 mb-1" />
            <span className="font-label-xs text-[10px] tracking-wider uppercase">
              {item.name}
            </span>
          </NavLink>
        ))}
      </nav>
    </>
  );
}
