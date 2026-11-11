"use client";
export default function ErrorPage({ reset }: { reset: () => void }) { return <main className="auth-container"><h1>Something interrupted your session.</h1><p>Please try again. If this continues, check the Supabase connection.</p><button className="button lime" onClick={reset}>Try again</button></main>; }
