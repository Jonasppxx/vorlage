'use client';

import { useState, useEffect } from 'react';
import { useSession } from '@/src/lib/auth-client';
import { useRouter } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  billingInterval: string;
  trialPeriodDays: number | null;
  active: boolean;
}

export default function SubscribePage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [couponCode, setCouponCode] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);

  useEffect(() => {
    if (isPending) return;
    if (!session) {
      router.push('/');
      return;
    }

    fetchProducts();
  }, [session, isPending, router]);

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      // All products are now subscriptions, just filter active ones
      const activeProducts = (data.products || []).filter(
        (p: Product) => p.active
      );
      setProducts(activeProducts);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (productId: string, appliedCoupon?: string) => {
    try {
      const stripe = await stripePromise;
      if (!stripe) {
        alert('Stripe not loaded');
        return;
      }

      const res = await fetch('/api/stripe/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          userId: session?.user?.id,
          couponCode: appliedCoupon || undefined,
        }),
      });

      const data = await res.json();

      if (data.error) {
        alert(data.error);
        return;
      }

      // Redirect to Stripe Checkout
      const result = await stripe.redirectToCheckout({
        sessionId: data.sessionId,
      });

      if (result.error) {
        alert(result.error.message);
      }
    } catch (error) {
      console.error('Error creating subscription:', error);
      alert('Failed to create subscription');
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

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-4">Choose Your Plan</h1>
        <p className="text-gray-400 text-center mb-12">
          Select a subscription plan to access premium content
        </p>

        {products.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-8 text-center">
            <p className="text-gray-400">No subscription plans available at the moment.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {products.map((product) => (
              <div
                key={product.id}
                className="bg-gray-800 rounded-lg p-8 border-2 border-gray-700 hover:border-blue-600 transition-colors"
              >
                <h2 className="text-2xl font-bold text-white mb-4">{product.name}</h2>
                
                {product.trialPeriodDays && product.trialPeriodDays > 0 && (
                  <div className="mb-4 px-3 py-1 bg-green-600/20 border border-green-600 rounded-full text-green-400 text-sm text-center">
                    🎁 {product.trialPeriodDays} days free trial
                  </div>
                )}
                
                <div className="mb-6">
                  <span className="text-4xl font-bold text-white">
                    {product.price.toFixed(2)}
                  </span>
                  <span className="text-gray-400 ml-2">
                    {product.currency.toUpperCase()} / {product.billingInterval === 'year' ? 'year' : 'month'}
                  </span>
                </div>

                {product.description && (
                  <p className="text-gray-300 mb-6">{product.description}</p>
                )}

                {/* Coupon Code Input */}
                {selectedProduct === product.id ? (
                  <div className="mb-4">
                    <label className="block text-sm text-gray-400 mb-2">
                      Have a coupon code?
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        placeholder="COUPON CODE"
                        className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500 uppercase"
                      />
                      <button
                        onClick={() => {
                          setSelectedProduct(null);
                          setCouponCode('');
                        }}
                        className="px-3 py-2 bg-gray-700 text-gray-400 rounded hover:bg-gray-600"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setSelectedProduct(product.id)}
                    className="w-full mb-3 text-sm text-blue-400 hover:text-blue-300"
                  >
                    + Add coupon code
                  </button>
                )}

                <button
                  onClick={() => handleSubscribe(product.id, selectedProduct === product.id ? couponCode : undefined)}
                  className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-colors"
                >
                  Subscribe Now
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
