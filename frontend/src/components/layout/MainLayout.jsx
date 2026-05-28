import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

export function MainLayout() {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 transition-all duration-300 md:ml-16 pb-16 md:pb-0">
        <div className="h-full p-4 md:p-6 lg:p-8 max-w-[2560px] mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
