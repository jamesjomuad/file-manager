import {
  RiArrowLeftLine,
  RiArrowLeftSLine,
  RiArrowRightLine,
  RiArrowRightSLine,
  RiSidebarFoldLine,
  RiSidebarUnfoldLine,
} from "@remixicon/react";

/** Navigation glyphs mirror; logos, media controls and trend arrows do not. */
const directionalIcons = new Set([
  RiArrowLeftLine, RiArrowLeftSLine, RiArrowRightLine, RiArrowRightSLine,
  RiSidebarFoldLine, RiSidebarUnfoldLine,
]);

export function directionalIconClass(icon) {
  return directionalIcons.has(icon) ? "rtl:rotate-180" : undefined;
}
