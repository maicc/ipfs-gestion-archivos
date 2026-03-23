import prisma from "../prisma.js";

export const getFilesService = async (userId: string) => {
  const files = await prisma.fileMetadata.findMany({
    where: {
      userId,
      isDeleted: false,
    },
    include: {
      ipfsObject: {
        include: {
          storageContract: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return files.map((file: any) => ({
    id: file.id,
    name: file.name,
    folderId: file.folderId,
    createdAt: file.createdAt,
    size: file.ipfsObject.sizeBytes.toString(),
    mimeType: file.ipfsObject.mimeType,
    cid: file.ipfsObject.cid,
    gatewayUrl: `https://gw.hachikuji.com/ipfs/${file.ipfsObject.cid}`,
    status: file.ipfsObject.storageContract?.crustStatus ?? "processing",
    replicas: file.ipfsObject.storageContract?.replicaCount ?? 0,
  }));
};