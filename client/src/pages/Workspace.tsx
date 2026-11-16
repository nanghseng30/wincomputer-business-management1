import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Bell,
  Boxes,
  BookOpen,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  Menu,
  MessageCircle,
  ReceiptText,
  Settings2,
  ShoppingCart,
  ShieldCheck,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import AccessRequest from "@/components/AccessRequest";
import CustomerRegister from "@/components/CustomerRegister";
import ChatBox from "@/components/ChatBox";
import { compressAvatar } from "@/lib/avatar";
import { getBrowserDevice } from "@/lib/device";
import {
  dateTime,
  ErrorMessage,
  Field,
  LanguageSwitch,
  Loading,
  Modal,
  QueryState,
  User,
  isAdmin,
  isOwner,
  useLang,
} from "@/lib/ui";
import {
  Accounts,
  Expenses,
  Overview,
  POS,
  Prices,
  Receipts,
} from "./Business";
import { Catalog } from "./Catalog";
import { Roles } from "./Roles";
import {
  Audit,
  Maintenance,
  Notices,
  Permissions,
  Team,
} from "./Administration";

type Section =
  | "overview"
  | "receipts"
  | "pos"
  | "accounts"
  | "expenses"
  | "prices"
  | "catalog"
  | "permissions"
  | "notices"
  | "team"
  | "maintenance"
  | "audit"
  | "roles"
  | "chat";
const nav: {
  id: Section;
  en: string;
  mm: string;
  icon: typeof LayoutDashboard;
  group: "work" | "admin";
  restricted?: boolean;
  ownerOnly?: boolean;
  businessOnly?: boolean;
}[] = [
  {
    id: "overview",
    en: "Overview",
    mm: "အနှစ်ချုပ်",
    icon: LayoutDashboard,
    group: "work",
  },
  {
    id: "receipts",
    en: "Receipts",
    mm: "ပြေစာများ",
    icon: ReceiptText,
    group: "work",
  },
  {
    id: "pos",
    en: "POS",
    mm: "အရောင်း POS",
    icon: ShoppingCart,
    group: "work",
    businessOnly: true,
  },
  {
    id: "accounts",
    en: "Accounts",
    mm: "စာရင်းများ",
    icon: ClipboardList,
    group: "work",
    businessOnly: true,
  },
  {
    id: "expenses",
    en: "Expenses & profit",
    mm: "ကုန်ကျစရိတ်နှင့် အရှုံးအမြတ်",
    icon: Wallet,
    group: "work",
  },
  {
    id: "prices",
    en: "Service prices",
    mm: "ဝန်ဆောင်မှုစျေးနှုန်း",
    icon: CircleDollarSign,
    group: "work",
  },
  {
    id: "catalog",
    en: "Catalog",
    mm: "ကတ်တလောက်",
    icon: Boxes,
    group: "work",
  },
  {
    id: "permissions",
    en: "Permissions",
    mm: "လုပ်ပိုင်ခွင့်များ",
    icon: ShieldCheck,
    group: "work",
  },
  {
    id: "notices",
    en: "Notices",
    mm: "အသိပေးချက်များ",
    icon: Bell,
    group: "work",
  },
  {
    id: "chat",
    en: "Chat",
    mm: "စကားပြောရန်",
    icon: MessageCircle,
    group: "work",
  },
  {
    id: "team",
    en: "Team accounts",
    mm: "အဖွဲ့အကောင့်များ",
    icon: Users,
    group: "admin",
    restricted: true,
  },
  {
    id: "maintenance",
    en: "Settings",
    mm: "ဆက်တင်များ",
    icon: Settings2,
    group: "admin",
    restricted: true,
    ownerOnly: true,
  },
  {
    id: "audit",
    en: "Activity log",
    mm: "လုပ်ဆောင်မှုမှတ်တမ်း",
    icon: ClipboardList,
    group: "admin",
    restricted: true,
  },
  {
    id: "roles",
    en: "Roles",
    mm: "အခန်းကဏ္ဍများ",
    icon: ShieldCheck,
    group: "admin",
    restricted: true,
  },
];

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand ${compact ? "compact" : ""}`}>
      <div className="brand-image">
        <img src="/win-logo.png" alt="Win Computer" />
      </div>
      <div className="brand-text">
        <strong>WIN COMPUTER</strong>
        <span>BUSINESS MANAGEMENT</span>
      </div>
    </div>
  );
}

function AuthScreen({
  initialized,
  approvalConfigured,
  onSuccess,
}: {
  initialized: boolean;
  approvalConfigured: boolean;
  onSuccess: () => void;
}) {
  const { t } = useLang();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [approvalPassword, setApprovalPassword] = useState("");
  const [requestOpen, setRequestOpen] = useState(false);
  const [customerOpen, setCustomerOpen] = useState(false);
  const setup = trpc.auth.setup.useMutation({ onSuccess });
  const login = trpc.auth.login.useMutation({ onSuccess });
  const error = initialized ? login.error : setup.error;
  const pending = login.isPending || setup.isPending;
  if (requestOpen)
    return <AccessRequest onBack={() => setRequestOpen(false)} />;
  if (customerOpen)
    return (
      <CustomerRegister
        onBack={() => setCustomerOpen(false)}
        onSuccess={onSuccess}
      />
    );
  return (
    <main className="auth-page">
      <div className="auth-top">
        <Brand compact />
        <LanguageSwitch />
      </div>
      <div className="auth-layout">
        <section className="auth-intro">
          <div className="auth-kicker">
            <span /> WIN COMPUTER / MANAGEMENT SYSTEM
          </div>
          <h1>
            {t(
              "A clearer way to run your day.",
              "နေ့စဉ်လုပ်ငန်းများကို ရှင်းလင်းစွာ စီမံပါ။"
            )}
          </h1>
          <p>
            {t(
              "Your receipts, service prices and team activity, together in one secure workspace.",
              "ပြေစာ၊ ဝန်ဆောင်မှုစျေးနှုန်းနှင့် အဖွဲ့၏လုပ်ဆောင်မှုများကို လုံခြုံသောနေရာတစ်ခုတွင် စီမံပါ။"
            )}
          </p>
          <div className="intro-rule" />
          <div className="intro-foot">
            <span>01 / WORKSPACE</span>
            <span>
              {t("BUILT FOR DAILY OPERATIONS", "နေ့စဉ်လုပ်ငန်းများအတွက်")}
            </span>
          </div>
        </section>
        <section className="auth-card">
          <div className="auth-card-mark">
            <LockKeyhole size={19} />
          </div>
          <div className="eyebrow">
            {initialized
              ? t("SECURE ACCESS", "လုံခြုံစွာ ဝင်ရောက်ရန်")
              : t("FIRST-TIME SETUP", "ကနဦးပြင်ဆင်ခြင်း")}
          </div>
          <h2>
            {initialized
              ? t("Sign in", "အကောင့်ဝင်ပါ")
              : t("Create owner account", "Owner အကောင့်ဖန်တီးပါ")}
          </h2>
          <p className="muted">
            {initialized
              ? t(
                  "Enter your Win Computer account details.",
                  "Win Computer အကောင့်အချက်အလက်များ ထည့်ပါ။"
                )
              : t(
                  "Set up the first owner account. The separate approval password is required.",
                  "ပထမဆုံး Owner အကောင့်ကို ဖန်တီးပါ။ သီးခြားခွင့်ပြုချက် စကားဝှက်လိုအပ်ပါသည်။"
                )}
          </p>
          {!initialized && !approvalConfigured && (
            <div className="alert warning">
              {t(
                "Setup is locked because the approval password is not configured on the server. Ask the owner to configure it securely before continuing.",
                "ဆာဗာတွင် ခွင့်ပြုချက်စကားဝှက် မသတ်မှတ်ရသေးသောကြောင့် setup ပိတ်ထားပါသည်။ ဆက်လက်မလုပ်မီ Owner က လုံခြုံစွာ သတ်မှတ်ပေးပါ။"
              )}
            </div>
          )}
          <form
            className="form-stack"
            onSubmit={e => {
              e.preventDefault();
              if (initialized) login.mutate({ username, password });
              else setup.mutate({ username, password, approvalPassword });
            }}
          >
            <Field label={t("Username", "အသုံးပြုသူအမည်")}>
              <input
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
            </Field>
            <Field
              label={t("Password", "စကားဝှက်")}
              hint={
                !initialized
                  ? t(
                      "At least 8 characters; use a password different from the approval password.",
                      "အနည်းဆုံး စာလုံး ၈ လုံးပါပြီး ခွင့်ပြုချက်စကားဝှက်နှင့် မတူရပါ။"
                    )
                  : undefined
              }
            >
              <input
                type="password"
                minLength={initialized ? undefined : 8}
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete={initialized ? "current-password" : "new-password"}
                required
              />
            </Field>
            {!initialized && approvalConfigured && (
              <Field
                label={t(
                  "Owner approval password",
                  "Owner ခွင့်ပြုချက်စကားဝှက်"
                )}
                hint={t(
                  "This is separate from your login password.",
                  "ဤစကားဝှက်သည် အကောင့်ဝင်စကားဝှက်နှင့် သီးခြားဖြစ်သည်။"
                )}
              >
                <input
                  type="password"
                  value={approvalPassword}
                  onChange={e => setApprovalPassword(e.target.value)}
                  autoComplete="off"
                  required
                />
              </Field>
            )}
            <ErrorMessage error={error} />
            <button
              className="button primary full"
              disabled={pending || (!initialized && !approvalConfigured)}
            >
              {pending
                ? t("Please wait…", "စောင့်ပေးပါ…")
                : initialized
                  ? t("Sign in", "အကောင့်ဝင်ပါ")
                  : t("Create owner account", "Owner အကောင့်ဖန်တီးပါ")}
              <ArrowRight size={16} />
            </button>
          </form>
          <div className="auth-card-footer">
            <ShieldCheck size={15} />
            {t(
              "Authorized access only",
              "ခွင့်ပြုထားသူများသာ ဝင်ရောက်နိုင်သည်"
            )}
          </div>
          {initialized && (
            <>
              <button
                className="text-button request-access-link"
                onClick={() => setRequestOpen(true)}
              >
                {t(
                  "Staff / Admin account? Request owner approval",
                  "ဝန်ထမ်း / Admin အကောင့်လား။ Owner ခွင့်ပြုချက်တောင်းပါ"
                )}
              </button>
              <button
                className="text-button request-access-link customer-link"
                onClick={() => setCustomerOpen(true)}
              >
                {t(
                  "Customer? Create an account now",
                  "ဖောက်သည်လား။ အကောင့်ကို ယခုဖန်တီးပါ"
                )}
              </button>
            </>
          )}
        </section>
      </div>
      <footer className="auth-footer">
        WIN COMPUTER <span>•</span>{" "}
        {t("Business management system", "လုပ်ငန်းစီမံခန့်ခွဲမှုစနစ်")}
      </footer>
    </main>
  );
}

function PasswordChange({
  user,
  onSuccess,
  onLogout,
  loggingOut,
  logoutError,
}: {
  user: User;
  onSuccess: () => void;
  onLogout: () => void;
  loggingOut: boolean;
  logoutError: unknown;
}) {
  const { t } = useLang();
  const [currentPassword, setCurrent] = useState("");
  const [newPassword, setNew] = useState("");
  const [confirm, setConfirm] = useState("");
  const change = trpc.auth.changePassword.useMutation({ onSuccess });
  return (
    <main className="auth-page">
      <div className="auth-top">
        <Brand compact />
        <LanguageSwitch />
      </div>
      <div className="forced-wrap">
        <section className="auth-card">
          <div className="auth-card-mark">
            <LockKeyhole size={19} />
          </div>
          <div className="eyebrow">
            {t("ACCOUNT SECURITY", "အကောင့်လုံခြုံရေး")}
          </div>
          <h2>{t("Change your password", "စကားဝှက်ပြောင်းပါ")}</h2>
          <p className="muted">
            {t(
              `Hello ${user.name}. You must choose a new password before continuing.`,
              `${user.name}၊ ဆက်လက်အသုံးမပြုမီ စကားဝှက်အသစ် ပြောင်းပါ။`
            )}
          </p>
          <form
            className="form-stack"
            onSubmit={e => {
              e.preventDefault();
              if (newPassword === confirm)
                change.mutate({ currentPassword, newPassword });
            }}
          >
            <Field label={t("Current password", "လက်ရှိစကားဝှက်")}>
              <input
                type="password"
                autoComplete="current-password"
                required
                value={currentPassword}
                onChange={e => setCurrent(e.target.value)}
              />
            </Field>
            <Field label={t("New password", "စကားဝှက်အသစ်")}>
              <input
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                value={newPassword}
                onChange={e => setNew(e.target.value)}
              />
            </Field>
            <Field label={t("Confirm new password", "စကားဝှက်အသစ်အတည်ပြုပါ")}>
              <input
                type="password"
                autoComplete="new-password"
                required
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
              />
            </Field>
            {confirm && newPassword !== confirm && (
              <div className="alert error">
                {t("Passwords do not match.", "စကားဝှက်များ မတူညီပါ။")}
              </div>
            )}
            <ErrorMessage error={change.error} />
            <button
              className="button primary full"
              disabled={change.isPending || newPassword !== confirm}
            >
              {t("Update password", "စကားဝှက်ပြောင်းပါ")}
              <ArrowRight size={16} />
            </button>
          </form>
          <button
            className="text-button auth-signout"
            onClick={onLogout}
            disabled={loggingOut}
          >
            {t("Sign out instead", "အကောင့်မှ ထွက်မည်")}
          </button>
          <ErrorMessage error={logoutError} />
        </section>
      </div>
    </main>
  );
}

function Locked() {
  const { t } = useLang();
  return (
    <div className="locked-panel">
      <div className="empty-icon">
        <LockKeyhole size={22} />
      </div>
      <div className="eyebrow">{t("RESTRICTED AREA", "ကန့်သတ်ထားသောနေရာ")}</div>
      <h2>{t("Admin access required", "Admin ဝင်ရောက်ခွင့် လိုအပ်ပါသည်")}</h2>
      <p>
        {t(
          "This area is available to the owner and admins only. Contact an admin if you need help.",
          "ဤနေရာကို Owner နှင့် Admin များသာ အသုံးပြုနိုင်သည်။ အကူအညီလိုပါက Admin ထံ ဆက်သွယ်ပါ။"
        )}
      </p>
    </div>
  );
}

function AccountPassword({ onClose }: { onClose: () => void }) {
  const { t } = useLang();
  const [currentPassword, setCurrent] = useState("");
  const [newPassword, setNew] = useState("");
  const [confirm, setConfirm] = useState("");
  const change = trpc.auth.changePassword.useMutation({ onSuccess: onClose });
  return (
    <Modal title={t("Change password", "စကားဝှက်ပြောင်းရန်")} onClose={onClose}>
      <form
        className="form-stack"
        onSubmit={e => {
          e.preventDefault();
          if (confirm === newPassword)
            change.mutate({ currentPassword, newPassword });
        }}
      >
        <Field label={t("Current password", "လက်ရှိစကားဝှက်")}>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={currentPassword}
            onChange={e => setCurrent(e.target.value)}
          />
        </Field>
        <Field label={t("New password", "စကားဝှက်အသစ်")}>
          <input
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            value={newPassword}
            onChange={e => setNew(e.target.value)}
          />
        </Field>
        <Field label={t("Confirm new password", "စကားဝှက်အသစ်အတည်ပြုပါ")}>
          <input
            type="password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
          />
        </Field>
        {confirm && confirm !== newPassword && (
          <div className="alert error">
            {t("Passwords do not match.", "စကားဝှက်များ မတူညီပါ။")}
          </div>
        )}
        <ErrorMessage error={change.error} />
        <div className="modal-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            {t("Cancel", "မလုပ်တော့ပါ")}
          </button>
          <button
            className="button primary"
            disabled={change.isPending || newPassword !== confirm}
          >
            {t("Update password", "စကားဝှက်ပြောင်းပါ")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
function MaintenanceLocked({
  messageEn,
  messageMm,
  startAt,
  endAt,
  onNotices,
}: {
  messageEn: string;
  messageMm: string;
  startAt: string | null;
  endAt: string | null;
  onNotices: () => void;
}) {
  const { t } = useLang();
  return (
    <div className="locked-panel">
      <div className="empty-icon">
        <Settings2 size={22} />
      </div>
      <div className="eyebrow">
        {t("TEMPORARILY UNAVAILABLE", "ယာယီအသုံးပြု၍မရပါ")}
      </div>
      <h2>{t("Maintenance in progress", "ပြုပြင်ထိန်းသိမ်းနေပါသည်")}</h2>
      <p>
        {t(
          messageEn || "The system is temporarily unavailable for maintenance.",
          messageMm || "ပြုပြင်ထိန်းသိမ်းနေစဉ် စနစ် ယာယီအသုံးပြု၍ မရနိုင်ပါ။"
        )}
      </p>
      {(startAt || endAt) && (
        <p>
          {startAt && (
            <>
              {t("Start", "စတင်ချိန်")}: {dateTime(startAt)}
              <br />
            </>
          )}
          {endAt && (
            <>
              {t("End", "ပြီးဆုံးချိန်")}: {dateTime(endAt)}
            </>
          )}
        </p>
      )}
      <button
        className="button secondary"
        style={{ marginTop: 20 }}
        onClick={onNotices}
      >
        {t("View notices", "အသိပေးချက်များကြည့်ရန်")}
      </button>
    </div>
  );
}

function ProfileForm({
  user,
  required,
  onClose,
  onSaved,
}: {
  user: User;
  required?: boolean;
  onClose?: () => void;
  onSaved: () => void;
}) {
  const { t } = useLang();
  const profile = trpc.profile.get.useQuery();
  const utils = trpc.useUtils();
  const [phone, setPhone] = useState("");
  const [businessEmail, setBusinessEmail] = useState("");
  const [address, setAddress] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [avatarReference, setAvatarReference] = useState("");
  const [avatarData, setAvatarData] = useState("");
  const [photoError, setPhotoError] = useState("");
  const hydrated = profile.data?.updatedAt?.toString();
  if (profile.data && hydrated && phone === "" && businessEmail === "") {
    setPhone(profile.data.phone || "");
    setBusinessEmail(profile.data.businessEmail || "");
    setAddress(profile.data.address || "");
    setDateOfBirth(profile.data.dateOfBirth || "");
    setNationalId(profile.data.nationalId || "");
    setEmergencyContact(profile.data.emergencyContact || "");
    setJobTitle(profile.data.jobTitle || "");
    setDepartment(profile.data.department || "");
    setAvatarReference(profile.data.avatarReference || "");
    setAvatarData(profile.data.avatarData || "");
  }
  const save = trpc.profile.update.useMutation({
    onSuccess: () => {
      void utils.profile.get.invalidate();
      onSaved();
      onClose?.();
    },
  });
  return (
    <Modal
      title={
        required
          ? t(
              "Complete your employee profile",
              "ဝန်ထမ်းကိုယ်ရေးအချက်အလက် ဖြည့်စွက်ပါ"
            )
          : t("Edit profile", "ကိုယ်ရေးအချက်အလက် ပြင်ရန်")
      }
      subtitle={
        required
          ? t(
              "Complete this before entering the workspace.",
              "လုပ်ငန်းနေရာသို့ မဝင်မီ ဖြည့်စွက်ပါ။"
            )
          : t(
              "Business contact details only; never store passwords here.",
              "လုပ်ငန်းဆက်သွယ်ရန် အချက်အလက်များသာ ထည့်ပါ။ စကားဝှက်မသိမ်းပါ။"
            )
      }
      onClose={onClose || (() => undefined)}
    >
      <form
        className="form-stack"
        onSubmit={e => {
          e.preventDefault();
          save.mutate({
            phone: phone || null,
            businessEmail: businessEmail || null,
            address: address || null,
            dateOfBirth: dateOfBirth || null,
            nationalId: nationalId || null,
            emergencyContact: emergencyContact || null,
            jobTitle: jobTitle || null,
            department: department || null,
            avatarReference: avatarReference || null,
            avatarData: avatarData || null,
            profileCompleted: true,
          });
        }}
      >
        <div className="form-grid">
          <Field label={t("Phone", "ဖုန်း")}>
            <input value={phone} onChange={e => setPhone(e.target.value)} />
          </Field>
          <Field label={t("Business email", "လုပ်ငန်းအီးမေးလ်")}>
            <input
              type="email"
              value={businessEmail}
              onChange={e => setBusinessEmail(e.target.value)}
            />
          </Field>
        </div>
        <Field label={t("Address", "လိပ်စာ")}>
          <input value={address} onChange={e => setAddress(e.target.value)} />
        </Field>
        <div className="form-grid">
          <Field
            label={t(
              "Date of birth (optional)",
              "မွေးသက္ကရာဇ် (ရွေးချယ်နိုင်သည်)"
            )}
          >
            <input
              type="date"
              value={dateOfBirth}
              onChange={e => setDateOfBirth(e.target.value)}
            />
          </Field>
          <Field
            label={t(
              "National ID (owner/admin only)",
              "မှတ်ပုံတင် (Owner/Admin သာ)"
            )}
          >
            <input
              value={nationalId}
              onChange={e => setNationalId(e.target.value)}
            />
          </Field>
        </div>
        <Field label={t("Emergency contact", "အရေးပေါ်ဆက်သွယ်ရန်")}>
          <input
            value={emergencyContact}
            onChange={e => setEmergencyContact(e.target.value)}
          />
        </Field>
        <div className="form-grid">
          <Field label={t("Job title / position", "ရာထူး / တာဝန်")}>
            <input
              value={jobTitle}
              onChange={e => setJobTitle(e.target.value)}
              placeholder={t("Configured position", "သတ်မှတ်ထားသော ရာထူး")}
            />
          </Field>
          <Field label={t("Department", "ဌာန")}>
            <input
              value={department}
              onChange={e => setDepartment(e.target.value)}
              placeholder={t(
                "Sales / Technical / Accounts",
                "အရောင်း / နည်းပညာ / စာရင်း"
              )}
            />
          </Field>
        </div>
        <div className="form-grid">
          <Field label={t("Photo reference", "ဓာတ်ပုံရည်ညွှန်းချက်")}>
            <input
              value={avatarReference}
              onChange={e => setAvatarReference(e.target.value)}
              placeholder="/manus-storage/..."
            />
          </Field>
        </div>
        <Field
          label={t("Profile photo upload", "Profile ဓာတ်ပုံတင်ရန်")}
          hint={t(
            "Use a clear square photo; it will be compressed before saving.",
            "ရှင်းလင်းသော ဓာတ်ပုံကို ရွေးပါ။ သိမ်းမီ အရွယ်လျှော့မည်။"
          )}
        >
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={async e => {
              const file = e.target.files?.[0];
              if (!file) return;
              setPhotoError("");
              try {
                setAvatarData(await compressAvatar(file));
              } catch (error) {
                setPhotoError(
                  error instanceof Error
                    ? error.message
                    : "Photo upload failed."
                );
              }
            }}
          />
        </Field>
        {avatarData && (
          <img
            className="profile-photo-preview"
            src={avatarData}
            alt={t("Profile preview", "Profile ဓာတ်ပုံကြိုတင်ကြည့်ရန်")}
          />
        )}
        {photoError && <div className="alert error">{photoError}</div>}
        <ErrorMessage error={save.error || profile.error} />
        <div className="modal-actions">
          {onClose && (
            <button
              type="button"
              className="button secondary"
              onClick={onClose}
            >
              {t("Cancel", "မလုပ်တော့ပါ")}
            </button>
          )}
          <button className="button primary" disabled={save.isPending}>
            {save.isPending
              ? t("Saving…", "သိမ်းနေပါသည်…")
              : t("Save profile", "ကိုယ်ရေးအချက်အလက် သိမ်းပါ")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
function ProfileRequired({
  user,
  onSuccess,
  onLogout,
  loggingOut,
  logoutError,
}: {
  user: User;
  onSuccess: () => void;
  onLogout: () => void;
  loggingOut: boolean;
  logoutError: unknown;
}) {
  const { t } = useLang();
  return (
    <main className="auth-page">
      <div className="auth-top">
        <Brand compact />
        <LanguageSwitch />
      </div>
      <div className="forced-wrap">
        <section className="auth-card">
          <div className="auth-card-mark">
            <Users size={19} />
          </div>
          <div className="eyebrow">
            {t("EMPLOYEE PROFILE", "ဝန်ထမ်းကိုယ်ရေးအချက်အလက်")}
          </div>
          <h2>{t("Complete your profile", "ကိုယ်ရေးအချက်အလက် ဖြည့်စွက်ပါ")}</h2>
          <p className="muted">
            {t(
              "A complete profile helps the owner keep accurate staff records. Passwords and secrets are never stored here.",
              "ဝန်ထမ်းမှတ်တမ်းများ တိကျစေရန် ကိုယ်ရေးအချက်အလက် ဖြည့်စွက်ပါ။ စကားဝှက်နှင့် လျှို့ဝှက်ချက်များ မသိမ်းပါ။"
            )}
          </p>
          <ProfileForm user={user} required onSaved={onSuccess} />
          <button
            className="text-button auth-signout"
            onClick={onLogout}
            disabled={loggingOut}
          >
            {t("Sign out", "အကောင့်ထွက်ရန်")}
          </button>
          <ErrorMessage error={logoutError} />
        </section>
      </div>
    </main>
  );
}

function Shell({
  user,
  onLogout,
  loggingOut,
}: {
  user: User;
  onLogout: () => void;
  loggingOut: boolean;
}) {
  const { t } = useLang();
  const [section, setSection] = useState<Section>("overview");
  const [menuOpen, setMenuOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const profile = trpc.profile.get.useQuery();
  const [profileOpen, setProfileOpen] = useState(false);
  const maintenance = trpc.admin.maintenance.useQuery(undefined, {
    refetchInterval: 30000,
  });
  const current = nav.find(x => x.id === section)!;
  const select = (id: Section) => {
    setSection(id);
    setMenuOpen(false);
    window.scrollTo({ top: 0 });
  };
  const content =
    current.ownerOnly && !isOwner(user) ? (
      <Locked />
    ) : current.restricted && !isAdmin(user) ? (
      <Locked />
    ) : current.businessOnly && user.role === "customer" ? (
      <Locked />
    ) : !isAdmin(user) && maintenance.data?.enabled && section !== "notices" ? (
      <MaintenanceLocked
        {...maintenance.data}
        onNotices={() => select("notices")}
      />
    ) : section === "overview" ? (
      <Overview onNavigate={select} user={user} />
    ) : section === "receipts" ? (
      <Receipts />
    ) : section === "pos" ? (
      <POS />
    ) : section === "accounts" ? (
      <Accounts />
    ) : section === "expenses" ? (
      <Expenses />
    ) : section === "prices" ? (
      <Prices user={user} onNavigate={select} />
    ) : section === "catalog" ? (
      <Catalog user={user} />
    ) : section === "permissions" ? (
      <Permissions user={user} />
    ) : section === "notices" ? (
      <Notices user={user} />
    ) : section === "chat" ? (
      <ChatBox user={user} />
    ) : section === "team" ? (
      <Team user={user} onRoles={() => select("roles")} />
    ) : section === "maintenance" ? (
      <Maintenance />
    ) : section === "roles" ? (
      <Roles user={user} />
    ) : (
      <Audit />
    );
  return (
    <div className="app-shell">
      <div className="mobile-bar">
        <button
          className="icon-button"
          aria-label="Open navigation"
          onClick={() => setMenuOpen(true)}
        >
          <Menu size={21} />
        </button>
        <Brand compact />
        <LanguageSwitch />
      </div>
      {menuOpen && (
        <div className="sidebar-overlay" onClick={() => setMenuOpen(false)} />
      )}
      <aside className={`sidebar ${menuOpen ? "open" : ""}`}>
        <div className="sidebar-brand">
          <Brand />
          <button
            className="icon-button close-menu"
            aria-label="Close navigation"
            onClick={() => setMenuOpen(false)}
          >
            <X size={18} />
          </button>
        </div>
        <div className="sidebar-label">{t("WORKSPACE", "လုပ်ငန်းနေရာ")}</div>
        <nav>
          {nav
            .filter(x => x.group === "work")
            .map(item => (
              <button
                key={item.id}
                className={`nav-item ${section === item.id ? "active" : ""}`}
                onClick={() => select(item.id)}
              >
                <item.icon size={18} />
                <span>{t(item.en, item.mm)}</span>
                {section === item.id && <span className="active-dot" />}
              </button>
            ))}
        </nav>
        <div className="sidebar-label admin-label">
          {t("ADMINISTRATION", "စီမံခန့်ခွဲမှု")}
        </div>
        <nav>
          {nav
            .filter(x => x.group === "admin")
            .map(item => (
              <button
                key={item.id}
                className={`nav-item ${section === item.id ? "active" : ""}`}
                onClick={() => select(item.id)}
              >
                <item.icon size={18} />
                <span>{t(item.en, item.mm)}</span>
                {!isAdmin(user) && (
                  <LockKeyhole size={13} className="nav-lock" />
                )}
              </button>
            ))}
        </nav>
        <div className="sidebar-bottom">
          <button
            className="sidebar-security"
            onClick={() => {
              setPasswordOpen(true);
              setMenuOpen(false);
            }}
          >
            <ShieldCheck size={16} />
            <span>{t("Change password", "စကားဝှက်ပြောင်းရန်")}</span>
          </button>
          <div className="sidebar-user">
            <div className="avatar">
              {user.name?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="user-copy">
              <strong>{user.name}</strong>
              <span>{user.role.toUpperCase()}</span>
            </div>
            <button
              className="icon-button"
              onClick={onLogout}
              disabled={loggingOut}
              title={t("Sign out", "အကောင့်ထွက်ရန်")}
              aria-label={t("Sign out", "အကောင့်ထွက်ရန်")}
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
      <div className="app-main">
        <header className="topbar">
          <div className="breadcrumb">
            <BookOpen size={15} />
            <span>{t("Workspace", "လုပ်ငန်းနေရာ")}</span>
            <ChevronRight size={14} />
            <strong>{t(current.en, current.mm)}</strong>
          </div>
          <div className="topbar-right">
            <span className="secure-indicator">
              <i />
              {t("SIGNED IN", "အကောင့်ဝင်ထားသည်")}
            </span>
            <LanguageSwitch />
            <button
              className="top-profile"
              onClick={() => setProfileOpen(true)}
              title={t("Edit profile", "ကိုယ်ရေးအချက်အလက် ပြင်ရန်")}
            >
              <span className="top-avatar">
                {profile.data?.avatarData || profile.data?.avatarReference ? (
                  <img
                    src={
                      profile.data.avatarData ||
                      profile.data.avatarReference ||
                      ""
                    }
                    alt=""
                  />
                ) : (
                  user.name?.charAt(0).toUpperCase() || "U"
                )}
              </span>
              <span>
                <strong>{user.name}</strong>
                <small>
                  {user.role === "owner"
                    ? t(
                        "Win Computer လုပ်ငန်းရှင်၏အကောင့်",
                        "Win Computer လုပ်ငန်းရှင်၏အကောင့်"
                      )
                    : profile.data?.jobTitle || user.role.toUpperCase()}
                </small>
              </span>
            </button>
          </div>
        </header>
        <main className="content">
          {content}
          <footer className="workspace-footer">
            <span>
              WIN COMPUTER /{" "}
              {t("BUSINESS MANAGEMENT", "လုပ်ငန်းစီမံခန့်ခွဲမှု")}
            </span>
            <span>
              {t(
                "A more considered way to work.",
                "လုပ်ငန်းများကို စနစ်တကျ စီမံပါ။"
              )}
            </span>
          </footer>
        </main>
      </div>
      {passwordOpen && (
        <AccountPassword onClose={() => setPasswordOpen(false)} />
      )}
      {profileOpen && (
        <ProfileForm
          user={user}
          onClose={() => setProfileOpen(false)}
          onSaved={() => void profile.refetch()}
        />
      )}
    </div>
  );
}

export default function Workspace() {
  const { t } = useLang();
  const queryClient = useQueryClient();
  const status = trpc.auth.status.useQuery(undefined, { retry: false });
  const heartbeat = trpc.auth.heartbeat.useMutation();
  const lastActivityAt = useRef(Date.now());
  const idleLogout = 30 * 60 * 1000;
  useEffect(() => {
    if (!status.data?.user) return;
    lastActivityAt.current = Date.now();
    const markActivity = () => {
      lastActivityAt.current = Date.now();
    };
    const events = ["pointerdown", "keydown", "touchstart", "scroll"] as const;
    events.forEach(event =>
      window.addEventListener(event, markActivity, { passive: true })
    );
    return () =>
      events.forEach(event => window.removeEventListener(event, markActivity));
  }, [status.data?.user?.id]);
  useEffect(() => {
    if (!status.data?.user) return;
    const sendHeartbeat = () => {
      if (Date.now() - lastActivityAt.current >= idleLogout) return;
      const device = getBrowserDevice();
      heartbeat.mutate({ deviceType: device.type, deviceLabel: device.label });
    };
    sendHeartbeat();
    const timer = window.setInterval(sendHeartbeat, 30000);
    return () => window.clearInterval(timer);
  }, [status.data?.user?.id, idleLogout]);
  const logout = trpc.auth.logout.useMutation({
    onSuccess: () => {
      queryClient.clear();
      void status.refetch();
    },
  });
  useEffect(() => {
    if (!status.data?.user) return;
    const timer = window.setInterval(() => {
      if (
        Date.now() - lastActivityAt.current >= idleLogout &&
        !logout.isPending
      )
        logout.mutate();
    }, 1000);
    return () => window.clearInterval(timer);
  }, [status.data?.user?.id, idleLogout]);
  const profile = trpc.profile.get.useQuery(undefined, {
    enabled: Boolean(status.data?.user && !status.data.user.mustChangePassword),
    retry: false,
  });
  const announcedUser = useRef<number | null>(null);
  useEffect(() => {
    const user = status.data?.user;
    if (!user || user.mustChangePassword || announcedUser.current === user.id)
      return;
    announcedUser.current = user.id;
    const speak = () => {
      if (!("speechSynthesis" in window)) return;
      const role = profile.data?.jobTitle || user.role.replaceAll("_", " ");
      const department = profile.data?.department;
      const text = department
        ? `${user.name}. ${department} department. ${role}.`
        : `${user.name}. ${role}.`;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      utterance.rate = 0.92;
      window.speechSynthesis.speak(utterance);
    };
    const timer = window.setTimeout(speak, 250);
    return () => window.clearTimeout(timer);
  }, [
    status.data?.user?.id,
    status.data?.user?.mustChangePassword,
    profile.data?.department,
    profile.data?.jobTitle,
  ]);
  if (status.isLoading)
    return (
      <div className="boot">
        <Brand />
        <Loading />
      </div>
    );
  if (status.error || !status.data)
    return (
      <div className="boot">
        <Brand />
        <QueryState
          loading={false}
          error={
            status.error ||
            new Error(
              t("Unable to load account status.", "အကောင့်အခြေအနေ မရယူနိုင်ပါ။")
            )
          }
          retry={() => void status.refetch()}
        >
          <span />
        </QueryState>
      </div>
    );
  const user = status.data.user;
  const refresh = () => {
    void status.refetch();
  };
  if (!user)
    return (
      <AuthScreen
        initialized={status.data.initialized}
        approvalConfigured={status.data.approvalConfigured}
        onSuccess={refresh}
      />
    );
  if (user.mustChangePassword)
    return (
      <PasswordChange
        user={user}
        onSuccess={refresh}
        onLogout={() => logout.mutate()}
        loggingOut={logout.isPending}
        logoutError={logout.error}
      />
    );
  if (profile.isLoading)
    return (
      <div className="boot">
        <Brand />
        <Loading />
      </div>
    );
  if (profile.data && !profile.data.profileCompleted && user.role !== "owner")
    return (
      <ProfileRequired
        user={user}
        onSuccess={refresh}
        onLogout={() => logout.mutate()}
        loggingOut={logout.isPending}
        logoutError={logout.error}
      />
    );
  return (
    <>
      <Shell
        user={user}
        onLogout={() => logout.mutate()}
        loggingOut={logout.isPending}
      />
      {logout.error && (
        <div className="toast-error">
          <ErrorMessage error={logout.error} />
        </div>
      )}
    </>
  );
}
