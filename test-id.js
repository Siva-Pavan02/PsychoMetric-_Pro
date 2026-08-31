const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.assessment.findFirst({ where: { status: 'COMPLETED' } })
  .then(a => console.log(a.id))
  .catch(console.error)
  .finally(() => prisma.$disconnect());
