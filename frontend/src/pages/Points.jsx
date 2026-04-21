import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Card, Sticker, Button, Avatar } from "@/components/ui-brutal";
import { Trophy, Lightning, Medal, Crown } from "@phosphor-icons/react";
import { Link } from "react-router-dom";

export default function Points() {
  const { user, refresh } = useAuth();
  const [data, setData] = useState({ points: 0, transactions: [], badges: [] });
  const [leaders, setLeaders] = useState([]);
  const [claimMsg, setClaimMsg] = useState("");

  const load = async () => {
    const [me, lb] = await Promise.all([
      api.get("/points/me"),
      api.get("/points/leaderboard"),
    ]);
    setData(me.data);
    setLeaders(lb.data.leaderboard || []);
  };
  useEffect(() => { load(); }, []);

  const claim = async () => {
    try {
      const { data } = await api.post("/points/daily-claim");
      setClaimMsg(`+5! New total: ${data.points}`);
      await refresh();
      await load();
    } catch (e) {
      setClaimMsg(e.response?.data?.detail || "Could not claim");
    }
  };

  const top3 = leaders.slice(0, 3);
  const rest = leaders.slice(3);

  return (
    <div className="space-y-8">
      <div className="grid md:grid-cols-3 gap-5">
        <Card className="md:col-span-2 p-6 bg-[var(--primary)] text-white relative overflow-hidden grain border-black">
          <Sticker color="secondary" className="tilt-1">Your balance</Sticker>
          <div className="font-black text-6xl md:text-7xl mt-3">{data.points}</div>
          <div className="uppercase tracking-widest text-sm font-bold opacity-90">Rinaka Points</div>
          <div className="mt-5 flex gap-2 flex-wrap">
            <Button variant="secondary" onClick={claim} data-testid="claim-daily">
              <Lightning size={16} weight="fill" /> Claim daily +5
            </Button>
            <Button as={Link} to="/forums" variant="dark">Earn more →</Button>
          </div>
          {claimMsg && <div className="mt-3 text-sm font-bold bg-black inline-block px-3 py-1 rounded-full">{claimMsg}</div>}
        </Card>

        <Card>
          <h3 className="font-black text-xl mb-3">How to earn</h3>
          <ul className="text-sm space-y-2">
            <li className="flex justify-between"><span>Daily login</span><span className="font-black">+5</span></li>
            <li className="flex justify-between"><span>New thread</span><span className="font-black">+5</span></li>
            <li className="flex justify-between"><span>Reply</span><span className="font-black">+2</span></li>
            <li className="flex justify-between"><span>Thread like received</span><span className="font-black">+1</span></li>
            <li className="flex justify-between"><span>Welcome bonus</span><span className="font-black">+10</span></li>
          </ul>
        </Card>
      </div>

      {data.badges?.length > 0 && (
        <div>
          <h2 className="font-black text-2xl mb-3 flex items-center gap-2"><Medal size={24} weight="fill" className="text-[var(--primary)]" /> Badges</h2>
          <div className="flex gap-2 flex-wrap">
            {data.badges.map((b) => (
              <Sticker key={b} color="accent" className="tilt-2 text-sm" data-testid={`badge-${b}`}>🏅 {b}</Sticker>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="font-black text-2xl mb-4 flex items-center gap-2"><Trophy size={24} weight="fill" className="text-[var(--primary)]" /> Leaderboard</h2>
        {top3.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[1, 0, 2].map((idx) => {
              const m = top3[idx];
              if (!m) return <div key={idx} />;
              const rank = idx + 1;
              const colors = ["bg-[var(--secondary)]", "bg-[var(--accent)]", "bg-white"];
              const heights = ["md:h-48", "md:h-40", "md:h-36"];
              return (
                <div key={m.user_id} className="flex flex-col items-center justify-end" data-testid={`podium-${rank}`}>
                  <Avatar user={m} size={56} />
                  <div className="font-black text-sm mt-1 truncate max-w-full">{m.name}</div>
                  <div className="text-xs text-[var(--muted-fg)]">{m.points} pts</div>
                  <div className={`${colors[idx]} ${heights[idx]} w-full border-2 border-black rounded-t-xl mt-2 flex items-start justify-center pt-2 shadow-[4px_4px_0_#111]`}>
                    {rank === 1 ? <Crown size={28} weight="fill" /> : <div className="font-black text-3xl">#{rank}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <Card className="space-y-2">
          {rest.map((m, i) => (
            <div key={m.user_id} className="flex items-center gap-3 py-1" data-testid={`lb-row-${m.user_id}`}>
              <div className="w-7 text-center font-black text-[var(--muted-fg)]">{i + 4}</div>
              <Avatar user={m} size={32} />
              <div className="flex-1 truncate">
                <div className="font-bold">{m.name}</div>
              </div>
              <div className="font-black">{m.points}</div>
            </div>
          ))}
          {rest.length === 0 && top3.length === 0 && <div className="text-sm text-[var(--muted-fg)]">No ranked members yet.</div>}
        </Card>
      </div>

      <div>
        <h2 className="font-black text-2xl mb-3">Recent activity</h2>
        <Card className="divide-y-2 divide-black/10">
          {data.transactions.length === 0 && <div className="text-sm text-[var(--muted-fg)]">No activity yet.</div>}
          {data.transactions.map((t) => (
            <div key={t.tx_id} className="py-2 flex items-center justify-between" data-testid={`tx-${t.tx_id}`}>
              <div>
                <div className="font-bold text-sm">{t.reason}</div>
                <div className="text-[10px] text-[var(--muted-fg)] uppercase tracking-widest">{new Date(t.created_at).toLocaleString()}</div>
              </div>
              <div className={`font-black ${t.amount >= 0 ? "text-green-700" : "text-[var(--primary)]"}`}>
                {t.amount >= 0 ? "+" : ""}{t.amount}
              </div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
