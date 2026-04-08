import { useState, useEffect, useRef } from "react";
import { supabase } from "../utils/supabaseClient";
import { Modal } from "../components/shared/Common";
import { getCurrentAuthUser, getUserUUID } from "../services/simulationService";
import { getUserSimulations } from "../services/simulationService";
import { useSearchParams } from "react-router-dom";
import { Sidebar } from "../components/shared/Sidebar";
import {
  Sliders,
  Loader,
  Zap,
  TrendingDown,
  AlertTriangle,
  Sparkles,
  Send,
  Bot,
  Database,
} from "lucide-react";

interface ChatHistoryItem {
  id: string;
  question: string;
  answer: string;
  llm_answer: string;
  rf_result: any;
  imageUrl: string | null;
  graphUrl: string | null;
  loading: boolean;
  timestamp: Date;
  metadata?: any;
}

interface StreamingChunk {
  type: string;
  content: any;
}

const WHATIF_API_BASE = (
  (import.meta as any).env?.VITE_WHATIF_API_URL || "http://localhost:8000/api"
).replace(/\/$/, "");

const clampValue = (value: number, min: number, max: number): number => {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
};

const formatNumber = (value: any, digits = 1) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue.toFixed(digits) : "N/A";
};

const formatCurrency = (value: any, digits = 2) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue)
    ? `$${numericValue.toFixed(digits)}`
    : "N/A";
};

const cleanAdvisoryText = (text: string) => {
  if (!text) return "";

  let cleaned = text
    .replace(/\*\*/g, "")
    .replace(/__+/g, "")
    .replace(/^\s*raw\s+/i, "")
    .replace(/\s+\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ");

  cleaned = cleaned.replace(
    /\b([A-Za-z][A-Za-z0-9'\-]*)\b(?:\s+\1\b)+/gi,
    "$1",
  );
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");

  return cleaned.trim();
};

const getAdvisoryBullets = (text: string) =>
  cleanAdvisoryText(text)
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("-") || line.startsWith("•"))
    .map((line) => line.replace(/^[-•]\s*/, ""));

const getAdvisorySections = (text: string) => {
  const cleaned = cleanAdvisoryText(text);
  const paragraphs = cleaned
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);

  const sectionOrder = [
    "Direct Answer",
    "Impact",
    "Technical Analysis",
    "Recommended Actions",
    "Trade-offs",
    "What this means",
    "Key Factors",
    "Recommendations",
    "Next Steps",
  ];

  const sections: Array<{ title: string; items: string[] }> = [];

  for (const title of sectionOrder) {
    const pattern = new RegExp(
      `${title}:?\\s*([\\s\\S]*?)(?=\\n\\n[A-Z][A-Za-z ]+:|$)`,
      "i",
    );
    const match = cleaned.match(pattern);
    if (match?.[1]) {
      const body = match[1]
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => line.replace(/^[-•\d.]+\s*/, ""));

      if (body.length > 0) {
        sections.push({ title, items: body });
      }
    }
  }

  if (sections.length > 0) {
    return sections;
  }

  const bullets = getAdvisoryBullets(cleaned);
  if (bullets.length > 0) {
    return [{ title: "Key Points", items: bullets }];
  }

  return [
    {
      title: "Advisory",
      items: paragraphs.length > 0 ? paragraphs : [cleaned],
    },
  ];
};

const getRfSummary = (rfResult: any) => {
  if (!rfResult) return null;

  const metrics = rfResult.metrics || {};
  const recommendations = Array.isArray(metrics.recommendations)
    ? metrics.recommendations.filter(Boolean)
    : [];

  return {
    predictedPower: formatNumber(rfResult.predicted_power_kw, 1),
    efficiency: formatNumber(rfResult.efficiency_percent, 1),
    costPerHour: formatCurrency(rfResult.cost_usd_per_hour, 2),
    wue: formatNumber(rfResult.wue_l_per_kwh, 2),
    pue: formatNumber(metrics.pue, 2),
    coolingEfficiency: formatNumber(metrics.cooling_efficiency, 0),
    totalPower: formatNumber(metrics.total_power_kw, 1),
    coolingPower: formatNumber(metrics.cooling_power_kw, 1),
    hourlyCost: formatCurrency(metrics.hourly_cost, 2),
    dailyCost: formatCurrency(metrics.daily_cost, 2),
    monthlyCost: formatCurrency(metrics.monthly_cost, 2),
    hourlyCo2: formatNumber(metrics.hourly_co2, 1),
    waterUsage: formatNumber(metrics.water_usage_l_per_hour, 1),
    recommendations,
  };
};

const persistChatHistory = async (params: {
  question: string;
  scenario: Record<string, any>;
  model: string;
  outputText: string;
  outputLlm: string;
  outputRf: any;
  outputImageUrl: string | null;
  outputGraphUrl: string | null;
}) => {
  const authUser = await getCurrentAuthUser();
  if (!authUser) {
    throw new Error("You must be logged in to save chat history.");
  }

  const userId = await getUserUUID(authUser.id);
  if (!userId) {
    throw new Error("User profile ID not found for chat history save.");
  }

  const chatLog = {
    user_id: userId,
    input_question: params.question,
    input_scenario: params.scenario,
    model_used: params.model,
    output_text: params.outputText,
    output_llm: params.outputLlm,
    output_rf: params.outputRf || null,
    output_image_url: params.outputImageUrl,
    output_graph_url: params.outputGraphUrl,
    created_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("chat_history").insert([chatLog]);
  if (error) {
    throw error;
  }
};

const Advisory = () => {
  const [searchParams] = useSearchParams();

  // Form state
  const [tempC, setTempC] = useState(24);
  const [rh, setRh] = useState(50);
  const [itLoadKW, setItLoadKW] = useState(500);
  const [electricityPrice, setElectricityPrice] = useState(0.12);
  const [waterPrice, setWaterPrice] = useState(0.001);
  const [carbonFactor, setCarbonFactor] = useState(0.45);
  const [airflowPercent, setAirflowPercent] = useState(100);

  // What-If chat state
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatHistoryItem[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState("");
  const [selectedModel, setSelectedModel] = useState("all");
  const [streamingMode, setStreamingMode] = useState(true);

  // Suggestions state
  const [suggestions, setSuggestions] = useState<any[]>([]);

  // Modal state
  const [llmGenerating, setLlmGenerating] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [simulations, setSimulations] = useState<any[]>([]);
  const [simDropdownLoading, setSimDropdownLoading] = useState(false);
  const [selectedSimId, setSelectedSimId] = useState<string | null>(null);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const simulationId = searchParams.get("simulationId");

  const getSanitizedScenario = () => ({
    airflow_percent: clampValue(airflowPercent, 0, 200),
    inlet_temp_c: clampValue(tempC, 0, 50),
    humidity_percent: clampValue(rh, 0, 100),
    cooling_setpoint_c: clampValue(tempC, 0, 35),
    workload_kw: clampValue(itLoadKW, 0, 5000),
    electricity_price: clampValue(electricityPrice, 0, 999),
    water_price: clampValue(waterPrice, 0, 999),
    carbon_factor: clampValue(carbonFactor, 0, 999),
  });

  // Scroll to bottom of chat
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);

  // Fetch suggestions based on current scenario
  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        const scenario = getSanitizedScenario();

        const response = await fetch(
          `${WHATIF_API_BASE}/whatif/suggestions?${new URLSearchParams(scenario as any)}`,
        );

        if (response.ok) {
          const data = await response.json();
          setSuggestions(data.suggestions);
        } else {
          const errorText = await response.text();
          throw new Error(
            `Suggestion API ${response.status}: ${errorText || "No response body"}`,
          );
        }
      } catch (error) {
        console.error(
          "Failed to fetch suggestions:",
          error,
          "API base:",
          WHATIF_API_BASE,
        );
      }
    };

    fetchSuggestions();
  }, [tempC, rh, itLoadKW, airflowPercent]);

  // Load simulation data
  useEffect(() => {
    if (simulationId) {
      const fetchSimulationData = async () => {
        try {
          const response = await fetch(`/api/simulation/${simulationId}`);
          if (response.ok) {
            const data = await response.json();
            setTempC(clampValue(data.tempC || 24, 0, 50));
            setRh(clampValue(data.rh || 50, 0, 100));
            setItLoadKW(clampValue(data.itLoadKW || 500, 0, 5000));
            setElectricityPrice(
              clampValue(data.electricityPrice || 0.12, 0, 999),
            );
            setWaterPrice(clampValue(data.waterPrice || 0.001, 0, 999));
            setCarbonFactor(clampValue(data.carbonFactor || 0.45, 0, 999));
            setAirflowPercent(clampValue(data.airflowPercent || 100, 0, 200));
          }
        } catch (error) {
          console.error("Failed to load simulation data:", error);
        }
      };
      fetchSimulationData();
    }
  }, [simulationId]);

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    setChatLoading(true);
    setChatError("");

    const newChatEntry: ChatHistoryItem = {
      id: Date.now().toString(),
      question: chatInput,
      answer: "",
      llm_answer: "",
      rf_result: null,
      imageUrl: null,
      graphUrl: null,
      loading: true,
      timestamp: new Date(),
    };

    setChatHistory((prev) => [...prev, newChatEntry]);

    try {
      const simId = simulationId ? simulationId : null;
      const scenarioPayload = getSanitizedScenario();

      const payload = {
        question: chatInput,
        scenario: scenarioPayload,
        ...(simId ? { simulationId: simId } : {}),
        model: selectedModel,
        stream: streamingMode,
      };

      console.log("Sending payload:", payload);

      // Update the streaming handling code (around line 206)
      if (streamingMode) {
        // Handle streaming response
        const response = await fetch(`${WHATIF_API_BASE}/whatif`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `What-if API ${response.status}: ${errorText || "No response body"}`,
          );
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        let accumulatedLLM = "";
        let latestRfResult: any = null;
        let buffer = "";

        while (reader) {
          const { done, value } = await reader.read();
          if (done) break;

          // Decode the chunk and add to buffer
          buffer += decoder.decode(value, { stream: true });

          // Split by newlines and process each complete line
          const lines = buffer.split("\n");
          buffer = lines.pop() || ""; // Keep incomplete line in buffer

          for (const line of lines) {
            if (!line.trim()) continue;

            try {
              const data: StreamingChunk = JSON.parse(line);

              setChatHistory((prev) => {
                const updated = [...prev];
                const lastIndex = updated.length - 1;

                if (lastIndex >= 0) {
                  switch (data.type) {
                    case "rf_prediction":
                      latestRfResult = data.content;
                      updated[lastIndex] = {
                        ...updated[lastIndex],
                        rf_result: data.content,
                      };
                      break;
                    case "llm_chunk":
                      accumulatedLLM += data.content;
                      updated[lastIndex] = {
                        ...updated[lastIndex],
                        llm_answer: cleanAdvisoryText(accumulatedLLM),
                      };
                      break;
                    case "error":
                      updated[lastIndex] = {
                        ...updated[lastIndex],
                        answer: `Error: ${data.content}`,
                        loading: false,
                      };
                      break;
                    case "complete":
                      updated[lastIndex] = {
                        ...updated[lastIndex],
                        loading: false,
                      };
                      break;
                  }
                }
                return updated;
              });
            } catch (e) {
              console.error(
                "Failed to parse streaming chunk:",
                e,
                "Line:",
                line,
              );
              // Don't throw - continue processing other chunks
            }
          }
        }

        setChatInput("");

        try {
          await persistChatHistory({
            question: chatInput,
            scenario: scenarioPayload,
            model: selectedModel,
            outputText: cleanAdvisoryText(accumulatedLLM),
            outputLlm: cleanAdvisoryText(accumulatedLLM),
            outputRf: latestRfResult,
            outputImageUrl: null,
            outputGraphUrl: null,
          });
        } catch (logErr) {
          console.error("Supabase logging failed:", logErr);
        }
      } else {
        // Handle regular response
        const res = await fetch(`${WHATIF_API_BASE}/whatif`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(
            `What-if API ${res.status}: ${errorText || "No response body"}`,
          );
        }

        const data = await res.json();

        setChatHistory((prev) => {
          const updated = [...prev];
          const lastIndex = updated.length - 1;
          if (lastIndex >= 0) {
            updated[lastIndex] = {
              ...updated[lastIndex],
              answer: data.answer || "",
              llm_answer: cleanAdvisoryText(data.llm_answer || ""),
              rf_result: data.rf_result || null,
              imageUrl: data.imageUrl || null,
              graphUrl: data.graphUrl || null,
              metadata: data.metadata,
              loading: false,
            };
          }
          return updated;
        });

        setChatInput("");

        try {
          await persistChatHistory({
            question: chatInput,
            scenario: scenarioPayload,
            model: selectedModel,
            outputText: cleanAdvisoryText(data.answer || data.llm_answer || ""),
            outputLlm: cleanAdvisoryText(data.llm_answer || data.answer || ""),
            outputRf: data.rf_result || null,
            outputImageUrl: data.imageUrl || null,
            outputGraphUrl: data.graphUrl || null,
          });
        } catch (logErr) {
          console.error("Supabase logging failed:", logErr);
        }
      }
    } catch (err) {
      setChatError(
        "Error: " + (err instanceof Error ? err.message : "Unknown error"),
      );
      setChatHistory((prev) => {
        const updated = [...prev];
        const lastIndex = updated.length - 1;
        if (lastIndex >= 0) {
          updated[lastIndex] = {
            ...updated[lastIndex],
            answer: "Sorry, I encountered an error processing your request.",
            loading: false,
          };
        }
        return updated;
      });
    } finally {
      setChatLoading(false);
    }
  };

  const handleOpenSimulationModal = async () => {
    setModalOpen(true);
    setSimDropdownLoading(true);
    setSimulations([]);
    setSelectedSimId(null);
    setChatError("");
    try {
      const authUser = await getCurrentAuthUser();
      if (!authUser) throw new Error("Not logged in");
      const userUUID = await getUserUUID(authUser.id);
      if (!userUUID) throw new Error("User UUID not found");
      const { success, data, error } = await getUserSimulations(userUUID);
      if (!success || !data)
        throw new Error(error || "Failed to fetch simulations");
      setSimulations(data.simulations);
    } catch (err) {
      setChatError(
        "Could not load simulations: " +
          (err instanceof Error ? err.message : "Unknown error"),
      );
    } finally {
      setSimDropdownLoading(false);
    }
  };

  const handleGenerateFromSimulation = async () => {
    if (!selectedSimId) return;
    setLlmGenerating(true);
    setChatError("");
    try {
      const scenario = getSanitizedScenario();

      const res = await fetch(`${WHATIF_API_BASE}/whatif/generate-question`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          simulationId: selectedSimId,
          scenario: scenario,
          question_type: "optimization",
        }),
      });

      if (!res.ok) throw new Error("Failed to generate what-if question");
      const data = await res.json();
      if (data && data.generated_question) {
        setChatInput(data.generated_question);
        setModalOpen(false);
      } else {
        setChatError("No question generated.");
      }
    } catch (err) {
      setChatError(
        "Error generating what-if: " +
          (err instanceof Error ? err.message : "Unknown error"),
      );
    } finally {
      setLlmGenerating(false);
    }
  };

  const suggestedQuestions = [
    "What's the optimal temperature setpoint for current IT load?",
    "How much can I save by increasing temperature by 2°C?",
    "What's the impact of reducing humidity to 40%?",
    "Compare air-side vs water-side cooling efficiency",
    "How does evaporative cooling perform in this climate?",
    "What's the risk of equipment failure at current conditions?",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Sidebar />
      <main className="flex-1 lg:ml-64 p-4 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent mb-2">
            AI-Powered Performance Advisory
          </h1>
          <p className="text-gray-600">
            Get intelligent recommendations and what-if analysis for your data
            center cooling
          </p>
        </div>

        {/* Quick Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <Zap className="text-yellow-500" size={24} />
              <div>
                <p className="text-sm text-gray-500">Current PUE</p>
                <p className="text-2xl font-bold">
                  {(1.2 + (tempC - 24) * 0.02).toFixed(2)}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <TrendingDown className="text-green-500" size={24} />
              <div>
                <p className="text-sm text-gray-500">Potential Savings</p>
                <p className="text-2xl font-bold">Up to 25%</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <AlertTriangle className="text-orange-500" size={24} />
              <div>
                <p className="text-sm text-gray-500">Risk Level</p>
                <p className="text-2xl font-bold">
                  {tempC > 28 ? "High" : tempC > 26 ? "Medium" : "Low"}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <Sparkles className="text-purple-500" size={24} />
              <div>
                <p className="text-sm text-gray-500">AI Insights</p>
                <p className="text-2xl font-bold">{suggestions.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Scenario Parameters Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <Sliders className="text-blue-500" size={24} />
            <h2 className="text-2xl font-bold text-gray-800">
              Current Scenario
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Airflow (%)
              </label>
              <input
                type="number"
                value={airflowPercent}
                onChange={(e) =>
                  setAirflowPercent(
                    clampValue(parseFloat(e.target.value) || 0, 0, 200),
                  )
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                step="5"
                min={0}
                max={200}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Temperature (°C)
              </label>
              <input
                type="number"
                value={tempC}
                onChange={(e) =>
                  setTempC(clampValue(parseFloat(e.target.value) || 0, 0, 50))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                step="0.5"
                min={0}
                max={50}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Humidity (%)
              </label>
              <input
                type="number"
                value={rh}
                onChange={(e) =>
                  setRh(clampValue(parseFloat(e.target.value) || 0, 0, 100))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                step="5"
                min={0}
                max={100}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                IT Load (kW)
              </label>
              <input
                type="number"
                value={itLoadKW}
                onChange={(e) =>
                  setItLoadKW(
                    clampValue(parseFloat(e.target.value) || 0, 0, 5000),
                  )
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                step="50"
                min={0}
                max={5000}
              />
            </div>
          </div>
        </div>

        {/* AI Suggestions Banner */}
        {suggestions.length > 0 && (
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl p-6 mb-8 border border-blue-100">
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <Sparkles size={20} className="text-blue-600" />
              AI-Powered Suggestions
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {suggestions.slice(0, 4).map((suggestion, idx) => (
                <div key={idx} className="bg-white rounded-lg p-3 shadow-sm">
                  <p className="font-semibold text-gray-800">
                    {suggestion.title}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    {suggestion.description}
                  </p>
                  <p className="text-xs text-blue-600 mt-2">
                    → {suggestion.action}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* What-If Generator */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Bot className="text-purple-500" size={24} />
              <h2 className="text-2xl font-bold text-gray-800">
                What-If Scenario Generator
              </h2>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={streamingMode}
                  onChange={(e) => setStreamingMode(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm text-gray-600">Streaming Mode</span>
              </label>
              <select
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                disabled={chatLoading}
              >
                <option value="rf">📊 Random Forest</option>
                <option value="llm">🤖 AI Analysis</option>
                <option value="sd">🎨 Visual Analysis</option>
                <option value="all">✨ All Models</option>
              </select>
            </div>
          </div>

          <form onSubmit={handleChatSubmit} className="flex gap-3 mb-6">
            <input
              type="text"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ask a what-if question (e.g., What if I increase IT load by 20%?)"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              disabled={chatLoading}
            />
            <button
              type="submit"
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50"
              disabled={chatLoading || !chatInput.trim()}
            >
              {chatLoading ? (
                <Loader className="animate-spin" size={20} />
              ) : (
                <Send size={20} />
              )}
            </button>
            <button
              type="button"
              className="px-6 py-3 border-2 border-blue-500 text-blue-600 rounded-xl font-semibold hover:bg-blue-50 transition-all"
              disabled={llmGenerating || chatLoading}
              onClick={handleOpenSimulationModal}
            >
              <Sparkles size={20} />
            </button>
          </form>

          {chatError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {chatError}
            </div>
          )}

          {/* Suggested Questions */}
          {chatHistory.length === 0 && (
            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-2">Try asking:</p>
              <div className="flex flex-wrap gap-2">
                {suggestedQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => setChatInput(q)}
                    className="text-sm px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Chat History */}
          <div
            ref={chatContainerRef}
            className="space-y-4 max-h-[500px] overflow-y-auto"
          >
            {chatHistory.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-xl bg-gray-50 border border-gray-100"
              >
                <div className="font-semibold text-gray-800 mb-2 flex items-start justify-between">
                  <span>You: {item.question}</span>
                  <span className="text-xs text-gray-400">
                    {item.timestamp.toLocaleTimeString()}
                  </span>
                </div>
                {item.loading ? (
                  <div className="flex items-center gap-2 text-blue-600">
                    <Loader className="animate-spin" size={16} />
                    <span>Analyzing your question...</span>
                  </div>
                ) : (
                  <>
                    {item.rf_result && (
                      <div className="mb-3 p-3 bg-green-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Database size={16} className="text-green-600" />
                          <strong className="text-green-800">
                            RF Prediction Summary
                          </strong>
                        </div>
                        {(() => {
                          const rf = getRfSummary(item.rf_result);
                          if (!rf) {
                            return null;
                          }

                          return (
                            <div className="space-y-3 text-sm text-gray-700">
                              <p>
                                The model estimates predicted power at{" "}
                                {rf.predictedPower} kW with efficiency around{" "}
                                {rf.efficiency}% and hourly cost around{" "}
                                {rf.costPerHour}.
                              </p>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                                <div className="rounded-lg bg-white p-2 border border-green-100">
                                  <div className="text-gray-500">PUE</div>
                                  <div className="font-semibold text-gray-800">
                                    {rf.pue}
                                  </div>
                                </div>
                                <div className="rounded-lg bg-white p-2 border border-green-100">
                                  <div className="text-gray-500">
                                    Total Power
                                  </div>
                                  <div className="font-semibold text-gray-800">
                                    {rf.totalPower} kW
                                  </div>
                                </div>
                                <div className="rounded-lg bg-white p-2 border border-green-100">
                                  <div className="text-gray-500">
                                    Hourly Cost
                                  </div>
                                  <div className="font-semibold text-gray-800">
                                    {rf.hourlyCost}
                                  </div>
                                </div>
                                <div className="rounded-lg bg-white p-2 border border-green-100">
                                  <div className="text-gray-500">
                                    Water Usage
                                  </div>
                                  <div className="font-semibold text-gray-800">
                                    {rf.waterUsage} L/hour
                                  </div>
                                </div>
                              </div>
                              <p>
                                Cooling efficiency is about{" "}
                                {rf.coolingEfficiency}% and water use intensity
                                is {rf.wue} L/kWh.
                              </p>
                              {rf.recommendations.length > 0 ? (
                                <div>
                                  <div className="font-medium text-gray-800 mb-1">
                                    Recommended actions
                                  </div>
                                  <p>{rf.recommendations.join(" ")}</p>
                                </div>
                              ) : (
                                <p>
                                  No specific recommendations were returned by
                                  the model, so the result should be treated as
                                  a baseline operating estimate.
                                </p>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    )}
                    {item.llm_answer && (
                      <div className="mb-3 p-3 bg-blue-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Bot size={16} className="text-blue-600" />
                          <strong className="text-blue-800">AI Analysis</strong>
                        </div>
                        <div className="space-y-4 text-gray-700">
                          {getAdvisorySections(item.llm_answer).map(
                            (section) => (
                              <div key={section.title} className="space-y-2">
                                <div className="text-sm font-semibold text-gray-900">
                                  {section.title}
                                </div>
                                <ul className="space-y-2 text-sm leading-relaxed list-disc pl-5">
                                  {section.items.map((itemText, idx) => (
                                    <li key={`${section.title}-${idx}`}>
                                      {itemText}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                    )}
                    {item.imageUrl && (
                      <img
                        src={item.imageUrl}
                        alt="Generated visualization"
                        className="mt-2 rounded-lg max-w-full"
                      />
                    )}
                    {item.metadata && (
                      <div className="text-xs text-gray-400 mt-2">
                        Models used: {item.metadata.models_used?.join(", ")}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Simulation Modal */}
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Select a Simulation"
          actions={
            <>
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                disabled={!selectedSimId || llmGenerating}
                onClick={handleGenerateFromSimulation}
              >
                {llmGenerating ? "Generating..." : "Generate What-If"}
              </button>
              <button
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                onClick={() => setModalOpen(false)}
              >
                Cancel
              </button>
            </>
          }
        >
          {simDropdownLoading ? (
            <div className="text-center py-4">Loading simulations...</div>
          ) : simulations.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              No simulations found
            </div>
          ) : (
            <div>
              <label className="block mb-2 font-semibold">
                Choose a simulation:
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                value={selectedSimId || ""}
                onChange={(e) => setSelectedSimId(e.target.value)}
              >
                <option value="" disabled>
                  Select simulation...
                </option>
                {simulations.map((sim) => (
                  <option key={sim.id} value={sim.id}>
                    {sim.name || `Simulation #${sim.id}`} (
                    {new Date(sim.createdAt).toLocaleDateString()})
                  </option>
                ))}
              </select>
            </div>
          )}
        </Modal>
      </main>
    </div>
  );
};

export default Advisory;
