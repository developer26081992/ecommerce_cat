import type { CheckoutItem } from './checkout-types';

export const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function parseCheckoutBody(value: unknown): { requestId: string; items: CheckoutItem[] } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid checkout request.');
  const body = value as Record<string, unknown>;
  if (typeof body.requestId !== 'string' || !uuidPattern.test(body.requestId)) throw new Error('Refresh your bag and try again.');
  if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 20) throw new Error('Choose between 1 and 20 different products.');
  const ids = new Set<string>();
  const items = body.items.map((item: unknown) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error('Invalid bag item.');
    const row = item as Record<string, unknown>;
    if (Object.keys(row).some(key => key !== 'id' && key !== 'quantity') || typeof row.id !== 'string' || !uuidPattern.test(row.id)
      || typeof row.quantity !== 'number' || !Number.isInteger(row.quantity) || row.quantity < 1 || row.quantity > 99) throw new Error('Invalid bag item. Refresh your bag and try again.');
    const id = row.id.toLowerCase();
    if (ids.has(id)) throw new Error('Each product must appear only once in the bag.');
    ids.add(id);
    return { id, quantity: row.quantity };
  }).sort((a, b) => a.id.localeCompare(b.id));
  return { requestId: body.requestId.toLowerCase(), items };
}

export function isTestStripeKey(key: string) { return /^(sk|rk)_test_/.test(key); }
export function isCheckoutSessionId(value: unknown): value is string { return typeof value === 'string' && /^cs_test_[A-Za-z0-9_]{8,250}$/.test(value); }
