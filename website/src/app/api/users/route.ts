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
          restaurantId: true,
        },
      });

      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const response = NextResponse.json({ user });
      // Cache the response for 30 seconds to speed up subsequent requests
      response.headers.set('Cache-Control', 'private, s-maxage=30, stale-while-revalidate=60');
      return response;
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phoneNumber: true,
        role: true,
        restaurantId: true,
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
  console.log('[API /users POST] Request received');
  try {
    const body = (await request.json()) as {
      email?: string;
      firstName?: string;
      lastName?: string;
      phoneNumber?: string;
      restaurantId?: string;
      role?: 'USER' | 'ADMIN' | 'RESTAURANT';
    };
    
    console.log('[API /users POST] Request body:', { email: body.email, firstName: body.firstName, lastName: body.lastName });

    if (!body.email || !body.firstName || !body.lastName) {
      return NextResponse.json({ error: 'email, firstName, and lastName are required.' }, { status: 400 });
    }

    const user = await prisma.user.upsert({
      where: { email: body.email },
      update: {
        firstName: body.firstName,
        lastName: body.lastName,
        phoneNumber: body.phoneNumber ?? null,
        restaurantId: body.restaurantId ?? null,
        role: body.role ?? undefined,
      },
      create: {
        email: body.email,
        firstName: body.firstName,
        lastName: body.lastName,
        phoneNumber: body.phoneNumber ?? null,
        restaurantId: body.restaurantId ?? null,
        role: body.role ?? 'USER',
      },
    });

    console.log('[API /users POST] User created successfully:', user.id);
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error('[API /users POST] Failed to create user profile', error);
    
    // Provide more specific error messages
    if (error instanceof Error) {
      // Check for common Prisma errors
      if (error.message.includes('Unique constraint') || error.message.includes('Unique violation')) {
        return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });
      }
      // Check for database connection errors
      if (error.message.includes('connection') || 
          error.message.includes('timeout') || 
          error.message.includes('Can\'t reach database') ||
          error.message.includes('Accelerate was not able to connect') ||
          error.message.includes('P6008') ||
          (error as any).code === 'P5000') {
        const errorDetails = error.message.includes('Can\'t reach database') 
          ? 'Your Supabase database may be paused. Please check your Supabase dashboard and ensure the database is active.'
          : 'Unable to connect to the database server. Please verify your DATABASE_URL is correct and the database is accessible.';
        
        return NextResponse.json({ 
          error: 'Database connection error',
          details: errorDetails,
          hint: 'If using Supabase free tier, your database may have paused. Check your Supabase dashboard to resume it.'
        }, { status: 503 });
      }
    }
    
    return NextResponse.json({ 
      error: 'Failed to create user profile',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}


