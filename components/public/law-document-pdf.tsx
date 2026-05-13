// components/pdf/LawDocument.tsx
// @react-pdf/renderer component for exporting a single law as PDF

import { parseText, parseSignedBy, parseVisas } from "@/lib/utils";
import type { Block } from "@/lib/utils";

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface LawPdfData {
  id: number;
  title: string | null;
  doc_type: string | null;
  reference_number: string | null;
  ministry: string | null;
  publication_date: string | null;
  issue_number: string | null;
  issue_date: string | null;
  mesure: string | null;
  period: string | null;
  intro_text: string | null;
  visas_text: string | null;
  full_text: string | null;
  signed_by: string | null;
  source_url: string | null;
}

// ── PDF Block Renderers ───────────────────────────────────────────────────────

function PdfArticleBlock({ block }: { block: Block }) {
  return (
    <View
      style={{
        paddingTop: 10,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: "#E5E5E3",
        marginBottom: 2,
      }}
    >
      <View
        style={{ flexDirection: "row", alignItems: "center", marginBottom: 5 }}
      >
        <Text
          style={{
            fontSize: 7,
            fontFamily: "Helvetica-Bold",
            color: "#4A7FA8",
            backgroundColor: "#EEF3F8",
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderRadius: 3,
            letterSpacing: 0.5,
          }}
        >
          {block.label}
        </Text>
      </View>
      {block.content ? (
        <Text style={{ fontSize: 9, color: "#555555", lineHeight: 1.6 }}>
          {block.content}
        </Text>
      ) : null}
    </View>
  );
}

function PdfRomanSectionBlock({ block }: { block: Block }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingTop: 12,
        paddingBottom: 4,
      }}
    >
      <Text
        style={{
          fontSize: 7,
          fontFamily: "Helvetica-Bold",
          color: "#FFFFFF",
          backgroundColor: "#1A3A5C",
          paddingHorizontal: 5,
          paddingVertical: 2,
          borderRadius: 2,
        }}
      >
        {block.label}
      </Text>
      <Text
        style={{
          fontSize: 8,
          fontFamily: "Helvetica-Bold",
          color: "#111111",
          letterSpacing: 0.5,
        }}
      >
        {block.content}
      </Text>
    </View>
  );
}

function PdfNumberedItemBlock({ block }: { block: Block }) {
  return (
    <View
      style={{
        flexDirection: "row",
        gap: 8,
        paddingVertical: 3,
        paddingLeft: 8,
      }}
    >
      <Text
        style={{
          fontSize: 7,
          fontFamily: "Helvetica-Bold",
          color: "#1A3A5C",
          width: 14,
          textAlign: "center",
        }}
      >
        {block.label?.replace(".", "")}
      </Text>
      <Text style={{ fontSize: 9, color: "#555555", lineHeight: 1.6, flex: 1 }}>
        {block.content}
      </Text>
    </View>
  );
}

function PdfBulletBlock({ block }: { block: Block }) {
  return (
    <View
      style={{
        flexDirection: "row",
        gap: 6,
        paddingVertical: 2,
        paddingLeft: 16,
      }}
    >
      <Text style={{ fontSize: 9, color: "#4A7FA8", marginTop: 1 }}>–</Text>
      <Text style={{ fontSize: 9, color: "#555555", lineHeight: 1.6, flex: 1 }}>
        {block.content}
      </Text>
    </View>
  );
}

function PdfClauseBlock({ block }: { block: Block }) {
  const isVu = block.label?.toUpperCase() === "VU";
  return (
    <View
      style={{
        paddingVertical: 4,
        borderBottomWidth: 1,
        borderBottomColor: "#F0F0EE",
      }}
    >
      <Text
        style={{
          fontSize: 7,
          fontFamily: "Helvetica-Bold",
          color: isVu ? "#4A7FA8" : "#8B6F47",
          backgroundColor: isVu ? "#EEF3F8" : "#F5EFE6",
          paddingHorizontal: 5,
          paddingVertical: 2,
          borderRadius: 2,
          marginBottom: 3,
          letterSpacing: 0.5,
        }}
      >
        {block.label}
      </Text>
      <Text style={{ fontSize: 9, color: "#555555", lineHeight: 1.6 }}>
        {block.content}
      </Text>
    </View>
  );
}

function PdfPreambleBlock({ block }: { block: Block }) {
  return (
    <View
      style={{ flexDirection: "row", alignItems: "center", paddingVertical: 8 }}
    >
      <View
        style={{ flex: 1, borderBottomWidth: 1, borderBottomColor: "#1A3A5C" }}
      />
      <Text
        style={{
          fontSize: 8,
          fontFamily: "Helvetica-Bold",
          color: "#1A3A5C",
          paddingHorizontal: 8,
          letterSpacing: 1,
        }}
      >
        {block.content}
      </Text>
      <View
        style={{ flex: 1, borderBottomWidth: 1, borderBottomColor: "#1A3A5C" }}
      />
    </View>
  );
}

function PdfSignatureBlock({ block }: { block: Block }) {
  return (
    <View style={{ alignItems: "flex-end", paddingTop: 8 }}>
      <Text style={{ fontSize: 8, color: "#888888", fontStyle: "italic" }}>
        {block.content}
      </Text>
    </View>
  );
}

function PdfParagraphBlock({ block }: { block: Block }) {
  return (
    <Text
      style={{
        fontSize: 9,
        color: "#555555",
        lineHeight: 1.6,
        paddingVertical: 2,
      }}
    >
      {block.content}
    </Text>
  );
}

function PdfBlocks({ text }: { text: string }) {
  const blocks = parseText(text);
  return (
    <View>
      {blocks.map((block, i) => {
        switch (block.type) {
          case "article":
            return <PdfArticleBlock key={i} block={block} />;
          case "roman_section":
            return <PdfRomanSectionBlock key={i} block={block} />;
          case "numbered_item":
            return <PdfNumberedItemBlock key={i} block={block} />;
          case "bullet":
            return <PdfBulletBlock key={i} block={block} />;
          case "clause":
            return <PdfClauseBlock key={i} block={block} />;
          case "preamble_header":
            return <PdfPreambleBlock key={i} block={block} />;
          case "signature":
            return <PdfSignatureBlock key={i} block={block} />;
          default:
            return <PdfParagraphBlock key={i} block={block} />;
        }
      })}
    </View>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(d: string | null): string {
  if (!d) return "";
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(d));
  } catch {
    return d;
  }
}

// ── Styles ────────────────────────────────────────────────────────────────────

const NAVY = "#1A3A5C";
const LIGHT_BLUE = "#EEF3F8";
const GRAY = "#888888";
const LIGHT_GRAY = "#F5F5F3";
const BORDER = "#E5E5E3";
const TEXT = "#222222";
const TEXT_LIGHT = "#555555";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: TEXT,
    paddingTop: 40,
    paddingBottom: 60,
    paddingHorizontal: 50,
    backgroundColor: "#FFFFFF",
  },

  // ── Header ──
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: NAVY,
  },
  headerLeft: {
    flexDirection: "column",
  },
  headerBrand: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: NAVY,
    letterSpacing: 2,
  },
  headerSubtitle: {
    fontSize: 7,
    color: GRAY,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  headerRight: {
    flexDirection: "column",
    alignItems: "flex-end",
  },
  headerDate: {
    fontSize: 7,
    color: GRAY,
  },
  headerDisclaimer: {
    fontSize: 6,
    color: GRAY,
    marginTop: 2,
    fontStyle: "italic",
  },

  // ── Doc type badge ──
  badgeRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 12,
  },
  badge: {
    backgroundColor: NAVY,
    color: "#FFFFFF",
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 3,
    letterSpacing: 0.5,
  },
  badgeSecondary: {
    backgroundColor: LIGHT_BLUE,
    color: NAVY,
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 3,
  },

  // ── Title block ──
  title: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: NAVY,
    lineHeight: 1.4,
    marginBottom: 6,
  },
  referenceNumber: {
    fontSize: 8,
    fontFamily: "Helvetica",
    color: GRAY,
    marginBottom: 20,
    letterSpacing: 0.3,
  },

  // ── Metadata table ──
  metaBox: {
    backgroundColor: LIGHT_GRAY,
    borderRadius: 4,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: BORDER,
  },
  metaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 0,
  },
  metaItem: {
    width: "50%",
    marginBottom: 10,
    paddingRight: 8,
  },
  metaLabel: {
    fontSize: 6.5,
    color: GRAY,
    letterSpacing: 0.8,
    marginBottom: 2,
    fontFamily: "Helvetica-Bold",
  },
  metaValue: {
    fontSize: 8.5,
    color: TEXT,
    fontFamily: "Helvetica",
    lineHeight: 1.3,
  },

  // ── Section ──
  section: {
    marginBottom: 18,
  },
  sectionLabel: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: GRAY,
    letterSpacing: 1,
    marginBottom: 8,
    textTransform: "uppercase",
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    paddingBottom: 4,
  },
  bodyText: {
    fontSize: 9,
    color: TEXT_LIGHT,
    lineHeight: 1.6,
    fontFamily: "Helvetica",
  },

  // ── Signature block ──
  signatureBlock: {
    alignItems: "flex-end",
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  signatureTitle: {
    fontSize: 8,
    color: GRAY,
    fontStyle: "italic",
    marginBottom: 2,
  },
  signatureName: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: TEXT,
    marginTop: 4,
  },

  // ── Divider ──
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    marginVertical: 14,
  },

  // ── Footer ──
  footer: {
    position: "absolute",
    bottom: 25,
    left: 50,
    right: 50,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 8,
  },
  footerLeft: {
    fontSize: 6.5,
    color: GRAY,
  },
  footerRight: {
    fontSize: 6.5,
    color: GRAY,
  },
});

// ── Component ─────────────────────────────────────────────────────────────────

export function LawDocument({
  law,
  logoSrc,
}: {
  law: LawPdfData;
  logoSrc: string;
}) {
  const exportDate = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <Document
      title={law.title ?? "Texte officiel"}
      author="LexDJ"
      subject={law.reference_number ?? ""}
      keywords="Journal Officiel Djibouti"
      creator="LexDJ — Archive numérique non officielle"
    >
      <Page size="A4" style={styles.page}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerBrand}>LEXDJ</Text>
            <Text style={styles.headerSubtitle}>
              Archive numérique du Journal Officiel de Djibouti
            </Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.headerDate}>Exporté le {exportDate}</Text>
            <Text style={styles.headerDisclaimer}>
              Archive non officielle · Non affilié au gouvernement
            </Text>
          </View>
        </View>

        {/* ── Badges ── */}
        <View style={styles.badgeRow}>
          {law.doc_type && <Text style={styles.badge}>{law.doc_type}</Text>}
          {law.mesure && (
            <Text style={styles.badgeSecondary}>{law.mesure}</Text>
          )}
          {law.period && (
            <Text style={styles.badgeSecondary}>{law.period}</Text>
          )}
        </View>

        {/* ── Title ── */}
        <Text style={styles.title}>{law.title ?? "Sans titre"}</Text>

        {law.reference_number && (
          <Text style={styles.referenceNumber}>{law.reference_number}</Text>
        )}

        {/* ── Metadata ── */}
        <View style={styles.metaBox}>
          <View style={styles.metaGrid}>
            {law.ministry && (
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Ministère</Text>
                <Text style={styles.metaValue}>{law.ministry}</Text>
              </View>
            )}
            {law.publication_date && (
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Date de publication</Text>
                <Text style={styles.metaValue}>
                  {formatDate(law.publication_date)}
                </Text>
              </View>
            )}
            {law.issue_number && (
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Numéro JO</Text>
                <Text style={styles.metaValue}>{law.issue_number}</Text>
              </View>
            )}
            {law.issue_date && (
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Date du numéro</Text>
                <Text style={styles.metaValue}>
                  {formatDate(law.issue_date)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Intro text ── */}
        {law.intro_text && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Introduction</Text>
            <Text style={styles.bodyText}>{law.intro_text}</Text>
          </View>
        )}

        {/* ── Visas — parsed and highlighted ── */}
        {law.visas_text && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Visas</Text>
            {parseVisas(law.visas_text).map((visa, i) => {
              const match = visa.match(/^(Vu\b|VU\b)/i);
              if (match) {
                return (
                  <View
                    key={i}
                    style={{ flexDirection: "row", marginBottom: 4 }}
                  >
                    <Text
                      style={[
                        styles.bodyText,
                        { fontFamily: "Helvetica-Bold", color: "#1A3A5C" },
                      ]}
                    >
                      {match[0]}
                    </Text>
                    <Text style={styles.bodyText}>
                      {visa.slice(match[0].length)}
                    </Text>
                  </View>
                );
              }
              return (
                <Text key={i} style={[styles.bodyText, { marginBottom: 4 }]}>
                  {visa}
                </Text>
              );
            })}
          </View>
        )}

        {/* ── Full text — structured blocks ── */}
        {law.full_text && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Texte intégral</Text>
            <PdfBlocks text={law.full_text} />
          </View>
        )}

        {/* ── Signature — parsed ── */}
        {law.signed_by &&
          (() => {
            const { titles, name } = parseSignedBy(law.signed_by);
            return (
              <View style={styles.signatureBlock}>
                {titles.map((t, i) => (
                  <Text key={i} style={styles.signatureTitle}>
                    {t}
                  </Text>
                ))}
                <Text style={styles.signatureName}>{name}</Text>
              </View>
            );
          })()}

        {/* ── Footer ── */}
        <View style={styles.footer} fixed>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Text style={styles.footerLeft}>By</Text>
            <Image src={logoSrc} style={{ width: 48, height: 9 }} />
          </View>
          <Text style={styles.footerLeft}>
            {law.source_url
              ? `Source : ${law.source_url.replace(/^https?:\/\//, "").slice(0, 60)}`
              : "lexdj.dj"}
          </Text>
          <Text
            style={styles.footerRight}
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} / ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
