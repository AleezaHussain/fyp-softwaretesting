import { FormEvent, useEffect, useMemo, useState } from "react";
import { ChevronDown, Sparkles, MessageCircle, PanelTop, PlusCircle, Bot, User as UserIcon, Zap } from "lucide-react";
import { Sidebar } from "../components/shared/Sidebar";
import { useAuthStore } from "../store/store";
import { useThemeStore } from "../hooks/useTheme";
import {
  getCurrentAuthUser,
  getUserSimulations,
  getUserUUID,
  SimulationWithResults,
} from "../services/simulationService";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  metadata?: {
    source?: string;
    model?: string;
    simulationId?: string;
  };
};

type StoredChatMessage = Omit<ChatMessage, "timestamp"> & {
  timestamp: string;
};

type StoredChatSession = {
  chatId: string;
  chatTitle: string;
  simulationId: number;
  simulationName: string;
  updatedAt: string;
  messages: StoredChatMessage[];
};

type ChatThreadPreview = {
  chatId: string;
  chatTitle: string;
  simulationId: number;
  simulationName: string;
  updatedAt: string;
  messageCount: number;
  lastMessage?: string;
};

const formatTechniqueLabel = (value?: string) => {
  const rawValue = value || "";
  const text = rawValue.toLowerCase().replace(/[_\s-]+/g, "");

  if (!text) return "Unknown";
  if (text.includes("air")) return "Air Side Economization";
  if (text.includes("water") || text.includes("chilled")) return "Chilled Water Cooling";
  if (text.includes("evap")) return "Evaporative Cooling";

  // If already an official name, return as-is
  return rawValue
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();
};

const getChatStorageKey = (userKey: string) => `advisory_chat_history:${userKey}`;

const toStoredMessages = (messages: ChatMessage[]): StoredChatMessage[] =>
  messages.map((message) => ({
    ...message,
    timestamp: message.timestamp.toISOString(),
  }));

const fromStoredMessages = (messages: StoredChatMessage[]): ChatMessage[] =>
  messages.map((message) => ({
    ...message,
    timestamp: new Date(message.timestamp),
  }));

const safeParseChatSessions = (raw: string | null): StoredChatSession[] => {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map((session: any, index: number) => {
      const simulationId = Number(session.simulationId || 0);
      const updatedAt = typeof session.updatedAt === "string" ? session.updatedAt : new Date().toISOString();
      const normalizedMessages: StoredChatMessage[] = Array.isArray(session.messages)
        ? session.messages
        : [];

      // Stable legacy id so old chats remain selectable across reloads.
      const legacyStableId = `legacy-${simulationId}-${updatedAt}-${index}`;

      const firstUser = normalizedMessages.find((message) => message.role === "user");
      const inferredTitle = firstUser?.content
        ? (firstUser.content.length <= 54
          ? firstUser.content
          : `${firstUser.content.slice(0, 54)}...`)
        : "New Chat";

      return {
        chatId: typeof session.chatId === "string" && session.chatId.trim()
          ? session.chatId
          : legacyStableId,
        chatTitle: typeof session.chatTitle === "string" && session.chatTitle.trim()
          ? session.chatTitle
          : inferredTitle,
        simulationId,
        simulationName:
          typeof session.simulationName === "string" && session.simulationName.trim()
            ? session.simulationName
            : `Simulation #${simulationId}`,
        updatedAt,
        messages: normalizedMessages,
      };
    });
  } catch {
    return [];
  }
};

const createChatId = () => `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const buildChatTitle = (messages: ChatMessage[], fallback = "New Chat") => {
  const firstUser = messages.find((message) => message.role === "user");
  if (!firstUser?.content) {
    return fallback;
  }

  const trimmed = firstUser.content.trim();
  if (trimmed.length <= 54) {
    return trimmed;
  }
  return `${trimmed.slice(0, 54)}...`;
};

const ADVISORY_API_BASE = (
  (import.meta as any).env?.VITE_ADVISORY_API_URL || "http://localhost:8002/api"
).replace(/\/$/, "");

const Advisory = () => {
  const user = useAuthStore((state) => state.user);
  const [simulations, setSimulations] = useState<SimulationWithResults[]>([]);
  const [loadingSims, setLoadingSims] = useState(false);
  const [simError, setSimError] = useState("");

  const [selectedSimulationId, setSelectedSimulationId] = useState<number | null>(
    null,
  );
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);

  const [question, setQuestion] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatThreads, setChatThreads] = useState<ChatThreadPreview[]>([]);
  const [asking, setAsking] = useState(false);
  const [chatError, setChatError] = useState("");

  const chatStorageKey = user?.authUserId ? getChatStorageKey(user.authUserId) : "";

  const refreshChatThreads = (storeKey: string) => {
    if (!storeKey || typeof window === "undefined") {
      setChatThreads([]);
      return;
    }

    const sessions = safeParseChatSessions(localStorage.getItem(storeKey));
    const previews = sessions
      .map((session) => ({
        chatId: session.chatId,
        chatTitle: session.chatTitle,
        simulationId: session.simulationId,
        simulationName: session.simulationName,
        updatedAt: session.updatedAt,
        messageCount: session.messages.length,
        lastMessage:
          session.messages.length > 0
            ? session.messages[session.messages.length - 1].content
            : undefined,
      }))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

    setChatThreads(previews);
  };

  const saveChatSession = (
    storeKey: string,
    chatId: string,
    simulation: SimulationWithResults,
    messages: ChatMessage[],
  ) => {
    if (!storeKey || typeof window === "undefined") return;

    const sessions = safeParseChatSessions(localStorage.getItem(storeKey));
    const updatedSession: StoredChatSession = {
      chatId,
      chatTitle: buildChatTitle(messages),
      simulationId: simulation.id,
      simulationName: simulation.name || `Simulation #${simulation.id}`,
      updatedAt: new Date().toISOString(),
      messages: toStoredMessages(messages),
    };

    const nextSessions = [
      updatedSession,
      ...sessions.filter((session) => session.chatId !== chatId),
    ];

    localStorage.setItem(storeKey, JSON.stringify(nextSessions));
    refreshChatThreads(storeKey);
  };

  const selectedSimulation = useMemo(
    () => simulations.find((sim) => sim.id === selectedSimulationId) || null,
    [simulations, selectedSimulationId],
  );

  useEffect(() => {
    if (!selectedSimulationId && simulations.length > 0) {
      setSelectedSimulationId(simulations[0].id);
    }
  }, [simulations, selectedSimulationId]);

  useEffect(() => {
    if (!chatStorageKey) {
      setChatMessages([]);
      setChatThreads([]);
      return;
    }

    refreshChatThreads(chatStorageKey);
  }, [chatStorageKey]);

  useEffect(() => {
    const loadSimulations = async () => {
      setLoadingSims(true);
      setSimError("");

      try {
        let userUUID: string | null = null;

        if (user?.authUserId) {
          userUUID = await getUserUUID(user.authUserId);
        }

        if (!userUUID) {
          const authUser = await getCurrentAuthUser();
          if (!authUser) {
            throw new Error("You must be logged in to view simulations.");
          }
          userUUID = await getUserUUID(authUser.id);
        }

        if (!userUUID) {
          throw new Error("User profile not found.");
        }

        const { success, data, error } = await getUserSimulations(userUUID);

        if (!success || !data) {
          throw new Error(error || "Failed to load simulations.");
        }

        // Only show simulations that have completed — others have no results to advise on
        const completed = data.simulations.filter(
          (sim) => sim.status === "completed",
        );
        setSimulations(completed);
      } catch (err) {
        setSimError(err instanceof Error ? err.message : "Unknown error.");
      } finally {
        setLoadingSims(false);
      }
    };

    loadSimulations();
  }, [user?.authUserId]);

  useEffect(() => {
    if (!chatStorageKey || !selectedSimulationId) {
      setChatMessages([]);
      setSelectedChatId(null);
      setChatError("");
      return;
    }

    const sessions = safeParseChatSessions(localStorage.getItem(chatStorageKey));
    const simulationSessions = sessions
      .filter((session) => session.simulationId === selectedSimulationId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

    const selectedSession = selectedChatId
      ? simulationSessions.find((session) => session.chatId === selectedChatId)
      : undefined;
    const targetSession = selectedSession || simulationSessions[0];

    if (!targetSession) {
      setSelectedChatId(null);
      setChatMessages([]);
      setChatError("");
      return;
    }

    setSelectedChatId(targetSession.chatId);
    setChatMessages(fromStoredMessages(targetSession.messages));
    setChatError("");
  }, [chatStorageKey, selectedSimulationId, selectedChatId]);

  const handleStartNewChat = () => {
    const newChatId = createChatId();
    setSelectedChatId(newChatId);
    setChatMessages([]);
    setQuestion("");
    setChatError("");

    // Persist an empty thread immediately so it appears as its own chat.
    if (chatStorageKey && selectedSimulation) {
      saveChatSession(chatStorageKey, newChatId, selectedSimulation, []);
    }
  };

  const handleAsk = async (e: FormEvent) => {
    e.preventDefault();

    if (!selectedSimulation || !question.trim() || asking) {
      return;
    }

    const userMessage: ChatMessage = {
      id: `${Date.now()}-user`,
      role: "user",
      content: question.trim(),
      timestamp: new Date(),
    };

    const activeChatId = selectedChatId || createChatId();
    const draftMessages = [...chatMessages, userMessage];

    setSelectedChatId(activeChatId);
    setChatMessages(draftMessages);
    setQuestion("");
    setAsking(true);
    setChatError("");

    if (chatStorageKey && selectedSimulation) {
      saveChatSession(chatStorageKey, activeChatId, selectedSimulation, draftMessages);
    }

    try {
      const response = await fetch(`${ADVISORY_API_BASE}/advisory/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: userMessage.content,
          simulationId: String(selectedSimulation.id),
          simulation: selectedSimulation,
        }),
      });

      if (!response.ok) {
        const details = await response.text();
        throw new Error(details || `Request failed with ${response.status}`);
      }

      const data = await response.json();
      const content = data?.answer || "No response text was returned by the advisory API.";

      const assistantMessage: ChatMessage = {
        id: `${Date.now()}-assistant`,
        role: "assistant",
        content,
        timestamp: new Date(),
        metadata: data?.metadata,
      };

      const finalMessages = [...draftMessages, assistantMessage];

      setChatMessages(finalMessages);

      if (chatStorageKey && selectedSimulation) {
        saveChatSession(chatStorageKey, activeChatId, selectedSimulation, finalMessages);
      }

      // ── Save to Supabase chat_history ──────────────────────────────────
      try {
        const { supabase } = await import("../lib/supabase");
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          // chat_history.user_id references users(id) — resolve via auth_user_id
          const usersRow = await supabase
            .from("users")
            .select("id")
            .eq("auth_user_id", authUser.id)
            .single();
          const usersId = usersRow.data?.id;
          if (usersId) {
            const { error } = await supabase.from("chat_history").insert({
              user_id: usersId,
              input_question: userMessage.content,
              input_scenario: {
                simulationId: selectedSimulation?.id,
                simulationName: selectedSimulation?.name,
                simulationType: selectedSimulation?.simulation_type,
              },
              model_used: data?.metadata?.model ?? data?.metadata?.source ?? null,
              output_text: content,
              output_llm: data?.metadata?.source ?? null,
            });
            if (error) console.warn("[Advisory] chat_history insert failed:", error.message);
            else console.log("[Advisory] chat saved to chat_history ✓");
          }
        }
      } catch (saveErr) {
        console.warn("[Advisory] Could not save chat to DB:", saveErr);
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to get advisory response from backend.";

      setChatError(message);

      const assistantMessage: ChatMessage = {
        id: `${Date.now()}-assistant-error`,
        role: "assistant",
        content:
          "I could not fetch the advisory answer right now. Please confirm the Advisory API is running and try again.",
        timestamp: new Date(),
      };

      const finalMessages = [...draftMessages, assistantMessage];

      setChatMessages(finalMessages);

      if (chatStorageKey && selectedSimulation) {
        saveChatSession(chatStorageKey, activeChatId, selectedSimulation, finalMessages);
      }
    } finally {
      setAsking(false);
    }
  };

  const { isDark } = useThemeStore();

  // ── theme helpers ──────────────────────────────────────────────────────────
  const bg = isDark ? "bg-[#0a0e27]" : "bg-gradient-to-br from-slate-50 via-white to-slate-50";
  const card = isDark ? "bg-[#1a1f3a] border-[#3f4a68]" : "bg-white border-slate-200";
  const cardSub = isDark ? "bg-[#27304a] border-[#3f4a68]" : "bg-slate-50 border-slate-200";
  const text = isDark ? "text-white" : "text-slate-950";
  const muted = isDark ? "text-gray-400" : "text-slate-500";
  const label = isDark ? "text-gray-300" : "text-slate-600";
  const inp = isDark
    ? "bg-[#27304a] border-[#3f4a68] text-white placeholder-gray-500 focus:border-[#5ce1e5] focus:ring-[#5ce1e5]/20"
    : "bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-sky-400 focus:ring-sky-100";

  return (
    <div className={`min-h-screen transition-colors duration-300 ${bg}`}>
      <Sidebar />

      <main className="lg:ml-56 p-4 lg:p-8 space-y-6">

        {/* ── Header ── */}
        <header className={`rounded-2xl border p-6 lg:p-8 bg-gradient-to-r ${isDark ? "from-[#0a1628] to-[#1a1f3a] border-[#3f4a68]" : "from-sky-50 to-blue-50 border-sky-200"}`}>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold mb-3 ${isDark ? "border-[#5ce1e5]/30 bg-[#5ce1e5]/10 text-[#5ce1e5]" : "border-sky-300 bg-sky-100 text-sky-700"
                }`}>
                <Sparkles className="h-3.5 w-3.5" />
                AI Advisory Workspace
              </div>
              <h1 className={`text-3xl lg:text-4xl font-black tracking-tight ${isDark ? "text-white" : "text-sky-950"}`}>
                Chat with your simulation data
              </h1>
              <p className={`mt-2 text-base ${isDark ? "text-gray-300" : "text-sky-700"}`}>
                Select a simulation, ask questions in plain language, and get AI-powered insights.
              </p>
            </div>

            {/* Stats strip */}
            <div className="flex gap-4 shrink-0">
              {[
                { label: "Simulations", value: simulations.length, color: isDark ? "text-[#5ce1e5]" : "text-sky-600" },
                { label: "Saved Chats", value: chatThreads.length, color: isDark ? "text-purple-400" : "text-purple-600" },
              ].map(({ label: l, value, color }) => (
                <div key={l} className={`rounded-2xl border px-5 py-4 min-w-[110px] ${isDark ? "bg-[#27304a] border-[#3f4a68]" : "bg-white border-sky-200 shadow-sm"}`}>
                  <p className={`text-xs ${muted}`}>{l}</p>
                  <p className={`text-3xl font-black mt-1 ${color}`}>{value}</p>
                </div>
              ))}
            </div>
          </div>
        </header>

        {/* ── Main layout ── */}
        <div className="grid grid-cols-1 xl:grid-cols-[320px_minmax(0,1fr)] gap-6">

          {/* ── Left panel ── */}
          <aside className="space-y-4">

            {/* Simulation picker */}
            <div className={`rounded-2xl border p-5 ${isDark ? "bg-[#1a1f3a] border-[#3f4a68]" : "bg-gray-50 border-gray-200 shadow-sm"}`}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? "bg-[#5ce1e5]/20 text-[#5ce1e5]" : "bg-slate-900 text-white"}`}>
                  <PanelTop className="h-5 w-5" />
                </div>
                <div>
                  <h2 className={`font-bold ${text}`}>Pick a simulation</h2>
                  <p className={`text-xs ${muted}`}>Your saved simulations</p>
                </div>
              </div>

              {loadingSims ? (
                <div className={`rounded-xl border px-4 py-3 text-sm ${cardSub} ${muted}`}>Loading…</div>
              ) : simError ? (
                <div className={`rounded-xl border px-4 py-3 text-sm ${isDark ? "bg-red-900/20 border-red-700/30 text-red-400" : "bg-rose-50 border-rose-200 text-rose-700"}`}>{simError}</div>
              ) : simulations.length === 0 ? (
                <div className={`rounded-xl border px-4 py-3 text-sm ${cardSub} ${muted}`}>No simulations found.</div>
              ) : (
                <div className="relative">
                  <select
                    value={selectedSimulationId ?? ""}
                    onChange={(e) => setSelectedSimulationId(Number(e.target.value))}
                    className={`w-full appearance-none rounded-xl border px-4 py-3 pr-10 text-sm font-medium outline-none transition ${inp}`}
                  >
                    {simulations.map((sim) => (
                      <option key={sim.id} value={sim.id}>
                        {sim.name || `Simulation #${sim.id}`} · {formatTechniqueLabel(sim.coolingTechnique || sim.simulation_type)}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 ${muted}`} />
                </div>
              )}

              {selectedSimulation && (
                <div className={`mt-4 rounded-xl border p-4 ${cardSub}`}>
                  <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${muted}`}>Active context</p>
                  <p className={`font-bold text-sm ${text}`}>{selectedSimulation.name || `Simulation #${selectedSimulation.id}`}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {[
                      formatTechniqueLabel(selectedSimulation.coolingTechnique || selectedSimulation.simulation_type),
                      selectedSimulation.status,
                    ].map((tag) => (
                      <span key={tag} className={`text-xs px-2.5 py-1 rounded-full capitalize ${isDark ? "bg-[#1a1f3a] text-gray-300" : "bg-white text-slate-600 shadow-sm"}`}>{tag}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Chat threads */}
            <div className={`rounded-2xl border p-5 ${isDark ? "bg-[#1a1f3a] border-[#3f4a68]" : "bg-gray-50 border-gray-200 shadow-sm"}`}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className={`font-semibold text-sm ${text}`}>Saved Chats</p>
                  <p className={`text-xs ${muted}`}>Continue or start new</p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${isDark ? "bg-[#27304a] text-gray-300" : "bg-slate-100 text-slate-600"}`}>{chatThreads.length}</span>
              </div>

              <button
                type="button"
                onClick={handleStartNewChat}
                disabled={!selectedSimulationId}
                className={`w-full flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition mb-3
                  ${isDark
                    ? "border-[#5ce1e5]/40 bg-gradient-to-r from-[#5ce1e5]/20 to-[#0ea5e9]/20 text-[#5ce1e5] hover:from-[#5ce1e5]/30 hover:to-[#0ea5e9]/30 disabled:opacity-40"
                    : "border-sky-300 bg-gradient-to-r from-sky-500 to-blue-500 text-white hover:from-sky-600 hover:to-blue-600 disabled:opacity-40"}`}
              >
                <PlusCircle className="h-4 w-4" />
                New Chat
              </button>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {chatThreads.length === 0 ? (
                  <p className={`text-sm ${muted}`}>No chats yet.</p>
                ) : chatThreads.map((thread) => (
                  <button
                    key={thread.chatId}
                    type="button"
                    onClick={() => { setSelectedSimulationId(thread.simulationId); setSelectedChatId(thread.chatId); }}
                    className={`w-full rounded-xl border px-4 py-3 text-left transition ${thread.chatId === selectedChatId
                      ? isDark ? "border-[#5ce1e5]/40 bg-[#5ce1e5]/10" : "border-sky-300 bg-sky-50"
                      : isDark ? "border-[#3f4a68] bg-[#27304a] hover:border-[#5ce1e5]/30" : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm font-semibold truncate ${text}`}>{thread.chatTitle || "New Chat"}</p>
                      <span className={`text-xs shrink-0 ${muted}`}>{thread.messageCount} msgs</span>
                    </div>
                    <p className={`text-xs mt-0.5 truncate ${muted}`}>{thread.simulationName}</p>
                    <p className={`text-xs mt-0.5 ${isDark ? "text-gray-600" : "text-slate-400"}`}>
                      {new Date(thread.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                      {" · "}
                      {new Date(thread.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* ── Right panel ── */}
          <section className="space-y-4 flex flex-col">

            {/* Ask form */}
            <div className={`rounded-2xl border p-5 lg:p-6 ${card}`}>
              <div className="flex items-center gap-3 mb-5">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? "bg-[#5ce1e5]/20 text-[#5ce1e5]" : "bg-sky-100 text-sky-700"}`}>
                  <MessageCircle className="h-5 w-5" />
                </div>
                <div>
                  <h2 className={`font-bold ${text}`}>Ask the Advisory AI</h2>
                  <p className={`text-xs ${muted}`}>Questions are answered based on your simulation data</p>
                </div>
              </div>

              {/* Context pills */}
              {selectedSimulation && (
                <div className="grid grid-cols-3 gap-3 mb-5">
                  {[
                    { label: "Name", value: selectedSimulation.name || `#${selectedSimulation.id}` },
                    { label: "Technique", value: formatTechniqueLabel(selectedSimulation.coolingTechnique || selectedSimulation.simulation_type) },
                    { label: "Created", value: new Date(selectedSimulation.created_at).toLocaleDateString() },
                  ].map(({ label: l, value }) => (
                    <div key={l} className={`rounded-xl border p-3 ${cardSub}`}>
                      <p className={`text-xs ${muted}`}>{l}</p>
                      <p className={`text-sm font-semibold mt-0.5 truncate ${text}`}>{value}</p>
                    </div>
                  ))}
                </div>
              )}

              <form onSubmit={handleAsk} className="flex flex-col gap-3 sm:flex-row">
                <input
                  type="text"
                  className={`flex-1 rounded-xl border px-4 py-3 text-sm outline-none transition focus:ring-2 ${inp}`}
                  placeholder={selectedSimulation ? "Ask anything about this simulation…" : "Select a simulation first…"}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  disabled={!selectedSimulation || asking}
                />
                <button
                  type="submit"
                  disabled={!selectedSimulation || !question.trim() || asking}
                  className={`inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 font-semibold text-sm transition hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
                    bg-gradient-to-r from-sky-500 to-blue-600 text-white hover:from-sky-600 hover:to-blue-700 shadow-lg shadow-sky-500/20`}
                >
                  {asking ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Thinking…</>
                  ) : (
                    <><Zap className="h-4 w-4" />Ask</>
                  )}
                </button>
              </form>

              {chatError && (
                <div className={`mt-3 rounded-xl border px-4 py-3 text-sm ${isDark ? "bg-red-900/20 border-red-700/30 text-red-400" : "bg-rose-50 border-rose-200 text-rose-700"}`}>
                  {chatError}
                </div>
              )}
            </div>

            {/* Conversation */}
            <div className={`rounded-2xl border p-5 lg:p-6 flex-1 ${card}`}>
              <h2 className={`font-bold mb-4 ${text}`}>Conversation</h2>
              <div className="space-y-3 max-h-[32rem] overflow-y-auto pr-1">
                {chatMessages.length === 0 ? (
                  <div className={`rounded-xl border border-dashed p-6 text-sm text-center ${isDark ? "border-[#3f4a68] text-gray-500" : "border-slate-200 text-slate-400"}`}>
                    Select a simulation and ask your first question to start.
                  </div>
                ) : chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`rounded-xl border px-4 py-4 text-sm ${msg.role === "user"
                      ? isDark ? "border-[#5ce1e5]/30 bg-[#5ce1e5]/10" : "border-sky-200 bg-sky-50"
                      : isDark ? "border-[#3f4a68] bg-[#27304a]" : "border-slate-200 bg-white"
                      }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${msg.role === "user"
                        ? isDark ? "bg-[#5ce1e5]/20 text-[#5ce1e5]" : "bg-sky-100 text-sky-700"
                        : isDark ? "bg-[#3f4a68] text-gray-300" : "bg-slate-100 text-slate-600"
                        }`}>
                        {msg.role === "user" ? <UserIcon className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
                      </div>
                      <p className={`font-semibold text-xs ${text}`}>{msg.role === "user" ? "You" : "Advisory AI"}</p>
                      <span className={`text-xs ml-auto ${muted}`}>{msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                    <p className={`whitespace-pre-wrap leading-relaxed ${label}`}>{msg.content}</p>
                    {msg.role === "assistant" && msg.metadata && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {[
                          `source: ${msg.metadata.source || "unknown"}`,
                          `model: ${msg.metadata.model || "—"}`,
                        ].map((tag) => (
                          <span key={tag} className={`text-xs px-2.5 py-1 rounded-full ${isDark ? "bg-[#1a1f3a] text-gray-400" : "bg-slate-100 text-slate-500"}`}>{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );

};

export default Advisory;
