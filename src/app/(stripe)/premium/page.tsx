'use client';

import { useEffect, useState } from 'react';
import { useSession } from '@/src/lib/auth-client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function PremiumContentPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isPending) return;
    
    if (!session) {
      router.push('/');
      return;
    }

    checkSubscription();
  }, [session, isPending, router]);

  const checkSubscription = async () => {
    try {
      const res = await fetch(`/api/user/subscriptions?userId=${session?.user?.id}`);
      const data = await res.json();
      
      const activeSubscription = (data.subscriptions || []).find(
        (sub: any) => sub.status === 'active' || sub.status === 'trialing'
      );

      if (activeSubscription) {
        setHasAccess(true);
      } else {
        setHasAccess(false);
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
      setHasAccess(false);
    } finally {
      setLoading(false);
    }
  };

  if (isPending || loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  if (!hasAccess) {
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

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link href="/" className="text-blue-400 hover:text-blue-300">
            ← Back to Home
          </Link>
        </div>

        <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 rounded-lg p-8 border border-blue-700 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-4xl">👑</span>
            <h1 className="text-4xl font-bold">Premium Content</h1>
          </div>
          <p className="text-blue-200">
            Welcome, premium member! You have access to exclusive content.
          </p>
        </div>

        <div className="space-y-6">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-2xl font-semibold mb-3">Exclusive Article #1</h2>
            <p className="text-gray-300 mb-4">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. 
              Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
            </p>
            <p className="text-gray-300">
              Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. 
              Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
            </p>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-2xl font-semibold mb-3">Premium Tutorial #2</h2>
            <p className="text-gray-300 mb-4">
              Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, 
              totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.
            </p>
            <p className="text-gray-300">
              Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores 
              eos qui ratione voluptatem sequi nesciunt.
            </p>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-2xl font-semibold mb-3">Advanced Features</h2>
            <ul className="space-y-2 text-gray-300">
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                Access to all premium articles
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                Exclusive video tutorials
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                Priority support
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                Early access to new features
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                Ad-free experience
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/subscriptions"
            className="text-blue-400 hover:text-blue-300"
          >
            Manage My Subscriptions →
          </Link>
        </div>
      </div>
    </div>
  );
}
