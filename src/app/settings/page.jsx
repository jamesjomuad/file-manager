import { redirect } from "next/navigation";

/**
 * Legacy /settings page — redirects to workspace.
 */
export default function SettingsPage() {
  redirect("/workspace#/settings");
}
