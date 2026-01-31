import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

const data = [
  { day: "Lun", steps: 8500, goal: 10000 },
  { day: "Mar", steps: 12000, goal: 10000 },
  { day: "Mer", steps: 9800, goal: 10000 },
  { day: "Jeu", steps: 11200, goal: 10000 },
  { day: "Ven", steps: 7600, goal: 10000 },
  { day: "Sam", steps: 14500, goal: 10000 },
  { day: "Dim", steps: 6200, goal: 10000 },
];

export const WeeklyChart = () => {
  return (
    <div className="bg-card rounded-2xl p-6 shadow-card">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Activité hebdomadaire</h3>
          <p className="text-sm text-muted-foreground">Vos pas cette semaine</p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-energy" />
            <span className="text-muted-foreground">Pas</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-muted" />
            <span className="text-muted-foreground">Objectif</span>
          </div>
        </div>
      </div>
      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={8}>
            <XAxis 
              dataKey="day" 
              axisLine={false} 
              tickLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            />
            <YAxis 
              hide 
              domain={[0, 15000]}
            />
            <Tooltip
              cursor={false}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg">
                      <p className="text-sm font-medium text-foreground">
                        {payload[0].value?.toLocaleString()} pas
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar 
              dataKey="steps" 
              fill="hsl(var(--energy))" 
              radius={[6, 6, 0, 0]}
              maxBarSize={40}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
