"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronRight, RotateCcw } from "lucide-react";
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
            {/* ── Top Header (Mobile & Desktop) ── */}
            <div className="sticky top-0 z-10 bg-[#000000]/95 backdrop-blur-sm border-b border-[#1C1C1E]">
                <div className="flex items-center justify-between px-5 py-3.5">
                    {/* Logo */}
                    <div className="flex items-center gap-2">
                        <svg className="w-6 h-6 text-[#34C759]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 2L2 7v10c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V7l-10-5z" />
                        </svg>
                        <span className="text-[17px] font-bold text-[#34C759]">AgriSense</span>
                    </div>

                    {/* Profile Icon */}
                    <button className="w-9 h-9 rounded-full bg-[#1C1C1E] flex items-center justify-center hover:bg-[#2C2C2E] transition-colors">
                        <div className="w-5 h-5 rounded-full bg-[#34C759] flex items-center justify-center text-white text-[10px] font-bold">
                            U
                        </div>
                    </button>
                </div>
            </div>

            {/* ── Main Content ── */}
            <div className="px-5 pt-6 pb-24">
                {/* Page Title */}
                <div className="mb-5">
                    <h1 className="text-[28px] font-bold text-white leading-tight mb-1">
                        Scan History
                    </h1>
                    <p className="text-[13px] text-[#8E8E93] leading-relaxed">
                        Analysis reports for all your monitored fields.
                    </p>
                </div>

                {/* Filter Tabs */}
                <div className="flex gap-2 mb-5 overflow-x-auto pb-2 scrollbar-hide">
                    {filters.map((filter) => (
                        <button
                            key={filter}
                            onClick={() => setSelectedFilter(filter)}
                            className={cn(
                                "px-6 py-2.5 rounded-xl font-semibold text-[13px] whitespace-nowrap transition-all",
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
                <div className="mt-8 flex justify-center">
                    <button className="flex items-center gap-2 px-8 py-3 rounded-xl border border-[#3A3A3C] bg-transparent text-[#8E8E93] hover:bg-[#1C1C1E] hover:text-white transition-all">
                        <RotateCcw className="h-4 w-4" />
                        <span className="text-[13px] font-medium">Load Full Archives</span>
                    </button>
                </div>
            </div>

            {/* ── Bottom Navigation (Mobile) ── */}
            <div className="fixed bottom-0 inset-x-0 bg-[#000000]/95 backdrop-blur-sm border-t border-[#1C1C1E] lg:hidden">
                <div className="flex items-center justify-around px-2 py-2.5">
                    {/* Fields */}
                    <button className="flex flex-col items-center gap-1 px-4 py-2 text-[#8E8E93] hover:text-white transition-colors">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        <span className="text-[10px] font-medium uppercase">Fields</span>
                    </button>

                    {/* Scan */}
                    <button className="flex flex-col items-center gap-1 px-4 py-2 text-[#8E8E93] hover:text-white transition-colors">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <span className="text-[10px] font-medium uppercase">Scan</span>
                    </button>

                    {/* History - Active */}
                    <button className="flex flex-col items-center gap-1 px-4 py-2 text-[#34C759] transition-colors">
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                            <circle cx="12" cy="12" r="10" />
                        </svg>
                        <span className="text-[10px] font-medium uppercase">History</span>
                    </button>

                    {/* Settings */}
                    <button className="flex flex-col items-center gap-1 px-4 py-2 text-[#8E8E93] hover:text-white transition-colors">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="text-[10px] font-medium uppercase">Settings</span>
                    </button>
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
