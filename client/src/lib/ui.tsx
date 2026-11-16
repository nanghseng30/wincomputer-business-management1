import React, { createContext, useContext, useEffect, useState } from "react";
import { AlertCircle, Check, LoaderCircle, X } from "lucide-react";

export type Language = "en" | "mm";
type LanguageContextType = {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (en: string, mm: string) => string;
};
const LanguageContext = createContext<LanguageContextType>({
  lang: "en",
  setLang: () => {},
  t: en => en,
});
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLanguage] = useState<Language>(() =>
    localStorage.getItem("win-language") === "en" ? "en" : "mm"
  );
  const setLang = (value: Language) => {
    setLanguage(value);
    localStorage.setItem("win-language", value);
  };
  useEffect(() => {
    document.documentElement.lang = lang === "mm" ? "my" : "en";
  }, [lang]);
  return (
    <LanguageContext.Provider
      value={{ lang, setLang, t: (en, mm) => (lang === "mm" ? mm : en) }}
    >
      {children}
    </LanguageContext.Provider>
  );
}
export const useLang = () => useContext(LanguageContext);
export function LanguageSwitch() {
  const { lang, setLang } = useLang();
  return (
    <div className="lang-switch" aria-label="Language">
      <button
        className={lang === "en" ? "active" : ""}
        onClick={() => setLang("en")}
      >
        EN
      </button>
      <button
        className={lang === "mm" ? "active" : ""}
        onClick={() => setLang("mm")}
      >
        မြန်မာ
      </button>
    </div>
  );
}
export function money(value: number | null | undefined) {
  return value == null
    ? "—"
    : `${new Intl.NumberFormat("en-US").format(value)} MMK`;
}
export function dateTime(value: string | Date | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.valueOf())
    ? String(value)
    : new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(d);
}
export function exportCsv(
  filename: string,
  rows: Array<Array<string | number | null | undefined>>
) {
  const csv = rows
    .map(row =>
      row.map(value => `"${String(value ?? "").replace(/"/g, '""')}"`).join(",")
    )
    .join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportExcelHtml(
  filename: string,
  title: string,
  headers: string[],
  rows: Array<Array<string | number>>,
  summary: Array<[string, string]>
) {
  const esc = (value: string | number) =>
    String(value).replace(
      /[&<>]/g,
      char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[char] || char
    );
  const body = rows
    .map(
      row => `<tr>${row.map(value => `<td>${esc(value)}</td>`).join("")}</tr>`
    )
    .join("");
  const summaryRows = summary
    .map(
      ([label, formula]) =>
        `<tr><th>${esc(label)}</th><td x:f="${esc(formula.replace(/^=/, ""))}">${esc(formula)}</td></tr>`
    )
    .join("");
  const html = `<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8" /></head><body><h1>${esc(title)}</h1><table border="1"><thead><tr>${headers.map(header => `<th>${esc(header)}</th>`).join("")}</tr></thead><tbody>${body}</tbody></table><br/><table border="1"><tbody>${summaryRows}</tbody></table></body></html>`;
  const blob = new Blob([html], { type: "application/vnd.ms-excel" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".xls") ? filename : `${filename}.xls`;
  link.click();
  URL.revokeObjectURL(url);
}
export function errorText(error: unknown) {
  return error instanceof Error
    ? error.message
    : String(error || "An unexpected error occurred.");
}
export function ErrorMessage({ error }: { error: unknown }) {
  const { lang } = useLang();
  if (!error) return null;
  let message = errorText(error);
  try {
    const issues = JSON.parse(message);
    if (Array.isArray(issues))
      message =
        issues
          .map(issue => issue.message)
          .filter(Boolean)
          .join(" ") || message;
  } catch {
    /* Ordinary server message, not a validation issue list. */
  }
  const translations: Record<string, string> = {
    "Incorrect username or password.":
      "အသုံးပြုသူအမည် သို့မဟုတ် စကားဝှက် မမှန်ပါ။",
    "Current password is incorrect.": "လက်ရှိစကားဝှက် မမှန်ပါ။",
    "Approval password is incorrect.": "ခွင့်ပြုချက်စကားဝှက် မမှန်ပါ။",
    "Owner approval password is not configured.":
      "Owner ခွင့်ပြုချက်စကားဝှက် မသတ်မှတ်ရသေးပါ။",
    "Password must have at least 8 characters.":
      "စကားဝှက်တွင် အနည်းဆုံး စာလုံး ၈ လုံး ပါရမည်။",
    "Username is already in use.": "ဤအသုံးပြုသူအမည်ကို အသုံးပြုပြီးဖြစ်ပါသည်။",
    "A service with this name already exists.":
      "ဤဝန်ဆောင်မှုအမည်ကို အသုံးပြုပြီးဖြစ်ပါသည်။",
    "The system is temporarily unavailable for maintenance.":
      "ပြုပြင်ထိန်းသိမ်းနေစဉ် စနစ် ယာယီအသုံးပြု၍ မရနိုင်ပါ။",
    "Please log in.": "အကောင့်ပြန်ဝင်ပါ။",
    "An internal error occurred.": "စနစ်အတွင်း အမှားတစ်ခု ဖြစ်ပေါ်ခဲ့ပါသည်။",
  };
  return (
    <div className="alert error" role="alert">
      <AlertCircle size={17} />
      <span>{lang === "mm" ? translations[message] || message : message}</span>
    </div>
  );
}
export function SuccessMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="alert success" role="status">
      <Check size={17} />
      <span>{children}</span>
    </div>
  );
}
export function Loading({ label }: { label?: string }) {
  const { t } = useLang();
  return (
    <div className="loading">
      <LoaderCircle className="spin" size={18} />
      {label || t("Loading…", "ဖွင့်နေပါသည်…")}
    </div>
  );
}
export function Empty({
  title,
  text,
  icon: Icon,
}: {
  title: string;
  text: string;
  icon?: React.ElementType;
}) {
  return (
    <div className="empty">
      {Icon && (
        <div className="empty-icon">
          <Icon size={21} />
        </div>
      )}
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  );
}
export function QueryState({
  loading,
  error,
  children,
  retry,
}: {
  loading: boolean;
  error: unknown;
  children: React.ReactNode;
  retry?: () => void;
}) {
  const { t } = useLang();
  if (loading) return <Loading />;
  if (error)
    return (
      <div className="query-error">
        <ErrorMessage error={error} />
        {retry && (
          <button className="button secondary small" onClick={retry}>
            {t("Try again", "ထပ်ကြိုးစားပါ")}
          </button>
        )}
      </div>
    );
  return <>{children}</>;
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function Modal({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="modal-head">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close">
            <X size={19} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
export function PageHead({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-head">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action && <div className="page-action">{action}</div>}
    </div>
  );
}
export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "green" | "gold" | "red" | "blue";
}) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
export type Receipt = {
  id: number;
  number: string;
  type: "sale" | "service";
  description: string;
  amount: number;
  method: "cash" | "kbzpay" | "wavepay";
  paymentReceived: boolean;
  status: "active" | "void" | "refunded";
  customer: string | null;
  createdAt: Date | string;
  createdByName: string;
};
export type UserRole =
  | "owner"
  | "admin"
  | "staff"
  | "accountant"
  | "general_worker"
  | "technician"
  | "sales"
  | "marketing"
  | "talent"
  | "customer";
export type User = {
  id: number;
  username: string;
  name: string;
  role: UserRole;
  mustChangePassword: boolean;
  customRoleId?: number | null;
  jobTitle?: string | null;
  avatarReference?: string | null;
};
export const isAdmin = (user: User) =>
  user.role === "owner" || user.role === "admin";
export const isOwner = (user: User) => user.role === "owner";
export const isCustomer = (user: User) => user.role === "customer";
