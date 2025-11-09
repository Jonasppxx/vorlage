import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/src/lib/stripe';
import { prisma } from '@/src/lib/prisma/prisma';

export async function POST(req: NextRequest) {
  try {
    const { subscriptionId, userId } = await req.json();

    if (!subscriptionId || !userId) {
      return NextResponse.json(
        { error: 'Subscription ID and User ID are required' },
        { status: 400 }
      );
    }

    // Get subscription from database
    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      );
    }

    // Verify user owns this subscription
    if (subscription.userId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Cancel subscription in Stripe (at period end)
    const stripe = getStripe();
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    // Update database
    await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        cancelAtPeriodEnd: true,
        canceledAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Subscription will be canceled at the end of the billing period',
    });
  } catch (error) {
    console.error('Error canceling subscription:', error);
    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
}
