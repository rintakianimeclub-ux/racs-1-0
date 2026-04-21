import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Card, Sticker, Button, Textarea, Avatar } from "@/components/ui-brutal";
import { Heart, PaperPlaneTilt, ArrowLeft, ChatsCircle } from "@phosphor-icons/react";

export default function ForumThread() {
  const { id } = useParams();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [reply, setReply] = useState("");
  const [posting, setPosting] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get(`/forums/threads/${id}`);
      setData(data);
    } catch { setData({ thread: null, replies: [] }); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const submit = async (e) => {
    e.preventDefault();
    if (!reply.trim()) return;
    setPosting(true);
    try {
      await api.post(`/forums/threads/${id}/replies`, { body: reply });
      setReply("");
      load();
    } finally { setPosting(false); }
  };

  const like = async () => {
    await api.post(`/forums/threads/${id}/like`);
    load();
  };

  if (!data) return <div className="p-6">Loading...</div>;
  if (!data.thread) return <div className="p-6">Thread not found.</div>;

  const t = data.thread;
  const liked = t.likes?.includes(user?.user_id);

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <Link to="/forums" className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest">
        <ArrowLeft size={14} weight="bold" /> Back to forums
      </Link>

      <Card className="p-6">
        <div className="flex items-center gap-2 mb-2">
          <Sticker color="primary">{t.category}</Sticker>
          {t.pinned && <Sticker color="secondary">📌 Pinned</Sticker>}
        </div>
        <h1 className="font-black text-3xl md:text-4xl leading-tight">{t.title}</h1>
        <div className="flex items-center gap-3 mt-4">
          <Avatar user={{ name: t.author_name, picture: t.author_picture }} />
          <div>
            <div className="font-bold">{t.author_name}</div>
            <div className="text-xs text-[var(--muted-fg)]">{new Date(t.created_at).toLocaleString()}</div>
          </div>
        </div>
        <p className="mt-5 whitespace-pre-wrap leading-relaxed">{t.body}</p>
        <div className="mt-5 flex items-center gap-3">
          <button onClick={like} data-testid="like-thread-btn"
                  className={`sticker ${liked ? "bg-[var(--primary)] text-white" : "bg-white"}`}>
            <Heart size={14} weight={liked ? "fill" : "bold"} /> {t.likes?.length || 0}
          </button>
          <span className="sticker bg-white"><ChatsCircle size={14} weight="bold" /> {t.reply_count} replies</span>
        </div>
      </Card>

      <div className="space-y-3">
        {data.replies.map((r) => (
          <Card key={r.reply_id} className="p-4" data-testid={`reply-${r.reply_id}`}>
            <div className="flex items-center gap-3 mb-2">
              <Avatar user={{ name: r.author_name, picture: r.author_picture }} size={30} />
              <div>
                <div className="font-bold text-sm">{r.author_name}</div>
                <div className="text-[10px] text-[var(--muted-fg)] uppercase tracking-widest">{new Date(r.created_at).toLocaleString()}</div>
              </div>
            </div>
            <p className="whitespace-pre-wrap leading-relaxed">{r.body}</p>
          </Card>
        ))}
      </div>

      {user && (
        <form onSubmit={submit} className="space-y-3 pt-2">
          <Textarea rows={3} placeholder="Write a reply... +2 pts"
                    value={reply} onChange={(e) => setReply(e.target.value)}
                    data-testid="reply-input" />
          <div className="flex justify-end">
            <Button type="submit" disabled={posting || !reply.trim()} data-testid="reply-submit">
              <PaperPlaneTilt size={14} weight="fill" /> {posting ? "Posting..." : "Reply"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
