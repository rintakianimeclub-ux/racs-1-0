import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { Card, Button, EmptyState } from "@/components/ui-brutal";
import { Bell, CheckCircle } from "@phosphor-icons/react";

export default function Notifications() {
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);

  const load = async () => {
    const { data } = await api.get("/notifications");
    setItems(data.notifications || []);
    setUnread(data.unread || 0);
  };
  useEffect(() => { load(); }, []);

  const readAll = async () => {
    await api.post("/notifications/read-all");
    load();
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-black text-4xl flex items-center gap-2"><Bell size={28} weight="fill" className="text-[var(--primary)]" /> Notifications</h1>
          <p className="text-[var(--muted-fg)]">{unread} unread</p>
        </div>
        {unread > 0 && <Button variant="accent" onClick={readAll} data-testid="read-all-btn"><CheckCircle size={14} weight="bold" /> Mark all read</Button>}
      </div>

      {items.length === 0 ? (
        <EmptyState title="You're all caught up" body="Forum replies and announcements will show up here." icon={Bell} />
      ) : (
        <div className="space-y-2">
          {items.map((n) => (
            <Link key={n.notif_id} to={n.link || "#"} className="block" data-testid={`notif-${n.notif_id}`}>
              <Card className={`flex items-start gap-3 ${!n.read ? "bg-[var(--secondary)]" : ""}`}>
                <div className="w-2.5 h-2.5 rounded-full mt-1.5 border-2 border-black" style={{ background: n.read ? "#fff" : "var(--primary)" }} />
                <div className="flex-1 min-w-0">
                  <div className="font-black">{n.title}</div>
                  <p className="text-sm">{n.body}</p>
                  <div className="text-[10px] mt-1 uppercase tracking-widest text-[var(--muted-fg)]">{new Date(n.created_at).toLocaleString()}</div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
