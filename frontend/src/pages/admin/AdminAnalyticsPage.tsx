import { useEffect, useState } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { adminApi } from "../../services/adminApi";

export function AdminAnalyticsPage() {
  const [rows, setRows] = useState<Array<{ trigger: string; count: number }>>([]);
  useEffect(() => {
    void adminApi.get<{ payoutByTrigger: Array<{ trigger: string; count: number }> }>("/api/admin/analytics").then((r) => {
      setRows(r.data.payoutByTrigger);
    });
  }, []);
  return (
    <div className="rounded-xl bg-white p-4 h-[60vh]">
      <p className="font-semibold mb-2">7-Day Payout Trend by Trigger</p>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows}>
          <XAxis dataKey="trigger" />
          <YAxis />
          <Tooltip />
          <Line dataKey="count" stroke="#0ea5e9" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
