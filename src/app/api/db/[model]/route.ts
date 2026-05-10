import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ model: string }> }
) {
  try {
    const { model } = await params;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    // @ts-ignore - Dynamic access to prisma models
    const dbModel = prisma[model];
    if (!dbModel) return NextResponse.json({ error: 'Model not found' }, { status: 404 });

    if (id) {
      const data = await dbModel.findUnique({ where: { id: parseInt(id) } });
      return NextResponse.json(data);
    }

    const data = await dbModel.findMany();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ model: string }> }
) {
  try {
    const { model } = await params;
    const body = await request.json();

    // @ts-ignore
    const dbModel = prisma[model];
    if (!dbModel) return NextResponse.json({ error: 'Model not found' }, { status: 404 });

    // Handle nested arrays/objects by converting to JSON strings if needed
    // (In a real app, this should be more robust)
    const processedBody = { ...body };
    Object.keys(processedBody).forEach(key => {
      if (Array.isArray(processedBody[key]) || typeof processedBody[key] === 'object') {
        if (processedBody[key] instanceof Date) return;
        // Check if the schema expects a relation or a string
        // For simplicity in this personal app, we'll assume we know the schema
      }
    });

    const data = await dbModel.create({ data: processedBody });
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ model: string }> }
) {
  try {
    const { model } = await params;
    const body = await request.json();
    const { id, ...data } = body;

    // @ts-ignore
    const dbModel = prisma[model];
    if (!dbModel) return NextResponse.json({ error: 'Model not found' }, { status: 404 });

    const updated = await dbModel.update({
      where: { id: parseInt(id) },
      data
    });
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ model: string }> }
) {
  try {
    const { model } = await params;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    // @ts-ignore
    const dbModel = prisma[model];
    if (!dbModel) return NextResponse.json({ error: 'Model not found' }, { status: 404 });

    await dbModel.delete({ where: { id: parseInt(id) } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
