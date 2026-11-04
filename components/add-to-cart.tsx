'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Product } from '@/lib/types';
import { useCart } from './cart-provider';
export function AddToCart({ product }: { product: Product }) {
  const { add, items, ready } = useCart();
  const [added, setAdded] = useState(false);
  const quantity = items.find(item => item.id === product.id)?.quantity || 0;
  const full = quantity >= Math.min(product.stock, 99);
  return <div><button className="button full" disabled={!ready || product.stock === 0 || full} onClick={() => { add(product); setAdded(true); }}>{product.stock === 0 ? 'Currently sold out' : full ? 'All available stock is in your bag' : 'Add to bag'} <span aria-hidden="true">+</span></button>{added && <p className="add-confirmation" role="status">Added to your bag. <Link href="/cart">View bag →</Link></p>}</div>;
}
