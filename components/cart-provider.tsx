'use client';
import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import { Product } from '@/lib/types';
import type { CheckoutItem } from '@/lib/checkout-types';

type Cart = { items: CheckoutItem[]; completedOrders: string[] };
type CartContextValue = { items: CheckoutItem[]; ready: boolean; count: number; add: (product: Product, quantity?: number) => void; update: (id: string, quantity: number, stock: number) => void; remove: (id: string) => void; completePurchase: (orderId: string, purchased: CheckoutItem[]) => void; notice: string };
const CartContext = createContext<CartContextValue | null>(null);
const key = 'field-form-cart-v1';
export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart>({ items: [], completedOrders: [] });
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState('');
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(key) || '[]');
      const source = Array.isArray(saved) ? saved : saved?.items;
      const completedOrders = Array.isArray(saved?.completedOrders) ? saved.completedOrders.filter((id: unknown) => typeof id === 'string').slice(-100) : [];
      if (Array.isArray(source)) {
        const unique = new Map<string, CheckoutItem>();
        for (const item of source.slice(0, 100)) if (item && typeof item.id === 'string' && /^[0-9a-f-]{36}$/i.test(item.id) && Number.isInteger(item.quantity) && item.quantity > 0) unique.set(item.id, { id: item.id, quantity: Math.min(item.quantity, 99) });
        setCart({ items: [...unique.values()], completedOrders });
      }
    } catch { /* Invalid or blocked storage starts an in-memory cart. */ }
    setReady(true);
  }, []);
  useEffect(() => { if (ready) try { localStorage.setItem(key, JSON.stringify(cart)); } catch { /* Cart remains usable when storage is blocked. */ } }, [cart, ready]);
  const add = useCallback((product: Product, quantity = 1) => {
    if (product.stock < 1 || !ready || !Number.isSafeInteger(quantity)) return;
    setCart(current => {
      const existing = current.items.find(item => item.id === product.id);
      const next = Math.min(product.stock, 99, (existing?.quantity || 0) + Math.max(1, quantity));
      return { ...current, items: existing ? current.items.map(item => item.id === product.id ? { ...item, quantity: next } : item) : [...current.items, { id: product.id, quantity: next }] };
    });
    setNotice(`${product.name} added to your bag.`);
  }, [ready]);
  const update = useCallback((id: string, quantity: number, stock: number) => {
    if (!Number.isFinite(quantity)) return;
    setCart(current => ({ ...current, items: quantity <= 0 || stock <= 0 ? current.items.filter(item => item.id !== id) : current.items.map(item => item.id === id ? { ...item, quantity: Math.min(99, stock, Math.floor(quantity)) } : item) }));
  }, []);
  const remove = useCallback((id: string) => setCart(current => ({ ...current, items: current.items.filter(item => item.id !== id) })), []);
  const completePurchase = useCallback((orderId: string, purchased: CheckoutItem[]) => {
    setCart(current => {
      if (current.completedOrders.includes(orderId)) return current;
      const items = current.items.map(item => ({ ...item, quantity: Math.max(0, item.quantity - (purchased.find(row => row.id === item.id)?.quantity || 0)) })).filter(item => item.quantity > 0);
      return { items, completedOrders: [...current.completedOrders, orderId].slice(-100) };
    });
  }, []);
  return <CartContext.Provider value={{ items: cart.items, ready, count: cart.items.reduce((sum, item) => sum + item.quantity, 0), add, update, remove, completePurchase, notice }}>{children}<div className="sr-only" role="status" aria-live="polite">{notice}</div></CartContext.Provider>;
}
export function useCart() { const context = useContext(CartContext); if (!context) throw new Error('CartProvider is required'); return context; }
