"use client";

import { I18nProvider, useLocale } from "react-aria-components";
import { cx } from "@/utils/cx";

/**
 * Keeps CSS direction, React Aria keyboard behavior and portalled menus in sync.
 * Use at the app root, or nest providers for regions in another language.
 * The default display: contents boundary preserves the surrounding layout.
 *
 * @param {Object} props
 * @param {string} props.locale - BCP 47 language tag
 * @param {React.ReactNode} props.children
 */
export function DirectionProvider({ locale, ...props }) {
  return (
    <I18nProvider locale={locale}>
      <DirectionBoundary {...props} />
    </I18nProvider>
  );
}

function DirectionBoundary({ children, className, ...props }) {
  const { locale, direction } = useLocale();
  return <div {...props} lang={locale} dir={direction} className={cx("contents", className)}>{children}</div>;
}

/** Also works inside a React Aria I18nProvider. */
export function useDirection() {
  return useLocale().direction;
}
