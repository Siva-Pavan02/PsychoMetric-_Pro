const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.participant.findFirst().then(console.log).finally(() => prisma.$disconnect());
