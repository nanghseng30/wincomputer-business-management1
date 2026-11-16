ALTER TABLE `wc_users` ADD `customRoleId` int;
--> statement-breakpoint
ALTER TABLE `wc_users` ADD `deletedAt` timestamp;
--> statement-breakpoint
ALTER TABLE `wc_settings` ADD `welcomeTextMm` varchar(1000) NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE `wc_settings` ADD `contactViber` varchar(120);
--> statement-breakpoint
ALTER TABLE `wc_settings` ADD `contactTelegram` varchar(120);
--> statement-breakpoint
ALTER TABLE `wc_settings` ADD `contactPhone` varchar(80);
--> statement-breakpoint
ALTER TABLE `wc_settings` ADD `logoReference` varchar(500);
--> statement-breakpoint
ALTER TABLE `wc_notices` ADD `targetRole` varchar(80);
--> statement-breakpoint
CREATE TABLE `wc_roles` (`id` int AUTO_INCREMENT NOT NULL, `name` varchar(80) NOT NULL, `description` varchar(500), `active` boolean NOT NULL DEFAULT true, `createdBy` int NOT NULL, `createdAt` timestamp NOT NULL DEFAULT (now()), `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP, CONSTRAINT `wc_roles_id` PRIMARY KEY(`id`), CONSTRAINT `wc_roles_name_unique` UNIQUE(`name`));
--> statement-breakpoint
CREATE TABLE `wc_role_capabilities` (`id` int AUTO_INCREMENT NOT NULL, `roleId` int NOT NULL, `capability` varchar(100) NOT NULL, `grantedBy` int NOT NULL, `createdAt` timestamp NOT NULL DEFAULT (now()), CONSTRAINT `wc_role_capabilities_id` PRIMARY KEY(`id`), CONSTRAINT `wc_role_capability_unique` UNIQUE(`roleId`,`capability`));
--> statement-breakpoint
CREATE TABLE `wc_user_capabilities` (`id` int AUTO_INCREMENT NOT NULL, `userId` int NOT NULL, `capability` varchar(100) NOT NULL, `grantedBy` int NOT NULL, `createdAt` timestamp NOT NULL DEFAULT (now()), CONSTRAINT `wc_user_capabilities_id` PRIMARY KEY(`id`), CONSTRAINT `wc_user_capability_unique` UNIQUE(`userId`,`capability`));
--> statement-breakpoint
CREATE TABLE `wc_product_categories` (`id` int AUTO_INCREMENT NOT NULL, `name` varchar(120) NOT NULL, `active` boolean NOT NULL DEFAULT true, `createdBy` int NOT NULL, `createdAt` timestamp NOT NULL DEFAULT (now()), CONSTRAINT `wc_product_categories_id` PRIMARY KEY(`id`), CONSTRAINT `wc_product_categories_name_unique` UNIQUE(`name`));
--> statement-breakpoint
CREATE TABLE `wc_products` (`id` int AUTO_INCREMENT NOT NULL, `categoryId` int, `sku` varchar(80) NOT NULL, `name` varchar(200) NOT NULL, `unit` varchar(40) NOT NULL, `purchasePrice` int NOT NULL DEFAULT 0, `salePrice` int NOT NULL DEFAULT 0, `active` boolean NOT NULL DEFAULT true, `createdBy` int NOT NULL, `createdAt` timestamp NOT NULL DEFAULT (now()), `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP, CONSTRAINT `wc_products_id` PRIMARY KEY(`id`), CONSTRAINT `wc_products_sku_unique` UNIQUE(`sku`));
--> statement-breakpoint
CREATE TABLE `wc_service_types` (`id` int AUTO_INCREMENT NOT NULL, `name` varchar(200) NOT NULL, `price` int NOT NULL DEFAULT 0, `active` boolean NOT NULL DEFAULT true, `createdBy` int NOT NULL, `createdAt` timestamp NOT NULL DEFAULT (now()), CONSTRAINT `wc_service_types_id` PRIMARY KEY(`id`), CONSTRAINT `wc_service_types_name_unique` UNIQUE(`name`));
--> statement-breakpoint
CREATE TABLE `wc_receipt_items` (`id` int AUTO_INCREMENT NOT NULL, `receiptId` int NOT NULL, `productId` int, `serviceTypeId` int, `description` varchar(300) NOT NULL, `quantity` int NOT NULL DEFAULT 1, `unitPrice` int NOT NULL, `lineTotal` int NOT NULL, CONSTRAINT `wc_receipt_items_id` PRIMARY KEY(`id`));
--> statement-breakpoint
CREATE INDEX `wc_receipt_items_receipt_idx` ON `wc_receipt_items` (`receiptId`);
--> statement-breakpoint
CREATE TABLE `wc_notification_reads` (`id` int AUTO_INCREMENT NOT NULL, `notificationId` int NOT NULL, `userId` int NOT NULL, `acknowledgedAt` timestamp NOT NULL DEFAULT (now()), CONSTRAINT `wc_notification_reads_id` PRIMARY KEY(`id`), CONSTRAINT `wc_notification_read_unique` UNIQUE(`notificationId`,`userId`));
