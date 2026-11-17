// Hands an ingredient chosen on another screen (e.g. a scanned product)
// back to the New dish screen when it regains focus.

let pending: string[] = [];

export function pushPick(ingredientId: string) {
  pending.push(ingredientId);
}

export function takePicks(): string[] {
  const out = pending;
  pending = [];
  return out;
}
