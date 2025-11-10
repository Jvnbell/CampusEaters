import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (email) {
      const user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phoneNumber: true,
          role: true,
        },
      });

      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      return NextResponse.json({ user });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phoneNumber: true,
        role: true,
      },
      orderBy: [
        { firstName: 'asc' },
        { lastName: 'asc' },
      ],
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Failed to fetch users', error);
    return NextResponse.json({ error: 'Failed to load users' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      firstName?: string;
      lastName?: string;
      phoneNumber?: string;
      role?: 'USER' | 'ADMIN' | 'RESTAURANT';
    };

    if (!body.email || !body.firstName || !body.lastName) {
      return NextResponse.json({ error: 'email, firstName, and lastName are required.' }, { status: 400 });
    }

    const user = await prisma.user.upsert({
      where: { email: body.email },
      update: {
        firstName: body.firstName,
        lastName: body.lastName,
        phoneNumber: body.phoneNumber ?? null,
        role: body.role ?? undefined,
      },
      create: {
        email: body.email,
        firstName: body.firstName,
        lastName: body.lastName,
        phoneNumber: body.phoneNumber ?? null,
        role: body.role ?? 'USER',
      },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error('Failed to create user profile', error);
    return NextResponse.json({ error: 'Failed to create user profile' }, { status: 500 });
  }
}


