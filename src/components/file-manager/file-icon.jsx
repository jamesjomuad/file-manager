"use client";

import { cx } from "@/utils/cx";
import { RiFileLine } from "@remixicon/react";
import { resolveFileIcon, resolveFolderIcon } from "@/lib/file-icons/file-icon-registry";
import { useTheme } from "@/contexts/theme-context";

/**
 * File/folder icon component with comprehensive file-type recognition
 *
 * Uses a centralized icon registry that resolves icons based on:
 * 1. Exact filename (package.json, .gitignore, Dockerfile, etc.)
 * 2. Compound extensions (.tar.gz, .d.ts, etc.)
 * 3. File extension (.js, .py, .html, etc.)
 * 4. MIME type fallback
 * 5. Generic file icon
 *
 * For folders, supports contextual icons for common directory names
 * (node_modules, src, .git, etc.)
 *
 * Generic folders use the accent color; special folders and files use brand colors.
 *
 * @param {Object} props
 * @param {'file'|'directory'} props.type - Whether it's a file or directory
 * @param {string} [props.name] - Full filename for exact matching
 * @param {string} [props.extension] - File extension (without dot) - fallback
 * @param {string} [props.mimeType] - MIME type for fallback
 * @param {boolean} [props.isOpen=false] - For directories: whether open/expanded
 * @param {boolean} [props.isHidden=false] - For directories: whether hidden (starts with .)
 * @param {'sm'|'md'|'lg'} [props.size='sm'] - Icon size preset
 * @param {string} [props.className] - Additional CSS classes
 */
export function FileIcon({
  type,
  name,
  extension,
  mimeType,
  isOpen = false,
  isHidden = false,
  size = "sm",
  className,
}) {
  const { themeObject } = useTheme();
  const sizeClass = size === "lg" ? "size-10" : size === "md" ? "size-6" : "size-5";

  // Directory
  if (type === "directory") {
    const folderName = name || "";
    const isDirHidden = isHidden || folderName.startsWith(".");
    const iconDef = resolveFolderIcon({
      name: folderName,
      isOpen,
      isHidden: isDirHidden,
    });
    const Icon = iconDef.icon;

    // Use accent color for generic folders (not special folders or hidden)
    const isGenericFolder = !iconDef.label || 
      iconDef.label === "Folder" || 
      iconDef.label === "Open Folder";
    const iconColor = isGenericFolder 
      ? themeObject.tokens["--color-accent-500"] || "#FBBF24"
      : iconDef.color;

    return (
      <div className={cx("flex items-center justify-center", className)}>
        <Icon className={sizeClass} style={{ color: iconColor }} aria-hidden />
      </div>
    );
  }

  // File - resolve from registry
  const iconDef = resolveFileIcon({ name, extension, mimeType });
  const Icon = iconDef.icon || RiFileLine;

  return (
    <div className={cx("flex items-center justify-center", className)}>
      <Icon className={sizeClass} style={{ color: iconDef.color }} aria-hidden />
    </div>
  );
}
