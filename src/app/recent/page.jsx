import { redirect } from "next/navigation";

/**
 * Legacy /recent page — redirects to workspace.
 */
export default function RecentPage() {
  redirect("/workspace#/recent");
}
