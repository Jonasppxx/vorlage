import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/src/lib/stripe';
import { prisma } from '@/src/lib/prisma/prisma';
import Stripe from 'stripe';

export async function POST(req: NextRequest) {
  try {
    const { productId, userId, couponCode } = await req.json();

    if (!productId || !userId) {
      return NextResponse.json(
        { error: 'Product ID and User ID are required' },
        { status: 400 }
      );
    }

    // Get product
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
        { error: 'Product has no Stripe price ID' },
        { status: 400 }
      );
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user already has an active subscription for this product
    const existingSubscription = await prisma.subscription.findFirst({
      where: {
        userId,
        productId,
        status: { in: ['active', 'trialing'] },
      },
    });

    if (existingSubscription) {
      return NextResponse.json(
        { error: 'User already has an active subscription for this product' },
        { status: 400 }
      );
    }

    // Get or create Stripe customer
    let stripeCustomerId: string;
    const existingCustomer = await prisma.subscription.findFirst({
      where: { userId },
      select: { stripeCustomerId: true },
    });

    const stripe = getStripe();
    if (existingCustomer) {
      stripeCustomerId = existingCustomer.stripeCustomerId;
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name || undefined,
        metadata: { userId },
      });
      stripeCustomerId = customer.id;
    }

    // Validate coupon if provided
    let validCoupon = null;
    if (couponCode) {
      validCoupon = await prisma.coupon.findUnique({
        where: { code: couponCode.toUpperCase() },
      });

      if (!validCoupon || !validCoupon.active) {
        return NextResponse.json(
          { error: 'Invalid or inactive coupon code' },
          { status: 400 }
        );
      }

      // Check expiry
      if (validCoupon.expiresAt && new Date(validCoupon.expiresAt) < new Date()) {
        return NextResponse.json(
          { error: 'Coupon has expired' },
          { status: 400 }
        );
      }

      // Check max redemptions
      if (validCoupon.maxRedemptions && validCoupon.timesRedeemed >= validCoupon.maxRedemptions) {
        return NextResponse.json(
          { error: 'Coupon has reached maximum redemptions' },
          { status: 400 }
        );
      }
    }

    // Create checkout session for subscription
    const sessionData: any = {
      customer: stripeCustomerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: product.stripePriceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/subscription/cancel`,
      metadata: {
        userId,
        productId,
      },
    };

    // Add trial period if product has one
    if (product.trialPeriodDays && product.trialPeriodDays > 0) {
      sessionData.subscription_data = {
        trial_period_days: product.trialPeriodDays,
      };
    }

    // Add coupon if validated
    if (validCoupon && validCoupon.stripeCouponId) {
      sessionData.discounts = [{
        coupon: validCoupon.stripeCouponId,
      }];

      // Update coupon redemption count
      await prisma.coupon.update({
        where: { id: validCoupon.id },
        data: {
          timesRedeemed: { increment: 1 },
        },
      });
    }

    const session = await stripe.checkout.sessions.create(sessionData);

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Error creating subscription:', error);
    return NextResponse.json(
      { error: 'Failed to create subscription' },
      { status: 500 }
    );
  }
}
