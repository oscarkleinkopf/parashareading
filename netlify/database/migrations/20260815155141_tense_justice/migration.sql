CREATE TABLE "recordings" (
	"id" serial PRIMARY KEY,
	"parasha_id" varchar(64) NOT NULL,
	"aliyah" varchar(8) NOT NULL,
	"verse_start" integer,
	"verse_end" integer,
	"blob_key" text NOT NULL,
	"content_type" varchar(64) DEFAULT 'audio/webm' NOT NULL,
	"duration_ms" integer,
	"uploader_id" varchar(128),
	"uploader_name" varchar(255),
	"tradition" varchar(32) DEFAULT 'ashkenazi' NOT NULL,
	"status" varchar(16) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
