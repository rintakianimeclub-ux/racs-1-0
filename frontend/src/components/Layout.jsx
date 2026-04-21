import React from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  HouseSimple,
  ChatsCircle,
  Calendar,
  Trophy,
  User,
  Bell,
  SignOut,
  Newspaper,
  VideoCamera,
  PaperPlaneTilt,
  ShieldStar,
} from "@phosphor-icons/react";

const NAV = [
  { to: "/", label: "Home", icon: HouseSimple },
  { to: "/forums", label: "Forums", icon: ChatsCircle },
  { to: "/events", label: "Events", icon: Calendar },
  { to: "/points", label: "Points", icon: Trophy },
  { to: "/messages", label: "DMs", icon: PaperPlaneTilt },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen pb-24 md:pb-0">
      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-[var(--bg)] border-b-2 border-black">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2" data-testid="brand-link">
            <div className="w-9 h-9 bg-[var(--primary)] border-2 border-black rounded-full flex items-center justify-center text-white font-black tilt-2">
              R
            </div>
            <div className="leading-tight">
              <div className="font-black text-lg tracking-tight">RINTAKI</div>
              <div className="text-[10px] uppercase tracking-[0.25em] text-[var(--muted-fg)]">Anime Club</div>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                data-testid={`nav-${label.toLowerCase()}`}
                className={({ isActive }) =>
                  `px-3 py-2 rounded-full border-2 flex items-center gap-2 font-bold text-sm transition ${
                    isActive
                      ? "bg-[var(--primary)] text-white border-black shadow-[3px_3px_0_#111]"
                      : "bg-white text-black border-black hover:bg-[var(--secondary)]"
                  }`
                }
              >
                <Icon size={16} weight="bold" /> {label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {user && (
              <>
                <div className="hidden sm:flex items-center gap-2 bg-[var(--secondary)] border-2 border-black rounded-full px-3 py-1.5 shadow-[3px_3px_0_#111]" data-testid="points-pill">
                  <Trophy size={14} weight="fill" />
                  <span className="font-black text-sm">{user.points ?? 0}</span>
                  <span className="text-[10px] uppercase tracking-widest">pts</span>
                </div>
                <button
                  onClick={() => navigate("/notifications")}
                  className="w-10 h-10 bg-white border-2 border-black rounded-full flex items-center justify-center brutal-btn"
                  data-testid="notif-btn"
                  aria-label="Notifications"
                >
                  <Bell size={18} weight="bold" />
                </button>
                <button
                  onClick={() => navigate("/profile")}
                  className="w-10 h-10 bg-[var(--accent)] border-2 border-black rounded-full flex items-center justify-center brutal-btn font-black"
                  data-testid="profile-btn"
                  aria-label="Profile"
                >
                  {user.picture ? (
                    <img src={user.picture} className="w-full h-full rounded-full object-cover" alt="" />
                  ) : (
                    <span>{user.name?.[0]?.toUpperCase() || "U"}</span>
                  )}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Desktop secondary bar with more links */}
        {user && (
          <div className="hidden md:block border-t-2 border-black bg-[var(--muted)]">
            <div className="max-w-6xl mx-auto px-4 py-1.5 flex items-center gap-1 overflow-x-auto scrollbar-hide">
              <SubNav to="/newsletters" icon={Newspaper} label="Newsletters" />
              <SubNav to="/videos" icon={VideoCamera} label="Videos" />
              <SubNav to="/members" icon={User} label="Members" />
              {user.role === "admin" && <SubNav to="/admin" icon={ShieldStar} label="Admin" />}
              <button
                onClick={logout}
                data-testid="logout-btn"
                className="ml-auto px-3 py-1 text-xs font-bold uppercase tracking-wider flex items-center gap-1 hover:text-[var(--primary)]"
              >
                <SignOut size={14} weight="bold" /> Logout
              </button>
            </div>
          </div>
        )}
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 md:py-10">{children}</main>

      {/* Mobile bottom nav */}
      {user && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t-2 border-black z-40">
          <div className="grid grid-cols-5">
            {NAV.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                data-testid={`mobile-nav-${label.toLowerCase()}`}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center py-2 text-[10px] font-bold uppercase tracking-wider ${
                    isActive ? "text-[var(--primary)]" : "text-black"
                  }`
                }
              >
                <Icon size={22} weight={"bold"} />
                <span className="mt-0.5">{label}</span>
              </NavLink>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
}

function SubNav({ to, icon: Icon, label }) {
  return (
    <NavLink
      to={to}
      data-testid={`subnav-${label.toLowerCase()}`}
      className={({ isActive }) =>
        `px-3 py-1 text-xs font-bold uppercase tracking-wider flex items-center gap-1 rounded-full ${
          isActive ? "bg-black text-white" : "hover:text-[var(--primary)]"
        }`
      }
    >
      <Icon size={14} weight="bold" /> {label}
    </NavLink>
  );
}
