"use client";

import { useState, useEffect } from "react";
// ─── Backend URLs ───────────────────────────────────────────────────────────
const BACKEND_BASE = "https://smart-agriculture-backend-2nk0.onrender.com";

// Example sensor data structure
type SensorData = {
  Soil_Moisture: { ID: number; Val: number; Unit: string };
  Temperature: { ID: number; Val: number; Unit: string };
  Humidity: { ID: number; Val: number; Unit: string };
  Light: { ID: number; Val: number; Unit: string };
  Pump_Status: { ID: number; Val: number; Unit: string };
};

type SystemHealth = Record<string, unknown>;
type SystemStatus = Record<string, unknown>;
type SystemHistory = Record<string, unknown> | Array<Record<string, unknown>>;

type HistoryItem = {
  soil_moisture?: number;
  temperature?: number;
  humidity?: number;
  light?: number;
  pump_status?: number;
  recommendation?: string;
  timestamp?: string;
};

type ChartPayloadItem = {
  dataKey?: string;
  color?: string;
  name?: string;
  value?: number | string;
};

// ─── Pump Control ───────────────────────────────────────────────────────────
async function setPumpStatus(action: "ON" | "OFF") {
  const res = await fetch(`${BACKEND_BASE}/api/pump`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ state: action }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Failed to set pump status (${res.status})`);
  }
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return res.json();
  }
  return null;
}

// ─── Sensor Data Fetch ──────────────────────────────────────────────────────
async function fetchSensorData(): Promise<SensorData> {
  const res = await fetch(`${BACKEND_BASE}/api/latest`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error("Failed to fetch sensor data");
  return res.json();
}

async function fetchHealth(): Promise<SystemHealth> {
  const res = await fetch(`${BACKEND_BASE}/api/v1/health`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error("Failed to fetch health");
  return res.json();
}

async function fetchStatus(): Promise<SystemStatus> {
  const res = await fetch(`${BACKEND_BASE}/api/status`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error("Failed to fetch status");
  return res.json();
}

async function fetchHistory(): Promise<SystemHistory> {
  const res = await fetch(`${BACKEND_BASE}/api/history`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error("Failed to fetch history");
  return res.json();
}
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  X,
  SlidersHorizontal,
  Plus,
  Settings2,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Alert = {
  id: string;
  level: "critical" | "warning" | "insight";
  time: string;
  title: string;
  description: string;
  action?: string;
};


// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  unit,
  badge,
  badgeColor,
  sub,
  trend,
  highLow,
}: {
  label: string;
  value: string;
  unit: string;
  badge: string;
  badgeColor: "green" | "amber" | "blue";
  sub?: string;
  trend?: number[];
  highLow?: { high: string; low: string };
}) {
  const dotColor =
    badgeColor === "green"
      ? "bg-emerald-400"
      : badgeColor === "amber"
      ? "bg-amber-400"
      : "bg-sky-400";
  const textColor =
    badgeColor === "green"
      ? "text-emerald-400"
      : badgeColor === "amber"
      ? "text-amber-400"
      : "text-sky-400";

  return (
    <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold tracking-widest text-zinc-500 uppercase">
          {label}
        </span>
        <span className={cn("flex items-center gap-1.5 text-xs font-semibold", textColor)}>
          <span className={cn("h-2 w-2 rounded-full", dotColor, "shadow-[0_0_5px_currentColor]")} />
          {badge}
        </span>
      </div>

      <div className="flex items-end gap-2">
        <span className="text-4xl font-black text-white leading-none">{value}</span>
        <span className="text-sm text-zinc-400 mb-0.5">{unit}</span>
      </div>

      {trend && (
        <div className="flex items-end gap-0.5 h-8">
          {trend.map((v, i) => (
            <div
              key={i}
              className="flex-1 rounded-sm bg-zinc-700 relative overflow-hidden"
              style={{ height: "100%" }}
            >
              <div
                className="absolute bottom-0 inset-x-0 rounded-sm bg-emerald-600 transition-all"
                style={{ height: `${(v / Math.max(...trend)) * 100}%` }}
              />
            </div>
          ))}
        </div>
      )}

      {sub && (
        <p className="text-xs text-zinc-400 flex items-center gap-1">
          <span className="text-zinc-300">→</span> {sub}
        </p>
      )}

      {highLow && (
        <div className="flex gap-4 text-xs">
          <div>
            <p className="text-zinc-600 uppercase tracking-wider text-[10px]">High</p>
            <p className="text-zinc-200 font-semibold">{highLow.high}</p>
          </div>
          <div>
            <p className="text-zinc-600 uppercase tracking-wider text-[10px]">Low</p>
            <p className="text-zinc-200 font-semibold">{highLow.low}</p>
          </div>
        </div>
      )}

      {trend && (
        <p className="text-[10px] text-zinc-600 uppercase tracking-wider -mt-1">
          Last 24h Trend
        </p>
      )}
    </div>
  );
}

function AlertCard({
  alert,
  onDismiss,
}: {
  alert: Alert;
  onDismiss: (id: string) => void;
}) {
  const styles = {
    critical: {
      border: "border-l-red-500",
      bg: "bg-red-950/40",
      badge: "text-red-400",
      dot: "bg-red-500",
      label: "CRITICAL",
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
      btnClass: "bg-emerald-600 hover:bg-emerald-500 text-white",
    },
    warning: {
      border: "border-l-amber-500",
      bg: "bg-amber-950/20",
      badge: "text-amber-400",
      dot: "bg-amber-400",
      label: "WARNING",
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
      btnClass: "border border-zinc-600 text-zinc-300 hover:bg-zinc-700",
    },
    insight: {
      border: "border-l-emerald-500",
      bg: "bg-emerald-950/20",
      badge: "text-emerald-400",
      dot: "bg-emerald-400",
      label: "INSIGHT",
      icon: <Lightbulb className="h-3.5 w-3.5" />,
      btnClass: "border border-emerald-700 text-emerald-400 hover:bg-emerald-900/40",
    },
  };

  const s = styles[alert.level];

  return (
    <div className={cn("rounded-xl border-l-2 p-4 space-y-2", s.border, s.bg)}>
      <div className="flex items-center justify-between">
        <span className={cn("flex items-center gap-1.5 text-[10px] font-bold tracking-widest", s.badge)}>
          {s.icon}
          {s.label} · {alert.time}
        </span>
        <button
          onClick={() => onDismiss(alert.id)}
          className="text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <p className="text-sm font-bold text-white">{alert.title}</p>
      <p className="text-xs text-zinc-400 leading-relaxed">{alert.description}</p>
      {alert.action && (
        <Button size="sm" className={cn("w-full text-xs font-semibold mt-1", s.btnClass)}>
          {alert.action}
        </Button>
      )}
    </div>
  );
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: ChartPayloadItem[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs space-y-1">
      <p className="text-zinc-400 font-semibold">{label}</p>
      {payload.map((p, idx) => (
        <p key={p.dataKey ?? idx} style={{ color: p.color }}>
          {p.name ?? "Metric"}: {p.value ?? "--"}
        </p>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function FieldAnalyticsDashboard() {
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);
  const [historyVisibleCount, setHistoryVisibleCount] = useState(8);
  const [sensorData, setSensorData] = useState<SensorData | null>(null);
  const [sensorLoading, setSensorLoading] = useState(false);
  const [sensorError, setSensorError] = useState<string | null>(null);
  const [pumpLoading, setPumpLoading] = useState(false);
  const [pumpError, setPumpError] = useState<string | null>(null);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [historyData, setHistoryData] = useState<SystemHistory | null>(null);
  const [systemLoading, setSystemLoading] = useState(false);
  const [systemError, setSystemError] = useState<string | null>(null);

  const healthRecord = (health && typeof health === "object" ? (health as Record<string, unknown>) : null) ?? null;
  const statusRecord = (status && typeof status === "object" ? (status as Record<string, unknown>) : null) ?? null;
  const historyPayload = (historyData && typeof historyData === "object" ? (historyData as Record<string, unknown>) : null) ?? null;
  const historyItems = Array.isArray(historyPayload?.data)
    ? (historyPayload?.data as Array<Record<string, unknown>>)
    : Array.isArray(historyData)
    ? (historyData as Array<Record<string, unknown>>)
    : [];
  const normalizedHistory: HistoryItem[] = historyItems
    .map((item) => ({
      soil_moisture: typeof item.soil_moisture === "number" ? item.soil_moisture : undefined,
      temperature: typeof item.temperature === "number" ? item.temperature : undefined,
      humidity: typeof item.humidity === "number" ? item.humidity : undefined,
      light: typeof item.light === "number" ? item.light : undefined,
      pump_status: typeof item.pump_status === "number" ? item.pump_status : undefined,
      recommendation: typeof item.recommendation === "string" ? item.recommendation : undefined,
      timestamp: typeof item.timestamp === "string" ? item.timestamp : undefined,
    }))
    .sort((a, b) => {
      const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return bTime - aTime;
    });
  const latestHistory = normalizedHistory[0] ?? null;
  const historyCount =
    typeof historyPayload?.count === "number" ? historyPayload?.count : normalizedHistory.length;
  const soil = sensorData?.Soil_Moisture;
  const humidity = sensorData?.Humidity;
  const temperature = sensorData?.Temperature;
  const pump = sensorData?.Pump_Status;
  const soilVal =
    typeof soil?.Val === "number"
      ? soil.Val
      : typeof latestHistory?.soil_moisture === "number"
      ? latestHistory.soil_moisture
      : null;
  const humidityVal =
    typeof humidity?.Val === "number"
      ? humidity.Val
      : typeof latestHistory?.humidity === "number"
      ? latestHistory.humidity
      : null;
  const temperatureVal =
    typeof temperature?.Val === "number"
      ? temperature.Val
      : typeof latestHistory?.temperature === "number"
      ? latestHistory.temperature
      : null;
  const pumpVal =
    typeof pump?.Val === "number"
      ? pump.Val
      : typeof latestHistory?.pump_status === "number"
      ? latestHistory.pump_status
      : null;
  const moistureTrend = normalizedHistory
    .slice(0, 8)
    .map((item) => item.soil_moisture)
    .filter((val): val is number => typeof val === "number")
    .reverse();
  const chartData = normalizedHistory
    .slice(0, 7)
    .reverse()
    .map((item) => ({
      label: item.timestamp
        ? new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : "--",
      moisture: item.soil_moisture ?? null,
      humidity: item.humidity ?? null,
      temp: item.temperature ?? null,
    }));
  const derivedAlerts: Alert[] = normalizedHistory
    .slice(0, 10)
    .flatMap((item, idx) => {
      const alerts: Alert[] = [];
      const timeLabel = item.timestamp
        ? new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : "--";
      if (typeof item.soil_moisture === "number" && item.soil_moisture < 30) {
        alerts.push({
          id: `${item.timestamp ?? idx}-soil`,
          level: "critical",
          time: timeLabel,
          title: "Soil Moisture Low",
          description: `Soil moisture is ${item.soil_moisture}%. Irrigation recommended.`,
        });
      }
      if (typeof item.humidity === "number" && item.humidity > 85) {
        alerts.push({
          id: `${item.timestamp ?? idx}-humidity`,
          level: "warning",
          time: timeLabel,
          title: "High Humidity",
          description: `Humidity is ${item.humidity}%. Fungal risk elevated.`,
        });
      }
      if (typeof item.temperature === "number" && item.temperature < 10) {
        alerts.push({
          id: `${item.timestamp ?? idx}-temp-low`,
          level: "critical",
          time: timeLabel,
          title: "Low Temperature",
          description: `Temperature is ${item.temperature}C. Frost risk possible.`,
        });
      }
      if (typeof item.temperature === "number" && item.temperature > 35) {
        alerts.push({
          id: `${item.timestamp ?? idx}-temp-high`,
          level: "warning",
          time: timeLabel,
          title: "High Temperature",
          description: `Temperature is ${item.temperature}C. Heat stress risk.`,
        });
      }
      if (alerts.length === 0 && item.recommendation) {
        alerts.push({
          id: `${item.timestamp ?? idx}-recommendation`,
          level: "insight",
          time: timeLabel,
          title: "Recommendation",
          description: item.recommendation,
        });
      }
      return alerts;
    })
    .slice(0, 6);
  const alerts = derivedAlerts.filter((alert) => !dismissedAlerts.includes(alert.id));

  // Fetch sensor data on mount
  const refreshSensorData = () => {
    setSensorLoading(true);
    setSensorError(null);
    fetchSensorData()
      .then(setSensorData)
      .catch((e) => setSensorError(e.message))
      .finally(() => setSensorLoading(false));
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      refreshSensorData();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const refreshSystemData = () => {
    setSystemLoading(true);
    setSystemError(null);
    Promise.all([fetchHealth(), fetchStatus(), fetchHistory()])
      .then(([healthPayload, statusPayload, historyPayload]) => {
        setHealth(healthPayload);
        setStatus(statusPayload);
        setHistoryData(historyPayload);
      })
      .catch((e) => setSystemError(e.message))
      .finally(() => setSystemLoading(false));
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      refreshSystemData();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const handlePump = async (action: "ON" | "OFF") => {
    setPumpLoading(true);
    setPumpError(null);
    try {
      await setPumpStatus(action);
      // Optionally, refetch sensor data to update Pump_Status
      const updated = await fetchSensorData();
      setSensorData(updated);
    } catch (e: unknown) {
      setPumpError(e instanceof Error ? e.message : "Unable to update pump.");
    } finally {
      setPumpLoading(false);
    }
  };

  const dismissAlert = (id: string) =>
    setDismissedAlerts((prev) => (prev.includes(id) ? prev : [...prev, id]));

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 md:p-8 space-y-6">
      {/* ── Page Title ── */}
      <div>
        <h1 className="text-3xl font-black tracking-tight text-white">
          Field Analytics
        </h1>
      </div>

      {/* ── Stat Cards Row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {sensorLoading ? (
          <div className="col-span-3 text-center py-8 text-zinc-400">Loading sensor data...</div>
        ) : sensorError ? (
          <div className="col-span-3 text-center py-8 text-red-400">{sensorError}</div>
        ) : sensorData ? (
          <>
            <StatCard
              label="Soil Moisture"
              value={soilVal !== null ? soilVal.toString() : "--"}
              unit={soil?.Unit ?? "%"}
              badge={
                soilVal === null
                  ? "Unknown"
                  : soilVal > 60
                  ? "Optimal"
                  : soilVal > 40
                  ? "Moderate"
                  : "Low"
              }
              badgeColor={
                soilVal === null
                  ? "blue"
                  : soilVal > 60
                  ? "green"
                  : soilVal > 40
                  ? "amber"
                  : "blue"
              }
              trend={moistureTrend.length ? moistureTrend : undefined}
            />
            <StatCard
              label="Humidity"
              value={humidityVal !== null ? humidityVal.toString() : "--"}
              unit={humidity?.Unit ?? "%"}
              badge={
                humidityVal === null
                  ? "Unknown"
                  : humidityVal > 60
                  ? "High"
                  : humidityVal > 40
                  ? "Stable"
                  : "Low"
              }
              badgeColor={humidityVal !== null && humidityVal > 60 ? "amber" : "green"}
              sub={"Live"}
            />
            <StatCard
              label="Temperature"
              value={temperatureVal !== null ? temperatureVal.toString() : "--"}
              unit={temperature?.Unit ?? "C"}
              badge={
                temperatureVal === null
                  ? "Unknown"
                  : temperatureVal > 30
                  ? "High"
                  : temperatureVal > 15
                  ? "Normal"
                  : "Low"
              }
              badgeColor={temperatureVal !== null && temperatureVal > 30 ? "amber" : "green"}
              highLow={{ high: "28°C", low: "19°C" }}
            />
          </>
        ) : null}
      </div>

      {/* ── Pump Control ── */}
      <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-5 mb-4 flex flex-col gap-3 max-w-xl">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-lg font-bold text-white">Pump Control</span>
          <Button
            variant="outline"
            size="sm"
            className="ml-auto bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700"
            onClick={refreshSensorData}
            disabled={sensorLoading}
          >
            Refresh Sensors
          </Button>
          {sensorData && (
            <Badge
              variant="outline"
              className={
                pumpVal === 1
                  ? "bg-emerald-900/40 text-emerald-300 border-emerald-700/40"
                  : "bg-zinc-800/40 text-zinc-300 border-zinc-700/40"
              }
            >
              {pumpVal === 1 ? "ON" : pumpVal === 0 ? "OFF" : "UNKNOWN"}
            </Badge>
          )}
        </div>
        <div className="flex gap-3">
          <Button
            className="bg-emerald-600 hover:bg-emerald-500 text-white"
            onClick={() => handlePump("ON")}
            disabled={pumpLoading || pumpVal === 1}
          >
            Turn ON
          </Button>
          <Button
            className="bg-zinc-700 hover:bg-zinc-600 text-white"
            onClick={() => handlePump("OFF")}
            disabled={pumpLoading || pumpVal === 0}
          >
            Turn OFF
          </Button>
        </div>
        {pumpLoading && <div className="text-xs text-zinc-400 mt-1">Updating pump status...</div>}
        {pumpError && <div className="text-xs text-red-400 mt-1">{pumpError}</div>}
      </div>

      {/* ── System Status / History / Health ── */}
      <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">System Diagnostics</h2>
          <Button
            variant="outline"
            size="sm"
            className="bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700"
            onClick={refreshSystemData}
            disabled={systemLoading}
          >
            Refresh System
          </Button>
        </div>
        {systemLoading ? (
          <div className="text-sm text-zinc-400">Loading system data...</div>
        ) : systemError ? (
          <div className="text-sm text-red-400">{systemError}</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="rounded-xl bg-zinc-800/60 border border-zinc-700/50 p-4">
              <p className="text-xs font-semibold tracking-widest text-zinc-500 uppercase mb-2">Health</p>
              <div className="space-y-1 text-xs text-zinc-200">
                <div>status: {String(healthRecord?.status ?? "unknown")}</div>
                <div>uptime: {typeof healthRecord?.uptime === "number" ? `${Math.round(healthRecord.uptime)}s` : "--"}</div>
                <div>timestamp: {String(healthRecord?.timestamp ?? "--")}</div>
              </div>
            </div>
            <div className="rounded-xl bg-zinc-800/60 border border-zinc-700/50 p-4">
              <p className="text-xs font-semibold tracking-widest text-zinc-500 uppercase mb-2">Status</p>
              <div className="space-y-1 text-xs text-zinc-200">
                <div>server: {String(statusRecord?.server ?? "--")}</div>
                <div>mqtt: {String(statusRecord?.mqtt ?? "--")}</div>
                <div>uptime: {typeof statusRecord?.uptime_sec === "number" ? `${statusRecord.uptime_sec}s` : "--"}</div>
                <div>timestamp: {String(statusRecord?.timestamp ?? "--")}</div>
              </div>
            </div>
            <div className="rounded-xl bg-zinc-800/60 border border-zinc-700/50 p-4">
              <p className="text-xs font-semibold tracking-widest text-zinc-500 uppercase mb-2">History</p>
              <div className="space-y-1 text-xs text-zinc-200">
                <div>count: {historyCount}</div>
                <div>latest soil: {latestHistory?.soil_moisture ?? "--"}%</div>
                <div>latest temp: {latestHistory?.temperature ?? "--"}C</div>
                <div>latest humidity: {latestHistory?.humidity ?? "--"}%</div>
                <div>latest light: {latestHistory?.light ?? "--"} Lux</div>
                <div>latest pump: {latestHistory?.pump_status ?? "--"}</div>
                <div>latest time: {String(latestHistory?.timestamp ?? "--")}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Main Content: Chart + Alerts ── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6">
        {/* Left: Chart + Table */}
        <div className="space-y-6">
          {/* Correlation Chart */}
          <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-5">
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-base font-bold text-white">
                Recent Correlation Analysis
              </h2>
              <div className="flex items-center gap-3 text-[11px] text-zinc-400">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" /> Moisture
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-sky-400" /> Humidity
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-amber-400" /> Temp
                </span>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "#71717a", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis tick={{ fill: "#52525b", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Line
                  type="monotone"
                  dataKey="moisture"
                  stroke="#34d399"
                  strokeWidth={2}
                  dot={false}
                  name="Moisture"
                />
                <Line
                  type="monotone"
                  dataKey="humidity"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  dot={false}
                  strokeDasharray="5 3"
                  name="Humidity"
                />
                <Line
                  type="monotone"
                  dataKey="temp"
                  stroke="#fbbf24"
                  strokeWidth={1.5}
                  dot={false}
                  strokeDasharray="3 4"
                  name="Temp"
                />
              </LineChart>
            </ResponsiveContainer>

            <div className="mt-3 rounded-lg bg-zinc-800/60 border border-zinc-700/40 px-4 py-3">
              <p className="text-sm text-zinc-300 leading-relaxed">
                <span className="text-emerald-400 font-semibold italic">Latest recommendation: </span>
                {latestHistory?.recommendation ?? "No recommendation available."}
              </p>
            </div>
          </div>

          {/* Recent Sensor History */}
          <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-white">Recent Sensor History</h2>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700 text-xs"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Filter
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] text-zinc-600 uppercase tracking-widest border-b border-zinc-800">
                    {[
                      "Timestamp",
                      "Soil",
                      "Humidity",
                      "Temp",
                      "Light",
                      "Pump",
                      "Recommendation",
                    ].map((h) => (
                      <th key={h} className="text-left pb-3 pr-4 font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {normalizedHistory.slice(0, historyVisibleCount).map((entry, i) => (
                    <tr
                      key={entry.timestamp ?? i}
                      className={cn(
                        "border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors",
                        i === Math.min(normalizedHistory.length, historyVisibleCount) - 1 && "border-b-0"
                      )}
                    >
                      <td className="py-4 pr-4 text-zinc-300 text-xs">
                        {entry.timestamp ? new Date(entry.timestamp).toLocaleString() : "--"}
                      </td>
                      <td className="py-4 pr-4 text-zinc-200">{entry.soil_moisture ?? "--"}%</td>
                      <td className="py-4 pr-4 text-zinc-200">{entry.humidity ?? "--"}%</td>
                      <td className="py-4 pr-4 text-zinc-200">{entry.temperature ?? "--"}C</td>
                      <td className="py-4 pr-4 text-zinc-200">{entry.light ?? "--"} Lux</td>
                      <td className="py-4 pr-4 text-zinc-200">{entry.pump_status ?? "--"}</td>
                      <td className="py-4 text-zinc-400 text-xs">
                        {entry.recommendation ?? "--"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {normalizedHistory.length > historyVisibleCount ? (
              <div className="mt-4 flex justify-center">
                <Button
                  variant="outline"
                  className="bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700"
                  onClick={() => setHistoryVisibleCount((prev) => prev + 8)}
                >
                  Load more
                </Button>
              </div>
            ) : null}
          </div>
        </div>

        {/* Right: Alerts + Map */}
        <div className="space-y-4">
          {/* Alerts Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-emerald-400" />
              <h2 className="text-base font-bold text-white">Automated Alerts</h2>
            </div>
            <button className="h-8 w-8 rounded-full bg-emerald-600 hover:bg-emerald-500 flex items-center justify-center transition-colors shadow-[0_0_12px_#10b98166]">
              <Plus className="h-4 w-4 text-white" />
            </button>
          </div>

          {/* Alert Cards */}
          <div className="space-y-3">
            {alerts.length === 0 ? (
              <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-6 text-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm text-zinc-400">All clear — no active alerts</p>
              </div>
            ) : (
              alerts.map((alert) => (
                <AlertCard key={alert.id} alert={alert} onDismiss={dismissAlert} />
              ))
            )}
          </div>

        </div>
      </div>
    </div>
  );
}