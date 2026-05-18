/** Server-side: whether a PostgreSQL database is configured. */
export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}
