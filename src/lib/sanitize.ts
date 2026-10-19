import sanitizeHtml from "sanitize-html";

const IFRAME_HOSTS = [
  "www.youtube.com",
  "www.youtube-nocookie.com",
  "player.vimeo.com",
  "iframe.mediadelivery.net",
  "open.spotify.com",
  "www.loom.com",
];

/** Limpia HTML proveniente del editor (descripciones de cursos, clases, páginas). */
export function cleanHtml(dirty: string | null | undefined) {
  if (!dirty) return "";
  return sanitizeHtml(dirty, {
    allowedTags: [
      "p", "br", "strong", "b", "em", "i", "u", "s", "h2", "h3", "h4", "ul", "ol", "li",
      "blockquote", "a", "img", "hr", "iframe", "code", "pre", "span", "table", "thead",
      "tbody", "tr", "th", "td",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      img: ["src", "alt", "width", "height"],
      iframe: ["src", "allow", "allowfullscreen", "frameborder", "title"],
      span: ["class"],
      td: ["colspan", "rowspan"],
      th: ["colspan", "rowspan"],
    },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowedSchemesByTag: { img: ["http", "https"] },
    allowProtocolRelative: false,
    allowedIframeHostnames: IFRAME_HOSTS,
    transformTags: {
      a: (tagName, attribs) => {
        const href = attribs.href || "";
        const external = /^https?:\/\//i.test(href);
        const out: Record<string, string> = { href };
        if (external) {
          out.target = "_blank";
          out.rel = "noopener noreferrer";
        }
        return { tagName, attribs: out };
      },
      b: "strong",
      i: "em",
    },
  }).replace(/src="(?!https?:\/\/|\/media\/)[^"]*"/g, 'src=""');
}

export function cleanText(input: FormDataEntryValue | null | undefined, max = 500) {
  return String(input ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

export function cleanMultiline(input: FormDataEntryValue | null | undefined, max = 5000) {
  return String(input ?? "").replace(/\r\n/g, "\n").trim().slice(0, max);
}
