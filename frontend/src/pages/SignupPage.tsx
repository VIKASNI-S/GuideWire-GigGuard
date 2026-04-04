import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { Shield } from "../components/ui/Icons";

type Step = 1 | 2 | 3;

const platforms = [
  "Zomato",
  "Swiggy",
  "Zepto",
  "Blinkit",
  "Amazon",
  "Flipkart",
  "Dunzo",
  "Other",
];

function inferCategory(platform: string): string {
  const p = platform.toLowerCase();
  if (["zomato", "swiggy"].includes(p)) return "Food Delivery";
  if (["zepto", "blinkit", "dunzo"].includes(p)) return "Grocery / Q-Commerce";
  if (["amazon", "flipkart"].includes(p)) return "E-Commerce";
  return "Food Delivery";
}

export function SignupPage() {
  const nav = useNavigate();
  const { refreshUser } = useAuth();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [dob, setDob] = useState("");
  const [aadhaar, setAadhaar] = useState("");

  const [platform, setPlatform] = useState("Swiggy");
  const deliveryCategory = useMemo(() => inferCategory(platform), [platform]);
  const [deliveryCat, setDeliveryCat] = useState(deliveryCategory);
  const [workerId, setWorkerId] = useState("");
  const [years, setYears] = useState(2);
  const [vehicle, setVehicle] = useState("bike");
  const [orders, setOrders] = useState(25);
  const [income, setIncome] = useState(8000);
  const [hours, setHours] = useState(10);

  const [upi, setUpi] = useState("rider@upi");
  const [bank, setBank] = useState("");
  const [payoutMethod, setPayoutMethod] = useState<"upi" | "bank_transfer">(
    "upi"
  );
  const [lat, setLat] = useState<number | null>(null);
  const [lon, setLon] = useState<number | null>(null);
  const [locLoading, setLocLoading] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});

  function validateStep1(): boolean {
    const e: Record<string, string> = {};
    if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      e.password = "Min 8 chars with 1 uppercase and 1 number";
    }
    if (password !== confirm) e.confirm = "Passwords do not match";
    if (!/^[6-9]\d{9}$/.test(phone)) e.phone = "10-digit Indian mobile";
    if (!/^\d{4}$/.test(aadhaar)) e.aadhaar = "Last 4 digits of Aadhaar";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function validateStep2(): boolean {
    const e: Record<string, string> = {};
    if (platform.toLowerCase() !== "other" && workerId.trim() === "") {
      e.workerId = "Worker ID required for this platform";
    }
    if (income <= 0) e.income = "Weekly income must be > 0";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function validateStep3(): boolean {
    const e: Record<string, string> = {};
    if (!/^[\w.-]+@[\w.-]+$/.test(upi)) e.upi = "UPI format name@bank";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function requestLocation() {
    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLon(pos.coords.longitude);
        setLocLoading(false);
        toast.success("Location captured");
      },
      () => {
        setLocLoading(false);
        toast.error("Could not read location — you can continue");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function submit() {
    if (!validateStep3()) return;
    setLoading(true);
    try {
      await api.post("/api/auth/signup", {
        fullName,
        email,
        phone,
        password,
        city,
        state,
        dateOfBirth: dob,
        aadhaarLast4: aadhaar,
        platform,
        deliveryCategory: deliveryCat,
        workerIdPlatform: workerId || undefined,
        yearsExperience: years,
        vehicleType: vehicle,
        avgDailyOrders: orders,
        avgWeeklyIncome: income,
        workingHoursPerDay: hours,
        upiId: upi,
        bankAccountNumber: bank || undefined,
        preferredPayoutMethod: payoutMethod,
        latitude: lat ?? undefined,
        longitude: lon ?? undefined,
      });
      await refreshUser();
      toast.success(`Welcome to Phoeraksha, ${fullName}! 🎉`);
      nav("/plans");
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { error?: string } } };
      toast.error(ax.response?.data?.error ?? "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg rounded-2xl border border-slate-700/60 bg-slate-900/85 p-8 shadow-2xl">
        <div className="flex items-center gap-2 text-white mb-4">
          <Shield className="h-9 w-9 text-teal-400" />
          <span className="text-lg font-semibold">Create account</span>
        </div>
        <div className="flex gap-2 mb-8">
          {([1, 2, 3] as Step[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStep(s)}
              className={`flex-1 rounded-full py-1.5 text-xs font-semibold ${
                step === s
                  ? "bg-teal-500 text-white"
                  : "bg-slate-800 text-slate-400"
              }`}
            >
              Step {s}
            </button>
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-3">
            <Field label="Full name" value={fullName} onChange={setFullName} />
            <Field label="Email" type="email" value={email} onChange={setEmail} />
            <Field
              label="Phone"
              value={phone}
              onChange={setPhone}
              error={errors.phone}
            />
            <Field
              label="Password"
              type="password"
              value={password}
              onChange={setPassword}
              error={errors.password}
            />
            <Field
              label="Confirm password"
              type="password"
              value={confirm}
              onChange={setConfirm}
              error={errors.confirm}
            />
            <Field label="City" value={city} onChange={setCity} />
            <Field label="State" value={state} onChange={setState} />
            <Field label="Date of birth" type="date" value={dob} onChange={setDob} />
            <Field
              label="Aadhaar last 4 digits"
              value={aadhaar}
              onChange={setAadhaar}
              error={errors.aadhaar}
            />
            <button
              type="button"
              onClick={() => validateStep1() && setStep(2)}
              className="mt-4 w-full rounded-lg bg-gradient-to-r from-sky-500 to-teal-500 py-2.5 font-semibold text-white"
            >
              Continue
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <label className="block text-xs text-slate-400">Delivery platform</label>
            <select
              className="w-full rounded-lg border border-slate-600 bg-slate-950/60 px-3 py-2 text-white"
              value={platform}
              onChange={(e) => {
                setPlatform(e.target.value);
                setDeliveryCat(inferCategory(e.target.value));
              }}
            >
              {platforms.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <Field
              label="Delivery category"
              value={deliveryCat}
              onChange={setDeliveryCat}
            />
            <Field
              label="Platform worker ID"
              value={workerId}
              onChange={setWorkerId}
              error={errors.workerId}
            />
            <Field
              label="Years of experience"
              type="number"
              value={String(years)}
              onChange={(v) => setYears(Number(v))}
            />
            <label className="block text-xs text-slate-400">Vehicle</label>
            <select
              className="w-full rounded-lg border border-slate-600 bg-slate-950/60 px-3 py-2 text-white"
              value={vehicle}
              onChange={(e) => setVehicle(e.target.value)}
            >
              {["bike", "scooter", "cycle", "auto", "other"].map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
            <Field
              label="Avg daily orders"
              type="number"
              value={String(orders)}
              onChange={(v) => setOrders(Number(v))}
            />
            <Field
              label="Avg weekly income (₹)"
              type="number"
              value={String(income)}
              onChange={(v) => setIncome(Number(v))}
              error={errors.income}
            />
            <Field
              label="Working hours / day"
              type="number"
              value={String(hours)}
              onChange={(v) => setHours(Number(v))}
            />
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 rounded-lg border border-slate-600 py-2 text-slate-200"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => validateStep2() && setStep(3)}
                className="flex-1 rounded-lg bg-gradient-to-r from-sky-500 to-teal-500 py-2 font-semibold text-white"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <Field label="UPI ID" value={upi} onChange={setUpi} error={errors.upi} />
            <Field
              label="Bank account (optional)"
              value={bank}
              onChange={setBank}
            />
            <label className="block text-xs text-slate-400">Payout method</label>
            <select
              className="w-full rounded-lg border border-slate-600 bg-slate-950/60 px-3 py-2 text-white"
              value={payoutMethod}
              onChange={(e) =>
                setPayoutMethod(e.target.value as "upi" | "bank_transfer")
              }
            >
              <option value="upi">UPI</option>
              <option value="bank_transfer">Bank transfer</option>
            </select>
            <button
              type="button"
              onClick={requestLocation}
              disabled={locLoading}
              className="w-full rounded-lg border border-teal-500/50 py-2 text-teal-300 text-sm"
            >
              {locLoading ? "Locating…" : "Allow location (GPS)"}
            </button>
            {lat !== null && lon !== null && (
              <p className="text-xs text-slate-400">
                Captured: {lat.toFixed(4)}, {lon.toFixed(4)}
              </p>
            )}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex-1 rounded-lg border border-slate-600 py-2 text-slate-200"
              >
                Back
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={submit}
                className="flex-1 rounded-lg bg-gradient-to-r from-sky-500 to-teal-500 py-2 font-semibold text-white disabled:opacity-60"
              >
                {loading ? "Creating…" : "Create account"}
              </button>
            </div>
          </div>
        )}

        <p className="mt-6 text-center text-sm text-slate-400">
          Already registered?{" "}
          <Link to="/login" className="text-teal-400 font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  error?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1">{label}</label>
      <input
        type={type}
        className="w-full rounded-lg border border-slate-600 bg-slate-950/60 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-teal-500"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  );
}
