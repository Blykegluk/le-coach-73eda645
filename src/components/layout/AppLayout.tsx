import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import MobileTabBar from './MobileTabBar';
import DesktopSidebar from './DesktopSidebar';
import CoachDrawer from './CoachDrawer';

const AppLayout = () => {
  const [isCoachOpen, setIsCoachOpen] = useState(false);

  return (
    <div className="flex h-[100dvh] min-h-[100dvh] w-screen overflow-hidden bg-gradient-glow">
      {/* Desktop Sidebar */}
      <DesktopSidebar onOpenCoach={() => setIsCoachOpen(true)} />
      
      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
        
        {/* Mobile TabBar */}
        <div className="flex-shrink-0">
          <MobileTabBar onOpenCoach={() => setIsCoachOpen(true)} />
        </div>
      </div>

      {/* Coach Drawer */}
      <CoachDrawer isOpen={isCoachOpen} onClose={() => setIsCoachOpen(false)} />
    </div>
  );
};

export default AppLayout;
