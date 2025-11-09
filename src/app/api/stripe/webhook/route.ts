import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma/prisma';
import { getStripe } from '@/src/lib/stripe';
import Stripe from 'stripe';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// POST /api/stripe/webhook - Handle Stripe webhook events
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'No signature provided' },
        { status: 400 }
      );
    }

    let event: Stripe.Event;

    try {
      const stripe = getStripe();
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    // Handle the event
    const stripe = getStripe();
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        // Check if this is a subscription
        if (session.mode === 'subscription') {
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          );

          // Create or update subscription in database
          await prisma.subscription.upsert({
            where: { stripeSubscriptionId: subscription.id },
            create: {
              userId: session.metadata!.userId,
              productId: session.metadata!.productId,
              stripeSubscriptionId: subscription.id,
              stripeCustomerId: subscription.customer as string,
              stripePriceId: subscription.items.data[0].price.id,
              status: subscription.status,
              currentPeriodStart: new Date((subscription as any).current_period_start * 1000),
              currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
            },
            update: {
              status: subscription.status,
              currentPeriodStart: new Date((subscription as any).current_period_start * 1000),
              currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
            },
          });

          console.log(`Subscription created/updated: ${subscription.id}`);
        } else {
          // One-time payment
          if (session.metadata?.productId) {
            await prisma.purchase.updateMany({
              where: { stripeSessionId: session.id },
              data: {
                status: 'completed',
                stripePaymentIntent: session.payment_intent as string,
              },
            });

            console.log(`Payment completed for session ${session.id}`);
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;

        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: subscription.id },
          data: {
            status: subscription.status,
            currentPeriodStart: new Date((subscription as any).current_period_start * 1000),
            currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
            cancelAtPeriodEnd: (subscription as any).cancel_at_period_end,
          },
        });

        console.log(`Subscription updated: ${subscription.id}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;

        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: subscription.id },
          data: {
            status: 'canceled',
            canceledAt: new Date(),
          },
        });

        console.log(`Subscription canceled: ${subscription.id}`);
        break;
      }

      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session;

        await prisma.purchase.updateMany({
          where: { stripeSessionId: session.id },
          data: { status: 'failed' },
        });

        console.log(`Payment expired for session ${session.id}`);
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;

        await prisma.purchase.updateMany({
          where: { stripePaymentIntent: paymentIntent.id },
          data: { status: 'failed' },
        });

        console.log(`Payment failed for payment intent ${paymentIntent.id}`);
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;

        await prisma.purchase.updateMany({
          where: { stripePaymentIntent: charge.payment_intent as string },
          data: { status: 'refunded' },
        });

        console.log(`Refund processed for charge ${charge.id}`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
