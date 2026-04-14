CREATE TABLE `session_content` (
	`session_id` text PRIMARY KEY NOT NULL,
	`blurb` text,
	`potential_contenders_intro` text,
	`potential_contenders` text,
	`related_news` text,
	`scorecard` text,
	`content_meta` text,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`sport` text NOT NULL,
	`name` text NOT NULL,
	`desc` text NOT NULL,
	`venue` text NOT NULL,
	`zone` text NOT NULL,
	`date` text NOT NULL,
	`dk` text NOT NULL,
	`time` text NOT NULL,
	`rt` text NOT NULL,
	`p_lo` real NOT NULL,
	`p_hi` real NOT NULL,
	`soccer` integer NOT NULL,
	`r_sig` real NOT NULL,
	`r_exp` real NOT NULL,
	`r_star` real NOT NULL,
	`r_uniq` real NOT NULL,
	`r_dem` real NOT NULL,
	`agg` real NOT NULL
);
--> statement-breakpoint
CREATE INDEX `sessions_sport_idx` ON `sessions` (`sport`);--> statement-breakpoint
CREATE INDEX `sessions_zone_idx` ON `sessions` (`zone`);--> statement-breakpoint
CREATE INDEX `sessions_rt_idx` ON `sessions` (`rt`);--> statement-breakpoint
CREATE INDEX `sessions_dk_idx` ON `sessions` (`dk`);--> statement-breakpoint
CREATE INDEX `sessions_agg_idx` ON `sessions` (`agg`);