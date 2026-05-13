import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const courts = await prisma.court.findMany();
    console.log(courts);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
