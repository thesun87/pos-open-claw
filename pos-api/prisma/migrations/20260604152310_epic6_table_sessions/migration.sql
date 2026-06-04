-- CreateEnum
CREATE TYPE "TableSessionStatus" AS ENUM ('open', 'settled', 'voided', 'superseded');

-- CreateTable
CREATE TABLE "table_sessions" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "table_id" UUID NOT NULL,
    "opened_by_device" TEXT NOT NULL,
    "status" "TableSessionStatus" NOT NULL DEFAULT 'open',
    "opened_at" TIMESTAMPTZ(6) NOT NULL,
    "client_session_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "table_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_table_sessions_table_status" ON "table_sessions"("table_id", "status");

-- CreateIndex
CREATE INDEX "idx_table_sessions_tenant_store" ON "table_sessions"("tenant_id", "store_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_table_sessions_tenant_store_client" ON "table_sessions"("tenant_id", "store_id", "client_session_id");

-- AddForeignKey
ALTER TABLE "table_sessions" ADD CONSTRAINT "table_sessions_table_id_fkey" FOREIGN KEY ("table_id") REFERENCES "tables"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
