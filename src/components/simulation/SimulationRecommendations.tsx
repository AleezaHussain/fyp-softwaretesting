import React, { useState } from "react";
import { Info } from "lucide-react";

interface SimulationRecommendationsProps {
  resultData: any;
  result?: any;
  isDark: boolean;
}

const Tip: React.FC<{ text: string; isDark: boolean }> = ({ text, isDark }) => {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-flex items-center ml-1">
      <button
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="opacity-40 hover:opacity-100 transition-opacity"
        tabIndex={-1}
      >
        <Info className="w-3 h-3" />
      </button>
      {show && (
        <span
          className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-50 w-64 text-xs rounded-lg px-2.5 py-1.5 shadow-xl pointer-events-none ${isDark
              ? "bg-[#27304a] text-gray-200 border border-[#3f4a68]"
              : "bg-gray-900 text-white"
            }`}
        >
          {text}
        </span>
      )}
    </span>
  );
};

const fmtV = (v: any, unit?: string): string => {
  if (v == null) return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "number") {
    if (unit === "USD") return `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    if (v > 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
    if (v > 1_000) return v.toLocaleString(undefined, { maximumFractionDigits: 0 });
    return v.toFixed(v > 100 ? 1 : 4);
  }
  return String(v);
};

export const SimulationRecommendations: React.FC<SimulationRecommendationsProps> = ({
  resultData,
  result,
  isDark,
}) => {
  const rd = resultData ?? {};
  const mlRec = rd?.mlRecommendation;
  const fallbackRecommendation = result?.recommendation;

  if (!mlRec && !fallbackRecommendation) {
    return (
      <div
        className={`p-4 rounded-xl border ${isDark
            ? "bg-slate-900 border-slate-700 text-slate-300"
            : "bg-white border-gray-200 text-gray-600"
          }`}
      >
        <p className="text-sm">No recommendation data is available for this simulation.</p>
      </div>
    );
  }

  const comparisonRows = Array.isArray(mlRec?.comparison_table) ? [...mlRec.comparison_table] : [];
  const rankedRows = [...comparisonRows].sort((a, b) => {
    const aScore = typeof a?.score === "number" ? a.score : Number.POSITIVE_INFINITY;
    const bScore = typeof b?.score === "number" ? b.score : Number.POSITIVE_INFINITY;
    return aScore - bScore;
  });

  const recommendation = mlRec?.model_recommendation ?? fallbackRecommendation ?? "—";
  const currentTechnique = mlRec?.current_technique ?? rd?.simulation_type ?? "—";

  const summaryLines: string[] = Array.isArray(mlRec?.why_this_is_recommended)
    ? mlRec.why_this_is_recommended.filter((x: any) => typeof x === "string" && x.trim().length > 0)
    : [];
  const summaryParagraph = summaryLines.join(" ");

  const metaCards = [
    {
      label: "Current Technique",
      value: currentTechnique,
      unit: "",
      color: "#3b82f6",
      tip: "Baseline technique used for model comparison.",
    },
    {
      label: "Recommended",
      value: recommendation,
      unit: "",
      color: "#10b981",
      tip: "Best-ranked feasible technique from model output.",
    },
    {
      label: "Confidence",
      value: mlRec?.confidence,
      unit: "",
      color: "#8b5cf6",
      tip: "Model confidence score if provided by API.",
    },
    {
      label: "Generated",
      value: mlRec?.generated_at_utc ? new Date(mlRec.generated_at_utc).toLocaleString() : "—",
      unit: "",
      color: "#5ce1e5",
      tip: "Timestamp from mlRecommendation.generated_at_utc.",
    },
    {
      label: "Compared Rows",
      value: rankedRows.length,
      unit: "",
      color: "#f59e0b",
      tip: "Number of alternatives from mlRecommendation.comparison_table.",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <span
          className="px-3 py-1 rounded-full text-xs font-bold"
          style={{ background: "#a855f720", color: "#a855f7" }}
        >
          ML Recommendation
        </span>

      </div>

      <div>
        <h3 className={`text-base font-bold mb-3 ${isDark ? "text-white" : "text-gray-900"}`}>
          Recommendation Overview
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {metaCards.map((card) => (
            <div
              key={card.label}
              className={`p-3 rounded-xl border ${isDark ? "bg-[#0a0e27] border-[#3f4a68]" : "bg-white border-gray-200"
                }`}
            >
              <div className={`text-xs mb-1 flex items-center ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                {card.label}
                <Tip text={card.tip} isDark={isDark} />
              </div>
              <div className="font-bold text-sm leading-tight" style={{ color: card.color }}>
                {fmtV(card.value, card.unit)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {summaryParagraph.length > 0 && (
        <div>
          <h3 className={`text-base font-bold mb-3 ${isDark ? "text-white" : "text-gray-900"}`}>
            Why This Is Recommended
            <Tip text="Source: mlRecommendation.why_this_is_recommended[]" isDark={isDark} />
          </h3>
          <div
            className={`p-3 rounded-xl border text-sm leading-7 ${isDark
                ? "bg-[#0a0e27] border-[#3f4a68] text-gray-200"
                : "bg-white border-gray-200 text-gray-700"
              }`}
          >
            {summaryParagraph}
          </div>
        </div>
      )}

      {mlRec?.future_impact_paragraph && !mlRec.future_impact_paragraph.includes("available when") && (
        <div>
          <h3 className={`text-base font-bold mb-3 ${isDark ? "text-white" : "text-gray-900"}`}>
            Future Impact
            <Tip text="Source: mlRecommendation.future_impact_paragraph" isDark={isDark} />
          </h3>
          <div
            className={`p-3 rounded-xl border text-sm leading-7 ${isDark
                ? "bg-[#0a0e27] border-[#3f4a68] text-gray-200"
                : "bg-white border-gray-200 text-gray-700"
              }`}
          >
            {mlRec.future_impact_paragraph}
          </div>
        </div>
      )}

      {rankedRows.length > 0 && (
        <div>
          <h3 className={`text-base font-bold mb-3 ${isDark ? "text-white" : "text-gray-900"}`}>
            Technique Comparison
            <Tip text="Source: mlRecommendation.comparison_table[]" isDark={isDark} />
          </h3>
          <div
            className={`rounded-xl border overflow-hidden ${isDark ? "bg-[#0a0e27] border-[#3f4a68]" : "bg-white border-gray-200"
              }`}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className={isDark ? "bg-[#101733]" : "bg-gray-50"}>
                  <tr>
                    {["Rank", "Technique", "Feasible", "Score", "Annual Cost", "CO2 (kg)", "Water (L)", "Violations"].map((h) => (
                      <th
                        key={h}
                        className={`px-3 py-2 text-left text-xs font-semibold ${isDark ? "text-gray-400" : "text-gray-500"
                          }`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rankedRows.map((row: any, i: number) => {
                    const isBest = row?.tech === recommendation;
                    return (
                      <tr
                        key={i}
                        className={`border-t ${isDark ? "border-[#2f3a5f]" : "border-gray-100"}`}
                      >
                        <td className={`px-3 py-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>{i + 1}</td>
                        <td className={`px-3 py-2 font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                          {row?.tech ?? "—"} {isBest ? "(Best)" : ""}
                        </td>
                        <td className={`px-3 py-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                          {row?.feasible ? "Yes" : "No"}
                        </td>
                        <td className={`px-3 py-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                          {typeof row?.score === "number" ? row.score.toFixed(4) : fmtV(row?.score)}
                        </td>
                        <td className={`px-3 py-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                          {fmtV(row?.annual_cost, "USD")}
                        </td>
                        <td className={`px-3 py-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>{fmtV(row?.annual_emissions_kg)}</td>
                        <td className={`px-3 py-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>{fmtV(row?.annual_water_liters)}</td>
                        <td className={`px-3 py-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>{fmtV(row?.violations)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {!mlRec && fallbackRecommendation && (
        <div
          className={`p-3 rounded-xl border ${isDark
              ? "bg-[#0a0e27] border-[#3f4a68] text-gray-200"
              : "bg-white border-gray-200 text-gray-700"
            }`}
        >
          <div className={`text-xs mb-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
            Recommendation Summary
          </div>
          <div className="font-semibold text-sm">{fallbackRecommendation}</div>
        </div>
      )}
    </div>
  );
};
