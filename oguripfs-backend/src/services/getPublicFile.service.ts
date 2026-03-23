import prisma from "../prisma.js";

export const getPublicFileService = async (cid: string) => {
  const ipfsObject = await prisma.ipfsObject.findUnique({
    where: { cid },
    include: {
      fileMetadata: {
        where: { isDeleted: false },
        take: 1,
      },
      storageContract: true,
    },
  });

  if (!ipfsObject || ipfsObject.fileMetadata.length === 0) {
    throw new Error("Archivo no encontrado");
  }

  return {
    cid,
    name: ipfsObject.fileMetadata[0]!.name,
    mimeType: ipfsObject.mimeType,
    size: ipfsObject.sizeBytes.toString(),
    status: ipfsObject.storageContract?.crustStatus ?? "processing",
    gatewayUrl: `https://gw.hachikuji.com/ipfs/${cid}`,
  };
};