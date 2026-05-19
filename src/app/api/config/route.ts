import { NextResponse } from 'next/server';
import { isDatabaseConfigured } from '@/lib/config';
import prisma from '@/lib/prisma';

export async function GET() {
  let hasExistingOwner = false;
  if (isDatabaseConfigured()) {
    try {
      const count = await prisma.account.count();
      hasExistingOwner = count > 0;
    } catch (e) {
      console.error('Failed to query account count:', e);
    }
  }
  return NextResponse.json({
    cloudAvailable: isDatabaseConfigured(),
    hasExistingOwner,
  });
}
