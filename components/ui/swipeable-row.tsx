"use client";

import { createContext, useContext, useId, useRef, useState } from "react";

export type SwipeAction = {
  key: string;
  label: string;
  icon: React.ReactNode;
  background: string;
  color?: string;
  onAction: () => void;
};

const ACTION_WIDTH = 76;
const OPEN_THRESHOLD_RATIO = 0.4;

type Coordinator = { openId: string | null; setOpenId: (id: string | null) => void };
const SwipeCoordinatorContext = createContext<Coordinator | null>(null);

/**
 * Coordina que, al estilo iOS, abrir una fila cierre cualquier otra que haya
 * quedado abierta en la misma lista. Envuelve el contenedor de la lista.
 */
export function SwipeableListProvider({ children }: { children: React.ReactNode }) {
  const [openId, setOpenId] = useState<string | null>(null);
  return (
    <SwipeCoordinatorContext.Provider value={{ openId, setOpenId }}>
      {children}
    </SwipeCoordinatorContext.Provider>
  );
}

type DragState = {
  pointerId: number;
  startX: number;
  startY: number;
  base: number;
  axis: "none" | "x" | "y";
};

/**
 * Fila con acciones reveladas al deslizar horizontalmente (Mail/Recordatorios
 * de iOS). Sin dependencias — Pointer Events puros, igual que `ReorderableList`.
 * Si el primer movimiento es más vertical que horizontal, cede el gesto al
 * scroll normal de la lista.
 */
export function SwipeableRow({
  id,
  children,
  leadingActions = [],
  trailingActions = [],
}: {
  id?: string;
  children: React.ReactNode;
  leadingActions?: SwipeAction[];
  trailingActions?: SwipeAction[];
}) {
  const autoId = useId();
  const rowId = id ?? autoId;
  const coordinator = useContext(SwipeCoordinatorContext);

  const [offset, setOffset] = useState(0);
  const [open, setOpen] = useState<"none" | "leading" | "trailing">("none");
  const [dragging, setDragging] = useState(false);
  const drag = useRef<DragState | null>(null);

  const leadingWidth = leadingActions.length * ACTION_WIDTH;
  const trailingWidth = trailingActions.length * ACTION_WIDTH;

  function close() {
    setOpen("none");
    setOffset(0);
  }

  function openSide(side: "leading" | "trailing") {
    setOpen(side);
    setOffset(side === "leading" ? leadingWidth : -trailingWidth);
    coordinator?.setOpenId(rowId);
  }

  // Otra fila se abrió: esta se cierra. Patrón de "ajustar estado durante el
  // render" (https://react.dev/reference/react/useState#storing-information-from-previous-renders):
  // se compara contra el `openId` visto en el render anterior, no en un efecto,
  // para no arrastrar un frame de retraso ni disparar un ciclo extra de efectos.
  const [lastSeenOpenId, setLastSeenOpenId] = useState(coordinator?.openId ?? null);
  if (coordinator && coordinator.openId !== lastSeenOpenId) {
    setLastSeenOpenId(coordinator.openId);
    if (coordinator.openId !== rowId && open !== "none") {
      setOpen("none");
      setOffset(0);
    }
  }

  function handlePointerDown(e: React.PointerEvent) {
    if (leadingActions.length === 0 && trailingActions.length === 0) return;
    drag.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      base: open === "leading" ? leadingWidth : open === "trailing" ? -trailingWidth : 0,
      axis: "none",
    };
  }

  function handlePointerMove(e: React.PointerEvent) {
    const st = drag.current;
    if (!st || st.pointerId !== e.pointerId) return;
    const dx = e.clientX - st.startX;
    const dy = e.clientY - st.startY;

    if (st.axis === "none") {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      if (Math.abs(dx) <= Math.abs(dy)) {
        drag.current = null;
        return;
      }
      st.axis = "x";
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
      setDragging(true);
      coordinator?.setOpenId(rowId);
    }

    const next = Math.max(-trailingWidth, Math.min(leadingWidth, st.base + dx));
    setOffset(next);
  }

  function handlePointerUp(e: React.PointerEvent) {
    const st = drag.current;
    if (!st || st.pointerId !== e.pointerId) return;
    drag.current = null;
    setDragging(false);

    if (offset > leadingWidth * OPEN_THRESHOLD_RATIO && leadingWidth > 0) openSide("leading");
    else if (offset < -trailingWidth * OPEN_THRESHOLD_RATIO && trailingWidth > 0) openSide("trailing");
    else close();
  }

  function runAction(action: SwipeAction) {
    close();
    action.onAction();
  }

  return (
    <div className="relative overflow-hidden">
      {leadingActions.length > 0 && (
        <div className="absolute inset-y-0 left-0 flex" style={{ width: leadingWidth }}>
          {leadingActions.map((action) => (
            <button
              key={action.key}
              type="button"
              onClick={() => runAction(action)}
              aria-label={action.label}
              className="flex flex-col items-center justify-center gap-1 text-[10px] font-medium"
              style={{ width: ACTION_WIDTH, background: action.background, color: action.color ?? "#fff" }}
            >
              {action.icon}
              {action.label}
            </button>
          ))}
        </div>
      )}
      {trailingActions.length > 0 && (
        <div className="absolute inset-y-0 right-0 flex" style={{ width: trailingWidth }}>
          {trailingActions.map((action) => (
            <button
              key={action.key}
              type="button"
              onClick={() => runAction(action)}
              aria-label={action.label}
              className="flex flex-col items-center justify-center gap-1 text-[10px] font-medium"
              style={{ width: ACTION_WIDTH, background: action.background, color: action.color ?? "#fff" }}
            >
              {action.icon}
              {action.label}
            </button>
          ))}
        </div>
      )}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          transform: `translateX(${offset}px)`,
          transition: dragging ? "none" : "transform 200ms ease",
          touchAction: "pan-y",
          position: "relative",
          background: "var(--color-bg)",
        }}
      >
        {open !== "none" && (
          <div
            className="absolute inset-0 z-10"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              close();
            }}
          />
        )}
        {children}
      </div>
    </div>
  );
}
