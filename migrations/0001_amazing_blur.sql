CREATE TABLE `team_members` (
	`userId` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`status` text NOT NULL,
	`studies` text DEFAULT '[]' NOT NULL,
	`participantId` text,
	`version` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `team_participant_assignment` ON `team_members` (`participantId`);--> statement-breakpoint
CREATE TABLE `team_workspace` (
	`id` integer PRIMARY KEY NOT NULL,
	`owner` text NOT NULL
);
