-- CreateEnum
CREATE TYPE "Role" AS ENUM ('Admin', 'Cashier');

-- CreateTable
CREATE TABLE "tenants" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stores" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "stores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "is_revoked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price_vnd" INTEGER NOT NULL,
    "image_url" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "option_groups" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "min_select" INTEGER NOT NULL DEFAULT 0,
    "max_select" INTEGER NOT NULL DEFAULT 1,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "option_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "options" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "option_group_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "price_delta_vnd" INTEGER NOT NULL DEFAULT 0,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_option_groups" (
    "product_id" UUID NOT NULL,
    "option_group_id" UUID NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_option_groups_pkey" PRIMARY KEY ("product_id","option_group_id")
);

-- CreateTable
CREATE TABLE "menu_versions" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "bumped_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "menu_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_stores_tenant_id" ON "stores"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_stores_tenant_code" ON "stores"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "idx_users_tenant_id" ON "users"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_users_store_id" ON "users"("store_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_users_tenant_store_email" ON "users"("tenant_id", "store_id", "email");

-- CreateIndex
CREATE INDEX "idx_refresh_tokens_user_id" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "idx_categories_tenant_store" ON "categories"("tenant_id", "store_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_categories_tenant_store_name" ON "categories"("tenant_id", "store_id", "name");

-- CreateIndex
CREATE INDEX "idx_products_category_id" ON "products"("category_id");

-- CreateIndex
CREATE INDEX "idx_products_is_active" ON "products"("is_active");

-- CreateIndex
CREATE INDEX "idx_products_tenant_store" ON "products"("tenant_id", "store_id");

-- CreateIndex
CREATE INDEX "idx_option_groups_tenant_store" ON "option_groups"("tenant_id", "store_id");

-- CreateIndex
CREATE INDEX "idx_options_option_group_id" ON "options"("option_group_id");

-- CreateIndex
CREATE INDEX "idx_options_tenant_store" ON "options"("tenant_id", "store_id");

-- CreateIndex
CREATE INDEX "idx_product_option_groups_option_group_id" ON "product_option_groups"("option_group_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_menu_versions_tenant_store" ON "menu_versions"("tenant_id", "store_id");

-- AddForeignKey
ALTER TABLE "stores" ADD CONSTRAINT "stores_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "option_groups" ADD CONSTRAINT "option_groups_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "option_groups" ADD CONSTRAINT "option_groups_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "options" ADD CONSTRAINT "options_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "options" ADD CONSTRAINT "options_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "options" ADD CONSTRAINT "options_option_group_id_fkey" FOREIGN KEY ("option_group_id") REFERENCES "option_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_option_groups" ADD CONSTRAINT "product_option_groups_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_option_groups" ADD CONSTRAINT "product_option_groups_option_group_id_fkey" FOREIGN KEY ("option_group_id") REFERENCES "option_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_versions" ADD CONSTRAINT "menu_versions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_versions" ADD CONSTRAINT "menu_versions_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "option_groups"
  ADD CONSTRAINT "chk_option_groups_min_max" CHECK ("min_select" <= "max_select"),
  ADD CONSTRAINT "chk_option_groups_min_select_nonnegative" CHECK ("min_select" >= 0),
  ADD CONSTRAINT "chk_option_groups_max_select_positive" CHECK ("max_select" >= 1);

ALTER TABLE "products"
  ADD CONSTRAINT "chk_products_price_vnd_nonnegative" CHECK ("price_vnd" >= 0);
