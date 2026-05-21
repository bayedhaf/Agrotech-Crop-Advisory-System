"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, type User } from "firebase/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Upload,
  Camera,
  ZoomIn,
  Grid3x3,
  Info,
  Plus,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  RefreshCw,
  Loader2,
  FlaskConical,
  Cpu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { auth } from "@/lib/firebase";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ScanHistoryItem {
  id: string;
  imageUrl?: string;
  disease?: string;
  createdAt?: string;
  source?: "api" | "local";
  selected?: boolean;
  payload?: DiagnoseResponse;
}

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

interface DiagnosticFinding {
  id: string;
  status: "critical" | "ok" | "warning";
  title: string;
  description: string;
}

interface TreatmentStep {
  step: number;
  title: string;
  description: string;
  active?: boolean;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function VitalityMeter({ value }: { value: number }) {
  const segments = 3;
  const filled = Math.round((value / 100) * segments);

  return (
    <div className="flex gap-1.5 mt-2">
      {Array.from({ length: segments }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "h-1.5 flex-1 rounded-full transition-all duration-700",
            i < filled ? "bg-emerald-400 shadow-[0_0_6px_#34d399]" : "bg-zinc-700"
          )}
        />
      ))}
    </div>
  );
}

function FindingRow({ finding }: { finding: DiagnosticFinding }) {
  const dot =
    finding.status === "critical"
      ? "bg-red-500 shadow-[0_0_6px_#ef4444]"
      : finding.status === "warning"
      ? "bg-amber-400 shadow-[0_0_6px_#fbbf24]"
      : "bg-emerald-400 shadow-[0_0_6px_#34d399]";

  return (
    <div className="flex items-start gap-3 py-1">
      <span className={cn("mt-1.5 h-2.5 w-2.5 rounded-full flex-shrink-0", dot)} />
      <div>
        <p className="text-sm font-semibold text-zinc-100">{finding.title}</p>
        <p className="text-xs text-zinc-400 leading-relaxed">{finding.description}</p>
      </div>
    </div>
  );
}

function TreatmentCard({ step }: { step: TreatmentStep }) {
  return (
    <div
      className={cn(
        "rounded-lg p-4 border-l-2 transition-all",
        step.active
          ? "bg-zinc-800/80 border-l-emerald-500"
          : "bg-zinc-800/40 border-l-zinc-700"
      )}
    >
      <p className="text-sm font-semibold text-zinc-100">{step.title}</p>
      <p className={cn("text-xs mt-0.5 leading-relaxed", step.active ? "text-emerald-400 italic" : "text-zinc-400")}>
        {step.description}
      </p>
    </div>
  );
}

function ThumbnailCard({
  item,
  isEmpty,
  onSelect,
}: {
  item?: ScanHistoryItem;
  isEmpty?: boolean;
  onSelect?: () => void;
}) {
  if (isEmpty) {
    return (
      <button className="h-16 w-24 rounded-lg border border-dashed border-zinc-600 flex items-center justify-center hover:border-emerald-500 transition-colors group">
        <Plus className="h-5 w-5 text-zinc-500 group-hover:text-emerald-400 transition-colors" />
      </button>
    );
  }

  return (
    <button
      className={cn(
        "relative h-16 w-24 rounded-lg overflow-hidden cursor-pointer ring-2 transition-all",
        item?.selected
          ? "ring-emerald-500 shadow-[0_0_12px_#10b981aa]"
          : "ring-transparent hover:ring-zinc-500"
      )}
      onClick={onSelect}
      type="button"
    >
      {item?.imageUrl ? (
        <img
          src={item.imageUrl}
          alt={item.disease || "Crop scan"}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="w-full h-full bg-zinc-700 flex items-center justify-center">
          <div className="text-zinc-500 text-xs">IMG</div>
        </div>
      )}
      {item?.selected && (
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
        </div>
      )}
    </button>
  );
}

const API_BASE = "https://smart-agriculture-backend-2nk0.onrender.com";
const LOCAL_HISTORY_KEY = "diagnose-history-v1";

const toIsoString = (value?: string) => {
  if (!value) {
    return undefined;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
};

const extractHistoryItems = (payload: unknown): DiagnoseResponse[] => {
  if (Array.isArray(payload)) {
    return payload as DiagnoseResponse[];
  }
  if (!payload || typeof payload !== "object") {
    return [];
  }
  const record = payload as Record<string, unknown>;
  const candidates = [record.data, record.items, record.history, record.results];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate as DiagnoseResponse[];
    }
  }
  return [];
};

const normalizeHistoryItem = (
  entry: DiagnoseResponse,
  source: "api" | "local"
): ScanHistoryItem | null => {
  const id = String(entry.id ?? entry._id ?? entry.diagnosisId ?? entry.resultId ?? "").trim();
  if (!id) {
    return null;
  }
  return {
    id,
    imageUrl: entry.imageUrl ?? entry.image ?? undefined,
    disease: entry.disease ?? (entry.status ? String(entry.status) : undefined),
    createdAt: toIsoString(entry.createdAt ?? entry.created_at),
    source,
  };
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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchWithRetry = async (input: RequestInfo, init: RequestInit, retries = 1) => {
  let attempt = 0;
  let response = await fetch(input, init);
  while (response.status === 429 && attempt < retries) {
    const delay = 1000 * (attempt + 1);
    await sleep(delay);
    attempt += 1;
    response = await fetch(input, init);
  }
  return response;
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AIDiagnosticPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [activeCamera, setActiveCamera] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [diagnosis, setDiagnosis] = useState<DiagnoseResponse | null>(null);
  const [findings, setFindings] = useState<DiagnosticFinding[]>([]);
  const [treatments, setTreatments] = useState<TreatmentStep[]>([]);
  const [history, setHistory] = useState<ScanHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

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
    return () => {
      stopCamera();
    };
  }, []);

  useEffect(() => {
    if (!activeCamera) {
      stopCamera();
      return;
    }

    setCameraError(null);
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" } })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
        }
      })
      .catch(() => {
        setCameraError("Camera access denied or unavailable.");
        setActiveCamera(false);
      });
  }, [activeCamera]);

  useEffect(() => {
    return () => {
      if (selectedImage?.startsWith("blob:")) {
        URL.revokeObjectURL(selectedImage);
      }
    };
  }, [selectedImage]);

  const handleUploadClick = () => {
    setActiveCamera(false);
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    setSelectedFile(file);
    setSelectedImage(URL.createObjectURL(file));
    setScanError(null);
    setScanProgress(0);
    event.target.value = "";
  };

  const handleToggleCamera = () => {
    setSelectedImage(null);
    setSelectedFile(null);
    setScanProgress(0);
    setActiveCamera((prev) => !prev);
  };

  const captureFromCamera = async () => {
    if (!videoRef.current) {
      setCameraError("Camera is not ready.");
      return;
    }
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setCameraError("Unable to capture image.");
      return;
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.92)
    );
    if (!blob) {
      setCameraError("Unable to capture image.");
      return;
    }
    const file = new File([blob], `capture-${Date.now()}.jpg`, {
      type: blob.type || "image/jpeg",
    });
    setSelectedFile(file);
    setSelectedImage(URL.createObjectURL(blob));
    setScanProgress(0);
    setActiveCamera(false);
    setCameraError(null);
  };

  const loadLocalHistory = () => {
    if (typeof window === "undefined") {
      return [] as ScanHistoryItem[];
    }
    const stored = window.localStorage.getItem(LOCAL_HISTORY_KEY);
    if (!stored) {
      return [];
    }
    try {
      const parsed = JSON.parse(stored) as ScanHistoryItem[];
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed;
    } catch {
      return [];
    }
  };

  const saveLocalHistory = (items: ScanHistoryItem[]) => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(LOCAL_HISTORY_KEY, JSON.stringify(items));
  };

  const mergeHistory = (apiItems: ScanHistoryItem[], localItems: ScanHistoryItem[]) => {
    const byId = new Map<string, ScanHistoryItem>();
    [...localItems, ...apiItems].forEach((item) => {
      byId.set(item.id, item);
    });
    return Array.from(byId.values()).sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });
  };

  const fetchHistory = async (currentUser: User) => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const token = await currentUser.getIdToken();
      console.info("[diagnose] history request", {
        url: `${API_BASE}/api/v1/diagnose/history`,
      });
      const response = await fetchWithRetry(`${API_BASE}/api/v1/diagnose/history`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      console.info("[diagnose] history response", {
        status: response.status,
        ok: response.ok,
      });
      if (response.status === 429) {
        throw new Error("Rate limited. Please wait and try again.");
      }
      if (!response.ok) {
        throw new Error(`Failed to load history (${response.status})`);
      }
      const payload = (await response.json()) as unknown;
      const apiEntries = extractHistoryItems(payload)
        .map((entry) => normalizeHistoryItem(entry, "api"))
        .filter((item): item is ScanHistoryItem => item !== null);
      const localItems = loadLocalHistory();
      const merged = mergeHistory(apiEntries, localItems);
      setHistory(merged);
    } catch (error) {
      console.error("[diagnose] history error", error);
      setHistoryError(error instanceof Error ? error.message : "Unable to load history.");
    } finally {
      setHistoryLoading(false);
    }
  };

  const loadDiagnosisById = async (id: string) => {
    if (!user) {
      return;
    }
    const cached = history.find((item) => item.id === id);
    if (cached?.imageUrl) {
      setSelectedImage(cached.imageUrl);
    }
    if (cached?.payload) {
      setSelectedFile(null);
      setActiveCamera(false);
      setSelectedHistoryId(id);
      setScanError(null);
      setDiagnosis(cached.payload);
      setFindings(normalizeFindings(cached.payload));
      setTreatments(normalizeTreatments(cached.payload));
      return;
    }
    setSelectedFile(null);
    setActiveCamera(false);
    setSelectedHistoryId(id);
    setScanError(null);
    try {
      const token = await user.getIdToken();
      console.info("[diagnose] detail request", {
        url: `${API_BASE}/api/v1/diagnose/${id}`,
      });
      const response = await fetch(`${API_BASE}/api/v1/diagnose/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      console.info("[diagnose] detail response", {
        status: response.status,
        ok: response.ok,
      });
      if (!response.ok) {
        throw new Error(`Failed to load diagnosis (${response.status})`);
      }
      const rawPayload = (await response.json()) as unknown;
      const payload = extractDiagnosisPayload(rawPayload);
      setDiagnosis(payload);
      setFindings(normalizeFindings(payload));
      setTreatments(normalizeTreatments(payload));
    } catch (error) {
      console.error("[diagnose] detail error", error);
      setScanError(error instanceof Error ? error.message : "Unable to load diagnosis.");
    }
  };

  const handleDeleteHistory = async (id: string) => {
    if (!user) {
      return;
    }
    setHistoryError(null);
    try {
      const token = await user.getIdToken();
      console.info("[diagnose] delete request", {
        url: `${API_BASE}/api/v1/diagnose/${id}`,
      });
      const response = await fetch(`${API_BASE}/api/v1/diagnose/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      console.info("[diagnose] delete response", {
        status: response.status,
        ok: response.ok,
      });
      if (!response.ok) {
        throw new Error(`Failed to delete history (${response.status})`);
      }
      const localItems = loadLocalHistory().filter((item) => item.id !== id);
      saveLocalHistory(localItems);
      setHistory((prev) => prev.filter((item) => item.id !== id));
      if (selectedHistoryId === id) {
        setSelectedHistoryId(null);
      }
    } catch (error) {
      console.error("[diagnose] delete error", error);
      setHistoryError(error instanceof Error ? error.message : "Unable to delete history.");
    }
  };

  const handleDiagnose = async () => {
    if (!selectedFile) {
      setScanError("Please upload or capture an image first.");
      return;
    }
    if (!user) {
      return;
    }
    setIsSubmitting(true);
    setScanError(null);
    setScanProgress(15);
    try {
      const token = await user.getIdToken();
      const formData = new FormData();
      formData.append("image", selectedFile);
      console.info("[diagnose] submit request", {
        url: `${API_BASE}/api/v1/diagnose`,
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        fileType: selectedFile.type,
      });
      const response = await fetch(`${API_BASE}/api/v1/diagnose`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
      setScanProgress(70);
      console.info("[diagnose] submit response", {
        status: response.status,
        ok: response.ok,
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Diagnosis failed (${response.status})`);
      }
      const rawPayload = (await response.json()) as unknown;
      const payload = extractDiagnosisPayload(rawPayload);
      setScanProgress(100);
      setDiagnosis(payload);
      const normalizedFindings = normalizeFindings(payload);
      const normalizedTreatments = normalizeTreatments(payload);
      setFindings(normalizedFindings);
      setTreatments(normalizedTreatments);

      const normalizedItem = normalizeHistoryItem(payload, "local");
      const historyItem: ScanHistoryItem = normalizedItem
        ? { ...normalizedItem, payload }
        : {
            id: `${Date.now()}`,
            imageUrl: selectedImage ?? undefined,
            disease: payload.disease ?? payload.status ?? "Diagnosis",
            createdAt: new Date().toISOString(),
            source: "local",
            payload,
          };
      const localItems = [historyItem, ...loadLocalHistory()];
      saveLocalHistory(localItems);
      setHistory((prev) => mergeHistory(prev, [historyItem]));
      setSelectedHistoryId(historyItem.id);
    } catch (error) {
      console.error("[diagnose] submit error", error);
      setScanProgress(0);
      setScanError(error instanceof Error ? error.message : "Diagnosis failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (user) {
      void fetchHistory(user);
    }
  }, [user]);

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading scan workspace...
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
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans p-6 md:p-8">
      {/* ── Page Header ── */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Image Analysis
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Upload or capture high-resolution crop imagery for deep neural
          processing.
        </p>
      </div>

      {/* ── Two-column layout ── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6">
        {/* ── Left Column: Upload + Preview ── */}
        <div className="space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          {/* Upload / Camera Buttons */}
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              className="flex-1 sm:flex-none gap-2 bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700 hover:text-white"
              onClick={handleUploadClick}
              disabled={isSubmitting}
            >
              <Upload className="h-4 w-4" />
              Upload Image
            </Button>
            <Button
              className={cn(
                "flex-1 sm:flex-none gap-2 transition-all",
                activeCamera
                  ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-[0_0_20px_#10b98166]"
                  : "bg-emerald-600 hover:bg-emerald-500 text-white"
              )}
              onClick={handleToggleCamera}
              disabled={isSubmitting}
            >
              <Camera className="h-4 w-4" />
              {activeCamera ? "Stop Camera" : "Active Camera"}
            </Button>
            {activeCamera ? (
              <Button
                variant="outline"
                className="flex-1 sm:flex-none gap-2 bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700 hover:text-white"
                onClick={captureFromCamera}
                disabled={isSubmitting}
              >
                <Camera className="h-4 w-4" />
                Capture Frame
              </Button>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-500 text-white"
              onClick={handleDiagnose}
              disabled={isSubmitting || !selectedFile}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              {isSubmitting ? "Running Diagnosis" : "Run Diagnosis"}
            </Button>
            <Button
              variant="outline"
              className="flex-1 sm:flex-none gap-2 bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700 hover:text-white"
              onClick={() => fetchHistory(user)}
              disabled={historyLoading}
            >
              <RefreshCw className={cn("h-4 w-4", historyLoading && "animate-spin")} />
              Refresh History
            </Button>
          </div>

          {scanProgress > 0 ? (
            <Progress value={scanProgress} className="bg-zinc-800" />
          ) : null}

          {scanError ? (
            <div className="flex items-center gap-2 text-sm text-red-300 bg-red-950/40 border border-red-800/50 rounded-lg px-3 py-2">
              <AlertTriangle className="h-4 w-4" />
              {scanError}
            </div>
          ) : null}

          {/* Camera Preview */}
          <div className="relative rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800 min-h-[320px] md:min-h-[400px]">
            <div className="absolute inset-0">
              {activeCamera ? (
                <video
                  ref={videoRef}
                  className="h-full w-full object-cover"
                  muted
                  playsInline
                />
              ) : selectedImage ? (
                <img
                  src={selectedImage}
                  alt="Uploaded crop"
                  className="h-full w-full object-cover"
                />
              ) : (
                <>
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        "radial-gradient(ellipse at 40% 50%, #1a3a1a 0%, #0d1f0d 60%, #0a1208 100%)",
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center opacity-30">
                    <div className="w-64 h-48 rounded-[60%_40%_55%_45%/40%_60%_40%_60%] bg-emerald-900 blur-sm rotate-12" />
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center opacity-20">
                    <div className="w-80 h-56 rounded-[50%_50%_60%_40%/60%_40%_60%_40%] bg-emerald-800 blur-md -rotate-6" />
                  </div>
                </>
              )}
            </div>

            {cameraError ? (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <p className="text-sm text-red-300">{cameraError}</p>
              </div>
            ) : null}

            {/* Scan overlay box */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="relative border-2 border-emerald-400/80 rounded-md w-56 h-40 shadow-[0_0_20px_#34d39966]">
                {/* Corner accents */}
                <span className="absolute -top-0.5 -left-0.5 h-4 w-4 border-t-2 border-l-2 border-emerald-400 rounded-tl-sm" />
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 border-t-2 border-r-2 border-emerald-400 rounded-tr-sm" />
                <span className="absolute -bottom-0.5 -left-0.5 h-4 w-4 border-b-2 border-l-2 border-emerald-400 rounded-bl-sm" />
                <span className="absolute -bottom-0.5 -right-0.5 h-4 w-4 border-b-2 border-r-2 border-emerald-400 rounded-br-sm" />

                {/* Scan label */}
                <div className="absolute -top-8 left-0 bg-emerald-500/90 text-white text-xs font-bold px-3 py-1 rounded backdrop-blur-sm">
                  {isSubmitting
                    ? "SCANNING..."
                    : diagnosis?.disease || diagnosis?.status
                    ? `RESULT: ${diagnosis.disease ?? diagnosis.status}`
                    : "READY FOR SCAN"}
                </div>

                {/* Scan line animation */}
                <div className="absolute inset-x-0 h-0.5 bg-emerald-400/60 animate-[scanline_2s_ease-in-out_infinite] shadow-[0_0_8px_#34d399]" />
              </div>
            </div>

            {/* Bottom Controls Bar */}
            <div className="absolute bottom-0 inset-x-0 bg-black/70 backdrop-blur-sm px-4 py-3 flex items-center gap-6">
              <div className="flex-1">
                <p className="text-xs text-zinc-400 mb-1">Exposure</p>
                <div className="h-1 w-28 rounded-full bg-zinc-700 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-400"
                    style={{ width: "55%" }}
                  />
                </div>
              </div>
              <div>
                <p className="text-xs text-zinc-400">Focus Mode</p>
                <p className="text-sm font-semibold text-white">Auto Macro</p>
              </div>
              <div className="flex items-center gap-3 ml-auto">
                <button className="p-1.5 rounded-full hover:bg-zinc-700 transition-colors text-zinc-400 hover:text-white">
                  <ZoomIn className="h-5 w-5" />
                </button>
                <button className="p-1.5 rounded-full hover:bg-zinc-700 transition-colors text-zinc-400 hover:text-white">
                  <Grid3x3 className="h-5 w-5" />
                </button>
                <button className="p-1.5 rounded-full hover:bg-zinc-700 transition-colors text-zinc-400 hover:text-white">
                  <Info className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Recent Uploads */}
          <div>
            <p className="text-xs font-semibold tracking-widest text-zinc-500 uppercase mb-3">
              Recent Uploads
            </p>
            <div className="flex gap-3 flex-wrap">
              {history.slice(0, 4).map((item) => (
                <ThumbnailCard
                  key={item.id}
                  item={{ ...item, selected: item.id === selectedHistoryId }}
                  onSelect={() => loadDiagnosisById(item.id)}
                />
              ))}
              {history.length === 0 ? <ThumbnailCard isEmpty /> : null}
            </div>
          </div>
        </div>

        {/* ── Right Column: Diagnostic Results ── */}
        <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-5 space-y-5 h-fit">
          <h2 className="text-lg font-bold tracking-tight text-white">
            Diagnostic Results
          </h2>

          {/* Vitality Index Card */}
          <div className="rounded-xl bg-zinc-800/60 border border-zinc-700/50 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold tracking-widest text-zinc-500 uppercase">
                Vitality Index
              </span>
              <Badge variant="outline" className={vitalityBadgeClass}>
                {vitalityBadge}
              </Badge>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-5xl font-black text-emerald-400 leading-none">
                {vitality !== null ? `${vitality}%` : "--"}
              </span>
              <span className="text-sm text-zinc-400 mb-1">
                {vitality !== null ? "Live Score" : "Awaiting scan"}
              </span>
            </div>
            <VitalityMeter value={vitality ?? 0} />
          </div>

          <Separator className="bg-zinc-800" />

          {/* Findings */}
          <div className="space-y-3">
            {findings.length === 0 ? (
              <p className="text-xs text-zinc-500">No findings yet. Run a scan to view results.</p>
            ) : (
              findings.map((f) => <FindingRow key={f.id} finding={f} />)
            )}
          </div>

          <Separator className="bg-zinc-800" />

          {/* Treatment Protocol */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <FlaskConical className="h-4 w-4 text-amber-400" />
              <p className="text-sm font-bold text-zinc-100">
                Treatment Protocol
              </p>
            </div>
            <div className="space-y-2">
              {treatments.length === 0 ? (
                <p className="text-xs text-zinc-500">No treatment steps available.</p>
              ) : (
                treatments.map((t) => <TreatmentCard key={t.step} step={t} />)
              )}
            </div>
          </div>

          <Separator className="bg-zinc-800" />

          {/* System Telemetry */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold tracking-widest text-zinc-600 uppercase">
                System Telemetry
              </p>
              <Cpu className="h-3.5 w-3.5 text-zinc-600" />
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="bg-zinc-800/40 rounded-lg p-2.5">
                <p className="text-zinc-600 uppercase tracking-wider text-[10px] mb-0.5">
                  Model
                </p>
                <p className="text-zinc-300 font-mono font-semibold">
                  {diagnosis?.model ?? "API"}
                </p>
              </div>
              <div className="bg-zinc-800/40 rounded-lg p-2.5">
                <p className="text-zinc-600 uppercase tracking-wider text-[10px] mb-0.5">
                  Confidence
                </p>
                <p className="text-zinc-300 font-mono font-semibold">
                  {typeof diagnosis?.confidence === "number"
                    ? `${Math.round(diagnosis.confidence * 100)}%`
                    : "--"}
                </p>
              </div>
              <div className="bg-zinc-800/40 rounded-lg p-2.5">
                <p className="text-zinc-600 uppercase tracking-wider text-[10px] mb-0.5">
                  Latency
                </p>
                <p className="text-zinc-300 font-mono font-semibold">
                  {typeof diagnosis?.latencyMs === "number"
                    ? `${Math.round(diagnosis.latencyMs)}ms`
                    : "--"}
                </p>
              </div>
            </div>
          </div>

          {/* Generate Report CTA */}
          <Button
            className="w-full gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-[0_0_24px_#10b98133] hover:shadow-[0_0_32px_#10b98155] transition-all"
            disabled={!diagnosis}
          >
            <FileText className="h-4 w-4" />
            Generate Full Report
          </Button>
        </div>
      </div>

      {/* ── Scan line keyframe (injected via style tag) ── */}
      <style>{`
        @keyframes scanline {
          0%   { top: 10%; }
          50%  { top: 85%; }
          100% { top: 10%; }
        }
      `}</style>
    </div>
  );
}