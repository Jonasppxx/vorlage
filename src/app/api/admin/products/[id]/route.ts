import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma/prisma';
import { getStripe } from '@/src/lib/stripe';
import Stripe from 'stripe';

// GET /api/admin/products/[id] - Get single product
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const product = await prisma.product.findUnique({
      where: { id: params.id },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ product });
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json(
      { error: 'Failed to fetch product' },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/products/[id] - Update product
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // TODO: Add admin authentication check

    const params = await context.params;
    const body = await request.json();
    const { name, description, price, currency, active } = body;

    const existingProduct = await prisma.product.findUnique({
      where: { id: params.id },
    });

    if (!existingProduct) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Update Stripe product if name or description changed
    const stripe = getStripe();
    if (existingProduct.stripeProductId && (name || description)) {
      await stripe.products.update(existingProduct.stripeProductId, {
        name: name || undefined,
        description: description || undefined,
      });
    }

    // If price changed, create new Stripe price (prices are immutable in Stripe)
    let stripePriceId = existingProduct.stripePriceId;
    if (price !== undefined && price !== existingProduct.price && existingProduct.stripeProductId) {
      const newPrice = await stripe.prices.create({
        product: existingProduct.stripeProductId,
        unit_amount: Math.round(price * 100),
        currency: currency || existingProduct.currency,
      });
      stripePriceId = newPrice.id;
    }

    // Update product in database
    const product = await prisma.product.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(price !== undefined && { price }),
        ...(currency && { currency }),
        ...(active !== undefined && { active }),
        ...(stripePriceId && { stripePriceId }),
      },
    });

    return NextResponse.json({ product });
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json(
      { error: 'Failed to update product' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/products/[id] - Delete product
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // TODO: Add admin authentication check

    const params = await context.params;
    const product = await prisma.product.findUnique({
      where: { id: params.id },
      include: {
        subscriptions: {
          where: {
            status: { in: ['active', 'trialing'] },
          },
        },
      },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Check if product has active subscriptions
    if (product.subscriptions && product.subscriptions.length > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot delete product with active subscriptions. Please cancel all subscriptions first or mark product as inactive.' 
        },
        { status: 400 }
      );
    }

    // Archive product in Stripe (don't delete, just deactivate)
    if (product.stripeProductId) {
      try {
        const stripe = getStripe();
        await stripe.products.update(product.stripeProductId, {
          active: false,
        });
      } catch (stripeError) {
        console.error('Error archiving Stripe product:', stripeError);
        // Continue with database deletion even if Stripe update fails
      }
    }

    // Delete from database
    await prisma.product.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json(
      { error: 'Failed to delete product' },
      { status: 500 }
    );
  }
}
