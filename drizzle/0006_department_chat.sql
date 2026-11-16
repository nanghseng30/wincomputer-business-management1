ALTER TABLE `wc_employee_profiles`
  ADD COLUMN `department` varchar(160);
--> statement-breakpoint
CREATE TABLE `wc_chat_messages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `senderId` int NOT NULL,
  `recipientId` int NOT NULL,
  `body` varchar(2000) NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `wc_chat_sender_idx` (`senderId`, `createdAt`),
  KEY `wc_chat_recipient_idx` (`recipientId`, `createdAt`)
);
