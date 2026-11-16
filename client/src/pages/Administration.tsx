import { useEffect, useState } from "react";
import {
  Bell,
  ClipboardList,
  LockKeyhole,
  Plus,
  Send,
  ShieldCheck,
  Users,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import {
  AccountRequestsPanel,
  PresencePanel,
} from "@/components/TeamMonitoring";
import {
  Badge,
  dateTime,
  Empty,
  ErrorMessage,
  Field,
  isAdmin,
  isOwner,
  Modal,
  PageHead,
  QueryState,
  SuccessMessage,
  User,
  UserRole,
  exportCsv,
  useLang,
} from "@/lib/ui";

type StaffRole = Exclude<UserRole, "owner" | "customer">;

function TeamCreate({ onClose }: { onClose: () => void }) {
  const { t } = useLang();
  const utils = trpc.useUtils();
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<StaffRole>("staff");
  const create = trpc.team.create.useMutation({
    onSuccess: () => {
      void utils.team.list.invalidate();
      onClose();
    },
  });
  return (
    <Modal
      title={t("Create account", "အကောင့်ဖန်တီးပါ")}
      subtitle={t(
        "The new user must change their password at first sign-in.",
        "အသုံးပြုသူသည် ပထမဆုံးဝင်ချိန်တွင် စကားဝှက်ပြောင်းရမည်။"
      )}
      onClose={onClose}
    >
      <form
        className="form-stack"
        onSubmit={e => {
          e.preventDefault();
          create.mutate({
            username: username.trim(),
            name: name.trim(),
            password,
            role,
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
              autoComplete="off"
              value={username}
              onChange={e => setUsername(e.target.value)}
            />
          </Field>
        </div>
        <Field label={t("Temporary password", "ယာယီစကားဝှက်")}>
          <input
            type="password"
            minLength={8}
            required
            autoComplete="new-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
        </Field>
        <Field label={t("Role", "အခန်းကဏ္ဍ")}>
          <select
            value={role}
            onChange={e => setRole(e.target.value as typeof role)}
          >
            {(
              [
                "staff",
                "admin",
                "accountant",
                "general_worker",
                "technician",
                "sales",
                "marketing",
                "talent",
              ] as const
            ).map(item => (
              <option key={item} value={item}>
                {item.replace("_", " ").toUpperCase()}
              </option>
            ))}
          </select>
        </Field>
        <ErrorMessage error={create.error} />
        <div className="modal-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            {t("Cancel", "မလုပ်တော့ပါ")}
          </button>
          <button
            className="button primary"
            disabled={create.isPending || !username.trim() || !name.trim()}
          >
            {t("Create account", "အကောင့်ဖန်တီးပါ")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
function ResetPassword({
  person,
  onClose,
}: {
  person: { id: number; name: string };
  onClose: () => void;
}) {
  const { t } = useLang();
  const utils = trpc.useUtils();
  const [password, setPassword] = useState("");
  const reset = trpc.team.reset.useMutation({
    onSuccess: () => {
      void utils.team.list.invalidate();
      onClose();
    },
  });
  return (
    <Modal
      title={t("Reset password", "စကားဝှက်ပြန်သတ်မှတ်ရန်")}
      subtitle={person.name}
      onClose={onClose}
    >
      <div className="alert warning">
        {t(
          "Existing sessions will be revoked. The user must change this password at their next sign-in.",
          "လက်ရှိ session များကို ရပ်ဆိုင်းမည်။ နောက်တစ်ကြိမ်ဝင်ချိန်တွင် ဤစကားဝှက်ကို ပြောင်းရမည်။"
        )}
      </div>
      <form
        className="form-stack"
        onSubmit={e => {
          e.preventDefault();
          reset.mutate({ id: person.id, password });
        }}
      >
        <Field label={t("New temporary password", "ယာယီစကားဝှက်အသစ်")}>
          <input
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
        </Field>
        <ErrorMessage error={reset.error} />
        <div className="modal-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            {t("Cancel", "မလုပ်တော့ပါ")}
          </button>
          <button className="button primary" disabled={reset.isPending}>
            {t("Reset password", "စကားဝှက်ပြန်သတ်မှတ်ပါ")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
function TeamEdit({
  person,
  onClose,
}: {
  person: { id: number; name: string; role: Exclude<UserRole, "owner"> };
  onClose: () => void;
}) {
  const { t } = useLang();
  const utils = trpc.useUtils();
  const [name, setName] = useState(person.name);
  const [role, setRole] = useState(person.role);
  const update = trpc.team.update.useMutation({
    onSuccess: () => {
      void utils.team.list.invalidate();
      void utils.notices.list.invalidate();
      onClose();
    },
  });
  return (
    <Modal
      title={t("Edit employee account", "ဝန်ထမ်းအကောင့် ပြင်ရန်")}
      subtitle={person.name}
      onClose={onClose}
    >
      <form
        className="form-stack"
        onSubmit={e => {
          e.preventDefault();
          update.mutate({ id: person.id, name: name.trim(), role });
        }}
      >
        <Field label={t("Name", "အမည်")}>
          <input
            required
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </Field>
        <Field label={t("Base role", "အခြေခံအခန်းကဏ္ဍ")}>
          <select
            value={role}
            onChange={e => setRole(e.target.value as typeof role)}
          >
            {(
              [
                "staff",
                "admin",
                "accountant",
                "general_worker",
                "technician",
                "sales",
                "marketing",
                "talent",
                "customer",
              ] as const
            ).map(item => (
              <option key={item} value={item}>
                {item.replace("_", " ").toUpperCase()}
              </option>
            ))}
          </select>
        </Field>
        <div className="alert warning">
          {t(
            "Changing Admin authority is owner-only and is recorded in the audit log.",
            "Admin လုပ်ပိုင်ခွင့် ပြောင်းလဲခြင်းကို Owner သာ ပြုလုပ်နိုင်ပြီး မှတ်တမ်းတင်မည်။"
          )}
        </div>
        <ErrorMessage error={update.error} />
        <div className="modal-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            {t("Cancel", "မလုပ်တော့ပါ")}
          </button>
          <button className="button primary" disabled={update.isPending}>
            {t("Save changes", "ပြောင်းလဲမှုများ သိမ်းပါ")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
export function Team({ user, onRoles }: { user: User; onRoles?: () => void }) {
  const { t } = useLang();
  const ownerOnly = isOwner(user);
  const adminAccess = isAdmin(user);
  const team = trpc.team.list.useQuery();
  const archive = trpc.lifecycle.archive.useQuery();
  const [create, setCreate] = useState(false);
  const [reset, setReset] = useState<{ id: number; name: string } | null>(null);
  const [edit, setEdit] = useState<{
    id: number;
    name: string;
    role: Exclude<UserRole, "owner">;
  } | null>(null);
  const utils = trpc.useUtils();
  const deactivate = trpc.lifecycle.deactivate.useMutation({
    onSuccess: () => {
      void team.refetch();
      void archive.refetch();
      void utils.notices.list.invalidate();
    },
  });
  const restore = trpc.lifecycle.restore.useMutation({
    onSuccess: () => {
      void team.refetch();
      void archive.refetch();
      void utils.notices.list.invalidate();
    },
  });
  const remove = trpc.lifecycle.delete.useMutation({
    onSuccess: () => {
      void team.refetch();
      void archive.refetch();
      void utils.notices.list.invalidate();
    },
  });
  return (
    <>
      <PageHead
        eyebrow={t("ADMINISTRATION / ACCESS", "စီမံခန့်ခွဲမှု / အကောင့်များ")}
        title={t("Team accounts", "အဖွဲ့အကောင့်များ")}
        description={t(
          "Manage who can access this workspace.",
          "ဤလုပ်ငန်းနေရာကို အသုံးပြုနိုင်သူများကို စီမံပါ။"
        )}
        action={
          ownerOnly && (
            <button className="button primary" onClick={() => setCreate(true)}>
              <Plus size={17} />
              {t("Create account", "အကောင့်ဖန်တီးပါ")}
            </button>
          )
        }
      />
      {!adminAccess && (
        <div className="permission-banner">
          <div>
            <strong>
              {t(
                "Admin / Owner account management",
                "Admin / Owner က အကောင့်များကို စီမံနိုင်သည်"
              )}
            </strong>
            <p>
              {t(
                "Only the Owner can create, edit or reset accounts. Admin and Owner can change non-owner account status.",
                "အကောင့်ဖန်တီးခြင်း၊ ပြင်ခြင်းနှင့် စကားဝှက်ပြန်သတ်မှတ်ခြင်းကို Owner သာ ပြုလုပ်နိုင်ပြီး Admin နှင့် Owner က non-owner အကောင့်အခြေအနေကို ပြောင်းနိုင်သည်။"
              )}
            </p>
          </div>
          <LockKeyhole size={18} />
        </div>
      )}
      <div className="monitoring-grid">
        {ownerOnly && <AccountRequestsPanel />}
        <PresencePanel />
      </div>
      <section className="panel table-panel">
        <div className="panel-head">
          <div>
            <div className="eyebrow">
              {t("ACCOUNT DIRECTORY", "အကောင့်စာရင်း")}
            </div>
            <h2>{t("People", "အသုံးပြုသူများ")}</h2>
          </div>
          {team.data && (
            <div className="panel-actions">
              <span className="count-label">
                {team.data.length} {t("people", "ဦး")}
              </span>
              <button
                className="button secondary small"
                onClick={() =>
                  exportCsv("win-computer-team.csv", [
                    ["Name", "Username", "Role", "Active"],
                    ...team.data!.map(p => [
                      p.name,
                      p.username,
                      p.role,
                      p.active ? "Yes" : "No",
                    ]),
                  ])
                }
              >
                {t("Export Excel", "Excel ထုတ်ရန်")}
              </button>
            </div>
          )}
        </div>
        <QueryState
          loading={team.isLoading}
          error={team.error}
          retry={() => void team.refetch()}
        >
          {team.data?.length === 0 ? (
            <Empty
              icon={Users}
              title={t("No accounts found", "အကောင့်မရှိပါ")}
              text={t(
                "Accounts created by an admin will appear here.",
                "Admin ဖန်တီးထားသော အကောင့်များကို ဤနေရာတွင် ပြသမည်။"
              )}
            />
          ) : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>{t("PROFILE", "ကိုယ်ရေးအချက်အလက်")}</th>
                    <th>{t("USERNAME", "အသုံးပြုသူအမည်")}</th>
                    <th>{t("ROLE", "အခန်းကဏ္ဍ")}</th>
                    <th>{t("STATUS", "အခြေအနေ")}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {team.data?.map(person => (
                    <tr key={person.id}>
                      <td>
                        <div className="directory-person">
                          <span className="directory-avatar">
                            {person.avatarData || person.avatarReference ? (
                              <img
                                src={
                                  person.avatarData ||
                                  person.avatarReference ||
                                  ""
                                }
                                alt=""
                              />
                            ) : (
                              person.name.charAt(0).toUpperCase()
                            )}
                          </span>
                          <span>
                            <strong>{person.name}</strong>
                            <small>
                              {person.department ||
                                t("Department not set", "ဌာန မသတ်မှတ်ရသေး")}
                            </small>
                          </span>
                        </div>
                      </td>
                      <td>{person.username}</td>
                      <td>
                        <Badge
                          tone={person.role === "staff" ? "neutral" : "gold"}
                        >
                          {person.role.toUpperCase()}
                        </Badge>
                        <small>
                          {person.jobTitle ||
                            t("Position not set", "ရာထူး မသတ်မှတ်ရသေး")}
                        </small>
                      </td>
                      <td>
                        <Badge tone={person.active ? "green" : "neutral"}>
                          {person.active
                            ? t("Active", "အသက်ဝင်")
                            : t("Inactive", "မလှုပ်ရှား")}
                        </Badge>
                        {person.mustChangePassword && (
                          <small>
                            {t(
                              "Password change required",
                              "စကားဝှက်ပြောင်းရန်လိုသည်"
                            )}
                          </small>
                        )}
                      </td>
                      <td>
                        {adminAccess &&
                          person.role !== "owner" &&
                          person.id !== user.id && (
                            <div className="row-actions">
                              {ownerOnly && (
                                <>
                                  <button
                                    className="button secondary small"
                                    onClick={() => setReset(person)}
                                  >
                                    {t(
                                      "Reset password",
                                      "စကားဝှက်ပြန်သတ်မှတ်ရန်"
                                    )}
                                  </button>
                                  <button
                                    className="button secondary small"
                                    onClick={() =>
                                      setEdit({
                                        id: person.id,
                                        name: person.name,
                                        role: person.role as Exclude<
                                          UserRole,
                                          "owner"
                                        >,
                                      })
                                    }
                                  >
                                    {t("Edit", "ပြင်ရန်")}
                                  </button>
                                </>
                              )}
                              {person.active ? (
                                <button
                                  className="button secondary small"
                                  onClick={() =>
                                    window.confirm(
                                      t(
                                        "Deactivate this account? The user will be signed out.",
                                        "ဤအကောင့်ကို ပိတ်မည်လား။ အသုံးပြုသူကို အကောင့်မှ ထွက်စေမည်။"
                                      )
                                    ) &&
                                    (() => {
                                      const reason = window.prompt(
                                        t(
                                          "Enter the deactivation reason",
                                          "ပိတ်ရသည့်အကြောင်းပြချက် ရေးပါ"
                                        )
                                      );
                                      if (reason?.trim())
                                        deactivate.mutate({
                                          id: person.id,
                                          reason: reason.trim(),
                                        });
                                    })()
                                  }
                                >
                                  {t("Deactivate", "ပိတ်ရန်")}
                                </button>
                              ) : (
                                <button
                                  className="button secondary small"
                                  onClick={() =>
                                    restore.mutate({ id: person.id })
                                  }
                                >
                                  {t("Restore", "ပြန်ဖွင့်ရန်")}
                                </button>
                              )}
                              <button
                                className="button danger small"
                                onClick={() =>
                                  window.confirm(
                                    t(
                                      "Soft-delete this account? Historical attribution remains preserved.",
                                      "ဤအကောင့်ကို ပျော့ဖျက်မည်လား။ သမိုင်းမှတ်တမ်းတွင် အမည်ညွှန်းချက် ဆက်လက်ရှိမည်။"
                                    )
                                  ) &&
                                  (() => {
                                    const reason = window.prompt(
                                      t(
                                        "Enter the deletion reason",
                                        "ဖျက်ရသည့်အကြောင်းပြချက် ရေးပါ"
                                      )
                                    );
                                    if (reason?.trim())
                                      remove.mutate({
                                        id: person.id,
                                        reason: reason.trim(),
                                      });
                                  })()
                                }
                              >
                                {t("Delete", "ဖျက်ရန်")}
                              </button>
                              {onRoles && ownerOnly && (
                                <button
                                  className="button secondary small"
                                  onClick={onRoles}
                                >
                                  {t("Assign role", "အခန်းကဏ္ဍသတ်မှတ်ရန်")}
                                </button>
                              )}
                            </div>
                          )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </QueryState>
      </section>
      <section className="panel table-panel archive-panel">
        <div className="panel-head">
          <div>
            <div className="eyebrow">
              {t("ACCOUNT ARCHIVE", "အကောင့်မှတ်တမ်းဟောင်း")}
            </div>
            <h2>
              {t(
                "Deactivated and removed accounts",
                "ပိတ်ထား/ဖြုတ်ထားသော အကောင့်များ"
              )}
            </h2>
          </div>
          <span className="count-label">{archive.data?.length ?? 0}</span>
        </div>
        <QueryState
          loading={archive.isLoading}
          error={archive.error}
          retry={() => void archive.refetch()}
        >
          {archive.data?.length ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>{t("PERSON", "ပုဂ္ဂိုလ်")}</th>
                    <th>{t("STATUS / TIME", "အခြေအနေ / အချိန်")}</th>
                    <th>{t("REASON", "အကြောင်းပြချက်")}</th>
                  </tr>
                </thead>
                <tbody>
                  {archive.data.map(item => (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.name}</strong>
                        <small>
                          {item.username} · {item.role}
                        </small>
                      </td>
                      <td>
                        <Badge tone={item.deletedAt ? "red" : "neutral"}>
                          {item.deletedAt
                            ? t("Removed", "ဖြုတ်ထား")
                            : t("Deactivated", "ပိတ်ထား")}
                        </Badge>
                        <small>{dateTime(item.lifecycleAt)}</small>
                      </td>
                      <td className="audit-detail">
                        {item.lifecycleReason || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty
              icon={Users}
              title={t("Archive is empty", "မှတ်တမ်းဟောင်း မရှိသေးပါ")}
              text={t(
                "Lifecycle history will appear here.",
                "အကောင့်ပိတ်/ဖြုတ်မှတ်တမ်းများ ဤနေရာတွင် ပေါ်လာမည်။"
              )}
            />
          )}
        </QueryState>
      </section>
      {create && <TeamCreate onClose={() => setCreate(false)} />}
      {reset && <ResetPassword person={reset} onClose={() => setReset(null)} />}
      {edit && <TeamEdit person={edit} onClose={() => setEdit(null)} />}
    </>
  );
}

function PermissionRequest({ onClose }: { onClose: () => void }) {
  const { t } = useLang();
  const utils = trpc.useUtils();
  const [reason, setReason] = useState("");
  const request = trpc.permissions.request.useMutation({
    onSuccess: () => {
      void utils.permissions.list.invalidate();
      void utils.notices.list.invalidate();
      onClose();
    },
  });
  return (
    <Modal
      title={t("Request permission", "လုပ်ပိုင်ခွင့်တောင်းခံရန်")}
      subtitle={t(
        "Your request will be sent to an admin.",
        "သင့်တောင်းဆိုချက်ကို Admin ထံ ပေးပို့မည်။"
      )}
      onClose={onClose}
    >
      <form
        className="form-stack"
        onSubmit={e => {
          e.preventDefault();
          request.mutate({
            capability: "manage_prices",
            reason: reason.trim(),
          });
        }}
      >
        <Field label={t("Permission", "လုပ်ပိုင်ခွင့်")}>
          <input
            value={t(
              "Manage service prices",
              "ဝန်ဆောင်မှုစျေးနှုန်းများ စီမံရန်"
            )}
            disabled
          />
        </Field>
        <Field
          label={t(
            "Why do you need access?",
            "ခွင့်ပြုချက်လိုအပ်ရသည့် အကြောင်းရင်း"
          )}
        >
          <textarea
            rows={4}
            value={reason}
            onChange={e => setReason(e.target.value)}
            required
          />
        </Field>
        <ErrorMessage error={request.error} />
        <div className="modal-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            {t("Cancel", "မလုပ်တော့ပါ")}
          </button>
          <button
            className="button primary"
            disabled={request.isPending || !reason.trim()}
          >
            <Send size={15} />
            {t("Send request", "တောင်းဆိုချက်ပို့ပါ")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
function PermissionDecision({
  request,
  onClose,
}: {
  request: { id: number; requesterName: string };
  onClose: () => void;
}) {
  const { t } = useLang();
  const utils = trpc.useUtils();
  const [note, setNote] = useState("");
  const decide = trpc.permissions.decide.useMutation({
    onSuccess: () => {
      void utils.permissions.list.invalidate();
      void utils.notices.list.invalidate();
      onClose();
    },
  });
  return (
    <Modal
      title={t("Review request", "တောင်းဆိုချက်ကို စစ်ဆေးရန်")}
      subtitle={request.requesterName}
      onClose={onClose}
    >
      <div className="form-stack">
        <Field label={t("Decision note", "ဆုံးဖြတ်ချက်မှတ်ချက်")}>
          <textarea
            rows={3}
            value={note}
            onChange={e => setNote(e.target.value)}
          />
        </Field>
        <ErrorMessage error={decide.error} />
        <div className="modal-actions">
          <button
            className="button secondary"
            disabled={decide.isPending}
            onClick={() =>
              decide.mutate({ id: request.id, decision: "rejected", note })
            }
          >
            {t("Reject", "ငြင်းပယ်ရန်")}
          </button>
          <button
            className="button primary"
            disabled={decide.isPending}
            onClick={() =>
              decide.mutate({ id: request.id, decision: "approved", note })
            }
          >
            {t("Approve", "ခွင့်ပြုရန်")}
          </button>
        </div>
      </div>
    </Modal>
  );
}
export function Permissions({ user }: { user: User }) {
  const { t } = useLang();
  const requests = trpc.permissions.list.useQuery();
  const [create, setCreate] = useState(false);
  const [review, setReview] = useState<{
    id: number;
    requesterName: string;
  } | null>(null);
  return (
    <>
      <PageHead
        eyebrow={t("WORKSPACE / ACCESS", "လုပ်ငန်းနေရာ / လုပ်ပိုင်ခွင့်")}
        title={t("Permissions", "လုပ်ပိုင်ခွင့်များ")}
        description={
          isOwner(user)
            ? t(
                "Review access requests from your team.",
                "အဖွဲ့၏ လုပ်ပိုင်ခွင့်တောင်းဆိုချက်များကို စစ်ဆေးပါ။"
              )
            : t(
                "Request and track additional workspace access.",
                "ထပ်မံလိုအပ်သော လုပ်ပိုင်ခွင့်ကို တောင်းခံပြီး အခြေအနေကို ကြည့်ပါ။"
              )
        }
        action={
          user.role === "staff" && (
            <button className="button primary" onClick={() => setCreate(true)}>
              <Plus size={17} />
              {t("Request permission", "လုပ်ပိုင်ခွင့်တောင်းရန်")}
            </button>
          )
        }
      />
      <section className="panel">
        <div className="panel-head">
          <div>
            <div className="eyebrow">
              {t("ACCESS REQUESTS", "လုပ်ပိုင်ခွင့်တောင်းဆိုချက်")}
            </div>
            <h2>
              {isOwner(user)
                ? t("All requests", "တောင်းဆိုချက်အားလုံး")
                : t("Your requests", "သင့်တောင်းဆိုချက်များ")}
            </h2>
          </div>
        </div>
        <QueryState
          loading={requests.isLoading}
          error={requests.error}
          retry={() => void requests.refetch()}
        >
          {requests.data?.length === 0 ? (
            <Empty
              icon={ShieldCheck}
              title={t("No requests yet", "တောင်းဆိုချက်မရှိသေးပါ")}
              text={
                isOwner(user)
                  ? t(
                      "Team permission requests will appear here.",
                      "အဖွဲ့၏ လုပ်ပိုင်ခွင့်တောင်းဆိုချက်များကို ဤနေရာတွင် ပြသမည်။"
                    )
                  : t(
                      "When you request access, you can track the decision here.",
                      "လုပ်ပိုင်ခွင့်တောင်းခံပြီးနောက် ဆုံးဖြတ်ချက်ကို ဤနေရာတွင် ကြည့်နိုင်ပါသည်။"
                    )
              }
            />
          ) : (
            <div className="request-list">
              {requests.data?.map(r => (
                <article className="request-row" key={r.id}>
                  <div className="row-icon">
                    <ShieldCheck size={17} />
                  </div>
                  <div className="request-main">
                    <div className="request-title">
                      <strong>
                        {t(
                          "Manage service prices",
                          "ဝန်ဆောင်မှုစျေးနှုန်းများ စီမံရန်"
                        )}
                      </strong>
                      <Badge
                        tone={
                          r.status === "approved"
                            ? "green"
                            : r.status === "rejected"
                              ? "red"
                              : "gold"
                        }
                      >
                        {r.status === "approved"
                          ? t("Approved", "ခွင့်ပြုပြီး")
                          : r.status === "rejected"
                            ? t("Rejected", "ငြင်းပယ်ပြီး")
                            : t("Pending", "စောင့်ဆိုင်းနေ")}
                      </Badge>
                    </div>
                    <span>
                      {r.requesterName} · {dateTime(r.createdAt)}
                    </span>
                    <p>{r.reason}</p>
                    {r.decisionNote && (
                      <p className="decision-note">
                        {t("Decision note", "ဆုံးဖြတ်ချက်မှတ်ချက်")}:{" "}
                        {r.decisionNote}
                      </p>
                    )}
                  </div>
                  {isOwner(user) && r.status === "pending" && (
                    <button
                      className="button secondary small"
                      onClick={() => setReview(r)}
                    >
                      {t("Review", "စစ်ဆေးရန်")}
                    </button>
                  )}
                </article>
              ))}
            </div>
          )}
        </QueryState>
      </section>
      {create && <PermissionRequest onClose={() => setCreate(false)} />}
      {review && (
        <PermissionDecision request={review} onClose={() => setReview(null)} />
      )}
    </>
  );
}

function NoticeCreate({ onClose }: { onClose: () => void }) {
  const { t } = useLang();
  const utils = trpc.useUtils();
  const [titleEn, setTitleEn] = useState("");
  const [titleMm, setTitleMm] = useState("");
  const [bodyEn, setBodyEn] = useState("");
  const [bodyMm, setBodyMm] = useState("");
  const [audience, setAudience] = useState<"all" | "owner" | "admin" | "staff">(
    "all"
  );
  const [type, setType] = useState<"announcement" | "maintenance">(
    "announcement"
  );
  const create = trpc.notices.create.useMutation({
    onSuccess: () => {
      void utils.notices.list.invalidate();
      onClose();
    },
  });
  return (
    <Modal
      title={t("Create notice", "အသိပေးချက်ဖန်တီးရန်")}
      subtitle={t(
        "Write the message in both languages.",
        "ဘာသာစကားနှစ်မျိုးဖြင့် ရေးပါ။"
      )}
      onClose={onClose}
    >
      <form
        className="form-stack"
        onSubmit={e => {
          e.preventDefault();
          create.mutate({
            titleEn: titleEn.trim(),
            titleMm: titleMm.trim(),
            bodyEn: bodyEn.trim(),
            bodyMm: bodyMm.trim(),
            audience,
            type,
          });
        }}
      >
        <div className="form-grid">
          <Field label={t("Type", "အမျိုးအစား")}>
            <select
              value={type}
              onChange={e => setType(e.target.value as typeof type)}
            >
              <option value="announcement">
                {t("Announcement", "ကြေညာချက်")}
              </option>
              <option value="maintenance">
                {t("Maintenance", "ပြုပြင်ထိန်းသိမ်းမှု")}
              </option>
            </select>
          </Field>
          <Field label={t("Audience", "လက်ခံမည့်သူ")}>
            <select
              value={audience}
              onChange={e => setAudience(e.target.value as typeof audience)}
            >
              <option value="all">{t("Everyone", "အားလုံး")}</option>
              <option value="owner">Owner</option>
              <option value="admin">Admin</option>
              <option value="staff">Staff</option>
            </select>
          </Field>
        </div>
        <Field label="Title · English">
          <input
            required
            value={titleEn}
            onChange={e => setTitleEn(e.target.value)}
          />
        </Field>
        <Field label="ခေါင်းစဉ် · မြန်မာ">
          <input
            required
            value={titleMm}
            onChange={e => setTitleMm(e.target.value)}
          />
        </Field>
        <Field label="Message · English">
          <textarea
            required
            rows={3}
            value={bodyEn}
            onChange={e => setBodyEn(e.target.value)}
          />
        </Field>
        <Field label="စာသား · မြန်မာ">
          <textarea
            required
            rows={3}
            value={bodyMm}
            onChange={e => setBodyMm(e.target.value)}
          />
        </Field>
        <ErrorMessage error={create.error} />
        <div className="modal-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            {t("Cancel", "မလုပ်တော့ပါ")}
          </button>
          <button
            className="button primary"
            disabled={
              create.isPending ||
              !titleEn.trim() ||
              !titleMm.trim() ||
              !bodyEn.trim() ||
              !bodyMm.trim()
            }
          >
            {t("Publish notice", "အသိပေးချက်ထုတ်ပြန်ပါ")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
export function Notices({ user }: { user: User }) {
  const { t, lang } = useLang();
  const utils = trpc.useUtils();
  const notices = trpc.notices.list.useQuery();
  const [create, setCreate] = useState(false);
  const mark = trpc.notices.markRead.useMutation({
    onSuccess: () => {
      void utils.notices.list.invalidate();
    },
  });
  return (
    <>
      <PageHead
        eyebrow={t("WORKSPACE / COMMUNICATION", "လုပ်ငန်းနေရာ / အသိပေးချက်")}
        title={t("Notices", "အသိပေးချက်များ")}
        description={t(
          "Updates and messages for your account.",
          "သင့်အကောင့်အတွက် အသိပေးချက်များ။"
        )}
        action={
          isOwner(user) && (
            <button className="button primary" onClick={() => setCreate(true)}>
              <Plus size={17} />
              {t("Create notice", "အသိပေးချက်ဖန်တီးရန်")}
            </button>
          )
        }
      />
      <section className="panel">
        <div className="panel-head">
          <div>
            <div className="eyebrow">{t("INBOX", "အသိပေးချက်စာရင်း")}</div>
            <h2>{t("Messages", "စာများ")}</h2>
          </div>
          {notices.data && (
            <button
              className="button secondary small"
              onClick={() =>
                exportCsv("win-computer-notices.csv", [
                  ["Type", "Title", "Message", "Read", "Created"],
                  ...notices.data!.map(n => [
                    n.type,
                    n.titleMm,
                    n.bodyMm,
                    n.read ? "Yes" : "No",
                    dateTime(n.createdAt),
                  ]),
                ])
              }
            >
              {t("Export Excel", "Excel ထုတ်ရန်")}
            </button>
          )}
        </div>
        <ErrorMessage error={mark.error} />
        <QueryState
          loading={notices.isLoading}
          error={notices.error}
          retry={() => void notices.refetch()}
        >
          {notices.data?.length === 0 ? (
            <Empty
              icon={Bell}
              title={t("You're all caught up", "အသိပေးချက်မရှိသေးပါ")}
              text={t(
                "Announcements and permission updates will appear here.",
                "ကြေညာချက်နှင့် လုပ်ပိုင်ခွင့်အသိပေးချက်များ ဤနေရာတွင် ပေါ်လာမည်။"
              )}
            />
          ) : (
            <div className="notice-list">
              {notices.data?.map(n => (
                <article
                  className={`notice-row ${!n.read ? "unread" : ""}`}
                  key={n.id}
                >
                  <div className="notice-dot" />
                  <div className="notice-body">
                    <div className="notice-meta">
                      <Badge tone={n.type === "maintenance" ? "gold" : "blue"}>
                        {n.type === "maintenance"
                          ? t("Maintenance", "ပြုပြင်ထိန်းသိမ်းမှု")
                          : n.type === "notification"
                            ? t("Notification", "အသိပေးချက်")
                            : t("Announcement", "ကြေညာချက်")}
                      </Badge>
                      <span>{dateTime(n.createdAt)}</span>
                    </div>
                    <h3>{lang === "mm" ? n.titleMm : n.titleEn}</h3>
                    <p>{lang === "mm" ? n.bodyMm : n.bodyEn}</p>
                  </div>
                  {!n.read && (
                    <button
                      className="button secondary small"
                      disabled={mark.isPending}
                      onClick={() => mark.mutate({ id: n.id })}
                    >
                      {t("Mark read", "ဖတ်ပြီးဟု မှတ်ရန်")}
                    </button>
                  )}
                </article>
              ))}
            </div>
          )}
        </QueryState>
      </section>
      {create && <NoticeCreate onClose={() => setCreate(false)} />}
    </>
  );
}

function toLocalInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "";
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}
type ImportTable = "prices" | "products" | "services" | "expenses" | "settings";
function downloadJson(filename: string, content: string) {
  const blob = new Blob([content], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
function DataManagement() {
  const { t } = useLang();
  const [table, setTable] = useState<ImportTable>("settings");
  const [content, setContent] = useState("");
  const json = trpc.exports.json.useQuery({ table }, { enabled: false });
  const restore = trpc.exports.importJson.useMutation({
    onSuccess: () => setContent(""),
  });
  const exportJson = async () => {
    const result = await json.refetch();
    if (result.data) downloadJson(result.data.filename, result.data.content);
  };
  return (
    <section className="panel settings-panel settings-wide">
      <div className="panel-head">
        <div>
          <div className="eyebrow">
            04 / {t("DATA MANAGEMENT", "ဒေတာစီမံခန့်ခွဲမှု")}
          </div>
          <h2>{t("Export & restore", "Export နှင့် Restore")}</h2>
        </div>
        <LockKeyhole size={17} className="muted" />
      </div>
      <p className="panel-intro">
        {t(
          "JSON export and restore are Owner-only. Restore replaces the selected table; it is never an automatic merge.",
          "JSON Export နှင့် Restore ကို Owner သာ ပြုလုပ်နိုင်သည်။ Restore သည် ရွေးထားသော table ကို အစားထိုးမည်ဖြစ်ပြီး အလိုအလျောက်ပေါင်းစပ်ခြင်း မဟုတ်ပါ။"
        )}
      </p>
      <div className="form-grid">
        <Field label={t("Data set", "ဒေတာအမျိုးအစား")}>
          <select
            value={table}
            onChange={e => setTable(e.target.value as ImportTable)}
          >
            <option value="settings">
              {t("Business settings", "လုပ်ငန်းဆက်တင်များ")}
            </option>
            <option value="prices">
              {t("Service prices", "ဝန်ဆောင်မှုစျေးနှုန်းများ")}
            </option>
            <option value="products">{t("Products", "ကုန်ပစ္စည်းများ")}</option>
            <option value="services">{t("Services", "ဝန်ဆောင်မှုများ")}</option>
            <option value="expenses">{t("Expenses", "ကုန်ကျစရိတ်များ")}</option>
          </select>
        </Field>
        <Field label={t("Export", "Export ထုတ်ရန်")}>
          <button
            type="button"
            className="button secondary"
            onClick={() => void exportJson()}
            disabled={json.isFetching}
          >
            {json.isFetching
              ? t("Preparing…", "ပြင်ဆင်နေပါသည်…")
              : t("Download JSON", "JSON ဒေါင်းလုပ်လုပ်ရန်")}
          </button>
        </Field>
        <Field label={t("Import file", "Import ဖိုင်")}>
          <input
            type="file"
            accept="application/json,.json"
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) void file.text().then(setContent);
            }}
          />
        </Field>
      </div>
      <Field
        label={t("JSON restore content", "JSON Restore အကြောင်းအရာ")}
        hint={t(
          "You may review or edit the JSON before restoring.",
          "Restore မလုပ်မီ JSON ကို ပြန်စစ်ပြီး ပြင်ဆင်နိုင်သည်။"
        )}
      >
        <textarea
          rows={7}
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Paste exported JSON here…"
        />
      </Field>
      <div className="alert warning">
        {t(
          "Overwrite warning: restoring will replace all records in the selected data set. Confirm that you have a tested backup before continuing.",
          "အစားထိုးသိမ်းဆည်းမည့် သတိပေးချက် - Restore လုပ်လျှင် ရွေးချယ်ထားသော ဒေတာအမျိုးအစားရှိ မှတ်တမ်းအားလုံးကို အစားထိုးမည်။ ဆက်မလုပ်မီ စမ်းသပ်ပြီးသော backup ရှိကြောင်း အတည်ပြုပါ။"
        )}
      </div>
      <ErrorMessage error={json.error || restore.error} />
      {restore.isSuccess && (
        <SuccessMessage>
          {t(
            `Restored ${restore.data.rowCount} record(s) and recorded the action in the audit log.`,
            `${restore.data.rowCount} မှတ်တမ်းကို Restore လုပ်ပြီး audit log တွင် မှတ်တမ်းတင်ပြီးပါပြီ။`
          )}
        </SuccessMessage>
      )}
      <div>
        <button
          className="button danger"
          disabled={restore.isPending || content.trim().length < 2}
          onClick={() => {
            if (
              window.confirm(
                t(
                  "This will overwrite the selected data set. Continue?",
                  "ရွေးချယ်ထားသော ဒေတာအမျိုးအစားကို အစားထိုးမည်။ ဆက်လုပ်မလား။"
                )
              )
            )
              restore.mutate({ table, content, overwrite: true });
          }}
        >
          {restore.isPending
            ? t("Restoring…", "Restore လုပ်နေပါသည်…")
            : t("Restore selected data", "ရွေးချယ်ထားသော ဒေတာ Restore လုပ်ပါ")}
        </button>
      </div>
    </section>
  );
}
function MaintenanceForm({
  data,
}: {
  data: {
    status: "open" | "closed";
    messageEn: string;
    messageMm: string;
    startAt: string | null;
    endAt: string | null;
    scheduleIsConfigured: boolean;
    note: string;
  };
}) {
  const { t } = useLang();
  const utils = trpc.useUtils();
  const [status, setStatus] = useState<"open" | "closed">(data.status);
  const [messageEn, setEn] = useState(data.messageEn);
  const [messageMm, setMm] = useState(data.messageMm);
  const [startAt, setStart] = useState(toLocalInput(data.startAt));
  const [endAt, setEnd] = useState(toLocalInput(data.endAt));
  const save = trpc.admin.setServerStatus.useMutation({
    onSuccess: () => {
      void utils.admin.serverStatus.invalidate();
      void utils.admin.maintenance.invalidate();
      void utils.notices.list.invalidate();
    },
  });
  const chooseStatus = (next: "open" | "closed") => {
    if (next !== status) {
      const prompt =
        next === "closed"
          ? t(
              "Close the business system? Staff business actions will be blocked.",
              "လုပ်ငန်းစနစ်ကို ပိတ်မလား။ ဝန်ထမ်းများ၏ လုပ်ငန်းလုပ်ဆောင်ချက်များကို ပိတ်ထားမည်။"
            )
          : t(
              "Open the business system and allow staff business actions again?",
              "လုပ်ငန်းစနစ်ကို ဖွင့်ပြီး ဝန်ထမ်းများ၏ လုပ်ငန်းလုပ်ဆောင်ချက်များကို ပြန်ခွင့်ပြုမလား။"
            );
      if (!window.confirm(prompt)) return;
    }
    setStatus(next);
  };
  return (
    <form
      className="form-stack"
      onSubmit={e => {
        e.preventDefault();
        save.mutate({
          status,
          messageEn: messageEn.trim(),
          messageMm: messageMm.trim(),
          startAt: startAt ? new Date(startAt).toISOString() : null,
          endAt: endAt ? new Date(endAt).toISOString() : null,
        });
      }}
    >
      <div
        className="status-card"
        style={{ borderColor: status === "open" ? "#16a34a" : "#dc2626" }}
      >
        <div>
          <div className="eyebrow">
            {t("CURRENT SERVER STATUS", "လက်ရှိ ဆာဗာအခြေအနေ")}
          </div>
          <h3>
            {status === "open"
              ? t("Open", "ဖွင့်ထားသည်")
              : t("Closed", "ပိတ်ထားသည်")}
          </h3>
          <small>
            {t(
              "Business system availability / maintenance state",
              "လုပ်ငန်းစနစ် အသုံးပြုနိုင်မှု / ပြုပြင်ထိန်းသိမ်းမှုအခြေအနေ"
            )}
          </small>
        </div>
        <Badge tone={status === "open" ? "green" : "red"}>
          {status === "open" ? t("OPEN", "ဖွင့်") : t("CLOSED", "ပိတ်")}
        </Badge>
      </div>
      <div className="row-actions">
        <button
          type="button"
          className={`button ${status === "open" ? "primary" : "secondary"}`}
          onClick={() => chooseStatus("open")}
        >
          {t("Open · ဖွင့်ထားသည်", "ဖွင့်ထားသည် · Open")}
        </button>
        <button
          type="button"
          className={`button ${status === "closed" ? "primary" : "secondary"}`}
          onClick={() => chooseStatus("closed")}
        >
          {t("Closed · ပိတ်ထားသည်", "ပိတ်ထားသည် · Closed")}
        </button>
      </div>
      <div className="alert warning">
        {t(
          "Closing blocks staff business actions. It does not shut down the computer, OS, or server process. Login, notices, password changes, and administration remain available.",
          "ပိတ်ထားချိန်တွင် ဝန်ထမ်းလုပ်ငန်းလုပ်ဆောင်ချက်များကို ပိတ်ထားမည်။ ကွန်ပျူတာ၊ OS သို့မဟုတ် server process ကို မပိတ်ပါ။ Login၊ အသိပေးချက်၊ စကားဝှက်ပြောင်းခြင်းနှင့် စီမံခန့်ခွဲမှုများကို ဆက်လက်အသုံးပြုနိုင်သည်။"
        )}
      </div>
      <Field label="Message · English">
        <textarea
          rows={2}
          value={messageEn}
          onChange={e => setEn(e.target.value)}
        />
      </Field>
      <Field label="စာသား · မြန်မာ">
        <textarea
          rows={2}
          value={messageMm}
          onChange={e => setMm(e.target.value)}
        />
      </Field>
      <div className="form-grid">
        <Field label={t("Start time (optional)", "စတင်ချိန် (မဖြည့်လည်းရ)")}>
          <input
            type="datetime-local"
            value={startAt}
            onChange={e => setStart(e.target.value)}
          />
        </Field>
        <Field label={t("End time (optional)", "ပြီးဆုံးချိန် (မဖြည့်လည်းရ)")}>
          <input
            type="datetime-local"
            value={endAt}
            onChange={e => setEnd(e.target.value)}
          />
        </Field>
      </div>
      <small className="muted">
        {t(
          "Saving a changed status creates an in-app notice for every active user, including admins and owners. Schedule fields are informational; no background scheduler is claimed.",
          "အခြေအနေပြောင်းလဲသိမ်းဆည်းပါက Admin နှင့် Owner အပါအဝင် active user အားလုံးအတွက် app အတွင်း အသိပေးချက်ဖန်တီးမည်။ အချိန်ဇယားသည် အချက်အလက်အတွက်သာဖြစ်ပြီး နောက်ကွယ် scheduler မရှိပါ။"
        )}
      </small>
      <ErrorMessage error={save.error} />
      {save.isSuccess && (
        <SuccessMessage>
          {t(
            "Server status saved and notices refreshed.",
            "ဆာဗာအခြေအနေ သိမ်းဆည်းပြီး အသိပေးချက်များကို ပြန်ဖတ်ပြီးပါပြီ။"
          )}
        </SuccessMessage>
      )}
      <div>
        <button className="button primary" disabled={save.isPending}>
          {t("Save server status", "ဆာဗာအခြေအနေသိမ်းပါ")}
        </button>
      </div>
    </form>
  );
}
function BrandSettings() {
  const { t } = useLang();
  const settings = trpc.settings.get.useQuery();
  const utils = trpc.useUtils();
  const [welcomeTextMm, setWelcomeTextMm] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactViber, setContactViber] = useState("");
  const [contactTelegram, setContactTelegram] = useState("");
  const [contactKbzPay, setContactKbzPay] = useState("");
  const [contactWavePay, setContactWavePay] = useState("");
  const [logoReference, setLogoReference] = useState("");
  useEffect(() => {
    if (!settings.data) return;
    setWelcomeTextMm(settings.data.welcomeTextMm || "");
    setContactPhone(settings.data.contactPhone || "");
    setContactViber(settings.data.contactViber || "");
    setContactTelegram(settings.data.contactTelegram || "");
    setContactKbzPay(settings.data.contactKbzPay || "");
    setContactWavePay(settings.data.contactWavePay || "");
    setLogoReference(settings.data.logoReference || "");
  }, [settings.data]);
  const save = trpc.settings.update.useMutation({
    onSuccess: () => {
      void utils.settings.get.invalidate();
    },
  });
  return (
    <section className="panel settings-panel settings-wide">
      <div className="panel-head">
        <div>
          <div className="eyebrow">
            03 / {t("BRAND & CONTACT", "အမှတ်တံဆိပ်နှင့် ဆက်သွယ်ရန်")}
          </div>
          <h2>{t("Owner customization", "Owner စိတ်ကြိုက်ပြင်ဆင်မှု")}</h2>
        </div>
        <LockKeyhole size={17} className="muted" />
      </div>
      <p className="panel-intro">
        {t(
          "These values are stored in the business database and shown in the workspace welcome strip. Only the Owner can change them.",
          "ဤအချက်အလက်များကို လုပ်ငန်း database ထဲတွင် သိမ်းဆည်းပြီး workspace ကြိုဆိုမှုနေရာတွင် ပြသမည်။ Owner သာ ပြောင်းလဲနိုင်သည်။"
        )}
      </p>
      <QueryState
        loading={settings.isLoading}
        error={settings.error}
        retry={() => void settings.refetch()}
      >
        {settings.data && (
          <form
            className="form-stack"
            onSubmit={e => {
              e.preventDefault();
              save.mutate({
                welcomeTextMm: welcomeTextMm.trim(),
                contactPhone: contactPhone.trim() || null,
                contactViber: contactViber.trim() || null,
                contactTelegram: contactTelegram.trim() || null,
                contactKbzPay: contactKbzPay.trim() || null,
                contactWavePay: contactWavePay.trim() || null,
                logoReference: logoReference.trim() || null,
              });
            }}
          >
            <Field
              label={t("Welcome message", "ကြိုဆိုစာသား")}
              hint={t(
                "Shown as the business welcome message; leave blank to use the default.",
                "လုပ်ငန်းကြိုဆိုစာသားအဖြစ် ပြသမည်။ ဗလာထားလျှင် မူရင်းစာသားကို အသုံးပြုမည်။"
              )}
            >
              <input
                value={welcomeTextMm}
                onChange={e => setWelcomeTextMm(e.target.value)}
                placeholder="Win Computer မှ ကြိုဆိုပါသည်"
              />
            </Field>
            <div className="form-grid">
              <Field label={t("Business phone", "လုပ်ငန်းဖုန်း")}>
                <input
                  value={contactPhone}
                  onChange={e => setContactPhone(e.target.value)}
                />
              </Field>
              <Field label="Viber">
                <input
                  value={contactViber}
                  onChange={e => setContactViber(e.target.value)}
                />
              </Field>
              <Field label="Telegram">
                <input
                  value={contactTelegram}
                  onChange={e => setContactTelegram(e.target.value)}
                />
              </Field>
              <Field label="KBZPay">
                <input
                  value={contactKbzPay}
                  onChange={e => setContactKbzPay(e.target.value)}
                  placeholder={t(
                    "KBZPay phone or account",
                    "KBZPay ဖုန်း သို့မဟုတ် အကောင့်"
                  )}
                />
              </Field>
              <Field label="WavePay">
                <input
                  value={contactWavePay}
                  onChange={e => setContactWavePay(e.target.value)}
                  placeholder={t(
                    "WavePay phone or account",
                    "WavePay ဖုန်း သို့မဟုတ် အကောင့်"
                  )}
                />
              </Field>
            </div>
            <Field
              label={t(
                "Logo reference (optional)",
                "Logo ရည်ညွှန်းချက် (ရွေးချယ်နိုင်သည်)"
              )}
              hint={t(
                "Use a project storage path such as /manus-storage/...; the supplied Win Computer logo remains the fallback.",
                "/manus-storage/... ကဲ့သို့ project storage လမ်းကြောင်းကို သုံးနိုင်သည်။ မူရင်း Win Computer logo ကို fallback အဖြစ် ဆက်သုံးမည်။"
              )}
            >
              <input
                value={logoReference}
                onChange={e => setLogoReference(e.target.value)}
                placeholder="/manus-storage/..."
              />
            </Field>
            <ErrorMessage error={save.error} />
            {save.isSuccess && (
              <SuccessMessage>
                {t(
                  "Owner settings saved.",
                  "Owner ဆက်တင်များ သိမ်းဆည်းပြီးပါပြီ။"
                )}
              </SuccessMessage>
            )}
            <div>
              <button className="button primary" disabled={save.isPending}>
                {save.isPending
                  ? t("Saving…", "သိမ်းဆည်းနေပါသည်…")
                  : t("Save owner settings", "Owner ဆက်တင်များ သိမ်းပါ")}
              </button>
            </div>
          </form>
        )}
      </QueryState>
    </section>
  );
}
export function Maintenance() {
  const { t } = useLang();
  const status = trpc.admin.serverStatus.useQuery();
  const utils = trpc.useUtils();
  const [cash, setCash] = useState("");
  const opening = trpc.admin.setOpeningCash.useMutation({
    onSuccess: () => {
      void utils.overview.stats.invalidate();
      setCash("");
    },
  });
  return (
    <>
      <PageHead
        eyebrow={t("ADMINISTRATION / SETTINGS", "စီမံခန့်ခွဲမှု / ဆက်တင်များ")}
        title={t("Settings", "ဆက်တင်များ")}
        description={t(
          "Control business system availability and opening cash. The server status is not an OS power control.",
          "လုပ်ငန်းစနစ်အသုံးပြုနိုင်မှုနှင့် ကနဦးလက်ငင်းငွေကို စီမံပါ။ ဆာဗာအခြေအနေသည် OS power control မဟုတ်ပါ။"
        )}
      />
      <div className="settings-grid">
        <section className="panel settings-panel">
          <div className="panel-head">
            <div>
              <div className="eyebrow">
                01 / {t("SYSTEM AVAILABILITY", "စနစ်အသုံးပြုနိုင်မှု")}
              </div>
              <h2>{t("Server open / close", "ဆာဗာ ဖွင့် / ပိတ်")}</h2>
            </div>
          </div>
          <p className="panel-intro">
            {t(
              "Explicitly open or close business actions and notify active users in-app.",
              "လုပ်ငန်းလုပ်ဆောင်ချက်များကို ဖွင့်/ပိတ် သတ်မှတ်ပြီး active user များကို app အတွင်း အသိပေးပါ။"
            )}
          </p>
          <QueryState
            loading={status.isLoading}
            error={status.error}
            retry={() => void status.refetch()}
          >
            {status.data && <MaintenanceForm data={status.data} />}
          </QueryState>
        </section>
        <section className="panel settings-panel">
          <div className="panel-head">
            <div>
              <div className="eyebrow">
                02 / {t("CASH POSITION", "လက်ငင်းငွေအခြေအနေ")}
              </div>
              <h2>{t("Opening cash", "ကနဦးလက်ငင်းငွေ")}</h2>
            </div>
          </div>
          <p className="panel-intro">
            {t(
              "Enter the actual opening amount. Until it is set, cash balance remains unknown.",
              "အမှန်တကယ် ကနဦးငွေပမာဏကို ထည့်ပါ။ မသတ်မှတ်မီ လက်ငင်းငွေလက်ကျန်ကို မသိနိုင်ပါ။"
            )}
          </p>
          <form
            className="form-stack"
            onSubmit={e => {
              e.preventDefault();
              opening.mutate({ amount: Number(cash) });
            }}
          >
            <Field label={t("Opening amount (MMK)", "ကနဦးပမာဏ (ကျပ်)")}>
              <input
                type="number"
                min="0"
                step="1"
                required
                value={cash}
                onChange={e => setCash(e.target.value)}
              />
            </Field>
            <ErrorMessage error={opening.error} />
            {opening.isSuccess && (
              <SuccessMessage>
                {t("Opening cash saved.", "ကနဦးငွေ သိမ်းဆည်းပြီးပါပြီ။")}
              </SuccessMessage>
            )}
            <div>
              <button
                className="button secondary"
                disabled={opening.isPending || cash === ""}
              >
                {t("Save opening cash", "ကနဦးငွေသိမ်းပါ")}
              </button>
            </div>
          </form>
        </section>
      </div>
      <BrandSettings />
      <DataManagement />
    </>
  );
}

export function Audit() {
  const { t } = useLang();
  const [page, setPage] = useState(0);
  const audit = trpc.audit.list.useQuery({ page });
  const describeAction = (action: string, details: string) => {
    let parsed: {
      targetName?: string;
      targetUsername?: string;
      reason?: string;
    } = {};
    try {
      parsed = JSON.parse(details) as typeof parsed;
    } catch {
      /* legacy detail */
    }
    const person = parsed.targetName
      ? `${parsed.targetName}${parsed.targetUsername ? ` (${parsed.targetUsername})` : ""}`
      : "အကောင့်";
    const reason = parsed.reason
      ? ` — ${t("Reason", "အကြောင်းပြချက်")}: ${parsed.reason}`
      : "";
    const labels: Record<string, [string, string]> = {
      "team.deactivate": [
        t(`Deactivated ${person}`, `${person} ကို ပိတ်ထားသည်`),
        t(`Deactivated ${person}`, `${person} ကို ပိတ်ထားသည်`),
      ],
      "team.delete": [
        t(`Removed ${person}`, `${person} ကို ဖြုတ်ထားသည်`),
        t(`Removed ${person}`, `${person} ကို ဖြုတ်ထားသည်`),
      ],
      "team.restore": [
        t(`Restored ${person}`, `${person} ကို ပြန်ဖွင့်သည်`),
        t(`Restored ${person}`, `${person} ကို ပြန်ဖွင့်သည်`),
      ],
      "auth.login": [t("Signed in", "အကောင့်ဝင်ရောက်သည်"), ""],
      "team.create": [
        t("Created a user account", "အသုံးပြုသူအကောင့် ဖန်တီးသည်"),
        "",
      ],
      "team.update": [
        t("Updated a user account", "အသုံးပြုသူအကောင့် ပြင်ဆင်သည်"),
        "",
      ],
      "product.create": [t("Added a product", "ကုန်ပစ္စည်း ထည့်သည်"), ""],
      "product.update": [t("Updated a product", "ကုန်ပစ္စည်း ပြင်ဆင်သည်"), ""],
      "service_type.create": [t("Added a service", "ဝန်ဆောင်မှု ထည့်သည်"), ""],
      "service_type.update": [
        t("Updated a service", "ဝန်ဆောင်မှု ပြင်ဆင်သည်"),
        "",
      ],
      "receipt.create": [t("Created a receipt", "ပြေစာ ဖန်တီးသည်"), ""],
      "settings.business.update": [
        t(
          "Updated business contact settings",
          "လုပ်ငန်းဆက်သွယ်ရန် ဆက်တင်များ ပြင်ဆင်သည်"
        ),
        "",
      ],
    };
    return `${labels[action]?.[0] || action}${reason}`;
  };
  return (
    <>
      <PageHead
        eyebrow={t(
          "ADMINISTRATION / ACCOUNTABILITY",
          "စီမံခန့်ခွဲမှု / မှတ်တမ်း"
        )}
        title={t("Activity log", "လုပ်ဆောင်မှုမှတ်တမ်း")}
        description={t(
          "A record of actions across the workspace.",
          "လုပ်ငန်းနေရာအတွင်း လုပ်ဆောင်မှုများ၏ မှတ်တမ်း။"
        )}
      />
      <section className="panel table-panel">
        <div className="panel-head">
          <div>
            <div className="eyebrow">
              {t("AUDIT TRAIL", "လုပ်ဆောင်မှုမှတ်တမ်း")}
            </div>
            <h2>{t("Recorded activity", "မှတ်တမ်းတင်ထားသော လုပ်ဆောင်မှု")}</h2>
          </div>
          <div className="panel-actions">
            <button
              className="button secondary small"
              disabled={!audit.data}
              onClick={() =>
                audit.data &&
                exportCsv("win-computer-audit.csv", [
                  ["Time", "Actor", "Action", "Entity", "Details"],
                  ...audit.data.items.map(a => [
                    dateTime(a.createdAt),
                    a.actorName,
                    a.action,
                    `${a.entityType} ${a.entityId}`,
                    a.details,
                  ]),
                ])
              }
            >
              {t("Export Excel", "Excel ထုတ်ရန်")}
            </button>
            <LockKeyhole size={17} className="muted" />
          </div>
        </div>
        <QueryState
          loading={audit.isLoading}
          error={audit.error}
          retry={() => void audit.refetch()}
        >
          {audit.data?.items.length === 0 ? (
            <Empty
              icon={ClipboardList}
              title={t("No activity recorded", "လုပ်ဆောင်မှုမှတ်တမ်းမရှိသေးပါ")}
              text={t(
                "Audited actions will appear here.",
                "စစ်ဆေးမှတ်တမ်းတင်ထားသော လုပ်ဆောင်မှုများ ဤနေရာတွင် ပေါ်လာမည်။"
              )}
            />
          ) : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>{t("TIME", "အချိန်")}</th>
                    <th>{t("ACTOR", "လုပ်ဆောင်သူ")}</th>
                    <th>{t("ACTION", "လုပ်ဆောင်ချက်")}</th>
                    <th>{t("RECORD", "မှတ်တမ်း")}</th>
                    <th>{t("DETAILS", "အသေးစိတ်")}</th>
                  </tr>
                </thead>
                <tbody>
                  {audit.data?.items.map(a => (
                    <tr key={a.id}>
                      <td>{dateTime(a.createdAt)}</td>
                      <td>
                        <strong>{a.actorName}</strong>
                      </td>
                      <td>{describeAction(a.action, a.details)}</td>
                      <td>
                        {a.entityType} · {a.entityId}
                      </td>
                      <td className="audit-detail">{a.details || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </QueryState>
        <div className="pagination-bar">
          <button
            className="button secondary small"
            disabled={page === 0 || audit.isFetching}
            onClick={() => setPage(value => value - 1)}
          >
            {t("Previous", "အရင်")}
          </button>
          <span>
            {t(
              `Page ${page + 1} · 10 records per page`,
              `စာမျက်နှာ ${page + 1} · တစ်မျက်နှာ ၁၀ ခု`
            )}
          </span>
          <button
            className="button secondary small"
            disabled={!audit.data?.hasNext || audit.isFetching}
            onClick={() => setPage(value => value + 1)}
          >
            {t("Next", "နောက်")}
          </button>
        </div>
      </section>
    </>
  );
}
