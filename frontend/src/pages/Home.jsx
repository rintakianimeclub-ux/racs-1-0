import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Card, Sticker, Button, Avatar } from "@/components/ui-brutal";
import { Fire, Calendar, ArrowUpRight, Trophy, ChatsCircle, Newspaper, Lightning } from "@phosphor-icons/react";

function stripHtml(html = "") {
  const d = document.createElement("div");
  d.innerHTML = html;
  return d.textContent || d.innerText || "";
}

export default function Home() {
  const { user } = useAuth();
  const [feed, setFeed] = useState([]);
  const [events, setEvents] = useState([]);
  const [threads, setThreads] = useState([]);
  const [newsletters, setNewsletters] = useState([]);
  const [leaders, setLeaders] = useState([]);
  const [claimed, setClaimed] = useState(false);
  const [claimMsg, setClaimMsg] = useState("");

  useEffect(() => {
    (async () => {
      const [f, e, t, n, l] = await Promise.all([
        api.get("/rintaki/feed").catch(() => ({ data: { posts: [] } })),
        api.get("/events").catch(() => ({ data: { events: [] } })),
        api.get("/forums/threads").catch(() => ({ data: { threads: [] } })),
        api.get("/newsletters").catch(() => ({ data: { newsletters: [] } })),
        api.get("/points/leaderboard").catch(() => ({ data: { leaderboard: [] } })),
      ]);
      setFeed(f.data.posts || []);
      setEvents(e.data.events || []);
      setThreads(t.data.threads || []);
      setNewsletters(n.data.newsletters || []);
      setLeaders(l.data.leaderboard || []);
    })();
  }, []);

  const claimDaily = async () => {
    try {
      const { data } = await api.post("/points/daily-claim");
      setClaimed(true);
      setClaimMsg(`+5 points! Total: ${data.points}`);
    } catch (e) {
      setClaimMsg(e.response?.data?.detail || "Could not claim");
      setClaimed(true);
    }
  };

  return (
    <div className="space-y-10">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl border-2 border-black shadow-[8px_8px_0_#111] bg-[var(--primary)] text-white grain">
        <img
          src="https://images.unsplash.com/photo-1722803921446-70be3842871e?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzB8MHwxfHNlYXJjaHwxfHxhbmltZSUyMGNvbnZlbnRpb24lMjBjcm93ZHxlbnwwfHx8fDE3NzY4MDYyMjh8MA&ixlib=rb-4.1.0&q=85"
          className="absolute inset-0 w-full h-full object-cover mix-blend-multiply opacity-55"
          alt=""
        />
        <div className="relative p-6 md:p-10 flex flex-col md:flex-row md:items-end gap-6">
          <div className="flex-1">
            <Sticker color="secondary" className="tilt-1">★ Hey {user?.name?.split(" ")[0] || "Otaku"}</Sticker>
            <h1 className="font-black text-3xl md:text-5xl leading-tight mt-3 mb-2">
              Welcome to the<br/><span className="bg-black text-white px-2">Rintaki</span> hub.
            </h1>
            <p className="max-w-xl text-white/90">Catch up on articles, jump into the forums, and grab your daily Rinaka Points.</p>
            <div className="flex flex-wrap gap-2 mt-5">
              <Button variant="secondary" onClick={claimDaily} disabled={claimed} data-testid="claim-daily-btn">
                <Lightning size={16} weight="fill" /> {claimed ? claimMsg || "Claimed" : "Claim daily +5"}
              </Button>
              <Button as={Link} to="/forums" variant="dark" data-testid="home-goto-forums">
                <ChatsCircle size={16} weight="bold" /> Forums
              </Button>
            </div>
          </div>
          <div className="hidden md:flex flex-col gap-3">
            <div className="bg-white text-black border-2 border-black rounded-xl p-4 w-56 shadow-[4px_4px_0_#111] tilt-2">
              <div className="text-[10px] font-black uppercase tracking-widest text-[var(--muted-fg)]">Your points</div>
              <div className="font-black text-4xl">{user?.points ?? 0}</div>
              <div className="text-xs mt-1">Keep posting to climb the leaderboard.</div>
            </div>
          </div>
        </div>
      </section>

      {/* Rintaki feed */}
      <section>
        <SectionHeader title="From rintaki.org" icon={ArrowUpRight} subtitle="Latest articles pulled live from the website" />
        {feed.length === 0 ? (
          <Card><p className="text-sm text-[var(--muted-fg)]">No articles fetched yet.</p></Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 stagger">
            {feed.slice(0, 6).map((p) => (
              <a key={p.id} href={p.link} target="_blank" rel="noreferrer" className="block group" data-testid={`feed-card-${p.id}`}>
                <Card className="overflow-hidden p-0">
                  {p.image && (
                    <div className="aspect-video overflow-hidden border-b-2 border-black">
                      <img src={p.image} alt="" className="w-full h-full object-cover group-hover:scale-105 transition" />
                    </div>
                  )}
                  <div className="p-4">
                    <h3 className="font-black text-lg leading-snug line-clamp-2" dangerouslySetInnerHTML={{ __html: p.title }} />
                    <p className="mt-2 text-sm text-[var(--muted-fg)] line-clamp-2">{stripHtml(p.excerpt)}</p>
                    <div className="mt-3 text-xs font-bold uppercase tracking-widest flex items-center gap-1 text-[var(--primary)]">
                      Read article <ArrowUpRight size={14} weight="bold" />
                    </div>
                  </div>
                </Card>
              </a>
            ))}
          </div>
        )}
      </section>

      {/* Events + Leaderboard */}
      <section className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <SectionHeader title="Upcoming events" icon={Calendar} cta={{ to: "/events", label: "All events" }} />
          <div className="grid sm:grid-cols-2 gap-5 stagger">
            {events.slice(0, 4).map((ev) => (
              <Card key={ev.event_id} className="p-0 overflow-hidden" data-testid={`event-card-${ev.event_id}`}>
                {ev.cover_image && (
                  <div className="aspect-[16/9] overflow-hidden border-b-2 border-black">
                    <img src={ev.cover_image} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="p-4">
                  <Sticker color="accent" className="tilt-2">
                    <Calendar size={12} weight="bold" /> {new Date(ev.starts_at).toLocaleDateString()}
                  </Sticker>
                  <h3 className="font-black text-lg mt-2 leading-snug">{ev.title}</h3>
                  <p className="text-sm text-[var(--muted-fg)] mt-1 line-clamp-2">{ev.description}</p>
                  <p className="text-xs mt-2 font-bold uppercase tracking-widest">{ev.location}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
        <div>
          <SectionHeader title="Top members" icon={Trophy} cta={{ to: "/points", label: "Leaderboard" }} />
          <Card className="space-y-3">
            {leaders.slice(0, 5).map((m, i) => (
              <Link key={m.user_id} to={`/u/${m.user_id}`} className="flex items-center gap-3 hover:bg-[var(--muted)] -mx-2 px-2 py-1.5 rounded-lg" data-testid={`leader-${m.user_id}`}>
                <div className={`w-7 h-7 border-2 border-black rounded-full flex items-center justify-center text-xs font-black ${i === 0 ? "bg-[var(--secondary)]" : i === 1 ? "bg-[var(--accent)]" : "bg-white"}`}>
                  {i + 1}
                </div>
                <Avatar user={m} size={32} />
                <div className="flex-1 min-w-0">
                  <div className="font-bold truncate">{m.name}</div>
                  <div className="text-[10px] uppercase tracking-widest text-[var(--muted-fg)]">{m.role}</div>
                </div>
                <div className="font-black">{m.points}</div>
              </Link>
            ))}
            {leaders.length === 0 && <p className="text-sm text-[var(--muted-fg)]">No members yet.</p>}
          </Card>
        </div>
      </section>

      {/* Forums + Newsletters */}
      <section className="grid md:grid-cols-2 gap-6">
        <div>
          <SectionHeader title="Hot threads" icon={Fire} cta={{ to: "/forums", label: "All forums" }} />
          <div className="space-y-3 stagger">
            {threads.slice(0, 4).map((t) => (
              <Link key={t.thread_id} to={`/forums/${t.thread_id}`} data-testid={`hot-thread-${t.thread_id}`}>
                <Card className="hover:bg-[var(--muted)]">
                  <div className="flex items-center gap-2 mb-1">
                    <Sticker color="primary">{t.category}</Sticker>
                    {t.pinned && <Sticker color="secondary">📌 Pinned</Sticker>}
                  </div>
                  <h4 className="font-black text-lg line-clamp-2">{t.title}</h4>
                  <div className="text-xs text-[var(--muted-fg)] mt-2 font-bold uppercase tracking-widest">
                    {t.author_name} · {t.reply_count} replies · {t.likes?.length || 0} likes
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
        <div>
          <SectionHeader title="Otaku World newsletters" icon={Newspaper} cta={{ to: "/newsletters", label: "Archive" }} />
          <div className="space-y-3">
            {newsletters.slice(0, 3).map((n) => (
              <Link key={n.newsletter_id} to="/newsletters" className="block" data-testid={`nl-${n.newsletter_id}`}>
                <Card className="flex gap-3 p-3">
                  {n.cover_image && (
                    <img src={n.cover_image} alt="" className="w-20 h-20 object-cover rounded-lg border-2 border-black" />
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-black line-clamp-2">{n.title}</h4>
                    <p className="text-sm text-[var(--muted-fg)] line-clamp-2">{n.summary}</p>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function SectionHeader({ title, icon: Icon, subtitle, cta }) {
  return (
    <div className="flex items-end justify-between mb-4 gap-4 flex-wrap">
      <div>
        <h2 className="font-black text-2xl md:text-3xl flex items-center gap-2">
          {Icon && <Icon size={24} weight="fill" className="text-[var(--primary)]" />} {title}
        </h2>
        {subtitle && <p className="text-sm text-[var(--muted-fg)]">{subtitle}</p>}
      </div>
      {cta && (
        <Link to={cta.to} className="text-xs font-black uppercase tracking-widest underline decoration-[var(--primary)] decoration-2 underline-offset-4" data-testid={`cta-${cta.label.toLowerCase().replace(/\s/g,'-')}`}>
          {cta.label} →
        </Link>
      )}
    </div>
  );
}
