CREATE TABLE `wc_employee_profiles` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `phone` varchar(80),
  `businessEmail` varchar(320),
  `address` varchar(500),
  `dateOfBirth` varchar(20),
  `nationalId` varchar(120),
  `emergencyContact` varchar(300),
  `jobTitle` varchar(160),
  `avatarReference` varchar(500),
  `profileCompleted` boolean NOT NULL DEFAULT false,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `wc_employee_profiles_id` PRIMARY KEY(`id`),
  CONSTRAINT `wc_employee_profiles_user_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE INDEX `wc_employee_profiles_completed_idx` ON `wc_employee_profiles` (`profileCompleted`);
