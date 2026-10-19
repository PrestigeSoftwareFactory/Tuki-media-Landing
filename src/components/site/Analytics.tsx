import Script from "next/script";
import { getSettings } from "@/lib/settings";

/** Google Analytics 4 y Meta Pixel (solo si se configuraron en Admin → Configuración). */
export async function Analytics() {
  const s = await getSettings();
  const ga = /^G-[A-Z0-9]{4,20}$/i.test(s.gaMeasurementId) ? s.gaMeasurementId : "";
  const pixel = /^\d{6,20}$/.test(s.metaPixelId) ? s.metaPixelId : "";
  if (!ga && !pixel) return null;
  return (
    <>
      {ga && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${ga}`} strategy="afterInteractive" />
          <Script id="ga4" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${ga}');`}
          </Script>
        </>
      )}
      {pixel && (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixel}');fbq('track','PageView');`}
        </Script>
      )}
    </>
  );
}
