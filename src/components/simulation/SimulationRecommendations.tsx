import React from "react";
import { Download } from "lucide-react";

interface SimulationRecommendationsProps {
  resultData: any;
  result?: any;
  isDark: boolean;
}

const fmtV = (v: any, unit?: string): string => {
  if (v == null) return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "number") {
    if (unit === "USD") return `${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
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
      <div className={`p-4 rounded-xl border ${isDark ? "bg-slate-900 border-slate-700 text-slate-300" : "bg-white border-gray-200 text-gray-600"}`}>
        <p className="text-sm">No recommendation data is available for this simulation.</p>
      </div>
    );
  }

  const comparisonRows = Array.isArray(mlRec?.comparison_table) ? [...mlRec.comparison_table] : [];
  const rankedRows = [
    ...comparisonRows.filter((r: any) => r?.tech === (mlRec?.model_recommendation ?? fallbackRecommendation)),
    ...comparisonRows
      .filter((r: any) => r?.tech !== (mlRec?.model_recommendation ?? fallbackRecommendation))
      .sort((a: any, b: any) => (a?.annual_cost ?? 0) - (b?.annual_cost ?? 0)),
  ];

  const recommendation = mlRec?.model_recommendation ?? fallbackRecommendation ?? "—";
  const currentTechnique = mlRec?.current_technique ?? rd?.simulation_type ?? "—";

  const downloadML = () => {
    const payload = mlRec ?? { recommendation: fallbackRecommendation };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ml_recommendation_${(recommendation ?? "unknown").replace(/\s+/g, "_").toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const summaryLines: string[] = Array.isArray(mlRec?.why_this_is_recommended)
    ? mlRec.why_this_is_recommended.filter((x: any) => typeof x === "string" && x.trim().length > 0)
    : [];
  const summaryParagraph = summaryLines.join(" ");

  const metaCards = [
    { label: "Current Technique", value: currentTechnique, color: "#3b82f6" },
    { label: "Recommended",       value: recommendation,   color: "#10b981" },
    { label: "Generated",         value: mlRec?.generated_at_utc ? new Date(mlRec.generated_at_utc).toLocaleString() : "—", color: "#5ce1e5" },
    { label: "Compared Rows",     value: rankedRows.length, color: "#f59e0b" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: "#a855f720", color: "#a855f7" }}>
          ML Recommendation
        </span>
        <button
          onClick={downloadML}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${isDark ? "bg-[#27304a] text-gray-300 hover:bg-[#3f4a68] hover:text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
          title="Download full ML recommendation response as JSON"
        >
          <Download className="w-3.5 h-3.5" />
          Download JSON
        </button>
      </div>

      {/* Overview cards */}
      <div>
        <h3 className={`text-base font-bold mb-3 ${isDark ? "text-white" : "text-gray-900"}`}>
          Recommendation Overview
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {metaCards.map((card) => (
            <div key={card.label} className={`p-3 rounded-xl border ${isDark ? "bg-[#0a0e27] border-[#3f4a68]" : "bg-white border-gray-200"}`}>
              <div className={`text-xs mb-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>{card.label}</div>
              <div className="font-bold text-sm leading-tight" style={{ color: card.color }}>
                {fmtV(card.value)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Why recommended */}
      {summaryParagraph.length > 0 && (
        <div>
          <h3 className={`text-base font-bold mb-3 ${isDark ? "text-white" : "text-gray-900"}`}>
            Why This Is Recommended
          </h3>
          <div className={`p-3 rounded-xl border text-sm leading-7 ${isDark ? "bg-[#0a0e27] border-[#3f4a68] text-gray-200" : "bg-white border-gray-200 text-gray-700"}`}>
            {summaryParagraph}
          </div>
        </div>
      )}

      {/* Future impact */}
      {mlRec?.future_impact_paragraph && !mlRec.future_impact_paragraph.includes("available when") && (
        <div>
          <h3 className={`text-base font-bold mb-3 ${isDark ? "text-white" : "text-gray-900"}`}>
            Future Impact
          </h3>
          <div className={`p-3 rounded-xl border text-sm leading-7 ${isDark ? "bg-[#0a0e27] border-[#3f4a68] text-gray-200" : "bg-white border-gray-200 text-gray-700"}`}>
            {mlRec.future_impact_paragraph}
          </div>
        </div>
      )}

      {/* Technique comparison table */}
      {rankedRows.length > 0 && (
        <div>
          <h3 className={`text-base font-bold mb-3 ${isDark ? "text-white" : "text-gray-900"}`}>
            Technique Comparison
          </h3>
          <div className={`rounded-xl border overflow-hidden ${isDark ? "bg-[#0a0e27] border-[#3f4a68]" : "bg-white border-gray-200"}`}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className={isDark ? "bg-[#101733]" : "bg-gray-50"}>
                  <tr>
                    {["Technique", "Feasible", "Annual Cost", "CO₂ (kg/yr)", "Water (L/yr)", "Violations"].map((h) => (
                      <th key={h} className={`px-3 py-2 text-left text-xs font-semibold ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rankedRows.map((row: any, i: number) => {
                    const isBest = row?.tech === recommendation;
                    return (
                      <tr key={i} className={`border-t ${isDark ? "border-[#2f3a5f]" : "border-gray-100"} ${isBest ? (isDark ? "bg-[#0d2a1a]" : "bg-green-50") : ""}`}>
                        <td className={`px-3 py-2 font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                          {row?.tech ?? "—"}
                          {isBest && (
                            <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: "#10b98120", color: "#10b981" }}>
                              ✓ Recommended
                            </span>
                          )}
                        </td>
                        <td className={`px-3 py-2 ${row?.feasible ? "text-green-500" : "text-red-500"}`}>
                          {row?.feasible ? "Yes" : "No"}
                        </td>
                        <td className={`px-3 py-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                          ${(row?.annual_cost ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </td>
                        <td className={`px-3 py-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                          {(row?.annual_emissions_kg ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </td>
                        <td className={`px-3 py-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                          {row?.annual_water_liters === 0
                            ? <span className="text-green-500">0 (no water used)</span>
                            : (row?.annual_water_liters ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </td>
                        <td className={`px-3 py-2 ${(row?.violations ?? 0) > 0 ? "text-red-500 font-bold" : (isDark ? "text-gray-300" : "text-gray-700")}`}>
                          {row?.violations ?? 0}
                          {(row?.violations ?? 0) > 0 && " ⚠️"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Fallback */}
      {!mlRec && fallbackRecommendation && (
        <div className={`p-3 rounded-xl border ${isDark ? "bg-[#0a0e27] border-[#3f4a68] text-gray-200" : "bg-white border-gray-200 text-gray-700"}`}>
          <div className={`text-xs mb-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>Recommendation Summary</div>
          <div className="font-semibold text-sm">{fallbackRecommendation}</div>
        </div>
      )}
    </div>
  );
};
