import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
	const accounts = await prisma.account.findMany();
	console.log(accounts);
}

main()
	.catch(console.error)
	.finally(() => prisma.$disconnect().then(() => pool.end()));
