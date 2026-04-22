import React, { useEffect, useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { Card, Button, Sticker } from "@/components/ui-brutal";
import { CheckCircle, Ticket as TicketIcon, XCircle, Spinner } from "@phosphor-icons/react";

export function TicketSuccess() {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const [status, setStatus] = useState({ loading: true, paid: false, text: "Checking payment…" });
  const navigate = useNavigate();

  useEffect(() => {
    if (!sessionId) { setStatus({ loading: false, paid: false, text: "No session id" }); return; }
    let attempts = 0;
    const max = 10;
    const poll = async () => {
      try {
        const { data } = await api.get(`/payments/status/${sessionId}`);
        if (data.payment_status === "paid") { setStatus({ loading: false, paid: true, text: "Payment confirmed!" }); return; }
        if (data.status === "expired") { setStatus({ loading: false, paid: false, text: "Session expired." }); return; }
        attempts++;
        if (attempts >= max) { setStatus({ loading: false, paid: false, text: "Still processing. Check My Tickets in a moment." }); return; }
        setTimeout(poll, 2000);
      } catch {
        setStatus({ loading: false, paid: false, text: "Could not verify payment." });
      }
    };
    poll();
  }, [sessionId]);

  return (
    <div className="py-10 text-center space-y-5">
      {status.loading ? (
        <>
          <div className="w-16 h-16 bg-[var(--secondary)] border-2 border-black rounded-full mx-auto flex items-center justify-center animate-pulse"><Spinner size={28} weight="bold" /></div>
          <h1 className="font-black text-2xl">Processing…</h1>
          <p className="text-sm text-[var(--muted-fg)]">{status.text}</p>
        </>
      ) : status.paid ? (
        <>
          <div className="w-16 h-16 bg-[var(--accent)] border-2 border-black rounded-full mx-auto flex items-center justify-center shadow-[4px_4px_0_#111] tilt-2"><CheckCircle size={28} weight="fill" /></div>
          <h1 className="font-black text-3xl">You're in!</h1>
          <p className="text-sm">Your ticket has been issued.</p>
          <div className="flex gap-2 justify-center">
            <Link to="/tickets"><Button>View my tickets</Button></Link>
            <Link to="/"><Button variant="ghost">Home</Button></Link>
          </div>
        </>
      ) : (
        <>
          <div className="w-16 h-16 bg-[var(--primary)] text-white border-2 border-black rounded-full mx-auto flex items-center justify-center"><XCircle size={28} weight="fill" /></div>
          <h1 className="font-black text-3xl">Something went wrong</h1>
          <p className="text-sm text-[var(--muted-fg)]">{status.text}</p>
          <Link to="/events"><Button variant="ghost">Back to events</Button></Link>
        </>
      )}
    </div>
  );
}

export function MyTickets() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-black text-3xl flex items-center gap-2"><TicketIcon size={26} weight="fill" className="text-[var(--primary)]" /> My tickets</h1>
        <p className="text-[var(--muted-fg)] text-sm">Your tickets live on rintaki.org via Event Tickets.</p>
      </div>
      <Card className="p-5 bg-[var(--secondary)]">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-white border-2 border-black rounded-full flex items-center justify-center"><TicketIcon size={18} weight="fill" /></div>
          <div className="flex-1">
            <div className="font-black">Open ticket portal</div>
            <p className="text-sm mt-1">You'll log in on rintaki.org to see the tickets you've purchased.</p>
          </div>
        </div>
        <a href="https://rintaki.org/tickets/" target="_blank" rel="noreferrer" className="block mt-4" data-testid="open-tickets-btn">
          <Button className="w-full">Open my tickets →</Button>
        </a>
      </Card>
      <Link to="/events" data-testid="browse-events-link">
        <Card className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[var(--primary)] text-white border-2 border-black rounded-full flex items-center justify-center"><TicketIcon size={18} weight="fill" /></div>
          <div className="flex-1">
            <div className="font-black">Browse events</div>
            <div className="text-xs text-[var(--muted-fg)]">Find something new to attend</div>
          </div>
        </Card>
      </Link>
    </div>
  );
}
