import { redirect } from "next/navigation";

/**
 * Legacy /editor page — redirects to workspace.
 * The editor is now a workspace tab opened from the file explorer.
 */
export default function EditorPage() {
  redirect("/workspace");
}
