import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCatalogue } from '@/lib/catalogue';
import { money } from '@/lib/money';
import { AddToCart } from '@/components/add-to-cart';
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { products } = await getCatalogue();
  const product = products.find(item => item.slug === slug);
  return { title: product?.name || 'Product not found', description: product?.description };
}
export default async function ProductDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { products, categories, demo } = await getCatalogue();
  const product = products.find(item => item.slug === slug);
  if (!product) notFound();
  const category = categories.find(item => item.id === product.categoryId);
  return <main id="main" className="wrap detail"><nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/products">The collection</Link><span aria-hidden="true">/</span><span>{product.name}</span></nav><div className="detail-grid"><div className="detail-image"><img src={product.imageUrl} alt={product.name} width="640" height="720"/></div><div className="detail-copy"><p className="eyebrow">{category?.name}</p><h1>{product.name}</h1><p className="detail-price">{money(product.price)}</p><p className="detail-description">{product.description}</p><p className="stock"><span className={product.stock ? 'stock-dot' : 'stock-dot sold'}/>{product.stock ? `${product.stock} available` : 'Currently out of stock'}</p><AddToCart product={product}/><div className="product-footnote"><p>Simple objects. Everyday joy.</p><p>Prices shown in South African rand (ZAR).</p></div>{demo && <p className="demo-note">Sample product with an illustrative image. Payment and delivery are not available in this demo.</p>}</div></div></main>;
}
