import {
  RichText,
  type JSXConvertersFunction,
} from "@payloadcms/richtext-lexical/react";
import type { CodeSection } from "@/payload-types";

// Lexical -> React rendering for hand-authored Codes articles — a
// deliberately separate pipeline from LawTextRenderer's parseText()
// (see context/code-standards.md). Codes content is authored directly as
// Lexical JSON via Payload's admin editor, never scraped OCR plain text,
// so it never goes through the JO tokenizer/classifier.
//
// Only the paragraph converter is overridden — everything else (bold,
// italic, links, lists, headings) comes free from defaultConverters, and
// applies automatically to anything edited by hand in /cms's editor too.
// The default ParagraphJSXConverter otherwise silently ignores Lexical's
// own `indent` field, which is what scripts/import-code-du-travail.ts
// sets on embedded sub-items (e.g. an article's "a)"/"b)" clauses) —
// without this override that indent has no visual effect at all.
const converters: JSXConvertersFunction = ({ defaultConverters }) => ({
  ...defaultConverters,
  paragraph: ({ node, nodesToJSX }) => {
    const children = nodesToJSX({ nodes: node.children });
    const indent = node.indent ?? 0;
    return (
      <p style={indent ? { paddingInlineStart: `${indent * 1.5}rem` } : undefined}>
        {children?.length ? children : <br />}
      </p>
    );
  },
});

// Tailwind's preflight reset strips all default browser styling from
// ul/ol/li (no bullets/numbers, no padding) and leaves headings/links
// unstyled — real content, whether hand-authored in /cms or from a future
// import script, needs these rendered explicitly, not just wrapped in the
// right tag.
const CONTENT_CLASSNAME = [
  "font-serif text-[15px] leading-relaxed text-foreground",
  "[&_p]:mb-4 [&_p:last-child]:mb-0",
  "[&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-6 [&_ol]:pl-6",
  "[&_li]:mb-2 [&_li]:pl-1",
  "[&_a]:text-primary [&_a]:underline",
  "[&_h1]:font-sans [&_h1]:font-bold [&_h1]:text-xl [&_h1]:mb-3 [&_h1]:mt-6",
  "[&_h2]:font-sans [&_h2]:font-bold [&_h2]:text-lg [&_h2]:mb-3 [&_h2]:mt-6",
  "[&_h3]:font-sans [&_h3]:font-bold [&_h3]:text-base [&_h3]:mb-2 [&_h3]:mt-4",
  "[&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-4",
  "[&_blockquote]:italic [&_blockquote]:text-muted-foreground",
].join(" ");

export function CodeContent({ content }: { content: CodeSection["content"] }) {
  if (!content) return null;
  return (
    <RichText
      data={content as never}
      converters={converters}
      className={CONTENT_CLASSNAME}
    />
  );
}
