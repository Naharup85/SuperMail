ALTER TABLE "users" ADD COLUMN "corsair_tenant_id" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_corsair_tenant_id_unique" UNIQUE("corsair_tenant_id");