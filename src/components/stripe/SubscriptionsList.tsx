'use client';

import { useState, useEffect } from 'react';
import { useSession } from '@/src/lib/auth-client';
import Link from 'next/link';

interface Subscription {
  id: string;
  status: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  product: {
    name: string;
    description: string | null;
    price: number;
    currency: string;
  };
}

interface SubscriptionsListProps {
  onCancelSuccess?: () => void;
  onCancelError?: (error: string) => void;
}

export default function SubscriptionsList({ onCancelSuccess, onCancelError }: SubscriptionsListProps) {
  const { data: session } = useSession();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.user?.id) {
      fetchSubscriptions();
    }
  }, [session?.user?.id]);

  const fetchSubscriptions = async () => {
    if (!session?.user?.id) return;

    try {
      const res = await fetch(`/api/user/subscriptions?userId=${session.user.id}`);
      const data = await res.json();
      setSubscriptions(data.subscriptions || []);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async (subscriptionId: string) => {
    if (!confirm('Are you sure you want to cancel this subscription? It will remain active until the end of the billing period.')) {
      return;
    }

    try {
      const res = await fetch('/api/stripe/cancel-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriptionId,
          userId: session?.user?.id,
        }),
      });

      if (res.ok) {
        onCancelSuccess?.();
        fetchSubscriptions();
      } else {
        const data = await res.json();
        onCancelError?.(data.error || 'Failed to cancel subscription');
      }
    } catch (error) {
      console.error('Error canceling subscription:', error);
      onCancelError?.('Failed to cancel subscription');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-400">Loading subscriptions...</p>
      </div>
    );
  }

  const hasActiveSubscription = subscriptions.some(
    (sub) => sub.status === 'active' || sub.status === 'trialing'
  );

  if (!hasActiveSubscription && subscriptions.length > 0) {
    return (
      <>
        <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-yellow-400 mb-2">
            No Active Subscription
          </h2>
          <p className="text-gray-300 mb-4">
            You don't have an active subscription. Subscribe to access premium content!
          </p>
          <Link
            href="/subscribe"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            View Subscription Plans
          </Link>
        </div>
        {renderSubscriptionList()}
      </>
    );
  }

  if (subscriptions.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-8 text-center">
        <p className="text-gray-400 mb-4">You have no subscriptions yet.</p>
        <Link
          href="/subscribe"
          className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Browse Plans
        </Link>
      </div>
    );
  }

  function renderSubscriptionList() {
    return (
      <div className="space-y-4">
        {subscriptions.map((subscription) => (
          <div
            key={subscription.id}
            className="bg-gray-800 rounded-lg p-6 border border-gray-700"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-2xl font-semibold text-white mb-2">
                  {subscription.product.name}
                </h3>
                {subscription.product.description && (
                  <p className="text-gray-400">
                    {subscription.product.description}
                  </p>
                )}
              </div>
              <span
                className={`px-3 py-1 rounded text-sm font-medium ${
                  subscription.status === 'active'
                    ? 'bg-green-900 text-green-200'
                    : subscription.status === 'trialing'
                    ? 'bg-blue-900 text-blue-200'
                    : subscription.status === 'canceled'
                    ? 'bg-gray-700 text-gray-300'
                    : 'bg-red-900 text-red-200'
                }`}
              >
                {subscription.status.charAt(0).toUpperCase() +
                  subscription.status.slice(1)}
              </span>
            </div>

            <div className="mb-4">
              <p className="text-gray-300">
                <span className="font-semibold">Price:</span>{' '}
                {subscription.product.price.toFixed(2)}{' '}
                {subscription.product.currency.toUpperCase()} / month
              </p>
              <p className="text-gray-300">
                <span className="font-semibold">Renews on:</span>{' '}
                {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
              </p>
            </div>

            {subscription.cancelAtPeriodEnd && (
              <div className="bg-yellow-900/20 border border-yellow-700 rounded p-3 mb-4">
                <p className="text-yellow-400 text-sm">
                  This subscription will be canceled on{' '}
                  {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                </p>
              </div>
            )}

            {(subscription.status === 'active' ||
              subscription.status === 'trialing') &&
              !subscription.cancelAtPeriodEnd && (
                <button
                  onClick={() => handleCancelSubscription(subscription.id)}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Cancel Subscription
                </button>
              )}
          </div>
        ))}
      </div>
    );
  }

  return renderSubscriptionList();
}
