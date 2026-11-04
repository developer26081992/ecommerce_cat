'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { Product } from '@/lib/types';
import { money } from '@/lib/money';
import { useCart } from './cart-provider';
export function CartView({ products, demo }: { products: Product[]; demo: boolean }) {
  const { items, ready, update, remove } = useCart();
  useEffect(() => {
    if (!ready) return;
    for (const item of items) { const product = products.find(product => product.id === item.id); if (!product || product.stock <= 0) remove(item.id); else if (item.quantity > product.stock) update(item.id, product.stock, product.stock); }
  }, [items, ready, products, remove, update]);
  const entries = items.flatMap(item => { const product = products.find(product => product.id === item.id); return product && product.stock > 0 ? [{ product, quantity: Math.min(item.quantity, product.stock) }] : []; });
  if (!ready) return <p className="cart-loading" role="status">Opening your bag…</p>;
  if (!entries.length) return <section className="empty-state"><span className="empty-mark" aria-hidden="true">＋</span><h2>A little room for lovely things.</h2><p>Your bag is empty. Find something to make the everyday special.</p><Link className="button" href="/products">Explore the collection <span aria-hidden="true">↗</span></Link></section>;
  const subtotal = entries.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  return <div className="cart-layout"><div><p className="cart-adjust-note">Quantities are limited to current availability. Unavailable items are removed automatically.</p><div className="cart-items">{entries.map(({ product, quantity }) => <article className="cart-item" key={product.id}><Link href={`/products/${product.slug}`}><img src={product.imageUrl} alt={product.name} width="150" height="170"/></Link><div className="cart-item-info"><Link href={`/products/${product.slug}`}><h2>{product.name}</h2></Link><p>{money(product.price)} each</p><div className="quantity" aria-label={`Quantity for ${product.name}`}><button onClick={() => update(product.id, quantity - 1, product.stock)} aria-label={`Decrease ${product.name} quantity`}>−</button><span aria-live="polite">{quantity}</span><button disabled={quantity >= Math.min(product.stock, 99)} onClick={() => update(product.id, quantity + 1, product.stock)} aria-label={`Increase ${product.name} quantity`}>+</button></div><button className="remove-button" onClick={() => remove(product.id)} aria-label={`Remove ${product.name}`}>Remove</button></div><strong className="line-total">{money(product.price * quantity)}</strong></article>)}</div><Link className="text-link continue" href="/products">← Continue exploring</Link></div><aside className="order-summary"><p className="eyebrow">A FEW GOOD THINGS</p><h2>Bag summary</h2><div className="subtotal"><span>Subtotal</span><strong>{money(subtotal)}</strong></div><p>Shipping and any applicable taxes will be calculated when checkout becomes available.</p><button className="button full" disabled>Checkout coming soon</button><p className="checkout-note">Online payments are not connected yet. You can save and edit your bag on this device.</p>{demo && <p className="demo-note">Sample collection · no orders or payments are taken.</p>}</aside></div>;
}
