'use client';

import { useEffect, useState, ReactNode } from 'react';
import { useSession } from '@/src/lib/auth-client';
import Link from 'next/link';

interface PremiumContentProps {
  children: ReactNode;
  fallbackContent?: ReactNode;
  loadingContent?: ReactNode;
}

export default function PremiumContent({ 
  children, 
  fallbackContent,
  loadingContent 
}: PremiumContentProps) {
  const { data: session, isPending } = useSession();
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isPending) return;
    
    if (!session) {
      setHasAccess(false);
      setLoading(false);
      return;
    }

    checkSubscription();
  }, [session, isPending]);

  const checkSubscription = async () => {
    if (!session?.user?.id) {
      setHasAccess(false);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/user/subscriptions?userId=${session.user.id}`);
      const data = await res.json();
      
      const activeSubscription = (data.subscriptions || []).find(
        (sub: any) => sub.status === 'active' || sub.status === 'trialing'
      );

      setHasAccess(!!activeSubscription);
    } catch (error) {
      console.error('Error checking subscription:', error);
      setHasAccess(false);
    } finally {
      setLoading(false);
    }
  };

  if (isPending || loading) {
    if (loadingContent) {
      return <>{loadingContent}</>;
    }
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  if (!hasAccess) {
    if (fallbackContent) {
      return <>{fallbackContent}</>;
    }

    return (
      <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <div className="bg-gray-800 rounded-lg p-8 border border-gray-700">
            <div className="text-6xl mb-4">🔒</div>
            <h1 className="text-3xl font-bold mb-4">Premium Content</h1>
            <p className="text-gray-400 mb-6">
              This content is only available to subscribers. Subscribe now to unlock exclusive features!
            </p>
            <div className="space-y-3">
              <Link
                href="/subscribe"
                className="block w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
              >
                View Subscription Plans
              </Link>
              <Link
                href="/"
                className="block w-full px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
              >
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
