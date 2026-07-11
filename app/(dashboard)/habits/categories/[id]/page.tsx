import { notFound } from "next/navigation";
import { getCategories } from "@/lib/queries/habits";
import { CategoryForm } from "@/components/habit/category-form";
import { ContentHeader } from "@/components/nav/content-header";
import { DeleteCategoryButton } from "./delete-category-button";

export default async function CategoriaDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const categories = await getCategories();
  const category = categories.find((c) => c.id === id);
  if (!category) notFound();

  return (
    <div>
      <ContentHeader
        titleKey="categories.manage"
        subtitleKey="screens.habitos.subtitle"
        backHref="/habits/categories"
      />
      <CategoryForm category={category} />
      <div className="mt-3">
        <DeleteCategoryButton categoryId={id} />
      </div>
    </div>
  );
}
