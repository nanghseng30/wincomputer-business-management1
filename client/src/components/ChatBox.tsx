import { useState } from "react";
import { ImagePlus, MessageCircle, Send, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { compressAvatar } from "@/lib/avatar";
import {
  Badge,
  dateTime,
  Empty,
  ErrorMessage,
  PageHead,
  QueryState,
  User,
  useLang,
} from "@/lib/ui";

export default function ChatBox({ user }: { user: User }) {
  const { t } = useLang();
  const contacts = trpc.chat.contacts.useQuery();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [body, setBody] = useState("");
  const [attachmentData, setAttachmentData] = useState("");
  const [attachmentError, setAttachmentError] = useState("");
  const selected =
    contacts.data?.find(contact => contact.id === selectedId) ??
    contacts.data?.[0];
  const messages = trpc.chat.messages.useQuery(
    { userId: selected?.id ?? 0 },
    { enabled: Boolean(selected?.id), refetchInterval: 5000 }
  );
  const utils = trpc.useUtils();
  const send = trpc.chat.send.useMutation({
    onSuccess: () => {
      setBody("");
      setAttachmentData("");
      setAttachmentError("");
      void messages.refetch();
      void utils.notices.list.invalidate();
    },
  });
  return (
    <>
      <PageHead
        eyebrow={t("WORKSPACE / CHAT", "လုပ်ငန်းနေရာ / စကားပြောရန်")}
        title={t("Internal chat", "အတွင်းရေး Chat")}
        description={t(
          "Send respectful messages to approved users and administrators.",
          "ခွင့်ပြုထားသော အသုံးပြုသူများနှင့် Admin များထံ လေးစားစွာ စာပို့နိုင်ပါသည်။"
        )}
      />
      <section className="chat-layout panel">
        <aside className="chat-contacts">
          <div className="eyebrow">{t("PEOPLE", "အသုံးပြုသူများ")}</div>
          <QueryState
            loading={contacts.isLoading}
            error={contacts.error}
            retry={() => void contacts.refetch()}
          >
            {contacts.data
              ?.filter(contact => contact.id !== user.id)
              .map(contact => (
                <button
                  className={`chat-contact ${selected?.id === contact.id ? "active" : ""}`}
                  key={contact.id}
                  onClick={() => setSelectedId(contact.id)}
                >
                  <span className="chat-avatar">
                    {contact.avatarData || contact.avatarReference ? (
                      <img
                        src={
                          contact.avatarData || contact.avatarReference || ""
                        }
                        alt=""
                      />
                    ) : (
                      contact.name.charAt(0).toUpperCase()
                    )}
                  </span>
                  <span className="chat-contact-copy">
                    <strong>{contact.name}</strong>
                    <small>
                      {contact.department || t("General", "အထွေထွေ")} ·{" "}
                      {contact.jobTitle || contact.role.toUpperCase()}
                    </small>
                  </span>
                </button>
              ))}
          </QueryState>
        </aside>
        <div className="chat-thread">
          {!selected ? (
            <Empty
              icon={MessageCircle}
              title={t("Choose a person", "လူတစ်ဦးရွေးပါ")}
              text={t(
                "Select a user to start a private conversation.",
                "သီးသန့်စကားပြောရန် အသုံးပြုသူတစ်ဦးကို ရွေးချယ်ပါ။"
              )}
            />
          ) : (
            <>
              <div className="chat-thread-head">
                <div>
                  <strong>{selected.name}</strong>
                  <span>
                    {selected.department || t("General", "အထွေထွေ")} ·{" "}
                    {selected.jobTitle || selected.role.toUpperCase()}
                  </span>
                </div>
                <Badge tone={selected.role === "owner" ? "gold" : "blue"}>
                  {selected.role.toUpperCase()}
                </Badge>
              </div>
              <div className="chat-messages">
                <QueryState
                  loading={messages.isLoading}
                  error={messages.error}
                  retry={() => void messages.refetch()}
                >
                  {messages.data?.length ? (
                    messages.data.map(message => (
                      <div
                        className={`chat-message ${message.senderId === user.id ? "mine" : "theirs"}`}
                        key={message.id}
                      >
                        <p>{message.body !== "📷 Image" && message.body}</p>
                        {message.attachmentData && (
                          <img
                            className="chat-attachment"
                            src={message.attachmentData}
                            alt={t("Sent image", "ပို့ထားသောဓာတ်ပုံ")}
                          />
                        )}
                        <small>
                          {message.senderName} · {dateTime(message.createdAt)}
                        </small>
                      </div>
                    ))
                  ) : (
                    <Empty
                      icon={MessageCircle}
                      title={t("No messages yet", "စာမရှိသေးပါ")}
                      text={t(
                        "Start with a respectful message.",
                        "လေးစားစွာ စကားစတင်ပါ။"
                      )}
                    />
                  )}
                </QueryState>
              </div>
              <form
                className="chat-compose"
                onSubmit={event => {
                  event.preventDefault();
                  if (body.trim() || attachmentData)
                    send.mutate({
                      recipientId: selected.id,
                      body: body.trim() || undefined,
                      attachmentData: attachmentData || null,
                      attachmentMime: attachmentData ? "image/jpeg" : null,
                    });
                }}
              >
                <label
                  className="chat-file-button"
                  title={t("Attach photo", "ဓာတ်ပုံပူးတွဲရန်")}
                >
                  <ImagePlus size={17} />
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={async event => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      setAttachmentError("");
                      try {
                        setAttachmentData(await compressAvatar(file));
                      } catch (error) {
                        setAttachmentError(
                          error instanceof Error
                            ? error.message
                            : "Image upload failed."
                        );
                      }
                    }}
                  />
                </label>
                {attachmentData && (
                  <span className="chat-attachment-preview">
                    <img src={attachmentData} alt="" />
                    <button
                      type="button"
                      onClick={() => setAttachmentData("")}
                      aria-label={t("Remove image", "ဓာတ်ပုံဖယ်ရန်")}
                    >
                      <X size={12} />
                    </button>
                  </span>
                )}
                <input
                  value={body}
                  onChange={event => setBody(event.target.value)}
                  placeholder={t("Write a message…", "စာရေးပါ…")}
                  maxLength={2000}
                />
                <button
                  className="button primary"
                  disabled={send.isPending || (!body.trim() && !attachmentData)}
                >
                  <Send size={16} />
                  {t("Send", "ပို့ရန်")}
                </button>
              </form>
              {attachmentError && (
                <div className="alert error chat-attachment-error">
                  {attachmentError}
                </div>
              )}
              <ErrorMessage error={send.error} />
            </>
          )}
        </div>
      </section>
    </>
  );
}
