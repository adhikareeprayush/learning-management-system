type Ordered = { id: string; order: number };

/**
 * Validates that `ids` lists every current row exactly once and returns the
 * rows whose `order` must change for positions to become 0..n-1 in that
 * sequence. Returns null when `ids` isn't a complete permutation.
 */
export function planReorder(current: Ordered[], ids: unknown): Ordered[] | null {
  if (!Array.isArray(ids) || ids.length !== current.length) return null;
  if (!ids.every((id): id is string => typeof id === "string")) return null;
  const known = new Map(current.map((row) => [row.id, row.order]));
  if (new Set(ids).size !== ids.length || !ids.every((id) => known.has(id))) return null;
  return ids
    .map((id, order) => ({ id, order }))
    .filter(({ id, order }) => known.get(id) !== order);
}

/**
 * (courseId, order) is unique, so rows are first parked on distinct negative
 * values; otherwise swapping two positions collides mid-transaction. Rows that
 * keep their position already hold their final (non-negative) value.
 */
export function reorderSteps(changes: Ordered[]) {
  return [
    ...changes.map(({ id }, index) => ({ id, order: -(index + 1) })),
    ...changes,
  ];
}
