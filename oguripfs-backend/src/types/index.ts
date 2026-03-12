export interface ChunkInfo {
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    path: string;
    field: string;
    chunkIndex: number;
    totalChunks: number;
    originalFileName: string;
}

export interface FileUploadPayload {
    files: ChunkInfo[];
}

export interface IpfsUploadResult {
    cid: string;
    size: string;
    gatewayUrl: string;
}

export interface CrustOrderResult {
    success: boolean;
    cid: string;
    fileSize: number;
    message: string;
}

export interface UploadResponse {
    success: boolean;
    message: string;
    isLastChunk: boolean;
    chunkIndex: number;
    totalChunks: number;
    ipfs?: IpfsUploadResult;
    crust?: CrustOrderResult;
}
