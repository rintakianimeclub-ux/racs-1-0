import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Card, Avatar, Button, Textarea, EmptyState } from "@/components/ui-brutal";
import { PaperPlaneTilt, ArrowLeft, Chat } from "@phosphor-icons/react";

export default function Messages() {
  const { userId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [convos, setConvos] = useState([]);
  const [messages, setMessages] = useState([]);
  const [other, setOther] = useState(null);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);

  const loadConvos = async () => {
    const { data } = await api.get("/messages/conversations");
    setConvos(data.conversations || []);
  };
  const loadThread = async () => {
    if (!userId) return;
    const { data } = await api.get(`/messages/with/${userId}`);
    setMessages(data.messages || []);
    setOther(data.other);
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  useEffect(() => { loadConvos(); }, []);
  useEffect(() => { loadThread(); /* eslint-disable-next-line */ }, [userId]);

  const send = async (e) => {
    e.preventDefault();
    if (!body.trim() || !userId) return;
    setSending(true);
    try {
      await api.post("/messages", { to_user_id: userId, body });
      setBody("");
      await loadThread();
      await loadConvos();
    } finally { setSending(false); }
  };

  return (
    <div className="grid md:grid-cols-[300px_1fr] gap-4 min-h-[70vh]">
      <aside className={`${userId ? "hidden md:block" : ""}`}>
        <h2 className="font-black text-2xl mb-3">Messages</h2>
        {convos.length === 0 ? (
          <Card><p className="text-sm text-[var(--muted-fg)]">No conversations yet. Start one from <Link to="/members" className="font-bold underline">Members</Link>.</p></Card>
        ) : (
          <div className="space-y-2">
            {convos.map((c) => (
              <button key={c.user.user_id} onClick={() => navigate(`/messages/${c.user.user_id}`)}
                      data-testid={`convo-${c.user.user_id}`}
                      className={`w-full text-left brutal rounded-xl p-3 bg-white flex items-center gap-3 ${userId === c.user.user_id ? "bg-[var(--secondary)]" : ""}`}>
                <Avatar user={c.user} />
                <div className="flex-1 min-w-0">
                  <div className="font-bold truncate">{c.user.name}</div>
                  <div className="text-xs text-[var(--muted-fg)] truncate">{c.last_from_me ? "You: " : ""}{c.last_body}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </aside>

      <section className={`${userId ? "" : "hidden md:block"} flex flex-col border-2 border-black rounded-xl bg-white overflow-hidden shadow-[4px_4px_0_#111]`}>
        {!userId && (
          <div className="flex-1 flex items-center justify-center p-6">
            <EmptyState title="Pick a conversation" body="Or find members to DM." icon={Chat} />
          </div>
        )}
        {userId && (
          <>
            <div className="flex items-center gap-3 p-3 border-b-2 border-black bg-[var(--muted)]">
              <button className="md:hidden" onClick={() => navigate("/messages")}><ArrowLeft size={18} weight="bold" /></button>
              {other && <Avatar user={other} />}
              <div>
                <div className="font-black">{other?.name || "User"}</div>
                <div className="text-[10px] uppercase tracking-widest text-[var(--muted-fg)]">{other?.role}</div>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4 space-y-2">
              {messages.map((m) => {
                const mine = m.from_user_id === user.user_id;
                return (
                  <div key={m.message_id} className={`flex ${mine ? "justify-end" : "justify-start"}`} data-testid={`msg-${m.message_id}`}>
                    <div className={`max-w-[75%] rounded-2xl border-2 border-black px-3 py-2 shadow-[3px_3px_0_#111] ${mine ? "bg-[var(--primary)] text-white" : "bg-[var(--secondary)]"}`}>
                      <div className="whitespace-pre-wrap">{m.body}</div>
                      <div className={`text-[9px] uppercase tracking-widest mt-1 ${mine ? "text-white/70" : "text-black/60"}`}>
                        {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={endRef} />
            </div>
            <form onSubmit={send} className="border-t-2 border-black p-3 flex gap-2">
              <Textarea rows={1} placeholder="Type a message..." value={body}
                        data-testid="msg-input"
                        onChange={(e) => setBody(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(e); }}} />
              <Button type="submit" disabled={sending || !body.trim()} data-testid="msg-send">
                <PaperPlaneTilt size={16} weight="fill" />
              </Button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
