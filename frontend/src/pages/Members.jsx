import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { Card, Avatar, Button } from "@/components/ui-brutal";
import { Users, PaperPlaneTilt } from "@phosphor-icons/react";

export default function Members() {
  const [members, setMembers] = useState([]);
  useEffect(() => {
    api.get("/members").then(({ data }) => setMembers(data.members || []));
  }, []);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-black text-4xl flex items-center gap-2"><Users size={32} weight="fill" className="text-[var(--primary)]" /> Members</h1>
        <p className="text-[var(--muted-fg)]">Meet the Rintaki family.</p>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 stagger">
        {members.map((m) => (
          <Card key={m.user_id} className="p-4 flex items-center gap-3" data-testid={`member-${m.user_id}`}>
            <Avatar user={m} size={48} />
            <div className="flex-1 min-w-0">
              <div className="font-black">{m.name}</div>
              <div className="text-[10px] uppercase tracking-widest text-[var(--muted-fg)]">{m.role} · {m.points} pts</div>
            </div>
            <Button as={Link} to={`/messages/${m.user_id}`} variant="accent" className="!px-3 !py-2" data-testid={`dm-${m.user_id}`}>
              <PaperPlaneTilt size={14} weight="fill" />
            </Button>
          </Card>
        ))}
        {members.length === 0 && <div className="text-[var(--muted-fg)]">No other members yet.</div>}
      </div>
    </div>
  );
}
