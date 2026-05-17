import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { apiKey, steps, distance, caloriesBurned, activeMinutes } = data;

    // A simple secret to prevent unauthorized access.
    // In production, use process.env.APPLE_HEALTH_SECRET
    const SECRET = process.env.APPLE_HEALTH_SECRET || 'lifeos_health_123';
    
    if (apiKey !== SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Determine today's boundaries (local time of the server)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Look for an existing entry for today
    const existing = await prisma.fitnessEntry.findFirst({
      where: {
        date: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    if (existing) {
      // Upsert: update with the maximum value (since Apple Health cumulative totals might fluctuate or we only want to increase)
      await prisma.fitnessEntry.update({
        where: { id: existing.id },
        data: {
          steps: Math.max(existing.steps, steps || 0),
          distance: Math.max(existing.distance, distance || 0),
          caloriesBurned: Math.max(existing.caloriesBurned, caloriesBurned || 0),
          activeMinutes: Math.max(existing.activeMinutes, activeMinutes || 0),
          // We keep the original date to avoid timezone shift issues, 
          // or we can update it to new Date() if we want the last sync time.
          date: new Date(),
        },
      });
    } else {
      // Create new entry
      await prisma.fitnessEntry.create({
        data: {
          steps: steps || 0,
          distance: distance || 0,
          caloriesBurned: caloriesBurned || 0,
          activeMinutes: activeMinutes || 0,
          date: new Date(),
          notes: 'Auto-synced from Apple Health',
        },
      });
    }

    return NextResponse.json({ success: true, message: 'Health data synced successfully' });
  } catch (error: any) {
    console.error('Health sync error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
