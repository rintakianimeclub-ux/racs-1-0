import React, { useEffect, useMemo, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Card, Button, Input, EmptyState } from "@/components/ui-brutal";
import {
  Calendar, Ticket, Images, Plus, X, Trash, CaretRight, ArrowsClockwise, ArrowLeft, ArrowRight,
} from "@phosphor-icons/react";

export default function EventsGallery() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [galleries, setGalleries] = useState([]);
  const [loading, setLoading] = useState(true);

  // admin modals
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ event: "", year: "", name: "", imagely_id: "", source_url: "" });
  const [adding, setAdding] = useState(false);
  const [addErr, setAddErr] = useState("");

  const [syncOpen, setSyncOpen] = useState(false);
  const [syncForm, setSyncForm] = useState({ source_url: "https://rintaki.org/gallery/", replace: false });
  const [syncJob, setSyncJob] = useState(null);
  const pollRef = useRef(null);

  // in-app viewer
  const [viewer, setViewer] = useState(null); // {gallery, index}

  const load = async () => {
    setLoading(true);
    const { data } = await api.get("/galleries").catch(() => ({ data: { galleries: [] } }));
    setGalleries(data.galleries || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  // Group: Event → Year → Galleries
  const tree = useMemo(() => {
    const t = {};
    for (const g of galleries) {
      const ev = g.event || "Other";
      const yr = g.year || "—";
      (t[ev] = t[ev] || {});
      (t[ev][yr] = t[ev][yr] || []).push(g);
    }
    // sort galleries per year
    for (const ev of Object.keys(t)) {
      for (const yr of Object.keys(t[ev])) {
        t[ev][yr].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      }
    }
    return t;
  }, [galleries]);

  const submitAdd = async (e) => {
    e.preventDefault();
    setAddErr(""); setAdding(true);
    try {
      const payload = {
        event: addForm.event.trim(),
        year: addForm.year.trim(),
        name: addForm.name.trim(),
        imagely_id: addForm.imagely_id ? parseInt(addForm.imagely_id, 10) : null,
        source_url: addForm.source_url.trim() || null,
      };
      if (!payload.imagely_id && !payload.source_url) {
        throw new Error("Enter either an Imagely gallery ID or a gallery URL.");
      }
      await api.post("/galleries", payload);
      setAddOpen(false);
      setAddForm({ event: "", year: "", name: "", imagely_id: "", source_url: "" });
      load();
    } catch (err) {
      setAddErr(err.response?.data?.detail || err.message || "Failed to add");
    } finally {
      setAdding(false);
    }
  };

  const startSync = async (e) => {
    e.preventDefault();
    const { data } = await api.post("/galleries/sync", syncForm);
    setSyncJob({ ...data, processed: 0, total: 0, created: 0 });
    // poll every 2s
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const { data: status } = await api.get(`/galleries/sync/status/${data.job_id}`);
        setSyncJob(status);
        if (status.status === "done" || status.status === "error") {
          clearInterval(pollRef.current);
          pollRef.current = null;
          load();
        }
      } catch { /* ignore */ }
    }, 2000);
  };

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const del = async (id) => {
    if (!window.confirm("Delete this gallery?")) return;
    await api.delete(`/galleries/${id}`);
    load();
  };

  const refresh = async (id) => {
    try {
      await api.post(`/galleries/${id}/refresh`);
      load();
    } catch (e) {
      alert(e.response?.data?.detail || "Refresh failed");
    }
  };

  const openGallery = async (g) => {
    // fetch full images for this gallery
    const { data } = await api.get(`/galleries/${g.gallery_id}`);
    setViewer({ gallery: data, index: 0 });
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-black text-3xl">Events Gallery</h1>
        <p className="text-[var(--muted-fg)] text-sm">Photos from our events & trips — browse inside the app.</p>
      </div>

      {/* Top tiles */}
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

      {/* Admin controls */}
      {isAdmin && (
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={() => setSyncOpen(true)} variant="primary" className="w-full" data-testid="sync-btn">
            <ArrowsClockwise size={14} weight="bold" /> Sync from rintaki.org
          </Button>
          <Button onClick={() => setAddOpen(true)} variant="dark" className="w-full" data-testid="add-btn">
            <Plus size={14} weight="bold" /> Add by ID
          </Button>
        </div>
      )}

      {/* Hierarchical tree */}
      {loading ? (
        <div className="text-sm text-[var(--muted-fg)]">Loading galleries…</div>
      ) : galleries.length === 0 ? (
        <EmptyState title="No galleries yet" body={isAdmin ? "Tap “Sync from rintaki.org” to pull every gallery." : "Check back soon."} icon={Images} />
      ) : (
        <div className="space-y-5">
          {Object.entries(tree).sort(([a], [b]) => a.localeCompare(b)).map(([event, years]) => (
            <section key={event} data-testid={`event-${event.replace(/\s/g,"-")}`}>
              <h2 className="font-black text-2xl leading-tight">{event}</h2>
              <div className="space-y-3 mt-2">
                {Object.entries(years).sort(([a], [b]) => (b || "").localeCompare(a || "")).map(([year, items]) => (
                  <div key={year}>
                    <div className="sticky top-[64px] z-10 -mx-1 px-1 bg-[var(--bg)]/90 backdrop-blur py-1 mb-1">
                      <span className="inline-block bg-black text-white text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full border-2 border-black">
                        {year}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {items.map((g) => (
                        <div key={g.gallery_id} className="relative" data-testid={`gallery-${g.gallery_id}`}>
                          <button onClick={() => openGallery(g)} className="block w-full text-left">
                            <Card className="p-0 overflow-hidden">
                              <div className="aspect-square border-b-2 border-black overflow-hidden bg-black">
                                {g.cover_image && <img src={g.cover_image} alt="" className="w-full h-full object-cover" loading="lazy" />}
                              </div>
                              <div className="p-2">
                                <div className="font-black text-sm leading-tight line-clamp-2">{g.name}</div>
                                <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-fg)] mt-1">
                                  {g.image_count} photos
                                </div>
                              </div>
                            </Card>
                          </button>
                          {isAdmin && (
                            <div className="absolute top-1 right-1 flex gap-1">
                              <button onClick={() => refresh(g.gallery_id)}
                                      className="w-7 h-7 bg-white border-2 border-black rounded-full flex items-center justify-center shadow-[2px_2px_0_#111]"
                                      title="Re-scrape images"
                                      data-testid={`refresh-${g.gallery_id}`}>
                                <ArrowsClockwise size={11} weight="bold" />
                              </button>
                              <button onClick={() => del(g.gallery_id)}
                                      className="w-7 h-7 bg-white border-2 border-black rounded-full flex items-center justify-center shadow-[2px_2px_0_#111]"
                                      data-testid={`del-${g.gallery_id}`}>
                                <Trash size={11} weight="bold" />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Add modal */}
      {addOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3" onClick={() => !adding && setAddOpen(false)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={submitAdd}
                className="bg-white border-2 border-black rounded-2xl w-full max-w-md p-5 shadow-[6px_6px_0_#111]" data-testid="add-form">
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-black text-xl">Add gallery</h2>
              <button type="button" onClick={() => !adding && setAddOpen(false)}
                      className="w-8 h-8 border-2 border-black rounded-full flex items-center justify-center">
                <X size={14} weight="bold" />
              </button>
            </div>
            <p className="text-xs text-[var(--muted-fg)] mb-3">
              Enter the event, year and gallery name, then either the Imagely gallery <strong>ID number</strong> (from your shortcode) or the direct gallery URL. The app will pull all images.
            </p>
            <div className="space-y-3">
              <Input required placeholder="Event (e.g. Anime Expo)" value={addForm.event}
                     data-testid="add-event" onChange={(e) => setAddForm({ ...addForm, event: e.target.value })} />
              <Input placeholder="Year (e.g. 2009)" value={addForm.year}
                     data-testid="add-year" onChange={(e) => setAddForm({ ...addForm, year: e.target.value })} />
              <Input required placeholder="Gallery name (e.g. Cosplayers)" value={addForm.name}
                     data-testid="add-name" onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} />
              <Input placeholder="Imagely gallery ID (number)" value={addForm.imagely_id}
                     data-testid="add-imagely-id" onChange={(e) => setAddForm({ ...addForm, imagely_id: e.target.value })} />
              <div className="text-center text-[10px] font-black uppercase tracking-widest text-[var(--muted-fg)]">— or —</div>
              <Input placeholder="Gallery URL" value={addForm.source_url}
                     data-testid="add-source-url" onChange={(e) => setAddForm({ ...addForm, source_url: e.target.value })} />
              {addErr && (
                <div className="bg-[var(--primary)] text-white border-2 border-black rounded-lg px-3 py-2 text-sm font-bold" data-testid="add-err">
                  {addErr}
                </div>
              )}
            </div>
            <Button type="submit" disabled={adding} className="w-full mt-3" data-testid="add-submit">
              {adding ? "Pulling images…" : "Add gallery"}
            </Button>
          </form>
        </div>
      )}

      {/* Sync modal */}
      {syncOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3" onClick={() => (!syncJob || syncJob.status === "done" || syncJob.status === "error") && setSyncOpen(false)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={startSync}
                className="bg-white border-2 border-black rounded-2xl w-full max-w-md p-5 shadow-[6px_6px_0_#111]" data-testid="sync-form">
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-black text-xl">Sync from NextGEN</h2>
              <button type="button" onClick={() => setSyncOpen(false)} disabled={syncJob && syncJob.status === "running"}
                      className="w-8 h-8 border-2 border-black rounded-full flex items-center justify-center disabled:opacity-50">
                <X size={14} weight="bold" />
              </button>
            </div>
            {!syncJob && (
              <>
                <p className="text-xs text-[var(--muted-fg)] mb-3">
                  Paste the WordPress page URL that shows your NextGEN album (e.g. <code>https://rintaki.org/gallery/</code>). The app will import every gallery with full images. Can take 1–3 minutes depending on how many photos.
                </p>
                <div className="space-y-3">
                  <Input required placeholder="https://rintaki.org/gallery/" value={syncForm.source_url}
                         data-testid="sync-url" onChange={(e) => setSyncForm({ ...syncForm, source_url: e.target.value })} />
                  <label className="flex items-center gap-2 text-sm font-bold">
                    <input type="checkbox" checked={syncForm.replace}
                           onChange={(e) => setSyncForm({ ...syncForm, replace: e.target.checked })}
                           data-testid="sync-replace" />
                    Replace existing synced galleries first
                  </label>
                </div>
                <Button type="submit" className="w-full mt-3" data-testid="sync-start">Start sync</Button>
              </>
            )}
            {syncJob && (
              <div className="space-y-3">
                <div className="text-sm font-bold">
                  Status: <span className="uppercase">{syncJob.status}</span>
                </div>
                <div className="w-full h-3 bg-black/10 border-2 border-black rounded-full overflow-hidden">
                  <div className="h-full bg-[var(--primary)] transition-all"
                       style={{ width: `${syncJob.total ? (syncJob.processed / syncJob.total) * 100 : 0}%` }} />
                </div>
                <div className="text-xs text-[var(--muted-fg)] font-bold">
                  {syncJob.processed || 0} / {syncJob.total || "?"} — created {syncJob.created || 0}, skipped {syncJob.skipped || 0}
                  {syncJob.failed_count ? `, failed ${syncJob.failed_count}` : ""}
                </div>
                {syncJob.current && <div className="text-xs line-clamp-1">Now: {syncJob.current}</div>}
                {syncJob.status === "done" && (
                  <Button type="button" onClick={() => { setSyncJob(null); setSyncOpen(false); }} className="w-full" data-testid="sync-close">
                    Done — close
                  </Button>
                )}
                {syncJob.status === "error" && (
                  <div className="bg-[var(--primary)] text-white border-2 border-black rounded-lg px-3 py-2 text-sm font-bold">
                    {syncJob.error || "Sync failed"}
                  </div>
                )}
              </div>
            )}
          </form>
        </div>
      )}

      {/* In-app image viewer */}
      {viewer && <Viewer viewer={viewer} setViewer={setViewer} />}
    </div>
  );
}

function Viewer({ viewer, setViewer }) {
  const { gallery, index } = viewer;
  const total = gallery.images?.length || 0;
  const touch = useRef({ x: 0, y: 0 });
  const go = (d) => {
    const next = (index + d + total) % total;
    setViewer({ gallery, index: next });
  };
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "Escape") setViewer(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, total]);

  const img = gallery.images?.[index];
  if (!img) return null;

  const onTouchStart = (e) => { touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; };
  const onTouchEnd = (e) => {
    const dx = e.changedTouches[0].clientX - touch.current.x;
    const dy = e.changedTouches[0].clientY - touch.current.y;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
  };

  return (
    <div className="fixed inset-0 bg-black z-[60] flex flex-col" data-testid="viewer" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div className="flex items-center justify-between p-3 text-white">
        <div className="min-w-0">
          <div className="font-black text-sm line-clamp-1">{gallery.event} · {gallery.year} · {gallery.name}</div>
          <div className="text-[10px] font-bold uppercase tracking-widest opacity-70">{index + 1} / {total}</div>
        </div>
        <button onClick={() => setViewer(null)} data-testid="viewer-close"
                className="w-10 h-10 bg-white text-black border-2 border-black rounded-full flex items-center justify-center">
          <X size={16} weight="bold" />
        </button>
      </div>
      <div className="flex-1 relative flex items-center justify-center">
        <img src={img.url} alt={img.caption || ""} className="max-w-full max-h-full object-contain select-none" draggable={false} />
        {total > 1 && (
          <>
            <button onClick={() => go(-1)} data-testid="viewer-prev"
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white text-black border-2 border-black rounded-full flex items-center justify-center shadow-[2px_2px_0_#111]">
              <ArrowLeft size={16} weight="bold" />
            </button>
            <button onClick={() => go(1)} data-testid="viewer-next"
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white text-black border-2 border-black rounded-full flex items-center justify-center shadow-[2px_2px_0_#111]">
              <ArrowRight size={16} weight="bold" />
            </button>
          </>
        )}
      </div>
      {/* Thumbnail strip */}
      <div className="bg-black border-t-2 border-white/20 p-2 overflow-x-auto scrollbar-hide">
        <div className="flex gap-1">
          {gallery.images.map((im, i) => (
            <button key={i} onClick={() => setViewer({ gallery, index: i })}
                    data-testid={`viewer-thumb-${i}`}
                    className={`flex-shrink-0 w-14 h-14 border-2 rounded-md overflow-hidden ${i === index ? "border-[var(--secondary)]" : "border-white/30"}`}>
              <img src={im.thumb} alt="" className="w-full h-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
