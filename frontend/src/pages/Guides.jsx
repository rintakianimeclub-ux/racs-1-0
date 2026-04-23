import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Card, Button } from "@/components/ui-brutal";
import {
  ArrowLeft, Trophy, Buildings, CurrencyCircleDollar, ArrowsClockwise, ArrowSquareOut,
  Star, Users, PencilSimple, ShieldCheck, HandHeart, Gift, CaretRight, Lock,
} from "@phosphor-icons/react";

// Map a section heading → icon + brutal color.  Falls back to a neutral card.
const SECTION_STYLES = [
  { match: /member|active|status/i,           icon: Star,         color: "bg-[var(--primary)] text-white",   pill: "bg-[var(--secondary)] text-black" },
  { match: /sign.?in|sheet|fundraiser|hours/i, icon: Users,        color: "bg-[var(--accent)]",               pill: "bg-black text-white" },
  { match: /submission|article|review|blog/i,  icon: PencilSimple, color: "bg-[var(--secondary)]",            pill: "bg-[var(--primary)] text-white" },
  { match: /award|month|winner/i,              icon: Trophy,       color: "bg-[var(--purple)] text-white",    pill: "bg-[var(--secondary)] text-black" },
  { match: /community|sponsor/i,               icon: HandHeart,    color: "bg-white",                         pill: "bg-[var(--primary)] text-white" },
  { match: /bonus|extra|apparel/i,             icon: Gift,         color: "bg-[var(--secondary)]",            pill: "bg-black text-white" },
  { match: /spend|redeem|use/i,                icon: ShieldCheck,  color: "bg-black text-white",              pill: "bg-[var(--secondary)] text-black" },
];
function styleForSection(heading) {
  const s = SECTION_STYLES.find((s) => s.match.test(heading));
  return s || { icon: Star, color: "bg-white", pill: "bg-[var(--primary)] text-white" };
}

// Friendlier label for unit strings ("pts per hr" → "pts/hr", "per month" → "/mo", etc)
function shortUnit(unit) {
  if (!unit) return "";
  return unit
    .replace(/^pts?$|^points?$/i, "pts")
    .replace(/per\s*hr/i, "/ hr")
    .replace(/per\s*month/i, "/ mo")
    .replace(/per\s*year/i, "/ yr")
    .replace(/per\s*\$/i, "/ $")
    .replace(/per\s*\$(\d+)/i, "/ $$$1")
    .trim();
}

function ItemRow({ item, pill }) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-dashed border-black/10 last:border-0" data-testid="guide-item">
      <div className={`shrink-0 min-w-[64px] text-center border-2 border-black rounded-full px-2.5 py-1 font-black text-xs uppercase tracking-wider ${pill}`}>
        {item.amount}{item.unit ? ` ${shortUnit(item.unit).replace(/^pts\b/, "pts")}` : ""}
      </div>
      <div className="text-sm flex-1">{item.desc}</div>
    </div>
  );
}

function SectionCard({ section }) {
  const { icon: Icon, color, pill } = styleForSection(section.heading);
  return (
    <Card className={`${color} p-0 overflow-hidden`} data-testid={`guide-section-${section.heading.toLowerCase().replace(/\s+/g,"-")}`}>
      <div className="flex items-center gap-2 px-3 py-2 border-b-2 border-black bg-black/5">
        <div className="w-9 h-9 bg-white text-black border-2 border-black rounded-full flex items-center justify-center">
          <Icon size={18} weight="fill" />
        </div>
        <div className="font-black text-base leading-tight flex-1">{section.heading}</div>
        {section.items?.length > 0 && (
          <span className="text-[10px] font-black uppercase tracking-widest bg-white border-2 border-black rounded-full px-2 py-0.5 text-black">
            {section.items.length}
          </span>
        )}
      </div>
      {section.intro && (
        <p className="text-[13px] leading-snug px-3 pt-3 opacity-90">{section.intro}</p>
      )}
      {section.items?.length > 0 && (
        <div className="px-3 pb-3 pt-1 bg-white/80 text-black mt-3 border-t-2 border-black">
          {section.items.map((it, i) => (
            <ItemRow key={i} item={it} pill={pill} />
          ))}
        </div>
      )}
    </Card>
  );
}

function ParsedGuide({ endpoint, title, icon: Icon, subtitle, source_url, heroStat, lockedBody, fallbackSections }) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const load = async (refresh = false) => {
    try {
      setErr("");
      if (refresh) setRefreshing(true); else setLoading(true);
      const { data: d } = await api.get(endpoint, { params: refresh ? { refresh: 1 } : {} });
      setData(d);
    } catch (e) {
      setErr(e.response?.data?.detail || "Couldn't reach rintaki.org.");
    } finally {
      setRefreshing(false); setLoading(false);
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [endpoint]);

  // When rintaki.org returns the PMPro "Membership Required" placeholder,
  // the parser will produce a single section with heading like "Membership Required".
  const sections = data?.sections || [];
  const isLocked = sections.length === 1 && /membership required|members? only|restricted/i.test(sections[0].heading || "");
  const useFallback = !loading && !err && (isLocked || sections.length === 0) && fallbackSections;

  return (
    <div className="space-y-5 pb-6">
      <Link to="/dashboard" className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest" data-testid="back-dash">
        <ArrowLeft size={14} weight="bold" /> Back
      </Link>

      {/* Hero */}
      <Card className="bg-black text-white p-0 overflow-hidden">
        <div className="flex items-center gap-3 p-4">
          <div className="w-14 h-14 bg-[var(--primary)] text-white border-2 border-black rounded-2xl flex items-center justify-center shadow-[3px_3px_0_#fff]">
            <Icon size={26} weight="fill" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-black text-2xl leading-tight">{title}</h1>
            {subtitle && <p className="text-[12px] opacity-80 leading-snug">{subtitle}</p>}
          </div>
          {isAdmin && (
            <button onClick={() => load(true)} disabled={refreshing} data-testid="guide-refresh"
              className="w-10 h-10 bg-white text-black border-2 border-black rounded-full flex items-center justify-center shadow-[2px_2px_0_#fff] disabled:opacity-50">
              <ArrowsClockwise size={14} weight="bold" className={refreshing ? "animate-spin" : ""} />
            </button>
          )}
        </div>
        {heroStat && (
          <div className="bg-[var(--primary)] px-4 py-2 border-t-2 border-white/30 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest opacity-90">{heroStat.label}</span>
            <span className="font-black text-xl">{heroStat.value}</span>
          </div>
        )}
      </Card>

      {loading ? (
        <Card data-testid="guide-loading" className="text-center">
          <div className="animate-pulse text-sm font-bold text-[var(--muted-fg)]">Syncing from rintaki.org…</div>
        </Card>
      ) : err ? (
        <Card className="bg-[var(--secondary)]" data-testid="guide-err">
          <p className="text-sm font-bold">Couldn't reach rintaki.org.</p>
          <p className="text-xs text-[var(--muted-fg)] mt-1">{err}</p>
        </Card>
      ) : useFallback ? (
        <>
          {isLocked && (
            <Card className="bg-[var(--secondary)]" data-testid="guide-locked">
              <div className="flex items-center gap-2 font-black"><Lock size={16} weight="fill" /> Locked on rintaki.org</div>
              <p className="text-sm mt-1">{lockedBody || "The website requires a member login to view this page. Here's the in-app summary while we wait for admin to open it up."}</p>
            </Card>
          )}
          {fallbackSections.map((s, i) => <SectionCard key={i} section={s} />)}
        </>
      ) : (
        <>
          {sections.map((s, i) => <SectionCard key={i} section={s} />)}
        </>
      )}

      <div className="pt-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-[var(--muted-fg)]">
        <span data-testid="guide-cached">
          {useFallback ? "Offline summary" : data?.stale ? "Cached · sync failed" : data?.cached ? "From cache" : "Just synced"}
        </span>
        <a href={source_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline text-[var(--primary)]">
          Open on rintaki.org <ArrowSquareOut size={10} weight="bold" />
        </a>
      </div>
    </div>
  );
}

// --- Offline fallbacks (used only when rintaki.org locks the page) ---
const ANIME_CASH_FALLBACK = [
  {
    heading: "How Anime Cash works",
    level: 3,
    intro: "Anime Cash is real store credit. $1 Anime Cash = $1 off at the club shop. Balances sync live with MyCred on rintaki.org.",
    items: [],
  },
  {
    heading: "Earning Anime Cash",
    level: 3,
    intro: "",
    items: [
      { amount: "$5", unit: "/ mo", desc: "Regular membership" },
      { amount: "$10", unit: "/ mo", desc: "Premium membership" },
      { amount: "100", unit: "cash", desc: "Complete a theme set" },
      { amount: "25", unit: "cash", desc: "Article of the month" },
      { amount: "Varies", unit: "", desc: "Giveaway & contest bonuses" },
    ],
  },
  {
    heading: "Spending Anime Cash",
    level: 3,
    intro: "Applies automatically at checkout on rintaki.org — no code needed. Stacks with coupon codes where allowed. Does not expire while membership stays active.",
    items: [],
  },
];

export function PointsGuide() {
  const { user } = useAuth();
  const heroStat = user ? { label: "Your points", value: user.points ?? 0 } : null;
  return (
    <ParsedGuide
      endpoint="/guides/points/parsed"
      title="Points Guide"
      subtitle="Earn reputation & perks by participating in the club."
      icon={Trophy}
      source_url="https://rintaki.org/points/"
      heroStat={heroStat}
    />
  );
}

export function AnimeCashGuide() {
  const { user } = useAuth();
  const heroStat = user ? { label: "Your Anime Cash", value: `$${user.anime_cash ?? 0}` } : null;
  return (
    <ParsedGuide
      endpoint="/guides/anime-cash/parsed"
      title="Anime Cash"
      subtitle="Real store credit for the club shop — $1 = $1 off."
      icon={CurrencyCircleDollar}
      source_url="https://rintaki.org/member-dashboard/anime-cash/"
      heroStat={heroStat}
      fallbackSections={ANIME_CASH_FALLBACK}
      lockedBody="The Anime Cash page on rintaki.org is members-only. Here's the summary — we'll pull the live content as soon as the page is opened to the public."
    />
  );
}

export function LibraryGuide() {
  return (
    <div className="space-y-5">
      <Link to="/dashboard" className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest"><ArrowLeft size={14} weight="bold" /> Back</Link>
      <div>
        <h1 className="font-black text-3xl flex items-center gap-2"><Buildings size={26} weight="fill" className="text-[var(--primary)]" /> Library guide</h1>
      </div>
      <Card>
        <h3 className="font-black text-lg">How borrowing works</h3>
        <ol className="list-decimal pl-5 text-sm mt-2 space-y-1">
          <li>Browse the catalog on Libib (see Library tab).</li>
          <li>Message an admin to reserve a title (DM inside the app).</li>
          <li>Pick up at the club / meetup and enjoy.</li>
          <li>Return by due date to earn +5 points per title.</li>
        </ol>
      </Card>
      <Card>
        <h3 className="font-black text-lg">Late returns</h3>
        <p className="text-sm mt-1">Late returns cost 3 points per week. Repeat late returns may limit future borrowing.</p>
      </Card>
    </div>
  );
}
