ALTER TABLE `wc_users` ADD `lifecycleReason` varchar(1000);--> statement-breakpoint
ALTER TABLE `wc_users` ADD `lifecycleAt` timestamp NULL;--> statement-breakpoint
ALTER TABLE `wc_users` ADD `lifecycleBy` int NULL;