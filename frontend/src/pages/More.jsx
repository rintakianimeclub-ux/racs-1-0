import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Card } from "@/components/ui-brutal";
import {
  Calendar, BookOpen, Buildings, Ticket, ShieldStar, CaretRight, SignOut, HouseLine, SignIn, Sparkle,
  TiktokLogo, InstagramLogo, TwitterLogo, FacebookLogo, YoutubeLogo, DiscordLogo,
} from "@phosphor-icons/react";

const TILES = [
  { to: "/magazines", label: "Magazine",   icon: BookOpen, color: "bg-[var(--secondary)]",              desc: "Otaku World PDFs" },
  { to: "/library",   label: "Library",    icon: Buildings, color: "bg-white",                          desc: "Our Libib collection" },
  { to: "/events",    label: "Events",     icon: Calendar,  color: "bg-[var(--primary)] text-white",    desc: "Upcoming & past events" },
  { to: "/tickets",   label: "My Tickets", icon: Ticket,    color: "bg-[var(--accent)]",                desc: "Your purchased tickets" },
];

export default function More() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isMember = !!user && (user.role === "admin" || user.is_member);
  const [links, setLinks] = useState({ social: {} });
  useEffect(() => { api.get("/links").then(({ data }) => setLinks(data)).catch(() => {}); }, []);

  const onLogout = async () => {
    // Navigate away first so any protected wrapper doesn't redirect to /login.
    navigate("/", { replace: true });
    await logout();
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-black text-3xl">More</h1>
        <p className="text-[var(--muted-fg)] text-sm">Your app menu.</p>
      </div>

      {user?.role === "admin" && (
        <Link to="/admin" data-testid="more-admin-panel">
          <Card className="bg-black text-white flex items-center gap-3">
            <div className="w-10 h-10 bg-[var(--secondary)] text-black border-2 border-black rounded-full flex items-center justify-center"><ShieldStar size={18} weight="fill" /></div>
            <div className="flex-1">
              <div className="font-black">Admin Panel</div>
              <div className="text-xs opacity-80">Manage members, events & content</div>
            </div>
            <CaretRight size={18} weight="bold" />
          </Card>
        </Link>
      )}

      {/* Members Dashboard — only for actual members */}
      {isMember && (
        <Link to="/dashboard" data-testid="more-members-panel">
          <Card className="bg-[var(--primary)] text-white flex items-center gap-3">
            <div className="w-10 h-10 bg-white text-black border-2 border-black rounded-full flex items-center justify-center"><ShieldStar size={18} weight="fill" /></div>
            <div className="flex-1">
              <div className="font-black">Members Dashboard</div>
              <div className="text-xs opacity-90">Members-only features & trips</div>
            </div>
            <CaretRight size={18} weight="bold" />
          </Card>
        </Link>
      )}

      {/* Non-member: show Join CTA */}
      {!isMember && (
        <Link to="/join" data-testid="more-join-cta">
          <Card className="bg-[var(--primary)] text-white flex items-center gap-3">
            <div className="w-10 h-10 bg-[var(--secondary)] text-black border-2 border-black rounded-full flex items-center justify-center"><Sparkle size={18} weight="fill" /></div>
            <div className="flex-1">
              <div className="font-black">Become a member</div>
              <div className="text-xs opacity-90">Unlock points, dashboard & perks</div>
            </div>
            <CaretRight size={18} weight="bold" />
          </Card>
        </Link>
      )}

      <div className="grid grid-cols-2 gap-3">
        {TILES.map((t) => (
          <Link key={t.to} to={t.to} data-testid={`tile-${t.label.toLowerCase().replace(/\s/g, "-")}`}>
            <Card className={`${t.color} h-full p-3`}>
              <t.icon size={24} weight="fill" />
              <div className="font-black mt-2 leading-tight">{t.label}</div>
              {t.desc && <div className="text-[11px] opacity-80">{t.desc}</div>}
            </Card>
          </Link>
        ))}
      </div>

      <div>
        <h2 className="font-black text-xl mb-2">Follow us</h2>
        <div className="grid grid-cols-3 gap-2">
          <SocialTile url={links.social?.tiktok}         icon={TiktokLogo}    label="TikTok" />
          <SocialTile url={links.social?.instagram}      icon={InstagramLogo} label="Instagram" />
          <SocialTile url={links.social?.twitter}        icon={TwitterLogo}   label="Twitter" />
          <SocialTile url={links.social?.facebook}       icon={FacebookLogo}  label="Facebook" />
          <SocialTile url={links.social?.youtube}        icon={YoutubeLogo}   label="YouTube" />
          <SocialTile url={links.social?.discord_public} icon={DiscordLogo}   label="Discord" />
        </div>
      </div>

      <a href="https://www.rintaki.org" target="_blank" rel="noreferrer" data-testid="website-link">
        <Card className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[var(--primary)] text-white border-2 border-black rounded-full flex items-center justify-center"><HouseLine size={18} weight="fill" /></div>
          <div className="flex-1">
            <div className="font-black">Open rintaki.org</div>
            <div className="text-xs text-[var(--muted-fg)]">Shop, fundraisers, full archive</div>
          </div>
          <CaretRight size={18} weight="bold" />
        </Card>
      </a>

      {user ? (
        <button onClick={onLogout} data-testid="logout-action"
                className="w-full bg-white brutal-btn rounded-xl py-3 font-bold uppercase tracking-wider flex items-center justify-center gap-2">
          <SignOut size={16} weight="bold" /> Logout
        </button>
      ) : (
        <Link to="/login" data-testid="more-login-link">
          <button className="w-full bg-black text-white brutal-btn rounded-xl py-3 font-bold uppercase tracking-wider flex items-center justify-center gap-2">
            <SignIn size={16} weight="bold" /> Sign in / Register
          </button>
        </Link>
      )}
    </div>
  );
}

function SocialTile({ url, icon: Icon, label }) {
  if (!url) return null;
  return (
    <a href={url} target="_blank" rel="noreferrer" data-testid={`social-${label.toLowerCase()}`}>
      <Card className="text-center p-2">
        <Icon size={22} weight="fill" className="mx-auto" />
        <div className="text-[10px] font-black uppercase tracking-widest mt-1">{label}</div>
      </Card>
    </a>
  );
}

