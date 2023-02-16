const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function seed() {
  const deletedUserInfo = await prisma.user.deleteMany({
    where: {},
  });
  console.log(deletedUserInfo);

  const deletedUserToken = await prisma.session.deleteMany({
    where: {},
  });
  console.log(deletedUserToken);
}

seed();
