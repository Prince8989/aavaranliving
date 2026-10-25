"use client";

import Link from "next/link";
import Script from "next/script";
import { useEffect, useState } from "react";

const COOKIE = "aav_consent";
type Choice = "all" | "essential";

function readChoice(): Choice | null {
  const m = document.cookie.match(/(?:^|; )aav_consent=(all|essential)/);
  return (m?.[1] as Choice) ?? null;
}

function saveChoice(c: Choice) {
  document.cookie = `${COOKIE}=${c}; path=/; max-age=${60 * 60 * 24 * 180}; samesite=lax${location.protocol === "https:" ? "; secure" : ""}`;
  window.dispatchEvent(new Event("aav-consent"));
}

/**
 * Non-essential tracking (GA4, Meta Pixel) loads only after explicit opt-in. Applies to all visitors,
 * which satisfies UK/EU requirements without relying on geolocation.
 */
export function ConsentBanner({ gaId, pixelId }: { gaId?: string; pixelId?: string }) {
  const [choice, setChoice] = useState<Choice | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setChoice(readChoice());
    setReady(true);
    const reopen = () => setChoice(null);
    window.addEventListener("aav-consent-open", reopen);
    return () => window.removeEventListener("aav-consent-open", reopen);
  }, []);

  const trackingConfigured = !!(gaId || pixelId);
  const allowed = choice === "all";

  return (
    <>
      {allowed && gaId && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
          <Script id="ga4" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}window.gtag=gtag;gtag('js',new Date());gtag('config','${gaId}',{anonymize_ip:true});`}
          </Script>
        </>
      )}
      {allowed && pixelId && (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixelId}');fbq('track','PageView');`}
        </Script>
      )}

      {ready && trackingConfigured && choice === null && (
        <div role="region" aria-label="Cookie preferences" className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-xl bg-obsidian p-6 text-sandstone shadow-2xl sm:inset-x-auto sm:right-6">
          <p className="text-sm leading-relaxed">
            We use essential cookies to run this site. With your permission, we&apos;d also like to use analytics and advertising cookies to understand how
            the site is used. See our{" "}
            <Link href="/policies/privacy" className="text-ivory underline underline-offset-4">
              Privacy Policy
            </Link>
            .
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              className="bg-ivory px-5 py-2.5 text-xs uppercase tracking-[0.15em] text-obsidian"
              onClick={() => {
                saveChoice("all");
                setChoice("all");
              }}
            >
              Accept all
            </button>
            <button
              type="button"
              className="border border-sandstone/60 px-5 py-2.5 text-xs uppercase tracking-[0.15em]"
              onClick={() => {
                saveChoice("essential");
                setChoice("essential");
              }}
            >
              Essential only
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export function ConsentSettingsLink() {
  return (
    <button type="button" className="hover:text-ivory" onClick={() => window.dispatchEvent(new Event("aav-consent-open"))}>
      Cookie settings
    </button>
  );
}
