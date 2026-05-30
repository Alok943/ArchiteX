import { Outlet, NavLink } from 'react-router-dom';
import { Sidebar } from './Sidebar';

export function MainLayout() {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col transition-all duration-300 md:ml-16">
        {/* Top Header with Compact Header and CSS Zoomed Logo */}
        <header className="sticky top-0 z-40 flex items-center px-6 md:px-10 h-20 bg-surface-container/80 backdrop-blur-md border-b border-outline-variant/40 shrink-0 overflow-hidden">
          <img src="/logo.png" alt="ArchiteX" className="h-14 w-auto scale-[1.8] origin-left drop-shadow-[0_0_15px_rgba(255,255,255,0.08)] transition-transform duration-300 hover:scale-[1.9]" />
        </header>
        <main className="flex-1 pb-16 md:pb-0">
          <div className="h-full p-4 md:p-6 lg:p-8 max-w-[2560px] mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
