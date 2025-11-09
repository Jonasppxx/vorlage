import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma/prisma';
import { getStripe } from '@/src/lib/stripe';

// POST /api/stripe/checkout - Create Stripe checkout session
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId, userId, successUrl, cancelUrl } = body;

    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

    // Get product from database
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product || !product.active) {
      return NextResponse.json(
        { error: 'Product not found or inactive' },
        { status: 404 }
      );
    }

    if (!product.stripePriceId) {
      return NextResponse.json(
        { error: 'Product has no Stripe price configured' },
        { status: 400 }
      );
    }

    // Create checkout session
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: product.stripePriceId,
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl || `${process.env.NEXT_PUBLIC_APP_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${process.env.NEXT_PUBLIC_APP_URL}/checkout/cancel`,
      metadata: {
        productId: product.id,
        userId: userId || 'guest',
      },
    });

    // Create purchase record
    if (userId) {
      await prisma.purchase.create({
        data: {
          userId,
          productId: product.id,
          amount: product.price,
          currency: product.currency,
          status: 'pending',
          stripeSessionId: session.id,
        },
      });
    }

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
