"use client";

import { useCallback } from "react";
import { unstable_rethrow } from "next/navigation";
import { useOffline } from "@/lib/offline/client";
import type { QueuedMutation } from "@/lib/offline/db";

export type OfflineFormState = { error?: string; queued?: boolean };

type SafeParseable<TValues> = {
  safeParse: (data: unknown) => { success: boolean; data?: TValues };
};

type OfflineFormActionConfig<TValues> = {
  schema: SafeParseable<TValues>;
  extractFields: (formData: FormData) => unknown;
  buildMutation: (id: string, values: TValues) => QueuedMutation;
  onlineAction: (prevState: OfflineFormState, formData: FormData) => Promise<OfflineFormState>;
};

/**
 * Envuelve una server action de formulario (crear/editar) para que, sin conexión,
 * valide con el mismo schema en el cliente y encole la mutación en vez de fallar.
 *
 * La ruta online sigue redirigiendo desde el propio server action (real navegación,
 * la misma que ya cachea el Service Worker) — `unstable_rethrow` deja pasar ese
 * `NEXT_REDIRECT` sin que nuestro try/catch lo confunda con un fallo de transporte,
 * que es el único caso que debe caer a la rama offline. Sin conexión NO navegamos:
 * un `router.push` a una ruta que el navegador no tiene cacheada puede fallar de
 * forma fea (pantalla de error del propio navegador); el indicador global de
 * sincronización ya avisa que quedó en cola.
 */
export function useOfflineFormAction<TValues>(config: OfflineFormActionConfig<TValues>) {
  const { isOnline, runOrQueue } = useOffline();

  return useCallback(
    async (prevState: OfflineFormState, formData: FormData): Promise<OfflineFormState> => {
      if (isOnline) {
        try {
          return await config.onlineAction(prevState, formData);
        } catch (err) {
          unstable_rethrow(err);
          // Solo un fallo de transporte/conexión real llega aquí: la validación
          // nunca lanza (usa safeParse) y un éxito ya redirigió más arriba.
        }
      }
      const parsed = config.schema.safeParse(config.extractFields(formData));
      if (!parsed.success || !parsed.data) return { error: "invalid" };
      const id = String(formData.get("id") ?? "");
      await runOrQueue(config.buildMutation(id, parsed.data));
      return { queued: true };
    },
    [isOnline, runOrQueue, config]
  );
}

type OfflineIdActionConfig = {
  onlineAction: () => Promise<void>;
  buildMutation: () => QueuedMutation;
};

/** Igual que `useOfflineFormAction` pero para acciones sin campos (archivar, eliminar). */
export function useOfflineIdAction(config: OfflineIdActionConfig) {
  const { isOnline, runOrQueue } = useOffline();

  return useCallback(async () => {
    if (isOnline) {
      try {
        await config.onlineAction();
        return;
      } catch (err) {
        unstable_rethrow(err);
        // Fallo de transporte/conexión real: cae a la rama offline.
      }
    }
    await runOrQueue(config.buildMutation());
  }, [isOnline, runOrQueue, config]);
}
