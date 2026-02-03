import { Outlet } from 'react-router-dom';
import TabBar from './TabBar';

const AppLayout = () => {
  return (
    <div className="grid min-h-screen h-[100dvh] w-screen grid-rows-[1fr_auto] overflow-hidden bg-gradient-glow">
      <main className="overflow-y-auto">
        <Outlet />
      </main>
      
      {/* Bottom TabBar (separate row so it never overlays content) */}
      <div className="z-50">
        <TabBar />
      </div>
    </div>
  );
};

export default AppLayout;
