import { redirect } from "next/navigation";

/**
 * Legacy /trash page — redirects to workspace.
 */
export default function TrashPage() {
  redirect("/workspace#/trash");
}
