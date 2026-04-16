-- Flexible Weeks: Convert weeks PK from varchar(7) to UUID, add label column
-- Hand-written migration because Drizzle can't auto-handle PK type changes with data migration

-- Step 1: Add new columns to weeks
ALTER TABLE "weeks" ADD COLUMN "uuid_id" uuid DEFAULT gen_random_uuid() NOT NULL;
ALTER TABLE "weeks" ADD COLUMN "label" varchar(7);

-- Step 2: Populate label from current id, and ensure uuid_id is generated
UPDATE "weeks" SET "label" = "id";

-- Step 3: Add uuid_week_id column to tasks
ALTER TABLE "tasks" ADD COLUMN "uuid_week_id" uuid;

-- Step 4: Populate uuid_week_id by joining tasks.week_id to weeks.id to get uuid_id
UPDATE "tasks" SET "uuid_week_id" = "weeks"."uuid_id"
FROM "weeks" WHERE "tasks"."week_id" = "weeks"."id";

-- Step 5: Drop FK constraint on tasks.week_id
ALTER TABLE "tasks" DROP CONSTRAINT IF EXISTS "tasks_week_id_weeks_id_fk";

-- Step 6: Drop old columns and PKs
ALTER TABLE "weeks" DROP CONSTRAINT "weeks_pkey";
ALTER TABLE "tasks" DROP COLUMN "week_id";
ALTER TABLE "weeks" DROP COLUMN "id";

-- Step 7: Rename new columns to final names
ALTER TABLE "weeks" RENAME COLUMN "uuid_id" TO "id";
ALTER TABLE "tasks" RENAME COLUMN "uuid_week_id" TO "week_id";

-- Step 8: Set up new constraints
ALTER TABLE "weeks" ADD PRIMARY KEY ("id");
ALTER TABLE "weeks" ALTER COLUMN "label" SET NOT NULL;
ALTER TABLE "weeks" ADD CONSTRAINT "weeks_label_unique" UNIQUE ("label");
ALTER TABLE "tasks" ALTER COLUMN "week_id" SET NOT NULL;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_week_id_weeks_id_fk" FOREIGN KEY ("week_id") REFERENCES "weeks"("id") ON DELETE CASCADE;
