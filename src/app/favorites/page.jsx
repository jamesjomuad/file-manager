import { redirect } from "next/navigation";

/**
 * Legacy /favorites page — redirects to workspace.
 */
export default function FavoritesPage() {
  redirect("/workspace#/favorites");
}
