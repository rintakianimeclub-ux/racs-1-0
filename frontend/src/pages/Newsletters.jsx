import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Card, Button, Input, Textarea, EmptyState } from "@/components/ui-brutal";
import { Newspaper, Plus, X } from "@phosphor-icons/react";

export default function Newsletters() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", summary: "", content: "", cover_image: "" });
  const [selected, setSelected] = useState(null);

  const load = async () => {
    const { data } = await api.get("/newsletters");
    setItems(data.newsletters || []);
  };
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    await api.post("/newsletters", form);
    setOpen(false);
    setForm({ title: "", summary: "", content: "", cover_image: "" });
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-black text-4xl">Otaku World</h1>
          <p className="text-[var(--muted-fg)]">Newsletters from the Rintaki admin team.</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setOpen(true)} data-testid="new-newsletter-btn">
            <Plus size={16} weight="bold" /> New issue
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <EmptyState title="No newsletters yet" icon={Newspaper} />
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 stagger">
          {items.map((n) => (
            <button key={n.newsletter_id} onClick={() => setSelected(n)} className="text-left" data-testid={`nl-${n.newsletter_id}`}>
              <Card className="p-0 overflow-hidden h-full">
                {n.cover_image && (
                  <div className="aspect-[4/3] border-b-2 border-black overflow-hidden">
                    <img src={n.cover_image} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="p-4">
                  <div className="text-[10px] uppercase tracking-widest font-black text-[var(--primary)]">Otaku World</div>
                  <h3 className="font-black text-lg mt-1 leading-tight">{n.title}</h3>
                  <p className="text-sm text-[var(--muted-fg)] line-clamp-3 mt-1">{n.summary}</p>
                </div>
              </Card>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div onClick={(e) => e.stopPropagation()}
               className="bg-white border-2 border-black rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-auto shadow-[8px_8px_0_#111]" data-testid="newsletter-modal">
            {selected.cover_image && (
              <img src={selected.cover_image} alt="" className="w-full aspect-[16/9] object-cover border-b-2 border-black" />
            )}
            <div className="p-6">
              <div className="flex justify-between items-start gap-3">
                <div>
                  <div className="text-[10px] uppercase tracking-widest font-black text-[var(--primary)]">Otaku World</div>
                  <h2 className="font-black text-3xl">{selected.title}</h2>
                  <div className="text-xs text-[var(--muted-fg)] mt-1">{selected.author} · {new Date(selected.created_at).toLocaleDateString()}</div>
                </div>
                <button onClick={() => setSelected(null)} className="w-8 h-8 border-2 border-black rounded-full flex items-center justify-center">
                  <X size={16} weight="bold" />
                </button>
              </div>
              <p className="mt-4 text-lg font-bold">{selected.summary}</p>
              <div className="mt-4 whitespace-pre-wrap leading-relaxed">{selected.content}</div>
            </div>
          </div>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={submit}
                className="bg-white border-2 border-black rounded-2xl w-full max-w-lg p-6 shadow-[8px_8px_0_#111]" data-testid="new-newsletter-form">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-black text-2xl">Send newsletter</h2>
              <button type="button" onClick={() => setOpen(false)} className="w-8 h-8 border-2 border-black rounded-full flex items-center justify-center">
                <X size={16} weight="bold" />
              </button>
            </div>
            <div className="space-y-3">
              <Input required placeholder="Title" value={form.title} data-testid="nl-title" onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <Input required placeholder="Short summary" value={form.summary} data-testid="nl-summary" onChange={(e) => setForm({ ...form, summary: e.target.value })} />
              <Textarea required rows={6} placeholder="Full content" value={form.content} data-testid="nl-content" onChange={(e) => setForm({ ...form, content: e.target.value })} />
              <Input placeholder="Cover image URL (optional)" value={form.cover_image} data-testid="nl-cover" onChange={(e) => setForm({ ...form, cover_image: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" data-testid="nl-submit">Publish</Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
