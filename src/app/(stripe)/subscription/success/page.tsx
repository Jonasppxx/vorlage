'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (!sessionId) {
      router.push('/subscribe');
    }
  }, [sessionId, router]);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center px-4">
      <div className="max-w-md text-center">
        <div className="bg-gray-800 rounded-lg p-8 border border-green-700">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-3xl font-bold mb-4 text-green-400">
            Subscription Successful!
          </h1>
          <p className="text-gray-300 mb-6">
            Thank you for subscribing! Your subscription is now active and you have access to all premium content.
          </p>
          {sessionId && (
            <p className="text-sm text-gray-400 mb-6">
              Session ID: {sessionId}
            </p>
          )}
          <div className="space-y-3">
            <Link
              href="/premium"
              className="block w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
            >
              Access Premium Content
            </Link>
            <Link
              href="/subscriptions"
              className="block w-full px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
            >
              View My Subscriptions
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

export default function SubscriptionSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
