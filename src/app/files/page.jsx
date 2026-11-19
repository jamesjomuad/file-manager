import { redirect } from "next/navigation";

/**
 * Legacy /files page — redirects to workspace.
 */
export default function FilesPage() {
  redirect("/workspace");
}
