import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma/prisma';
import { getStripe } from '@/src/lib/stripe';
import Stripe from 'stripe';

// GET /api/admin/products - List all products (admin only)
export async function GET(request: NextRequest) {
  try {
    // TODO: Add admin authentication check here
    // const session = await getServerSession();
    // if (!session || session.user.role !== 'admin') {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const products = await prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ products });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

// POST /api/admin/products - Create new product
export async function POST(request: NextRequest) {
  try {
    // TODO: Add admin authentication check

    const body = await request.json();
    const {
      name,
      description,
      price,
      currency = 'eur',
      billingInterval = 'month',
      trialPeriodDays,
      active = true,
    } = body;

    if (!name || price === undefined) {
      return NextResponse.json(
        { error: 'Name and price are required' },
        { status: 400 }
      );
    }

    // Create product in Stripe
    const stripe = getStripe();
    const stripeProduct = await stripe.products.create({
      name,
      description: description || undefined,
    });

    // Create price in Stripe (recurring subscription)
    const stripePriceData: any = {
      product: stripeProduct.id,
      unit_amount: Math.round(price * 100), // Convert to cents
      currency,
      recurring: {
        interval: billingInterval, // 'month' or 'year'
      },
    };

    if (trialPeriodDays && trialPeriodDays > 0) {
      stripePriceData.recurring.trial_period_days = trialPeriodDays;
    }

    const stripePrice = await stripe.prices.create(stripePriceData);

    // Create product in database
    const product = await prisma.product.create({
      data: {
        name,
        description,
        price,
        currency,
        billingInterval,
        trialPeriodDays,
        stripePriceId: stripePrice.id,
        stripeProductId: stripeProduct.id,
        active,
      },
    });

    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    );
  }
}