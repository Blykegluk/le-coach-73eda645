import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import TabBar from './TabBar';
import ChatFAB from './ChatFAB';
import ChatModal from './ChatModal';

const AppLayout = () => {
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background">
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
      
      <TabBar />
      
      <ChatFAB onClick={() => setIsChatOpen(true)} />
      
      <ChatModal
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
      />
    </div>
  );
};

export default AppLayout;
