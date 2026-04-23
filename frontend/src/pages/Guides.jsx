import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Card, Button } from "@/components/ui-brutal";
import { ArrowLeft, Trophy, Buildings, CurrencyCircleDollar, ArrowsClockwise, ArrowSquareOut } from "@phosphor-icons/react";

function LiveGuide({ endpoint, title, icon: Icon, fallback, source_url }) {
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
      setErr(e.response?.data?.detail || "Couldn’t load live content.");
    } finally {
      setRefreshing(false); setLoading(false);
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [endpoint]);

  return (
    <div className="space-y-5">
      <Link to="/dashboard" className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest" data-testid="back-dash">
        <ArrowLeft size={14} weight="bold" /> Back
      </Link>
      <div className="flex items-start justify-between gap-2">
        <h1 className="font-black text-3xl flex items-center gap-2">
          <Icon size={26} weight="fill" className="text-[var(--primary)]" /> {title}
        </h1>
        {isAdmin && (
          <button onClick={() => load(true)} disabled={refreshing} data-testid="guide-refresh"
            className="w-9 h-9 border-2 border-black rounded-full bg-white flex items-center justify-center shadow-[2px_2px_0_#111] disabled:opacity-50">
            <ArrowsClockwise size={14} weight="bold" className={refreshing ? "animate-spin" : ""} />
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-sm text-[var(--muted-fg)]" data-testid="guide-loading">Syncing from rintaki.org…</div>
      ) : err ? (
        <>
          <Card className="bg-[var(--secondary)]" data-testid="guide-err">
            <p className="text-sm font-bold">Couldn’t reach rintaki.org — showing offline guide.</p>
            <p className="text-xs text-[var(--muted-fg)] mt-1">{err}</p>
          </Card>
          {fallback}
        </>
      ) : data?.html ? (
        <>
          <div
            data-testid="guide-live-html"
            className="rintaki-guide space-y-3 text-sm leading-relaxed"
            dangerouslySetInnerHTML={{ __html: data.html }}
          />
          <div className="pt-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-[var(--muted-fg)]">
            <span data-testid="guide-cached">
              {data.stale ? "Cached (sync failed — showing last)" : data.cached ? "From cache" : "Just synced"}
            </span>
            <a href={source_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline text-[var(--primary)]">
              Open on rintaki.org <ArrowSquareOut size={10} weight="bold" />
            </a>
          </div>
        </>
      ) : (
        <>
          <Card><p className="text-sm text-[var(--muted-fg)]">No content yet on rintaki.org.</p></Card>
          {fallback}
        </>
      )}
    </div>
  );
}

const PointsFallback = (
  <>
    <Card>
      <h3 className="font-black text-lg">How to earn (offline)</h3>
      <ul className="text-sm mt-2 space-y-1">
        <li className="flex justify-between"><span>Welcome bonus</span><b>+10</b></li>
        <li className="flex justify-between"><span>Daily login</span><b>+5</b></li>
        <li className="flex justify-between"><span>New forum thread</span><b>+5</b></li>
        <li className="flex justify-between"><span>Reply</span><b>+2</b></li>
        <li className="flex justify-between"><span>Spotlight photo (approved)</span><b>+1</b></li>
        <li className="flex justify-between"><span>Spotlight video (approved, ≤15s)</span><b>+2</b></li>
        <li className="flex justify-between"><span>Approved blog article</span><b>+25</b></li>
        <li className="flex justify-between"><span>Approved magazine article</span><b>+50</b></li>
        <li className="flex justify-between"><span>Theme set completion</span><b>+50 pts + 100 Anime Cash</b></li>
      </ul>
    </Card>
  </>
);

const AnimeCashFallback = (
  <>
    <Card>
      <h3 className="font-black text-lg">What is Anime Cash?</h3>
      <p className="text-sm mt-1">Anime Cash is store credit you can spend in the Catalog and at rintaki.org. $1 Anime Cash = $1 off. Balances sync live with MyCred on rintaki.org.</p>
    </Card>
    <Card>
      <h3 className="font-black text-lg">How you earn it</h3>
      <ul className="text-sm mt-2 space-y-1">
        <li className="flex justify-between"><span>Regular membership</span><b>$5 / month</b></li>
        <li className="flex justify-between"><span>Premium membership</span><b>$10 / month</b></li>
        <li className="flex justify-between"><span>Theme set completion</span><b>+100</b></li>
        <li className="flex justify-between"><span>Giveaway / contest bonus</span><b>varies</b></li>
        <li className="flex justify-between"><span>Article of the month</span><b>+25</b></li>
      </ul>
    </Card>
  </>
);

export function PointsGuide() {
  return (
    <LiveGuide
      endpoint="/guides/points"
      title="Points guide"
      icon={Trophy}
      fallback={PointsFallback}
      source_url="https://rintaki.org/points/"
    />
  );
}

export function AnimeCashGuide() {
  return (
    <LiveGuide
      endpoint="/guides/anime-cash"
      title="Anime Cash guide"
      icon={CurrencyCircleDollar}
      fallback={AnimeCashFallback}
      source_url="https://rintaki.org/member-dashboard/anime-cash/"
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
