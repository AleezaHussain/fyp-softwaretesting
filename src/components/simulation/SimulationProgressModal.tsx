import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSimulationStore } from "../../store/store";
import { useThemeStore } from "../../hooks/useTheme";
import { Loader2, CheckCircle, XCircle, BanIcon, Bell } from "lucide-react";

// Status label + colour mapping
const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  running:    { label: "Running",   color: "#5ce1e5", bg: "bg-blue-500/20"   },
  pending:    { label: "Pending",   color: "#f59e0b", bg: "bg-yellow-500/20" },
  completed:  { label: "Completed", color: "#10b981", bg: "bg-green-500/20"  },
  failed:     { label: "Failed",    color: "#ef4444", bg: "bg-red-500/20"    },
  cancelled:  { label: "Cancelled", color: "#f59e0b", bg: "bg-yellow-500/20" },
  canceled:   { label: "Cancelled", color: "#f59e0b", bg: "bg-yellow-500/20" },
};

export const SimulationProgressModal: React.FC = () => {
  const navigate = useNavigate();
  const [minimized, setMinimized] = useState(false);
  const [completionToast, setCompletionToast] = useState<{ msg: string; type: "success" | "error"; simId?: number } | null>(null);

  const isSimulationRunning = useSimulationStore((s) => s.isSimulationRunning);
  const simulationProgress  = useSimulationStore((s) => s.simulationProgress);
  const simulationStatus    = useSimulationStore((s) => s.simulationStatus);
  const simulationFailureReason = useSimulationStore((s) => (s as any).simulationFailureReason as string | null);
  const isDark              = useThemeStore((s) => s.isDark);
  const setSimulationRunning = useSimulationStore((s) => s.setSimulationRunning);
  const setSimulationStatus  = useSimulationStore((s) => s.setSimulationStatus);
  const cancelSimulation     = useSimulationStore((s) => s.cancelSimulation);
  const currentSimulation    = useSimulationStore((s) => s.currentSimulation);

  const [cancelConfirm, setCancelConfirm] = useState(false);

  const handleCancel = useCallback(() => {
    if (!cancelConfirm) {
      setCancelConfirm(true);
      // Auto-reset confirm state after 4 seconds if not clicked again
      setTimeout(() => setCancelConfirm(false), 4000);
      return;
    }
    setCancelConfirm(false);
    const simId = currentSimulation?.id ? Number(currentSimulation.id) : null;
    if (simId) {
      cancelSimulation(simId);
    } else {
      // No simulation ID yet — just abort and reset state
      if ((useSimulationStore.getState() as any)._abortController) {
        (useSimulationStore.getState() as any)._abortController.abort();
      }
      setSimulationStatus("canceled");
      setSimulationRunning(false);
    }
  }, [cancelConfirm, cancelSimulation, currentSimulation, setSimulationStatus, setSimulationRunning]);

  // Listen for background completion/failure events (when modal is minimized)
  useEffect(() => {
    const onComplete = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setCompletionToast({
        msg: `Simulation "${detail.name}" completed successfully. Click to view results.`,
        type: "success",
        simId: detail.simulationId,
      });
      setTimeout(() => setCompletionToast(null), 10000);
    };
    const onFailed = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setCompletionToast({
        msg: `Simulation "${detail.name}" failed: ${detail.reason}`,
        type: "error",
      });
      setTimeout(() => setCompletionToast(null), 8000);
    };
    window.addEventListener("simulation-completed", onComplete);
    window.addEventListener("simulation-failed", onFailed);
    return () => {
      window.removeEventListener("simulation-completed", onComplete);
      window.removeEventListener("simulation-failed", onFailed);
    };
  }, []);

  const statusKey = simulationStatus?.toLowerCase() ?? "";
  const isComplete  = simulationProgress === 100 || statusKey === "completed";
  const isFailed    = statusKey.startsWith("failed");
  const isCanceled  = statusKey === "canceled" || statusKey === "cancelled";

  // Derive current status label for the badge
  const currentStatusKey = isFailed ? "failed" : isCanceled ? "cancelled" : isComplete ? "completed" : "running";
  const statusMeta = STATUS_META[currentStatusKey];

  // Toast notification (shown even when modal is hidden/minimized)
  const Toast = completionToast && (
    <div
      className={`fixed bottom-6 right-6 z-[60] flex items-start gap-3 px-4 py-3 rounded-xl shadow-2xl border max-w-sm transition-all ${
        completionToast.type === "success"
          ? isDark ? "bg-green-900/90 border-green-700 text-green-200" : "bg-green-50 border-green-300 text-green-800"
          : isDark ? "bg-red-900/90 border-red-700 text-red-200" : "bg-red-50 border-red-300 text-red-800"
      }`}
    >
      <Bell className="w-4 h-4 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm leading-snug">{completionToast.msg}</p>
        {completionToast.simId && (
          <button
            onClick={() => {
              setCompletionToast(null);
              useSimulationStore.getState().setSimulationRunning(false);
              navigate(`/simulation/${completionToast.simId}`);
            }}
            className={`mt-1.5 text-xs font-semibold underline underline-offset-2 ${
              isDark ? "text-green-300 hover:text-green-100" : "text-green-700 hover:text-green-900"
            }`}
          >
            View Results →
          </button>
        )}
      </div>
      <button onClick={() => setCompletionToast(null)} className="ml-auto text-lg leading-none opacity-60 hover:opacity-100 shrink-0">×</button>
    </div>
  );

  // Nothing to show and no toast
  if ((!isSimulationRunning && simulationProgress === 0) && !completionToast) return null;

  // Minimized — only show toast
  if (minimized) return <>{Toast}</>;

  // Nothing running but toast exists
  if (!isSimulationRunning && simulationProgress === 0) return <>{Toast}</>;

  return (
    <>
      {Toast}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div
          className={`relative w-full max-w-md mx-4 rounded-2xl shadow-2xl overflow-hidden ${
            isDark
              ? "bg-gradient-to-b from-[#1a1f3a] to-[#27304a] border-2 border-[#3f4a68]"
              : "bg-gradient-to-b from-white to-gray-50 border-2 border-gray-200"
          }`}
        >
          {/* Minimize (×) button */}
          <button
            onClick={() => setMinimized(true)}
            className={`absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
              isDark ? "hover:bg-white/10 text-white" : "hover:bg-gray-100 text-gray-600"
            }`}
            title="Minimize — you'll get a notification when done"
          >
            <span className="text-xl font-bold leading-none">×</span>
          </button>

          {/* Header */}
          <div className={`p-6 border-b ${isDark ? "border-[#3f4a68]" : "border-gray-200"}`}>
            <div className="flex items-center justify-center gap-3">
              <h3 className={`text-2xl font-bold text-center ${isDark ? "text-white" : "text-gray-900"}`}>
                {isFailed ? <span className="text-red-500">Simulation Failed</span>
                  : isCanceled ? <span className="text-yellow-500">Simulation Cancelled</span>
                  : isComplete ? <span className="text-green-500">Simulation Complete!</span>
                  : <><span style={{ color: statusMeta.color }}>Running</span> Simulation</>}
              </h3>
              
            </div>
            {/* Minimise hint */}
            {!isComplete && !isFailed && !isCanceled && (
              <p className={`text-xs text-center mt-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
              </p>
            )}
          </div>

          {/* Body */}
          <div className="p-8 pb-16">
            {/* Icon */}
            <div className="flex justify-center mb-6">
              {isFailed ? (
                <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center">
                  <XCircle className="w-12 h-12 text-red-500" />
                </div>
              ) : isCanceled ? (
                <div className="w-20 h-20 rounded-full bg-yellow-500/20 flex items-center justify-center">
                  <BanIcon className="w-12 h-12 text-yellow-500" />
                </div>
              ) : isComplete ? (
                <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center">
                  <CheckCircle className="w-12 h-12 text-green-500" />
                </div>
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-r from-[#5ce1e5]/20 to-[#0ea5e9]/20 flex items-center justify-center">
                  <Loader2 className="w-12 h-12 text-[#5ce1e5] animate-spin" />
                </div>
              )}
            </div>

            {/* Status text */}
            <p className={`text-center mb-2 text-lg font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`}>
              {isCanceled ? "Simulation was cancelled."
                : isFailed ? "Simulation encountered an error."
                : simulationStatus || "Processing..."}
            </p>

            {/* Failure reason */}
            {isFailed && simulationFailureReason && (
              <div className={`mt-2 mb-4 px-4 py-3 rounded-xl text-sm border ${
                isDark ? "bg-red-500/10 border-red-500/30 text-red-300" : "bg-red-50 border-red-200 text-red-700"
              }`}>
                <p className="font-semibold mb-1">Reason:</p>
                <p className="leading-relaxed">{simulationFailureReason}</p>
              </div>
            )}

            {/* Progress bar */}
            <div className="mb-4">
              <div className={`w-full h-3 rounded-full overflow-hidden ${isDark ? "bg-gray-700" : "bg-gray-200"}`}>
                <div
                  className={`h-full transition-all duration-500 ease-out ${
                    isFailed ? "bg-red-500"
                      : isCanceled ? "bg-yellow-500"
                      : isComplete ? "bg-green-500"
                      : "bg-gradient-to-r from-[#5ce1e5] to-[#0ea5e9]"
                  }`}
                  style={{ width: `${simulationProgress}%` }}
                >
                  {!isFailed && !isComplete && !isCanceled && (
                    <div className="w-full h-full relative overflow-hidden">
                      <div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                        style={{ animation: "shimmer 2s infinite", transform: "translateX(-100%)" }}
                      />
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-between mt-2">
                <span className={`text-sm font-bold ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  {simulationProgress}%
                </span>
                <span className={`text-sm font-semibold`} style={{ color: statusMeta.color }}>
                  {statusMeta.label}
                </span>
              </div>
            </div>

            {/* Steps */}
            {!isFailed && !isCanceled && (
              <div className="space-y-2 mt-6">
                <ProgressStep label="Creating simulation record"  isComplete={simulationProgress >= 10} isActive={simulationProgress >= 0  && simulationProgress < 20} />
                <ProgressStep label="Starting simulation"         isComplete={simulationProgress >= 20} isActive={simulationProgress >= 10 && simulationProgress < 30} />
                <ProgressStep label="Running simulation"          isComplete={simulationProgress >= 90} isActive={simulationProgress >= 20 && simulationProgress < 90} />
                <ProgressStep label="Saving results"              isComplete={simulationProgress === 100} isActive={simulationProgress >= 90 && simulationProgress < 100} />
              </div>
            )}
          </div>

          {/* Cancel button — two-step confirmation */}
          {!isComplete && !isFailed && !isCanceled && (
            <div className="absolute bottom-4 right-4 flex items-center gap-2">
              {cancelConfirm && (
                <span className={`text-xs font-medium ${isDark ? "text-yellow-400" : "text-yellow-600"}`}>
                  Click again to confirm
                </span>
              )}
              <button
                onClick={handleCancel}
                className={`px-6 py-2 rounded-lg font-bold transition-all duration-300 hover:scale-105 ${
                  cancelConfirm
                    ? "bg-red-600 text-white animate-pulse"
                    : isDark ? "bg-[#fd5757] text-white hover:bg-[#fd5757]/80" : "bg-red-500 text-white hover:bg-red-600"
                }`}
              >
                {cancelConfirm ? "Confirm Cancel" : "Cancel"}
              </button>
            </div>
          )}

          {/* Close button when done/failed/cancelled */}
          {(isComplete || isFailed || isCanceled) && (
            <div className="absolute bottom-4 right-4 flex gap-2">
              {isComplete && currentSimulation?.id && (
                <button
                  onClick={() => {
                    useSimulationStore.getState().setSimulationRunning(false);
                    navigate(`/simulation/${currentSimulation.id}`);
                  }}
                  className={`px-6 py-2 rounded-lg font-bold transition-all hover:scale-105 ${
                    isDark
                      ? "bg-gradient-to-r from-[#5ce1e5] to-[#0ea5e9] text-white"
                      : "bg-gradient-to-r from-[#0ea5e9] to-[#5ce1e5] text-white"
                  }`}
                >
                  View Results
                </button>
              )}
              <button
                onClick={() => { setMinimized(true); useSimulationStore.getState().setSimulationRunning(false); }}
                className={`px-6 py-2 rounded-lg font-bold transition-all hover:scale-105 ${
                  isDark ? "bg-[#27304a] text-white hover:bg-[#3f4a68]" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Close
              </button>
            </div>
          )}

          <style>{`
            @keyframes shimmer { 100% { transform: translateX(100%); } }
          `}</style>
        </div>
      </div>
    </>
  );
};

const ProgressStep: React.FC<{ label: string; isComplete: boolean; isActive: boolean }> = ({ label, isComplete, isActive }) => {
  const isDark = useThemeStore((s) => s.isDark);
  return (
    <div className="flex items-center gap-3">
      <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
        isComplete ? "bg-green-500" : isActive ? isDark ? "bg-[#5ce1e5]" : "bg-[#0ea5e9]" : isDark ? "bg-gray-700" : "bg-gray-200"
      }`}>
        {isComplete && <CheckCircle className="w-3 h-3 text-white" />}
        {isActive && !isComplete && <div className="w-2 h-2 bg-white rounded-full animate-pulse" />}
      </div>
      <span className={`text-sm ${
        isComplete || isActive
          ? isDark ? "text-white font-medium" : "text-gray-900 font-medium"
          : isDark ? "text-gray-500" : "text-gray-400"
      }`}>
        {label}
      </span>
    </div>
  );
};
