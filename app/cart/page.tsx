import { getCatalogue } from '@/lib/catalogue';
import { CartView } from '@/components/cart-view';
export const metadata = { title: 'Your bag' };
export default async function CartPage() { const { products, demo } = await getCatalogue(); return <main id="main" className="wrap cart-page"><p className="eyebrow">YOUR EVERYDAY FINDS</p><h1>Your bag.</h1><CartView products={products} demo={demo}/></main>; }
