import { useEffect, useState } from "react";
import { Area, AreaChart, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { adminApi } from "../../services/adminApi";

type Overview = {
  kpis: {
    totalActiveWorkers: number;
    activePoliciesThisWeek: number;
    totalPayoutsThisWeek: number;
    fraudFlagsThisWeek: number;
  };
  lossRatio: number;
  lossRatioHealth: string;
  payoutsTrend: Array<{ day: string; total: number }>;
  triggerDistribution: Array<{ triggerType: string; c: number }>;
};

export function AdminOverviewPage() {
  const [data, setData] = useState<Overview | null>(null);
  useEffect(() => {
    void adminApi.get<Overview>("/api/admin/overview").then((r) => setData(r.data));
  }, []);
  if (!data) return <div className="rounded-xl bg-white p-6">Loading overview…</div>;
  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-4 gap-3">
        <Card title="Total Active Workers" value={data.kpis.totalActiveWorkers} />
        <Card title="Active Policies This Week" value={data.kpis.activePoliciesThisWeek} />
        <Card title="Total Payouts This Week" value={`₹${Math.round(data.kpis.totalPayoutsThisWeek)}`} />
        <Card title="Fraud Flags This Week" value={data.kpis.fraudFlagsThisWeek} />
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-xl bg-white p-4 h-72">
          <p className="font-semibold mb-2">Payouts Over Last 7 Days</p>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.payoutsTrend}>
              <Tooltip />
              <Area dataKey="total" stroke="#14b8a6" fill="#99f6e4" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-xl bg-white p-4 h-72">
          <p className="font-semibold mb-2">Trigger Types Distribution</p>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data.triggerDistribution} dataKey="c" nameKey="triggerType" outerRadius={90} fill="#14b8a6" />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="rounded-xl bg-white p-5">
        <p className="font-semibold">Loss Ratio</p>
        <p className="text-3xl font-bold mt-2">{data.lossRatio.toFixed(1)}%</p>
        <p className="text-sm text-slate-500">{data.lossRatioHealth}</p>
      </div>
    </div>
  );
}

function Card({ title, value }: { title: string; value: number | string }) {
  return (
    <div className="rounded-xl bg-white p-4">
      <p className="text-xs text-slate-500">{title}</p>
      <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
    </div>
  );
}
