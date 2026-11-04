'use client';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Product } from '@/lib/types';

type CartItem = { id: string; quantity: number };
type CartContextValue = { items: CartItem[]; ready: boolean; count: number; add: (product: Product, quantity?: number) => void; update: (id: string, quantity: number, stock: number) => void; remove: (id: string) => void; notice: string };
const CartContext = createContext<CartContextValue | null>(null);
const key = 'field-form-cart-v1';
export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState('');
  useEffect(() => {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(key) || '[]');
      if (Array.isArray(saved)) {
        const unique = new Map<string, CartItem>();
        for (const item of saved.slice(0, 100)) if (item && typeof item.id === 'string' && /^[0-9a-f-]{36}$/i.test(item.id) && Number.isInteger(item.quantity) && item.quantity > 0) unique.set(item.id, { id: item.id, quantity: Math.min(item.quantity, 99) });
        setItems([...unique.values()]);
      }
    } catch { /* Corrupt or unavailable local storage starts an empty in-memory cart. */ }
    setReady(true);
  }, []);
  useEffect(() => { if (ready) try { localStorage.setItem(key, JSON.stringify(items)); } catch { /* Cart still works when storage is blocked. */ } }, [items, ready]);
  function add(product: Product, quantity = 1) {
    if (product.stock < 1 || !ready) return;
    setItems(current => {
      const existing = current.find(item => item.id === product.id);
      const next = Math.min(product.stock, 99, (existing?.quantity || 0) + Math.max(1, quantity));
      return existing ? current.map(item => item.id === product.id ? { ...item, quantity: next } : item) : [...current, { id: product.id, quantity: next }];
    });
    setNotice(`${product.name} added to your bag.`);
  }
  function update(id: string, quantity: number, stock: number) {
    if (!Number.isFinite(quantity)) return;
    setItems(current => quantity <= 0 || stock <= 0 ? current.filter(item => item.id !== id) : current.map(item => item.id === id ? { ...item, quantity: Math.min(99, stock, Math.floor(quantity)) } : item));
  }
  return <CartContext.Provider value={{ items, ready, count: items.reduce((sum, item) => sum + item.quantity, 0), add, update, remove: id => setItems(current => current.filter(item => item.id !== id)), notice }}>{children}<div className="sr-only" role="status" aria-live="polite">{notice}</div></CartContext.Provider>;
}
export function useCart() { const context = useContext(CartContext); if (!context) throw new Error('CartProvider is required'); return context; }
