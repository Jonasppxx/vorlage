import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma/prisma';
import { getStripe } from '@/src/lib/stripe';
import Stripe from 'stripe';

// GET /api/admin/coupons - List all coupons
export async function GET(request: NextRequest) {
  try {
    // TODO: Add admin authentication check

    const coupons = await prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ coupons });
  } catch (error) {
    console.error('Error fetching coupons:', error);
    return NextResponse.json(
      { error: 'Failed to fetch coupons' },
      { status: 500 }
    );
  }
}

// POST /api/admin/coupons - Create new coupon
export async function POST(request: NextRequest) {
  try {
    // TODO: Add admin authentication check

    const body = await request.json();
    const {
      code,
      name,
      description,
      discountType,
      discountValue,
      currency = 'eur',
      duration = 'once',
      durationInMonths,
      maxRedemptions,
      expiresAt,
      active = true,
    } = body;

    if (!code || !name || !discountType || discountValue === undefined) {
      return NextResponse.json(
        { error: 'Code, name, discount type, and discount value are required' },
        { status: 400 }
      );
    }

    // Check if coupon code already exists
    const existingCoupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (existingCoupon) {
      return NextResponse.json(
        { error: 'Coupon code already exists' },
        { status: 400 }
      );
    }

    // Create coupon in Stripe
    const stripeCouponData: Stripe.CouponCreateParams = {
      id: code.toUpperCase(),
      name,
      duration: duration as 'once' | 'repeating' | 'forever',
    };

    if (discountType === 'percentage') {
      stripeCouponData.percent_off = discountValue;
    } else {
      stripeCouponData.amount_off = Math.round(discountValue * 100);
      stripeCouponData.currency = currency;
    }

    if (duration === 'repeating' && durationInMonths) {
      stripeCouponData.duration_in_months = durationInMonths;
    }

    if (maxRedemptions) {
      stripeCouponData.max_redemptions = maxRedemptions;
    }

    if (expiresAt) {
      stripeCouponData.redeem_by = Math.floor(new Date(expiresAt).getTime() / 1000);
    }

    const stripe = getStripe();
    const stripeCoupon = await stripe.coupons.create(stripeCouponData);

    // Save to database
    const coupon = await prisma.coupon.create({
      data: {
        code: code.toUpperCase(),
        stripeCouponId: stripeCoupon.id,
        name,
        description,
        discountType,
        discountValue,
        currency: discountType === 'fixed_amount' ? currency : null,
        duration,
        durationInMonths,
        maxRedemptions,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        active,
      },
    });

    return NextResponse.json({ coupon }, { status: 201 });
  } catch (error) {
    console.error('Error creating coupon:', error);
    return NextResponse.json(
      { error: 'Failed to create coupon' },
      { status: 500 }
    );
  }
}
