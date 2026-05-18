import { PrismaClient } from '@prisma/client';

const prismaClientSingleton = () => {
  let databaseUrl = process.env.DATABASE_URL || '';

  if (databaseUrl) {
    // Supabase has a strict 15 concurrent session connection limit on port 5432.
    // If it points to port 5432 on the pooler, dynamically rewrite it to use port 6543 (transaction pooler)
    // with pgbouncer=true to support thousands of concurrent serverless & iOS automation connections.
    if (databaseUrl.includes('pooler.supabase.com:5432')) {
      databaseUrl = databaseUrl.replace(':5432', ':6543');
      if (!databaseUrl.includes('pgbouncer=true')) {
        databaseUrl += (databaseUrl.includes('?') ? '&' : '?') + 'pgbouncer=true';
      }
      console.log('🔄 Serverless environment: Successfully redirected database connection to transaction pooler on port 6543.');
    }
  }

  return new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl || undefined,
      },
    },
  });
};

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prisma ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma;
