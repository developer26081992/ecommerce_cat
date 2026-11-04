import Link from 'next/link';
import { getCatalogue } from '@/lib/catalogue';
import { ProductCard } from '@/components/product-card';
export const metadata = { title: 'The collection' };
export default async function Products({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { category } = await searchParams;
  const { products, categories, demo } = await getCatalogue();
  const selected = categories.find(item => item.slug === category);
  const filtered = category ? products.filter(item => item.categoryId === selected?.id) : products;
  return <main id="main" className="wrap catalogue"><p className="eyebrow">OBJECTS WITH A LITTLE MORE MEANING</p><h1>The collection.</h1><p className="page-intro">Considered pieces for your everyday rituals.</p>{demo && <p className="demo-note">Sample collection · demonstration prices and products</p>}<div className="filter-bar"><nav aria-label="Filter products by category"><Link href="/products" className={!category ? 'selected' : ''} aria-current={!category ? 'page' : undefined}>All pieces</Link>{categories.map(item => <Link key={item.id} href={`/products?category=${item.slug}`} className={category === item.slug ? 'selected' : ''} aria-current={category === item.slug ? 'page' : undefined}>{item.name}</Link>)}</nav><span>{filtered.length} {filtered.length === 1 ? 'piece' : 'pieces'}</span></div>{filtered.length ? <div className="product-grid catalogue-grid">{filtered.map(product => <ProductCard key={product.id} product={product} category={categories.find(item => item.id === product.categoryId)?.name}/>)}</div> : <div className="empty-state"><h2>No pieces here just yet.</h2><Link className="text-link" href="/products">Browse the full collection →</Link></div>}</main>;
}
