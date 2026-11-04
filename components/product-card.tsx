import Link from 'next/link';
import { Product } from '@/lib/types';
import { money } from '@/lib/money';
export function ProductCard({ product, category }: { product: Product; category?: string }) {
  return <article className="product-card"><Link href={`/products/${product.slug}`} className="product-image-link"><img src={product.imageUrl} alt={product.name} width="640" height="720" loading="lazy"/>{product.stock === 0 && <span className="product-badge">Sold out</span>}<span className="view-product">Discover piece <span aria-hidden="true">↗</span></span></Link><div className="product-meta"><div><p className="eyebrow">{category}</p><h3><Link href={`/products/${product.slug}`}>{product.name}</Link></h3></div><span>{money(product.price)}</span></div></article>;
}
