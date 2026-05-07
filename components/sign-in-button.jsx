"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";

function dashboardCallbackUrl() {
  return encodeURIComponent(window.location.href);
}

export function SignInButton() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handlePointerDown(event) {
      if (!menuRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }

    if (open) {
      window.addEventListener("pointerdown", handlePointerDown);
    }

    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  if (status === "loading") {
    return (
      <button className="ghostButton" disabled>
        Checking session
      </button>
    );
  }

  const userLabel = session?.user?.login || session?.user?.email || session?.user?.name || "GitHub user";

  return (
    <div className="accountMenu" ref={menuRef}>
      <button className={session ? "ghostButton accountButton" : "primaryButton accountButton"} onClick={() => setOpen((value) => !value)}>
        <span className="accountIcon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4.42 0-8 2.24-8 5v1h16v-1c0-2.76-3.58-5-8-5Z" />
          </svg>
        </span>
        <span>{session ? userLabel : "Sign in"}</span>
        <span className="chevron" aria-hidden="true">▾</span>
      </button>
      {open && (
        <div className="accountMenuPanel" role="menu">
          {session ? (
            <>
              <div className="accountMenuStatus">
                <span>Connected</span>
                <strong>GitHub</strong>
              </div>
              <button
                className="accountMenuItem dangerItem"
                role="menuitem"
                onClick={() => {
                  const next = `${window.location.pathname}${window.location.search}${window.location.hash}` || "/";
                  window.location.href = `/api/auth/logout?next=${encodeURIComponent(next)}`;
                }}
              >
                Sign out GitHub
              </button>
            </>
          ) : (
            <button
              className="accountMenuItem"
              role="menuitem"
              onClick={() => {
                const callbackUrl = dashboardCallbackUrl();
                window.location.href = `/api/auth/start?callbackUrl=${callbackUrl}`;
              }}
            >
              Sign in with GitHub
            </button>
          )}
        </div>
      )}
    </div>
  );
}
