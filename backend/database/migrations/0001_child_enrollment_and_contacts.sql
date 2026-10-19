CREATE TABLE "child_contact" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"child_id" uuid NOT NULL,
	"position" smallint DEFAULT 0 NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"relationship" varchar(50) NOT NULL,
	"phone" varchar(30) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "child" ADD COLUMN "enrollment_start" date;--> statement-breakpoint
ALTER TABLE "child" ADD COLUMN "enrollment_end" date;--> statement-breakpoint
-- Hand-written backfill (existing rows): enrolled from their first report (or
-- creation day) and, for children marked inactive, until their last report.
UPDATE "child" c SET "enrollment_start" = greatest(
  c."birth_date",
  least(c."created_at"::date, coalesce(
    (SELECT min(r."report_date") FROM "daily_report" r WHERE r."child_id" = c."id"),
    c."created_at"::date))
);--> statement-breakpoint
UPDATE "child" c SET "enrollment_end" = greatest(
  c."enrollment_start",
  coalesce(
    (SELECT max(r."report_date") FROM "daily_report" r WHERE r."child_id" = c."id"),
    c."enrollment_start")
) WHERE NOT c."active";--> statement-breakpoint
ALTER TABLE "child" ALTER COLUMN "enrollment_start" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "child" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "child_parent" ADD COLUMN "position" smallint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "child_contact" ADD CONSTRAINT "child_contact_child_id_child_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."child"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_child_contact_child" ON "child_contact" USING btree ("child_id");--> statement-breakpoint
CREATE INDEX "idx_child_enrollment" ON "child" USING btree ("enrollment_start","enrollment_end");--> statement-breakpoint
CREATE INDEX "idx_child_parent_parent" ON "child_parent" USING btree ("parent_id");--> statement-breakpoint
ALTER TABLE "child" ADD CONSTRAINT "ck_child_enrollment_after_birth" CHECK ("child"."enrollment_start" >= "child"."birth_date");--> statement-breakpoint
ALTER TABLE "child" ADD CONSTRAINT "ck_child_enrollment_period" CHECK ("child"."enrollment_end" is null or "child"."enrollment_end" >= "child"."enrollment_start");