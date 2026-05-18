import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

function jsonResponse(data: any, status = 200) {
  return new NextResponse(
    JSON.stringify(data, (_, value) => (typeof value === 'bigint' ? Number(value) : value)),
    {
      status,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

// Fields that are relations in Prisma (need special handling during create/update)
const RELATION_FIELDS: Record<string, string[]> = {
  project: ['milestones'],
  aIConversation: ['messages'],
  gymEntry: ['exercises'],
  subject: ['assignments'],
};

// Fields stored as JSON strings in Prisma but as arrays/objects in Dexie
const JSON_STRING_FIELDS: Record<string, string[]> = {
  project: ['tags', 'techStack', 'links', 'files'],
  weeklyReport: ['highlights'],
  trade: ['mistakes', 'tags'],
  userSettings: ['dashboardWidgets'],
};

function processDataForPrisma(model: string, data: any, isCreate = true): any {
  const processed = { ...data };

  // Remove auto-increment id on create to let Prisma handle it
  if (isCreate && processed.id !== undefined) {
    delete processed.id;
  }

  // Remove widgetSizes from userSettings as it is not in the Prisma schema
  if (model === 'userSettings' && processed.widgetSizes !== undefined) {
    delete processed.widgetSizes;
  }

  // Convert array/object fields to JSON strings where Prisma expects strings
  const jsonFields = JSON_STRING_FIELDS[model] || [];
  for (const field of jsonFields) {
    if (processed[field] !== undefined && typeof processed[field] !== 'string') {
      processed[field] = JSON.stringify(processed[field]);
    }
  }

  // Handle relation fields — convert inline arrays to nested create syntax
  const relationFields = RELATION_FIELDS[model] || [];
  for (const field of relationFields) {
    if (processed[field] !== undefined) {
      const items = processed[field];
      if (Array.isArray(items) && items.length > 0) {
        // Convert to Prisma nested create
        processed[field] = {
          create: items.map((item: any) => {
            const { id, ...rest } = item;
            // Recursively clean up nested JSON fields
            const cleanItem = { ...rest };
            // Convert Date strings to Date objects
            for (const [k, v] of Object.entries(cleanItem)) {
              if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v)) {
                cleanItem[k] = new Date(v);
              }
              // Remove foreign key fields (Prisma handles them via the relation)
              if (k === 'conversationId' || k === 'projectId' || k === 'gymEntryId' || k === 'subjectId') {
                delete cleanItem[k];
              }
            }
            // Handle attachments in ChatMessage (JSON string in Prisma)
            if (cleanItem.attachments && typeof cleanItem.attachments !== 'string') {
              cleanItem.attachments = JSON.stringify(cleanItem.attachments);
            }
            return cleanItem;
          })
        };
      } else {
        // Empty array — just remove the field (don't try to create with empty)
        delete processed[field];
      }
    }
  }

  // Convert Date strings to Date objects for date fields
  for (const [key, value] of Object.entries(processed)) {
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
      processed[key] = new Date(value);
    }
  }

  return processed;
}

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

    // Include relations when fetching
    const include = RELATION_FIELDS[model]?.reduce((acc: any, field: string) => {
      acc[field] = true;
      return acc;
    }, {});

    if (id) {
      const data = await dbModel.findUnique({ where: { id: parseInt(id) }, ...(include ? { include } : {}) });
      return jsonResponse(data);
    }

    const data = await dbModel.findMany(include ? { include } : {});
    return jsonResponse(data);
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

    const processedBody = processDataForPrisma(model, body, true);

    const include = RELATION_FIELDS[model]?.reduce((acc: any, field: string) => {
      acc[field] = true;
      return acc;
    }, {});

    const data = await dbModel.create({ 
      data: processedBody,
      ...(include ? { include } : {})
    });
    return jsonResponse(data);
  } catch (error: any) {
    console.error('API POST Error:', error);
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
    const { id, ...rawData } = body;

    // @ts-ignore
    const dbModel = prisma[model];
    if (!dbModel) return NextResponse.json({ error: 'Model not found' }, { status: 404 });

    const data = processDataForPrisma(model, rawData, false);

    // For relation fields in update, delete existing children first then re-create
    const relationFields = RELATION_FIELDS[model] || [];
    for (const field of relationFields) {
      if (data[field]?.create) {
        // Delete existing children
        const childModelName = field === 'milestones' ? 'milestone' 
          : field === 'messages' ? 'chatMessage'
          : field === 'exercises' ? 'gymExercise'
          : field === 'assignments' ? 'studyAssignment'
          : null;
        
        if (childModelName) {
          const parentIdField = field === 'milestones' ? 'projectId'
            : field === 'messages' ? 'conversationId'
            : field === 'exercises' ? 'gymEntryId'
            : field === 'assignments' ? 'subjectId'
            : null;
          
          if (parentIdField) {
            // @ts-ignore
            await prisma[childModelName]?.deleteMany({ where: { [parentIdField]: parseInt(id) } });
          }
        }
      }
    }

    const include = RELATION_FIELDS[model]?.reduce((acc: any, field: string) => {
      acc[field] = true;
      return acc;
    }, {});

    const updated = await dbModel.update({
      where: { id: parseInt(id) },
      data,
      ...(include ? { include } : {})
    });
    return jsonResponse(updated);
  } catch (error: any) {
    console.error('API PUT Error:', error);
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
