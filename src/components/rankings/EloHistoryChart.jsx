import React from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { format } from "date-fns";

export default function EloHistoryChart({ player, snapshots }) {
  const todayStr = format(new Date(), "yyyy-MM-dd");

  // Build data from historical snapshots
  const historicalData = snapshots
    .filter((s) => s.player_elos?.some((e) => e.player_id === player.id))
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map((s) => {
      const sortedAll = [...(s.player_elos || [])].sort((a, b) => b.elo - a.elo);
      const entry = sortedAll.find((e) => e.player_id === player.id);
      const rank = sortedAll.findIndex((e) => e.player_id === player.id) + 1;
      return { date: s.date, elo: entry?.elo ?? null, rank: rank > 0 ? rank : null };
    });

  // Add today's live data if not already present
  if (historicalData.length === 0 || historicalData[historicalData.length - 1].date !== todayStr) {
    // Compute today's rank from current players passed via snapshot — approximate from player.elo
    historicalData.push({ date: todayStr, elo: player.elo || 1200, rank: null });
  }

  const eloData = historicalData.filter((d) => d.elo !== null);
  const rankData = historicalData.filter((d) => d.rank !== null);

  const hasEnoughData = eloData.length >= 2;

  if (!hasEnoughData) {
    return (
      <p className="text-xs text-muted-foreground text-center py-4">
        ELO &amp; rank history builds up after daily snapshots are recorded
      </p>
    );
  }

  const elos = eloData.map((d) => d.elo);
  const minElo = Math.min(...elos) - 20;
  const maxElo = Math.max(...elos) + 20;

  const ranks = rankData.map((d) => d.rank);
  const maxRank = Math.max(...ranks) + 1;

  return (
    <div className="space-y-4">
      {/* ELO chart */}
      <div>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">ELO Over Time</p>
        <ResponsiveContainer width="100%" height={140}>
          <LineChart data={eloData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="date"
              tickFormatter={(d) => format(new Date(d), "MMM d")}
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[minElo, maxElo]}
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              formatter={(v) => [`${v} ELO`, "ELO"]}
              labelFormatter={(d) => format(new Date(d), "MMM d, yyyy")}
              contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", color: "hsl(var(--foreground))" }}
            />
            <ReferenceLine y={1200} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" strokeOpacity={0.4} />
            <Line
              type="monotone"
              dataKey="elo"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ r: 3, fill: "hsl(var(--primary))" }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Rank placement chart — only show if we have rank data */}
      {rankData.length >= 2 && (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">Rank Placement Over Time</p>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={rankData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <XAxis
                dataKey="date"
                tickFormatter={(d) => format(new Date(d), "MMM d")}
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={[1, maxRank]}
                reversed={true}
                allowDecimals={false}
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `#${v}`}
              />
              <Tooltip
                formatter={(v) => [`#${v}`, "Rank"]}
                labelFormatter={(d) => format(new Date(d), "MMM d, yyyy")}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", color: "hsl(var(--foreground))" }}
              />
              <ReferenceLine y={1} stroke="hsl(var(--accent))" strokeDasharray="3 3" strokeOpacity={0.5} />
              <Line
                type="monotone"
                dataKey="rank"
                stroke="hsl(var(--accent))"
                strokeWidth={2}
                dot={{ r: 3, fill: "hsl(var(--accent))" }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
          <p className="text-[10px] text-muted-foreground text-center mt-1">#1 is top — lower is better</p>
        </div>
      )}
    </div>
  );
}