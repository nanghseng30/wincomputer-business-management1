import { useState } from "react";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  BadgeDollarSign,
  CircleHelp,
  Clock3,
  FileText,
  MessageCircle,
  Minus,
  Phone,
  Plus,
  Printer,
  ReceiptText,
  Wallet,
  WalletCards,
  Send,
  ShoppingCart,
  Trash2,
  Users as UsersIcon,
  XCircle,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Badge,
  dateTime,
  Empty,
  ErrorMessage,
  exportExcelHtml,
  Field,
  isAdmin,
  Modal,
  money,
  PageHead,
  QueryState,
  Receipt,
  SuccessMessage,
  User,
  exportCsv,
  useLang,
} from "@/lib/ui";

type Nav = (
  section:
    | "overview"
    | "receipts"
    | "expenses"
    | "prices"
    | "catalog"
    | "roles"
    | "permissions"
    | "notices"
    | "team"
    | "maintenance"
    | "audit"
) => void;
function ReceiptStatus({ receipt }: { receipt: Receipt }) {
  const { t } = useLang();
  return receipt.status === "void" ? (
    <Badge tone="red">{t("Void", "ပယ်ဖျက်ပြီး")}</Badge>
  ) : receipt.status === "refunded" ? (
    <Badge tone="red">{t("Refunded", "ပြန်အမ်းပြီး")}</Badge>
  ) : receipt.paymentReceived ? (
    <Badge tone="green">{t("Paid", "ငွေလက်ခံပြီး")}</Badge>
  ) : (
    <Badge tone="gold">{t("Pending", "ငွေမရသေး")}</Badge>
  );
}
function PaymentName({ method }: { method: Receipt["method"] }) {
  return (
    <>
      {method === "cash" ? "Cash" : method === "kbzpay" ? "KBZPay" : "WavePay"}
    </>
  );
}
function Stat({
  label,
  value,
  note,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  note: string;
  icon: typeof Wallet;
  accent?: boolean;
}) {
  return (
    <div className={`stat-card ${accent ? "accent" : ""}`}>
      <div className="stat-top">
        <span>{label}</span>
        <div className="stat-icon">
          <Icon size={17} />
        </div>
      </div>
      <strong className="stat-value">{value}</strong>
      <p>{note}</p>
    </div>
  );
}

export function Overview({
  onNavigate,
  user,
}: {
  onNavigate: Nav;
  user: User;
}) {
  const { t } = useLang();
  const stats = trpc.overview.stats.useQuery();
  const settings = trpc.settings.get.useQuery();
  const welcome =
    settings.data?.welcomeTextMm ||
    t("Win Computer business workspace", "Win Computer မှ ကြိုဆိုပါသည်");
  const isCustomer = user.role === "customer";
  const contacts = [
    settings.data?.contactPhone && {
      label: t("Phone", "ဖုန်း"),
      value: settings.data.contactPhone,
      href: `tel:${settings.data.contactPhone}`,
      icon: Phone,
      tone: "phone",
    },
    settings.data?.contactViber && {
      label: "Viber",
      value: settings.data.contactViber,
      href: `viber://chat?number=${encodeURIComponent(settings.data.contactViber)}`,
      icon: MessageCircle,
      tone: "viber",
    },
    settings.data?.contactTelegram && {
      label: "Telegram",
      value: settings.data.contactTelegram,
      href: `https://t.me/${settings.data.contactTelegram.replace(/^@/, "")}`,
      icon: Send,
      tone: "telegram",
    },
    settings.data?.contactKbzPay && {
      label: "KBZPay",
      value: settings.data.contactKbzPay,
      href: `tel:${settings.data.contactKbzPay}`,
      icon: WalletCards,
      tone: "kbzpay",
    },
    settings.data?.contactWavePay && {
      label: "WavePay",
      value: settings.data.contactWavePay,
      href: `tel:${settings.data.contactWavePay}`,
      icon: Wallet,
      tone: "wavepay",
    },
  ].filter(Boolean) as {
    label: string;
    value: string;
    href: string;
    icon: typeof Phone;
    tone: string;
  }[];
  return (
    <>
      <PageHead
        eyebrow={t("YOUR WORKSPACE / OVERVIEW", "လုပ်ငန်းနေရာ / အနှစ်ချုပ်")}
        title={t("Overview", "အနှစ်ချုပ်")}
        description={t(
          "A clear picture of your recorded business activity.",
          "မှတ်တမ်းတင်ထားသော လုပ်ငန်းအခြေအနေကို ကြည့်ရှုပါ။"
        )}
        action={
          <div className="row-actions">
            <button
              className="button secondary"
              onClick={() => {
                if (!stats.data) return;
                const rows = stats.data.dailyReports.map(
                  row =>
                    [
                      row.date,
                      row.receipts,
                      row.total,
                      row.received,
                      row.pending,
                      row.expenses,
                      row.profit,
                    ] as Array<string | number>
                );
                const end = rows.length + 1;
                exportExcelHtml(
                  "win-computer-business-report.xls",
                  "Win Computer Business Report",
                  [
                    "Date",
                    "Receipts",
                    "Total MMK",
                    "Received MMK",
                    "Pending MMK",
                    "Expenses MMK",
                    "Profit MMK",
                  ],
                  rows,
                  [
                    ["Daily total", "=SUM(C2:C2)"],
                    ["Weekly total", `=SUM(C2:C${end})`],
                    ["Monthly total", `=SUM(C2:C${end})`],
                    ["Yearly total", `=SUM(C2:C${end})`],
                    ["Total expenses", `=SUM(F2:F${end})`],
                    ["Total profit / loss", `=SUM(G2:G${end})`],
                  ]
                );
              }}
            >
              <FileText size={16} /> {t("Excel report", "Excel စာရင်း")}
            </button>
            <button
              className="button primary"
              onClick={() => onNavigate("receipts")}
            >
              <Plus size={17} /> {t("New receipt", "ပြေစာအသစ်")}
            </button>
          </div>
        }
      />
      <section className="welcome-strip">
        <div className="welcome-copy">
          <div className="eyebrow">
            WIN COMPUTER / {isCustomer ? "CUSTOMER" : "STAFF WORKSPACE"}
          </div>
          <h2>
            {isCustomer
              ? t(
                  "Customer service, made simple.",
                  "ဖောက်သည်ဝန်ဆောင်မှုကို ရိုးရှင်းစွာ ရယူပါ။"
                )
              : t(
                  "Your team workspace is ready.",
                  "သင့်အဖွဲ့လုပ်ငန်းနေရာ အဆင်သင့်ဖြစ်ပါပြီ။"
                )}
          </h2>
          <p>{welcome}</p>
        </div>
        <div className="welcome-audience-card">
          <span className="welcome-audience-icon">
            {isCustomer ? <MessageCircle size={18} /> : <UsersIcon size={18} />}
          </span>
          <div>
            <strong>
              {isCustomer
                ? t("Customer account", "ဖောက်သည်အကောင့်")
                : t("Staff & administration", "ဝန်ထမ်းနှင့် စီမံခန့်ခွဲမှု")}
            </strong>
            <small>
              {isCustomer
                ? t(
                    "Contact Win Computer for service support.",
                    "ဝန်ဆောင်မှုအကူအညီအတွက် Win Computer ကို ဆက်သွယ်ပါ။"
                  )
                : t(
                    "Manage receipts, services and daily operations.",
                    "ပြေစာ၊ ဝန်ဆောင်မှုနှင့် နေ့စဉ်လုပ်ငန်းများကို စီမံပါ။"
                  )}
            </small>
          </div>
        </div>
        <div className="welcome-contacts">
          <span className="eyebrow">
            {t("CONTACT / PAYMENT", "ဆက်သွယ်ရန် / ငွေပေးချေမှု")}
          </span>
          {contacts.length ? (
            <div className="contact-icon-list">
              {contacts.map(contact => {
                const Icon = contact.icon;
                return (
                  <a
                    className={`contact-icon-link ${contact.tone}`}
                    href={contact.href}
                    key={`${contact.label}-${contact.value}`}
                  >
                    <Icon size={16} />
                    <span>
                      <strong>{contact.label}</strong>
                      <small>{contact.value}</small>
                    </span>
                  </a>
                );
              })}
            </div>
          ) : (
            <p>
              {t(
                "Contact details are not configured yet.",
                "ဆက်သွယ်ရန်အချက်အလက်များ မသတ်မှတ်ရသေးပါ။"
              )}
            </p>
          )}
        </div>
      </section>
      <QueryState
        loading={stats.isLoading}
        error={stats.error}
        retry={() => void stats.refetch()}
      >
        {stats.data && (
          <>
            <div className="overview-banner">
              <div>
                <div className="eyebrow light">
                  {t("BUSINESS AT A GLANCE", "လုပ်ငန်းအခြေအနေ")}
                </div>
                <h2>
                  {t(
                    "Keep the day moving.",
                    "နေ့စဉ်လုပ်ငန်းကို စနစ်တကျ ဆက်လက်ဆောင်ရွက်ပါ။"
                  )}
                </h2>
                <p>
                  {t(
                    "Every number below comes from your recorded activity.",
                    "အောက်ပါကိန်းဂဏန်းများသည် သိမ်းဆည်းထားသော မှတ်တမ်းများမှ ဖြစ်သည်။"
                  )}
                </p>
              </div>
              <div className="banner-number">
                <span>{t("TOTAL RECEIPTS", "စုစုပေါင်းပြေစာ")}</span>
                <strong>{stats.data.receiptsCount.toLocaleString()}</strong>
                <small>{t("recorded", "မှတ်တမ်းတင်ထားသည်")}</small>
              </div>
            </div>
            <div className="section-heading">
              <div>
                <span className="section-index">01</span>
                <h2>{t("Financial snapshot", "ငွေကြေးအနှစ်ချုပ်")}</h2>
              </div>
              <span>{t("ALL RECORDED ACTIVITY", "မှတ်တမ်းအားလုံး")}</span>
            </div>
            <div className="stats-grid">
              <Stat
                label={t("Recorded income", "မှတ်တမ်းတင်ဝင်ငွေ")}
                value={money(stats.data.income)}
                note={t(
                  "Payments recorded as received",
                  "ငွေလက်ခံပြီးဟု မှတ်တမ်းတင်ထားမှု"
                )}
                icon={ArrowDownLeft}
                accent
              />
              <Stat
                label={t("Refunds", "ပြန်အမ်းငွေ")}
                value={money(stats.data.refunds)}
                note={t("Recorded refund amount", "မှတ်တမ်းတင်ပြန်အမ်းငွေ")}
                icon={ArrowUpRight}
              />
              <Stat
                label={t("Expenses", "ကုန်ကျစရိတ်")}
                value={money(stats.data.expenses)}
                note={t(
                  "Recorded business costs",
                  "မှတ်တမ်းတင်ထားသော ကုန်ကျစရိတ်"
                )}
                icon={ArrowUpRight}
              />
              <Stat
                label={t("Profit / loss", "အမြတ် / အရှုံး")}
                value={money(stats.data.profit)}
                note={t(
                  "Received income minus expenses",
                  "လက်ခံဝင်ငွေမှ ကုန်ကျစရိတ်နုတ်ထားသည်"
                )}
                icon={BadgeDollarSign}
                accent={stats.data.profit >= 0}
              />
              <Stat
                label={t("Opening cash", "ကနဦးလက်ငင်းငွေ")}
                value={money(stats.data.openingCash)}
                note={
                  stats.data.openingCash == null
                    ? t("Not set", "မသတ်မှတ်ရသေး")
                    : t("Owner-entered amount", "သတ်မှတ်ထားသောပမာဏ")
                }
                icon={Wallet}
              />
              <Stat
                label={t("Cash balance", "လက်ငင်းငွေလက်ကျန်")}
                value={money(stats.data.cashBalance)}
                note={
                  stats.data.cashBalance == null
                    ? t(
                        "Set opening cash to calculate",
                        "တွက်ချက်ရန် ကနဦးငွေသတ်မှတ်ပါ"
                      )
                    : t(
                        "Opening cash + net recorded cash",
                        "ကနဦးငွေ + မှတ်တမ်းတင် အသားတင်ငွေ"
                      )
                }
                icon={BadgeDollarSign}
              />
            </div>
            <section className="panel daily-report-panel">
              <div className="panel-head">
                <div>
                  <div className="eyebrow">
                    02 / {t("DAILY REPORT", "နေ့စဉ်စာရင်း")}
                  </div>
                  <h2>{t("Seven-day activity", "ခုနစ်ရက် လုပ်ငန်းအခြေအနေ")}</h2>
                </div>
                <BarChart3 size={19} />
              </div>
              <div className="daily-chart">
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={stats.data.dailyReports}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#d8d0c2" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value: number) => money(value)} />
                    <Bar
                      dataKey="received"
                      name={t("Received", "လက်ခံပြီး")}
                      fill="#b5985a"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="pending"
                      name={t("Pending", "မရသေး")}
                      fill="#d6c7a7"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>{t("DATE", "ရက်စွဲ")}</th>
                      <th>{t("RECEIPTS", "ပြေစာ")}</th>
                      <th>{t("TOTAL", "စုစုပေါင်း")}</th>
                      <th>{t("RECEIVED", "လက်ခံပြီး")}</th>
                      <th>{t("PENDING", "မရသေး")}</th>
                      <th>{t("EXPENSES", "ကုန်ကျစရိတ်")}</th>
                      <th>{t("PROFIT / LOSS", "အမြတ် / အရှုံး")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.data.dailyReports.map(row => (
                      <tr key={row.date}>
                        <td>{row.date}</td>
                        <td>{row.receipts.toLocaleString()}</td>
                        <td>{money(row.total)}</td>
                        <td>{money(row.received)}</td>
                        <td>{money(row.pending)}</td>
                        <td>{money(row.expenses)}</td>
                        <td>{money(row.profit)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
            <div className="dashboard-grid">
              <section className="panel recent-panel">
                <div className="panel-head">
                  <div>
                    <div className="eyebrow">
                      02 / {t("LATEST ACTIVITY", "နောက်ဆုံးလုပ်ဆောင်မှု")}
                    </div>
                    <h2>{t("Recent receipts", "နောက်ဆုံးပြေစာများ")}</h2>
                  </div>
                  <button
                    className="text-button"
                    onClick={() => onNavigate("receipts")}
                  >
                    {t("View all", "အားလုံးကြည့်ရန်")} <ArrowRight size={15} />
                  </button>
                </div>
                {stats.data.recentReceipts.length === 0 ? (
                  <Empty
                    icon={ReceiptText}
                    title={t("No receipts yet", "ပြေစာမရှိသေးပါ")}
                    text={t(
                      "Created receipts will appear here.",
                      "ဖန်တီးထားသော ပြေစာများ ဤနေရာတွင် ပေါ်လာပါမည်။"
                    )}
                  />
                ) : (
                  <div className="recent-list">
                    {stats.data.recentReceipts.map(r => (
                      <div className="recent-row" key={r.id}>
                        <div className="row-icon">
                          <ReceiptText size={17} />
                        </div>
                        <div className="row-main">
                          <strong>{r.description}</strong>
                          <span>
                            {r.number} · {dateTime(r.createdAt)}
                          </span>
                        </div>
                        <div className="row-end">
                          <strong>{money(r.amount)}</strong>
                          <ReceiptStatus receipt={r} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
              <div className="dashboard-side">
                <section className="panel">
                  <div className="panel-head">
                    <div>
                      <div className="eyebrow">
                        03 / {t("PAYMENT METHODS", "ငွေပေးချေနည်းလမ်း")}
                      </div>
                      <h2>{t("By method", "နည်းလမ်းအလိုက်")}</h2>
                    </div>
                  </div>
                  <div className="method-list">
                    {(
                      [
                        ["Cash", stats.data.byMethod.cash],
                        ["KBZPay", stats.data.byMethod.kbzpay],
                        ["WavePay", stats.data.byMethod.wavepay],
                      ] as const
                    ).map(([name, value]) => (
                      <div className="method-row" key={name}>
                        <span>
                          <i /> {name}
                        </span>
                        <strong>{money(value)}</strong>
                      </div>
                    ))}
                  </div>
                  <p className="panel-note">
                    {t(
                      "Net received payments after recorded refunds.",
                      "မှတ်တမ်းတင်ထားသော လက်ခံငွေမှ ပြန်အမ်းငွေကို နုတ်ထားသည်။"
                    )}
                  </p>
                </section>
                <section className="incomplete-card">
                  <CircleHelp size={19} />
                  <div>
                    <strong>
                      {t(
                        "Profit is not yet available",
                        "အမြတ်ကို မတွက်ချက်နိုင်သေးပါ"
                      )}
                    </strong>
                    <p>
                      {t(
                        "Expenses and cost data are incomplete. No profit has been estimated.",
                        "ကုန်ကျစရိတ်နှင့် အရင်းအနှီးဒေတာ မပြည့်စုံသေးပါ။ အမြတ်ကို ခန့်မှန်းမထားပါ။"
                      )}
                    </p>
                  </div>
                </section>
              </div>
            </div>
          </>
        )}
      </QueryState>
    </>
  );
}

type PosLine = {
  key: string;
  productId?: number;
  serviceTypeId?: number;
  description: string;
  unitPrice: number;
  quantity: number;
};

export function POS() {
  const { t } = useLang();
  const utils = trpc.useUtils();
  const products = trpc.catalog.products.list.useQuery();
  const services = trpc.catalog.services.list.useQuery();
  const [cart, setCart] = useState<PosLine[]>([]);
  const [customer, setCustomer] = useState("");
  const [method, setMethod] = useState<"cash" | "kbzpay" | "wavepay">("cash");
  const [paymentReceived, setPaymentReceived] = useState(true);
  const [done, setDone] = useState(false);
  const create = trpc.receipts.create.useMutation({
    onSuccess: () => {
      void utils.receipts.list.invalidate();
      void utils.overview.stats.invalidate();
      setCart([]);
      setCustomer("");
      setDone(true);
    },
  });
  const total = cart.reduce(
    (sum, line) => sum + line.unitPrice * line.quantity,
    0
  );
  const add = (line: PosLine) =>
    setCart(current => {
      const found = current.find(item => item.key === line.key);
      return found
        ? current.map(item =>
            item.key === line.key
              ? { ...item, quantity: item.quantity + 1 }
              : item
          )
        : [...current, line];
    });
  const changeQuantity = (key: string, delta: number) =>
    setCart(current =>
      current.flatMap(item =>
        item.key === key
          ? [{ ...item, quantity: item.quantity + delta }].filter(
              x => x.quantity > 0
            )
          : [item]
      )
    );
  return (
    <>
      <PageHead
        eyebrow={t("WORKSPACE / POS", "လုပ်ငန်းနေရာ / အရောင်းစနစ်")}
        title={t("Point of Sale", "POS အရောင်းစနစ်")}
        description={t(
          "Choose a product or service, confirm the total, and issue an itemized receipt.",
          "ကုန်ပစ္စည်း သို့မဟုတ် ဝန်ဆောင်မှုရွေးပြီး စုစုပေါင်းစစ်ဆေးကာ အသေးစိတ်ပြေစာထုတ်ပါ။"
        )}
      />
      {done && (
        <SuccessMessage>
          {t(
            "Receipt created successfully.",
            "ပြေစာကို အောင်မြင်စွာ ဖန်တီးပြီးပါပြီ။"
          )}
        </SuccessMessage>
      )}
      <div className="pos-layout">
        <section className="panel pos-catalog-panel">
          <div className="panel-head">
            <div>
              <div className="eyebrow">01 / {t("ITEMS", "ပစ္စည်းများ")}</div>
              <h2>
                {t("Products & services", "ကုန်ပစ္စည်းနှင့် ဝန်ဆောင်မှုများ")}
              </h2>
            </div>
          </div>
          <div className="pos-item-grid">
            {products.data
              ?.filter(item => item.active)
              .map(item => (
                <button
                  className="pos-item"
                  key={`product-${item.id}`}
                  onClick={() =>
                    add({
                      key: `product-${item.id}`,
                      productId: item.id,
                      description: item.name,
                      unitPrice: item.salePrice,
                      quantity: 1,
                    })
                  }
                >
                  <span>{item.name}</span>
                  <strong>{money(item.salePrice)}</strong>
                  <small>
                    {item.sku} · {item.unit}
                  </small>
                </button>
              ))}
            {services.data
              ?.filter(item => item.active)
              .map(item => (
                <button
                  className="pos-item service"
                  key={`service-${item.id}`}
                  onClick={() =>
                    add({
                      key: `service-${item.id}`,
                      serviceTypeId: item.id,
                      description: item.name,
                      unitPrice: item.price,
                      quantity: 1,
                    })
                  }
                >
                  <span>{item.name}</span>
                  <strong>{money(item.price)}</strong>
                  <small>{t("Service", "ဝန်ဆောင်မှု")}</small>
                </button>
              ))}
          </div>
          {!products.data?.length && !services.data?.length && (
            <Empty
              icon={ShoppingCart}
              title={t("Catalog is empty", "ကတ်တလောက် မရှိသေးပါ")}
              text={t(
                "Add products or services in Catalog first.",
                "အရင်ဆုံး ကတ်တလောက်တွင် ကုန်ပစ္စည်း သို့မဟုတ် ဝန်ဆောင်မှုထည့်ပါ။"
              )}
            />
          )}
        </section>
        <section className="panel pos-cart-panel">
          <div className="panel-head">
            <div>
              <div className="eyebrow">
                02 / {t("CURRENT SALE", "လက်ရှိအရောင်း")}
              </div>
              <h2>{t("Cart", "ရွေးချယ်ထားသည်များ")}</h2>
            </div>
            <strong>{money(total)}</strong>
          </div>
          <div className="pos-cart-lines">
            {cart.length ? (
              cart.map(item => (
                <div className="pos-cart-line" key={item.key}>
                  <div>
                    <strong>{item.description}</strong>
                    <small>
                      {money(item.unitPrice)} × {item.quantity}
                    </small>
                  </div>
                  <div className="row-actions">
                    <button
                      className="icon-button"
                      aria-label="Decrease quantity"
                      onClick={() => changeQuantity(item.key, -1)}
                    >
                      <Minus size={14} />
                    </button>
                    <span>{item.quantity}</span>
                    <button
                      className="icon-button"
                      aria-label="Remove item"
                      onClick={() =>
                        setCart(current =>
                          current.filter(x => x.key !== item.key)
                        )
                      }
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <Empty
                icon={ShoppingCart}
                title={t("Cart is empty", "ရွေးချယ်ထားသည် မရှိသေးပါ")}
                text={t(
                  "Tap an item to add it to the sale.",
                  "အရောင်းစာရင်းထဲထည့်ရန် ပစ္စည်းတစ်ခုကို နှိပ်ပါ။"
                )}
              />
            )}
          </div>
          <form
            className="form-stack"
            onSubmit={e => {
              e.preventDefault();
              create.mutate({
                type: cart.some(item => item.productId) ? "sale" : "service",
                description: cart
                  .map(item => `${item.description} × ${item.quantity}`)
                  .join(", "),
                amount: total,
                method,
                paymentReceived,
                ...(customer.trim() ? { customer: customer.trim() } : {}),
                items: cart.map(item => ({
                  ...(item.productId
                    ? { productId: item.productId }
                    : { serviceTypeId: item.serviceTypeId }),
                  description: item.description,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                })),
              });
            }}
          >
            <Field
              label={t("Customer name (optional)", "ဝယ်သူအမည် (မဖြစ်မနေမဟုတ်)")}
            >
              <input
                value={customer}
                onChange={e => setCustomer(e.target.value)}
              />
            </Field>
            <div className="form-grid">
              <Field label={t("Payment method", "ငွေပေးချေနည်းလမ်း")}>
                <select
                  value={method}
                  onChange={e => setMethod(e.target.value as typeof method)}
                >
                  <option value="cash">Cash</option>
                  <option value="kbzpay">KBZPay</option>
                  <option value="wavepay">WavePay</option>
                </select>
              </Field>
              <label className="check-card">
                <input
                  type="checkbox"
                  checked={paymentReceived}
                  onChange={e => setPaymentReceived(e.target.checked)}
                />
                <span>
                  <strong>{t("Payment received", "ငွေလက်ခံပြီး")}</strong>
                  <small>
                    {t(
                      "Uncheck for pending payment",
                      "မရသေးလျှင် အမှန်ခြစ်ဖြုတ်ပါ"
                    )}
                  </small>
                </span>
              </label>
            </div>
            <ErrorMessage error={create.error} />
            <button
              className="button primary pos-checkout"
              disabled={create.isPending || !cart.length || total <= 0}
            >
              {create.isPending
                ? t("Creating receipt…", "ပြေစာဖန်တီးနေပါသည်…")
                : t("Complete sale", "အရောင်းပြီးစီးပါ")}
            </button>
          </form>
        </section>
      </div>
    </>
  );
}

export function Accounts() {
  const { t } = useLang();
  const stats = trpc.overview.stats.useQuery();
  const exportPeriod = (period: string) => {
    if (!stats.data) return;
    const rows = stats.data.dailyReports.map(
      row =>
        [
          row.date,
          row.receipts,
          row.total,
          row.received,
          row.pending,
          row.expenses,
          row.profit,
        ] as Array<string | number>
    );
    const end = rows.length + 1;
    exportExcelHtml(
      `win-computer-${period}-accounts.xls`,
      `Win Computer ${period} Accounts`,
      [
        "Date",
        "Receipts",
        "Sales MMK",
        "Received MMK",
        "Pending MMK",
        "Expenses MMK",
        "Profit / Loss MMK",
      ],
      rows,
      [
        [`${period} sales`, `=SUM(C2:C${end})`],
        [`${period} expenses`, `=SUM(F2:F${end})`],
        [`${period} profit / loss`, `=SUM(G2:G${end})`],
      ]
    );
  };
  return (
    <>
      <PageHead
        eyebrow={t("WORKSPACE / ACCOUNTS", "လုပ်ငန်းနေရာ / စာရင်းများ")}
        title={t("Accounts", "စာရင်းများ")}
        description={t(
          "Income, expenses and profit/loss in one place.",
          "ဝင်ငွေ၊ ကုန်ကျစရိတ်နှင့် အရှုံးအမြတ်ကို တစ်နေရာတည်းတွင် စီမံပါ။"
        )}
        action={
          <div className="row-actions">
            {["daily", "weekly", "monthly", "yearly"].map(period => (
              <button
                key={period}
                className="button secondary small"
                onClick={() => exportPeriod(period)}
              >
                {t(
                  `${period[0].toUpperCase()}${period.slice(1)} Excel`,
                  `${period} Excel`
                )}
              </button>
            ))}
          </div>
        }
      />
      <QueryState
        loading={stats.isLoading}
        error={stats.error}
        retry={() => void stats.refetch()}
      >
        {stats.data && (
          <>
            <section className="stats-grid">
              <Stat
                label={t("Sales", "အရောင်း")}
                value={money(stats.data.income)}
                note={t("Net received", "လက်ခံရရှိငွေ")}
                icon={BadgeDollarSign}
              />
              <Stat
                label={t("Expenses", "ကုန်ကျစရိတ်")}
                value={money(stats.data.expenses)}
                note={t("Recorded costs", "မှတ်တမ်းတင်ကုန်ကျစရိတ်")}
                icon={Wallet}
              />
              <Stat
                label={t("Profit / loss", "အမြတ် / အရှုံး")}
                value={money(stats.data.profit)}
                note={t(
                  "Income minus expenses",
                  "ဝင်ငွေမှ ကုန်ကျစရိတ်နုတ်ထားသည်"
                )}
                icon={BarChart3}
                accent={stats.data.profit >= 0}
              />
            </section>
            <section className="panel table-panel">
              <div className="panel-head">
                <div>
                  <div className="eyebrow">ACCOUNTING TABLE / စာရင်းဇယား</div>
                  <h2>{t("Daily accounting register", "နေ့စဉ်စာရင်းဇယား")}</h2>
                </div>
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>{t("DATE", "ရက်စွဲ")}</th>
                      <th>{t("RECEIPTS", "ပြေစာ")}</th>
                      <th>{t("SALES", "အရောင်း")}</th>
                      <th>{t("RECEIVED", "လက်ခံ")}</th>
                      <th>{t("PENDING", "မရသေး")}</th>
                      <th>{t("EXPENSES", "ကုန်ကျစရိတ်")}</th>
                      <th>{t("PROFIT / LOSS", "အမြတ် / အရှုံး")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.data.dailyReports.map(row => (
                      <tr key={row.date}>
                        <td>{row.date}</td>
                        <td>{row.receipts}</td>
                        <td>{money(row.total)}</td>
                        <td>{money(row.received)}</td>
                        <td>{money(row.pending)}</td>
                        <td>{money(row.expenses)}</td>
                        <td>{money(row.profit)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </QueryState>
    </>
  );
}

export function Expenses() {
  const { t } = useLang();
  const utils = trpc.useUtils();
  const list = trpc.expenses.list.useQuery();
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"cash" | "kbzpay" | "wavepay">("cash");
  const create = trpc.expenses.create.useMutation({
    onSuccess: () => {
      void list.refetch();
      void utils.overview.stats.invalidate();
      setCategory("");
      setDescription("");
      setAmount("");
    },
  });
  const rows = (list.data || []).map(
    item =>
      [
        new Date(item.createdAt).toISOString().slice(0, 10),
        item.category,
        item.description,
        item.method,
        item.amount,
      ] as Array<string | number>
  );
  const total = (list.data || []).reduce((sum, item) => sum + item.amount, 0);
  return (
    <>
      <PageHead
        eyebrow={t("WORKSPACE / FINANCE", "လုပ်ငန်းနေရာ / ဘဏ္ဍာရေး")}
        title={t("Expenses & profit inputs", "ကုန်ကျစရိတ်နှင့် အရှုံးအမြတ်")}
        description={t(
          "Enter real business costs and export a formula-ready report.",
          "အမှန်တကယ်ကုန်ကျစရိတ်များကို ထည့်သွင်းပြီး တွက်ချက်နိုင်သော စာရင်းကို ထုတ်ယူပါ။"
        )}
        action={
          <button
            className="button secondary"
            disabled={!list.data}
            onClick={() =>
              exportExcelHtml(
                "win-computer-expenses.xls",
                "Win Computer Expenses",
                ["Date", "Category", "Description", "Method", "Amount MMK"],
                rows,
                [["Total expenses", `=SUM(E2:E${rows.length + 1})`]]
              )
            }
          >
            <FileText size={16} /> {t("Export Excel", "Excel ထုတ်ရန်")}
          </button>
        }
      />
      <section className="panel form-panel">
        <div className="panel-head">
          <div>
            <div className="eyebrow">
              01 / {t("NEW EXPENSE", "ကုန်ကျစရိတ်အသစ်")}
            </div>
            <h2>{t("Add a business cost", "လုပ်ငန်းကုန်ကျစရိတ် ထည့်ရန်")}</h2>
          </div>
        </div>
        <form
          className="form-stack"
          onSubmit={e => {
            e.preventDefault();
            create.mutate({
              category: category.trim(),
              description: description.trim(),
              amount: Number(amount),
              method,
            });
          }}
        >
          <div className="form-grid">
            <Field label={t("Category", "အမျိုးအစား")}>
              <input
                required
                placeholder={t(
                  "Rent, salary, stock…",
                  "အိမ်ငှား၊ လစာ၊ ကုန်ပစ္စည်း…"
                )}
                value={category}
                onChange={e => setCategory(e.target.value)}
              />
            </Field>
            <Field label={t("Amount (MMK)", "ပမာဏ (ကျပ်)")}>
              <input
                required
                min="1"
                type="number"
                step="1"
                value={amount}
                onChange={e => setAmount(e.target.value)}
              />
            </Field>
          </div>
          <div className="form-grid">
            <Field label={t("Description", "အသေးစိတ်")}>
              <input
                required
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </Field>
            <Field label={t("Payment method", "ငွေပေးချေနည်းလမ်း")}>
              <select
                value={method}
                onChange={e => setMethod(e.target.value as typeof method)}
              >
                <option value="cash">Cash</option>
                <option value="kbzpay">KBZPay</option>
                <option value="wavepay">WavePay</option>
              </select>
            </Field>
          </div>
          <ErrorMessage error={create.error} />
          <div>
            <button
              className="button primary"
              disabled={
                create.isPending ||
                !category.trim() ||
                !description.trim() ||
                !amount
              }
            >
              {create.isPending
                ? t("Saving…", "သိမ်းနေပါသည်…")
                : t("Add expense", "ကုန်ကျစရိတ်ထည့်ပါ")}
            </button>
          </div>
        </form>
      </section>
      <section className="panel table-panel">
        <div className="panel-head">
          <div>
            <div className="eyebrow">
              02 / {t("EXPENSE REGISTER", "ကုန်ကျစရိတ်မှတ်တမ်း")}
            </div>
            <h2>{t("Recorded costs", "မှတ်တမ်းတင်ထားသော ကုန်ကျစရိတ်")}</h2>
          </div>
          <strong>{money(total)}</strong>
        </div>
        <QueryState
          loading={list.isLoading}
          error={list.error}
          retry={() => void list.refetch()}
        >
          {list.data?.length ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>{t("DATE", "ရက်စွဲ")}</th>
                    <th>{t("CATEGORY", "အမျိုးအစား")}</th>
                    <th>{t("DETAILS", "အသေးစိတ်")}</th>
                    <th>{t("METHOD", "နည်းလမ်း")}</th>
                    <th>{t("AMOUNT", "ပမာဏ")}</th>
                  </tr>
                </thead>
                <tbody>
                  {list.data.map(item => (
                    <tr key={item.id}>
                      <td>{dateTime(item.createdAt)}</td>
                      <td>{item.category}</td>
                      <td>{item.description}</td>
                      <td>{item.method}</td>
                      <td className="amount-cell">{money(item.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty
              icon={Wallet}
              title={t("No expenses yet", "ကုန်ကျစရိတ် မရှိသေးပါ")}
              text={t(
                "Add rent, salaries, stock and other real costs to calculate profit.",
                "အမြတ်တွက်ရန် အိမ်ငှား၊ လစာ၊ ကုန်ပစ္စည်းနှင့် အခြားကုန်ကျစရိတ်များ ထည့်ပါ။"
              )}
            />
          )}
        </QueryState>
      </section>
    </>
  );
}

function ReceiptPrint({
  receipt,
  onClose,
}: {
  receipt: Receipt;
  onClose: () => void;
}) {
  const { t } = useLang();
  return (
    <Modal
      title={t("Receipt preview", "ပြေစာအစမ်းကြည့်ရန်")}
      subtitle={t(
        "Print or choose ‘Save as PDF’ in your browser.",
        "ပုံနှိပ်ပါ သို့မဟုတ် browser တွင် ‘Save as PDF’ ရွေးပါ။"
      )}
      onClose={onClose}
    >
      <div className="receipt-paper" id="print-receipt">
        <div className="receipt-logo">
          <img src="/win-logo.png" alt="Win Computer" />
        </div>
        <div className="receipt-heading">RECEIPT / ပြေစာ</div>
        <div className="receipt-sub">{receipt.number}</div>
        <div className="receipt-dash" />
        <div className="receipt-line">
          <span>Date / ရက်စွဲ</span>
          <strong>{dateTime(receipt.createdAt)}</strong>
        </div>
        <div className="receipt-line">
          <span>Type / အမျိုးအစား</span>
          <strong>
            {receipt.type === "sale"
              ? "Sale / အရောင်း"
              : "Service / ဝန်ဆောင်မှု"}
          </strong>
        </div>
        {receipt.customer && (
          <div className="receipt-line">
            <span>Customer / ဝယ်သူ</span>
            <strong>{receipt.customer}</strong>
          </div>
        )}
        <div className="receipt-line">
          <span>By / မှတ်တမ်းတင်သူ</span>
          <strong>{receipt.createdByName}</strong>
        </div>
        <div className="receipt-dash" />
        <div className="receipt-description">
          <span>Description / အကြောင်းအရာ</span>
          <strong>{receipt.description}</strong>
        </div>
        <div className="receipt-line receipt-total">
          <span>Total / စုစုပေါင်း</span>
          <strong>{money(receipt.amount)}</strong>
        </div>
        <div className="receipt-dash" />
        <div className="receipt-line">
          <span>Method / ငွေပေးချေနည်း</span>
          <strong>
            <PaymentName method={receipt.method} />
          </strong>
        </div>
        <div className="receipt-line">
          <span>Payment / ငွေလက်ခံမှု</span>
          <strong>
            {receipt.paymentReceived
              ? "Received / လက်ခံပြီး"
              : "Not received / မရသေး"}
          </strong>
        </div>
        <div className="receipt-line">
          <span>Status / အခြေအနေ</span>
          <strong>
            {receipt.status === "active"
              ? "Active / အသက်ဝင်"
              : receipt.status === "void"
                ? "Void / ပယ်ဖျက်ပြီး"
                : "Refunded / ပြန်အမ်းပြီး"}
          </strong>
        </div>
        <div className="receipt-dash" />
        <div className="receipt-thanks">Thank you / ကျေးဇူးတင်ပါသည်</div>
      </div>
      <div className="modal-actions no-print">
        <button type="button" className="button secondary" onClick={onClose}>
          {t("Close", "ပိတ်ရန်")}
        </button>
        <button
          type="button"
          className="button primary"
          onClick={() => window.print()}
        >
          <Printer size={16} />
          {t("Print / Save as PDF", "ပုံနှိပ်ရန် / PDF သိမ်းရန်")}
        </button>
      </div>
    </Modal>
  );
}
function CreateReceipt({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (receipt: Receipt) => void;
}) {
  const { t } = useLang();
  const utils = trpc.useUtils();
  const [type, setType] = useState<"sale" | "service">("sale");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"cash" | "kbzpay" | "wavepay">("cash");
  const [paymentReceived, setPaymentReceived] = useState(false);
  const [customer, setCustomer] = useState("");
  const create = trpc.receipts.create.useMutation({
    onSuccess: r => {
      void utils.receipts.list.invalidate();
      void utils.overview.stats.invalidate();
      onCreated(r);
    },
  });
  return (
    <Modal
      title={t("Create receipt", "ပြေစာဖန်တီးပါ")}
      subtitle={t(
        "Record the actual transaction details.",
        "အမှန်တကယ်ဖြစ်ပွားသော အချက်အလက်များကို ထည့်ပါ။"
      )}
      onClose={onClose}
    >
      <form
        className="form-stack"
        onSubmit={e => {
          e.preventDefault();
          create.mutate({
            type,
            description: description.trim(),
            amount: Number(amount),
            method,
            paymentReceived,
            ...(customer.trim() ? { customer: customer.trim() } : {}),
          });
        }}
      >
        <div className="form-grid">
          <Field label={t("Receipt type", "ပြေစာအမျိုးအစား")}>
            <select
              value={type}
              onChange={e => setType(e.target.value as typeof type)}
            >
              <option value="sale">{t("Sale", "အရောင်း")}</option>
              <option value="service">
                {t("Service / repair", "ဝန်ဆောင်မှု / ပြုပြင်ရေး")}
              </option>
            </select>
          </Field>
          <Field label={t("Customer (optional)", "ဝယ်သူ (မဖြည့်လည်းရ)")}>
            <input
              value={customer}
              onChange={e => setCustomer(e.target.value)}
            />
          </Field>
        </div>
        <Field label={t("Description", "အကြောင်းအရာ")}>
          <textarea
            rows={2}
            required
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
        </Field>
        <div className="form-grid">
          <Field label={t("Amount (MMK)", "ပမာဏ (ကျပ်)")}>
            <input
              type="number"
              min="0"
              step="1"
              required
              value={amount}
              onChange={e => setAmount(e.target.value)}
            />
          </Field>
          <Field label={t("Payment method", "ငွေပေးချေနည်းလမ်း")}>
            <select
              value={method}
              onChange={e => setMethod(e.target.value as typeof method)}
            >
              <option value="cash">Cash</option>
              <option value="kbzpay">KBZPay</option>
              <option value="wavepay">WavePay</option>
            </select>
          </Field>
        </div>
        <label className="check-card">
          <input
            type="checkbox"
            checked={paymentReceived}
            onChange={e => setPaymentReceived(e.target.checked)}
          />
          <span>
            <strong>
              {t("Payment has been received", "ငွေကို လက်ခံရရှိပြီးဖြစ်သည်")}
            </strong>
            <small>
              {t(
                "Selecting a method alone does not confirm payment.",
                "ငွေပေးချေနည်းလမ်းရွေးချယ်ရုံဖြင့် ငွေလက်ခံပြီးဟု မသတ်မှတ်ပါ။"
              )}
            </small>
          </span>
        </label>
        <ErrorMessage error={create.error} />
        <div className="modal-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            {t("Cancel", "မလုပ်တော့ပါ")}
          </button>
          <button
            className="button primary"
            disabled={create.isPending || !description.trim()}
          >
            {create.isPending
              ? t("Saving…", "သိမ်းနေပါသည်…")
              : t("Create receipt", "ပြေစာဖန်တီးပါ")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
function TransitionReceipt({
  receipt,
  onClose,
}: {
  receipt: Receipt;
  onClose: () => void;
}) {
  const { t } = useLang();
  const utils = trpc.useUtils();
  const [reason, setReason] = useState("");
  const [approvalPassword, setApproval] = useState("");
  const action = receipt.paymentReceived ? "refund" : "void";
  const transition = trpc.receipts.transition.useMutation({
    onSuccess: () => {
      void utils.receipts.list.invalidate();
      void utils.overview.stats.invalidate();
      onClose();
    },
  });
  return (
    <Modal
      title={
        action === "refund"
          ? t("Refund receipt", "ပြေစာပြန်အမ်းရန်")
          : t("Void receipt", "ပြေစာပယ်ဖျက်ရန်")
      }
      subtitle={`${receipt.number} · ${money(receipt.amount)}`}
      onClose={onClose}
    >
      <div className="alert warning">
        {action === "refund"
          ? t(
              "This records a refund for a received payment. The action is audited.",
              "လက်ခံရရှိထားသောငွေကို ပြန်အမ်းကြောင်း မှတ်တမ်းတင်မည်။ လုပ်ဆောင်မှုကို မှတ်တမ်းတင်ပါမည်။"
            )
          : t(
              "This voids an unpaid receipt. The action is audited.",
              "ငွေမရသေးသော ပြေစာကို ပယ်ဖျက်မည်။ လုပ်ဆောင်မှုကို မှတ်တမ်းတင်ပါမည်။"
            )}
      </div>
      <form
        className="form-stack"
        onSubmit={e => {
          e.preventDefault();
          transition.mutate({
            id: receipt.id,
            action,
            reason: reason.trim(),
            approvalPassword,
          });
        }}
      >
        <Field label={t("Reason", "အကြောင်းရင်း")}>
          <textarea
            rows={3}
            required
            value={reason}
            onChange={e => setReason(e.target.value)}
          />
        </Field>
        <Field
          label={t(
            "Owner / admin approval password",
            "Owner / Admin ခွင့်ပြုချက်စကားဝှက်"
          )}
        >
          <input
            type="password"
            required
            autoComplete="off"
            value={approvalPassword}
            onChange={e => setApproval(e.target.value)}
          />
        </Field>
        <ErrorMessage error={transition.error} />
        <div className="modal-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            {t("Cancel", "မလုပ်တော့ပါ")}
          </button>
          <button
            className="button danger"
            disabled={transition.isPending || !reason.trim()}
          >
            {action === "refund"
              ? t("Confirm refund", "ပြန်အမ်းကြောင်း အတည်ပြုပါ")
              : t("Confirm void", "ပယ်ဖျက်ကြောင်း အတည်ပြုပါ")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
export function Receipts() {
  const { t } = useLang();
  const list = trpc.receipts.list.useQuery();
  const [creating, setCreating] = useState(false);
  const [printing, setPrinting] = useState<Receipt | null>(null);
  const [transition, setTransition] = useState<Receipt | null>(null);
  const visibleReceipts = list.data ?? [];
  return (
    <>
      <PageHead
        eyebrow={t("WORKSPACE / TRANSACTIONS", "လုပ်ငန်းနေရာ / အရောင်းအဝယ်")}
        title={t("Receipts", "ပြေစာများ")}
        description={t(
          "Create and manage sales and service records.",
          "အရောင်းနှင့် ဝန်ဆောင်မှုမှတ်တမ်းများ ဖန်တီးစီမံပါ။"
        )}
        action={
          <button className="button primary" onClick={() => setCreating(true)}>
            <Plus size={17} />
            {t("New receipt", "ပြေစာအသစ်")}
          </button>
        }
      />
      <section className="panel table-panel">
        <div className="panel-head">
          <div>
            <div className="eyebrow">
              {t("TRANSACTION REGISTER", "အရောင်းအဝယ်မှတ်တမ်း")}
            </div>
            <h2>{t("All receipts", "ပြေစာအားလုံး")}</h2>
          </div>
          <div className="panel-actions">
            <span className="count-label">
              {visibleReceipts.length} {t("records", "ခု")}
            </span>
          </div>
        </div>
        <QueryState
          loading={list.isLoading}
          error={list.error}
          retry={() => void list.refetch()}
        >
          {visibleReceipts.length === 0 ? (
            <Empty
              icon={ReceiptText}
              title={t("No receipts yet", "ပြေစာမရှိသေးပါ")}
              text={t(
                "Create a receipt when you record your first sale or service.",
                "ပထမဆုံး အရောင်း သို့မဟုတ် ဝန်ဆောင်မှုကို မှတ်တမ်းတင်သည့်အခါ ပြေစာဖန်တီးပါ။"
              )}
            />
          ) : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>{t("RECEIPT / DATE", "ပြေစာ / ရက်စွဲ")}</th>
                    <th>{t("DETAILS", "အကြောင်းအရာ")}</th>
                    <th>{t("PAYMENT", "ငွေပေးချေမှု")}</th>
                    <th>{t("AMOUNT", "ပမာဏ")}</th>
                    <th>{t("STATUS", "အခြေအနေ")}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {visibleReceipts.map(r => (
                    <tr key={r.id}>
                      <td>
                        <strong>{r.number}</strong>
                        <small>{dateTime(r.createdAt)}</small>
                      </td>
                      <td>
                        <strong>{r.description}</strong>
                        <small>
                          {r.type === "sale"
                            ? t("Sale", "အရောင်း")
                            : t("Service", "ဝန်ဆောင်မှု")}
                          {r.customer ? ` · ${r.customer}` : ""} ·{" "}
                          {r.createdByName}
                        </small>
                      </td>
                      <td>
                        <PaymentName method={r.method} />
                        <small>
                          {r.paymentReceived
                            ? t("Received", "လက်ခံပြီး")
                            : t("Not received", "မရသေး")}
                        </small>
                      </td>
                      <td className="amount-cell">{money(r.amount)}</td>
                      <td>
                        <ReceiptStatus receipt={r} />
                      </td>
                      <td>
                        <div className="row-actions">
                          <button
                            className="icon-button"
                            aria-label={t("Print receipt", "ပြေစာပုံနှိပ်ရန်")}
                            title={t("Print receipt", "ပြေစာပုံနှိပ်ရန်")}
                            onClick={() => setPrinting(r)}
                          >
                            <Printer size={17} />
                          </button>
                          {r.status === "active" && (
                            <button
                              className="icon-button"
                              aria-label={
                                r.paymentReceived
                                  ? t("Refund", "ပြန်အမ်းရန်")
                                  : t("Void", "ပယ်ဖျက်ရန်")
                              }
                              title={
                                r.paymentReceived
                                  ? t("Refund", "ပြန်အမ်းရန်")
                                  : t("Void", "ပယ်ဖျက်ရန်")
                              }
                              onClick={() => setTransition(r)}
                            >
                              <XCircle size={17} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </QueryState>
      </section>
      {creating && (
        <CreateReceipt
          onClose={() => setCreating(false)}
          onCreated={r => {
            setCreating(false);
            setPrinting(r);
          }}
        />
      )}
      {printing && (
        <ReceiptPrint receipt={printing} onClose={() => setPrinting(null)} />
      )}
      {transition && (
        <TransitionReceipt
          receipt={transition}
          onClose={() => setTransition(null)}
        />
      )}
    </>
  );
}

function PriceEditor({
  price,
  onClose,
}: {
  price: { id: number; nameEn: string; nameMm: string; amount: number | null };
  onClose: () => void;
}) {
  const { t } = useLang();
  const utils = trpc.useUtils();
  const [amount, setAmount] = useState(
    price.amount == null ? "" : String(price.amount)
  );
  const update = trpc.prices.update.useMutation({
    onSuccess: () => {
      void utils.prices.list.invalidate();
      onClose();
    },
  });
  return (
    <Modal
      title={t("Edit service price", "ဝန်ဆောင်မှုစျေးနှုန်းပြင်ရန်")}
      subtitle={t(price.nameEn, price.nameMm)}
      onClose={onClose}
    >
      <form
        className="form-stack"
        onSubmit={e => {
          e.preventDefault();
          update.mutate({
            id: price.id,
            amount: amount === "" ? null : Number(amount),
          });
        }}
      >
        <Field
          label={t("Price (MMK)", "စျေးနှုန်း (ကျပ်)")}
          hint={t(
            "Leave blank to mark this price as not set.",
            "စျေးနှုန်းမသတ်မှတ်လိုပါက ဗလာထားပါ။"
          )}
        >
          <input
            type="number"
            min="0"
            step="1"
            value={amount}
            onChange={e => setAmount(e.target.value)}
          />
        </Field>
        <ErrorMessage error={update.error} />
        <div className="modal-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            {t("Cancel", "မလုပ်တော့ပါ")}
          </button>
          <button className="button primary" disabled={update.isPending}>
            {t("Save price", "စျေးနှုန်းသိမ်းပါ")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
export function Prices({ user, onNavigate }: { user: User; onNavigate: Nav }) {
  const { t } = useLang();
  const prices = trpc.prices.list.useQuery();
  const permissions = trpc.permissions.list.useQuery(undefined, {
    enabled: !isAdmin(user) && user.role !== "customer",
  });
  const [edit, setEdit] = useState<{
    id: number;
    nameEn: string;
    nameMm: string;
    amount: number | null;
  } | null>(null);
  const allowed =
    isAdmin(user) ||
    !!permissions.data?.some(
      p => p.capability === "manage_prices" && p.status === "approved"
    );
  return (
    <>
      <PageHead
        eyebrow={t("WORKSPACE / SERVICES", "လုပ်ငန်းနေရာ / ဝန်ဆောင်မှုများ")}
        title={t("Service prices", "ဝန်ဆောင်မှုစျေးနှုန်းများ")}
        description={t(
          "Reference prices for your services. Changes are recorded in the activity log.",
          "ဝန်ဆောင်မှုများအတွက် စျေးနှုန်းများ။ ပြောင်းလဲမှုများကို မှတ်တမ်းတင်ပါသည်။"
        )}
      />
      {!allowed && (
        <div className="permission-banner">
          <div>
            <ShieldNotice />
            <strong>
              {t(
                "Price editing requires owner-approved access",
                "စျေးနှုန်းပြင်ရန် Owner ခွင့်ပြုချက်လိုအပ်သည်"
              )}
            </strong>
            <p>
              {t(
                "The Owner or an approved team member can change service prices. Every change is recorded.",
                "Owner သို့မဟုတ် Owner ခွင့်ပြုထားသော အဖွဲ့ဝင်က ဝန်ဆောင်မှုစျေးနှုန်းကို ပြောင်းလဲနိုင်သည်။ ပြောင်းလဲမှုတိုင်းကို မှတ်တမ်းတင်မည်။"
              )}
            </p>
            {permissions.error && <ErrorMessage error={permissions.error} />}
          </div>
          {!isAdmin(user) && user.role !== "customer" && (
            <button
              className="button secondary small"
              onClick={() => onNavigate("permissions")}
            >
              {t("Request access", "ခွင့်ပြုချက်တောင်းရန်")}
              <ArrowRight size={14} />
            </button>
          )}
        </div>
      )}
      <section className="panel">
        <div className="panel-head">
          <div>
            <div className="eyebrow">{t("PRICE LIST", "စျေးနှုန်းစာရင်း")}</div>
            <h2>{t("Services", "ဝန်ဆောင်မှုများ")}</h2>
          </div>
          <div className="panel-actions">
            <span className="count-label">MMK</span>
            {prices.data && (
              <button
                className="button secondary small"
                onClick={() =>
                  exportCsv("win-computer-service-prices.csv", [
                    ["Service", "Category", "Amount MMK", "Updated"],
                    ...prices.data!.map(p => [
                      p.nameEn,
                      p.nameMm,
                      p.amount,
                      p.updatedAt ? dateTime(p.updatedAt) : "",
                    ]),
                  ])
                }
              >
                {t("Export Excel", "Excel ထုတ်ရန်")}
              </button>
            )}
          </div>
        </div>
        <QueryState
          loading={prices.isLoading}
          error={prices.error}
          retry={() => void prices.refetch()}
        >
          {prices.data?.length === 0 ? (
            <Empty
              icon={FileText}
              title={t("No services available", "ဝန်ဆောင်မှုစာရင်း မရှိသေးပါ")}
              text={t(
                "Service categories will appear here when available.",
                "ဝန်ဆောင်မှုအမျိုးအစားများ ရရှိပါက ဤနေရာတွင် ပြသမည်။"
              )}
            />
          ) : (
            <div className="price-list">
              {prices.data?.map((price, i) => (
                <div className="price-row" key={price.id}>
                  <span className="price-index">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="price-name">
                    <strong>{t(price.nameEn, price.nameMm)}</strong>
                    <span>
                      {price.updatedAt
                        ? `${t("Updated", "ပြင်ဆင်ချိန်")} ${dateTime(price.updatedAt)}`
                        : t(
                            "No price update recorded",
                            "စျေးနှုန်းပြင်ဆင်မှု မရှိသေးပါ"
                          )}
                    </span>
                  </div>
                  <div className="price-value">
                    {price.amount == null ? (
                      <Badge>{t("Not set", "မသတ်မှတ်ရသေး")}</Badge>
                    ) : (
                      <strong>{money(price.amount)}</strong>
                    )}
                  </div>
                  {allowed && (
                    <button
                      className="button secondary small"
                      onClick={() => setEdit(price)}
                    >
                      {t("Edit", "ပြင်ရန်")}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </QueryState>
      </section>
      {edit && <PriceEditor price={edit} onClose={() => setEdit(null)} />}
    </>
  );
}
function ShieldNotice() {
  return (
    <span className="permission-icon">
      <Clock3 size={17} />
    </span>
  );
}
