import { useEffect, useState } from "react";
import { Plus, ShieldCheck } from "lucide-react";
import { trpc } from "@/lib/trpc";
import {
  Badge,
  Empty,
  ErrorMessage,
  Field,
  Modal,
  PageHead,
  QueryState,
  SuccessMessage,
  User,
  useLang,
} from "@/lib/ui";

const CAPABILITIES = [
  "manage_catalog",
  "manage_expenses",
  "manage_users",
  "view_audit",
  "manage_prices",
  "manage_notices",
  "manage_settings",
] as const;
type Capability = (typeof CAPABILITIES)[number];
type Role = {
  id: number;
  name: string;
  description: string | null;
  active: boolean;
  createdBy: number;
  createdAt: Date;
  capabilities: string[];
};
const capLabel = (c: Capability, t: (en: string, mm: string) => string) =>
  ({
    manage_catalog: t("Manage catalog", "ကတ်တလောက်စီမံရန်"),
    manage_expenses: t(
      "Manage expenses and reports",
      "ကုန်ကျစရိတ်နှင့် စာရင်းများ စီမံရန်"
    ),
    manage_users: t("Manage users", "အသုံးပြုသူများစီမံရန်"),
    view_audit: t("View audit log", "လုပ်ဆောင်မှုမှတ်တမ်းကြည့်ရန်"),
    manage_prices: t("Manage prices", "စျေးနှုန်းစီမံရန်"),
    manage_notices: t("Manage notices", "အသိပေးချက်စီမံရန်"),
    manage_settings: t("Manage settings", "ဆက်တင်စီမံရန်"),
  })[c];
function RoleForm({ role, onClose }: { role?: Role; onClose: () => void }) {
  const { t } = useLang();
  const utils = trpc.useUtils();
  const [name, setName] = useState(role?.name || "");
  const [description, setDescription] = useState(role?.description || "");
  const [active, setActive] = useState(role?.active ?? true);
  const [capabilities, setCapabilities] = useState<Capability[]>(() =>
    (role?.capabilities || []).filter((cap): cap is Capability =>
      CAPABILITIES.includes(cap as Capability)
    )
  );
  useEffect(() => {
    setCapabilities(
      (role?.capabilities || []).filter((cap): cap is Capability =>
        CAPABILITIES.includes(cap as Capability)
      )
    );
  }, [role?.id, role?.capabilities]);
  const create = trpc.roles.create.useMutation({
    onSuccess: () => {
      void utils.roles.list.invalidate();
      onClose();
    },
  });
  const update = trpc.roles.update.useMutation({
    onSuccess: () => {
      void utils.roles.list.invalidate();
      onClose();
    },
  });
  const toggle = (c: Capability) =>
    setCapabilities(v => (v.includes(c) ? v.filter(x => x !== c) : [...v, c]));
  return (
    <Modal
      title={
        role
          ? t("Edit custom role", "စိတ်ကြိုက်အခန်းကဏ္ဍပြင်ရန်")
          : t("Create custom role", "စိတ်ကြိုက်အခန်းကဏ္ဍဖန်တီးရန်")
      }
      onClose={onClose}
    >
      <form
        className="form-stack"
        onSubmit={e => {
          e.preventDefault();
          const input = { name: name.trim(), capabilities };
          if (role)
            update.mutate({
              id: role.id,
              name: name.trim(),
              description: description.trim() || null,
              active,
              capabilities,
            });
          else
            create.mutate({
              ...input,
              ...(description.trim()
                ? { description: description.trim() }
                : {}),
            });
        }}
      >
        <Field label={t("Role name", "အခန်းကဏ္ဍအမည်")}>
          <input
            required
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </Field>
        <Field label={t("Description", "ဖော်ပြချက်")}>
          <textarea
            rows={2}
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
        </Field>
        <div>
          <div className="field">
            <span>{t("Capabilities", "လုပ်ပိုင်ခွင့်များ")}</span>
          </div>
          <div className="form-stack">
            {CAPABILITIES.map(c => (
              <label className="check-card" key={c}>
                <input
                  type="checkbox"
                  checked={capabilities.includes(c)}
                  onChange={() => toggle(c)}
                />
                <span>
                  <strong>{capLabel(c, t)}</strong>
                  <small>{c}</small>
                </span>
              </label>
            ))}
          </div>
        </div>
        {role && (
          <label className="check-card">
            <input
              type="checkbox"
              checked={active}
              onChange={e => setActive(e.target.checked)}
            />
            <span>
              <strong>{t("Active role", "အသက်ဝင်အခန်းကဏ္ဍ")}</strong>
            </span>
          </label>
        )}
        <ErrorMessage error={create.error || update.error} />
        <div className="modal-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            {t("Cancel", "မလုပ်တော့ပါ")}
          </button>
          <button
            className="button primary"
            disabled={create.isPending || update.isPending || !name.trim()}
          >
            {t("Save role", "အခန်းကဏ္ဍသိမ်းပါ")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
function AssignRole({
  person,
  roles,
  onClose,
}: {
  person: { id: number; name: string };
  roles: Role[];
  onClose: () => void;
}) {
  const { t } = useLang();
  const utils = trpc.useUtils();
  const [roleId, setRoleId] = useState("");
  const assign = trpc.roles.assign.useMutation({
    onSuccess: () => {
      void utils.team.list.invalidate();
      onClose();
    },
  });
  return (
    <Modal
      title={t("Assign custom role", "စိတ်ကြိုက်အခန်းကဏ္ဍ သတ်မှတ်ရန်")}
      subtitle={person.name}
      onClose={onClose}
    >
      <form
        className="form-stack"
        onSubmit={e => {
          e.preventDefault();
          assign.mutate({
            userId: person.id,
            roleId: roleId ? Number(roleId) : null,
          });
        }}
      >
        <Field label={t("Custom role", "စိတ်ကြိုက်အခန်းကဏ္ဍ")}>
          <select value={roleId} onChange={e => setRoleId(e.target.value)}>
            <option value="">
              {t("No custom role", "စိတ်ကြိုက်အခန်းကဏ္ဍ မရှိ")}
            </option>
            {roles
              .filter(r => r.active)
              .map(r => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
          </select>
        </Field>
        <ErrorMessage error={assign.error} />
        <div className="modal-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            {t("Cancel", "မလုပ်တော့ပါ")}
          </button>
          <button className="button primary" disabled={assign.isPending}>
            {t("Assign role", "အခန်းကဏ္ဍသတ်မှတ်ပါ")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
export function Roles({ user }: { user: User }) {
  const { t } = useLang();
  const roles = trpc.roles.list.useQuery();
  const team = trpc.team.list.useQuery(undefined, {
    enabled: user.role === "owner" || user.role === "admin",
  });
  const utils = trpc.useUtils();
  const [edit, setEdit] = useState<Role | false | null>(null);
  const [assign, setAssign] = useState<{ id: number; name: string } | null>(
    null
  );
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const remove = trpc.roles.delete.useMutation({
    onSuccess: () => {
      void utils.roles.list.invalidate();
      setDeleteId(null);
    },
  });
  const ownerOnly = user.role === "owner";
  return (
    <>
      <PageHead
        eyebrow={t("ADMINISTRATION / ACCESS", "စီမံခန့်ခွဲမှု / ဝင်ရောက်ခွင့်")}
        title={t("Roles", "အခန်းကဏ္ဍများ")}
        description={t(
          "Create capability-based roles and assign them to non-owner staff or admins.",
          "လုပ်ပိုင်ခွင့်အခြေပြု အခန်းကဏ္ဍများ ဖန်တီးပြီး Owner မဟုတ်သော Staff/Admin များထံ သတ်မှတ်ပါ။"
        )}
        action={
          ownerOnly && (
            <button className="button primary" onClick={() => setEdit(false)}>
              <Plus size={16} />
              {t("Create role", "အခန်းကဏ္ဍဖန်တီးရန်")}
            </button>
          )
        }
      />
      {!ownerOnly && (
        <div className="permission-banner">
          <div>
            <strong>
              {t(
                "Owner-only authority controls",
                "Owner သာ အာဏာပိုင်ခွင့်များကို စီမံနိုင်သည်"
              )}
            </strong>
            <p>
              {t(
                "You can view the capability matrix, but only the owner may create, edit, delete roles, assign custom roles, or change admin authority.",
                "လုပ်ပိုင်ခွင့်စာရင်းကို ကြည့်နိုင်သော်လည်း Role ဖန်တီး/ပြင်/ဖျက်၊ သတ်မှတ်ခြင်းနှင့် Admin အာဏာပြောင်းခြင်းကို Owner သာ ပြုလုပ်နိုင်သည်။"
              )}
            </p>
          </div>
        </div>
      )}
      <section className="panel table-panel">
        <div className="panel-head">
          <div>
            <div className="eyebrow">
              {t("CUSTOM ROLES", "စိတ်ကြိုက်အခန်းကဏ္ဍများ")}
            </div>
            <h2>{t("Capability roles", "လုပ်ပိုင်ခွင့်အခန်းကဏ္ဍများ")}</h2>
          </div>
        </div>
        <QueryState
          loading={roles.isLoading}
          error={roles.error}
          retry={() => void roles.refetch()}
        >
          {roles.data?.length ? (
            <div className="recent-list">
              {roles.data.map(r => (
                <div className="recent-row" key={r.id}>
                  <div className="row-main">
                    <strong>{r.name}</strong>
                    <span>
                      {r.description || t("No description", "ဖော်ပြချက်မရှိ")} ·{" "}
                      {r.active
                        ? t("Active", "အသက်ဝင်")
                        : t("Inactive", "မလှုပ်ရှား")}
                    </span>
                  </div>
                  <div className="row-actions">
                    <Badge tone={r.active ? "green" : "neutral"}>
                      {r.active
                        ? t("Active", "အသက်ဝင်")
                        : t("Inactive", "မလှုပ်ရှား")}
                    </Badge>
                    {ownerOnly && (
                      <>
                        <button
                          className="button secondary small"
                          onClick={() => setEdit(r)}
                        >
                          {t("Edit", "ပြင်ရန်")}
                        </button>
                        <button
                          className="button danger small"
                          onClick={() => setDeleteId(r.id)}
                        >
                          {t("Delete", "ဖျက်ရန်")}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Empty
              icon={ShieldCheck}
              title={t("No custom roles yet", "စိတ်ကြိုက်အခန်းကဏ္ဍ မရှိသေးပါ")}
              text={t(
                "Create a role with only the capabilities staff need.",
                "Staff လိုအပ်သည့် လုပ်ပိုင်ခွင့်များဖြင့် အခန်းကဏ္ဍဖန်တီးပါ။"
              )}
            />
          )}
        </QueryState>
      </section>
      {team.data && (
        <section className="panel table-panel">
          <div className="panel-head">
            <div>
              <div className="eyebrow">
                {t("ASSIGNMENTS", "သတ်မှတ်ထားမှုများ")}
              </div>
              <h2>{t("Team access", "အဖွဲ့ဝင်ဝင်ရောက်ခွင့်")}</h2>
            </div>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>{t("NAME", "အမည်")}</th>
                  <th>{t("BASE ROLE", "အခြေခံအခန်းကဏ္ဍ")}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {team.data
                  .filter(p => p.role !== "owner")
                  .map(p => (
                    <tr key={p.id}>
                      <td>
                        <strong>{p.name}</strong>
                        <small>{p.username}</small>
                      </td>
                      <td>
                        <Badge tone={p.role === "admin" ? "gold" : "neutral"}>
                          {p.role.toUpperCase()}
                        </Badge>
                      </td>
                      <td>
                        {ownerOnly && (
                          <button
                            className="button secondary small"
                            onClick={() =>
                              setAssign({ id: p.id, name: p.name })
                            }
                          >
                            {t("Assign role", "အခန်းကဏ္ဍသတ်မှတ်ရန်")}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {edit !== null && (
        <RoleForm role={edit || undefined} onClose={() => setEdit(null)} />
      )}
      {assign && (
        <AssignRole
          person={assign}
          roles={roles.data || []}
          onClose={() => setAssign(null)}
        />
      )}
      {deleteId !== null && (
        <Modal
          title={t("Delete custom role?", "စိတ်ကြိုက်အခန်းကဏ္ဍ ဖျက်မည်လား")}
          onClose={() => setDeleteId(null)}
        >
          <div className="alert warning">
            {t(
              "This is an audit-sensitive action. If users are assigned, deletion will be blocked; deactivate or reassign them first.",
              "ဤလုပ်ဆောင်မှုကို မှတ်တမ်းတင်ပါမည်။ အသုံးပြုသူများ သတ်မှတ်ထားပါက ဖျက်၍မရပါ၊ အရင်ပိတ်ပါ သို့မဟုတ် ပြန်သတ်မှတ်ပါ။"
            )}
          </div>
          <ErrorMessage error={remove.error} />
          <div className="modal-actions">
            <button
              className="button secondary"
              onClick={() => setDeleteId(null)}
            >
              {t("Cancel", "မလုပ်တော့ပါ")}
            </button>
            <button
              className="button danger"
              disabled={remove.isPending}
              onClick={() => remove.mutate({ id: deleteId })}
            >
              {t("Confirm delete", "ဖျက်ရန် အတည်ပြုပါ")}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
