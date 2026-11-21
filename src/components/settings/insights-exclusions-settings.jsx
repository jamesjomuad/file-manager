"use client";

import { useCallback, useEffect, useState } from "react";
import { cx } from "@/utils/cx";
import {
  RiFolderLine,
  RiAddLine,
  RiDeleteBinLine,
  RiRefreshLine,
  RiCloseLine,
  RiErrorWarningLine,
} from "@remixicon/react";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { Switch } from "@/components/base/switch/switch";

/**
 * @typedef {Object} ExclusionEntry
 * @property {string} name
 * @property {string} category
 * @property {boolean} isDefault
 * @property {boolean} enabled
 */

/**
 * Single exclusion row with toggle switch.
 * @param {Object} props
 * @param {ExclusionEntry} props.entry
 * @param {function} props.onToggle
 */
function ExclusionRow({ entry, onToggle }) {
  const isInternal = entry.category === "internal";

  return (
    <div
      className={cx(
        "flex items-center justify-between gap-3 rounded-lg px-3 py-2",
        "bg-background-primary-default",
        !entry.enabled && "opacity-50",
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        <code className="text-caption-1-semibold text-text-primary truncate font-mono">
          {entry.name}
        </code>
        {isInternal && (
          <span className="text-caption-2-regular text-text-tertiary whitespace-nowrap">
            (always active)
          </span>
        )}
      </div>
      {isInternal ? (
        <Switch isSelected={true} isDisabled aria-label={`Always excluded: ${entry.name}`} />
      ) : (
        <Switch
          isSelected={entry.enabled}
          onChange={() => onToggle(entry.name, !entry.enabled)}
          aria-label={`Toggle exclusion of ${entry.name}`}
        />
      )}
    </div>
  );
}

/**
 * Custom exclusion row with delete button.
 * @param {Object} props
 * @param {ExclusionEntry} props.entry
 * @param {function} props.onRemove
 */
function CustomExclusionRow({ entry, onRemove }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 bg-background-primary-default">
      <code className="text-caption-1-semibold text-text-primary truncate font-mono">
        {entry.name}
      </code>
      <button
        type="button"
        onClick={() => onRemove(entry.name)}
        className="flex items-center justify-center size-6 rounded-md text-text-tertiary hover:text-error-500 hover:bg-background-tertiary-default transition-colors"
        aria-label={`Remove ${entry.name} exclusion`}
      >
        <RiCloseLine className="size-4" />
      </button>
    </div>
  );
}

/**
 * Category section with header and exclusion rows.
 * @param {Object} props
 * @param {string} props.title
 * @param {ExclusionEntry[]} props.entries
 * @param {function} props.onToggle
 */
function CategorySection({ title, entries, onToggle }) {
  return (
    <div className="flex flex-col gap-1">
      <h4 className="text-caption-1-semibold text-text-secondary uppercase tracking-wide px-1">
        {title}
      </h4>
      <div className="flex flex-col gap-1">
        {entries.map((entry) => (
          <ExclusionRow key={entry.name} entry={entry} onToggle={onToggle} />
        ))}
      </div>
    </div>
  );
}

/**
 * Insights scan exclusions settings component.
 * Displays default and custom exclusions, allows toggling and management.
 */
export function InsightsExclusionsSettings() {
  const [exclusions, setExclusions] = useState(/** @type {ExclusionEntry[]} */ ([]));
  const [grouped, setGrouped] = useState(/** @type {Record<string, ExclusionEntry[]>} */ ({}));
  const [categories, setCategories] = useState(/** @type {Record<string, string>} */ ({}));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newName, setNewName] = useState("");
  const [addError, setAddError] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchExclusions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/insights/exclusions");
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to load exclusions");
      setExclusions(json.data.exclusions);
      setGrouped(json.data.grouped);
      setCategories(json.data.categories);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchExclusions();
  }, [fetchExclusions]);

  const handleToggle = useCallback(async (name, enabled) => {
    setSaving(true);
    try {
      const res = await fetch("/api/insights/exclusions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toggle: { name, enabled } }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setExclusions(json.data.exclusions);
      // Re-group
      const newGrouped = {};
      for (const entry of json.data.exclusions) {
        if (!newGrouped[entry.category]) newGrouped[entry.category] = [];
        newGrouped[entry.category].push(entry);
      }
      setGrouped(newGrouped);
    } catch (err) {
      console.error("Toggle exclusion failed:", err);
    } finally {
      setSaving(false);
    }
  }, []);

  const handleAdd = useCallback(async () => {
    if (!newName.trim()) return;
    setAddError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/insights/exclusions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addCustom: newName.trim() }),
      });
      const json = await res.json();
      if (!json.success) {
        setAddError(json.error || "Failed to add exclusion");
        return;
      }
      setExclusions(json.data.exclusions);
      const newGrouped = {};
      for (const entry of json.data.exclusions) {
        if (!newGrouped[entry.category]) newGrouped[entry.category] = [];
        newGrouped[entry.category].push(entry);
      }
      setGrouped(newGrouped);
      setNewName("");
    } catch (err) {
      setAddError(err.message);
    } finally {
      setSaving(false);
    }
  }, [newName]);

  const handleRemove = useCallback(async (name) => {
    setSaving(true);
    try {
      const res = await fetch("/api/insights/exclusions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ removeCustom: name }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setExclusions(json.data.exclusions);
      const newGrouped = {};
      for (const entry of json.data.exclusions) {
        if (!newGrouped[entry.category]) newGrouped[entry.category] = [];
        newGrouped[entry.category].push(entry);
      }
      setGrouped(newGrouped);
    } catch (err) {
      console.error("Remove exclusion failed:", err);
    } finally {
      setSaving(false);
    }
  }, []);

  const handleRestoreDefaults = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/insights/exclusions", { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setExclusions(json.data.exclusions);
      const newGrouped = {};
      for (const entry of json.data.exclusions) {
        if (!newGrouped[entry.category]) newGrouped[entry.category] = [];
        newGrouped[entry.category].push(entry);
      }
      setGrouped(newGrouped);
    } catch (err) {
      console.error("Restore defaults failed:", err);
    } finally {
      setSaving(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="py-4 text-center text-body-regular text-text-tertiary">
        Loading exclusions...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 py-4 text-body-regular text-error-500">
        <RiErrorWarningLine className="size-4 shrink-0" />
        <span>{error}</span>
        <Button size="sm" variant="outline" onClick={fetchExclusions} className="ms-auto">
          Retry
        </Button>
      </div>
    );
  }

  const categoryOrder = ["dependencies", "build", "cache", "vcs", "system", "internal", "custom"];

  return (
    <div className="flex flex-col gap-4">
      {/* Info text */}
      <p className="text-caption-1-regular text-text-tertiary">
        These directories are excluded from Insights scans to improve performance.
        Matching is case-insensitive and applies only to directories, not files.
      </p>

      {/* Category sections */}
      <div className="flex flex-col gap-3">
        {categoryOrder.map((cat) => {
          const entries = grouped[cat];
          if (!entries || entries.length === 0) return null;
          const label = categories[cat] || cat;
          return (
            <CategorySection
              key={cat}
              title={label}
              entries={entries}
              onToggle={handleToggle}
            />
          );
        })}
      </div>

      {/* Add custom exclusion */}
      <div className="flex flex-col gap-2">
        <label className="text-caption-1-semibold text-text-secondary">
          Add custom exclusion
        </label>
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Input
              value={newName}
              onChange={(e) => {
                setNewName(e.target.value);
                setAddError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newName.trim()) {
                  e.preventDefault();
                  handleAdd();
                }
              }}
              placeholder="Directory name (e.g., my-build)"
              disabled={saving}
            />
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleAdd}
            disabled={!newName.trim() || saving}
            leadingIcon={RiAddLine}
          >
            Add
          </Button>
        </div>
        {addError && (
          <p className="text-caption-1-regular text-error-500">{addError}</p>
        )}
      </div>

      {/* Restore defaults */}
      <div className="flex items-center justify-between pt-2 border-t border-border-button-default">
        <p className="text-caption-1-regular text-text-tertiary">
          Reset all exclusions to their default values.
        </p>
        <Button
          size="sm"
          variant="outline"
          onClick={handleRestoreDefaults}
          disabled={saving}
          leadingIcon={RiRefreshLine}
        >
          Restore defaults
        </Button>
      </div>
    </div>
  );
}
