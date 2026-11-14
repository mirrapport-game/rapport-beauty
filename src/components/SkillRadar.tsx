import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer } from "recharts";
import { radarData, type Scores } from "@/lib/feedback";

export function SkillRadar({ scores, height = 280 }: { scores: Scores; height?: number }) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer>
        <RadarChart data={radarData(scores)} outerRadius="72%">
          <PolarGrid className="stroke-border" />
          <PolarAngleAxis dataKey="criterion" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
          <PolarRadiusAxis domain={[0, 5]} tickCount={6} tick={false} axisLine={false} />
          <Radar dataKey="value" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.35} isAnimationActive />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
