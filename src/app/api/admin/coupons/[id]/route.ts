import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma/prisma';
import { getStripe } from '@/src/lib/stripe';

// GET /api/admin/coupons/[id] - Get single coupon
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const coupon = await prisma.coupon.findUnique({
      where: { id: params.id },
    });

    if (!coupon) {
      return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });
    }

    return NextResponse.json({ coupon });
  } catch (error) {
    console.error('Error fetching coupon:', error);
    return NextResponse.json(
      { error: 'Failed to fetch coupon' },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/coupons/[id] - Update coupon
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const body = await request.json();
    const { name, description, active } = body;

    const existingCoupon = await prisma.coupon.findUnique({
      where: { id: params.id },
    });

    if (!existingCoupon) {
      return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });
    }

    // Update coupon in database (Stripe coupons are mostly immutable)
    const coupon = await prisma.coupon.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(active !== undefined && { active }),
      },
    });

    return NextResponse.json({ coupon });
  } catch (error) {
    console.error('Error updating coupon:', error);
    return NextResponse.json(
      { error: 'Failed to update coupon' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/coupons/[id] - Delete coupon
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const coupon = await prisma.coupon.findUnique({
      where: { id: params.id },
    });

    if (!coupon) {
      return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });
    }

    // Delete from Stripe
    if (coupon.stripeCouponId) {
      try {
        const stripe = getStripe();
        await stripe.coupons.del(coupon.stripeCouponId);
      } catch (stripeError) {
        console.error('Error deleting Stripe coupon:', stripeError);
        // Continue with database deletion even if Stripe delete fails
      }
    }

    // Delete from database
    await prisma.coupon.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Coupon deleted successfully' });
  } catch (error) {
    console.error('Error deleting coupon:', error);
    return NextResponse.json(
      { error: 'Failed to delete coupon' },
      { status: 500 }
    );
  }
}
