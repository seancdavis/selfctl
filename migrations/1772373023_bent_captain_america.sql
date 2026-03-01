CREATE TABLE "strava_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"athlete_id" integer NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text NOT NULL,
	"expires_at" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "strava_tokens_athlete_id_unique" UNIQUE("athlete_id")
);
--> statement-breakpoint
CREATE TABLE "running_activities" (
	"id" serial PRIMARY KEY NOT NULL,
	"strava_activity_id" bigint NOT NULL,
	"name" varchar(500) NOT NULL,
	"distance_miles" numeric(6, 2) NOT NULL,
	"duration_seconds" integer NOT NULL,
	"moving_time_seconds" integer NOT NULL,
	"pace_seconds_per_mile" integer NOT NULL,
	"elevation_gain_feet" numeric(7, 1),
	"activity_date" timestamp NOT NULL,
	"strava_type" varchar(50) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "running_activities_strava_activity_id_unique" UNIQUE("strava_activity_id")
);
--> statement-breakpoint
CREATE TABLE "races" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(500) NOT NULL,
	"race_date" varchar(10) NOT NULL,
	"distance_label" varchar(50) NOT NULL,
	"distance_miles" numeric(6, 2) NOT NULL,
	"goal_time_seconds" integer,
	"actual_time_seconds" integer,
	"linked_activity_id" integer,
	"notes_markdown" text,
	"notes_html" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "skipped" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "races" ADD CONSTRAINT "races_linked_activity_id_running_activities_id_fk" FOREIGN KEY ("linked_activity_id") REFERENCES "public"."running_activities"("id") ON DELETE set null ON UPDATE no action;