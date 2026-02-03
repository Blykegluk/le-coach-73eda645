import { Outlet } from 'react-router-dom';
import TabBar from './TabBar';

const AppLayout = () => {
  return (
    <div className="flex h-[100dvh] h-screen w-screen flex-col overflow-hidden bg-gradient-glow">
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>
      
      {/* Fixed bottom TabBar */}
      <div className="fixed bottom-0 left-0 right-0 z-50">
        <TabBar />
      </div>
    </div>
  );
};

export default AppLayout;
