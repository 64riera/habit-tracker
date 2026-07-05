import { z } from "zod";

export const categorySchema = z.object({
  nameEs: z.string().trim().min(1).max(40),
  nameEn: z.string().trim().min(1).max(40),
  color: z.string().trim().min(1),
  icon: z.string().trim().max(4).optional().or(z.literal("")),
});

export type CategoryFormValues = z.infer<typeof categorySchema>;

export function extractCategoryFields(formData: FormData): unknown {
  return {
    nameEs: formData.get("nameEs"),
    nameEn: formData.get("nameEn"),
    color: formData.get("color"),
    icon: formData.get("icon") ?? "",
  };
}
