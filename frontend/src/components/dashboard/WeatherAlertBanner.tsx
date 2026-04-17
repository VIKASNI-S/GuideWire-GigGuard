import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { api } from "../../services/api";

type Alert = { type: string; level: "approaching" | "active"; message: string };

export function WeatherAlertBanner() {
  const [alert, setAlert] = useState<Alert | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const tick = async () => {
      try {
        const { data } = await api.get<{ alerts: Alert[] }>("/api/risk/alerts");
        setAlert(data.alerts[0] ?? null);
        setDismissed(false);
      } catch {
        /* ignore */
      }
    };
    void tick();
    const id = setInterval(() => void tick(), 2 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (alert && alert.level !== "active") {
      const id = setTimeout(() => setAlert(null), 5000);
      return () => clearTimeout(id);
    }
  }, [alert]);

  const show = alert && !dismissed;
  const tone =
    alert?.level === "active"
      ? "from-red-500 to-rose-600 text-white"
      : "from-amber-300 to-orange-400 text-amber-950";

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          className={`rounded-xl bg-gradient-to-r px-4 py-3 shadow ${tone}`}
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium">{alert.message}</p>
            <button className="text-xs underline" onClick={() => setDismissed(true)}>
              Dismiss
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
