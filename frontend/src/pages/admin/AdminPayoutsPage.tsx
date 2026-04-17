import { useEffect, useState } from "react";
import { adminApi } from "../../services/adminApi";

type Row = { id: string; userId: string; amount: string; status: string; transactionId: string; createdAt: string };

export function AdminPayoutsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  useEffect(() => {
    void adminApi.get<{ items: Row[] }>("/api/admin/payouts").then((r) => setRows(r.data.items));
  }, []);
  return (
    <div className="rounded-xl bg-white p-4 overflow-x-auto">
      <p className="font-semibold mb-3">All Payouts</p>
      <table className="min-w-full text-sm">
        <thead className="text-left text-slate-500 border-b">
          <tr><th className="py-2">Date</th><th>User</th><th>Amount</th><th>Status</th><th>Txn</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b hover:bg-teal-50">
              <td className="py-2">{r.createdAt ? new Date(r.createdAt).toLocaleString() : "—"}</td>
              <td>{r.userId}</td>
              <td>₹{r.amount}</td>
              <td>{r.status}</td>
              <td>{r.transactionId ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
