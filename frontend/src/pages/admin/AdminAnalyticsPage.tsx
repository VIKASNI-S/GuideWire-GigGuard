import { useEffect, useState, useMemo } from "react";
import { 
  Area, 
  AreaChart, 
  Bar, 
  BarChart, 
  CartesianGrid, 
  Cell, 
  Pie, 
  PieChart, 
  ResponsiveContainer, 
  Tooltip, 
  XAxis, 
  YAxis 
} from "recharts";
import { adminApi } from "../../services/adminApi";

type OverviewData = {
  kpis: {
    totalActiveWorkers: number;
    activePoliciesThisWeek: number;
    totalPayoutsThisWeek: number;
    fraudFlagsThisWeek: number;
    avgPayoutPerUser: number;
  };
  lossRatio: number;
  fraudRate: number;
  lossRatioHealth: "Healthy" | "Caution" | "Critical";
  enrollmentStatus: "Active" | "Paused";
  payoutsTrend: Array<{ day: string; total: number }>;
  triggerDistribution: Array<{ triggerType: string; c: number }>;
};

const COLORS = ["#0d9488", "#0ea5e9", "#6366f1", "#f59e0b", "#ef4444"];

export function AdminAnalyticsPage() {
  const [data, setData] = useState<OverviewData | null>(null);

  useEffect(() => {
    void adminApi.get<OverviewData>("/api/admin/overview").then((r) => {
      setData(r.data);
    });
  }, []);

  const pieData = useMemo(() => {
    if (!data?.triggerDistribution) return [];
    return data.triggerDistribution.map((d) => ({
      name: d.triggerType.replace(/_/g, " ").toUpperCase(),
      value: d.c,
    }));
  }, [data]);

  if (!data) return <div className="p-8 text-slate-500 italic">Crunching latest business metrics...</div>;

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Status */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Business Analytics</h1>
          <p className="text-xs text-slate-500 uppercase font-bold tracking-widest">7-Day Performance Snapshot</p>
        </div>
        <div className="flex gap-2">
          <div className="bg-slate-900 text-white rounded-lg px-4 py-2 flex items-center gap-2 border border-slate-800 shadow-xl">
             <span className={`w-2 h-2 rounded-full ${data.enrollmentStatus === "Active" ? "bg-emerald-500" : "bg-rose-500 animate-pulse"}`}></span>
             <span className="text-xs font-bold uppercase tracking-tight">Enrollments: {data.enrollmentStatus}</span>
          </div>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KPIItem title="Avg Payout / User" value={`₹${data.kpis.avgPayoutPerUser.toFixed(0)}`} trend="+2.4%" />
        <KPIItem 
          title="7D Loss Ratio" 
          value={`${data.lossRatio.toFixed(1)}%`} 
          status={data.lossRatioHealth} 
          hint={data.lossRatio > 85 ? "Critical Threshold Exceeded" : "Within Budget"}
        />
        <KPIItem title="Fraud Frequency" value={`${data.fraudRate.toFixed(1)}%`} status={data.fraudRate > 15 ? "Caution" : "Healthy"} />
        <KPIItem title="Active Policies" value={data.kpis.activePoliciesThisWeek.toString()} trend="Live" />
        <KPIItem title="Total Payouts" value={`₹${data.kpis.totalPayoutsThisWeek.toLocaleString()}`} />
      </div>

      {/* Main Charts */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Payout Trend Line */}
        <div className="lg:col-span-2 rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
          <h3 className="text-sm font-bold text-slate-900 mb-6 uppercase tracking-tight">Daily Payout Volume (7D)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.payoutsTrend}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0d9488" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#0d9488" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '8px', color: '#fff' }}
                  itemStyle={{ color: '#2dd4bf', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="total" stroke="#0d9488" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Trigger Distribution */}
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 flex flex-col">
          <h3 className="text-sm font-bold text-slate-900 mb-6 uppercase tracking-tight">Trigger Distribution</h3>
          <div className="flex-1 min-h-[250px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
               <div className="text-center">
                  <p className="text-2xl font-black text-slate-900">{data.kpis.fraudFlagsThisWeek + data.kpis.totalPayoutsThisWeek > 0 ? (pieData.length) : 0}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Types</p>
               </div>
            </div>
          </div>
          <div className="mt-4 space-y-2">
             {pieData.map((p, i) => (
                <div key={p.name} className="flex items-center justify-between text-[11px]">
                   <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                      <span className="text-slate-600 font-medium">{p.name}</span>
                   </div>
                   <span className="font-bold text-slate-900">{p.value}</span>
                </div>
             ))}
          </div>
        </div>
      </div>

      {/* Secondary Row: Loss Ratio Pulse */}
      <div className="rounded-2xl bg-slate-900 p-8 text-white relative overflow-hidden shadow-2xl">
         <div className="relative z-10 grid md:grid-cols-2 gap-8 items-center">
            <div>
               <h3 className="text-xl font-black mb-2">Portfolio Health: {data.lossRatioHealth}</h3>
               <p className="text-sm text-slate-400 leading-relaxed">
                 Our current 7-day Loss Ratio is <span className="text-white font-bold">{data.lossRatio.toFixed(1)}%</span>. 
                 GigGuard automatically pauses new enrollments when this exceeds 85% to protect capital reserves.
               </p>
               {data.lossRatio > 85 && (
                  <div className="mt-4 p-3 bg-rose-500/20 border border-rose-500/30 rounded-lg text-rose-400 text-xs font-bold animate-pulse">
                    ⚠️ CRITICAL LOSS RATIO: Automatic enrollment pause active.
                  </div>
               )}
            </div>
            <div className="h-24 bg-slate-800/50 rounded-xl border border-slate-700 flex items-center justify-center">
               <div className="text-center">
                  <p className="text-4xl font-black text-teal-400">₹{(data.kpis.totalPayoutsThisWeek / 7).toFixed(0)}</p>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Avg Daily Payout Impact</p>
               </div>
            </div>
         </div>
         <div className="absolute right-0 top-0 w-64 h-64 bg-teal-500/5 rounded-full blur-[100px] -mr-32 -mt-32"></div>
      </div>
    </div>
  );
}

function KPIItem({ title, value, status, trend, hint }: { title: string; value: string; status?: string; trend?: string; hint?: string }) {
  const isCritical = status === "Critical" || status === "Caution";
  return (
    <div className={`rounded-2xl p-5 border shadow-sm transition-all hover:shadow-md ${isCritical ? 'bg-rose-50 border-rose-100' : 'bg-white border-slate-100'}`}>
      <div className="flex justify-between items-start mb-2">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</p>
        {trend && <span className="text-[9px] font-bold text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded">{trend}</span>}
      </div>
      <p className={`text-2xl font-black ${isCritical ? 'text-rose-600' : 'text-slate-900'}`}>{value}</p>
      {hint && <p className="text-[9px] font-bold text-rose-400 mt-1 uppercase">{hint}</p>}
      {status && !hint && <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase">Level: {status}</p>}
    </div>
  );
}
