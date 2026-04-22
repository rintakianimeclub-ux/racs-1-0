import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Card, Button, Input, Textarea, EmptyState } from "@/components/ui-brutal";
import {
  Calendar, Ticket, Images, FilmSlate, Plus, X, Trash, CaretRight, ArrowSquareOut,
} from "@phosphor-icons/react";

const KIND_META = {
  photos: { label: "Photos", icon: Images },
  videos: { label: "Videos", icon: FilmSlate },
  mixed:  { label: "Gallery", icon: Images },
};

export default function EventsGallery() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [links, setLinks] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", url: "", kind: "mixed", cover_image: "", description: "" });

  const load = async () => {
    const { data } = await api.get("/gallery/links").catch(() => ({ data: { links: [] } }));
    setLinks(data.links || []);
  };
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    await api.post("/gallery/links", form);
    setOpen(false);
    setForm({ title: "", url: "", kind: "mixed", cover_image: "", description: "" });
    load();
  };

  const del = async (id) => {
    if (!window.confirm("Delete this gallery link?")) return;
    await api.delete(`/gallery/links/${id}`);
    load();
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-black text-3xl">Events Gallery</h1>
        <p className="text-[var(--muted-fg)] text-sm">Photos & videos from our events and trips.</p>
      </div>

      {/* Top: Events + My Tickets tiles (same style as More page) */}
      <div className="grid grid-cols-2 gap-3">
        <Link to="/events" data-testid="gallery-top-events">
          <Card className="bg-[var(--primary)] text-white h-full p-3">
            <Calendar size={24} weight="fill" />
            <div className="font-black mt-2 leading-tight">Events</div>
            <div className="text-[11px] opacity-90">Upcoming & past events</div>
          </Card>
        </Link>
        <Link to="/tickets" data-testid="gallery-top-tickets">
          <Card className="bg-[var(--accent)] h-full p-3">
            <Ticket size={24} weight="fill" />
            <div className="font-black mt-2 leading-tight">My Tickets</div>
            <div className="text-[11px] opacity-80">Your purchased tickets</div>
          </Card>
        </Link>
      </div>

      {/* Admin: add gallery link */}
      {isAdmin && (
        <Button onClick={() => setOpen(true)} variant="dark" className="w-full" data-testid="add-gallery-link-btn">
          <Plus size={14} weight="bold" /> Add gallery link
        </Button>
      )}

      {/* Gallery link grid */}
      {links.length === 0 ? (
        <EmptyState title="No galleries yet" body={isAdmin ? "Tap \u201CAdd gallery link\u201D to add one." : "Check back soon."} icon={Images} />
      ) : (
        <div className="space-y-3">
          {links.map((g) => {
            const meta = KIND_META[g.kind] || KIND_META.mixed;
            return (
              <div key={g.gallery_id} className="relative" data-testid={`gallery-${g.gallery_id}`}>
                <a href={g.url} target="_blank" rel="noreferrer">
                  <Card className="p-0 overflow-hidden">
                    {g.cover_image && (
                      <div className="aspect-[16/9] border-b-2 border-black overflow-hidden bg-black">
                        <img src={g.cover_image} alt="" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="p-3">
                      <div className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest bg-[var(--secondary)] border-2 border-black rounded-full px-2 py-0.5">
                        <meta.icon size={12} weight="fill" /> {meta.label}
                      </div>
                      <h3 className="font-black text-lg mt-2 leading-tight">{g.title}</h3>
                      {g.description && <p className="text-sm text-[var(--muted-fg)] line-clamp-2 mt-1">{g.description}</p>}
                      <div className="mt-2 text-[10px] font-black uppercase tracking-widest text-[var(--primary)] flex items-center gap-1">
                        Open gallery <ArrowSquareOut size={12} weight="bold" />
                      </div>
                    </div>
                  </Card>
                </a>
                {isAdmin && (
                  <button onClick={() => del(g.gallery_id)}
                          className="absolute top-2 right-2 w-8 h-8 bg-white border-2 border-black rounded-full flex items-center justify-center shadow-[2px_2px_0_#111]"
                          data-testid={`del-gallery-${g.gallery_id}`}>
                    <Trash size={12} weight="bold" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3" onClick={() => setOpen(false)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={submit}
                className="bg-white border-2 border-black rounded-2xl w-full max-w-md p-5 shadow-[6px_6px_0_#111]"
                data-testid="gallery-link-form">
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-black text-xl">Add gallery link</h2>
              <button type="button" onClick={() => setOpen(false)}
                      className="w-8 h-8 border-2 border-black rounded-full flex items-center justify-center">
                <X size={14} weight="bold" />
              </button>
            </div>
            <div className="space-y-3">
              <Input required placeholder="Title (e.g., AnimeNYC 2025)" value={form.title}
                     data-testid="gl-title" onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <Input required placeholder="Link URL (page of images or videos)" value={form.url}
                     data-testid="gl-url" onChange={(e) => setForm({ ...form, url: e.target.value })} />
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest">Type</label>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  {["photos", "videos", "mixed"].map((k) => (
                    <button key={k} type="button" onClick={() => setForm({ ...form, kind: k })}
                            data-testid={`gl-kind-${k}`}
                            className={`border-2 border-black rounded-full py-2 text-xs font-black uppercase tracking-widest ${form.kind === k ? "bg-[var(--primary)] text-white" : "bg-white"}`}>
                      {k}
                    </button>
                  ))}
                </div>
              </div>
              <Input placeholder="Cover image URL (optional)" value={form.cover_image}
                     data-testid="gl-cover" onChange={(e) => setForm({ ...form, cover_image: e.target.value })} />
              <Textarea rows={2} placeholder="Description (optional)" value={form.description}
                        data-testid="gl-desc" onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <Button type="submit" className="w-full mt-3" data-testid="gl-submit">Add</Button>
          </form>
        </div>
      )}
    </div>
  );
}
