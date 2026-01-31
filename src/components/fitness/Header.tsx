import { Bell, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Header = () => {
  const today = new Date();
  const options: Intl.DateTimeFormatOptions = { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long' 
  };
  const formattedDate = today.toLocaleDateString('fr-FR', options);

  return (
    <header className="flex items-center justify-between py-6">
      <div>
        <p className="text-sm text-muted-foreground capitalize">{formattedDate}</p>
        <h1 className="text-2xl font-bold text-foreground">Bonjour, Alex 👋</h1>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="rounded-full hover:bg-secondary">
          <Bell className="h-5 w-5 text-muted-foreground" />
        </Button>
        <Button variant="ghost" size="icon" className="rounded-full hover:bg-secondary">
          <Settings className="h-5 w-5 text-muted-foreground" />
        </Button>
        <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-semibold ml-2">
          A
        </div>
      </div>
    </header>
  );
};
