import { FormEvent, useEffect, useMemo, useState } from "react";
import { ChevronDown, Sparkles, MessageCircle, PanelTop, PlusCircle } from "lucide-react";
import { Sidebar } from "../components/shared/Sidebar";
import { useAuthStore } from "../store/store";
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
  if (text.includes("air")) return "Air Economizer";
  if (text.includes("water") || text.includes("chilled")) return "Chilled Water";
  if (text.includes("evap")) return "Evaporative Cooling";

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

        setSimulations(data.simulations);
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

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.14),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(236,72,153,0.12),_transparent_30%),linear-gradient(180deg,_#f8fbff_0%,_#f4f8ff_45%,_#eef6ff_100%)]">
      <Sidebar />

      <main className="lg:ml-64 p-4 lg:p-8 space-y-6">
        <header className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-white/80 backdrop-blur-xl shadow-[0_20px_80px_rgba(15,23,42,0.10)] p-6 lg:p-8">
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_right,_rgba(14,165,233,0.12),_transparent_32%),radial-gradient(circle_at_bottom_left,_rgba(168,85,247,0.10),_transparent_28%)]" />
          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                <Sparkles className="h-3.5 w-3.5" />
                Advisory workspace
              </div>
              <h1 className="mt-4 text-3xl lg:text-5xl font-black tracking-tight text-slate-950">
                Review your simulation and chat with guidance.
              </h1>
              <p className="mt-3 max-w-2xl text-slate-600 text-base lg:text-lg">
                Pick any saved simulation, ask your questions in plain language,
                and keep each conversation saved so you can come back anytime.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm w-full lg:max-w-[560px]">
              <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm min-h-[112px] flex flex-col justify-between">
                <p className="text-slate-500 text-sm">Saved simulations</p>
                <p className="text-3xl leading-none font-black tracking-tight text-slate-950">{simulations.length}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm min-h-[112px] flex flex-col justify-between">
                <p className="text-slate-500 text-sm">Current simulation</p>
                <p
                  className="text-xl leading-tight font-extrabold text-slate-950 truncate"
                  title={selectedSimulation
                    ? selectedSimulation.name || `Simulation #${selectedSimulation.id}`
                    : "Not selected"}
                >
                  {selectedSimulation
                    ? selectedSimulation.name || `Simulation #${selectedSimulation.id}`
                    : "Not selected"}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm min-h-[112px] flex flex-col justify-between">
                <p className="text-slate-500 text-sm">Saved chats</p>
                <p className="text-3xl leading-none font-black tracking-tight text-slate-950">{chatThreads.length}</p>
              </div>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)] gap-6">
          <aside className="space-y-6">
            <section className="rounded-[1.75rem] border border-white/80 bg-white/85 backdrop-blur-xl shadow-[0_16px_50px_rgba(15,23,42,0.08)] p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-950/20">
                  <PanelTop className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-950">Pick a simulation</h2>
                  <p className="text-sm text-slate-500">All your saved simulations appear here.</p>
                </div>
              </div>

              <div className="mt-5">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Existing simulations
                </label>
                {loadingSims ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                    Loading simulations...
                  </div>
                ) : simError ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">
                    {simError}
                  </div>
                ) : simulations.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                    No saved simulations found yet.
                  </div>
                ) : (
                  <div className="relative">
                    <select
                      value={selectedSimulationId ?? ""}
                      onChange={(e) => setSelectedSimulationId(Number(e.target.value))}
                      className="w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 py-4 pr-12 text-sm font-medium text-slate-900 shadow-sm outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                    >
                      {simulations.map((sim) => (
                        <option key={sim.id} value={sim.id}>
                          {sim.name || `Simulation #${sim.id}`} • {formatTechniqueLabel(sim.coolingTechnique || sim.simulation_type)} • {sim.status}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  </div>
                )}
              </div>

              {simulations.length > 0 && selectedSimulation && (
                <div className="mt-5 rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-sky-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Selected context</p>
                  <p className="mt-2 text-base font-bold text-slate-950">
                    {selectedSimulation.name || `Simulation #${selectedSimulation.id}`}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
                    <span className="rounded-full bg-white px-3 py-1 shadow-sm">{formatTechniqueLabel(selectedSimulation.coolingTechnique || selectedSimulation.simulation_type)}</span>
                    <span className="rounded-full bg-white px-3 py-1 shadow-sm capitalize">{selectedSimulation.status}</span>
                  </div>
                </div>
              )}
            </section>

            <section className="rounded-[1.75rem] border border-white/80 bg-white/85 backdrop-blur-xl shadow-[0_16px_50px_rgba(15,23,42,0.08)] p-6">
              <div>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">All chats</p>
                    <p className="text-xs text-slate-500">Open any old chat, continue it, or start a new one.</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    {chatThreads.length}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleStartNewChat}
                  disabled={!selectedSimulationId}
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <PlusCircle className="h-4 w-4" />
                  New Chat
                </button>

                <div className="mt-4 space-y-2 max-h-56 overflow-auto pr-1">
                  {chatThreads.length === 0 ? (
                    <p className="text-sm text-slate-500">No saved advisory chats yet.</p>
                  ) : (
                    chatThreads.map((thread) => (
                      <button
                        key={thread.chatId}
                        type="button"
                        onClick={() => {
                          setSelectedSimulationId(thread.simulationId);
                          setSelectedChatId(thread.chatId);
                        }}
                        className={`w-full rounded-2xl border px-4 py-3 text-left transition ${thread.chatId === selectedChatId
                          ? "border-sky-300 bg-sky-50"
                          : "border-slate-200 bg-white hover:border-slate-300"
                          }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-slate-900">
                            {thread.chatTitle || "New Chat"}
                          </p>
                          <span className="text-xs text-slate-500">{thread.messageCount} msgs</span>
                        </div>
                        <p className="mt-1 text-[11px] font-medium text-slate-500">
                          {thread.simulationName}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          <span className="block truncate">
                            {thread.lastMessage || "No preview available"}
                          </span>
                        </p>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </section>
          </aside>

          <section className="space-y-6">
            <section className="rounded-[1.75rem] border border-white/80 bg-white/90 backdrop-blur-xl shadow-[0_16px_50px_rgba(15,23,42,0.08)] p-6 lg:p-8">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                  <MessageCircle className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-950">Ask in the active chat</h2>
                  <p className="text-sm text-slate-500">New Chat starts a fresh thread. All messages are auto-saved.</p>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-slate-500">Name</p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {selectedSimulation ? selectedSimulation.name || `Simulation #${selectedSimulation.id}` : "Select a simulation"}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-slate-500">Technique</p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {selectedSimulation ? formatTechniqueLabel(selectedSimulation.coolingTechnique || selectedSimulation.simulation_type) : "—"}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-slate-500">Created</p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {selectedSimulation ? new Date(selectedSimulation.created_at).toLocaleString() : "—"}
                  </p>
                </div>
              </div>

              <form onSubmit={handleAsk} className="mt-6 flex flex-col gap-3 sm:flex-row">
                <input
                  type="text"
                  className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100 disabled:bg-slate-50"
                  placeholder={selectedSimulation ? "Ask anything about this simulation..." : "Select a simulation first..."}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  disabled={!selectedSimulation || asking}
                />
                <button
                  type="submit"
                  disabled={!selectedSimulation || !question.trim() || asking}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-6 py-4 font-semibold text-white shadow-lg shadow-slate-950/20 transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                >
                  {asking ? "Thinking..." : "Ask Advisory"}
                </button>
              </form>

              {chatError && (
                <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {chatError}
                </div>
              )}
            </section>

            <section className="rounded-[1.75rem] border border-white/80 bg-white/90 backdrop-blur-xl shadow-[0_16px_50px_rgba(15,23,42,0.08)] p-6 lg:p-8">
              <h2 className="text-lg font-bold text-slate-950">Conversation</h2>
              <div className="mt-4 space-y-3 max-h-[28rem] overflow-auto pr-1">
                {chatMessages.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-sm text-slate-500">
                    Select a simulation and ask your first question to start the advisory chat.
                  </div>
                )}

                {chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`rounded-2xl border px-4 py-4 text-sm shadow-sm ${msg.role === "user"
                      ? "border-sky-200 bg-sky-50"
                      : "border-slate-200 bg-white"
                      }`}
                  >
                    <p className="font-semibold text-slate-950">
                      {msg.role === "user" ? "You" : "Assistant"}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-slate-700">{msg.content}</p>
                    {msg.role === "assistant" && msg.metadata && (
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                        <span className="rounded-full bg-slate-100 px-3 py-1">source: {msg.metadata.source || "unknown"}</span>
                        <span className="rounded-full bg-slate-100 px-3 py-1">model: {msg.metadata.model || "not provided"}</span>
                        <span className="rounded-full bg-slate-100 px-3 py-1">simulationId: {msg.metadata.simulationId || "not provided"}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </section>
        </section>
      </main>
    </div>
  );
};

export default Advisory;
