"use client";

import { useEffect, useRef } from "react";

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
  const previousTitle = useRef("");

  useEffect(() => {
    previousTitle.current = document.title;
    const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
    document.title = fullTitle;

    const setMeta = (name: string, content: string, property = false) => {
      const attr = property ? "property" : "name";
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    const removeMeta = (name: string, property = false) => {
      const attr = property ? "property" : "name";
      const el = document.querySelector(`meta[${attr}="${name}"]`);
      if (el) el.remove();
    };

    setMeta("description", description || DEFAULT_DESCRIPTION);

    setMeta("og:title", fullTitle, true);
    setMeta("og:description", description || DEFAULT_DESCRIPTION, true);
    setMeta("og:type", ogType, true);
    setMeta("og:site_name", SITE_NAME, true);
    setMeta("og:image", ogImage || DEFAULT_OG_IMAGE, true);
    if (ogUrl) setMeta("og:url", ogUrl, true);

    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", fullTitle);
    setMeta("twitter:description", description || DEFAULT_DESCRIPTION);
    setMeta("twitter:image", ogImage || DEFAULT_OG_IMAGE);

    let canonicalLink = document.querySelector('link[rel="canonical"]');
    const parts = [canonical, ogUrl].filter(Boolean) as string[];
    const firstPart = parts[0];
    const pathname = window.location.pathname;
    const canonicalUrl = firstPart || pathname || "/";
    if (canonicalUrl) {
      if (!canonicalLink) {
        canonicalLink = document.createElement("link");
        canonicalLink.setAttribute("rel", "canonical");
        document.head.appendChild(canonicalLink);
      }
      canonicalLink.setAttribute("href", canonicalUrl);
    }

    if (noIndex) {
      setMeta("robots", "noindex, nofollow");
    } else {
      removeMeta("robots");
    }

    let jsonLdScript = document.getElementById("json-ld") as HTMLScriptElement | null;
    if (jsonLd) {
      if (!jsonLdScript) {
        jsonLdScript = document.createElement("script");
        jsonLdScript.id = "json-ld";
        jsonLdScript.type = "application/ld+json";
        document.head.appendChild(jsonLdScript);
      }
      jsonLdScript.textContent = JSON.stringify(jsonLd);
    } else if (jsonLdScript) {
      jsonLdScript.remove();
    }

    return () => {
      document.title = previousTitle.current;
    };
  }, [title, description, ogImage, ogType, ogUrl, canonical, noIndex, jsonLd]);

  return null;
}
