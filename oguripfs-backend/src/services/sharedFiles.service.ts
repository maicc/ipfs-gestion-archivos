import crypto from 'crypto';
import prisma from "../prisma.js";

export const shareFileService = async (cid: string, userId: string) => {
    const file = await prisma.ipfsObject.findUnique({
        where: { cid: cid },
        include: { fileMetadata: true }
        //   AND: { userId }

    },
    );

    if (!file) {
        throw new Error('NOT_FOUND');
    }

    const metadata = file.fileMetadata[0];


    if (metadata?.userId !== userId) {
        throw Error("UNAUTHORIZED")
    }

    
    if (!metadata) {
        throw new Error('METADATA_NOT_FOUND')
    }

    if (metadata.shareToken) {
        return metadata.shareToken
    }

    const newToken = crypto.randomBytes(16).toString('hex')

    await prisma.fileMetadata.update({
        where: { id: metadata.id },
        data: { shareToken: newToken }
    })

    return newToken
}

export const unShareFileService = async (cid: string, userId: string) => {
    const file = await prisma.ipfsObject.findUnique({
        where: { cid: cid },
        include: {
            fileMetadata: true
        }
    })

    if (!file) {
        throw new Error('NOT_FOUND')
    }

    const metadata = file.fileMetadata[0];

    if (metadata?.userId !== userId) {
        throw Error("UNAUTHORIZED")
    }

    if (!metadata?.shareToken) {
        return true
    }

    await prisma.fileMetadata.update({
        where: { id: metadata.id },
        data: { shareToken: null }
    })

    return true
}

export const resolverTokenService = async (token: string)=>{
    const file = await prisma.ipfsObject.findFirst({
        where: {
            fileMetadata: {
                some: {shareToken: token}
            }
        },
        include: {fileMetadata: true}
    });

    const metadata = file?.fileMetadata[0]

    if (!file){
        throw new Error('NOT_FOUND');
    }

    return {
        cid: file.cid,
        name: metadata?.name,
        mimeType: file.mimeType,
        size: Number(file.sizeBytes),
        replicas: file.replicasCount,
        r2Key: file.r2Key
    }
}