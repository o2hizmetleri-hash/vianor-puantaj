"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";

interface Props {
  departments: { name: string; value: number; color: string }[];
  week: { date: string; present: number; absent: number; leave: number }[];
}

export function DashboardCharts({ departments, week }: Props) {
  const weekData = week.map((w) => ({
    label: format(parseISO(w.date), "dd MMM", { locale: tr }),
    Geldi: w.present,
    Gelmedi: w.absent,
    İzinli: w.leave,
  }));

  return (
    <div className="space-y-6">
      <div className="h-44">
        {departments.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-ink-600">
            Henüz veri yok
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={departments}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={36}
                outerRadius={68}
                paddingAngle={2}
              >
                {departments.map((d, i) => (
                  <Cell key={i} fill={d.color} stroke="#FDF8F0" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "#FFFFFF",
                  border: "1px solid #EDD9BC",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="space-y-1.5">
        {departments.map((d) => (
          <div key={d.name} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span
                className="inline-block w-2.5 h-2.5 rounded-sm"
                style={{ background: d.color }}
              />
              <span className="text-ink-900">{d.name}</span>
            </div>
            <span className="font-mono text-ink-600">{d.value}</span>
          </div>
        ))}
      </div>

      <div>
        <p className="text-xs text-ink-600 mb-2 uppercase tracking-wide">
          Son 7 gün doluluk
        </p>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weekData} margin={{ top: 0, right: 0, left: -28, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EDD9BC" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#5C4A3D" }} stroke="#EDD9BC" />
              <YAxis tick={{ fontSize: 10, fill: "#5C4A3D" }} stroke="#EDD9BC" allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  background: "#FFFFFF",
                  border: "1px solid #EDD9BC",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Bar dataKey="Geldi" stackId="a" fill="#6B8E4E" radius={[0, 0, 0, 0]} />
              <Bar dataKey="İzinli" stackId="a" fill="#C77D3A" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Gelmedi" stackId="a" fill="#A03030" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
