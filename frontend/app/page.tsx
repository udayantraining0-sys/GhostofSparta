'use client';

import dynamic from 'next/dynamic';

const AuthenticatedApp = dynamic(() => import('./(authenticated)/page'), { ssr: false });

export default function Home() {
  return <AuthenticatedApp />;
}
