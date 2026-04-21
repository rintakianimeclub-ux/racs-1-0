import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Card, Sticker, Button, Input, Textarea, EmptyState } from "@/components/ui-brutal";
import { Calendar, Plus, MapPin, X } from "@phosphor-icons/react";

export default function Events() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [events, setEvents] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", location: "", starts_at: "", cover_image: "" });

  const load = async () => {
    const { data } = await api.get("/events");
    setEvents(data.events || []);
  };
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    await api.post("/events", { ...form, starts_at: new Date(form.starts_at).toISOString() });
    setOpen(false);
    setForm({ title: "", description: "", location: "", starts_at: "", cover_image: "" });
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-black text-4xl">Events</h1>
          <p className="text-[var(--muted-fg)]">Conventions, meetups, watch parties.</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setOpen(true)} data-testid="new-event-btn">
            <Plus size={16} weight="bold" /> New event
          </Button>
        )}
      </div>

      {events.length === 0 ? (
        <EmptyState title="No events yet" body="Check back soon." icon={Calendar} />
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 stagger">
          {events.map((ev) => (
            <Card key={ev.event_id} className="p-0 overflow-hidden" data-testid={`event-${ev.event_id}`}>
              {ev.cover_image && (
                <div className="aspect-[16/9] border-b-2 border-black overflow-hidden">
                  <img src={ev.cover_image} className="w-full h-full object-cover" alt="" />
                </div>
              )}
              <div className="p-4 space-y-2">
                <Sticker color="accent" className="tilt-1">
                  <Calendar size={12} weight="bold" /> {new Date(ev.starts_at).toLocaleDateString()} · {new Date(ev.starts_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </Sticker>
                <h3 className="font-black text-xl leading-tight">{ev.title}</h3>
                <p className="text-sm text-[var(--muted-fg)] line-clamp-3">{ev.description}</p>
                <div className="text-xs font-bold uppercase tracking-widest flex items-center gap-1">
                  <MapPin size={12} weight="bold" /> {ev.location || "TBA"}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setOpen(false)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={submit}
                className="bg-white border-2 border-black rounded-2xl w-full max-w-lg p-6 shadow-[8px_8px_0_#111]" data-testid="new-event-form">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-black text-2xl">Create event</h2>
              <button type="button" onClick={() => setOpen(false)} className="w-8 h-8 border-2 border-black rounded-full flex items-center justify-center">
                <X size={16} weight="bold" />
              </button>
            </div>
            <div className="space-y-3">
              <Input placeholder="Event title" required value={form.title} data-testid="event-title" onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <Textarea placeholder="Description" rows={3} required value={form.description} data-testid="event-description" onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <Input placeholder="Location" value={form.location} data-testid="event-location" onChange={(e) => setForm({ ...form, location: e.target.value })} />
              <Input type="datetime-local" required value={form.starts_at} data-testid="event-starts-at" onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
              <Input placeholder="Cover image URL (optional)" value={form.cover_image} data-testid="event-cover" onChange={(e) => setForm({ ...form, cover_image: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" data-testid="event-submit">Create</Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
