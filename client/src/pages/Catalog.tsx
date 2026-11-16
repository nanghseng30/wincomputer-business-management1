import { useState } from "react";
import { Boxes, Plus, Tags, Wrench } from "lucide-react";
import { trpc } from "@/lib/trpc";
import {
  Badge,
  Empty,
  ErrorMessage,
  Field,
  isAdmin,
  Modal,
  money,
  PageHead,
  QueryState,
  SuccessMessage,
  User,
  useLang,
} from "@/lib/ui";

type Tab = "categories" | "products" | "services";

function CategoryForm({ onClose }: { onClose: () => void }) {
  const { t } = useLang();
  const utils = trpc.useUtils();
  const [name, setName] = useState("");
  const create = trpc.catalog.categories.create.useMutation({
    onSuccess: () => {
      void utils.catalog.categories.list.invalidate();
      onClose();
    },
  });
  return (
    <Modal
      title={t("Create product category", "ကုန်ပစ္စည်းအမျိုးအစား ဖန်တီးရန်")}
      onClose={onClose}
    >
      <form
        className="form-stack"
        onSubmit={e => {
          e.preventDefault();
          create.mutate({ name: name.trim() });
        }}
      >
        <Field label={t("Category name", "အမျိုးအစားအမည်")}>
          <input
            required
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </Field>
        <ErrorMessage error={create.error} />
        <div className="modal-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            {t("Cancel", "မလုပ်တော့ပါ")}
          </button>
          <button
            className="button primary"
            disabled={create.isPending || !name.trim()}
          >
            {create.isPending
              ? t("Saving…", "သိမ်းနေပါသည်…")
              : t("Create category", "အမျိုးအစားဖန်တီးပါ")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
function ProductForm({
  product,
  categories,
  onClose,
}: {
  product?: {
    id: number;
    categoryId: number | null;
    sku: string;
    name: string;
    unit: string;
    purchasePrice: number;
    salePrice: number;
    active: boolean;
  };
  categories: { id: number; name: string }[];
  onClose: () => void;
}) {
  const { t } = useLang();
  const utils = trpc.useUtils();
  const [categoryId, setCategory] = useState(
    product?.categoryId ? String(product.categoryId) : ""
  );
  const [sku, setSku] = useState(product?.sku || "");
  const [name, setName] = useState(product?.name || "");
  const [unit, setUnit] = useState(product?.unit || "pcs");
  const [purchasePrice, setPurchase] = useState(
    String(product?.purchasePrice ?? "")
  );
  const [salePrice, setSale] = useState(String(product?.salePrice ?? ""));
  const [active, setActive] = useState(product?.active ?? true);
  const common = {
    categoryId: categoryId ? Number(categoryId) : null,
    sku: sku.trim(),
    name: name.trim(),
    unit: unit.trim(),
    purchasePrice: Number(purchasePrice),
    salePrice: Number(salePrice),
    active,
  };
  const create = trpc.catalog.products.create.useMutation({
    onSuccess: () => {
      void utils.catalog.products.list.invalidate();
      onClose();
    },
  });
  const update = trpc.catalog.products.update.useMutation({
    onSuccess: () => {
      void utils.catalog.products.list.invalidate();
      onClose();
    },
  });
  return (
    <Modal
      title={
        product
          ? t("Edit product", "ကုန်ပစ္စည်းပြင်ရန်")
          : t("Create product", "ကုန်ပစ္စည်းဖန်တီးရန်")
      }
      onClose={onClose}
    >
      <form
        className="form-stack"
        onSubmit={e => {
          e.preventDefault();
          if (product) update.mutate({ id: product.id, ...common });
          else create.mutate(common);
        }}
      >
        <div className="form-grid">
          <Field label={t("Category", "အမျိုးအစား")}>
            <select
              value={categoryId}
              onChange={e => setCategory(e.target.value)}
            >
              <option value="">{t("Uncategorized", "အမျိုးအစားမရှိ")}</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("SKU", "SKU")}>
            <input
              required
              value={sku}
              onChange={e => setSku(e.target.value)}
            />
          </Field>
        </div>
        <div className="form-grid">
          <Field label={t("Product name", "ကုန်ပစ္စည်းအမည်")}>
            <input
              required
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </Field>
          <Field label={t("Unit", "ယူနစ်")}>
            <input
              required
              value={unit}
              onChange={e => setUnit(e.target.value)}
            />
          </Field>
        </div>
        <div className="form-grid">
          <Field label={t("Purchase price (MMK)", "ဝယ်ဈေး (ကျပ်)")}>
            <input
              type="number"
              min="0"
              step="1"
              required
              value={purchasePrice}
              onChange={e => setPurchase(e.target.value)}
            />
          </Field>
          <Field label={t("Sale price (MMK)", "ရောင်းဈေး (ကျပ်)")}>
            <input
              type="number"
              min="0"
              step="1"
              required
              value={salePrice}
              onChange={e => setSale(e.target.value)}
            />
          </Field>
        </div>
        <label className="check-card">
          <input
            type="checkbox"
            checked={active}
            onChange={e => setActive(e.target.checked)}
          />
          <span>
            <strong>{t("Active", "အသက်ဝင်")}</strong>
            <small>
              {t(
                "Available for daily operations",
                "နေ့စဉ်လုပ်ငန်းတွင် အသုံးပြုနိုင်သည်"
              )}
            </small>
          </span>
        </label>
        <ErrorMessage error={create.error || update.error} />
        <div className="modal-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            {t("Cancel", "မလုပ်တော့ပါ")}
          </button>
          <button
            className="button primary"
            disabled={
              create.isPending ||
              update.isPending ||
              !sku.trim() ||
              !name.trim() ||
              !unit.trim()
            }
          >
            {t("Save product", "ကုန်ပစ္စည်းသိမ်းပါ")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
function ServiceForm({
  service,
  onClose,
}: {
  service?: { id: number; name: string; price: number; active: boolean };
  onClose: () => void;
}) {
  const { t } = useLang();
  const utils = trpc.useUtils();
  const [name, setName] = useState(service?.name || "");
  const [price, setPrice] = useState(String(service?.price ?? ""));
  const [active, setActive] = useState(service?.active ?? true);
  const create = trpc.catalog.services.create.useMutation({
    onSuccess: () => {
      void utils.catalog.services.list.invalidate();
      onClose();
    },
  });
  const update = trpc.catalog.services.update.useMutation({
    onSuccess: () => {
      void utils.catalog.services.list.invalidate();
      onClose();
    },
  });
  return (
    <Modal
      title={
        service
          ? t("Edit service", "ဝန်ဆောင်မှု ပြင်ရန်")
          : t("Create service", "ဝန်ဆောင်မှု ဖန်တီးရန်")
      }
      onClose={onClose}
    >
      <form
        className="form-stack"
        onSubmit={e => {
          e.preventDefault();
          const input = { name: name.trim(), price: Number(price), active };
          if (service) update.mutate({ id: service.id, ...input });
          else create.mutate(input);
        }}
      >
        <Field label={t("Service name", "ဝန်ဆောင်မှုအမည်")}>
          <input
            required
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </Field>
        <Field label={t("Price (MMK)", "စျေးနှုန်း (ကျပ်)")}>
          <input
            type="number"
            min="0"
            step="1"
            required
            value={price}
            onChange={e => setPrice(e.target.value)}
          />
        </Field>
        <label className="check-card">
          <input
            type="checkbox"
            checked={active}
            onChange={e => setActive(e.target.checked)}
          />
          <span>
            <strong>{t("Active", "အသက်ဝင်")}</strong>
          </span>
        </label>
        <ErrorMessage error={create.error || update.error} />
        <div className="modal-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            {t("Cancel", "မလုပ်တော့ပါ")}
          </button>
          <button
            className="button primary"
            disabled={
              create.isPending ||
              update.isPending ||
              !name.trim() ||
              price === "" ||
              !Number.isFinite(Number(price)) ||
              Number(price) < 0
            }
          >
            {t("Save service", "ဝန်ဆောင်မှုသိမ်းပါ")}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function Catalog({ user }: { user: User }) {
  const { t } = useLang();
  const canWrite = isAdmin(user);
  const [tab, setTab] = useState<Tab>("categories");
  const [categoryForm, setCategoryForm] = useState(false);
  const [productForm, setProductForm] = useState<
    | null
    | {
        id: number;
        categoryId: number | null;
        sku: string;
        name: string;
        unit: string;
        purchasePrice: number;
        salePrice: number;
        active: boolean;
      }
    | false
  >(null);
  const [serviceForm, setServiceForm] = useState<
    null | { id: number; name: string; price: number; active: boolean } | false
  >(null);
  const categories = trpc.catalog.categories.list.useQuery(undefined, {
    enabled: tab === "categories" || tab === "products",
  });
  const products = trpc.catalog.products.list.useQuery(undefined, {
    enabled: tab === "products",
  });
  const services = trpc.catalog.services.list.useQuery(undefined, {
    enabled: tab === "services",
  });
  return (
    <>
      <PageHead
        eyebrow={t("WORKSPACE / CATALOG", "လုပ်ငန်းနေရာ / ကတ်တလောက်")}
        title={t("Catalog", "ကတ်တလောက်")}
        description={t(
          "Manage products, categories and services used in daily operations.",
          "နေ့စဉ်လုပ်ငန်းတွင် အသုံးပြုသော ကုန်ပစ္စည်း၊ အမျိုးအစားနှင့် ဝန်ဆောင်မှုများကို စီမံပါ။"
        )}
        action={
          canWrite && (
            <button
              className="button primary"
              onClick={() =>
                tab === "categories"
                  ? setCategoryForm(true)
                  : tab === "products"
                    ? setProductForm(false)
                    : setServiceForm(false)
              }
            >
              <Plus size={16} />
              {tab === "services"
                ? t("Add service", "ဝန်ဆောင်မှုထည့်ရန်")
                : t("Add", "ထည့်ရန်")}
            </button>
          )
        }
      />
      <div className="tabs">
        <button
          className={tab === "categories" ? "active" : ""}
          onClick={() => setTab("categories")}
        >
          <Tags size={15} />
          {t("Product categories", "ကုန်ပစ္စည်းအမျိုးအစားများ")}
        </button>
        <button
          className={tab === "products" ? "active" : ""}
          onClick={() => setTab("products")}
        >
          <Boxes size={15} />
          {t("Products", "ကုန်ပစ္စည်းများ")}
        </button>
        <button
          className={tab === "services" ? "active" : ""}
          onClick={() => setTab("services")}
        >
          <Wrench size={15} />
          {t("Services", "ဝန်ဆောင်မှုများ")}
        </button>
      </div>
      {tab === "services" && (
        <div className="panel service-panel-intro">
          <strong>{t("ဝန်ဆောင်မှုထည့်ရန်", "ဝန်ဆောင်မှုထည့်ရန်")}</strong>
          <span>
            {t(
              "Service name, MMK price and active status are recorded in the audit log.",
              "ဝန်ဆောင်မှုအမည်၊ ကျပ်စျေးနှုန်းနှင့် အသက်ဝင်မှုကို မှတ်တမ်းတင်မည်။"
            )}
          </span>
        </div>
      )}
      {!canWrite && (
        <div className="permission-banner">
          <div>
            <strong>
              {t(
                "Catalog management is available to Admin and Owner",
                "ကတ်တလောက် စီမံခန့်ခွဲမှုကို Admin နှင့် Owner ပြုလုပ်နိုင်သည်"
              )}
            </strong>
            <p>
              {t(
                "Products, categories and services remain visible to the team; Admin and Owner can create or edit them.",
                "ကုန်ပစ္စည်း၊ အမျိုးအစားနှင့် ဝန်ဆောင်မှုများကို အဖွဲ့က ကြည့်နိုင်ပြီး Admin နှင့် Owner က ဖန်တီး/ပြင်ဆင်နိုင်သည်။"
              )}
            </p>
          </div>
        </div>
      )}
      <section className="panel table-panel">
        <QueryState
          loading={
            tab === "categories"
              ? categories.isLoading
              : tab === "products"
                ? categories.isLoading || products.isLoading
                : services.isLoading
          }
          error={
            tab === "categories"
              ? categories.error
              : tab === "products"
                ? categories.error || products.error
                : services.error
          }
          retry={() => {
            if (tab === "categories" || tab === "products")
              void categories.refetch();
            if (tab === "products") void products.refetch();
            if (tab === "services") void services.refetch();
          }}
        >
          {tab === "categories" ? (
            <>
              {categories.data?.length ? (
                <div className="recent-list">
                  {categories.data.map(c => (
                    <div className="recent-row" key={c.id}>
                      <div className="row-main">
                        <strong>{c.name}</strong>
                        <span>
                          {c.active
                            ? t("Active", "အသက်ဝင်")
                            : t("Inactive", "မလှုပ်ရှား")}
                        </span>
                      </div>
                      <Badge tone={c.active ? "green" : "neutral"}>
                        {c.active
                          ? t("Active", "အသက်ဝင်")
                          : t("Inactive", "မလှုပ်ရှား")}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <Empty
                  icon={Tags}
                  title={t("No categories yet", "အမျိုးအစားမရှိသေးပါ")}
                  text={t(
                    "Create a category to organize products.",
                    "ကုန်ပစ္စည်းများ စီစဉ်ရန် အမျိုးအစားဖန်တီးပါ။"
                  )}
                />
              )}
            </>
          ) : tab === "products" ? (
            <>
              {products.data?.length ? (
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>{t("PRODUCT / SKU", "ကုန်ပစ္စည်း / SKU")}</th>
                        <th>{t("CATEGORY", "အမျိုးအစား")}</th>
                        <th>{t("PRICES", "စျေးနှုန်းများ")}</th>
                        <th>{t("STATUS", "အခြေအနေ")}</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {products.data.map(p => (
                        <tr key={p.id}>
                          <td>
                            <strong>{p.name}</strong>
                            <small>
                              {p.sku} · {p.unit}
                            </small>
                          </td>
                          <td>
                            {categories.data?.find(c => c.id === p.categoryId)
                              ?.name || "—"}
                          </td>
                          <td>
                            {money(p.purchasePrice)}
                            <small>{money(p.salePrice)}</small>
                          </td>
                          <td>
                            <Badge tone={p.active ? "green" : "neutral"}>
                              {p.active
                                ? t("Active", "အသက်ဝင်")
                                : t("Inactive", "မလှုပ်ရှား")}
                            </Badge>
                          </td>
                          <td>
                            {canWrite && (
                              <button
                                className="button secondary small"
                                onClick={() => setProductForm(p)}
                              >
                                {t("Edit", "ပြင်ရန်")}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <Empty
                  icon={Boxes}
                  title={t("No products yet", "ကုန်ပစ္စည်းမရှိသေးပါ")}
                  text={t(
                    "Add products to keep stock information ready.",
                    "လက်ကျန်အချက်အလက်များအတွက် ကုန်ပစ္စည်းထည့်ပါ။"
                  )}
                />
              )}
            </>
          ) : (
            <>
              {services.data?.length ? (
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>{t("SERVICE", "ဝန်ဆောင်မှု")}</th>
                        <th>{t("PRICE", "စျေးနှုန်း")}</th>
                        <th>{t("STATUS", "အခြေအနေ")}</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {services.data.map(s => (
                        <tr key={s.id}>
                          <td>
                            <strong>{s.name}</strong>
                          </td>
                          <td>{money(s.price)}</td>
                          <td>
                            <Badge tone={s.active ? "green" : "neutral"}>
                              {s.active
                                ? t("Active", "အသက်ဝင်")
                                : t("Inactive", "မလှုပ်ရှား")}
                            </Badge>
                          </td>
                          <td>
                            {canWrite && (
                              <button
                                className="button secondary small"
                                onClick={() => setServiceForm(s)}
                              >
                                {t("Edit", "ပြင်ရန်")}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <Empty
                  icon={Wrench}
                  title={t("No services yet", "ဝန်ဆောင်မှုမရှိသေးပါ")}
                  text={t(
                    "Add services and their prices here.",
                    "ဝန်ဆောင်မှုနှင့် စျေးနှုန်းများကို ဤနေရာတွင် ထည့်ပါ။"
                  )}
                />
              )}
            </>
          )}
        </QueryState>
      </section>
      {categoryForm && <CategoryForm onClose={() => setCategoryForm(false)} />}
      {productForm !== null && (
        <ProductForm
          product={productForm || undefined}
          categories={categories.data || []}
          onClose={() => setProductForm(null)}
        />
      )}
      {serviceForm !== null && (
        <ServiceForm
          service={serviceForm || undefined}
          onClose={() => setServiceForm(null)}
        />
      )}
    </>
  );
}
