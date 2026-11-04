import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { checkoutStatus } from '@/lib/checkout';
import { isCheckoutSessionId } from '@/lib/checkout-validation';
import type { CheckoutStatus } from '@/lib/checkout-types';
import { OrderConfirmation } from '@/components/order-confirmation';

export const metadata = { title: 'Order confirmation' };

export default async function CheckoutSuccessPage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect('/sign-in?next=/orders');
  const query = await searchParams;
  const sessionId = isCheckoutSessionId(query.session_id) ? query.session_id : null;
  let status: CheckoutStatus = { status: 'unavailable' };
  if (sessionId) try { status = await checkoutStatus(sessionId, user.id); } catch { /* Client offers an honest retry state when confirmation cannot load. */ }
  return <main id="main" className="wrap confirmation-page"><OrderConfirmation sessionId={sessionId} initialStatus={status}/></main>;
}
