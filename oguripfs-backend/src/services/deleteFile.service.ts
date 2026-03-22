import prisma from "../prisma.js";

export const deleteFileService = async (cid: string, userId: string) => {
  const file = await prisma.fileMetadata.findFirst({
    where: {
      userId,
      isDeleted: false,
      ipfsObject: { cid },
    },
    include: {
      ipfsObject: true,
    },
  });

  if (!file) throw new Error("Archivo no encontrado");

  // Soft delete — no borramos el IpfsObject porque otro usuario puede tener el mismo CID
  await prisma.fileMetadata.update({
    where: { id: file.id },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
    },
  });

  // Actualizar storage usado del usuario
  await prisma.user.update({
    where: { id: userId },
    data: {
      usedStorageBytes: {
        decrement: file.ipfsObject.sizeBytes,
      },
    },
  });

  return { message: "Archivo eliminado correctamente" };
};