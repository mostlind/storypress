SET local check_function_bodies = off;

CREATE TABLE "public"."characters" (
  "id"            uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "project_id"    uuid,
  "name"          text                     NOT NULL DEFAULT ''::text,
  "description"   text                     NOT NULL DEFAULT ''::text,
  "portrait_path" text,
  "display_order" integer                  NOT NULL DEFAULT 0,
  "created_at"    timestamp with time zone DEFAULT now(),
  CONSTRAINT "characters_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."characters"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."orders" (
  "id"                       uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "project_id"               uuid                     NOT NULL,
  "storybook_id"             uuid                     NOT NULL,
  "user_id"                  uuid                     NOT NULL,
  "contact_email"            text                     NOT NULL,
  "stripe_payment_intent_id" text,
  "lulu_order_id"            text,
  "status"                   text                     NOT NULL DEFAULT 'pending'::text,
  "shipping_address"         jsonb                    NOT NULL,
  "amount_cents"             integer                  NOT NULL,
  "created_at"               timestamp with time zone DEFAULT now(),
  CONSTRAINT "orders_pkey" PRIMARY KEY (id),
  CONSTRAINT "orders_status_check"
    CHECK ((status = ANY (ARRAY['pending'::text, 'paid'::text, 'submitted_to_printer'::text, 'printing'::text, 'shipped'::text, 'delivered'::text, 'failed'::text])))
);

ALTER TABLE "public"."orders"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."photos" (
  "id"           uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "project_id"   uuid                     NOT NULL,
  "storage_path" text                     NOT NULL,
  "public_url"   text                     NOT NULL,
  "order"        integer                  NOT NULL DEFAULT 0,
  "caption"      text,
  "created_at"   timestamp with time zone DEFAULT now(),
  CONSTRAINT "photos_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."photos"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."projects" (
  "id"           uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "user_id"      uuid                     NOT NULL,
  "title"        text                     NOT NULL,
  "description"  text                     NOT NULL,
  "status"       text                     NOT NULL DEFAULT 'draft'::text,
  "created_at"   timestamp with time zone DEFAULT now(),
  "updated_at"   timestamp with time zone DEFAULT now(),
  "conversation" jsonb                    NOT NULL DEFAULT '[]'::jsonb,
  CONSTRAINT "projects_pkey" PRIMARY KEY (id),
  CONSTRAINT "projects_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'generating'::text, 'ready'::text, 'ordered'::text, 'printing'::text, 'shipped'::text])))
);

ALTER TABLE "public"."projects"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."storybooks" (
  "id"               uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "project_id"       uuid                     NOT NULL,
  "chapters"         jsonb                    NOT NULL DEFAULT '[]'::jsonb,
  "cover_image_path" text,
  "pdf_path"         text,
  "status"           text                     NOT NULL DEFAULT 'generating'::text,
  "created_at"       timestamp with time zone DEFAULT now(),
  "beats"            jsonb                    NOT NULL DEFAULT '[]'::jsonb,
  "cover_pdf_path"   text,
  CONSTRAINT "storybooks_pkey" PRIMARY KEY (id),
  CONSTRAINT "storybooks_project_id_key" UNIQUE (project_id),
  CONSTRAINT "storybooks_status_check" CHECK ((status = ANY (ARRAY['generating'::text, 'generating_images'::text, 'ready'::text, 'failed'::text])))
);

ALTER TABLE "public"."storybooks"
  ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.rls_auto_enable()
  RETURNS event_trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'pg_catalog'
  AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$;

ALTER TABLE "public"."orders"
  ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id);

ALTER TABLE "public"."characters"
  ADD CONSTRAINT "characters_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE "public"."orders"
  ADD CONSTRAINT "orders_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id);

ALTER TABLE "public"."photos"
  ADD CONSTRAINT "photos_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE "public"."projects"
  ADD CONSTRAINT "projects_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."orders"
  ADD CONSTRAINT "orders_storybook_id_fkey" FOREIGN KEY (storybook_id) REFERENCES public.storybooks(id);

ALTER TABLE "public"."storybooks"
  ADD CONSTRAINT "storybooks_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

CREATE POLICY "Users manage their own characters" ON "public"."characters"
  FOR ALL
  TO PUBLIC
  USING ((project_id IN ( SELECT projects.id
   FROM public.projects
  WHERE (projects.user_id = auth.uid()))));

CREATE POLICY "Users can manage own orders" ON "public"."orders"
  FOR ALL
  TO PUBLIC
  USING ((auth.uid() = user_id));

CREATE POLICY "Users can manage photos on own projects" ON "public"."photos"
  FOR ALL
  TO PUBLIC
  USING ((EXISTS ( SELECT 1
   FROM public.projects
  WHERE ((projects.id = photos.project_id) AND (projects.user_id = auth.uid())))));

CREATE POLICY "Users can manage own projects" ON "public"."projects"
  FOR ALL
  TO PUBLIC
  USING ((auth.uid() = user_id));

CREATE POLICY "Users can view own storybooks" ON "public"."storybooks"
  FOR ALL
  TO PUBLIC
  USING ((EXISTS ( SELECT 1
   FROM public.projects
  WHERE ((projects.id = storybooks.project_id) AND (projects.user_id = auth.uid())))));

CREATE POLICY "Users can read own photos" ON "storage"."objects"
  FOR SELECT
  TO "authenticated"
  USING (((bucket_id = 'photos'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));

CREATE POLICY "Users can read storybooks" ON "storage"."objects"
  FOR SELECT
  TO "authenticated"
  USING ((bucket_id = 'storybooks'::text));

CREATE POLICY "Users can upload photos" ON "storage"."objects"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((bucket_id = 'photos'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));

CREATE POLICY "Users can upload storybooks" ON "storage"."objects"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((bucket_id = 'storybooks'::text));

CREATE EVENT TRIGGER "ensure_rls"
  ON ddl_command_end
  WHEN TAG IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
  EXECUTE FUNCTION "public"."rls_auto_enable"();

GRANT EXECUTE ON FUNCTION "public"."rls_auto_enable"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."characters" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."orders" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."photos" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."projects" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."storybooks" TO "anon", "authenticated", "postgres", "service_role";

