import { Outlet } from 'react-router-dom';
import TabBar from './TabBar';

const AppLayout = () => {
  return (
    // Important: avoid `h-screen` on mobile (100vh can include the browser UI and clip the bottom nav).
    <div className="flex h-[100dvh] min-h-[100dvh] w-screen flex-col overflow-hidden bg-gradient-glow">
      {/* Scrollable content area */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
      
      {/* Fixed TabBar with safe area - not overlaying content */}
      <div className="flex-shrink-0">
        <TabBar />
      </div>
    </div>
  );
};

export default AppLayout;
