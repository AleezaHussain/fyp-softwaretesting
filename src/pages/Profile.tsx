import React, { useState, useEffect } from "react";
import { Sidebar } from "../components/shared/Sidebar";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/store";
import { useThemeStore } from "../hooks/useTheme";
import {
  getUserSimulations,
  SimulationWithResults,
} from "../services/simulationService";
import {
  User as UserIcon,
  Mail,
  Lock,
  Save,
  AlertTriangle,
  Moon,
  Sun,
  ChevronRight,
  Database,
  FileJson,
  FileText,
  Archive,
  CheckCircle,
  Trash2,
} from "lucide-react";

const inp = (isDark: boolean) =>
  `w-full px-4 py-3 rounded-xl border transition-all outline-none ${
    isDark
      ? "bg-[#27304a] text-white border-[#3f4a68] focus:border-[#5ce1e5] focus:ring-2 focus:ring-[#5ce1e5]/20"
      : "bg-white text-gray-900 border-gray-300 focus:border-[#0ea5e9] focus:ring-2 focus:ring-[#0ea5e9]/20"
  }`;

const card = (isDark: boolean) =>
  `rounded-2xl p-6 border ${
    isDark ? "bg-[#1a1f3a] border-[#3f4a68]" : "bg-white border-gray-200"
  }`;

const TabProfile: React.FC<{ isDark: boolean }> = ({ isDark }) => {
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const [form, setForm] = useState({ name: user?.name || "" });
  const [saved, setSaved] = useState(false);

  const save = () => {
    updateUser(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className={card(isDark)}>
      <div className="flex items-center gap-3 mb-6">
        <div
          className={`p-2 rounded-xl ${isDark ? "bg-cyan-500/20" : "bg-cyan-100"}`}
        >
          <UserIcon
            className={`w-5 h-5 ${isDark ? "text-cyan-400" : "text-cyan-700"}`}
          />
        </div>
        <div>
          <div
            className={`font-bold ${isDark ? "text-white" : "text-gray-900"}`}
          >
            Profile Information
          </div>
          <div
            className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}
          >
            Update your personal details
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label
            className={`block text-sm font-medium mb-1.5 ${isDark ? "text-gray-300" : "text-gray-700"}`}
          >
            Full Name
          </label>
          <input
            className={inp(isDark)}
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          />
        </div>

        <div>
          <label
            className={`block text-sm font-medium mb-1.5 ${isDark ? "text-gray-300" : "text-gray-700"}`}
          >
            Email
          </label>
          <div
            className={`flex items-center gap-2 px-4 py-3 rounded-xl border ${
              isDark
                ? "bg-[#0a0e27] border-[#3f4a68] text-gray-400"
                : "bg-gray-50 border-gray-200 text-gray-500"
            }`}
          >
            <Mail className="w-4 h-4 shrink-0" />
            <span className="text-sm truncate">{user?.email}</span>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={save}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-all hover:scale-105 ${
            saved
              ? isDark
                ? "bg-green-500/20 text-green-400"
                : "bg-green-100 text-green-700"
              : isDark
                ? "bg-gradient-to-r from-[#5ce1e5] to-[#0ea5e9] text-white"
                : "bg-gradient-to-r from-[#0ea5e9] to-[#5ce1e5] text-white"
          }`}
        >
          {saved ? (
            <>
              <CheckCircle className="w-4 h-4" /> Saved
            </>
          ) : (
            <>
              <Save className="w-4 h-4" /> Save Changes
            </>
          )}
        </button>
      </div>
    </div>
  );
};

const TabPreferences: React.FC<{ isDark: boolean }> = ({ isDark }) => {
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const theme = user?.preferences?.theme ?? (isDark ? "dark" : "light");
  const notifications = user?.preferences?.notifications ?? false;

  const setTheme = (t: "light" | "dark") => {
    updateUser({ preferences: { theme: t, units: "metric", notifications } });
    if ((t === "dark") !== isDark) toggleTheme();
  };

  const row = `flex items-center justify-between p-4 rounded-xl border ${
    isDark ? "border-[#3f4a68]" : "border-gray-200"
  }`;

  return (
    <div className="space-y-4">
      <div className={card(isDark)}>
        <div
          className={`font-bold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}
        >
          Display
        </div>

        <div className="space-y-3">
          <div className={row}>
            <div className="flex items-center gap-3">
              {isDark ? (
                <Moon className="w-4 h-4 text-purple-400" />
              ) : (
                <Sun className="w-4 h-4 text-yellow-500" />
              )}
              <div>
                <div
                  className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}
                >
                  Theme
                </div>
                <div
                  className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}
                >
                  Current: {theme}
                </div>
              </div>
            </div>

            <div
              className={`flex p-1 rounded-lg gap-1 ${
                isDark ? "bg-[#0a0e27]" : "bg-gray-100"
              }`}
            >
              {(["light", "dark"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    theme === t
                      ? isDark
                        ? "bg-[#5ce1e5] text-white"
                        : "bg-[#0ea5e9] text-white"
                      : isDark
                        ? "text-gray-400 hover:text-white"
                        : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  {t === "light" ? (
                    <Sun className="w-3 h-3" />
                  ) : (
                    <Moon className="w-3 h-3" />
                  )}
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const TabSecurity: React.FC<{ isDark: boolean }> = ({ isDark }) => {
  const { logout } = useAuthStore();
  const navigate = useNavigate();

  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwStatus, setPwStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [pwError, setPwError] = useState("");

  const changePassword = async () => {
    setPwError("");
    if (!pw.current) {
      setPwError("Current password is required.");
      return;
    }
    if (pw.next.length < 8) {
      setPwError("New password must be at least 8 characters.");
      return;
    }
    if (pw.next !== pw.confirm) {
      setPwError("New passwords do not match.");
      return;
    }

    setPwStatus("loading");
    try {
      const { supabase: sb } = await import("../lib/supabase");
      const {
        data: { user: authUser },
      } = await sb.auth.getUser();
      if (!authUser?.email) throw new Error("Not authenticated");

      const { error: signInErr } = await sb.auth.signInWithPassword({
        email: authUser.email,
        password: pw.current,
      });
      if (signInErr) throw new Error("Current password is incorrect.");

      const { error: updateErr } = await sb.auth.updateUser({
        password: pw.next,
      });
      if (updateErr) throw new Error(updateErr.message);

      setPwStatus("success");
      setPw({ current: "", next: "", confirm: "" });
      setTimeout(() => setPwStatus("idle"), 3000);
    } catch (e: any) {
      setPwError(e.message || "Failed to update password.");
      setPwStatus("error");
    }
  };

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteStatus, setDeleteStatus] = useState<
    "idle" | "loading" | "error"
  >("idle");
  const [deleteError, setDeleteError] = useState("");
  const DELETE_PHRASE = "delete my account";

  const deleteAccount = async () => {
    if (deleteConfirm.toLowerCase() !== DELETE_PHRASE) return;
    setDeleteStatus("loading");
    setDeleteError("");

    try {
      const { supabase: sb } = await import("../lib/supabase");
      const {
        data: { user: authUser },
      } = await sb.auth.getUser();
      if (!authUser) throw new Error("Not authenticated");

      const { data: sims } = await sb
        .from("simulations")
        .select("id")
        .eq("user_id", authUser.id);

      if (sims?.length) {
        const simIds = sims.map((s: any) => s.id);
        await sb
          .from("simulation_results")
          .delete()
          .in("simulation_id", simIds);
        await sb.from("simulations").delete().eq("user_id", authUser.id);
      }

      await sb.from("user_activity").delete().eq("user_id", authUser.id);
      await sb
        .from("users")
        .update({ name: "[Deleted]", organization: null, role: null })
        .eq("auth_user_id", authUser.id);

      await sb.auth.signOut();
      logout();
      navigate("/login");
    } catch (e: any) {
      setDeleteError(
        e.message || "Failed to delete account. Please contact support.",
      );
      setDeleteStatus("error");
    }
  };

  return (
    <div className="space-y-4">
      <div className={card(isDark)}>
        <div className="flex items-center gap-3 mb-5">
          <div
            className={`p-2 rounded-xl ${
              isDark ? "bg-purple-500/20" : "bg-purple-100"
            }`}
          >
            <Lock
              className={`w-5 h-5 ${
                isDark ? "text-purple-400" : "text-purple-700"
              }`}
            />
          </div>
          <div
            className={`font-bold ${isDark ? "text-white" : "text-gray-900"}`}
          >
            Change Password
          </div>
        </div>

        <div className="space-y-3 mb-4">
          {[
            { label: "Current Password", key: "current" },
            { label: "New Password (min 8 chars)", key: "next" },
            { label: "Confirm New Password", key: "confirm" },
          ].map(({ label, key }) => (
            <div key={key}>
              <label
                className={`block text-sm font-medium mb-1.5 ${
                  isDark ? "text-gray-300" : "text-gray-700"
                }`}
              >
                {label}
              </label>
              <input
                type="password"
                className={inp(isDark)}
                value={(pw as any)[key]}
                onChange={(e) => {
                  setPw((p) => ({ ...p, [key]: e.target.value }));
                  setPwStatus("idle");
                  setPwError("");
                }}
              />
            </div>
          ))}
        </div>

        {pwError && (
          <div
            className={`flex items-center gap-2 p-3 rounded-xl text-sm mb-3 ${
              isDark
                ? "bg-red-500/10 border border-red-500/20 text-red-400"
                : "bg-red-50 border border-red-200 text-red-600"
            }`}
          >
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {pwError}
          </div>
        )}

        {pwStatus === "success" && (
          <div
            className={`flex items-center gap-2 p-3 rounded-xl text-sm mb-3 ${
              isDark
                ? "bg-green-500/10 border border-green-500/20 text-green-400"
                : "bg-green-50 border border-green-200 text-green-700"
            }`}
          >
            <CheckCircle className="w-4 h-4 shrink-0" />
            Password updated successfully.
          </div>
        )}

        <button
          onClick={changePassword}
          disabled={pwStatus === "loading"}
          className={`w-full py-2.5 rounded-xl font-semibold transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
            isDark
              ? "bg-gradient-to-r from-[#5ce1e5] to-[#0ea5e9] text-white"
              : "bg-gradient-to-r from-[#0ea5e9] to-[#5ce1e5] text-white"
          }`}
        >
          {pwStatus === "loading" ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Updating...
            </>
          ) : (
            "Update Password"
          )}
        </button>
      </div>

      <div
        className={`rounded-2xl p-6 border ${
          isDark
            ? "bg-red-900/10 border-red-800/30"
            : "bg-red-50 border-red-200"
        }`}
      >
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle
            className={`w-5 h-5 ${isDark ? "text-red-400" : "text-red-600"}`}
          />
          <div
            className={`font-bold ${isDark ? "text-red-400" : "text-red-700"}`}
          >
            Danger Zone
          </div>
        </div>

        <button
          onClick={() => {
            setShowDeleteModal(true);
            setDeleteConfirm("");
            setDeleteError("");
            setDeleteStatus("idle");
          }}
          className={`w-full flex items-center justify-between p-4 rounded-xl transition-all ${
            isDark
              ? "bg-[#27304a] text-red-400 hover:bg-red-500/10"
              : "bg-white text-red-600 hover:bg-red-50"
          }`}
        >
          <div className="flex items-center gap-3">
            <Trash2 className="w-4 h-4" />
            <div className="text-left">
              <div className="font-semibold text-sm">Delete Account</div>
              <div
                className={`text-xs ${
                  isDark ? "text-gray-400" : "text-gray-500"
                }`}
              >
                Permanently delete your account and all simulation data
              </div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div
            className={`w-full max-w-md rounded-2xl p-6 shadow-2xl border ${
              isDark
                ? "bg-[#1a1f3a] border-red-800/40"
                : "bg-white border-red-200"
            }`}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className={`p-2.5 rounded-xl ${
                  isDark ? "bg-red-500/20" : "bg-red-100"
                }`}
              >
                <Trash2
                  className={`w-5 h-5 ${
                    isDark ? "text-red-400" : "text-red-600"
                  }`}
                />
              </div>
              <div>
                <div
                  className={`font-bold text-lg ${
                    isDark ? "text-white" : "text-gray-900"
                  }`}
                >
                  Delete Account
                </div>
                <div
                  className={`text-xs ${
                    isDark ? "text-red-400" : "text-red-600"
                  }`}
                >
                  This action cannot be undone
                </div>
              </div>
            </div>

            <div
              className={`p-4 rounded-xl mb-4 text-sm ${
                isDark
                  ? "bg-red-500/10 border border-red-500/20 text-red-300"
                  : "bg-red-50 border border-red-200 text-red-700"
              }`}
            >
              <p className="font-semibold mb-2">
                You are about to permanently delete:
              </p>
              <ul className="space-y-1 text-xs list-disc list-inside">
                <li>Your account and profile</li>
                <li>All simulations and their results</li>
                <li>All activity history</li>
              </ul>
              <p className="mt-2 text-xs font-medium">
                This cannot be recovered.
              </p>
            </div>

            <div className="mb-4">
              <label
                className={`block text-sm font-medium mb-2 ${
                  isDark ? "text-gray-300" : "text-gray-700"
                }`}
              >
                Type{" "}
                <span
                  className={`font-mono font-bold ${
                    isDark ? "text-red-400" : "text-red-600"
                  }`}
                >
                  {DELETE_PHRASE}
                </span>{" "}
                to confirm:
              </label>
              <input
                type="text"
                value={deleteConfirm}
                onChange={(e) => {
                  setDeleteConfirm(e.target.value);
                  setDeleteError("");
                }}
                placeholder={DELETE_PHRASE}
                className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all ${
                  deleteConfirm.toLowerCase() === DELETE_PHRASE
                    ? isDark
                      ? "border-red-500 bg-red-500/10 text-red-300"
                      : "border-red-400 bg-red-50 text-red-700"
                    : isDark
                      ? "bg-[#27304a] text-white border-[#3f4a68] focus:border-red-500"
                      : "bg-white text-gray-900 border-gray-300 focus:border-red-400"
                }`}
              />
            </div>

            {deleteError && (
              <div
                className={`flex items-center gap-2 p-3 rounded-xl text-sm mb-4 ${
                  isDark
                    ? "bg-red-500/10 border border-red-500/20 text-red-400"
                    : "bg-red-50 border border-red-200 text-red-600"
                }`}
              >
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {deleteError}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleteStatus === "loading"}
                className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                  isDark
                    ? "bg-[#27304a] text-gray-300 hover:bg-[#3f4a68]"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Cancel
              </button>
              <button
                onClick={deleteAccount}
                disabled={
                  deleteConfirm.toLowerCase() !== DELETE_PHRASE ||
                  deleteStatus === "loading"
                }
                className="flex-1 py-2.5 rounded-xl font-semibold text-sm bg-red-600 text-white hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {deleteStatus === "loading" ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete Forever
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const TabDataExports: React.FC<{
  isDark: boolean;
  userId: string;
  userEmail: string;
}> = ({ isDark, userId, userEmail }) => {
  const [simulations, setSimulations] = useState<SimulationWithResults[]>([]);
  const [busy, setBusy] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!userId) return;
    getUserSimulations(userId).then((r) => {
      if (r.success && r.data) setSimulations(r.data.simulations || []);
    });
  }, [userId]);

  const completed = simulations.filter(
    (s) => s.status === "completed" && s.result?.result_data,
  );

  const setBusyKey = (k: string, v: boolean) =>
    setBusy((p) => ({ ...p, [k]: v }));

  const exportAllJson = () => {
    setBusyKey("json", true);
    try {
      const blob = new Blob(
        [
          JSON.stringify(
            {
              exported_at: new Date().toISOString(),
              user_email: userEmail,
              simulations,
            },
            null,
            2,
          ),
        ],
        { type: "application/json" },
      );
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `coolsim_all_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
    } finally {
      setBusyKey("json", false);
    }
  };

  const exportJsonZip = async () => {
    setBusyKey("jsonzip", true);
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      const folder = zip.folder("coolsim_json")!;

      simulations.forEach((s) => {
        const safe = s.name.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 50);
        folder.file(
          `${safe}_${s.id}.json`,
          JSON.stringify(
            {
              id: s.id,
              name: s.name,
              simulation_type: s.simulation_type,
              status: s.status,
              created_at: s.created_at,
              result: s.result ?? null,
            },
            null,
            2,
          ),
        );
      });

      const blob = await zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: { level: 6 },
      });

      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `coolsim_json_${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();

      const { logActivity } = await import("../services/activityService");
      const { supabase: sb } = await import("../lib/supabase");
      const {
        data: { user: au },
      } = await sb.auth.getUser();
      if (au) {
        await logActivity(au.id, "report_exported_zip", {
          metadata: { type: "json", count: simulations.length },
        });
      }
    } finally {
      setBusyKey("jsonzip", false);
    }
  };

  const exportPdfZip = async () => {
    if (!completed.length) return;

    setBusyKey("pdfzip", true);
    try {
      const JSZip = (await import("jszip")).default;
      const jsPDF = (await import("jspdf")).default;
      const autoTable = (await import("jspdf-autotable")).default;
      const zip = new JSZip();
      const folder = zip.folder("coolsim_reports")!;

      for (const sim of completed) {
        if (!sim.result) continue;

        const doc = new jsPDF({
          orientation: "portrait",
          unit: "mm",
          format: "a4",
        });

        const rd = sim.result.result_data ?? {};
        const metrics = rd?.results?.metrics ?? {};
        const annual = rd?.results?.annual ?? rd?.summary ?? {};
        const econ = rd?.results?.economics ?? {};

        doc.setFillColor(26, 31, 58);
        doc.rect(0, 0, 210, 297, "F");
        doc.setFillColor(92, 225, 229);
        doc.rect(0, 0, 6, 297, "F");
        doc.setFontSize(22);
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.text("CoolSim Technical Report", 20, 50);
        doc.setFontSize(14);
        doc.setTextColor(92, 225, 229);
        doc.text(sim.name, 20, 65);
        doc.setFontSize(10);
        doc.setTextColor(200, 210, 230);
        doc.setFont("helvetica", "normal");
        doc.text(`Type: ${sim.simulation_type?.toUpperCase()}`, 20, 80);
        doc.text(
          `Completed: ${sim.result.completed_at ? new Date(sim.result.completed_at).toLocaleString() : "-"}`,
          20,
          88,
        );
        doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 96);

        doc.addPage();
        doc.setFillColor(26, 31, 58);
        doc.rect(0, 0, 210, 297, "F");
        doc.setFontSize(14);
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.text("Performance Metrics", 14, 20);

        const rows: [string, string][] = [
          ["PUE", String(metrics.pue ?? rd?.summary?.averagePUE ?? "-")],
          ["COP", String(metrics.averageCOP ?? rd?.summary?.averageCOP ?? "-")],
          ["WUE (L/kWh)", String(metrics.wue ?? "-")],
          [
            "Total Energy (kWh)",
            String(
              annual.energyConsumption_kWh ??
                rd?.summary?.totalEnergy_kWh ??
                "-",
            ),
          ],
          [
            "Carbon (kg)",
            String(
              annual.carbonEmissions_kg ??
                rd?.summary?.totalCarbonEmissions_kg ??
                "-",
            ),
          ],
          [
            "Annual Cost (USD)",
            String(
              annual.cost_USD ??
                econ.opex_annual_USD ??
                rd?.summary?.annualOpExUSD ??
                "-",
            ),
          ],
          ["NPV (USD)", String(econ.npv_USD ?? "-")],
          [
            "Payback (yrs)",
            String(
              econ.paybackPeriod_years ??
                rd?.summary?.paybackPeriodYears ??
                "-",
            ),
          ],
          [
            "Energy Consumed",
            `${sim.result.energy_consumed_kwh?.toFixed(2) ?? "-"} kWh`,
          ],
          [
            "Cost Savings",
            `${sim.result.cost_saving_percent?.toFixed(1) ?? "-"}%`,
          ],
        ].filter(([, v]) => v !== "-") as [string, string][];

        autoTable(doc, {
          startY: 28,
          head: [["Metric", "Value"]],
          body: rows,
          theme: "grid",
          margin: { left: 14, right: 14 },
          styles: { fontSize: 9, cellPadding: 2.5, textColor: [220, 230, 245] },
          headStyles: {
            fillColor: [63, 74, 104],
            textColor: [255, 255, 255],
            fontStyle: "bold",
          },
          alternateRowStyles: { fillColor: [20, 25, 50] },
          tableLineColor: [63, 74, 104],
          tableLineWidth: 0.3,
        });

        const mlRec = rd?.mlRecommendation;
        if (mlRec?.model_recommendation) {
          const y = (doc as any).lastAutoTable.finalY + 10;
          doc.setFontSize(12);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(92, 225, 229);
          doc.text("ML Recommendation", 14, y);
          doc.setFontSize(10);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(220, 230, 245);
          doc.text(`Recommended: ${mlRec.model_recommendation}`, 14, y + 8);

          if (mlRec.why_this_is_recommended?.length) {
            const why = doc.splitTextToSize(
              mlRec.why_this_is_recommended.join(" "),
              182,
            );
            doc.text(why, 14, y + 16);
          }
        }

        const safe = sim.name.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 50);
        folder.file(`${safe}_${sim.id}.pdf`, doc.output("arraybuffer"));
      }

      const blob = await zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: { level: 6 },
      });

      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `coolsim_reports_${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();

      const { logActivity } = await import("../services/activityService");
      const { supabase: sb } = await import("../lib/supabase");
      const {
        data: { user: au },
      } = await sb.auth.getUser();
      if (au) {
        await logActivity(au.id, "report_exported_zip", {
          metadata: { type: "pdf", count: completed.length },
        });
      }
    } finally {
      setBusyKey("pdfzip", false);
    }
  };

  const btn =
    "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div className="space-y-4">
      <div className={card(isDark)}>
        <div className="flex items-center gap-3 mb-5">
          <div
            className={`p-2 rounded-xl ${
              isDark ? "bg-blue-500/20" : "bg-blue-100"
            }`}
          >
            <Database
              className={`w-5 h-5 ${
                isDark ? "text-blue-400" : "text-blue-700"
              }`}
            />
          </div>
          <div>
            <div
              className={`font-bold ${isDark ? "text-white" : "text-gray-900"}`}
            >
              Export All Data
            </div>
            <div
              className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}
            >
              {simulations.length} simulations · {completed.length} with results
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={exportAllJson}
            disabled={busy.json || !simulations.length}
            className={`${btn} ${
              isDark
                ? "bg-[#27304a] text-gray-300 hover:bg-[#3f4a68] hover:text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <FileJson className="w-4 h-4 text-yellow-500" />
            {busy.json ? "Exporting..." : "All Data (JSON)"}
          </button>

          <button
            onClick={exportJsonZip}
            disabled={busy.jsonzip || !simulations.length}
            className={`${btn} ${
              isDark
                ? "bg-[#27304a] text-gray-300 hover:bg-[#3f4a68] hover:text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <Archive className="w-4 h-4 text-orange-500" />
            {busy.jsonzip ? "Zipping..." : `JSONs ZIP (${simulations.length})`}
          </button>

          <button
            onClick={exportPdfZip}
            disabled={busy.pdfzip || !completed.length}
            className={`${btn} ${
              isDark
                ? "bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30"
                : "bg-cyan-100 text-cyan-700 hover:bg-cyan-200"
            }`}
          >
            <FileText className="w-4 h-4" />
            {busy.pdfzip ? "Building ZIP..." : `PDFs ZIP (${completed.length})`}
          </button>
        </div>

        {(busy.pdfzip || busy.jsonzip) && (
          <div
            className={`mt-3 flex items-center gap-2 text-xs ${
              isDark ? "text-gray-400" : "text-gray-500"
            }`}
          >
            <div className="w-3 h-3 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            Building ZIP archive. This may take a moment for large datasets...
          </div>
        )}
      </div>
    </div>
  );
};

export const Profile: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const isDark = useThemeStore((s) => s.isDark);

  return (
    <div className={`min-h-screen ${isDark ? "bg-[#0a0e27]" : "bg-gray-50"}`}>
      <Sidebar />
      <main className="lg:ml-56 p-6">
        <div className="mb-8">
          <h1
            className={`text-3xl font-bold mb-1 ${
              isDark ? "text-white" : "text-gray-900"
            }`}
          >
            Account{" "}
            <span className={isDark ? "text-[#5ce1e5]" : "text-[#0ea5e9]"}>
              Settings
            </span>
          </h1>
          <p
            className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}
          >
            Manage your profile, preferences, security, and data exports in one
            place.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="space-y-4">
            <div
              className={`rounded-2xl p-6 text-center border ${
                isDark
                  ? "bg-[#1a1f3a] border-[#3f4a68]"
                  : "bg-white border-gray-200"
              }`}
            >
              <div
                className={`w-20 h-20 rounded-full mx-auto mb-3 flex items-center justify-center ${
                  isDark
                    ? "bg-gradient-to-br from-[#5ce1e5] to-[#8b5cf6]"
                    : "bg-gradient-to-br from-[#0ea5e9] to-[#5ce1e5]"
                }`}
              >
                {user?.profilePicture ? (
                  <img
                    src={user.profilePicture}
                    alt=""
                    className="w-20 h-20 rounded-full object-cover"
                  />
                ) : (
                  <UserIcon className="w-10 h-10 text-white" />
                )}
              </div>
              <div
                className={`font-bold text-lg ${
                  isDark ? "text-white" : "text-gray-900"
                }`}
              >
                {user?.name || "User"}
              </div>
              <div
                className={`text-xs mt-0.5 truncate ${
                  isDark ? "text-gray-400" : "text-gray-500"
                }`}
              >
                {user?.email}
              </div>
            </div>
          </div>

          <div className="lg:col-span-3 space-y-6">
            <TabProfile isDark={isDark} />
            <TabPreferences isDark={isDark} />
            <TabSecurity isDark={isDark} />
            <TabDataExports
              isDark={isDark}
              userId={user?.id ?? ""}
              userEmail={user?.email ?? ""}
            />
          </div>
        </div>
      </main>
    </div>
  );
};
