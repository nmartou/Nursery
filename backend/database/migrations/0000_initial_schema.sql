CREATE TABLE "child" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nursery_id" uuid NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"birth_date" date NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "child_parent" (
	"child_id" uuid NOT NULL,
	"parent_id" uuid NOT NULL,
	"relationship" varchar(30) DEFAULT 'parent' NOT NULL,
	CONSTRAINT "child_parent_child_id_parent_id_pk" PRIMARY KEY("child_id","parent_id")
);
--> statement-breakpoint
CREATE TABLE "daily_report" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"child_id" uuid NOT NULL,
	"report_date" date NOT NULL,
	"absent" boolean DEFAULT false NOT NULL,
	"absence_comment" varchar(500),
	"arrival_time" time,
	"departure_time" time,
	"meal_comment" varchar(500),
	"no_nap" boolean DEFAULT false NOT NULL,
	"nap_comment" varchar(500),
	"stool_status" varchar(10) DEFAULT 'normal' NOT NULL,
	"stool_comment" varchar(500),
	"parent_note" varchar(1000),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_daily_report_child_date" UNIQUE("child_id","report_date"),
	CONSTRAINT "ck_daily_report_weekday" CHECK (extract(isodow from "daily_report"."report_date") < 6),
	CONSTRAINT "ck_daily_report_stool_status" CHECK ("daily_report"."stool_status" in ('normal', 'other')),
	CONSTRAINT "ck_daily_report_stool_comment" CHECK ("daily_report"."stool_status" = 'normal' or "daily_report"."stool_comment" is not null)
);
--> statement-breakpoint
CREATE TABLE "nursery" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(150) NOT NULL,
	"address" varchar(255) NOT NULL,
	"capacity" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ck_nursery_capacity" CHECK ("nursery"."capacity" > 0)
);
--> statement-breakpoint
CREATE TABLE "parent" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(30),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "parent_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "report_bottle" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid NOT NULL,
	"time" time NOT NULL,
	"quantity_ml" integer,
	CONSTRAINT "ck_report_bottle_quantity" CHECK ("report_bottle"."quantity_ml" >= 0)
);
--> statement-breakpoint
CREATE TABLE "report_meal" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid NOT NULL,
	"position" smallint DEFAULT 0 NOT NULL,
	"label" varchar(100) NOT NULL,
	"quantity_grams" integer,
	CONSTRAINT "ck_report_meal_quantity" CHECK ("report_meal"."quantity_grams" >= 0)
);
--> statement-breakpoint
CREATE TABLE "report_nap" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time,
	CONSTRAINT "ck_report_nap_end_after_start" CHECK ("report_nap"."end_time" is null or "report_nap"."end_time" > "report_nap"."start_time")
);
--> statement-breakpoint
ALTER TABLE "child" ADD CONSTRAINT "child_nursery_id_nursery_id_fk" FOREIGN KEY ("nursery_id") REFERENCES "public"."nursery"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "child_parent" ADD CONSTRAINT "child_parent_child_id_child_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."child"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "child_parent" ADD CONSTRAINT "child_parent_parent_id_parent_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."parent"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_report" ADD CONSTRAINT "daily_report_child_id_child_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."child"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_bottle" ADD CONSTRAINT "report_bottle_report_id_daily_report_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."daily_report"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_meal" ADD CONSTRAINT "report_meal_report_id_daily_report_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."daily_report"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_nap" ADD CONSTRAINT "report_nap_report_id_daily_report_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."daily_report"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_child_nursery" ON "child" USING btree ("nursery_id");--> statement-breakpoint
CREATE INDEX "idx_daily_report_date" ON "daily_report" USING btree ("report_date");--> statement-breakpoint
CREATE INDEX "idx_report_bottle_report" ON "report_bottle" USING btree ("report_id");--> statement-breakpoint
CREATE INDEX "idx_report_meal_report" ON "report_meal" USING btree ("report_id");--> statement-breakpoint
CREATE INDEX "idx_report_nap_report" ON "report_nap" USING btree ("report_id");