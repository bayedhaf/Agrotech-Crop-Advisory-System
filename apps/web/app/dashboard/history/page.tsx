"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight, RotateCcw, Home, Camera, History as HistoryIcon, Settings as SettingsIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type CropType = "All" | "Maize" | "Tomato" | "Teff";

interface ScanHistoryItem {
    id: string;
    cropType: string;
    fieldName: string;
    condition: string;
    statusLabel: string;
    statusColor: string;
    confidence: number;
    timestamp: string;
    date: string;
    thumbnailUrl: string;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const mockScans: ScanHistoryItem[] = [
    {
        id: "1",
        cropType: "MAIZE",
        fieldName: "FIELD ALPHA",
        condition: "Blight Detected",
        statusLabel: "Blight",
        statusColor: "bg-[#8B1538] text-white",
        confidence: 84,
        timestamp: "2h\nago",
        date: "Today",
        thumbnailUrl: "/uploads/maize.png",
    },
    {
        id: "2",
        cropType: "TOMATO",
        fieldName: "WEST RIDGE",
        condition: "Optimal Condition",
        statusLabel: "Healthy",
        statusColor: "bg-[#2D5F3F] text-white",
        confidence: 99,
        timestamp: "Yesterday",
        date: "Yesterday",
        thumbnailUrl: "/uploads/tomatoes.png",
    },
    {
        id: "3",
        cropType: "TEFF",
        fieldName: "SOUTH BASIN",
        condition: "Rust Infection",
        statusLabel: "Rust",
        statusColor: "bg-[#B8860B] text-white",
        confidence: 76,
        timestamp: "3\ndays\nago",
        date: "MARCH 14, 2024",
        thumbnailUrl: "/uploads/teff.png",
    },
    {
        id: "4",
        cropType: "TOMATO",
        fieldName: "GREENHOUSE B",
        condition: "Mildew Warning",
        statusLabel: "Mildew",
        statusColor: "bg-[#2D5F3F] text-white",
        confidence: 62,
        timestamp: "Last\nweek",
        date: "MARCH 14, 2024",
        thumbnailUrl: "/uploads/tomatoes.png",
    },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function ScanCard({ scan }: { scan: ScanHistoryItem }) {
    return (
        <div className="bg-[#1C1C1E] rounded-2xl p-4 hover:bg-[#232325] transition-all cursor-pointer group relative">
            <div className="flex gap-3">
                {/* Thumbnail */}
                <div className="w-[88px] h-[88px] rounded-xl bg-[#2C2C2E] flex-shrink-0 overflow-hidden relative">
                    <Image
                        src={scan.thumbnailUrl}
                        alt={scan.condition}
                        fill
                        className="object-cover"
                    />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                    {/* Top section */}
                    <div>
                        <p className="text-[10px] text-[#8E8E93] uppercase tracking-[0.08em] font-medium mb-1.5">
                            {scan.cropType} • {scan.fieldName}
                        </p>
                        <h3 className="text-[17px] font-semibold text-white leading-tight mb-2.5">
                            {scan.condition}
                        </h3>
                    </div>

                    {/* Bottom section */}
                    <div className="flex items-center gap-2">
                        <span className={cn(
                            "inline-flex items-center justify-center px-2.5 py-1 rounded-md text-[11px] font-semibold",
                            scan.statusColor
                        )}>
                            {scan.statusLabel}
                        </span>
                        <span className="text-[11px] text-[#8E8E93]">
                            • {scan.confidence}% Confidence
                        </span>
                    </div>
                </div>

                {/* Right section - timestamp and arrow */}
                <div className="flex flex-col items-end justify-between py-1">
                    <span className="text-[11px] text-[#8E8E93] text-right whitespace-pre-line leading-tight">
                        {scan.timestamp}
                    </span>
                    <ChevronRight className="h-5 w-5 text-[#48484A] group-hover:text-[#34C759] transition-colors" />
                </div>
            </div>
        </div>
    );
}

function DateSeparator({ date }: { date: string }) {
    return (
        <div className="mb-3 mt-6 first:mt-0">
            <p className="text-[11px] font-semibold tracking-[0.1em] text-[#48484A] uppercase">
                {date}
            </p>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ScanHistoryPage() {
    const [selectedFilter, setSelectedFilter] = useState<CropType>("All");

    const filters: CropType[] = ["All", "Maize", "Tomato", "Teff"];

    // Filter scans based on selected crop type
    const filteredScans =
        selectedFilter === "All"
            ? mockScans
            : mockScans.filter(
                (scan) => scan.cropType.toLowerCase() === selectedFilter.toLowerCase()
            );

    // Group scans by date
    const groupedScans = filteredScans.reduce((acc, scan) => {
        if (!acc[scan.date]) {
            acc[scan.date] = [];
        }
        acc[scan.date].push(scan);
        return acc;
    }, {} as Record<string, ScanHistoryItem[]>);

    return (
        <div className="min-h-screen bg-[#000000] text-white">
            {/* ── Main Content ── */}
            <div className="px-5 pt-6 pb-24 lg:pb-6">
                {/* Page Title */}
                <div className="mb-6">
                    <h1 className="text-[32px] font-bold text-white leading-tight mb-1.5">
                        Scan History
                    </h1>
                    <p className="text-[14px] text-[#8E8E93] leading-relaxed">
                        Analysis reports for all your monitored fields.
                    </p>
                </div>

                {/* Filter Tabs */}
                <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
                    {filters.map((filter) => (
                        <button
                            key={filter}
                            onClick={() => setSelectedFilter(filter)}
                            className={cn(
                                "px-5 py-2 rounded-lg font-semibold text-[13px] whitespace-nowrap transition-all",
                                selectedFilter === filter
                                    ? "bg-[#34C759] text-white"
                                    : "bg-[#1C1C1E] text-[#8E8E93] hover:bg-[#2C2C2E] hover:text-white"
                            )}
                        >
                            {filter}
                        </button>
                    ))}
                </div>

                {/* Scan History List */}
                <div>
                    {Object.entries(groupedScans).map(([date, scans]) => (
                        <div key={date}>
                            <DateSeparator date={date} />
                            <div className="space-y-3">
                                {scans.map((scan) => (
                                    <ScanCard key={scan.id} scan={scan} />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Load Full Archives Button */}
                <div className="mt-10 flex justify-center">
                    <button className="flex items-center gap-2.5 px-10 py-3 rounded-lg border border-[#3A3A3C] bg-transparent text-[#FFFFFF] hover:bg-[#1C1C1E] transition-all">
                        <RotateCcw className="h-4 w-4" />
                        <span className="text-[14px] font-medium">Load Full Archives</span>
                    </button>
                </div>
            </div>

            {/* ── Bottom Navigation (Mobile) ── */}
            <div className="fixed bottom-0 inset-x-0 bg-[#1C1C1E]/95 backdrop-blur-md border-t border-[#2C2C2E] lg:hidden">
                <div className="flex items-center justify-around px-2 py-3">
                    {/* Fields */}
                    <Link href="/dashboard" className="flex flex-col items-center gap-1 px-4 py-1.5 text-[#8E8E93] hover:text-white transition-colors">
                        <Home className="w-6 h-6" />
                        <span className="text-[10px] font-medium">Fields</span>
                    </Link>

                    {/* Scan */}
                    <Link href="/dashboard/scan" className="flex flex-col items-center gap-1 px-4 py-1.5 text-[#8E8E93] hover:text-white transition-colors">
                        <Camera className="w-6 h-6" />
                        <span className="text-[10px] font-medium">Scan</span>
                    </Link>

                    {/* History - Active */}
                    <Link href="/dashboard/history" className="flex flex-col items-center gap-1 px-4 py-1.5 text-[#34C759] transition-colors">
                        <HistoryIcon className="w-6 h-6 fill-current" />
                        <span className="text-[10px] font-semibold">History</span>
                    </Link>

                    {/* Settings */}
                    <Link href="/dashboard/settings" className="flex flex-col items-center gap-1 px-4 py-1.5 text-[#8E8E93] hover:text-white transition-colors">
                        <SettingsIcon className="w-6 h-6" />
                        <span className="text-[10px] font-medium">Settings</span>
                    </Link>
                </div>
            </div>

            {/* Hide scrollbar */}
            <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
        </div>
    );
}
