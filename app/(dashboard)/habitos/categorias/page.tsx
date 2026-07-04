import { getCategories } from "@/lib/queries/habits";
import { createCategory } from "@/lib/actions/categories";
import { CategoryForm } from "@/components/habit/category-form";
import { CategoriasClient } from "./categorias-client";

export default async function CategoriasPage() {
  const categories = await getCategories();

  return (
    <div>
      <CategoriasClient categories={categories} />
      <div className="mt-6 border-t border-border pt-5">
        <CategoryForm action={createCategory} />
      </div>
    </div>
  );
}
