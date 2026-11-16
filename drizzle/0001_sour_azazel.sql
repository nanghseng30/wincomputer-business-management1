CREATE TABLE `wc_audit` (
	`id` int AUTO_INCREMENT NOT NULL,
	`actorId` int NOT NULL,
	`actorName` varchar(120) NOT NULL,
	`action` varchar(80) NOT NULL,
	`entityType` varchar(80) NOT NULL,
	`entityId` varchar(80) NOT NULL,
	`details` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `wc_audit_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `wc_capabilities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`capability` enum('manage_prices') NOT NULL,
	`grantedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `wc_capabilities_id` PRIMARY KEY(`id`),
	CONSTRAINT `wc_capability_user_unique` UNIQUE(`userId`,`capability`)
);
--> statement-breakpoint
CREATE TABLE `wc_notice_reads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`noticeId` int NOT NULL,
	`userId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `wc_notice_reads_id` PRIMARY KEY(`id`),
	CONSTRAINT `wc_notice_read_unique` UNIQUE(`noticeId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `wc_notices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`titleEn` varchar(200) NOT NULL,
	`titleMm` varchar(200) NOT NULL,
	`bodyEn` varchar(2000) NOT NULL,
	`bodyMm` varchar(2000) NOT NULL,
	`audience` enum('all','owner','admin','staff') NOT NULL,
	`type` enum('announcement','maintenance','notification') NOT NULL,
	`targetUserId` int,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `wc_notices_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `wc_permission_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requesterId` int NOT NULL,
	`capability` enum('manage_prices') NOT NULL,
	`reason` varchar(1000) NOT NULL,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`decisionNote` varchar(1000),
	`decidedBy` int,
	`decidedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `wc_permission_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `wc_price_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`priceId` int NOT NULL,
	`oldAmount` int,
	`newAmount` int,
	`actorId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `wc_price_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `wc_prices` (
	`id` int NOT NULL,
	`amount` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `wc_prices_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `wc_rate_limits` (
	`id` varchar(64) NOT NULL,
	`attempts` int NOT NULL,
	`windowStart` timestamp NOT NULL,
	CONSTRAINT `wc_rate_limits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `wc_receipts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`number` varchar(48) NOT NULL,
	`type` enum('sale','service') NOT NULL,
	`description` varchar(1000) NOT NULL,
	`amount` int NOT NULL,
	`method` enum('cash','kbzpay','wavepay') NOT NULL,
	`paymentReceived` boolean NOT NULL,
	`status` enum('active','void','refunded') NOT NULL DEFAULT 'active',
	`customer` varchar(200),
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `wc_receipts_id` PRIMARY KEY(`id`),
	CONSTRAINT `wc_receipts_number_unique` UNIQUE(`number`)
);
--> statement-breakpoint
CREATE TABLE `wc_refunds` (
	`id` int AUTO_INCREMENT NOT NULL,
	`receiptId` int NOT NULL,
	`amount` int NOT NULL,
	`method` enum('cash','kbzpay','wavepay') NOT NULL,
	`actorId` int NOT NULL,
	`reason` varchar(1000) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `wc_refunds_id` PRIMARY KEY(`id`),
	CONSTRAINT `wc_refunds_receiptId_unique` UNIQUE(`receiptId`)
);
--> statement-breakpoint
CREATE TABLE `wc_sessions` (
	`id` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `wc_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `wc_settings` (
	`id` int NOT NULL,
	`maintenanceEnabled` boolean NOT NULL DEFAULT false,
	`messageEn` varchar(1000) NOT NULL DEFAULT '',
	`messageMm` varchar(1000) NOT NULL DEFAULT '',
	`startAt` varchar(40),
	`endAt` varchar(40),
	`openingCash` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `wc_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `wc_users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`username` varchar(64) NOT NULL,
	`name` varchar(120) NOT NULL,
	`passwordHash` varchar(255) NOT NULL,
	`role` enum('owner','admin','staff') NOT NULL,
	`ownerGuard` int,
	`mustChangePassword` boolean NOT NULL DEFAULT false,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `wc_users_id` PRIMARY KEY(`id`),
	CONSTRAINT `wc_users_username_unique` UNIQUE(`username`),
	CONSTRAINT `wc_users_ownerGuard_unique` UNIQUE(`ownerGuard`)
);
--> statement-breakpoint
CREATE INDEX `wc_permission_requester_idx` ON `wc_permission_requests` (`requesterId`);--> statement-breakpoint
CREATE INDEX `wc_sessions_user_idx` ON `wc_sessions` (`userId`);--> statement-breakpoint
CREATE INDEX `wc_sessions_expiry_idx` ON `wc_sessions` (`expiresAt`);