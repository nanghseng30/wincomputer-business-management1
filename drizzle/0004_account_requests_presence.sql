ALTER TABLE `wc_employee_profiles` ADD `avatarData` text;
--> statement-breakpoint
ALTER TABLE `wc_sessions` ADD `lastSeenAt` timestamp NULL;
--> statement-breakpoint
ALTER TABLE `wc_sessions` ADD `deviceType` varchar(24);
--> statement-breakpoint
ALTER TABLE `wc_sessions` ADD `deviceLabel` varchar(80);
--> statement-breakpoint
ALTER TABLE `wc_sessions` ADD `userAgent` varchar(320);
--> statement-breakpoint
CREATE TABLE `wc_account_requests` (
  `id` int AUTO_INCREMENT NOT NULL,
  `username` varchar(64) NOT NULL,
  `name` varchar(120) NOT NULL,
  `passwordHash` varchar(255) NOT NULL,
  `requestedRole` enum('admin','staff') NOT NULL,
  `phone` varchar(80) NOT NULL,
  `businessEmail` varchar(320) NOT NULL,
  `address` varchar(500) NOT NULL,
  `dateOfBirth` varchar(20),
  `nationalId` varchar(120),
  `emergencyContact` varchar(300),
  `jobTitle` varchar(160) NOT NULL,
  `avatarData` text NOT NULL,
  `status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `decisionNote` varchar(1000),
  `reviewedBy` int,
  `reviewedAt` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `wc_account_requests_id` PRIMARY KEY(`id`),
  CONSTRAINT `wc_account_requests_username_unique` UNIQUE(`username`)
);
--> statement-breakpoint
CREATE INDEX `wc_account_requests_status_idx` ON `wc_account_requests` (`status`);
