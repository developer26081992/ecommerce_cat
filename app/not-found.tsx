import Link from 'next/link';
export default function NotFound() { return <main id="main" className="wrap empty-state"><p className="eyebrow">404 / A LITTLE OFF THE PATH</p><h1>This piece couldn’t be found.</h1><p>There are still plenty of lovely things to discover.</p><Link className="button" href="/products">Back to the collection ↗</Link></main>; }
