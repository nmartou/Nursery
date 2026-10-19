CREATE TABLE "child_absence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"child_id" uuid NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"kind" varchar(20) NOT NULL,
	"comment" varchar(500),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ck_child_absence_period" CHECK ("child_absence"."end_date" >= "child_absence"."start_date"),
	CONSTRAINT "ck_child_absence_kind" CHECK ("child_absence"."kind" in ('vacation', 'sickness', 'other'))
);
--> statement-breakpoint
CREATE TABLE "closure" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"label" varchar(100) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ck_closure_period" CHECK ("closure"."end_date" >= "closure"."start_date")
);
--> statement-breakpoint
ALTER TABLE "child_absence" ADD CONSTRAINT "child_absence_child_id_child_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."child"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_child_absence_child" ON "child_absence" USING btree ("child_id");--> statement-breakpoint
CREATE INDEX "idx_child_absence_period" ON "child_absence" USING btree ("start_date","end_date");--> statement-breakpoint
CREATE INDEX "idx_closure_period" ON "closure" USING btree ("start_date","end_date");