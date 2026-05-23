CREATE TABLE IF NOT EXISTS "runner_heartbeats" (
	"runner_id" text PRIMARY KEY NOT NULL,
	"last_started_at" timestamp with time zone,
	"last_ok_at" timestamp with time zone,
	"last_error_at" timestamp with time zone,
	"last_error" text,
	"last_found" integer,
	"last_inserted" integer,
	"last_processed" integer,
	"last_stale_alert_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
