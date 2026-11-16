import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  CheckCircle2,
  UserRound,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { compressAvatar } from "@/lib/avatar";
import {
  ErrorMessage,
  Field,
  LanguageSwitch,
  SuccessMessage,
  UserRole,
  useLang,
} from "@/lib/ui";

type ApprovedRole = Exclude<UserRole, "owner" | "customer">;
const roleName = (
  role: ApprovedRole,
  t: (en: string, mm: string) => string
) => {
  const labels: Record<ApprovedRole, [string, string]> = {
    admin: ["Admin", "စီမံခန့်ခွဲသူ"],
    staff: ["Staff", "ဝန်ထမ်း"],
    accountant: ["Accountant", "စာရင်းကိုင်"],
    general_worker: ["General Worker", "အထွေထွေလုပ်သား"],
    technician: ["Technician", "နည်းပညာကျွမ်းကျင်သူ"],
    sales: ["Sales", "အရောင်း"],
    marketing: ["Marketing", "စျေးကွက်ရှာဖွေရေး"],
    talent: ["Talent", "Talent / ဖန်တီးသူ"],
  };
  return t(...labels[role]);
};

export default function AccessRequest({ onBack }: { onBack: () => void }) {
  const { t } = useLang();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [requestedRole, setRequestedRole] = useState<ApprovedRole>("staff");
  const [phone, setPhone] = useState("");
  const [businessEmail, setBusinessEmail] = useState("");
  const [address, setAddress] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [avatarData, setAvatarData] = useState("");
  const [photoError, setPhotoError] = useState("");
  const request = trpc.auth.requestAccount.useMutation();

  if (request.isSuccess)
    return (
      <main className="auth-page access-request-page">
        <div className="auth-top">
          <div className="brand compact">
            <div className="brand-image">
              <img src="/win-logo.png" alt="Win Computer" />
            </div>
            <div className="brand-text">
              <strong>WIN COMPUTER</strong>
              <span>BUSINESS MANAGEMENT</span>
            </div>
          </div>
          <LanguageSwitch />
        </div>
        <div className="forced-wrap">
          <section className="auth-card request-success-card">
            <div className="auth-card-mark">
              <CheckCircle2 size={20} />
            </div>
            <div className="eyebrow">
              {t("REQUEST RECEIVED", "တောင်းဆိုချက် လက်ခံရရှိပါပြီ")}
            </div>
            <h2>
              {t(
                "Thank you for your request.",
                "တောင်းဆိုချက်အတွက် ကျေးဇူးတင်ပါသည်။"
              )}
            </h2>
            <p className="muted">
              {t(
                "The Owner will review your information and decide whether to activate your account. You cannot sign in until approval is complete.",
                "Owner က သင့်အချက်အလက်များကို စစ်ဆေးပြီး အကောင့်ဖွင့်ခွင့် ဆုံးဖြတ်ပေးပါမည်။ ခွင့်မပြုမချင်း အကောင့်ဝင်၍ မရနိုင်ပါ။"
              )}
            </p>
            <SuccessMessage>
              {t(
                "Your access request is pending Owner approval.",
                "သင့်တောင်းဆိုချက်သည် Owner ခွင့်ပြုချက်ကို စောင့်နေပါသည်။"
              )}
            </SuccessMessage>
            <div className="alert info">
              {t(
                `Requested position: ${roleName(requestedRole, t)}. Please wait respectfully for the Owner's decision.`,
                `တောင်းထားသော ရာထူး — ${roleName(requestedRole, t)}။ Owner ၏ ဆုံးဖြတ်ချက်ကို လေးစားစွာ စောင့်ပေးပါ။`
              )}
            </div>
            <button className="button secondary full" onClick={onBack}>
              <ArrowLeft size={16} />{" "}
              {t("Back to sign in", "အကောင့်ဝင်ရန် ပြန်သွားပါ")}
            </button>
          </section>
        </div>
      </main>
    );

  return (
    <main className="auth-page access-request-page">
      <div className="auth-top">
        <div className="brand compact">
          <div className="brand-image">
            <img src="/win-logo.png" alt="Win Computer" />
          </div>
          <div className="brand-text">
            <strong>WIN COMPUTER</strong>
            <span>BUSINESS MANAGEMENT</span>
          </div>
        </div>
        <LanguageSwitch />
      </div>
      <div className="request-layout">
        <section className="request-intro">
          <div className="auth-kicker">
            <span /> WIN COMPUTER / ACCESS REQUEST
          </div>
          <h1>
            {t(
              "Request access with clarity.",
              "စနစ်တကျ အကောင့်ဝင်ခွင့် တောင်းခံပါ။"
            )}
          </h1>
          <p>
            {t(
              "Tell the Owner who you are, which level of access you need, and how to contact you. Every request is reviewed before an account is activated.",
              "သင်ဘယ်သူလဲ၊ ဘယ်အဆင့် လုပ်ပိုင်ခွင့်လိုသလဲ၊ ဘယ်လိုဆက်သွယ်ရမလဲကို ဖြည့်ပါ။ အကောင့်အသက်ဝင်မီ တောင်းဆိုချက်တိုင်းကို Owner က စစ်ဆေးပါမည်။"
            )}
          </p>
          <div className="request-principles">
            <span>
              <CheckCircle2 size={15} />{" "}
              {t("Owner approval first", "Owner ခွင့်ပြုချက် အရင်လိုသည်")}
            </span>
            <span>
              <CheckCircle2 size={15} />{" "}
              {t(
                "Profile photo for identity review",
                "အထောက်အထားစစ်ဆေးရန် ဓာတ်ပုံ"
              )}
            </span>
            <span>
              <CheckCircle2 size={15} />{" "}
              {t(
                "No active account before approval",
                "ခွင့်မပြုမီ အကောင့်မအသက်ဝင်ပါ"
              )}
            </span>
          </div>
          <button className="text-button request-back" onClick={onBack}>
            <ArrowLeft size={15} />{" "}
            {t("Back to sign in", "အကောင့်ဝင်ရန် ပြန်သွားပါ")}
          </button>
        </section>
        <section className="request-card">
          <div className="request-card-head">
            <div className="auth-card-mark">
              <UserRound size={19} />
            </div>
            <div>
              <div className="eyebrow">
                {t("NEW ACCESS REQUEST", "အကောင့်ဝင်ခွင့်တောင်းခံရန်")}
              </div>
              <h2>{t("Your profile", "သင့်ကိုယ်ရေးအချက်အလက်")}</h2>
            </div>
          </div>
          <div className="form-section-label">
            01 / {t("IDENTITY & ACCESS", "အမည်နှင့် ဝင်ရောက်ခွင့်")}
          </div>
          <form
            className="form-stack"
            onSubmit={e => {
              e.preventDefault();
              if (password !== confirmPassword) return;
              request.mutate({
                name: name.trim(),
                username: username.trim(),
                password,
                requestedRole,
                phone: phone.trim(),
                businessEmail: businessEmail.trim(),
                address: address.trim(),
                dateOfBirth: dateOfBirth || null,
                nationalId: nationalId.trim() || null,
                emergencyContact: emergencyContact.trim() || null,
                jobTitle: jobTitle.trim(),
                avatarData,
              });
            }}
          >
            <div className="form-grid">
              <Field label={t("Full name", "အမည်အပြည့်အစုံ")}>
                <input
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </Field>
              <Field
                label={t("Username", "အသုံးပြုသူအမည်")}
                hint={t(
                  "Letters, numbers, dots, underscores or hyphens.",
                  "အင်္ဂလိပ်စာလုံး၊ ဂဏန်းနှင့် . _ - သုံးနိုင်သည်။"
                )}
              >
                <input
                  required
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  autoComplete="username"
                />
              </Field>
            </div>
            <div className="form-grid">
              <Field label={t("Password", "စကားဝှက်")}>
                <input
                  required
                  minLength={8}
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </Field>
              <Field label={t("Confirm password", "စကားဝှက်အတည်ပြုပါ")}>
                <input
                  required
                  minLength={8}
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </Field>
            </div>
            {confirmPassword && password !== confirmPassword && (
              <div className="alert error">
                {t("Passwords do not match.", "စကားဝှက်များ မတူညီပါ။")}
              </div>
            )}
            <Field
              label={t("Requested access level", "တောင်းခံမည့် အဆင့်")}
              hint={t(
                "Admin access is still subject to Owner review.",
                "Admin အဆင့်ကိုလည်း Owner က စစ်ဆေးခွင့်ပြုပါမည်။"
              )}
            >
              <select
                value={requestedRole}
                onChange={e => setRequestedRole(e.target.value as ApprovedRole)}
              >
                <option value="staff">
                  {roleName("staff", t)} —{" "}
                  {t("daily operations", "နေ့စဉ်လုပ်ငန်း")}
                </option>
                <option value="admin">
                  {roleName("admin", t)} —{" "}
                  {t("administration", "စီမံခန့်ခွဲမှု")}
                </option>
                {(
                  [
                    "accountant",
                    "general_worker",
                    "technician",
                    "sales",
                    "marketing",
                    "talent",
                  ] as const
                ).map(role => (
                  <option key={role} value={role}>
                    {roleName(role, t)}
                  </option>
                ))}
              </select>
            </Field>
            <div className="form-section-label">
              02 / {t("CONTACT & ROLE", "ဆက်သွယ်ရန်နှင့် ရာထူး")}
            </div>
            <div className="form-grid">
              <Field label={t("Phone", "ဖုန်း")}>
                <input
                  required
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                />
              </Field>
              <Field label={t("Business email", "လုပ်ငန်းအီးမေးလ်")}>
                <input
                  required
                  type="email"
                  value={businessEmail}
                  onChange={e => setBusinessEmail(e.target.value)}
                />
              </Field>
            </div>
            <div className="form-grid">
              <Field label={t("Job title / position", "ရာထူး / တာဝန်")}>
                <input
                  required
                  value={jobTitle}
                  onChange={e => setJobTitle(e.target.value)}
                />
              </Field>
              <Field label={t("Date of birth", "မွေးသက္ကရာဇ်")}>
                <input
                  type="date"
                  value={dateOfBirth}
                  onChange={e => setDateOfBirth(e.target.value)}
                />
              </Field>
            </div>
            <Field label={t("Address", "လိပ်စာ")}>
              <input
                required
                value={address}
                onChange={e => setAddress(e.target.value)}
              />
            </Field>
            <div className="form-grid">
              <Field label={t("National ID", "မှတ်ပုံတင်")}>
                <input
                  value={nationalId}
                  onChange={e => setNationalId(e.target.value)}
                />
              </Field>
              <Field label={t("Emergency contact", "အရေးပေါ်ဆက်သွယ်ရန်")}>
                <input
                  value={emergencyContact}
                  onChange={e => setEmergencyContact(e.target.value)}
                />
              </Field>
            </div>
            <div className="form-section-label">
              03 / {t("IDENTITY PHOTO", "အထောက်အထားဓာတ်ပုံ")}
            </div>
            <label className="photo-upload">
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
                required
              />
              {avatarData ? (
                <img src={avatarData} alt="Preview" />
              ) : (
                <span>
                  <Camera size={20} />
                  <strong>
                    {t(
                      "Choose a clear profile photo",
                      "ရှင်းလင်းသော ကိုယ်ရေးဓာတ်ပုံ ရွေးပါ"
                    )}
                  </strong>
                  <small>
                    {t(
                      "The image is compressed securely before submission.",
                      "တင်သွင်းမီ ဓာတ်ပုံကို လုံခြုံစွာ အရွယ်လျှော့မည်။"
                    )}
                  </small>
                </span>
              )}
            </label>
            {photoError && <div className="alert error">{photoError}</div>}
            <ErrorMessage error={request.error} />
            <div className="request-consent">
              {t(
                "By submitting, you understand that this is an access request only. The Owner may approve or reject it after reviewing the information.",
                "တင်သွင်းခြင်းသည် အကောင့်ဝင်ခွင့်တောင်းခံခြင်းသာဖြစ်ကြောင်း နားလည်ပါသည်။ Owner သည် အချက်အလက်များစစ်ပြီး ခွင့်ပြုနိုင်သလို ငြင်းပယ်နိုင်ပါသည်။"
              )}
            </div>
            <div className="alert info">
              {t(
                `${roleName(requestedRole, t)} access is an Owner-approved position. You will receive a respectful notice after submission and cannot sign in until review is complete.`,
                `${roleName(requestedRole, t)} ရာထူးအကောင့်သည် Owner ခွင့်ပြုချက်လိုအပ်ပါသည်။ တင်သွင်းပြီးနောက် အခြေအနေအသိပေးစာ ရရှိမည်ဖြစ်ပြီး စစ်ဆေးပြီးသည်အထိ ဝင်ရောက်၍ မရပါ။`
              )}
            </div>
            <button
              className="button primary full"
              disabled={
                request.isPending || !avatarData || password !== confirmPassword
              }
            >
              {request.isPending
                ? t("Sending request…", "တောင်းဆိုချက် ပို့နေပါသည်…")
                : t("Submit access request", "ဝင်ခွင့်တောင်းခံချက် ပို့ပါ")}
              <ArrowRight size={16} />
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
