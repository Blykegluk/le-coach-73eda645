import { useState } from 'react';
import MobileTabBar from './MobileTabBar';
import DesktopSidebar from './DesktopSidebar';
import CoachDrawer from './CoachDrawer';
import OfflineBanner from './OfflineBanner';
import AnimatedOutlet from './AnimatedOutlet';

const AppLayout = () => {
  const [isCoachOpen, setIsCoachOpen] = useState(false);

  const handleOpenCoach = () => setIsCoachOpen(true);

  return (
    <div className="flex h-[100dvh] min-h-[100dvh] w-screen overflow-hidden bg-gradient-glow">
      {/* Desktop Sidebar */}
      <DesktopSidebar onOpenCoach={handleOpenCoach} />

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <OfflineBanner />
        {/* Scrollable content with animated page transitions */}
        <main className="flex-1 overflow-y-auto">
          <AnimatedOutlet context={{ onOpenCoach: handleOpenCoach }} />
        </main>

        {/* Mobile TabBar */}
        <div className="flex-shrink-0">
          <MobileTabBar onOpenCoach={handleOpenCoach} />
        </div>
      </div>

      {/* Coach Drawer */}
      <CoachDrawer isOpen={isCoachOpen} onClose={() => setIsCoachOpen(false)} />
    </div>
  );
};

export default AppLayout;
