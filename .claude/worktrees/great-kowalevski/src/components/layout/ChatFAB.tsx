import { MessageCircle } from 'lucide-react';

interface ChatFABProps {
  onClick: () => void;
}

const ChatFAB = ({ onClick }: ChatFABProps) => {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all hover:scale-105 hover:shadow-xl active:scale-95"
      aria-label="Ouvrir le chat coach"
    >
      <MessageCircle className="h-6 w-6" />
    </button>
  );
};

export default ChatFAB;
