import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma/prisma';

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      include: {
        posts: true,
      },
    });
    return NextResponse.json(users);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const user = await prisma.user.create({
      data: {
        email: body.email,
        name: body.name,
      },
    });
    return NextResponse.json(user);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
