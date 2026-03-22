-- CreateTable
CREATE TABLE "User" (
    "user_id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "used_storage_bytes" BIGINT NOT NULL DEFAULT 0,
    "plan" TEXT NOT NULL DEFAULT 'free',
    "storage_limit_bytes" BIGINT NOT NULL DEFAULT 21474836480,
    "plan_expires_At" TIMESTAMP(3),
    "create_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "Folder" (
    "id_folder" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "parent_folder_id" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "delete_at" TIMESTAMP(3),
    "create_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Folder_pkey" PRIMARY KEY ("id_folder")
);

-- CreateTable
CREATE TABLE "IpfsObject" (
    "id_ipfs_object" TEXT NOT NULL,
    "cid" TEXT NOT NULL,
    "size_bytes" BIGINT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "replicas_count" INTEGER NOT NULL DEFAULT 0,
    "r2_key" TEXT,
    "r2_stored_at" TIMESTAMP(3),
    "last_accessed_at" TIMESTAMP(3),
    "access_count" INTEGER NOT NULL DEFAULT 0,
    "node_pins" TEXT[],
    "create_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IpfsObject_pkey" PRIMARY KEY ("id_ipfs_object")
);

-- CreateTable
CREATE TABLE "FileMetadata" (
    "id_file_metadata" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "folder_id" TEXT,
    "ipfs_object_id" TEXT NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "create_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FileMetadata_pkey" PRIMARY KEY ("id_file_metadata")
);

-- CreateTable
CREATE TABLE "StorageContract" (
    "id_storage_contract" TEXT NOT NULL,
    "ipfs_object_id" TEXT NOT NULL,
    "crust_status" TEXT NOT NULL DEFAULT 'pending',
    "tx_hash" TEXT,
    "pinned_until" TIMESTAMP(3),
    "renewal_at" TIMESTAMP(3),
    "crust_fee_paid" BIGINT,
    "replica_count" INTEGER,
    "file_size_bytes" BIGINT,
    "create_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StorageContract_pkey" PRIMARY KEY ("id_storage_contract")
);

-- CreateTable
CREATE TABLE "AccessLog" (
    "id" TEXT NOT NULL,
    "ipfs_object_id" TEXT NOT NULL,
    "accessed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gateway" TEXT NOT NULL,
    "cache_hit" BOOLEAN NOT NULL,

    CONSTRAINT "AccessLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "IpfsObject_cid_key" ON "IpfsObject"("cid");

-- CreateIndex
CREATE UNIQUE INDEX "StorageContract_ipfs_object_id_key" ON "StorageContract"("ipfs_object_id");

-- CreateIndex
CREATE INDEX "AccessLog_ipfs_object_id_idx" ON "AccessLog"("ipfs_object_id");

-- CreateIndex
CREATE INDEX "AccessLog_accessed_at_idx" ON "AccessLog"("accessed_at");

-- AddForeignKey
ALTER TABLE "Folder" ADD CONSTRAINT "Folder_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Folder" ADD CONSTRAINT "Folder_parent_folder_id_fkey" FOREIGN KEY ("parent_folder_id") REFERENCES "Folder"("id_folder") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileMetadata" ADD CONSTRAINT "FileMetadata_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileMetadata" ADD CONSTRAINT "FileMetadata_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "Folder"("id_folder") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileMetadata" ADD CONSTRAINT "FileMetadata_ipfs_object_id_fkey" FOREIGN KEY ("ipfs_object_id") REFERENCES "IpfsObject"("id_ipfs_object") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StorageContract" ADD CONSTRAINT "StorageContract_ipfs_object_id_fkey" FOREIGN KEY ("ipfs_object_id") REFERENCES "IpfsObject"("id_ipfs_object") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessLog" ADD CONSTRAINT "AccessLog_ipfs_object_id_fkey" FOREIGN KEY ("ipfs_object_id") REFERENCES "IpfsObject"("id_ipfs_object") ON DELETE RESTRICT ON UPDATE CASCADE;
