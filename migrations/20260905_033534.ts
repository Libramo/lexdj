import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_code_sections_type" AS ENUM('livre', 'titre', 'chapitre', 'section', 'sous-section', 'article');
  CREATE TYPE "public"."enum__code_sections_v_version_type" AS ENUM('livre', 'titre', 'chapitre', 'section', 'sous-section', 'article');
  CREATE TABLE "users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "law_corrections" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"source_url" varchar NOT NULL,
  	"full_text" varchar,
  	"notes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "law_corrections_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "_law_corrections_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_source_url" varchar NOT NULL,
  	"version_full_text" varchar,
  	"version_notes" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "_law_corrections_v_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "codes" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar NOT NULL,
  	"title" varchar NOT NULL,
  	"description" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "code_sections_breadcrumbs" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"doc_id" integer,
  	"url" varchar,
  	"label" varchar
  );
  
  CREATE TABLE "code_sections" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"code_id" integer NOT NULL,
  	"parent_id" integer,
  	"type" "enum_code_sections_type" NOT NULL,
  	"title" varchar NOT NULL,
  	"article_number" varchar,
  	"content" jsonb,
  	"slug" varchar NOT NULL,
  	"order" numeric DEFAULT 0 NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "_code_sections_v_version_breadcrumbs" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"doc_id" integer,
  	"url" varchar,
  	"label" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_code_sections_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_code_id" integer NOT NULL,
  	"version_parent_id" integer,
  	"version_type" "enum__code_sections_v_version_type" NOT NULL,
  	"version_title" varchar NOT NULL,
  	"version_article_number" varchar,
  	"version_content" jsonb,
  	"version_slug" varchar NOT NULL,
  	"version_order" numeric DEFAULT 0 NOT NULL,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer,
  	"law_corrections_id" integer,
  	"codes_id" integer,
  	"code_sections_id" integer
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "law_corrections_texts" ADD CONSTRAINT "law_corrections_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."law_corrections"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_law_corrections_v" ADD CONSTRAINT "_law_corrections_v_parent_id_law_corrections_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."law_corrections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_law_corrections_v_texts" ADD CONSTRAINT "_law_corrections_v_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_law_corrections_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "code_sections_breadcrumbs" ADD CONSTRAINT "code_sections_breadcrumbs_doc_id_code_sections_id_fk" FOREIGN KEY ("doc_id") REFERENCES "public"."code_sections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "code_sections_breadcrumbs" ADD CONSTRAINT "code_sections_breadcrumbs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."code_sections"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "code_sections" ADD CONSTRAINT "code_sections_code_id_codes_id_fk" FOREIGN KEY ("code_id") REFERENCES "public"."codes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "code_sections" ADD CONSTRAINT "code_sections_parent_id_code_sections_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."code_sections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_code_sections_v_version_breadcrumbs" ADD CONSTRAINT "_code_sections_v_version_breadcrumbs_doc_id_code_sections_id_fk" FOREIGN KEY ("doc_id") REFERENCES "public"."code_sections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_code_sections_v_version_breadcrumbs" ADD CONSTRAINT "_code_sections_v_version_breadcrumbs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_code_sections_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_code_sections_v" ADD CONSTRAINT "_code_sections_v_parent_id_code_sections_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."code_sections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_code_sections_v" ADD CONSTRAINT "_code_sections_v_version_code_id_codes_id_fk" FOREIGN KEY ("version_code_id") REFERENCES "public"."codes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_code_sections_v" ADD CONSTRAINT "_code_sections_v_version_parent_id_code_sections_id_fk" FOREIGN KEY ("version_parent_id") REFERENCES "public"."code_sections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_law_corrections_fk" FOREIGN KEY ("law_corrections_id") REFERENCES "public"."law_corrections"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_codes_fk" FOREIGN KEY ("codes_id") REFERENCES "public"."codes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_code_sections_fk" FOREIGN KEY ("code_sections_id") REFERENCES "public"."code_sections"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE UNIQUE INDEX "law_corrections_source_url_idx" ON "law_corrections" USING btree ("source_url");
  CREATE INDEX "law_corrections_updated_at_idx" ON "law_corrections" USING btree ("updated_at");
  CREATE INDEX "law_corrections_created_at_idx" ON "law_corrections" USING btree ("created_at");
  CREATE INDEX "law_corrections_texts_order_parent" ON "law_corrections_texts" USING btree ("order","parent_id");
  CREATE INDEX "_law_corrections_v_parent_idx" ON "_law_corrections_v" USING btree ("parent_id");
  CREATE INDEX "_law_corrections_v_version_version_source_url_idx" ON "_law_corrections_v" USING btree ("version_source_url");
  CREATE INDEX "_law_corrections_v_version_version_updated_at_idx" ON "_law_corrections_v" USING btree ("version_updated_at");
  CREATE INDEX "_law_corrections_v_version_version_created_at_idx" ON "_law_corrections_v" USING btree ("version_created_at");
  CREATE INDEX "_law_corrections_v_created_at_idx" ON "_law_corrections_v" USING btree ("created_at");
  CREATE INDEX "_law_corrections_v_updated_at_idx" ON "_law_corrections_v" USING btree ("updated_at");
  CREATE INDEX "_law_corrections_v_texts_order_parent" ON "_law_corrections_v_texts" USING btree ("order","parent_id");
  CREATE UNIQUE INDEX "codes_slug_idx" ON "codes" USING btree ("slug");
  CREATE INDEX "codes_updated_at_idx" ON "codes" USING btree ("updated_at");
  CREATE INDEX "codes_created_at_idx" ON "codes" USING btree ("created_at");
  CREATE INDEX "code_sections_breadcrumbs_order_idx" ON "code_sections_breadcrumbs" USING btree ("_order");
  CREATE INDEX "code_sections_breadcrumbs_parent_id_idx" ON "code_sections_breadcrumbs" USING btree ("_parent_id");
  CREATE INDEX "code_sections_breadcrumbs_doc_idx" ON "code_sections_breadcrumbs" USING btree ("doc_id");
  CREATE INDEX "code_sections_code_idx" ON "code_sections" USING btree ("code_id");
  CREATE INDEX "code_sections_parent_idx" ON "code_sections" USING btree ("parent_id");
  CREATE UNIQUE INDEX "code_sections_slug_idx" ON "code_sections" USING btree ("slug");
  CREATE INDEX "code_sections_updated_at_idx" ON "code_sections" USING btree ("updated_at");
  CREATE INDEX "code_sections_created_at_idx" ON "code_sections" USING btree ("created_at");
  CREATE INDEX "_code_sections_v_version_breadcrumbs_order_idx" ON "_code_sections_v_version_breadcrumbs" USING btree ("_order");
  CREATE INDEX "_code_sections_v_version_breadcrumbs_parent_id_idx" ON "_code_sections_v_version_breadcrumbs" USING btree ("_parent_id");
  CREATE INDEX "_code_sections_v_version_breadcrumbs_doc_idx" ON "_code_sections_v_version_breadcrumbs" USING btree ("doc_id");
  CREATE INDEX "_code_sections_v_parent_idx" ON "_code_sections_v" USING btree ("parent_id");
  CREATE INDEX "_code_sections_v_version_version_code_idx" ON "_code_sections_v" USING btree ("version_code_id");
  CREATE INDEX "_code_sections_v_version_version_parent_idx" ON "_code_sections_v" USING btree ("version_parent_id");
  CREATE INDEX "_code_sections_v_version_version_slug_idx" ON "_code_sections_v" USING btree ("version_slug");
  CREATE INDEX "_code_sections_v_version_version_updated_at_idx" ON "_code_sections_v" USING btree ("version_updated_at");
  CREATE INDEX "_code_sections_v_version_version_created_at_idx" ON "_code_sections_v" USING btree ("version_created_at");
  CREATE INDEX "_code_sections_v_created_at_idx" ON "_code_sections_v" USING btree ("created_at");
  CREATE INDEX "_code_sections_v_updated_at_idx" ON "_code_sections_v" USING btree ("updated_at");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_locked_documents_rels_law_corrections_id_idx" ON "payload_locked_documents_rels" USING btree ("law_corrections_id");
  CREATE INDEX "payload_locked_documents_rels_codes_id_idx" ON "payload_locked_documents_rels" USING btree ("codes_id");
  CREATE INDEX "payload_locked_documents_rels_code_sections_id_idx" ON "payload_locked_documents_rels" USING btree ("code_sections_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "users_sessions" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "law_corrections" CASCADE;
  DROP TABLE "law_corrections_texts" CASCADE;
  DROP TABLE "_law_corrections_v" CASCADE;
  DROP TABLE "_law_corrections_v_texts" CASCADE;
  DROP TABLE "codes" CASCADE;
  DROP TABLE "code_sections_breadcrumbs" CASCADE;
  DROP TABLE "code_sections" CASCADE;
  DROP TABLE "_code_sections_v_version_breadcrumbs" CASCADE;
  DROP TABLE "_code_sections_v" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TYPE "public"."enum_code_sections_type";
  DROP TYPE "public"."enum__code_sections_v_version_type";`)
}
