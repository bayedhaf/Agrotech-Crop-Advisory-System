"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { onAuthStateChanged, type User } from "firebase/auth";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { auth } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import { AlertTriangle, ArrowLeft, Loader2 } from "lucide-react";

type DiagnoseResponse = Record<string, unknown> & {
  id?: string;
  _id?: string;
  diagnosisId?: string;
  resultId?: string;
  disease?: string;
  status?: string;
  severity?: string;
  confidence?: number;
  findings?: Array<{ title?: string; description?: string; status?: string }>;
  treatments?: Array<{ title?: string; description?: string }>;
  recommendations?: Array<{ title?: string; description?: string }>;
  treatmentSteps?: Array<{ title?: string; description?: string }>;
  vitality?: number;
  healthScore?: number;
  imageUrl?: string;
  image?: string;
  createdAt?: string;
  created_at?: string;
  model?: string;
  latencyMs?: number;
};

type DiagnosticFinding = {
  id: string;
  status: "critical" | "ok" | "warning";
  title: string;
  description: string;
};

type TreatmentStep = {
  step: number;
  title: string;
  description: string;
  active?: boolean;
};

const API_BASE = "";
const LOCAL_HISTORY_KEY = "diagnose-history-v1";

const loadLocalHistory = (): Array<{ id: string; payload?: DiagnoseResponse }> => {
  if (typeof window === "undefined") {
    return [];
  }
  const stored = window.localStorage.getItem(LOCAL_HISTORY_KEY);
  if (!stored) {
    return [];
  }
  try {
    const parsed = JSON.parse(stored) as Array<{ id?: string; payload?: DiagnoseResponse }>;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .filter((item) => typeof item?.id === "string")
      .map((item) => ({ id: String(item.id), payload: item.payload }));
  } catch {
    return [];
  }
};

const normalizeFindings = (entry: DiagnoseResponse | null): DiagnosticFinding[] => {
  if (!entry) {
    return [];
  }
  if (Array.isArray(entry.findings)) {
    return entry.findings.map((finding, index) => ({
      id: String(index + 1),
      status:
        finding.status === "critical" || finding.status === "warning" || finding.status === "ok"
          ? finding.status
          : "warning",
      title: finding.title ?? "Diagnostic finding",
      description: finding.description ?? "No details provided.",
    }));
  }
  if (entry.disease || entry.status) {
    return [
      {
        id: "1",
        status: entry.severity === "critical" ? "critical" : entry.severity === "ok" ? "ok" : "warning",
        title: entry.disease ?? entry.status ?? "Diagnosis result",
        description:
          typeof entry.confidence === "number"
            ? `Confidence: ${Math.round(entry.confidence * 100)}%`
            : "Confidence data unavailable.",
      },
    ];
  }
  return [];
};

const normalizeTreatments = (entry: DiagnoseResponse | null): TreatmentStep[] => {
  if (!entry) {
    return [];
  }
  const candidates =
    entry.treatments ??
    entry.recommendations ??
    (Array.isArray(entry.treatmentSteps) ? entry.treatmentSteps : undefined);
  if (!Array.isArray(candidates)) {
    return [];
  }
  return candidates.map((step, index) => ({
    step: index + 1,
    title: step.title ?? `Step ${index + 1}`,
    description: step.description ?? "No details provided.",
    active: index === 0,
  }));
};

const normalizeVitality = (entry: DiagnoseResponse | null) => {
  if (!entry) {
    return null;
  }
  const score =
    typeof entry.vitality === "number"
      ? entry.vitality
      : typeof entry.healthScore === "number"
      ? entry.healthScore
      : null;
  if (score === null) {
    return null;
  }
  const normalized = score <= 1 ? score * 100 : score;
  return Math.max(0, Math.min(100, Math.round(normalized)));
};

const extractDiagnosisPayload = (payload: unknown): DiagnoseResponse => {
  if (!payload || typeof payload !== "object") {
    return {} as DiagnoseResponse;
  }
  const record = payload as Record<string, unknown>;
  if (record.data && typeof record.data === "object") {
    return record.data as DiagnoseResponse;
  }
  return payload as DiagnoseResponse;
};

export default function HistoryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : String(params.id ?? "");
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [diagnosis, setDiagnosis] = useState<DiagnoseResponse | null>(null);
  const [findings, setFindings] = useState<DiagnosticFinding[]>([]);
  const [treatments, setTreatments] = useState<TreatmentStep[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        setIsAuthLoading(false);
        router.replace("/login");
        return;
      }
      setUser(currentUser);
      setIsAuthLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    const fetchDetail = async (currentUser: User, historyId: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const localMatch = loadLocalHistory().find((item) => item.id === historyId);
        if (localMatch?.payload) {
          setDiagnosis(localMatch.payload);
          setFindings(normalizeFindings(localMatch.payload));
          setTreatments(normalizeTreatments(localMatch.payload));
          return;
        }
        const token = await currentUser.getIdToken();
        const response = await fetch(`${API_BASE}/api/v1/diagnose/${historyId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!response.ok) {
          throw new Error(`Failed to load diagnosis (${response.status})`);
        }
        const rawPayload = (await response.json()) as unknown;
        const payload = extractDiagnosisPayload(rawPayload);
        setDiagnosis(payload);
        setFindings(normalizeFindings(payload));
        setTreatments(normalizeTreatments(payload));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load diagnosis.");
      } finally {
        setIsLoading(false);
      }
    };

    if (user && id) {
      void fetchDetail(user, id);
    }
  }, [id, user]);

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading diagnosis...
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const vitality = normalizeVitality(diagnosis);
  const vitalityBadge = vitality !== null && vitality < 50 ? "Action Required" : "Monitoring";
  const vitalityBadgeClass =
    vitality !== null && vitality < 50
      ? "text-xs bg-red-900/60 text-red-300 border border-red-700/50 hover:bg-red-900/60"
      : "text-xs bg-emerald-900/40 text-emerald-300 border border-emerald-700/40 hover:bg-emerald-900/40";

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 md:p-8">
      <div className="flex items-center justify-between gap-4 mb-6">
        <Link
          href="/dashboard/history"
          className="flex items-center gap-2 text-sm text-zinc-300 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to history
        </Link>
        <Button variant="outline" className="bg-zinc-900 border-zinc-700 text-zinc-200">
          Download report
        </Button>
      </div>

      {error ? (
        <div className="mb-4 flex items-center gap-2 text-sm text-red-300 bg-red-950/40 border border-red-800/50 rounded-lg px-3 py-2">
          <AlertTriangle className="h-4 w-4" />
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-semibold text-white">{diagnosis?.disease ?? "Diagnosis"}</h1>
              <p className="text-sm text-zinc-400">
                {diagnosis?.createdAt || diagnosis?.created_at
                  ? new Date(String(diagnosis.createdAt ?? diagnosis.created_at)).toLocaleString()
                  : "Timestamp unavailable"}
              </p>
            </div>
            {diagnosis?.severity ? (
              <Badge variant="outline" className="text-xs border-amber-700/40 text-amber-300">
                {diagnosis.severity}
              </Badge>
            ) : null}
          </div>

          <div className="aspect-[16/10] rounded-xl bg-zinc-800 overflow-hidden mb-4">
            {(diagnosis?.imageUrl || diagnosis?.image) && (
              <img
                src={(diagnosis.imageUrl ?? diagnosis.image) as string}
                alt={diagnosis?.disease || "Diagnosis image"}
                className="h-full w-full object-cover"
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
              <p className="text-xs text-zinc-500 uppercase tracking-widest">Confidence</p>
              <p className="mt-2 text-lg font-semibold text-emerald-300">
                {typeof diagnosis?.confidence === "number"
                  ? `${Math.round(diagnosis.confidence * 100)}%`
                  : "--"}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
              <p className="text-xs text-zinc-500 uppercase tracking-widest">Vitality</p>
              <div className="mt-2 flex items-center gap-2">
                <p className="text-lg font-semibold text-emerald-300">
                  {vitality !== null ? `${vitality}%` : "--"}
                </p>
                <Badge variant="outline" className={vitalityBadgeClass}>
                  {vitalityBadge}
                </Badge>
              </div>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
              <p className="text-xs text-zinc-500 uppercase tracking-widest">Model</p>
              <p className="mt-2 text-sm font-semibold text-zinc-200">
                {diagnosis?.model ?? "API"}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
              <p className="text-xs text-zinc-500 uppercase tracking-widest">Latency</p>
              <p className="mt-2 text-sm font-semibold text-zinc-200">
                {typeof diagnosis?.latencyMs === "number" ? `${Math.round(diagnosis.latencyMs)}ms` : "--"}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
            <h2 className="text-lg font-semibold text-zinc-100 mb-3">Findings</h2>
            <Separator className="bg-zinc-800 mb-3" />
            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading findings...
              </div>
            ) : findings.length === 0 ? (
              <p className="text-xs text-zinc-500">No findings available.</p>
            ) : (
              <div className="space-y-3">
                {findings.map((finding) => (
                  <div key={finding.id} className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
                    <p className="text-sm font-semibold text-zinc-100">{finding.title}</p>
                    <p className="text-xs text-zinc-400 mt-1">{finding.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
            <h2 className="text-lg font-semibold text-zinc-100 mb-3">Treatments</h2>
            <Separator className="bg-zinc-800 mb-3" />
            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading treatments...
              </div>
            ) : treatments.length === 0 ? (
              <p className="text-xs text-zinc-500">No treatment steps available.</p>
            ) : (
              <div className="space-y-3">
                {treatments.map((step) => (
                  <div
                    key={step.step}
                    className={cn(
                      "rounded-lg border border-zinc-800 bg-zinc-950/50 p-3",
                      step.active && "border-emerald-600/60"
                    )}
                  >
                    <p className="text-sm font-semibold text-zinc-100">{step.title}</p>
                    <p className="text-xs text-zinc-400 mt-1">{step.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
