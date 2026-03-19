import Script from "next/script";

const gtmId = process.env.NEXT_PUBLIC_GTM_ID;
const plausibleDomain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;

export function AnalyticsPlaceholder() {
  return (
    <>
      <Script id="emp-analytics-bootstrap" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          window.empTrack = window.empTrack || function(eventName, payload) {
            window.dataLayer.push({
              event: eventName,
              site: "emp-marketing",
              ...payload
            });
          };
        `}
      </Script>

      {gtmId ? (
        <>
          <Script
            id="emp-gtm-script"
            src={`https://www.googletagmanager.com/gtm.js?id=${gtmId}`}
            strategy="afterInteractive"
          />
          <Script id="emp-gtm-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              window.dataLayer.push({
                "gtm.start": new Date().getTime(),
                event: "gtm.js"
              });
            `}
          </Script>
        </>
      ) : null}

      {plausibleDomain ? (
        <Script
          data-domain={plausibleDomain}
          defer
          src="https://plausible.io/js/script.js"
          strategy="afterInteractive"
        />
      ) : null}
    </>
  );
}
