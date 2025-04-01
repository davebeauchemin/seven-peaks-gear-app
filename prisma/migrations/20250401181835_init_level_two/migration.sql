-- CreateEnum
CREATE TYPE "AddressType" AS ENUM ('BILLING', 'PHYSICAL', 'SHIPPING', 'ORGANIZATION');

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "role_id" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "user_id" TEXT NOT NULL,
    "surecart_customer_id" TEXT,
    "full_name" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "firstName" TEXT,
    "lastName" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "user_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_roles" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "workspace_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_permissions" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "workspace_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_role_permissions" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "role_id" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "workspace_role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspaces" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "name" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "description" TEXT,

    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_users" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "user_id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "role" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "workspace_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "legal_name" TEXT NOT NULL,
    "business_number" TEXT,
    "website" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "address_id" TEXT,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metadatas" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "entity_id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "user_id" TEXT,
    "organizations_id" TEXT,
    "workspace_id" TEXT NOT NULL,
    "addressId" TEXT,

    CONSTRAINT "metadatas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "addresses" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "type" "AddressType" NOT NULL DEFAULT 'PHYSICAL',
    "city" TEXT NOT NULL,
    "state" TEXT,
    "zip_code" TEXT,
    "country" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "address_line1" TEXT NOT NULL,
    "address_line2" TEXT,
    "organization_id" TEXT,
    "workspace_id" TEXT NOT NULL,
    "postal_code" TEXT,
    "province" TEXT,
    "full_address" TEXT,

    CONSTRAINT "addresses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_name_key" ON "permissions"("name");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_role_id_permission_id_key" ON "role_permissions"("role_id", "permission_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_user_id_key" ON "users"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_surecart_customer_id_key" ON "users"("surecart_customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_phone_idx" ON "users"("phone");

-- CreateIndex
CREATE INDEX "users_user_id_idx" ON "users"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_user_id_key" ON "user_roles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_user_id_role_key" ON "user_roles"("user_id", "role");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_roles_name_key" ON "workspace_roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_permissions_name_key" ON "workspace_permissions"("name");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_role_permissions_role_id_permission_id_key" ON "workspace_role_permissions"("role_id", "permission_id");

-- CreateIndex
CREATE UNIQUE INDEX "workspaces_name_key" ON "workspaces"("name");

-- CreateIndex
CREATE INDEX "workspaces_name_idx" ON "workspaces"("name");

-- CreateIndex
CREATE INDEX "workspace_users_user_id_idx" ON "workspace_users"("user_id");

-- CreateIndex
CREATE INDEX "workspace_users_workspace_id_idx" ON "workspace_users"("workspace_id");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_users_user_id_workspace_id_key" ON "workspace_users"("user_id", "workspace_id");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_name_key" ON "organizations"("name");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_legal_name_key" ON "organizations"("legal_name");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_business_number_key" ON "organizations"("business_number");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_address_id_key" ON "organizations"("address_id");

-- CreateIndex
CREATE INDEX "organizations_email_idx" ON "organizations"("email");

-- CreateIndex
CREATE INDEX "organizations_phone_idx" ON "organizations"("phone");

-- CreateIndex
CREATE INDEX "metadatas_entity_id_idx" ON "metadatas"("entity_id");

-- CreateIndex
CREATE INDEX "metadatas_entity_type_idx" ON "metadatas"("entity_type");

-- CreateIndex
CREATE INDEX "metadatas_key_idx" ON "metadatas"("key");

-- CreateIndex
CREATE INDEX "metadatas_value_idx" ON "metadatas"("value");

-- CreateIndex
CREATE UNIQUE INDEX "addresses_organization_id_key" ON "addresses"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "addresses_organization_id_workspace_id_key" ON "addresses"("organization_id", "workspace_id");

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_role_permissions" ADD CONSTRAINT "workspace_role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "workspace_roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_role_permissions" ADD CONSTRAINT "workspace_role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "workspace_permissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_users" ADD CONSTRAINT "workspace_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_users" ADD CONSTRAINT "workspace_users_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metadatas" ADD CONSTRAINT "metadatas_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metadatas" ADD CONSTRAINT "metadatas_organizations_id_fkey" FOREIGN KEY ("organizations_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metadatas" ADD CONSTRAINT "metadatas_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metadatas" ADD CONSTRAINT "metadatas_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
