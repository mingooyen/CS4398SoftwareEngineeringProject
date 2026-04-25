import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}
const redacted = url.replace(/:([^:@/]+)@/, ':***@');
console.log('Using:', redacted);

const prisma = new PrismaClient();
try {
  await prisma.$connect();
  await prisma.user.findFirst();
  console.log('OK: connected and can query User');
} catch (e) {
  console.error('FAILED:', e.name);
  console.error(e.message);
  const m = (e.message ?? '').toLowerCase();
  if (m.includes('dns') || m.includes('no record')) {
    console.error('\nHint: The hostname in DATABASE_URL is not a real Atlas cluster. In Atlas: Connect → Drivers → copy the mongodb+srv string and fix the @...mongodb.net segment.');
  }
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
