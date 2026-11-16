ALTER TABLE `wc_settings` ADD `contactKbzPay` varchar(120);--> statement-breakpoint
ALTER TABLE `wc_settings` ADD `contactWavePay` varchar(120);--> statement-breakpoint
ALTER TABLE `wc_chat_messages` ADD `attachmentData` text;--> statement-breakpoint
ALTER TABLE `wc_chat_messages` ADD `attachmentMime` varchar(80);