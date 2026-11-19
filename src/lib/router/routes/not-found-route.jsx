"use client";

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Not found route.
 * Redirects to /explorer after a brief moment.
 */
export function NotFoundView() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/explorer", { replace: true });
    }, 1500);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <div className="text-title-1-semibold text-text-primary">404</div>
      <p className="text-body-regular text-text-secondary">
        Page not found. Redirecting to Explorer...
      </p>
    </div>
  );
}
