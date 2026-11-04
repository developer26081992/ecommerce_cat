'use client';
export default function ErrorPage({ reset }: { reset: () => void }) { return <main id="main" className="wrap empty-state"><p className="eyebrow">LET’S TRY THAT AGAIN</p><h1>The collection is taking a moment.</h1><p>We couldn’t load this page. Please try again shortly.</p><button className="button" onClick={reset}>Try again →</button></main>; }
