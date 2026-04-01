import { useState, useEffect } from 'react';
import { Zap, Bike, Dumbbell, PersonStanding, Waves, Check, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface EquipmentCategory {
  name: string;
  icon: React.ReactNode;
  items: string[];
}

const defaultEquipment: EquipmentCategory[] = [
  {
    name: 'Cardio',
    icon: <Bike className="h-5 w-5" />,
    items: ['Tapis de course', 'Vélo elliptique', 'Rameur', 'Vélo stationnaire', 'Stepper'],
  },
  {
    name: 'Musculation',
    icon: <Dumbbell className="h-5 w-5" />,
    items: ['Presse à cuisses', 'Machine à tirage', 'Banc de développé couché', 'Poulie haute/basse', 'Smith machine', 'Haltères', 'Barres'],
  },
  {
    name: 'Fonctionnel',
    icon: <PersonStanding className="h-5 w-5" />,
    items: ['TRX', 'Kettlebells', 'Battle ropes', 'Box jumps', 'Medecine balls', 'Sacs de sable'],
  },
  {
    name: 'Récupération',
    icon: <Waves className="h-5 w-5" />,
    items: ['Rouleaux de massage', 'Tapis de stretching', 'Élastiques', 'Swiss ball'],
  },
];

interface EquipmentSectionProps {
  scrollRef?: React.RefObject<HTMLDivElement>;
}

export const EquipmentSection = ({ scrollRef }: EquipmentSectionProps) => {
  const { user } = useAuth();
  const [selectedEquipment, setSelectedEquipment] = useState<Set<string>>(new Set());
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [initialEquipment, setInitialEquipment] = useState<Set<string>>(new Set());

  // Load saved equipment from user_context
  useEffect(() => {
    const loadEquipment = async () => {
      if (!user) return;

      const { data } = await supabase
        .from('user_context')
        .select('value')
        .eq('user_id', user.id)
        .eq('key', 'gym_equipment')
        .maybeSingle();

      if (data?.value) {
        try {
          const equipment = JSON.parse(data.value);
          const equipmentSet = new Set<string>(equipment);
          setSelectedEquipment(equipmentSet);
          setInitialEquipment(equipmentSet);
        } catch {
          // If no valid JSON, select all by default
          const allItems = defaultEquipment.flatMap(c => c.items);
          const allSet = new Set(allItems);
          setSelectedEquipment(allSet);
          setInitialEquipment(allSet);
        }
      } else {
        // First time: select all equipment
        const allItems = defaultEquipment.flatMap(c => c.items);
        const allSet = new Set(allItems);
        setSelectedEquipment(allSet);
        setInitialEquipment(allSet);
      }
    };

    loadEquipment();
  }, [user]);

  const toggleEquipment = (item: string) => {
    setSelectedEquipment(prev => {
      const newSet = new Set(prev);
      if (newSet.has(item)) {
        newSet.delete(item);
      } else {
        newSet.add(item);
      }
      setHasChanges(!areSetsEqual(newSet, initialEquipment));
      return newSet;
    });
  };

  const areSetsEqual = (a: Set<string>, b: Set<string>) => {
    if (a.size !== b.size) return false;
    for (const item of a) {
      if (!b.has(item)) return false;
    }
    return true;
  };

  const saveEquipment = async () => {
    if (!user) return;
    setIsSaving(true);

    try {
      const equipmentArray = Array.from(selectedEquipment);
      
      // Upsert into user_context
      const { error } = await supabase
        .from('user_context')
        .upsert(
          {
            user_id: user.id,
            key: 'gym_equipment',
            value: JSON.stringify(equipmentArray),
          },
          { onConflict: 'user_id,key' }
        );

      if (error) throw error;

      setInitialEquipment(new Set(selectedEquipment));
      setHasChanges(false);
      setIsEditing(false);
      toast.success("Équipements sauvegardés !");
    } catch (err) {
      console.error("Error saving equipment:", err);
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setIsSaving(false);
    }
  };

  const cancelEditing = () => {
    setSelectedEquipment(new Set(initialEquipment));
    setHasChanges(false);
    setIsEditing(false);
  };

  return (
    <div ref={scrollRef} className="mb-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Équipements disponibles</h2>
        </div>
        {!isEditing ? (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsEditing(true)}
            className="text-muted-foreground"
          >
            Modifier
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={cancelEditing}
            >
              Annuler
            </Button>
            <Button 
              size="sm" 
              onClick={saveEquipment}
              disabled={!hasChanges || isSaving}
            >
              <Save className="h-4 w-4 mr-1" />
              {isSaving ? "..." : "Sauver"}
            </Button>
          </div>
        )}
      </div>
      
      <p className="mb-4 text-sm text-muted-foreground">
        {isEditing 
          ? "Coche les équipements disponibles dans ta salle pour des recommandations adaptées"
          : "Les équipements de ta salle de sport"
        }
      </p>
      
      <div className="space-y-3">
        {defaultEquipment.map((category) => (
          <div
            key={category.name}
            className="rounded-xl border border-border bg-card p-4"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                {category.icon}
              </div>
              <h3 className="font-semibold text-foreground">{category.name}</h3>
              {!isEditing && (
                <span className="ml-auto text-xs text-muted-foreground">
                  {category.items.filter(i => selectedEquipment.has(i)).length}/{category.items.length}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {category.items.map((item) => {
                const isSelected = selectedEquipment.has(item);
                
                if (isEditing) {
                  return (
                    <label
                      key={item}
                      className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs cursor-pointer transition-colors ${
                        isSelected 
                          ? 'bg-primary/20 text-primary' 
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      <Checkbox 
                        checked={isSelected}
                        onCheckedChange={() => toggleEquipment(item)}
                        className="h-3 w-3"
                      />
                      {item}
                    </label>
                  );
                }
                
                // View mode: only show selected items
                if (!isSelected) return null;
                
                return (
                  <span
                    key={item}
                    className="flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground"
                  >
                    <Check className="h-3 w-3 text-primary" />
                    {item}
                  </span>
                );
              })}
              {!isEditing && category.items.filter(i => selectedEquipment.has(i)).length === 0 && (
                <span className="text-xs text-muted-foreground/50 italic">
                  Aucun équipement sélectionné
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs text-muted-foreground/70 text-center">
        💡 Tu peux aussi dire au coach IA quel équipement tu as pour des séances 100% adaptées
      </p>
    </div>
  );
};

export default EquipmentSection;
