import { useState } from "react";
import { ArrowLeft, ArrowRight, UserRound } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { compressAvatar } from "@/lib/avatar";
import {
  ErrorMessage,
  Field,
  LanguageSwitch,
  SuccessMessage,
  useLang,
} from "@/lib/ui";

export default function CustomerRegister({
  onBack,
  onSuccess,
}: {
  onBack: () => void;
  onSuccess: () => void;
}) {
  const { t } = useLang();
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [businessEmail, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [avatarData, setAvatarData] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState("");
  const register = trpc.auth.registerCustomer.useMutation({
    onSuccess,
  });
  return (
    <main className="auth-page">
      <div className="auth-top">
        <button className="text-button" onClick={onBack}>
          <ArrowLeft size={15} />{" "}
          {t("Back to sign in", "အကောင့်ဝင်ရန် ပြန်သွားပါ")}
        </button>
        <LanguageSwitch />
      </div>
      <div className="forced-wrap">
        <section className="auth-card customer-register-card">
          <div className="auth-card-mark">
            <UserRound size={19} />
          </div>
          <div className="eyebrow">CUSTOMER ACCESS / ဖောက်သည်ဝင်ရောက်မှု</div>
          <h2>{t("Create customer account", "ဖောက်သည်အကောင့် ဖန်တီးပါ")}</h2>
          <p className="muted">
            {t(
              "Fill in your basic information and start using the customer workspace immediately.",
              "အခြေခံအချက်အလက်များ ဖြည့်ပြီး ဖောက်သည် workspace ကို ချက်ချင်းအသုံးပြုနိုင်ပါသည်။"
            )}
          </p>
          <form
            className="form-stack"
            onSubmit={e => {
              e.preventDefault();
              register.mutate({
                username: username.trim(),
                name: name.trim(),
                password,
                phone: phone.trim(),
                businessEmail: businessEmail.trim() || null,
                address: address.trim() || null,
                avatarData,
              });
            }}
          >
            <div className="form-grid">
              <Field label={t("Full name", "အမည်")}>
                <input
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </Field>
              <Field label={t("Username", "အသုံးပြုသူအမည်")}>
                <input
                  required
                  autoComplete="username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                />
              </Field>
            </div>
            <Field
              label={t("Password", "စကားဝှက်")}
              hint={t("At least 8 characters.", "အနည်းဆုံး စာလုံး ၈ လုံး")}
            >
              <input
                required
                minLength={8}
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </Field>
            <div className="form-grid">
              <Field label={t("Phone", "ဖုန်း")}>
                <input
                  required
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                />
              </Field>
              <Field
                label={t("Email (optional)", "အီးမေးလ် (ရွေးချယ်နိုင်သည်)")}
              >
                <input
                  type="email"
                  value={businessEmail}
                  onChange={e => setEmail(e.target.value)}
                />
              </Field>
            </div>
            <Field label={t("Address (optional)", "လိပ်စာ (ရွေးချယ်နိုင်သည်)")}>
              <input
                value={address}
                onChange={e => setAddress(e.target.value)}
              />
            </Field>
            <Field
              label={t(
                "Profile photo (optional)",
                "Profile ဓာတ်ပုံ (ရွေးချယ်နိုင်သည်)"
              )}
            >
              <label className="photo-upload">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={async e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      setPhotoError("");
                      setAvatarData(await compressAvatar(file));
                    } catch (error) {
                      setPhotoError(
                        error instanceof Error
                          ? error.message
                          : t(
                              "Photo could not be processed.",
                              "ဓာတ်ပုံကို မပြင်ဆင်နိုင်ပါ။"
                            )
                      );
                    }
                  }}
                />
                {avatarData ? (
                  <img src={avatarData} alt="" />
                ) : (
                  <span>
                    <strong>{t("Choose a photo", "ဓာတ်ပုံရွေးပါ")}</strong>
                    <small>
                      {t("PNG, JPG or WEBP", "PNG၊ JPG သို့မဟုတ် WEBP")}
                    </small>
                  </span>
                )}
              </label>
            </Field>
            {photoError && <div className="alert error">{photoError}</div>}
            <ErrorMessage error={register.error} />
            {register.isSuccess && (
              <SuccessMessage>
                {t(
                  "Customer account created. You are signing in now.",
                  "ဖောက်သည်အကောင့် ဖန်တီးပြီးပါပြီ။ ယခုဝင်ရောက်နေပါသည်။"
                )}
              </SuccessMessage>
            )}
            <button
              className="button primary full"
              disabled={
                register.isPending ||
                !name.trim() ||
                !username.trim() ||
                password.length < 8 ||
                !phone.trim()
              }
            >
              {register.isPending
                ? t("Creating…", "ဖန်တီးနေပါသည်…")
                : t("Create customer account", "ဖောက်သည်အကောင့် ဖန်တီးပါ")}{" "}
              <ArrowRight size={16} />
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
