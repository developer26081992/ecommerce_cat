import { getCatalogue } from '@/lib/catalogue';
import { CartView } from '@/components/cart-view';
import { getCurrentUser } from '@/lib/auth';
import { paymentsConfigured } from '@/lib/stripe';
import { uuidPattern } from '@/lib/checkout-validation';
export const metadata = { title: 'Your bag' };
export default async function CartPage({ searchParams }: { searchParams: Promise<{ cancelled?: string }> }) {
  const [{ products, demo }, user, query] = await Promise.all([getCatalogue(), getCurrentUser(), searchParams]);
  const cancelled = typeof query.cancelled === 'string' && uuidPattern.test(query.cancelled) ? query.cancelled : null;
  return <main id="main" className="wrap cart-page"><p className="eyebrow">YOUR EVERYDAY FINDS</p><h1>Your bag.</h1><CartView products={products} demo={demo} signedIn={Boolean(user)} checkoutEnabled={paymentsConfigured()} cancelled={cancelled}/></main>;
}
