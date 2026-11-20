/**
 * Custom SVG file-type icons for technologies not covered by Remix Icons.
 *
 * All icons are inline React components following the same API as Remix Icons:
 * - Accept `className`, `size`, `color`, and spread props
 * - Default viewBox "0 0 24 24"
 * - Render an <svg> element
 *
 * Brand colors are embedded as fill values for visual recognition,
 * matching the VS Code Material Icon Theme approach.
 *
 * License: These are original SVG paths inspired by technology logos.
 * They are simplified representations for file-type identification only.
 */

import { forwardRef } from 'react';

/**
 * Helper to create a brand icon component
 * @param {string} displayName
 * @param {React.ReactNode} paths - SVG path elements
 * @returns {React.ForwardRefExoticComponent}
 */
function createBrandIcon(displayName, paths) {
  const Icon = forwardRef(function BrandIcon(
    { color, size = 24, className = '', ...props },
    ref
  ) {
    return (
      <svg
        ref={ref}
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        fill={color}
        className={className}
        aria-hidden
        {...props}
      >
        {paths}
      </svg>
    );
  });
  Icon.displayName = displayName;
  return Icon;
}

// --- Programming Languages ---

export const RiReactjsLine = createBrandIcon('RiReactjsLine', (
  <g fill="none" stroke="#61DAFB" strokeWidth="1.2">
    <circle cx="12" cy="12" r="2.2" fill="#61DAFB" />
    <ellipse cx="12" cy="12" rx="10" ry="4.2" />
    <ellipse cx="12" cy="12" rx="10" ry="4.2" transform="rotate(60 12 12)" />
    <ellipse cx="12" cy="12" rx="10" ry="4.2" transform="rotate(120 12 12)" />
  </g>
));

export const RiVuejsLine = createBrandIcon('RiVuejsLine', (
  <g fill="none">
    <polygon points="2,3 12,21 22,3" fill="#42B883" />
    <polygon points="6.5,3 12,13 17.5,3" fill="#35495E" />
  </g>
));

export const RiAngularjsLine = createBrandIcon('RiAngularjsLine', (
  <g fill="#DD0031">
    <path d="M12 2L3 5.5l1.5 11L12 22l7.5-5.5 1.5-11L12 2zm0 2.3l5.8 11h-2l-1.3-3.2H9.5L8.2 15.3h-2L12 4.3zm0 4.2l1.6 3.5h-3.2L12 8.5z" />
  </g>
));

export const RiSvelteLine = createBrandIcon('RiSvelteLine', (
  <g fill="#FF3E00">
    <path d="M17.67 3.47a5.46 5.46 0 0 0-7.27-1.43L5.47 5.58A5.46 5.46 0 0 0 3.4 9.9v1.48a3.96 3.96 0 0 0 .72 1.71 5.46 5.46 0 0 0 7.27 1.43l4.93-3.54a3.96 3.96 0 0 0 2.07-3.32V6.18A5.46 5.46 0 0 0 17.67 3.47zM11.4 15.73a3.24 3.24 0 0 1-4.36-.87 2.36 2.36 0 0 1-.43-1v-1.48a2.36 2.36 0 0 1 .43-1l.87-.62 3.2-2.3a3.24 3.24 0 0 1 4.36.87c.28.38.43.83.43 1.29a2.36 2.36 0 0 1-.43 1l-3.2 2.3-.87.62a2.36 2.36 0 0 1-.43 1v.5z" />
  </g>
));

export const RiPythonLine = createBrandIcon('RiPythonLine', (
  <g>
    <path d="M11.91 2c-2.5 0-4.17.66-5 2v3.5h5v.5H6.41c-1.67 0-3.41.83-3.41 4s1.25 4 3.41 4h1.5v-2.5c0-1.67 1.33-3 3-3h5c1.67 0 3-1.33 3-3V6c0-1.67-1.33-2.5-3-2.5h-6zm-2 1.5a1 1 0 1 1 0 2 1 1 0 0 1 0-2z" fill="#3776AB" />
    <path d="M12.09 22c2.5 0 4.17-.66 5-2v-3.5h-5v-.5h5.5c1.67 0 3.41-.83 3.41-4s-1.25-4-3.41-4h-1.5v2.5c0 1.67-1.33 3-3 3h-5c-1.67 0-3 1.33-3 3v2.5c0 1.67 1.33 2.5 3 2.5h6zm2-1.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2z" fill="#FFD43B" />
  </g>
));

export const RiGoLine = createBrandIcon('RiGoLine', (
  <g>
    <path d="M5.5 8.5c1.38 0 2.5.84 2.5 2.25S6.88 13 5.5 13 3 12.16 3 10.75 4.12 8.5 5.5 8.5z" fill="#00ADD8" />
    <path d="M12.5 8.5c1.38 0 2.5.84 2.5 2.25s-1.12 2.25-2.5 2.25S10 12.16 10 10.75s1.12-2.25 2.5-2.25z" fill="#00ADD8" />
    <path d="M18.5 5.5c-2.49 0-4.5 1.67-4.5 3.75 0 1.3.78 2.44 1.97 3.13L14 16h3l1.5-3.5c.64.17 1.3.25 2 .25 2.49 0 4.5-1.67 4.5-3.75S20.99 5.5 18.5 5.5z" fill="#00ADD8" transform="scale(0.72) translate(4, 2)" />
  </g>
));

export const RiRustLine = createBrandIcon('RiRustLine', (
  <g fill="#DEA584">
    <path d="M12 2L9.5 4.5l-3.5-.5v3.5L3 10l1.5 2.5L3 15l3.5.5v3l3.5-.5L12 21l2-2.5 3.5.5v-3l3-.5-1.5-2.5L20.5 10 19 7.5V4.5L15.5 5 12 2zm0 5.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9zm0 2a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z" />
  </g>
));

export const RiSwiftLine = createBrandIcon('RiSwiftLine', (
  <g fill="#F05138">
    <path d="M20.26 17.46C18.89 18.9 16.34 20.5 13.5 20.5c-3.58 0-6.82-2.18-9.1-5.67 2.8 2.27 5.86 3.41 8.28 3.41.96 0 1.83-.18 2.58-.54-2.58-.63-5.56-2.72-7.97-5.6 1.78 1.73 4.33 3.63 6.72 4.27-1.68-.72-3.48-2.35-4.94-4.18 1.94 1.67 4.47 3.36 6.27 3.72-.88-.54-1.82-1.48-2.64-2.58 1.56 1.35 3.36 2.45 4.55 2.73-.42-.3-.87-.72-1.3-1.2.86.72 1.74 1.26 2.43 1.46a4.5 4.5 0 0 1-.82-1.28c.97 1.07 1.98 1.69 2.62 1.78l-.08-.32c.27.32.45.51.45.51s-.15-.16-.45-.51c-.53-.86-1.2-2.55-1.38-3.94.58 1.1 1.35 2.52 2.04 3.29-.17-1.42-.6-2.84-1.05-3.75.93 1.04 1.62 2.6 1.93 3.67.08-.44.12-.88.12-1.33 0-3.31-2.69-6-6-6-1.3 0-2.5.4-3.5 1.1 1-.6 2.2-.95 3.5-.95 2.93 0 5.3 2.37 5.3 5.3 0 .46-.06.9-.17 1.33z" />
  </g>
));

export const RiKotlinLine = createBrandIcon('RiKotlinLine', (
  <g fill="#7F52FF">
    <path d="M3 21V3h9L3 12.5V21h9L3 21zM12 3l9 9-9 9h9V3h-9z" />
  </g>
));

export const RiDartLine = createBrandIcon('RiDartLine', (
  <g fill="#0175C2">
    <path d="M4 7.5L10.5 4H20v5l-3.5 3.5L13 9l-2 2 3.5 3.5L11 18H4V7.5z" />
  </g>
));

export const RiRubyLine = createBrandIcon('RiRubyLine', (
  <g fill="#CC342D">
    <path d="M15.7 3.2L21 8.5l-2.8 12.3L6.5 21 3 15.5l2.5-12.3H15.7zM12 6.5L7 11l5 7 5-5.5-5-6z" />
  </g>
));

export const RiLuaLine = createBrandIcon('RiLuaLine', (
  <g>
    <circle cx="15" cy="9" r="4" fill="#000080" />
    <circle cx="17" cy="7" r="1.5" fill="#fff" />
    <circle cx="9" cy="15" r="4" fill="#000080" />
    <circle cx="11" cy="13" r="1.5" fill="#fff" />
  </g>
));

export const RiRLine = createBrandIcon('RiRLine', (
  <g fill="#276DC3">
    <path d="M8 3h3.5c3 0 5 1.5 5 4.2 0 2-.9 3.2-2.5 3.8L17 18h-3.5l-2.5-6H9v6H6V3h2zm2 2.5v4h1.5c1.5 0 2.3-.7 2.3-2s-.8-2-2.3-2H10z" />
  </g>
));

export const RiPerlLine = createBrandIcon('RiPerlLine', (
  <g fill="#39457E">
    <path d="M12 2C7 2 3 6 3 10.5c0 3 2 5.5 5 6.5v3l2.5-2.5c.5.1 1 .1 1.5.1 5 0 9-3.5 9-7.6S17 2 12 2zm-2 12a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z" />
  </g>
));

// --- Build & Config ---

export const RiDockerLine = createBrandIcon('RiDockerLine', (
  <g fill="#2496ED">
    <path d="M2 11h2v-2H2v2zm3 0h2v-2H5v2zm3 0h2v-2H8v2zm-3-3h2V6H5v2zm3 0h2V6H8v2zm3 0h2V6h-2v2zm3 0h2V6h-2v2zM1.2 11.5C.8 12 0 13.2 0 15c0 3.5 3 6 8 6 7 0 11-2 13-5.5.7-1.2 1-2.5 1-3.5H1.2z" />
  </g>
));

export const RiNginxLine = createBrandIcon('RiNginxLine', (
  <g fill="#009639">
    <path d="M12 2L4 6v6c0 5 3.5 9.5 8 10 4.5-.5 8-5 8-10V6l-8-4zm-1 5h2v10h-2V7z" />
  </g>
));

export const RiNodeLine = createBrandIcon('RiNodeLine', (
  <g fill="#339933">
    <path d="M12 2L3.5 7v10L12 22l8.5-5V7L12 2zm0 3l5.5 3.2v6.6L12 18l-5.5-3.2V8.2L12 5zm-1 3v8l3-2v-4l-3-2z" />
  </g>
));

// --- System & Security ---

export const RiGitLine = createBrandIcon('RiGitLine', (
  <g fill="#F05032">
    <path d="M12 2a3 3 0 0 0-1 5.8v4.4a3 3 0 0 0 2 2.8V9.8A3 3 0 0 0 12 4a3 3 0 0 0 0 12 3 3 0 0 0 2-2.8v2.1a3 3 0 1 1-4 0V7.8A3 3 0 1 1 12 2zm0 2a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm0 12a1 1 0 1 0 0 2 1 1 0 0 0 0-2z" />
  </g>
));

export const RiKeyLine = createBrandIcon('RiKeyLine', (
  <g fill="#FFB86C">
    <path d="M16 2a5 5 0 0 0-4.5 7.2L4 16.7V20h3.3v-2H9v-1.7h1.7v-2h2l1.3-1.3A5 5 0 1 0 16 2zm-1 3a2 2 0 1 1 0 4 2 2 0 0 1 0-4z" />
  </g>
));

export const RiCertLine = createBrandIcon('RiCertLine', (
  <g fill="#50FA7B">
    <path d="M12 2C8 2 5 5 5 9c0 3 2 5.5 4.5 6.5V22L12 20l2.5 2v-6.5C17 14.5 19 12 19 9c0-4-3-7-7-7zm0 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8z" />
  </g>
));

// --- Database ---

export const RiSqlLine = createBrandIcon('RiSqlLine', (
  <g fill="#E38D16">
    <path d="M3 7c0-1.7 4-3 9-3s9 1.3 9 3-4 3-9 3-9-1.3-9-3zm0 3c0 1.7 4 3 9 3s9-1.3 9-3v3c0 1.7-4 3-9 3s-9-1.3-9-3v-3zm0 5c0 1.7 4 3 9 3s9-1.3 9-3v3c0 1.7-4 3-9 3s-9-1.3-9-3v-3z" />
  </g>
));

export const RiGraphqlLine = createBrandIcon('RiGraphqlLine', (
  <g fill="#E10098">
    <path d="M12 2l-1.5.9L6 5.5v7l-1.5.9v2L12 21l7.5-5.6v-2L18 12.5v-7l-4.5-2.6L12 2zm0 3l4 2.3v5.4L12 15l-4-2.3V7.3L12 5z" />
  </g>
));

// --- Fonts ---

export const RiFontLine = createBrandIcon('RiFontLine', (
  <g fill="#9A6FC4">
    <path d="M6 3h12l1 2H5l1-2zM8 7h8l-1 14h-6L8 7zm2 2l.8 10h2.4L14 9h-4z" />
  </g>
));

// --- Executables ---

export const RiExeLine = createBrandIcon('RiExeLine', (
  <g fill="#7B8CDE">
    <path d="M4 2h12l4 4v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm3 8v2h2v2H7v2H5v-2H3v-2h2v-2H5v-2h2v2zm7-1a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />
  </g>
));

export const RiApkLine = createBrandIcon('RiApkLine', (
  <g fill="#3DDC84">
    <path d="M17.6 9.4L12 4 6.4 9.4l-.7-.7L12 2.4l6.3 6.3-.7.7zM12 5v14M8 13l4 4 4-4M5 21h14" stroke="#3DDC84" strokeWidth="1.5" fill="none" />
  </g>
));

// --- Log files ---

export const RiLogLine = createBrandIcon('RiLogLine', (
  <g fill="#8BE9FD">
    <path d="M4 2h16v20H4V2zm2 3v2h12V5H6zm0 4v1h12V9H6zm0 3v1h8v-1H6zm0 3v1h10v-1H6zm0 3v1h6v-1H6z" />
  </g>
));

// --- Protocol Buffers ---

export const RiProtobufLine = createBrandIcon('RiProtobufLine', (
  <g fill="#4285F4">
    <path d="M8 4a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm8 0a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM8 16a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm8 0a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM8 7v3h2V7H8zm6 0v3h2V7h-2zM5 10v4H4v-4h1zm14 0v4h-1v-4h1zM8 14v-1h2v1H8zm6 0v-1h2v1h-2z" />
  </g>
));

// --- Astro ---

export const RiAstroLine = createBrandIcon('RiAstroLine', (
  <g>
    <path d="M15.3 16.5c-.5.4-1.2.5-1.8.5-1.5 0-2.3-1-2.3-2.3 0-1.5 1-2.5 2.5-2.5.5 0 1 .1 1.5.4l-1 1c-.2-.1-.3-.1-.5-.1-.7 0-1 .5-1 1 0 .6.4 1 1 1 .2 0 .4-.1.5-.1l1.1 1zm4.7-1.4c0-3-2.4-5.4-5.5-5.4s-5.5 2.4-5.5 5.4c0 3 2.4 5.4 5.5 5.4s5.5-2.4 5.5-5.4z" fill="#FF5D01" />
    <path d="M12 2l-2 4h4L12 2z" fill="#FF5D01" />
  </g>
));
