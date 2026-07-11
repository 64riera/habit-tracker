import { getCategories } from "@/lib/queries/habits";
import { CategoriasClient } from "./categories-client";

export default async function CategoriasPage() {
  const categories = await getCategories({ includeHidden: true });

  return <CategoriasClient categories={categories} />;
}
