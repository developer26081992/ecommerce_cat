export type CheckoutAttemptMarker = { fingerprint: string; id: string; completed?: boolean };

// Reuse only an unfinished attempt for this exact bag. Paid attempts must never
// be used again, even when a shopper chooses the same pieces and quantities.
export function reusableCheckoutAttempt(value: unknown, fingerprint: string): CheckoutAttemptMarker | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const marker = value as Record<string, unknown>;
  if (marker.completed === true || marker.fingerprint !== fingerprint || typeof marker.id !== 'string'
    || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(marker.id)) return null;
  return { fingerprint, id: marker.id };
}
