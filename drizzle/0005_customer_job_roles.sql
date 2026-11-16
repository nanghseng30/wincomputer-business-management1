ALTER TABLE `wc_users`
  MODIFY COLUMN `role` enum('owner','admin','staff','accountant','general_worker','technician','sales','marketing','talent','customer') NOT NULL;
--> statement-breakpoint
ALTER TABLE `wc_account_requests`
  MODIFY COLUMN `requestedRole` enum('admin','staff','accountant','general_worker','technician','sales','marketing','talent') NOT NULL;
--> statement-breakpoint
ALTER TABLE `wc_notices`
  MODIFY COLUMN `audience` enum('all','owner','admin','staff','accountant','general_worker','technician','sales','marketing','talent','customer') NOT NULL;
