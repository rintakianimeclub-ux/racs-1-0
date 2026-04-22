import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Card, Sticker, Button, Input, Textarea, EmptyState } from "@/components/ui-brutal";
import { ChatsCircle, Plus, X, Heart, Lock } from "@phosphor-icons/react";

const CATEGORIES = ["General", "Anime", "Manga", "Events", "Cosplay", "Trading Cards", "Announcements"];

export default function Forums() {
  const { user } = useAuth();
  const isMember = !!user && (user.role === "admin" || user.is_member);
  const [threads, setThreads] = useState([]);
  const [filter, setFilter] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", body: "", category: "General" });
  const [posting, setPosting] = useState(false);

  const load = async () => {
    const { data } = await api.get("/forums/threads", { params: filter ? { category: filter } : {} });
    setThreads(data.threads || []);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter]);

  const submit = async (e) => {
    e.preventDefault();
    setPosting(true);
    try {
      await api.post("/forums/threads", form);
      setOpen(false);
      setForm({ title: "", body: "", category: "General" });
      load();
    } catch (e) { /* show toast ideally */ }
    setPosting(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-black text-4xl">Forums</h1>
          <p className="text-[var(--muted-fg)]">
            {isMember ? "Threads, debates, meetup plans. +5 pts per thread." : "Browse our discussions — members can post & reply."}
          </p>
        </div>
        {isMember ? (
          <Button onClick={() => setOpen(true)} data-testid="new-thread-btn">
            <Plus size={16} weight="bold" /> New thread
          </Button>
        ) : (
          <Link to="/join" data-testid="forum-join-btn">
            <Button variant="dark">
              <Lock size={14} weight="bold" /> Join to post
            </Button>
          </Link>
        )}
      </div>

      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFilter("")} data-testid="filter-all"
                className={`sticker ${!filter ? "bg-black text-white" : "bg-white"}`}>All</button>
        {CATEGORIES.map((c) => (
          <button key={c} onClick={() => setFilter(c)} data-testid={`filter-${c}`}
                  className={`sticker ${filter === c ? "bg-[var(--primary)] text-white" : "bg-white"}`}>{c}</button>
        ))}
      </div>

      {threads.length === 0 ? (
        <EmptyState title="No threads yet" body="Be the first to start a conversation." icon={ChatsCircle} />
      ) : (
        <div className="space-y-3 stagger">
          {threads.map((t) => (
            <Link key={t.thread_id} to={`/forums/${t.thread_id}`} data-testid={`thread-${t.thread_id}`}>
              <Card className="hover:bg-[var(--muted)]">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <Sticker color="primary">{t.category}</Sticker>
                  {t.pinned && <Sticker color="secondary">📌 Pinned</Sticker>}
                </div>
                <h3 className="font-black text-xl leading-snug">{t.title}</h3>
                <p className="text-sm text-[var(--muted-fg)] line-clamp-2 mt-1">{t.body}</p>
                <div className="flex items-center gap-4 mt-3 text-xs font-bold uppercase tracking-widest text-[var(--muted-fg)]">
                  <span>{t.author_name}</span>
                  <span className="flex items-center gap-1"><ChatsCircle size={14} weight="bold" /> {t.reply_count}</span>
                  <span className="flex items-center gap-1"><Heart size={14} weight="bold" /> {t.likes?.length || 0}</span>
                  <span className="ml-auto">{new Date(t.created_at).toLocaleDateString()}</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setOpen(false)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={submit}
                className="bg-white border-2 border-black rounded-2xl w-full max-w-lg p-6 shadow-[8px_8px_0_#111]" data-testid="new-thread-form">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-black text-2xl">Start a thread</h2>
              <button type="button" onClick={() => setOpen(false)} className="w-8 h-8 border-2 border-black rounded-full flex items-center justify-center">
                <X size={16} weight="bold" />
              </button>
            </div>
            <div className="space-y-3">
              <Input placeholder="Thread title" required value={form.title}
                     data-testid="thread-title-input"
                     onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                      data-testid="thread-category-select"
                      className="w-full rounded-lg border-2 border-black px-4 py-3 bg-white font-medium shadow-[3px_3px_0_#111]">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <Textarea rows={5} placeholder="What's on your mind?" required value={form.body}
                        data-testid="thread-body-input"
                        onChange={(e) => setForm({ ...form, body: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={posting} data-testid="thread-submit">{posting ? "Posting..." : "Post +5 pts"}</Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
