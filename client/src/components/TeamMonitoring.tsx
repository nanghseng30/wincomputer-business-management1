import { useState } from "react";
import {
  Check,
  Clock3,
  Laptop,
  Monitor,
  Smartphone,
  Tablet,
  UserCheck,
  X,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import {
  Badge,
  dateTime,
  Empty,
  ErrorMessage,
  Field,
  Modal,
  QueryState,
  UserRole,
  useLang,
} from "@/lib/ui";

type ApprovedRole = Exclude<UserRole, "owner" | "customer">;
const roleLabel = (role: UserRole) =>
  ({
    owner: "OWNER",
    admin: "ADMIN",
    staff: "STAFF",
    accountant: "ACCOUNTANT",
    general_worker: "GENERAL WORKER",
    technician: "TECHNICIAN",
    sales: "SALES",
    marketing: "MARKETING",
    talent: "TALENT",
    customer: "CUSTOMER",
  })[role];

type AccountRequest = {
  id: number;
  username: string;
  name: string;
  requestedRole: ApprovedRole;
  phone: string;
  businessEmail: string;
  address: string;
  dateOfBirth: string | null;
  nationalId: string | null;
  emergencyContact: string | null;
  jobTitle: string;
  avatarData: string;
  status: "pending" | "approved" | "rejected";
  decisionNote: string | null;
  createdAt: Date;
};

function DeviceIcon({ type }: { type: string | null }) {
  if (type === "phone") return <Smartphone size={16} />;
  if (type === "tablet") return <Tablet size={16} />;
  if (type === "laptop") return <Laptop size={16} />;
  return <Monitor size={16} />;
}

function presenceAge(
  seconds: number | null,
  t: (en: string, mm: string) => string
) {
  if (seconds == null)
    return t("No recorded session", "ဝင်ထားသောမှတ်တမ်း မရှိပါ");
  if (seconds < 60) return t(`${seconds}s ago`, `${seconds} စက္ကန့်က`);
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return t(`${minutes}m ago`, `${minutes} မိနစ်က`);
  const hours = Math.floor(minutes / 60);
  return t(
    `${hours}h ${minutes % 60}m ago`,
    `${hours} နာရီ ${minutes % 60} မိနစ်က`
  );
}

function RequestReview({
  request,
  onClose,
}: {
  request: AccountRequest;
  onClose: () => void;
}) {
  const { t } = useLang();
  const utils = trpc.useUtils();
  const [note, setNote] = useState("");
  const decide = trpc.team.decideRequest.useMutation({
    onSuccess: () => {
      void utils.team.requests.invalidate();
      void utils.team.list.invalidate();
      void utils.presence.list.invalidate();
      void utils.notices.list.invalidate();
      onClose();
    },
  });
  return (
    <Modal
      title={t(
        "Review access request",
        "အကောင့်ဝင်ခွင့်တောင်းဆိုချက် စစ်ဆေးရန်"
      )}
      subtitle={`${request.name} · ${request.username}`}
      onClose={onClose}
    >
      <div className="request-review-head">
        <img src={request.avatarData} alt={request.name} />
        <div>
          <strong>{request.name}</strong>
          <span>{request.jobTitle}</span>
          <Badge tone={request.requestedRole === "admin" ? "gold" : "neutral"}>
            {roleLabel(request.requestedRole)}
          </Badge>
        </div>
      </div>
      <div className="review-details">
        <div>
          <span>{t("Phone", "ဖုန်း")}</span>
          <strong>{request.phone}</strong>
        </div>
        <div>
          <span>{t("Email", "အီးမေးလ်")}</span>
          <strong>{request.businessEmail}</strong>
        </div>
        <div>
          <span>{t("Address", "လိပ်စာ")}</span>
          <strong>{request.address}</strong>
        </div>
        <div>
          <span>{t("Date of birth", "မွေးသက္ကရာဇ်")}</span>
          <strong>{request.dateOfBirth || "—"}</strong>
        </div>
        <div>
          <span>{t("National ID", "မှတ်ပုံတင်")}</span>
          <strong>{request.nationalId || "—"}</strong>
        </div>
        <div>
          <span>{t("Emergency contact", "အရေးပေါ်ဆက်သွယ်ရန်")}</span>
          <strong>{request.emergencyContact || "—"}</strong>
        </div>
      </div>
      <div className="alert warning">
        {t(
          "Approval creates the account and profile immediately. Rejection keeps a decision note for the audit trail.",
          "ခွင့်ပြုလျှင် အကောင့်နှင့် Profile ကို ချက်ချင်းဖန်တီးမည်။ ငြင်းပယ်လျှင် ဆုံးဖြတ်ချက်မှတ်ချက်ကို မှတ်တမ်းတင်မည်။"
        )}
      </div>
      <Field label={t("Owner decision note", "Owner ဆုံးဖြတ်ချက်မှတ်ချက်")}>
        <textarea
          rows={3}
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder={t(
            "Optional explanation for the applicant",
            "တောင်းဆိုသူအတွက် ရှင်းလင်းချက် (ရွေးချယ်နိုင်သည်)"
          )}
        />
      </Field>
      <ErrorMessage error={decide.error} />
      <div className="modal-actions">
        <button
          className="button danger"
          disabled={decide.isPending}
          onClick={() =>
            decide.mutate({ id: request.id, decision: "rejected", note })
          }
        >
          <X size={15} /> {t("Reject request", "တောင်းဆိုချက် ငြင်းပယ်ပါ")}
        </button>
        <button
          className="button primary"
          disabled={decide.isPending}
          onClick={() =>
            decide.mutate({ id: request.id, decision: "approved", note })
          }
        >
          <Check size={15} />{" "}
          {t("Approve & create account", "ခွင့်ပြု၍ အကောင့်ဖန်တီးပါ")}
        </button>
      </div>
    </Modal>
  );
}

export function AccountRequestsPanel() {
  const { t } = useLang();
  const requests = trpc.team.requests.useQuery();
  const [selected, setSelected] = useState<AccountRequest | null>(null);
  return (
    <section className="panel monitoring-panel">
      <div className="panel-head">
        <div>
          <div className="eyebrow">{t("OWNER REVIEW", "OWNER စစ်ဆေးမှု")}</div>
          <h2>
            {t(
              "Pending account requests",
              "စောင့်ဆိုင်းနေသော အကောင့်တောင်းဆိုချက်များ"
            )}
          </h2>
        </div>
        <span className="count-label">
          {requests.data?.length ?? 0} {t("pending", "စောင့်ဆိုင်း")}
        </span>
      </div>
      <QueryState
        loading={requests.isLoading}
        error={requests.error}
        retry={() => void requests.refetch()}
      >
        {!requests.data?.length ? (
          <Empty
            icon={UserCheck}
            title={t(
              "No pending requests",
              "စောင့်ဆိုင်းနေသော တောင်းဆိုချက်မရှိပါ"
            )}
            text={t(
              "New User/Staff and Admin requests will appear here for Owner review.",
              "User/Staff နှင့် Admin တောင်းဆိုချက်အသစ်များကို Owner စစ်ဆေးရန် ဤနေရာတွင် ပြမည်။"
            )}
          />
        ) : (
          <div className="request-list">
            {requests.data.map(request => (
              <button
                className="request-row"
                key={request.id}
                onClick={() => setSelected(request)}
              >
                <img src={request.avatarData} alt="" />
                <span className="request-row-main">
                  <strong>{request.name}</strong>
                  <small>
                    {request.username} · {request.jobTitle}
                  </small>
                </span>
                <Badge
                  tone={request.requestedRole === "admin" ? "gold" : "neutral"}
                >
                  {roleLabel(request.requestedRole)}
                </Badge>
                <span className="request-row-time">
                  <Clock3 size={13} /> {dateTime(request.createdAt)}
                </span>
              </button>
            ))}
          </div>
        )}
      </QueryState>
      {selected && (
        <RequestReview request={selected} onClose={() => setSelected(null)} />
      )}
    </section>
  );
}

export function PresencePanel() {
  const { t } = useLang();
  const presence = trpc.presence.list.useQuery(undefined, {
    refetchInterval: 15000,
  });
  return (
    <section className="panel monitoring-panel">
      <div className="panel-head">
        <div>
          <div className="eyebrow">
            {t("LIVE PRESENCE", "လက်ရှိအွန်လိုင်း")}
          </div>
          <h2>
            {t("Online users & devices", "အွန်လိုင်းအသုံးပြုသူနှင့် စက်များ")}
          </h2>
        </div>
        <span className="online-count">
          <i /> {presence.data?.length ?? 0} {t("online", "အွန်လိုင်း")}
        </span>
      </div>
      <QueryState
        loading={presence.isLoading}
        error={presence.error}
        retry={() => void presence.refetch()}
      >
        {!presence.data?.length ? (
          <Empty
            icon={Monitor}
            title={t("No active sessions", "လက်ရှိအွန်လိုင်းမရှိပါ")}
            text={t(
              "Online state is refreshed every few seconds and expires automatically.",
              "အွန်လိုင်းအခြေအနေကို စက္ကန့်အနည်းငယ်တိုင်း ပြန်စစ်ပြီး အလိုအလျောက် ပျောက်ကွယ်မည်။"
            )}
          />
        ) : (
          <div className="presence-list">
            {presence.data.map(session => (
              <div className="presence-row" key={session.sessionId}>
                <div
                  className={`presence-device ${session.online ? "online" : "offline"}`}
                >
                  <DeviceIcon type={session.deviceType} />
                </div>
                <div className="presence-main">
                  <strong>{session.name}</strong>
                  <span>
                    {session.username} ·{" "}
                    {session.deviceLabel ||
                      t("Device not detected", "စက်အမျိုးအစား မသိရသေး")}
                  </span>
                </div>
                <Badge
                  tone={
                    session.role === "owner"
                      ? "gold"
                      : session.role === "admin"
                        ? "green"
                        : "neutral"
                  }
                >
                  {session.role.toUpperCase()}
                </Badge>
                <div className="presence-time">
                  <Badge tone={session.online ? "green" : "neutral"}>
                    {session.online
                      ? t("ONLINE", "အွန်လိုင်း")
                      : t("OFFLINE", "အွန်လိုင်းမရှိ")}
                  </Badge>
                  <small>
                    {session.online
                      ? t("Active now", "ယခုအသုံးပြုနေသည်")
                      : presenceAge(session.offlineSeconds, t)}
                  </small>
                  {session.lastSeenAt && (
                    <small>{dateTime(session.lastSeenAt)}</small>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </QueryState>
    </section>
  );
}
