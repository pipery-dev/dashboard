"use client";

import { useEffect, useRef, useState } from "react";
import { usePiperySession } from "@/components/use-pipery-session";

const providerLabels = {
  github: "GitHub",
  gitlab: "GitLab",
  bitbucket: "Bitbucket"
};

const providers = ["github", "gitlab", "bitbucket"];

export function SignInButton() {
  const { data: session, status } = usePiperySession();
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

  const authenticatedProviders = session?.accounts ? Object.keys(session.accounts) : [];
  const userLabel =
    session?.user?.login ||
    session?.user?.email ||
    session?.user?.name ||
    authenticatedProviders.map((provider) => session?.accounts?.[provider]?.login).find(Boolean) ||
    "Pipery account";
  const handleSignIn = (provider) => {
    const callbackUrl = encodeURIComponent(window.location.href);
    window.location.href = `/api/auth/start?provider=${provider}&callbackUrl=${callbackUrl}`;
  };
  const handleLogout = (provider) => {
    const next = `${window.location.pathname}${window.location.search}${window.location.hash}` || "/";
    const providerParam = provider ? `&provider=${provider}` : "";
    window.location.href = `/api/auth/logout?next=${encodeURIComponent(next)}${providerParam}`;
  };

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
          {providers.map((provider) => {
            const connected = authenticatedProviders.includes(provider);
            return (
              <div className="accountMenuProvider" key={provider}>
                <div className="accountMenuStatus">
                  <span>{connected ? "Connected" : session ? "Not connected" : "Provider"}</span>
                  <strong>{providerLabels[provider]}</strong>
                </div>
                <button
                  className={`accountMenuItem ${connected ? "dangerItem" : ""}`}
                  role="menuitem"
                  onClick={() => connected ? handleLogout(provider) : handleSignIn(provider)}
                >
                  {connected ? "Sign out" : "Sign in"}
                </button>
              </div>
            );
          })}
          {authenticatedProviders.length > 1 ? (
            <button className="accountMenuItem dangerItem" role="menuitem" onClick={() => handleLogout()}>
              Sign out all
              </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
