import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

export type AuthProfile = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'USER' | 'ADMIN' | 'RESTAURANT';
  restaurantId: string | null;
};

/**
 * Get the authenticated user and their Prisma profile for API routes.
 * Returns null if not signed in; profile can be null if no CampusEats profile exists yet.
 */
export async function getAuthUserAndProfile(): Promise<{
  authUser: { id: string; email: string };
  profile: AuthProfile | null;
} | null> {
  const authUser = await getAuthUser();
  if (!authUser?.email) return null;

  const profile = await prisma.user.findUnique({
    where: { email: authUser.email },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      restaurantId: true,
    },
  });

  return {
    authUser: { id: authUser.id, email: authUser.email },
    profile: profile as AuthProfile | null,
  };
}

/** Return 401 JSON response for unauthenticated requests */
export function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
}

/** Return 403 JSON response when user lacks permission */
export function forbidden(message = 'You do not have permission to perform this action.') {
  return NextResponse.json({ error: message }, { status: 403 });
}
