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

  const [showPass, setShowPass] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validateStep1(): boolean {
    const e: Record<string, string> = {};
    if (fullName.trim().length < 2) e.fullName = "Name must be at least 2 chars";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Invalid email format";
    if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      e.password = "Min 8 chars with 1 uppercase and 1 number";
    }
    if (password !== confirm) e.confirm = "Passwords do not match";
    if (!/^[6-9]\d{9}$/.test(phone)) e.phone = "10-digit Indian mobile";
    if (!/^\d{4}$/.test(aadhaar)) e.aadhaar = "Exactly 4 digits";
    if (!city.trim()) e.city = "City is required";
    if (!state.trim()) e.state = "State is required";
    if (!dob) e.dob = "Date of birth is required";
    
    setErrors(e);
    if (Object.keys(e).length > 0) {
      toast.error("Please fix errors in Step 1");
      return false;
    }
    return true;
  }

  function validateStep2(): boolean {
    const e: Record<string, string> = {};
    if (platform.toLowerCase() !== "other" && workerId.trim() === "") {
      e.workerId = "Worker ID required for this platform";
    }
    if (income <= 0) e.income = "Weekly income must be > 0";
    if (years < 0) e.years = "Experience cannot be negative";
    if (orders < 0) e.orders = "Daily orders cannot be negative";

    setErrors(e);
    if (Object.keys(e).length > 0) {
      toast.error("Please fix errors in Step 2");
      return false;
    }
    return true;
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
    } catch (err: any) {
      console.error("Signup error:", err);
      if (err.response?.data?.details) {
        // Zod validation errors from server
        const details = err.response.data.details;
        const fieldErrors: Record<string, string> = {};
        
        if (details.fieldErrors) {
          Object.entries(details.fieldErrors).forEach(([field, msgs]: [string, any]) => {
            fieldErrors[field] = msgs[0];
          });
          setErrors(fieldErrors);
          
          // Determine which step has the first error
          const step1Fields = ['fullName', 'email', 'phone', 'password', 'city', 'state', 'aadhaarLast4', 'dob'];
          const hasStep1Err = step1Fields.some(f => fieldErrors[f]);
          if (hasStep1Err) setStep(1);
          else setStep(2);
          
          toast.error("Validation failed. Please check the marked fields.");
        } else {
          toast.error(err.response.data.error || "Signup failed");
        }
      } else {
        toast.error(err.response?.data?.error || "Connection error or server failure");
      }
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
              onClick={() => {
                if (s > step) {
                  if (step === 1 && !validateStep1()) return;
                  if (step === 2 && !validateStep2()) return;
                }
                setStep(s)
              }}
              className={`flex-1 rounded-full py-1.5 text-xs font-semibold transition-colors ${
                step === s
                  ? "bg-teal-500 text-white shadow-[0_0_15px_rgba(20,184,166,0.3)]"
                  : "bg-slate-800 text-slate-400 hover:bg-slate-700"
              }`}
            >
              Step {s}
            </button>
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-3">
            <Field label="Full name" value={fullName} onChange={setFullName} error={errors.fullName} />
            <Field label="Email" type="email" value={email} onChange={setEmail} error={errors.email} />
            <Field
              label="Phone"
              value={phone}
              onChange={setPhone}
              error={errors.phone}
              placeholder="10-digit number"
            />
            <div className="relative">
              <Field
                label="Password"
                type={showPass ? "text" : "password"}
                value={password}
                onChange={setPassword}
                error={errors.password}
              />
              <button 
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-[34px] text-slate-500 hover:text-slate-300"
              >
                <i className={`fa-solid ${showPass ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              </button>
            </div>
            <Field
              label="Confirm password"
              type={showPass ? "text" : "password"}
              value={confirm}
              onChange={setConfirm}
              error={errors.confirm}
            />
            <div className="grid grid-cols-2 gap-3">
              <Field label="City" value={city} onChange={setCity} error={errors.city} />
              <Field label="State" value={state} onChange={setState} error={errors.state} />
            </div>
            <Field label="Date of birth" type="date" value={dob} onChange={setDob} error={errors.dob} />
            <Field
              label="Aadhaar last 4 digits"
              value={aadhaar}
              onChange={setAadhaar}
              error={errors.aadhaar}
              placeholder="e.g. 1234"
            />
            <button
              type="button"
              onClick={() => validateStep1() && setStep(2)}
              className="mt-4 w-full rounded-lg bg-gradient-to-r from-sky-500 to-teal-500 py-3 font-bold text-white shadow-lg shadow-sky-500/20 active:scale-[0.98] transition-transform"
            >
              Continue to Work Info
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Delivery platform</label>
              <select
                className="w-full rounded-lg border border-slate-600 bg-slate-950/60 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-teal-500 transition-all"
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
            </div>
            <Field
              label="Delivery category"
              value={deliveryCat}
              onChange={setDeliveryCat}
            />
            <Field
              label="Platform worker ID"
              value={workerId}
              onChange={setWorkerId}
              error={errors.workerId || errors.workerIdPlatform}
            />
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Years of experience"
                type="number"
                value={String(years)}
                onChange={(v) => setYears(Number(v))}
                error={errors.years}
              />
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Vehicle</label>
                <select
                  className="w-full rounded-lg border border-slate-600 bg-slate-950/60 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                  value={vehicle}
                  onChange={(e) => setVehicle(e.target.value)}
                >
                  {["bike", "scooter", "cycle", "auto", "other"].map((v) => (
                    <option key={v} value={v}>
                      {v.charAt(0).toUpperCase() + v.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Avg daily orders"
                type="number"
                value={String(orders)}
                onChange={(v) => setOrders(Number(v))}
                error={errors.orders}
              />
              <Field
                label="Working hours / day"
                type="number"
                value={String(hours)}
                onChange={(v) => setHours(Number(v))}
                error={errors.hours}
              />
            </div>
            <Field
              label="Avg weekly income (₹)"
              type="number"
              value={String(income)}
              onChange={(v) => setIncome(Number(v))}
              error={errors.income}
            />
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 rounded-lg border border-slate-600 py-2.5 text-slate-200 font-medium hover:bg-slate-800 transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => validateStep2() && setStep(3)}
                className="flex-1 rounded-lg bg-gradient-to-r from-sky-500 to-teal-500 py-2.5 font-bold text-white shadow-lg shadow-sky-500/20 active:scale-[0.98] transition-transform"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="p-4 bg-teal-500/10 border border-teal-500/20 rounded-xl">
              <p className="text-xs text-teal-300 leading-relaxed italic">
                Almost done! We need your payout details to process automatic insurance payments through UPI or Bank Transfer.
              </p>
            </div>
            <Field label="UPI ID" value={upi} onChange={setUpi} error={errors.upi} placeholder="vpa@bank" />
            <Field
              label="Bank account (optional)"
              value={bank}
              onChange={setBank}
              placeholder="For bank transfers"
            />
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Preferred Payout method</label>
              <select
                className="w-full rounded-lg border border-slate-600 bg-slate-950/60 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                value={payoutMethod}
                onChange={(e) =>
                  setPayoutMethod(e.target.value as "upi" | "bank_transfer")
                }
              >
                <option value="upi">UPI (Faster)</option>
                <option value="bank_transfer">Bank transfer</option>
              </select>
            </div>
            <button
              type="button"
              onClick={requestLocation}
              disabled={locLoading}
              className={`w-full rounded-lg border py-3 text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                lat !== null 
                  ? "border-teal-500/50 bg-teal-500/10 text-teal-300" 
                  : "border-slate-700 hover:border-teal-500 text-slate-400 hover:text-teal-400"
              }`}
            >
              {locLoading ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i>
                  Finding location...
                </>
              ) : (
                <>
                  <i className={`fa-solid ${lat !== null ? 'fa-location-dot' : 'fa-crosshairs'}`}></i>
                  {lat !== null ? "GPS Location Captured" : "Capture Location (Recommended)"}
                </>
              )}
            </button>
            {lat !== null && lon !== null && (
              <p className="text-[10px] text-center text-slate-500 uppercase tracking-widest">
                Lat: {lat.toFixed(4)} | Lon: {lon.toFixed(4)}
              </p>
            )}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex-1 rounded-lg border border-slate-600 py-2.5 text-slate-200 font-medium hover:bg-slate-800 transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={submit}
                className="flex-1 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 py-2.5 font-bold text-white shadow-lg shadow-emerald-500/30 disabled:opacity-60 active:scale-[0.98] transition-all"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <i className="fa-solid fa-circle-notch fa-spin"></i>
                    Verifying...
                  </span>
                ) : "Create My Account"}
              </button>
            </div>
          </div>
        )}

        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link to="/login" className="text-teal-400 font-bold hover:text-teal-300 transition-colors underline underline-offset-4">
            Sign in here
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
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  error?: string;
  placeholder?: string;
}) {
  return (
    <div className="w-full">
      <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-tight">{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        className={`w-full rounded-lg border bg-slate-950/60 px-3 py-2 text-white outline-none focus:ring-2 transition-all ${
          error 
            ? "border-red-500/50 focus:ring-red-500/50" 
            : "border-slate-700 focus:ring-teal-500/50"
        }`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {error && (
        <p className="text-[10px] font-bold text-red-400 mt-1 uppercase flex items-center gap-1">
          <i className="fa-solid fa-circle-exclamation"></i>
          {error}
        </p>
      )}
    </div>
  );
}
