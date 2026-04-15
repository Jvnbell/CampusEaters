import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { getAuthUserAndProfile, unauthorized, forbidden } from '@/lib/api-auth';
import { getAuthUser } from '@/lib/supabase/server';

function namesFromSupabaseMetadata(
  email: string,
  metadata: Record<string, unknown> | null | undefined,
): { firstName: string; lastName: string } {
  const meta = metadata ?? {};
  let firstName = String(meta.first_name ?? meta.firstName ?? '').trim();
  let lastName = String(meta.last_name ?? meta.lastName ?? '').trim();
  const full = String(meta.full_name ?? meta.name ?? '').trim();
  if ((!firstName || !lastName) && full) {
    const parts = full.split(/\s+/).filter(Boolean);
    if (!firstName && parts.length) firstName = parts[0]!;
    if (!lastName && parts.length > 1) lastName = parts.slice(1).join(' ');
  }
  const local = email.split('@')[0] ?? 'user';
  if (!firstName) firstName = local;
  if (!lastName) lastName = 'User';
  return { firstName, lastName };
}

export async function GET(request: Request) {
  try {
    const auth = await getAuthUserAndProfile();
    if (!auth) return unauthorized();

    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (email) {
      const isOwnProfile = auth.authUser.email.toLowerCase() === email.toLowerCase();
      const isAdmin = auth.profile?.role === 'ADMIN';
      if (!isOwnProfile && !isAdmin) {
        return forbidden('You can only view your own profile.');
      }

      // Use session email for own profile so lookup matches the row Prisma stores (avoids case mismatches).
      const lookupEmail = isOwnProfile ? auth.authUser.email : email;

      let user = await prisma.user.findUnique({
        where: { email: lookupEmail },
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

      // Supabase account exists but app DB row was never created (e.g. signup before email confirm skipped POST /api/users).
      if (!user && isOwnProfile) {
        const supabaseUser = await getAuthUser();
        if (
          supabaseUser?.email &&
          supabaseUser.email.toLowerCase() === auth.authUser.email.toLowerCase()
        ) {
          const { firstName, lastName } = namesFromSupabaseMetadata(
            supabaseUser.email,
            supabaseUser.user_metadata as Record<string, unknown> | undefined,
          );
          try {
            user = await prisma.user.create({
              data: {
                email: supabaseUser.email,
                firstName,
                lastName,
                role: 'USER',
              },
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
          } catch (createError) {
            if (
              createError instanceof Prisma.PrismaClientKnownRequestError &&
              createError.code === 'P2002'
            ) {
              user = await prisma.user.findUnique({
                where: { email: supabaseUser.email },
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
            } else {
              throw createError;
            }
          }
        }
      }

      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const response = NextResponse.json({ user });
      response.headers.set('Cache-Control', 'private, s-maxage=30, stale-while-revalidate=60');
      return response;
    }

    if (auth.profile?.role !== 'ADMIN') {
      return forbidden('Only administrators can list all users.');
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
    const auth = await getAuthUserAndProfile();
    if (!auth) return unauthorized();

    const body = (await request.json()) as {
      email?: string;
      firstName?: string;
      lastName?: string;
      phoneNumber?: string;
      restaurantId?: string;
      role?: 'USER' | 'ADMIN' | 'RESTAURANT';
    };

    if (!body.email || !body.firstName || !body.lastName) {
      return NextResponse.json({ error: 'email, firstName, and lastName are required.' }, { status: 400 });
    }

    const isOwnProfile = auth.authUser.email.toLowerCase() === body.email.toLowerCase();
    const isAdmin = auth.profile?.role === 'ADMIN';
    if (!isOwnProfile && !isAdmin) {
      return forbidden('You can only create or update your own profile.');
    }
    if (!isAdmin && body.role !== undefined && body.role !== auth.profile?.role) {
      return forbidden('Only administrators can change user roles.');
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


