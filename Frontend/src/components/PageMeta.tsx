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
  const previousMeta = useRef<Map<string, string | null>>(new Map());
  const createdMeta = useRef<Set<string>>(new Set());
  const createdCanonical = useRef(false);
  const previousCanonicalHref = useRef<string | null>(null);
  const createdJsonLd = useRef(false);

  useEffect(() => {
    previousTitle.current = document.title;
    const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
    document.title = fullTitle;

    const currentUrl = `${window.location.origin}${window.location.pathname}${window.location.search}`;
    const canonicalUrl = canonical || ogUrl || currentUrl;

    const setMeta = (name: string, content: string, property = false) => {
      const attr = property ? "property" : "name";
      const selector = `${attr}="${name}"`;
      let el = document.querySelector<HTMLMetaElement>(`meta[${selector}]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, name);
        document.head.appendChild(el);
        createdMeta.current.add(selector);
      } else if (!previousMeta.current.has(selector)) {
        previousMeta.current.set(selector, el.getAttribute("content"));
      }
      el.setAttribute("content", content);
    };

    const removeMeta = (name: string, property = false) => {
      const attr = property ? "property" : "name";
      const selector = `${attr}="${name}"`;
      const el = document.querySelector<HTMLMetaElement>(`meta[${selector}]`);
      if (!el) return;
      if (createdMeta.current.has(selector)) {
        el.remove();
        createdMeta.current.delete(selector);
      } else if (previousMeta.current.has(selector)) {
        const previousContent = previousMeta.current.get(selector);
        if (previousContent) {
          el.setAttribute("content", previousContent);
        } else {
          el.remove();
        }
        previousMeta.current.delete(selector);
      } else {
        el.remove();
      }
    };

    setMeta("description", description || DEFAULT_DESCRIPTION);

    setMeta("og:title", fullTitle, true);
    setMeta("og:description", description || DEFAULT_DESCRIPTION, true);
    setMeta("og:type", ogType, true);
    setMeta("og:site_name", SITE_NAME, true);
    setMeta("og:image", ogImage || DEFAULT_OG_IMAGE, true);
    setMeta("og:url", ogUrl || currentUrl, true);

    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", fullTitle);
    setMeta("twitter:description", description || DEFAULT_DESCRIPTION);
    setMeta("twitter:image", ogImage || DEFAULT_OG_IMAGE);

    let canonicalLink = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (canonicalLink) {
      if (previousCanonicalHref.current === null) {
        previousCanonicalHref.current = canonicalLink.href;
      }
    } else {
      canonicalLink = document.createElement("link");
      canonicalLink.setAttribute("rel", "canonical");
      document.head.appendChild(canonicalLink);
      createdCanonical.current = true;
    }

    if (canonicalLink && canonicalUrl) {
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
        createdJsonLd.current = true;
      }
      jsonLdScript.textContent = JSON.stringify(jsonLd);
    } else if (jsonLdScript && createdJsonLd.current) {
      jsonLdScript.remove();
    }

    return () => {
      document.title = previousTitle.current;

      createdMeta.current.forEach((selector) => {
        const el = document.querySelector<HTMLMetaElement>(`meta[${selector}]`);
        if (el) el.remove();
      });
      createdMeta.current.clear();

      previousMeta.current.forEach((value, selector) => {
        const el = document.querySelector<HTMLMetaElement>(`meta[${selector}]`);
        if (!el) return;
        if (value) {
          el.setAttribute("content", value);
        } else {
          el.remove();
        }
      });
      previousMeta.current.clear();

      const canonicalLinkCleanup = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
      if (canonicalLinkCleanup) {
        if (createdCanonical.current) {
          canonicalLinkCleanup.remove();
        } else if (previousCanonicalHref.current) {
          canonicalLinkCleanup.setAttribute("href", previousCanonicalHref.current);
        }
      }

      if (createdJsonLd.current) {
        const jsonLdScriptCleanup = document.getElementById("json-ld");
        if (jsonLdScriptCleanup) jsonLdScriptCleanup.remove();
      }
    };
  }, [title, description, ogImage, ogType, ogUrl, canonical, noIndex, jsonLd]);

  return null;
}
