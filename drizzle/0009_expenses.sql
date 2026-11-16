CREATE TABLE `wc_expenses` (
  `id` int AUTO_INCREMENT NOT NULL,
  `category` varchar(120) NOT NULL,
  `description` varchar(1000) NOT NULL,
  `amount` int NOT NULL,
  `method` enum('cash','kbzpay','wavepay') NOT NULL,
  `createdBy` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `wc_expenses_id` PRIMARY KEY(`id`)
);--> statement-breakpoint
CREATE INDEX `wc_expenses_created_idx` ON `wc_expenses` (`createdAt`);