import { Footprints, Flame, Droplets, Moon, Heart, Dumbbell, Bike, PersonStanding } from "lucide-react";
import { Header } from "@/components/fitness/Header";
import { ProgressRing } from "@/components/fitness/ProgressRing";
import { StatCard } from "@/components/fitness/StatCard";
import { ActivityItem } from "@/components/fitness/ActivityItem";
import { WeeklyChart } from "@/components/fitness/WeeklyChart";
import { GoalCard } from "@/components/fitness/GoalCard";
import { BottomNav } from "@/components/fitness/BottomNav";

const Index = () => {
  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="container max-w-2xl mx-auto px-4">
        <Header />

        {/* Progress Rings Section */}
        <section className="mb-8 animate-fade-in-up">
          <div className="bg-card rounded-3xl p-6 shadow-card">
            <h2 className="text-lg font-semibold text-foreground mb-6">Objectifs du jour</h2>
            <div className="grid grid-cols-4 gap-2">
              <ProgressRing
                progress={78}
                size={90}
                strokeWidth={8}
                color="energy"
                icon={<Footprints className="h-5 w-5" />}
                label="Pas"
                value="7,823"
                target="10,000"
              />
              <ProgressRing
                progress={65}
                size={90}
                strokeWidth={8}
                color="calories"
                icon={<Flame className="h-5 w-5" />}
                label="Calories"
                value="1,430"
                target="2,200"
              />
              <ProgressRing
                progress={88}
                size={90}
                strokeWidth={8}
                color="water"
                icon={<Droplets className="h-5 w-5" />}
                label="Eau"
                value="1.8L"
                target="2L"
              />
              <ProgressRing
                progress={100}
                size={90}
                strokeWidth={8}
                color="sleep"
                icon={<Moon className="h-5 w-5" />}
                label="Sommeil"
                value="7h30"
                target="7h"
              />
            </div>
          </div>
        </section>

        {/* Stats Grid */}
        <section className="mb-8 animate-fade-in-up animation-delay-100">
          <h2 className="text-lg font-semibold text-foreground mb-4">Statistiques</h2>
          <div className="grid grid-cols-2 gap-4">
            <StatCard
              icon={<Heart className="h-5 w-5" />}
              label="Fréquence cardiaque"
              value="72"
              unit="bpm"
              color="heart"
              trend={{ value: 5, isPositive: false }}
            />
            <StatCard
              icon={<Flame className="h-5 w-5" />}
              label="Calories actives"
              value="456"
              unit="kcal"
              color="calories"
              trend={{ value: 12, isPositive: true }}
            />
          </div>
        </section>

        {/* Weekly Chart */}
        <section className="mb-8 animate-fade-in-up animation-delay-200">
          <WeeklyChart />
        </section>

        {/* Goals */}
        <section className="mb-8 animate-fade-in-up animation-delay-300">
          <h2 className="text-lg font-semibold text-foreground mb-4">Mes objectifs</h2>
          <div className="space-y-3">
            <GoalCard
              title="Distance quotidienne"
              current={4.2}
              target={6}
              unit="km"
              color="energy"
            />
            <GoalCard
              title="Minutes actives"
              current={45}
              target={60}
              unit="min"
              color="calories"
            />
            <GoalCard
              title="Verres d'eau"
              current={7}
              target={8}
              unit="verres"
              color="water"
            />
          </div>
        </section>

        {/* Recent Activities */}
        <section className="mb-8 animate-fade-in-up animation-delay-400">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Activités récentes</h2>
            <button className="text-sm font-medium text-primary hover:underline">
              Voir tout
            </button>
          </div>
          <div className="space-y-3">
            <ActivityItem
              icon={<Dumbbell className="h-5 w-5" />}
              title="Musculation"
              subtitle="Haut du corps"
              duration="45 min"
              calories={320}
              color="energy"
            />
            <ActivityItem
              icon={<Bike className="h-5 w-5" />}
              title="Cyclisme"
              subtitle="Trajet domicile-travail"
              duration="25 min"
              calories={180}
              color="calories"
            />
            <ActivityItem
              icon={<PersonStanding className="h-5 w-5" />}
              title="Marche"
              subtitle="Promenade matinale"
              duration="35 min"
              calories={145}
              color="water"
            />
          </div>
        </section>
      </div>

      <BottomNav />
    </div>
  );
};

export default Index;
