CREATE TABLE `auth_accounts` (
	`userId` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`salt` text NOT NULL,
	`passwordHash` text NOT NULL,
	`iterations` integer NOT NULL,
	`createdAt` text NOT NULL,
	`disabled` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `auth_accounts_email` ON `auth_accounts` (`email`);