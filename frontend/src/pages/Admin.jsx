import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui-brutal";
import { Users, ChatsCircle, Calendar, Newspaper, VideoCamera } from "@phosphor-icons/react";
import { Link } from "react-router-dom";

export default function Admin() {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    api.get("/admin/stats").then(({ data }) => setStats(data)).catch(() => setStats({}));
  }, []);

  const tiles = [
    { label: "Users", key: "users", icon: Users, to: "/members" },
    { label: "Threads", key: "threads", icon: ChatsCircle, to: "/forums" },
    { label: "Events", key: "events", icon: Calendar, to: "/events" },
    { label: "Newsletters", key: "newsletters", icon: Newspaper, to: "/newsletters" },
    { label: "Videos", key: "videos", icon: VideoCamera, to: "/videos" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-black text-4xl">Admin</h1>
        <p className="text-[var(--muted-fg)]">Broadcast newsletters, post videos, create events.</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {tiles.map((t) => (
          <Link to={t.to} key={t.key} data-testid={`admin-tile-${t.key}`}>
            <Card className="text-center p-5">
              <t.icon size={28} weight="fill" className="mx-auto text-[var(--primary)]" />
              <div className="font-black text-3xl mt-2">{stats?.[t.key] ?? 0}</div>
              <div className="uppercase tracking-widest text-[10px] font-bold">{t.label}</div>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <h3 className="font-black text-lg mb-2">Quick actions</h3>
        <ul className="list-disc pl-5 text-sm space-y-1">
          <li>Create an event from the <Link to="/events" className="font-bold underline">Events page</Link>.</li>
          <li>Publish a newsletter from <Link to="/newsletters" className="font-bold underline">Otaku World</Link>.</li>
          <li>Add a video from the <Link to="/videos" className="font-bold underline">Videos page</Link>.</li>
        </ul>
      </Card>
    </div>
  );
}
