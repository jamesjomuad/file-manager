"use client";

import { cx } from "@/utils/cx";
import {
  RiFolderLine,
  RiImageLine,
  RiFileTextLine,
  RiCodeLine,
  RiVideoLine,
  RiMusicLine,
  RiFileZipLine,
  RiFileLine,
} from "@remixicon/react";

/**
 * Map of file extensions to their icon component and color token.
 */
const EXTENSION_MAP = {
  // Images
  jpg: { icon: RiImageLine, color: "text-foreground-icon-accent" },
  jpeg: { icon: RiImageLine, color: "text-foreground-icon-accent" },
  png: { icon: RiImageLine, color: "text-foreground-icon-accent" },
  gif: { icon: RiImageLine, color: "text-foreground-icon-accent" },
  svg: { icon: RiImageLine, color: "text-foreground-icon-accent" },
  webp: { icon: RiImageLine, color: "text-foreground-icon-accent" },
  bmp: { icon: RiImageLine, color: "text-foreground-icon-accent" },

  // Documents
  pdf: { icon: RiFileTextLine, color: "text-foreground-icon-error" },
  doc: { icon: RiFileTextLine, color: "text-foreground-icon-accent" },
  docx: { icon: RiFileTextLine, color: "text-foreground-icon-accent" },
  txt: { icon: RiFileTextLine, color: "text-foreground-icon-tertiary" },
  md: { icon: RiFileTextLine, color: "text-foreground-icon-tertiary" },
  rtf: { icon: RiFileTextLine, color: "text-foreground-icon-tertiary" },

  // Code
  js: { icon: RiCodeLine, color: "text-foreground-icon-success" },
  jsx: { icon: RiCodeLine, color: "text-foreground-icon-success" },
  ts: { icon: RiCodeLine, color: "text-foreground-icon-accent" },
  tsx: { icon: RiCodeLine, color: "text-foreground-icon-accent" },
  py: { icon: RiCodeLine, color: "text-foreground-icon-success" },
  html: { icon: RiCodeLine, color: "text-foreground-icon-error" },
  css: { icon: RiCodeLine, color: "text-foreground-icon-accent" },
  scss: { icon: RiCodeLine, color: "text-foreground-icon-error" },
  json: { icon: RiCodeLine, color: "text-foreground-icon-tertiary" },
  xml: { icon: RiCodeLine, color: "text-foreground-icon-tertiary" },
  yaml: { icon: RiCodeLine, color: "text-foreground-icon-tertiary" },
  yml: { icon: RiCodeLine, color: "text-foreground-icon-tertiary" },
  java: { icon: RiCodeLine, color: "text-foreground-icon-error" },
  c: { icon: RiCodeLine, color: "text-foreground-icon-accent" },
  cpp: { icon: RiCodeLine, color: "text-foreground-icon-accent" },
  go: { icon: RiCodeLine, color: "text-foreground-icon-accent" },
  rs: { icon: RiCodeLine, color: "text-foreground-icon-error" },
  rb: { icon: RiCodeLine, color: "text-foreground-icon-error" },
  php: { icon: RiCodeLine, color: "text-foreground-icon-accent" },
  sh: { icon: RiCodeLine, color: "text-foreground-icon-tertiary" },

  // Video
  mp4: { icon: RiVideoLine, color: "text-foreground-icon-error" },
  avi: { icon: RiVideoLine, color: "text-foreground-icon-error" },
  mov: { icon: RiVideoLine, color: "text-foreground-icon-error" },
  mkv: { icon: RiVideoLine, color: "text-foreground-icon-error" },
  webm: { icon: RiVideoLine, color: "text-foreground-icon-error" },

  // Audio
  mp3: { icon: RiMusicLine, color: "text-foreground-icon-accent" },
  wav: { icon: RiMusicLine, color: "text-foreground-icon-accent" },
  ogg: { icon: RiMusicLine, color: "text-foreground-icon-accent" },
  flac: { icon: RiMusicLine, color: "text-foreground-icon-accent" },
  aac: { icon: RiMusicLine, color: "text-foreground-icon-accent" },

  // Archives
  zip: { icon: RiFileZipLine, color: "text-foreground-icon-tertiary" },
  tar: { icon: RiFileZipLine, color: "text-foreground-icon-tertiary" },
  gz: { icon: RiFileZipLine, color: "text-foreground-icon-tertiary" },
  rar: { icon: RiFileZipLine, color: "text-foreground-icon-tertiary" },
  "7z": { icon: RiFileZipLine, color: "text-foreground-icon-tertiary" },
};

/**
 * File icon component that renders the appropriate icon based on file type
 * @param {Object} props
 * @param {'file'|'directory'} props.type - Whether it's a file or directory
 * @param {string} [props.category] - Optional category hint
 * @param {string} [props.extension] - File extension (without dot)
 * @param {'sm'|'lg'} [props.size='sm'] - Icon size
 * @param {string} [props.className] - Additional classes
 */
export function FileIcon({
  type,
  category,
  extension,
  size = "sm",
  className,
}) {
  const sizeClass = size === "lg" ? "size-10" : "size-5";

  // Directory
  if (type === "directory") {
    const Icon = RiFolderLine;
    return (
      <div className={cx("flex items-center justify-center", className)}>
        <Icon className={cx(sizeClass, "text-accent-500")} aria-hidden />
      </div>
    );
  }

  // File - look up by extension
  const ext = extension?.toLowerCase().replace(/^\./, "");
  const mapping = ext ? EXTENSION_MAP[ext] : null;

  if (mapping) {
    const Icon = mapping.icon;
    return (
      <div className={cx("flex items-center justify-center", className)}>
        <Icon className={cx(sizeClass, mapping.color)} aria-hidden />
      </div>
    );
  }

  // Default file icon
  return (
    <div className={cx("flex items-center justify-center", className)}>
      <RiFileLine
        className={cx(sizeClass, "text-foreground-icon-tertiary")}
        aria-hidden
      />
    </div>
  );
}
