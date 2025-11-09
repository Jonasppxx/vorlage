'use client';

import Link from 'next/link';

export default function SubscriptionCancelPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center px-4">
      <div className="max-w-md text-center">
        <div className="bg-gray-800 rounded-lg p-8 border border-yellow-700">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-3xl font-bold mb-4 text-yellow-400">
            Subscription Canceled
          </h1>
          <p className="text-gray-300 mb-6">
            Your subscription process was canceled. No charges were made to your account.
          </p>
          <div className="space-y-3">
            <Link
              href="/subscribe"
              className="block w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
            >
              Try Again
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
