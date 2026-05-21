"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, type User } from "firebase/auth";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { auth } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import { AlertTriangle, Loader2, RefreshCw, Trash2 } from "lucide-react";

type DiagnoseResponse = Record<string, unknown> & {
	id?: string;
	_id?: string;
	diagnosisId?: string;
	resultId?: string;
	disease?: string;
	status?: string;
	severity?: string;
	confidence?: number;
	imageUrl?: string;
	image?: string;
	createdAt?: string;
	created_at?: string;
};

type ScanHistoryItem = {
	id: string;
	imageUrl?: string;
	disease?: string;
	createdAt?: string;
	source?: "api" | "local";
	confidence?: number;
	severity?: string;
	payload?: DiagnoseResponse;
};

const API_BASE = "";
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
		confidence: entry.confidence,
		severity: entry.severity,
	};
};

const loadLocalHistory = (): ScanHistoryItem[] => {
	if (typeof window === "undefined") {
		return [];
	}
	const stored = window.localStorage.getItem(LOCAL_HISTORY_KEY);
	if (!stored) {
		return [];
	}
	try {
		const parsed = JSON.parse(stored) as ScanHistoryItem[];
		return Array.isArray(parsed) ? parsed : [];
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

export default function HistoryPage() {
	const router = useRouter();
	const [user, setUser] = useState<User | null>(null);
	const [isAuthLoading, setIsAuthLoading] = useState(true);
	const [history, setHistory] = useState<ScanHistoryItem[]>([]);
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

	const fetchHistory = async (currentUser: User) => {
		setIsLoading(true);
		setError(null);
		try {
			const token = await currentUser.getIdToken();
			const response = await fetchWithRetry(`${API_BASE}/api/v1/diagnose/history`, {
				headers: {
					Authorization: `Bearer ${token}`,
				},
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
			setHistory(mergeHistory(apiEntries, localItems));
		} catch (err) {
			setError(err instanceof Error ? err.message : "Unable to load history.");
		} finally {
			setIsLoading(false);
		}
	};

	const handleDelete = async (id: string) => {
		if (!user) {
			return;
		}
		setError(null);
		try {
			const token = await user.getIdToken();
			const response = await fetch(`${API_BASE}/api/v1/diagnose/${id}`, {
				method: "DELETE",
				headers: {
					Authorization: `Bearer ${token}`,
				},
			});
			if (!response.ok) {
				throw new Error(`Failed to delete history (${response.status})`);
			}
			const updatedLocal = loadLocalHistory().filter((item) => item.id !== id);
			saveLocalHistory(updatedLocal);
			setHistory((prev) => prev.filter((item) => item.id !== id));
		} catch (err) {
			setError(err instanceof Error ? err.message : "Unable to delete history.");
		}
	};

	useEffect(() => {
		if (user) {
			void fetchHistory(user);
		}
	}, [user]);

	const hasHistory = history.length > 0;
	const filteredHistory = useMemo(() => history, [history]);

	if (isAuthLoading) {
		return (
			<div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
				<div className="flex items-center gap-2 text-sm text-zinc-400">
					<Loader2 className="h-4 w-4 animate-spin" />
					Loading history...
				</div>
			</div>
		);
	}

	if (!user) {
		return null;
	}

	return (
		<div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 md:p-8">
			<header className="flex flex-wrap items-center justify-between gap-4 mb-6">
				<div>
					<h1 className="text-2xl font-semibold">Diagnosis History</h1>
					<p className="text-sm text-zinc-400">Review past crop scans and revisit detailed results.</p>
				</div>
				<Button
					variant="outline"
					className="gap-2 bg-zinc-900 border-zinc-700 text-zinc-200 hover:bg-zinc-800"
					onClick={() => fetchHistory(user)}
					disabled={isLoading}
				>
					<RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
					Refresh
				</Button>
			</header>

			{error ? (
				<div className="mb-4 flex items-center gap-2 text-sm text-red-300 bg-red-950/40 border border-red-800/50 rounded-lg px-3 py-2">
					<AlertTriangle className="h-4 w-4" />
					{error}
				</div>
			) : null}

			<div className="rounded-2xl border border-zinc-800 bg-zinc-900/60">
				<div className="flex items-center justify-between px-5 py-4">
					<p className="text-sm font-semibold text-zinc-200">Recent Diagnoses</p>
					<span className="text-xs text-zinc-500">{filteredHistory.length} entries</span>
				</div>
				<Separator className="bg-zinc-800" />

				{!hasHistory && !isLoading ? (
					<div className="px-5 py-12 text-center text-sm text-zinc-500">No history yet.</div>
				) : (
					<div className="divide-y divide-zinc-800">
						{filteredHistory.map((item) => (
							<div key={item.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
								<div className="h-14 w-20 rounded-lg overflow-hidden bg-zinc-800">
									{item.imageUrl ? (
										<img
											src={item.imageUrl}
											alt={item.disease || "Diagnosis"}
											className="h-full w-full object-cover"
										/>
									) : null}
								</div>
								<div className="flex-1 min-w-[200px]">
									<p className="text-sm font-semibold text-zinc-100">
										{item.disease ?? "Diagnosis"}
									</p>
									<p className="text-xs text-zinc-500">
										{item.createdAt ? new Date(item.createdAt).toLocaleString() : "Timestamp unavailable"}
									</p>
								</div>
								<div className="flex items-center gap-2">
									{typeof item.confidence === "number" ? (
										<Badge variant="outline" className="text-xs border-emerald-700/40 text-emerald-300">
											{Math.round(item.confidence * 100)}% confidence
										</Badge>
									) : null}
									{item.severity ? (
										<Badge
											variant="outline"
											className={cn(
												"text-xs",
												item.severity === "critical"
													? "border-red-700/50 text-red-300"
													: "border-amber-700/40 text-amber-300"
											)}
										>
											{item.severity}
										</Badge>
									) : null}
								</div>
								<div className="flex items-center gap-2">
									<Link
										href={`/dashboard/history/${item.id}`}
										className="text-xs font-semibold text-emerald-300 hover:text-emerald-200"
									>
										View details
									</Link>
									<Button
										variant="ghost"
										size="icon"
										className="text-zinc-400 hover:text-red-300"
										onClick={() => handleDelete(item.id)}
									>
										<Trash2 className="h-4 w-4" />
									</Button>
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
