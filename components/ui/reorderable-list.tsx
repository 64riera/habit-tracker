"use client";

import { useState } from "react";

const ROW_HEIGHT_ESTIMATE = 56;

/** Lista reordenable por arrastre (mouse y touch, sin dependencias) via Pointer Events. */
export function ReorderableList<T extends { id: string }>({
  items,
  onReorder,
  renderItem,
}: {
  items: T[];
  onReorder: (orderedIds: string[]) => void;
  renderItem: (
    item: T,
    dragHandleProps: { onPointerDown: (e: React.PointerEvent) => void; onKeyDown: (e: React.KeyboardEvent) => void }
  ) => React.ReactNode;
}) {
  const [prevItems, setPrevItems] = useState(items);
  const [order, setOrder] = useState(items.map((i) => i.id));
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [startY, setStartY] = useState(0);

  if (items !== prevItems) {
    setPrevItems(items);
    setOrder(items.map((i) => i.id));
  }

  function handlePointerDown(id: string, e: React.PointerEvent) {
    setDragId(id);
    setStartY(e.clientY);
    (e.target as Element).setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragId) return;
    const delta = e.clientY - startY;
    setDragOffset(delta);

    const idx = order.indexOf(dragId);

    if (delta > ROW_HEIGHT_ESTIMATE / 2 && idx < order.length - 1) {
      const next = [...order];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      setOrder(next);
      setStartY(e.clientY);
      setDragOffset(0);
    } else if (delta < -ROW_HEIGHT_ESTIMATE / 2 && idx > 0) {
      const next = [...order];
      [next[idx], next[idx - 1]] = [next[idx - 1], next[idx]];
      setOrder(next);
      setStartY(e.clientY);
      setDragOffset(0);
    }
  }

  function handlePointerUp() {
    if (dragId) onReorder(order);
    setDragId(null);
    setDragOffset(0);
  }

  /** Alternativa accesible al arrastre: flechas ↑/↓ mueven el elemento de inmediato. */
  function handleKeyDown(id: string, e: React.KeyboardEvent) {
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
    e.preventDefault();
    const idx = order.indexOf(id);
    const targetIdx = e.key === "ArrowUp" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= order.length) return;
    const next = [...order];
    [next[idx], next[targetIdx]] = [next[targetIdx], next[idx]];
    setOrder(next);
    onReorder(next);
  }

  const byId = new Map(items.map((i) => [i.id, i]));

  return (
    <div onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp}>
      {order.map((id) => {
        const item = byId.get(id);
        if (!item) return null;
        const isDragging = id === dragId;
        return (
          <div
            key={id}
            style={{
              transform: isDragging ? `translateY(${dragOffset}px)` : undefined,
              position: "relative",
              zIndex: isDragging ? 10 : undefined,
              background: isDragging ? "var(--color-bg)" : undefined,
            }}
          >
            {renderItem(item, {
              onPointerDown: (e) => handlePointerDown(id, e),
              onKeyDown: (e) => handleKeyDown(id, e),
            })}
          </div>
        );
      })}
    </div>
  );
}
