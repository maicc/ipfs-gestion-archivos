import prisma from "../prisma.js";

export const getAdminStatsService = async () => {
  const totalUsers = await prisma.user.count();

  const storageResult = await prisma.user.aggregate({
    _sum: { usedStorageBytes: true },
  });

  const totalStorageUsed = storageResult._sum.usedStorageBytes ?? BigInt(0);

  return {
    totalUsers,
    totalStorageUsedBytes: totalStorageUsed.toString(),
  };
};