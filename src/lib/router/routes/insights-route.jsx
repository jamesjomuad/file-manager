"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  RiBarChartLine,
  RiFolderLine,
  RiFileLine,
  RiHardDrive2Line,
  RiTimeLine,
  RiRefreshLine,
  RiCloseLine,
  RiDeleteBinLine,
  RiFileCopyLine,
  RiArrowRightSLine,
  RiFilterLine,
  RiAlertLine,
  RiCheckLine,
  RiLoader4Line,
  RiFolder3Line,
  RiFileList3Line,
  RiStarLine,
  RiStarFill,
} from "@remixicon/react";
import { cx } from "@/utils/cx";
import { Button } from "@/components/base/buttons/button";
import { formatFileSize } from "@/lib/filesystem/utils";
import { useFavoritesStore } from "@/stores/favorites-store";
import { useRecentFiles } from "@/hooks/use-recent-files";
import { useTrashStore } from "@/stores/trash-store";

/**
 * Category color mapping for distribution visualization.
 */
const CATEGORY_COLORS = {
  documents: { bg: "bg-blue-500", text: "text-blue-500", light: "bg-blue-500/10" },
  images: { bg: "bg-violet-500", text: "text-violet-500", light: "bg-violet-500/10" },
  videos: { bg: "bg-pink-500", text: "text-pink-500", light: "bg-pink-500/10" },
  audio: { bg: "bg-amber-500", text: "text-amber-500", light: "bg-amber-500/10" },
  archives: { bg: "bg-orange-500", text: "text-orange-500", light: "bg-orange-500/10" },
  code: { bg: "bg-emerald-500", text: "text-emerald-500", light: "bg-emerald-500/10" },
  spreadsheets: { bg: "bg-teal-500", text: "text-teal-500", light: "bg-teal-500/10" },
  executables: { bg: "bg-red-500", text: "text-red-500", light: "bg-red-500/10" },
  other: { bg: "bg-neutral-500", text: "text-neutral-500", light: "bg-neutral-500/10" },
};

/**
 * Format category name for display.
 * @param {string} cat
 * @returns {string}
 */
function formatCategory(cat) {
  const names = {
    documents: "Documents",
    images: "Images",
    videos: "Videos",
    audio: "Audio",
    archives: "Archives",
    code: "Code & Dev",
    spreadsheets: "Spreadsheets",
    executables: "Executables",
    other: "Other",
  };
  return names[cat] || cat;
}

/**
 * Format a relative time string.
 * @param {string} isoDate
 * @returns {string}
 */
function formatRelativeTime(isoDate) {
  const date = new Date(isoDate);
  const now = Date.now();
  const diff = now - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);

  if (months > 0) return `${months}mo ago`;
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "just now";
}

/**
 * Get just the filename from a path.
 * @param {string} filePath
 * @returns {string}
 */
function getFileName(filePath) {
  const normalized = filePath.replace(/\\/g, "/");
  const parts = normalized.split("/");
  return parts[parts.length - 1] || filePath;
}

/**
 * Get the parent directory from a path.
 * @param {string} filePath
 * @returns {string}
 */
function getParentDir(filePath) {
  const normalized = filePath.replace(/\\/g, "/");
  const parts = normalized.split("/");
  parts.pop();
  return parts.join("/") || "";
}

// ============================================================
// Sub-components
// ============================================================

/**
 * Stat card for overview sections.
 */
function StatCard({ label, value, icon: Icon, description, accentClass, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "flex w-full flex-col gap-3 rounded-2xl border border-border-button-default bg-background-secondary-default p-4 text-start transition-colors hover:bg-background-tertiary-default",
        onClick && "cursor-pointer",
        !onClick && "cursor-default"
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cx(
            "flex size-10 items-center justify-center rounded-xl",
            accentClass || "bg-accent-500/10"
          )}
        >
          <Icon
            className={cx("size-5", accentClass ? "text-current" : "text-accent-500")}
            aria-hidden
          />
        </div>
        <div className="flex-1">
          <div className="text-title-2-semibold text-text-primary">{value}</div>
          <div className="text-caption-1-regular text-text-secondary">{label}</div>
        </div>
      </div>
      {description && (
        <p className="text-caption-1-regular text-text-tertiary">{description}</p>
      )}
    </button>
  );
}

/**
 * Progress bar component.
 */
function ProgressBar({ value, max, className, colorClass = "bg-accent-500" }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className={cx("h-1.5 w-full rounded-full bg-background-tertiary-default", className)}>
      <div
        className={cx("h-1.5 rounded-full transition-all duration-500", colorClass)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/**
 * Scanning progress card.
 */
function ScanProgress({ progress, onCancel }) {
  if (!progress) return null;

  const phaseLabels = {
    scanning: "Scanning files...",
    hashing: "Checking for duplicates...",
    complete: "Complete",
    cancelled: "Cancelled",
    error: "Error",
  };

  return (
    <div className="rounded-2xl border border-border-button-default bg-background-secondary-default p-6">
      <div className="flex items-center gap-3 mb-4">
        <RiLoader4Line className="size-5 animate-spin text-accent-500" aria-hidden />
        <span className="text-body-medium text-text-primary">
          {phaseLabels[progress.phase] || "Scanning..."}
        </span>
        {onCancel && (
          <Button
            variant="ghost"
            size="small"
            onClick={onCancel}
            className="ms-auto"
          >
            Cancel
          </Button>
        )}
      </div>

      <div className="space-y-2">
        <ProgressBar value={progress.filesScanned || 0} max={Math.max((progress.filesScanned || 0) + 100, 1000)} />
        <div className="flex items-center justify-between text-caption-1-regular text-text-secondary">
          <span className="truncate max-w-[60%]">
            {progress.currentPath || "Starting..."}
          </span>
          <span>
            {progress.filesScanned || 0} files, {progress.dirsScanned || 0} folders
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Section wrapper with header.
 */
function Section({ title, description, icon: Icon, action, children, className }) {
  return (
    <div className={cx("rounded-2xl border border-border-button-default bg-background-secondary-default", className)}>
      <div className="flex items-center gap-3 border-b border-border-button-default px-4 py-3">
        {Icon && <Icon className="size-4 text-text-tertiary" aria-hidden />}
        <div className="flex-1">
          <h2 className="text-title-3-semibold text-text-primary">{title}</h2>
          {description && (
            <p className="text-caption-1-regular text-text-tertiary">{description}</p>
          )}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

/**
 * File/folder row in tables.
 */
function FileRow({ name, subtext, size, onClick, actions }) {
  return (
    <li className="flex items-center gap-3 border-b border-border-button-default px-4 py-3 last:border-b-0 hover:bg-background-tertiary-default/50 transition-colors">
      <button
        type="button"
        onClick={onClick}
        className="flex min-w-0 flex-1 items-center gap-3 text-start"
      >
        <div className="min-w-0 flex-1">
          <div className="text-body-medium truncate text-text-primary">{name}</div>
          {subtext && (
            <div className="text-caption-1-regular truncate text-text-tertiary">{subtext}</div>
          )}
        </div>
        <div className="text-caption-1-semibold text-text-secondary shrink-0">
          {size}
        </div>
        <RiArrowRightSLine className="size-4 text-text-tertiary shrink-0" aria-hidden />
      </button>
      {actions && <div className="flex items-center gap-1">{actions}</div>}
    </li>
  );
}

/**
 * Cleanup suggestion subsection.
 */
function CleanupSection({ title, count, icon: Icon, description, children }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="rounded-xl border border-border-button-default bg-background-tertiary-default/30">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 px-3 py-2 text-start hover:bg-background-tertiary-default transition-colors"
      >
        <Icon className="size-4 text-text-tertiary shrink-0" aria-hidden />
        <div className="flex-1 min-w-0">
          <span className="text-body-medium text-text-primary">{title}</span>
          <span className="text-caption-1-regular text-text-tertiary ms-2">{description}</span>
        </div>
        <span className="rounded-full bg-background-secondary-default px-2 py-0.5 text-caption-1-semibold text-text-secondary shrink-0">
          {count}
        </span>
        <RiArrowRightSLine
          className={cx("size-4 text-text-tertiary shrink-0 transition-transform", expanded && "rotate-90")}
          aria-hidden
        />
      </button>
      {expanded && <div className="px-3 pb-3">{children}</div>}
    </div>
  );
}

// ============================================================
// Main component
// ============================================================

/**
 * Insights dashboard page.
 *
 * Two-tier architecture:
 * - Instant Insights: data from existing stores (favorites, recent, trash, current dir)
 * - Scan-Based Insights: filesystem-wide analysis from the scan API
 *
 * Instant insights render immediately without any filesystem scan.
 * Scan-based insights load independently and show cached results when available.
 */
export function InsightsRoute() {
  const navigate = useNavigate();

  // ── Store data (instant) ──
  const favorites = useFavoritesStore((s) => s.favorites);
  const { recentFiles } = useRecentFiles();
  const trashCount = useTrashStore((s) => s.count);

  // ── Current directory stats (instant) ──
  const [currentDir, setCurrentDir] = useState(null);
  const [currentDirLoading, setCurrentDirLoading] = useState(true);

  // ── Scan-based data ──
  const [scanData, setScanData] = useState(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanError, setScanError] = useState(null);
  const [scanProgress, setScanProgress] = useState(null);
  const abortRef = useRef(null);

  // ── Load current directory stats (instant, lightweight) ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/insights/current");
        if (!cancelled && response.ok) {
          const json = await response.json();
          if (json.success) {
            setCurrentDir(json.data);
          }
        }
      } catch {
        // Silently fail - current dir stats are optional
      } finally {
        if (!cancelled) setCurrentDirLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Try to load cached scan results (non-blocking) ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/insights/scan");
        if (!cancelled && response.ok) {
          const json = await response.json();
          if (json.success) {
            setScanData(json.data);
          }
        }
      } catch {
        // Cache lookup failed
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Start a fresh scan with SSE progress ──
  const handleRunScan = useCallback(async () => {
    setScanLoading(true);
    setScanError(null);
    setScanProgress(null);

    try {
      const response = await fetch("/api/insights/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh: true }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Scan failed (${response.status})`);
      }

      const contentType = response.headers.get("content-type") || "";

      // If JSON (cached result returned immediately)
      if (contentType.includes("application/json")) {
        const json = await response.json();
        if (json.success) {
          setScanData(json.data);
        }
        return;
      }

      // SSE stream for real-time progress
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const msg = JSON.parse(line.slice(6));
              if (msg.type === "progress") {
                setScanProgress(msg);
              } else if (msg.type === "complete") {
                setScanData(msg.result);
              } else if (msg.type === "error") {
                setScanError(msg.error || "Scan failed");
              }
            } catch {
              // Skip malformed SSE messages
            }
          }
        }
      }
    } catch (err) {
      if (err.name === "AbortError") return;
      setScanError(err.message);
    } finally {
      setScanLoading(false);
      setScanProgress(null);
    }
  }, []);

  const handleCancelScan = useCallback(() => {
    abortRef.current?.abort();
    setScanLoading(false);
    setScanProgress(null);
  }, []);

  // ── Navigation helpers ──
  const navigateToFolder = useCallback((folderPath) => {
    navigate(`/files#${folderPath}`);
  }, [navigate]);

  const openFile = useCallback((filePath) => {
    navigate(`/workspace?path=${encodeURIComponent(filePath)}`);
  }, [navigate]);

  // ── Computed instant data ──
  const currentDirTypeDist = useMemo(() => {
    if (!currentDir?.typeDistribution) return [];
    const entries = Object.entries(currentDir.typeDistribution);
    const total = entries.reduce((sum, [, count]) => sum + count, 0);
    return entries
      .map(([category, count]) => ({
        category,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [currentDir]);

  // ── Recent files with metadata ──
  const recentFileNames = useMemo(() => {
    return recentFiles.map((p) => ({
      path: p,
      name: getFileName(p),
      dir: getParentDir(p),
    }));
  }, [recentFiles]);

  // ── Favorite file names ──
  const favoriteFileNames = useMemo(() => {
    return favorites.map((p) => ({
      path: p,
      name: getFileName(p),
      dir: getParentDir(p),
    }));
  }, [favorites]);

  // ============================================================
  // Render
  // ============================================================

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Page header */}
        <div>
          <h1 className="text-title-1-semibold text-text-primary">Insights</h1>
          <p className="mt-1 text-body-regular text-text-secondary">
            Workspace analytics and storage insights.
          </p>
        </div>

        {/* ============================================================ */}
        {/* INSTANT INSIGHTS — always shown, no scan needed */}
        {/* ============================================================ */}
        <div className="flex items-center gap-2">
          <h2 className="text-title-3-semibold text-text-primary">Quick Overview</h2>
          <span className="rounded-full bg-accent-500/10 px-2 py-0.5 text-caption-1-semibold text-accent-500">
            Instant
          </span>
        </div>

        {/* Overview cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Recent Files"
            value={recentFiles.length}
            icon={RiTimeLine}
            description="Recently opened files"
            accentClass="bg-blue-500/10 text-blue-500"
            onClick={() => navigate("/recent")}
          />
          <StatCard
            label="Favorites"
            value={favorites.length}
            icon={RiStarLine}
            description="Starred files and folders"
            accentClass="bg-amber-500/10 text-amber-500"
            onClick={() => navigate("/favorites")}
          />
          <StatCard
            label="Trash"
            value={trashCount}
            icon={RiDeleteBinLine}
            description="Items in trash"
            accentClass="bg-red-500/10 text-red-500"
            onClick={() => navigate("/trash")}
          />
          <StatCard
            label="Current Directory"
            value={currentDirLoading ? "..." : `${currentDir?.fileCount || 0}`}
            icon={RiFolderLine}
            description={currentDirLoading
              ? "Loading..."
              : currentDir
                ? `${currentDir.folderCount} folders · ${formatFileSize(currentDir.totalSize)}`
                : "Unable to load"
            }
            accentClass="bg-emerald-500/10 text-emerald-500"
            onClick={() => navigate("/files")}
          />
        </div>

        {/* Current directory file type distribution */}
        {currentDir && currentDirTypeDist.length > 0 && (
          <Section
            title="Current Directory"
            description="File types in root directory"
            icon={RiBarChartLine}
          >
            <div className="p-4">
              {/* Stacked bar */}
              <div className="mb-4 flex h-3 overflow-hidden rounded-full">
                {currentDirTypeDist.map((cat) => (
                  <div
                    key={cat.category}
                    className={cx("h-full transition-all duration-300", CATEGORY_COLORS[cat.category]?.bg || "bg-neutral-500")}
                    style={{ width: `${cat.percentage}%` }}
                    title={`${formatCategory(cat.category)}: ${cat.count} files (${cat.percentage}%)`}
                  />
                ))}
              </div>

              {/* Legend */}
              <ul className="flex flex-wrap gap-x-4 gap-y-2">
                {currentDirTypeDist.map((cat) => {
                  const colors = CATEGORY_COLORS[cat.category] || CATEGORY_COLORS.other;
                  return (
                    <li key={cat.category} className="flex items-center gap-2">
                      <div className={cx("size-2.5 rounded-full shrink-0", colors.bg)} />
                      <span className="text-caption-1-regular text-text-secondary">
                        {formatCategory(cat.category)}
                      </span>
                      <span className="text-caption-1-semibold text-text-tertiary">
                        {cat.count}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </Section>
        )}

        {/* Recently Opened Files */}
        {recentFileNames.length > 0 && (
          <Section
            title="Recently Opened"
            description="Files you've recently viewed or edited"
            icon={RiTimeLine}
          >
            <ul className="divide-y divide-border-button-default max-h-[300px] overflow-auto">
              {recentFileNames.slice(0, 10).map((file) => (
                <FileRow
                  key={file.path}
                  name={file.name}
                  subtext={file.dir || "Root"}
                  size=""
                  onClick={() => openFile(file.path)}
                />
              ))}
            </ul>
          </Section>
        )}

        {/* Favorites overview */}
        {favoriteFileNames.length > 0 && (
          <Section
            title="Favorites"
            description={`${favorites.length} starred item${favorites.length !== 1 ? "s" : ""}`}
            icon={RiStarLine}
            action={
              <Button variant="ghost" size="small" onClick={() => navigate("/favorites")}>
                View All
              </Button>
            }
          >
            <ul className="divide-y divide-border-button-default max-h-[300px] overflow-auto">
              {favoriteFileNames.slice(0, 10).map((file) => (
                <FileRow
                  key={file.path}
                  name={file.name}
                  subtext={file.dir || "Root"}
                  size=""
                  onClick={() => openFile(file.path)}
                />
              ))}
            </ul>
          </Section>
        )}

        {/* ============================================================ */}
        {/* SCAN-BASED INSIGHTS — shown when data is available */}
        {/* ============================================================ */}
        <div className="flex items-center gap-2 pt-4">
          <h2 className="text-title-3-semibold text-text-primary">Deep Analysis</h2>
          <span className="rounded-full bg-background-tertiary-default px-2 py-0.5 text-caption-1-semibold text-text-tertiary">
            Full Scan
          </span>
          {scanData && (
            <Button
              variant="ghost"
              size="small"
              onClick={handleRunScan}
              disabled={scanLoading}
              leadingIcon={RiRefreshLine}
              className="ms-auto"
            >
              {scanLoading ? "Scanning..." : "Refresh"}
            </Button>
          )}
        </div>

        {/* Active scan progress */}
        {scanLoading && scanProgress && (
          <ScanProgress progress={scanProgress} onCancel={handleCancelScan} />
        )}

        {/* Scan error */}
        {scanError && !scanData && (
          <div className="rounded-2xl border border-border-button-default bg-background-secondary-default p-6 text-center">
            <RiAlertLine className="mx-auto size-8 text-warning-500" aria-hidden />
            <p className="mt-3 text-body-medium text-text-primary">Scan error</p>
            <p className="mt-1 text-caption-1-regular text-text-tertiary">{scanError}</p>
            <Button variant="primary" size="small" className="mt-4" onClick={handleRunScan} leadingIcon={RiRefreshLine}>
              Try Again
            </Button>
          </div>
        )}

        {/* No scan data — prompt to run scan */}
        {!scanData && !scanLoading && !scanError && (
          <div className="rounded-2xl border border-border-button-default bg-background-secondary-default p-8 text-center">
            <RiBarChartLine className="mx-auto size-8 text-text-tertiary" aria-hidden />
            <p className="mt-3 text-body-medium text-text-primary">No scan data yet</p>
            <p className="mt-1 text-caption-1-regular text-text-tertiary">
              Run a scan to analyze your entire workspace — storage distribution, largest files, duplicates, and more.
            </p>
            <Button variant="primary" size="small" className="mt-4" onClick={handleRunScan} leadingIcon={RiBarChartLine}>
              Run Scan
            </Button>
          </div>
        )}

        {/* Scan-based results (only when data exists) */}
        {scanData && (() => {
          const {
            totalFiles,
            totalFolders,
            totalSize,
            largestFile,
            diskInfo,
            categoryDistribution,
            largestFiles: topFiles,
            largestFolders: topFolders,
            recentFiles: recentModified,
            recentlyAdded: recentAdded,
            emptyFolders,
            duplicateGroups,
            largeArchives: archives,
            oldFiles,
            scanMeta,
          } = scanData;

          const totalWastedByDuplicates = duplicateGroups.reduce((sum, g) => sum + (g.wastedBytes || 0), 0);
          const cleanupScore = emptyFolders.length + duplicateGroups.length + (oldFiles.length > 0 ? 1 : 0);

          return (
            <>
              {/* Scan metadata */}
              {scanMeta && (
                <p className="text-caption-1-regular text-text-tertiary">
                  {scanMeta.cached ? "Cached results" : `Scanned in ${(scanMeta.duration / 1000).toFixed(1)}s`}
                  {" · "}
                  {new Date(scanMeta.completedAt).toLocaleString()}
                  {scanMeta.incomplete && " · Partial results"}
                  {scanMeta.errors > 0 && ` · ${scanMeta.errors} inaccessible items skipped`}
                </p>
              )}

              {/* Storage Overview */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  label="Total Files"
                  value={totalFiles.toLocaleString()}
                  icon={RiFileLine}
                  description="Across all directories"
                  accentClass="bg-blue-500/10 text-blue-500"
                />
                <StatCard
                  label="Total Folders"
                  value={totalFolders.toLocaleString()}
                  icon={RiFolderLine}
                  description="Directory tree depth"
                  accentClass="bg-violet-500/10 text-violet-500"
                />
                <StatCard
                  label="Storage Used"
                  value={formatFileSize(totalSize)}
                  icon={RiHardDrive2Line}
                  description={diskInfo
                    ? `${((totalSize / diskInfo.total) * 100).toFixed(1)}% of ${formatFileSize(diskInfo.total)} volume`
                    : "On configured root"
                  }
                  accentClass="bg-emerald-500/10 text-emerald-500"
                />
                <StatCard
                  label="Largest File"
                  value={largestFile ? formatFileSize(largestFile.size) : "—"}
                  icon={RiFileList3Line}
                  description={largestFile ? largestFile.name : "No files found"}
                  accentClass="bg-amber-500/10 text-amber-500"
                  onClick={largestFile ? () => openFile(largestFile.path) : undefined}
                />
              </div>

              {/* Disk usage indicator */}
              {diskInfo && (
                <div className="rounded-2xl border border-border-button-default bg-background-secondary-default p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-caption-1-semibold text-text-secondary">
                      Volume Usage
                    </span>
                    <span className="text-caption-1-regular text-text-tertiary">
                      {formatFileSize(diskInfo.used)} of {formatFileSize(diskInfo.total)} used
                    </span>
                  </div>
                  <ProgressBar
                    value={diskInfo.used}
                    max={diskInfo.total}
                    className="h-2"
                    colorClass="bg-accent-500"
                  />
                  <div className="mt-1 text-caption-1-regular text-text-tertiary">
                    {formatFileSize(diskInfo.free)} free
                  </div>
                </div>
              )}

              {/* File Type Distribution */}
              <Section
                title="File Type Distribution"
                description="Storage breakdown by category"
                icon={RiBarChartLine}
              >
                {categoryDistribution.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <RiBarChartLine className="size-8 text-text-tertiary" aria-hidden />
                    <p className="mt-2 text-body-medium text-text-secondary">No files found</p>
                  </div>
                ) : (
                  <div className="p-4">
                    <div className="mb-4 flex h-3 overflow-hidden rounded-full">
                      {categoryDistribution.map((cat) => (
                        <div
                          key={cat.category}
                          className={cx("h-full transition-all duration-300", CATEGORY_COLORS[cat.category]?.bg || "bg-neutral-500")}
                          style={{ width: `${cat.percentage}%` }}
                          title={`${formatCategory(cat.category)}: ${cat.percentage}%`}
                        />
                      ))}
                    </div>
                    <ul className="space-y-2">
                      {categoryDistribution.map((cat) => {
                        const colors = CATEGORY_COLORS[cat.category] || CATEGORY_COLORS.other;
                        return (
                          <li key={cat.category} className="flex items-center gap-3">
                            <div className={cx("size-3 rounded-full shrink-0", colors.bg)} />
                            <span className="text-body-medium text-text-primary min-w-[100px]">
                              {formatCategory(cat.category)}
                            </span>
                            <div className="flex-1">
                              <ProgressBar
                                value={cat.size}
                                max={totalSize}
                                colorClass={colors.bg}
                              />
                            </div>
                            <span className="text-caption-1-semibold text-text-secondary min-w-[60px] text-end">
                              {formatFileSize(cat.size)}
                            </span>
                            <span className="text-caption-1-regular text-text-tertiary min-w-[60px] text-end">
                              {cat.percentage}%
                            </span>
                            <span className="text-caption-1-regular text-text-tertiary min-w-[50px] text-end">
                              {cat.count} files
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </Section>

              {/* Largest Files */}
              <Section
                title="Largest Files"
                description="Top 10 by size"
                icon={RiFileList3Line}
              >
                {topFiles.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <RiFileLine className="size-8 text-text-tertiary" aria-hidden />
                    <p className="mt-2 text-body-medium text-text-secondary">No files found</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-border-button-default">
                    {topFiles.map((file) => (
                      <FileRow
                        key={file.path}
                        name={file.name}
                        subtext={file.path}
                        size={formatFileSize(file.size)}
                        onClick={() => openFile(file.path)}
                      />
                    ))}
                  </ul>
                )}
              </Section>

              {/* Largest Folders */}
              <Section
                title="Largest Folders"
                description="Top 10 by total contents"
                icon={RiFolder3Line}
              >
                {topFolders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <RiFolderLine className="size-8 text-text-tertiary" aria-hidden />
                    <p className="mt-2 text-body-medium text-text-secondary">No folders found</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-border-button-default">
                    {topFolders.map((folder) => (
                      <FileRow
                        key={folder.path}
                        name={folder.name}
                        subtext={`${folder.fileCount} files · ${folder.path}`}
                        size={formatFileSize(folder.size)}
                        onClick={() => navigateToFolder(folder.path)}
                      />
                    ))}
                  </ul>
                )}
              </Section>

              {/* Recent Activity (scan-based) */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Section
                  title="Recently Modified"
                  description="By filesystem modification time"
                  icon={RiTimeLine}
                >
                  {recentModified.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <RiTimeLine className="size-8 text-text-tertiary" aria-hidden />
                      <p className="mt-2 text-body-medium text-text-secondary">No data</p>
                    </div>
                  ) : (
                    <ul className="divide-y divide-border-button-default max-h-[400px] overflow-auto">
                      {recentModified.slice(0, 15).map((file) => (
                        <FileRow
                          key={file.path}
                          name={file.name}
                          subtext={formatRelativeTime(file.modifiedAt)}
                          size={formatFileSize(file.size)}
                          onClick={() => openFile(file.path)}
                        />
                      ))}
                    </ul>
                  )}
                </Section>

                <Section
                  title="Recently Added"
                  description="By filesystem creation time"
                  icon={RiFileLine}
                >
                  <div className="px-4 py-2 border-b border-border-button-default">
                    <p className="text-caption-1-regular text-text-tertiary">
                      Based on filesystem birth time. May be inaccurate on some platforms.
                    </p>
                  </div>
                  {recentAdded.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <RiFileLine className="size-8 text-text-tertiary" aria-hidden />
                      <p className="mt-2 text-body-medium text-text-secondary">No data</p>
                    </div>
                  ) : (
                    <ul className="divide-y divide-border-button-default max-h-[400px] overflow-auto">
                      {recentAdded.slice(0, 15).map((file) => (
                        <FileRow
                          key={file.path}
                          name={file.name}
                          subtext={file.addedAt ? formatRelativeTime(file.addedAt) : ""}
                          size={formatFileSize(file.size)}
                          onClick={() => openFile(file.path)}
                        />
                      ))}
                    </ul>
                  )}
                </Section>
              </div>

              {/* Cleanup Suggestions */}
              <Section
                title="Cleanup Suggestions"
                description="Suggestions for reclaiming storage — review before acting"
                icon={RiDeleteBinLine}
                action={
                  cleanupScore > 0 ? (
                    <span className="rounded-full bg-warning-500/10 px-2 py-0.5 text-caption-1-semibold text-warning-600 dark:text-warning-400">
                      {cleanupScore} suggestion{cleanupScore !== 1 ? "s" : ""}
                    </span>
                  ) : (
                    <span className="rounded-full bg-success-500/10 px-2 py-0.5 text-caption-1-semibold text-success-600 dark:text-success-400">
                      <RiCheckLine className="size-3 inline me-1" aria-hidden />
                      Clean
                    </span>
                  )
                }
              >
                <div className="p-4 space-y-4">
                  {emptyFolders.length > 0 && (
                    <CleanupSection
                      title="Empty Folders"
                      count={emptyFolders.length}
                      icon={RiFolderLine}
                      description="Directories with no files — may be leftover from deleted content"
                    >
                      <ul className="space-y-1 mt-2">
                        {emptyFolders.slice(0, 10).map((folder) => (
                          <li key={folder.path}>
                            <button
                              type="button"
                              onClick={() => navigateToFolder(folder.path)}
                              className="flex items-center gap-2 text-caption-1-regular text-text-secondary hover:text-accent-500 transition-colors w-full text-start"
                            >
                              <RiFolderLine className="size-3.5 shrink-0 text-text-tertiary" aria-hidden />
                              <span className="truncate">{folder.path || "(root)"}</span>
                            </button>
                          </li>
                        ))}
                        {emptyFolders.length > 10 && (
                          <li className="text-caption-1-regular text-text-tertiary">
                            +{emptyFolders.length - 10} more
                          </li>
                        )}
                      </ul>
                    </CleanupSection>
                  )}

                  {duplicateGroups.length > 0 && (
                    <CleanupSection
                      title="Potential Duplicates"
                      count={duplicateGroups.length}
                      icon={RiFileCopyLine}
                      description={`Files with identical content — could free ${formatFileSize(totalWastedByDuplicates)}`}
                    >
                      <ul className="space-y-2 mt-2">
                        {duplicateGroups.slice(0, 5).map((group, idx) => (
                          <li key={idx} className="rounded-lg border border-border-button-default p-2">
                            <div className="text-caption-1-semibold text-text-secondary mb-1">
                              {formatFileSize(group.size)} × {group.files.length} copies
                            </div>
                            {group.files.slice(0, 3).map((f) => (
                              <button
                                key={f.path}
                                type="button"
                                onClick={() => openFile(f.path)}
                                className="flex items-center gap-1.5 text-caption-1-regular text-text-secondary hover:text-accent-500 transition-colors w-full text-start truncate"
                              >
                                <RiFileLine className="size-3 shrink-0 text-text-tertiary" aria-hidden />
                                <span className="truncate">{f.path}</span>
                              </button>
                            ))}
                            {group.files.length > 3 && (
                              <div className="text-caption-1-regular text-text-tertiary">
                                +{group.files.length - 3} more
                              </div>
                            )}
                          </li>
                        ))}
                        {duplicateGroups.length > 5 && (
                          <li className="text-caption-1-regular text-text-tertiary">
                            +{duplicateGroups.length - 5} more duplicate groups
                          </li>
                        )}
                      </ul>
                    </CleanupSection>
                  )}

                  {archives.length > 0 && (
                    <CleanupSection
                      title="Large Archives"
                      count={archives.length}
                      icon={RiHardDrive2Line}
                      description="Archives over 10MB — consider if still needed"
                    >
                      <ul className="space-y-1 mt-2">
                        {archives.slice(0, 10).map((archive) => (
                          <li key={archive.path}>
                            <button
                              type="button"
                              onClick={() => openFile(archive.path)}
                              className="flex items-center gap-2 text-caption-1-regular text-text-secondary hover:text-accent-500 transition-colors w-full text-start"
                            >
                              <RiHardDrive2Line className="size-3.5 shrink-0 text-text-tertiary" aria-hidden />
                              <span className="truncate flex-1">{archive.name}</span>
                              <span className="text-caption-1-regular text-text-tertiary shrink-0">
                                {formatFileSize(archive.size)}
                              </span>
                            </button>
                          </li>
                        ))}
                        {archives.length > 10 && (
                          <li className="text-caption-1-regular text-text-tertiary">
                            +{archives.length - 10} more
                          </li>
                        )}
                      </ul>
                    </CleanupSection>
                  )}

                  {oldFiles.length > 0 && (
                    <CleanupSection
                      title="Old Files"
                      count={oldFiles.length}
                      icon={RiTimeLine}
                      description="Not modified in 6+ months — may be stale"
                    >
                      <ul className="space-y-1 mt-2">
                        {oldFiles.slice(0, 10).map((file) => (
                          <li key={file.path}>
                            <button
                              type="button"
                              onClick={() => openFile(file.path)}
                              className="flex items-center gap-2 text-caption-1-regular text-text-secondary hover:text-accent-500 transition-colors w-full text-start"
                            >
                              <RiTimeLine className="size-3.5 shrink-0 text-text-tertiary" aria-hidden />
                              <span className="truncate flex-1">{file.name}</span>
                              <span className="text-caption-1-regular text-text-tertiary shrink-0">
                                {formatRelativeTime(file.modifiedAt)}
                              </span>
                            </button>
                          </li>
                        ))}
                        {oldFiles.length > 10 && (
                          <li className="text-caption-1-regular text-text-tertiary">
                            +{oldFiles.length - 10} more
                          </li>
                        )}
                      </ul>
                    </CleanupSection>
                  )}

                  {cleanupScore === 0 && (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <RiCheckLine className="size-8 text-success-500" aria-hidden />
                      <p className="mt-2 text-body-medium text-text-primary">
                        Looking good!
                      </p>
                      <p className="text-caption-1-regular text-text-tertiary">
                        No cleanup suggestions at this time.
                      </p>
                    </div>
                  )}
                </div>
              </Section>

              {/* Footer: Scan metadata */}
              {scanMeta && (
                <div className="text-center text-caption-1-regular text-text-tertiary pb-4">
                  Root: {scanMeta.rootPath} · {scanMeta.totalFilesScanned?.toLocaleString()} files scanned · {scanMeta.totalDirsScanned?.toLocaleString()} directories
                  {scanMeta.incomplete && (
                    <span className="ms-2 text-warning-500">⚠ Scan was incomplete — some directories may have been skipped</span>
                  )}
                </div>
              )}
            </>
          );
        })()}
      </div>
    </div>
  );
}
