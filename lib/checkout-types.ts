export type CheckoutItem = { id: string; quantity: number };
export type OrderItem = CheckoutItem & { name: string; slug: string; imageUrl: string; unitAmount: number };
export type Order = { id: string; userId: string; totalAmount: number; currency: string; status: 'paid'; stripeSessionId: string; items: OrderItem[]; createdAt: string };
export type CheckoutAttempt = { id: string; userId: string; requestedItems: CheckoutItem[]; items: OrderItem[]; amountTotal: number; currency: string; state: 'pending' | 'completed' | 'released'; stripeSessionId: string | null; createdAt: string; expiresAt: string };
export type CheckoutStatus = { status: 'paid'; order: Order } | { status: 'pending' | 'expired' | 'unavailable'; order?: never };
