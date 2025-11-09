'use client';

import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
}

export default function TestBuyPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingProductId, setProcessingProductId] = useState<string | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      setProducts(data.products || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBuy = async (productId: string) => {
    try {
      setProcessingProductId(productId);

      // Create checkout session
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          // Add userId here if user is logged in
          // userId: session?.user?.id,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(`Error: ${data.error}`);
        setProcessingProductId(null);
        return;
      }

      // Redirect to Stripe Checkout
      const stripe = await stripePromise;
      if (!stripe) {
        alert('Stripe failed to load');
        setProcessingProductId(null);
        return;
      }

      const { error } = await stripe.redirectToCheckout({
        sessionId: data.sessionId,
      });

      if (error) {
        alert(`Error: ${error.message}`);
        setProcessingProductId(null);
      }
    } catch (error) {
      console.error('Error initiating checkout:', error);
      alert('Failed to start checkout');
      setProcessingProductId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg">Loading products...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Test Buy Page</h1>
          <p className="text-gray-600">
            Select a product to test the Stripe checkout flow
          </p>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">No products available</p>
            <a
              href="/admin/products"
              className="text-blue-600 hover:underline"
            >
              Create products in the admin panel
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <div
                key={product.id}
                className="bg-white rounded-lg shadow-md p-6 flex flex-col"
              >
                <h2 className="text-2xl font-bold mb-2">{product.name}</h2>
                {product.description && (
                  <p className="text-gray-600 mb-4 flex-grow">
                    {product.description}
                  </p>
                )}
                <div className="mt-auto">
                  <div className="text-3xl font-bold mb-4">
                    {product.price.toFixed(2)}{' '}
                    <span className="text-lg text-gray-600">
                      {product.currency.toUpperCase()}
                    </span>
                  </div>
                  <button
                    onClick={() => handleBuy(product.id)}
                    disabled={processingProductId === product.id}
                    className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
                  >
                    {processingProductId === product.id
                      ? 'Processing...'
                      : 'Buy Now'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
