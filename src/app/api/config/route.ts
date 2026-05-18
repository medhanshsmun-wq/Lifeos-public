import { NextResponse } from 'next/server';
import { isDatabaseConfigured } from '@/lib/config';

export async function GET() {
  return NextResponse.json({
    cloudAvailable: isDatabaseConfigured(),
  });
}
