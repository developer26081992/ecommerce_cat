import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getOrders } from '@/lib/checkout';
import { OrderReceipt } from '@/components/order-confirmation';

export const metadata = { title: 'Your orders' };

export default async function OrdersPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/sign-in?next=/orders');
  let orders;
  try { orders = await getOrders(user.id); }
  catch { return <main id="main" className="wrap orders-page"><p className="eyebrow">YOUR EVERYDAY FINDS</p><h1>Your orders.</h1><section className="empty-state"><h2>Your orders are taking a moment.</h2><p>We couldn’t load your order history. Please try again shortly.</p><a className="button" href="/orders">Try again →</a><p><Link className="text-link" href="/account">Back to your account →</Link></p></section></main>; }
  return <main id="main" className="wrap orders-page"><div className="orders-title"><div><p className="eyebrow">YOUR EVERYDAY FINDS</p><h1>Your orders.</h1><p className="page-intro">A little record of the pieces you’ve chosen.</p></div><Link className="text-link" href="/account">Your account →</Link></div>{orders.length ? <div className="orders-list">{orders.map(order => <OrderReceipt key={order.id} order={order}/>)}</div> : <section className="empty-state"><span className="empty-mark" aria-hidden="true">＋</span><h2>Good things are still to come.</h2><p>You haven’t placed an order yet. Find something to make the everyday special.</p><Link className="button" href="/products">Explore the collection <span aria-hidden="true">↗</span></Link></section>}</main>;
}
