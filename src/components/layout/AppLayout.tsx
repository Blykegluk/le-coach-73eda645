import { Outlet } from 'react-router-dom';
import TabBar from './TabBar';

const AppLayout = () => {
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-gradient-glow">
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
      
      <TabBar />
    </div>
  );
};

export default AppLayout;
