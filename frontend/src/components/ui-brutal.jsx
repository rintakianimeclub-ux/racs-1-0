import React from "react";

export function Button({ as: Tag = "button", variant = "primary", className = "", children, ...props }) {
  const styles = {
    primary: "btn-primary",
    secondary: "btn-secondary",
    accent: "btn-accent",
    ghost: "btn-ghost",
    dark: "bg-black text-white",
  };
  return (
    <Tag
      className={`inline-flex items-center justify-center gap-2 font-bold uppercase tracking-wide rounded-full px-5 py-2.5 text-sm brutal-btn ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </Tag>
  );
}

export function Card({ className = "", children, tilt, ...rest }) {
  return (
    <div className={`bg-[var(--card)] brutal rounded-xl p-4 ${tilt || ""} ${className}`} {...rest}>
      {children}
    </div>
  );
}

export function Sticker({ className = "", color = "secondary", children, ...rest }) {
  const palette = {
    secondary: "bg-[var(--secondary)]",
    accent: "bg-[var(--accent)]",
    primary: "bg-[var(--primary)] text-white",
    white: "bg-white",
    black: "bg-black text-white",
  };
  return (
    <span className={`sticker ${palette[color]} ${className}`} {...rest}>
      {children}
    </span>
  );
}

export function Input(props) {
  return (
    <input
      {...props}
      className={`w-full rounded-lg border-2 border-black px-4 py-3 bg-white font-medium placeholder:text-[var(--muted-fg)] shadow-[3px_3px_0_#111] focus:shadow-[5px_5px_0_#111] transition ${props.className || ""}`}
    />
  );
}

export function Textarea(props) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-lg border-2 border-black px-4 py-3 bg-white font-medium placeholder:text-[var(--muted-fg)] shadow-[3px_3px_0_#111] focus:shadow-[5px_5px_0_#111] transition ${props.className || ""}`}
    />
  );
}

export function Avatar({ user, size = 36 }) {
  const letter = user?.name?.[0]?.toUpperCase() || "?";
  const bg = user?.picture ? "bg-white" : "bg-[var(--accent)]";
  return (
    <div
      className={`rounded-full border-2 border-black ${bg} flex items-center justify-center font-black overflow-hidden`}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {user?.picture ? <img src={user.picture} alt="" className="w-full h-full object-cover" /> : letter}
    </div>
  );
}

export function EmptyState({ title, body, icon: Icon }) {
  return (
    <div className="text-center py-12 px-4" data-testid="empty-state">
      {Icon && (
        <div className="inline-flex w-16 h-16 bg-[var(--secondary)] border-2 border-black rounded-full items-center justify-center mb-4 shadow-[4px_4px_0_#111] tilt-2">
          <Icon size={28} weight="bold" />
        </div>
      )}
      <h3 className="font-black text-xl mb-1">{title}</h3>
      {body && <p className="text-[var(--muted-fg)] max-w-md mx-auto">{body}</p>}
    </div>
  );
}
