"use client";

import { useEffect, useState } from "react";

interface PageMetaProps {
  title?: string;
  description?: string;
  ogImage?: string;
  ogType?: string;
  ogUrl?: string;
  canonical?: string;
  noIndex?: boolean;
  jsonLd?: Record<string, unknown>;
}

const SITE_NAME = "VideoTube";
const DEFAULT_DESCRIPTION = "Discover, watch, and share videos on VideoTube — a premium video sharing platform.";
const DEFAULT_OG_IMAGE = "/opengraph-image";

export function PageMeta({
  title,
  description,
  ogImage,
  ogType = "website",
  ogUrl,
  canonical,
  noIndex,
  jsonLd,
}: PageMetaProps) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
  const currentDesc = description || DEFAULT_DESCRIPTION;
  const currentOgImage = ogImage || DEFAULT_OG_IMAGE;

  // We need to reliably grab window.location only on the client
  const [currentUrl, setCurrentUrl] = useState("");
  useEffect(() => {
    setCurrentUrl(`${window.location.origin}${window.location.pathname}${window.location.search}`);
  }, []);

  const canonicalUrl = canonical || ogUrl || currentUrl;

  return (
    <>
      <title>{fullTitle}</title>
      <meta name="description" content={currentDesc} />

      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={currentDesc} />
      <meta property="og:type" content={ogType} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:image" content={currentOgImage} />
      {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={currentDesc} />
      <meta name="twitter:image" content={currentOgImage} />

      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}

      {noIndex && <meta name="robots" content="noindex, nofollow" />}

      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
    </>
  );
}
