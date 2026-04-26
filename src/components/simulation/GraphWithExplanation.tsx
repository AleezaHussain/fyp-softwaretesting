import React, { useMemo, useState, useEffect } from "react";
import { Sparkles, AlertCircle, Loader } from "lucide-react";

interface ChartDataPoint {
    label: string;
    value: number;
}

interface SimulationContext {
    location?: string;
    outdoorTempC?: number;
    humidity?: number;
    servers?: number;
    workloadPercent?: number;
    itLoadKW?: number;
    duration?: string;
    coolingTechnique?: string;
}

interface GraphExplanation {
    explanation: string;
    keyInsight?: string;
    model_used?: string;
}

interface GraphWithExplanationProps {
    chartTitle: string;
    chartType: string;
    xAxis: string;
    yAxis: string;
    data: ChartDataPoint[];
    chart: React.ReactNode;
    simulationContext?: SimulationContext;
}

const GRAPH_EXPLANATION_API_URL =
    import.meta.env.VITE_GRAPH_EXPLANATION_API_URL ||
    "http://localhost:8003/api";
const INSIGHT_CACHE_PREFIX = "graph-explanation-cache:v1:";

export const GraphWithExplanation: React.FC<GraphWithExplanationProps> = ({
    chartTitle,
    chartType,
    xAxis,
    yAxis,
    data,
    chart,
    simulationContext,
}) => {
    const [explanation, setExplanation] = useState<GraphExplanation | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const cacheKey = useMemo(() => {
        return `${INSIGHT_CACHE_PREFIX}${JSON.stringify({
            chartTitle,
            chartType,
            xAxis,
            yAxis,
            data: data.map((point) => [point.label, point.value]),
            simulationContext,
        })}`;
    }, [chartTitle, chartType, xAxis, yAxis, data, simulationContext]);

    const fetchExplanation = async (forceRefresh = false) => {
        if (forceRefresh) {
            try {
                localStorage.removeItem(cacheKey);
            } catch {
                // ignore storage errors
            }
        }

        try {
            const storedExplanation = localStorage.getItem(cacheKey);
            if (storedExplanation) {
                setExplanation(JSON.parse(storedExplanation) as GraphExplanation);
                setError(null);
                setLoading(false);
                return;
            }
        } catch {
            // ignore storage errors and continue to fetch
        }

        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`${GRAPH_EXPLANATION_API_URL}/explain-graph`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    chartTitle,
                    chartType,
                    xAxis,
                    yAxis,
                    data,
                    simulationContext,
                }),
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.statusText}`);
            }

            const result = await response.json();
            setExplanation(result);
            try {
                localStorage.setItem(cacheKey, JSON.stringify(result));
            } catch {
                // ignore storage errors
            }
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Failed to get explanation"
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchExplanation();
        // eslint-disable-next-line
    }, [cacheKey]);

    return (
        <div className="w-full bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-cyan-50">
                <h3 className="text-lg font-semibold text-gray-900">{chartTitle}</h3>
                <p className="text-sm text-gray-600 mt-1">
                    {xAxis} vs {yAxis}
                </p>
            </div>

            {/* Main Content: Side-by-side layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
                {/* Chart Section (2/3 width on desktop) */}
                <div className="lg:col-span-2">
                    <div className="bg-gray-50 rounded-lg p-4 min-h-[350px]">
                        {chart}
                    </div>
                </div>

                {/* Explanation Section (1/3 width on desktop) */}
                <div className="lg:col-span-1 flex flex-col gap-4">
                    {/* AI Explanation Card */}
                    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg border border-blue-200 p-4 flex-1 flex flex-col">
                        <div className="flex items-center gap-2 mb-3">
                            <Sparkles className="w-5 h-5 text-blue-600" />
                            <h4 className="font-semibold text-gray-900">AI Insight</h4>
                        </div>

                        {loading ? (
                            <div className="flex items-center gap-2 text-gray-600 flex-1">
                                <Loader className="w-4 h-4 animate-spin" />
                                <span className="text-sm">Analyzing graph...</span>
                            </div>
                        ) : error ? (
                            <div className="flex items-start gap-2 text-red-700 flex-1">
                                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                <p className="text-sm">{error}</p>
                            </div>
                        ) : explanation ? (
                            <div className="space-y-3 flex-1">
                                {/* Main Explanation */}
                                <p className="text-sm text-gray-700 leading-relaxed">
                                    {explanation.explanation}
                                </p>

                                {/* Key Insight */}
                                {explanation.keyInsight && (
                                    <div className="bg-white rounded p-3 border-l-4 border-green-500">
                                        <p className="text-xs font-semibold text-green-700 mb-1">
                                            Quick Takeaway
                                        </p>
                                        <p className="text-xs text-gray-700">
                                            {explanation.keyInsight}
                                        </p>
                                    </div>
                                )}

                                {/* Model Info */}
                                <p className="text-xs text-gray-500 pt-2">
                                    Generated by: {explanation.model_used}
                                </p>
                            </div>
                        ) : (
                            <p className="text-sm text-gray-600 flex-1">
                                Click "Get Insight" to analyze this graph
                            </p>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => fetchExplanation(true)}
                            disabled={loading}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-3 rounded-lg transition-colors text-sm"
                        >
                            {loading ? "Analyzing..." : "Get Insight"}
                        </button>
                        <button
                            onClick={() => {
                                setExplanation(null);
                                setError(null);
                            }}
                            className="px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors text-sm font-medium"
                        >
                            Clear
                        </button>
                    </div>

                    {/* Data Summary */}
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <h5 className="text-xs font-semibold text-gray-900 mb-3 uppercase tracking-wide">
                            Data Summary
                        </h5>
                        <div className="space-y-2">
                            {data.map((point, idx) => (
                                <div
                                    key={idx}
                                    className="flex justify-between items-center text-xs"
                                >
                                    <span className="text-gray-700 font-medium">
                                        {point.label}
                                    </span>
                                    <span className="text-gray-600 bg-white px-2 py-1 rounded">
                                        {typeof point.value === "number" ? point.value.toFixed(2) : point.value}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};