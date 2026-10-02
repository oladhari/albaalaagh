"use client";

import { useSyncExternalStore } from "react";
import Script from "next/script";

const CONSENT_KEY = "cookie-consent";
const CONSENT_EVENT = "cookie-consent-changed";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(CONSENT_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(CONSENT_EVENT, callback);
  };
}

function getSnapshot() {
  return localStorage.getItem(CONSENT_KEY);
}

function getServerSnapshot() {
  return "pending";
}

export default function GoogleAnalytics({ nonce }: { nonce?: string }) {
  const consent = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (consent !== "accepted") return null;

  return (
    <>
      <Script
        src="https://www.googletagmanager.com/gtag/js?id=G-NMKWZ1979E"
        strategy="afterInteractive"
        nonce={nonce}
      />
      <Script id="google-analytics" strategy="afterInteractive" nonce={nonce}>
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-NMKWZ1979E', { anonymize_ip: true });
        `}
      </Script>
    </>
  );
}
