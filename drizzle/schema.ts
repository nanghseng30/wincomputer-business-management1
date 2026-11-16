import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// TODO: Add your tables here
// Standalone application tables intentionally do not use or modify OAuth users.
// The legacy table above is retained for non-destructive starter compatibility.
import { boolean, index, uniqueIndex } from "drizzle-orm/mysql-core";

export const wcUsers = mysqlTable("wc_users", {
  id: int("id").autoincrement().primaryKey(),
  username: varchar("username", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 120 }).notNull(),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  role: mysqlEnum("role", [
    "owner",
    "admin",
    "staff",
    "accountant",
    "general_worker",
    "technician",
    "sales",
    "marketing",
    "talent",
    "customer",
  ]).notNull(),
  // Only an owner has this value; a unique nullable key serializes first setup.
  ownerGuard: int("ownerGuard").unique(),
  mustChangePassword: boolean("mustChangePassword").notNull().default(false),
  active: boolean("active").notNull().default(true),
  customRoleId: int("customRoleId"),
  deletedAt: timestamp("deletedAt"),
  lifecycleReason: varchar("lifecycleReason", { length: 1000 }),
  lifecycleAt: timestamp("lifecycleAt"),
  lifecycleBy: int("lifecycleBy"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow().onUpdateNow(),
});
export type WcUser = typeof wcUsers.$inferSelect;

export const wcEmployeeProfiles = mysqlTable(
  "wc_employee_profiles",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().unique(),
    phone: varchar("phone", { length: 80 }),
    businessEmail: varchar("businessEmail", { length: 320 }),
    address: varchar("address", { length: 500 }),
    dateOfBirth: varchar("dateOfBirth", { length: 20 }),
    nationalId: varchar("nationalId", { length: 120 }),
    emergencyContact: varchar("emergencyContact", { length: 300 }),
    jobTitle: varchar("jobTitle", { length: 160 }),
    department: varchar("department", { length: 160 }),
    avatarReference: varchar("avatarReference", { length: 500 }),
    avatarData: text("avatarData"),
    profileCompleted: boolean("profileCompleted").notNull().default(false),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow().onUpdateNow(),
  },
  table => [
    index("wc_employee_profiles_completed_idx").on(table.profileCompleted),
  ]
);
export type WcEmployeeProfile = typeof wcEmployeeProfiles.$inferSelect;

export const wcSessions = mysqlTable(
  "wc_sessions",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    userId: int("userId").notNull(),
    expiresAt: timestamp("expiresAt").notNull(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    lastSeenAt: timestamp("lastSeenAt"),
    deviceType: varchar("deviceType", { length: 24 }),
    deviceLabel: varchar("deviceLabel", { length: 80 }),
    userAgent: varchar("userAgent", { length: 320 }),
  },
  table => [
    index("wc_sessions_user_idx").on(table.userId),
    index("wc_sessions_expiry_idx").on(table.expiresAt),
  ]
);

export const wcRateLimits = mysqlTable("wc_rate_limits", {
  id: varchar("id", { length: 64 }).primaryKey(),
  attempts: int("attempts").notNull(),
  windowStart: timestamp("windowStart").notNull(),
});

export const wcAccountRequests = mysqlTable(
  "wc_account_requests",
  {
    id: int("id").autoincrement().primaryKey(),
    username: varchar("username", { length: 64 }).notNull().unique(),
    name: varchar("name", { length: 120 }).notNull(),
    passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
    requestedRole: mysqlEnum("requestedRole", [
      "admin",
      "staff",
      "accountant",
      "general_worker",
      "technician",
      "sales",
      "marketing",
      "talent",
    ]).notNull(),
    phone: varchar("phone", { length: 80 }).notNull(),
    businessEmail: varchar("businessEmail", { length: 320 }).notNull(),
    address: varchar("address", { length: 500 }).notNull(),
    dateOfBirth: varchar("dateOfBirth", { length: 20 }),
    nationalId: varchar("nationalId", { length: 120 }),
    emergencyContact: varchar("emergencyContact", { length: 300 }),
    jobTitle: varchar("jobTitle", { length: 160 }).notNull(),
    avatarData: text("avatarData").notNull(),
    status: mysqlEnum("status", ["pending", "approved", "rejected"])
      .notNull()
      .default("pending"),
    decisionNote: varchar("decisionNote", { length: 1000 }),
    reviewedBy: int("reviewedBy"),
    reviewedAt: timestamp("reviewedAt"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  table => [index("wc_account_requests_status_idx").on(table.status)]
);
export type WcAccountRequest = typeof wcAccountRequests.$inferSelect;

export const wcReceipts = mysqlTable("wc_receipts", {
  id: int("id").autoincrement().primaryKey(),
  number: varchar("number", { length: 48 }).notNull().unique(),
  type: mysqlEnum("type", ["sale", "service"]).notNull(),
  description: varchar("description", { length: 1000 }).notNull(),
  amount: int("amount").notNull(),
  method: mysqlEnum("method", ["cash", "kbzpay", "wavepay"]).notNull(),
  paymentReceived: boolean("paymentReceived").notNull(),
  status: mysqlEnum("status", ["active", "void", "refunded"])
    .notNull()
    .default("active"),
  customer: varchar("customer", { length: 200 }),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});
export const wcRefunds = mysqlTable("wc_refunds", {
  id: int("id").autoincrement().primaryKey(),
  receiptId: int("receiptId").notNull().unique(),
  amount: int("amount").notNull(),
  method: mysqlEnum("method", ["cash", "kbzpay", "wavepay"]).notNull(),
  actorId: int("actorId").notNull(),
  reason: varchar("reason", { length: 1000 }).notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});
export const wcExpenses = mysqlTable("wc_expenses", {
  id: int("id").autoincrement().primaryKey(),
  category: varchar("category", { length: 120 }).notNull(),
  description: varchar("description", { length: 1000 }).notNull(),
  amount: int("amount").notNull(),
  method: mysqlEnum("method", ["cash", "kbzpay", "wavepay"]).notNull(),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});
export const wcPrices = mysqlTable("wc_prices", {
  id: int("id").primaryKey(),
  amount: int("amount"),
  updatedAt: timestamp("updatedAt").notNull().defaultNow().onUpdateNow(),
});
export const wcPriceHistory = mysqlTable("wc_price_history", {
  id: int("id").autoincrement().primaryKey(),
  priceId: int("priceId").notNull(),
  oldAmount: int("oldAmount"),
  newAmount: int("newAmount"),
  actorId: int("actorId").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});
export const wcPermissionRequests = mysqlTable(
  "wc_permission_requests",
  {
    id: int("id").autoincrement().primaryKey(),
    requesterId: int("requesterId").notNull(),
    capability: mysqlEnum("capability", ["manage_prices"]).notNull(),
    reason: varchar("reason", { length: 1000 }).notNull(),
    status: mysqlEnum("status", ["pending", "approved", "rejected"])
      .notNull()
      .default("pending"),
    decisionNote: varchar("decisionNote", { length: 1000 }),
    decidedBy: int("decidedBy"),
    decidedAt: timestamp("decidedAt"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  table => [index("wc_permission_requester_idx").on(table.requesterId)]
);
export const wcCapabilities = mysqlTable(
  "wc_capabilities",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    capability: mysqlEnum("capability", ["manage_prices"]).notNull(),
    grantedBy: int("grantedBy").notNull(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  table => [
    uniqueIndex("wc_capability_user_unique").on(table.userId, table.capability),
  ]
);
export const wcNotices = mysqlTable("wc_notices", {
  id: int("id").autoincrement().primaryKey(),
  titleEn: varchar("titleEn", { length: 200 }).notNull(),
  titleMm: varchar("titleMm", { length: 200 }).notNull(),
  bodyEn: varchar("bodyEn", { length: 2000 }).notNull(),
  bodyMm: varchar("bodyMm", { length: 2000 }).notNull(),
  audience: mysqlEnum("audience", [
    "all",
    "owner",
    "admin",
    "staff",
    "accountant",
    "general_worker",
    "technician",
    "sales",
    "marketing",
    "talent",
    "customer",
  ]).notNull(),
  type: mysqlEnum("type", [
    "announcement",
    "maintenance",
    "notification",
  ]).notNull(),
  targetUserId: int("targetUserId"),
  targetRole: varchar("targetRole", { length: 80 }),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});
export const wcNoticeReads = mysqlTable(
  "wc_notice_reads",
  {
    id: int("id").autoincrement().primaryKey(),
    noticeId: int("noticeId").notNull(),
    userId: int("userId").notNull(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  table => [
    uniqueIndex("wc_notice_read_unique").on(table.noticeId, table.userId),
  ]
);
export const wcSettings = mysqlTable("wc_settings", {
  id: int("id").primaryKey(),
  maintenanceEnabled: boolean("maintenanceEnabled").notNull().default(false),
  messageEn: varchar("messageEn", { length: 1000 }).notNull().default(""),
  messageMm: varchar("messageMm", { length: 1000 }).notNull().default(""),
  startAt: varchar("startAt", { length: 40 }),
  endAt: varchar("endAt", { length: 40 }),
  openingCash: int("openingCash"),
  welcomeTextMm: varchar("welcomeTextMm", { length: 1000 })
    .notNull()
    .default(""),
  contactViber: varchar("contactViber", { length: 120 }),
  contactTelegram: varchar("contactTelegram", { length: 120 }),
  contactPhone: varchar("contactPhone", { length: 80 }),
  contactKbzPay: varchar("contactKbzPay", { length: 120 }),
  contactWavePay: varchar("contactWavePay", { length: 120 }),
  logoReference: varchar("logoReference", { length: 500 }),
  updatedAt: timestamp("updatedAt").notNull().defaultNow().onUpdateNow(),
});
export const wcAudit = mysqlTable("wc_audit", {
  id: int("id").autoincrement().primaryKey(),
  actorId: int("actorId").notNull(),
  actorName: varchar("actorName", { length: 120 }).notNull(),
  action: varchar("action", { length: 80 }).notNull(),
  entityType: varchar("entityType", { length: 80 }).notNull(),
  entityId: varchar("entityId", { length: 80 }).notNull(),
  details: text("details").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

export const wcRoles = mysqlTable("wc_roles", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 80 }).notNull().unique(),
  description: varchar("description", { length: 500 }),
  active: boolean("active").notNull().default(true),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow().onUpdateNow(),
});
export const wcRoleCapabilities = mysqlTable(
  "wc_role_capabilities",
  {
    id: int("id").autoincrement().primaryKey(),
    roleId: int("roleId").notNull(),
    capability: varchar("capability", { length: 100 }).notNull(),
    grantedBy: int("grantedBy").notNull(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  table => [
    uniqueIndex("wc_role_capability_unique").on(table.roleId, table.capability),
  ]
);
export const wcUserCapabilities = mysqlTable(
  "wc_user_capabilities",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    capability: varchar("capability", { length: 100 }).notNull(),
    grantedBy: int("grantedBy").notNull(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  table => [
    uniqueIndex("wc_user_capability_unique").on(table.userId, table.capability),
  ]
);
export const wcProductCategories = mysqlTable("wc_product_categories", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 120 }).notNull().unique(),
  active: boolean("active").notNull().default(true),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});
export const wcProducts = mysqlTable("wc_products", {
  id: int("id").autoincrement().primaryKey(),
  categoryId: int("categoryId"),
  sku: varchar("sku", { length: 80 }).notNull().unique(),
  name: varchar("name", { length: 200 }).notNull(),
  unit: varchar("unit", { length: 40 }).notNull(),
  purchasePrice: int("purchasePrice").notNull().default(0),
  salePrice: int("salePrice").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow().onUpdateNow(),
});
export const wcServiceTypes = mysqlTable("wc_service_types", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 200 }).notNull().unique(),
  price: int("price").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow().onUpdateNow(),
});
export const wcReceiptItems = mysqlTable(
  "wc_receipt_items",
  {
    id: int("id").autoincrement().primaryKey(),
    receiptId: int("receiptId").notNull(),
    productId: int("productId"),
    serviceTypeId: int("serviceTypeId"),
    description: varchar("description", { length: 300 }).notNull(),
    quantity: int("quantity").notNull().default(1),
    unitPrice: int("unitPrice").notNull(),
    lineTotal: int("lineTotal").notNull(),
  },
  table => [index("wc_receipt_items_receipt_idx").on(table.receiptId)]
);
export const wcNotificationReads = mysqlTable(
  "wc_notification_reads",
  {
    id: int("id").autoincrement().primaryKey(),
    notificationId: int("notificationId").notNull(),
    userId: int("userId").notNull(),
    acknowledgedAt: timestamp("acknowledgedAt").notNull().defaultNow(),
  },
  table => [
    uniqueIndex("wc_notification_read_unique").on(
      table.notificationId,
      table.userId
    ),
  ]
);
export const wcChatMessages = mysqlTable(
  "wc_chat_messages",
  {
    id: int("id").autoincrement().primaryKey(),
    senderId: int("senderId").notNull(),
    recipientId: int("recipientId").notNull(),
    body: varchar("body", { length: 2000 }).notNull(),
    attachmentData: text("attachmentData"),
    attachmentMime: varchar("attachmentMime", { length: 80 }),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  table => [
    index("wc_chat_sender_idx").on(table.senderId, table.createdAt),
    index("wc_chat_recipient_idx").on(table.recipientId, table.createdAt),
  ]
);
export type WcChatMessage = typeof wcChatMessages.$inferSelect;
