import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const nameMap: Record<string, string> = {
    'Padel Indoor 1': 'Pádel Interior 1',
    'Padel Indoor 2': 'Pádel Interior 2',
    'Padel Outdoor 1': 'Pádel Exterior 1',
    'Tennis Court 1': 'Pista de Tenis 1',
    'Basketball Court 1': 'Cancha de Baloncesto 1',
    'Football Field 1': 'Campo de Fútbol 1',
    'Volleyball Court 1': 'Cancha de Voleibol 1',
};

const typeMap: Record<string, string> = {
    'Indoor': 'Interior',
    'Outdoor': 'Exterior',
};

const sportMap: Record<string, string> = {
    'Padel': 'Pádel',
    'Tennis': 'Tenis',
    'Basketball': 'Baloncesto',
    'Football': 'Fútbol',
    'Volleyball': 'Voleibol',
};

const surfaceMap: Record<string, string> = {
    'Blue Turf': 'Césped Sintético',
    'Green Turf': 'Césped Sintético',
    'Synthetic': 'Césped Sintético',
    'Clay': 'Tierra Batida',
    'Hardwood': 'Parqué',
    'Grass': 'Césped Natural',
};

async function main() {
    const courts = await prisma.court.findMany();
    for (const court of courts) {
        let newName = nameMap[court.name] || court.name;
        // Replace "Padel" with "Pádel", "Indoor" with "Interior", "Outdoor" with "Exterior" generally
        newName = newName.replace(/Padel/g, 'Pádel').replace(/Indoor/g, 'Interior').replace(/Outdoor/g, 'Exterior').replace(/Tennis Court/g, 'Pista de Tenis').replace(/Basketball Court/g, 'Cancha de Baloncesto').replace(/Football Field/g, 'Campo de Fútbol').replace(/Volleyball Court/g, 'Cancha de Voleibol');

        const newType = typeMap[court.type] || court.type;
        const newSport = sportMap[court.sport] || court.sport;
        const newSurface = surfaceMap[court.surface] || court.surface;

        await prisma.court.update({
            where: { id: court.id },
            data: {
                name: newName,
                type: newType,
                sport: newSport,
                surface: newSurface,
            },
        });
    }
    console.log('Courts translation migration completed.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
