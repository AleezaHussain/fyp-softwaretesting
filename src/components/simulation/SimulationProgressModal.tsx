import React from "react";
import { useCallback } from "react";
import { useSimulationStore } from "../../store/store";
import { useThemeStore } from "../../hooks/useTheme";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

export const SimulationProgressModal: React.FC = () => {
  const [minimized, setMinimized] = React.useState(false);
  const isSimulationRunning = useSimulationStore(
    (state) => state.isSimulationRunning,
  );
  const simulationProgress = useSimulationStore(
    (state) => state.simulationProgress,
  );
  const simulationStatus = useSimulationStore(
    (state) => state.simulationStatus,
  );
  const isDark = useThemeStore((state) => state.isDark);
  const setSimulationRunning = useSimulationStore(
    (state) => state.setSimulationRunning,
  );
  const setSimulationStatus = useSimulationStore(
    (state) => state.setSimulationStatus,
  );
  // Cancel handler: sets status to canceled and stops simulation, updates DB
  const cancelSimulation = useSimulationStore(
    (state) => state.cancelSimulation,
  );
  const currentSimulation = useSimulationStore(
    (state) => state.currentSimulation,
  );
  const handleCancel = useCallback(() => {
    if (currentSimulation?.id) {
      cancelSimulation(Number(currentSimulation.id));
    } else {
      setSimulationStatus("canceled");
      setSimulationRunning(false);
    }
  }, [
    cancelSimulation,
    currentSimulation,
    setSimulationStatus,
    setSimulationRunning,
  ]);

  if ((!isSimulationRunning && simulationProgress === 0) || minimized)
    return null;

  const isComplete = simulationProgress === 100;
  const isFailed = simulationStatus === "Failed";
  const isCanceled = simulationStatus === "canceled";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div
        className={`relative w-full max-w-md mx-4 rounded-2xl shadow-2xl overflow-hidden ${
          isDark
            ? "bg-gradient-to-b from-[#1a1f3a] to-[#27304a] border-2 border-[#3f4a68]"
            : "bg-gradient-to-b from-white to-gray-50 border-2 border-gray-200"
        }`}
      >
        {/* X (minimize) button */}
        <button
          onClick={() => setMinimized(true)}
          className="absolute top-4 right-4 z-10 p-3  hover:bg-gray-100 dark:hover:bg-gray-100 focus:outline-none"
          title="Minimize"
        >
          <span
            style={{
              fontSize: 20,
              fontWeight: "bold",
              color: isDark ? "#fff" : "#333",
            }}
          >
            ×
          </span>
        </button>

        {/* Header */}
        <div
          className={`p-6 border-b ${isDark ? "border-[#3f4a68]" : "border-gray-200"}`}
        >
          <h3
            className={`text-2xl font-bold text-center ${
              isDark ? "text-white" : "text-gray-900"
            }`}
          >
            {isFailed ? (
              <span className="text-red-500">Simulation Failed</span>
            ) : isCanceled ? (
              <span className="text-yellow-500">Simulation Canceled</span>
            ) : isComplete ? (
              <span className="text-green-500">Simulation Complete!</span>
            ) : (
              <>
                <span className={isDark ? "text-[#5ce1e5]" : "text-[#0ea5e9]"}>
                  Running
                </span>{" "}
                Simulation
              </>
            )}
          </h3>
        </div>

        {/* Progress Content */}
        <div className="p-8 pb-16">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            {isFailed ? (
              <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center">
                <XCircle className="w-12 h-12 text-red-500" />
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

          {/* Status Text */}
          <p
            className={`text-center mb-6 text-lg font-medium ${
              isDark ? "text-gray-300" : "text-gray-700"
            }`}
          >
            {isCanceled
              ? "Simulation was canceled by user."
              : simulationStatus || "Processing..."}
          </p>

          {/* Progress Bar */}
          <div className="mb-4">
            <div
              className={`w-full h-3 rounded-full overflow-hidden ${
                isDark ? "bg-gray-700" : "bg-gray-200"
              }`}
            >
              <div
                className={`h-full transition-all duration-500 ease-out ${
                  isFailed
                    ? "bg-red-500"
                    : isComplete
                      ? "bg-green-500"
                      : "bg-gradient-to-r from-[#5ce1e5] to-[#0ea5e9]"
                }`}
                style={{ width: `${simulationProgress}%` }}
              >
                {!isFailed && !isComplete && (
                  <div className="w-full h-full relative overflow-hidden">
                    <div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                      style={{
                        animation: "shimmer 2s infinite",
                        transform: "translateX(-100%)",
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-between mt-2">
              <span
                className={`text-sm font-bold ${
                  isDark ? "text-gray-400" : "text-gray-600"
                }`}
              >
                {simulationProgress}%
              </span>
              <span
                className={`text-sm ${
                  isDark ? "text-gray-500" : "text-gray-500"
                }`}
              >
                {isComplete ? "Done" : isFailed ? "Error" : "In Progress"}
              </span>
            </div>
          </div>

          {/* Steps Indicator */}
          {!isFailed && (
            <div className="space-y-2 mt-6">
              <ProgressStep
                label="Creating simulation record"
                isComplete={simulationProgress >= 10}
                isActive={simulationProgress >= 0 && simulationProgress < 20}
              />
              <ProgressStep
                label="Starting simulation"
                isComplete={simulationProgress >= 20}
                isActive={simulationProgress >= 10 && simulationProgress < 30}
              />
              <ProgressStep
                label="Running simulation"
                isComplete={simulationProgress >= 90}
                isActive={simulationProgress >= 20 && simulationProgress < 90}
              />
              <ProgressStep
                label="Saving results"
                isComplete={simulationProgress === 100}
                isActive={simulationProgress >= 90 && simulationProgress < 100}
              />
            </div>
          )}
        </div>

        {/* Cancel Button (bottom right, only show while running and not complete/failed/canceled) */}
        {!isComplete && !isFailed && !isCanceled && (
          <div className="absolute bottom-4 right-4">
            <button
              onClick={handleCancel}
              className={`px-6 py-2 rounded-lg font-bold transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 ${
                isDark
                  ? "bg-[#fd5757] text-white hover:bg-[#fd5757]/80"
                  : "bg-red-500 text-white hover:bg-red-600"
              }`}
            >
              Cancel
            </button>
          </div>
        )}

        <style>{`
          @keyframes shimmer {
            100% {
              transform: translateX(100%);
            }
          }
        `}</style>
      </div>
    </div>
  );
};

const ProgressStep: React.FC<{
  label: string;
  isComplete: boolean;
  isActive: boolean;
}> = ({ label, isComplete, isActive }) => {
  const isDark = useThemeStore((state) => state.isDark);

  return (
    <div className="flex items-center gap-3">
      <div
        className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
          isComplete
            ? "bg-green-500"
            : isActive
              ? isDark
                ? "bg-[#5ce1e5]"
                : "bg-[#0ea5e9]"
              : isDark
                ? "bg-gray-700"
                : "bg-gray-200"
        }`}
      >
        {isComplete && <CheckCircle className="w-3 h-3 text-white" />}
        {isActive && !isComplete && (
          <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
        )}
      </div>
      <span
        className={`text-sm ${
          isComplete || isActive
            ? isDark
              ? "text-white font-medium"
              : "text-gray-900 font-medium"
            : isDark
              ? "text-gray-500"
              : "text-gray-400"
        }`}
      >
        {label}
      </span>
    </div>
  );
};
