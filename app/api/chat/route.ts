import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { searchLaws } from "@/lib/search-laws";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });

const SYSTEM_PROMPT = `Tu es l'assistant juridique de LexDJ, l'archive numérique du Journal Officiel de Djibouti.
Tu réponds UNIQUEMENT en te basant sur les textes juridiques fournis dans le contexte.
Si la réponse ne se trouve pas dans le contexte fourni, dis clairement que tu ne trouves pas ce texte dans la base.
Ne jamais inventer de lois, décrets, dates ou numéros de référence.
Réponds dans la langue de l'utilisateur (français ou anglais).
Sois précis et professionnel.`;

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    // get the last user message to search Meilisearch
    const lastUserMessage =
      [...messages].reverse().find((m: { role: string }) => m.role === "user")
        ?.content ?? "";

    // search relevant laws
    const laws = await searchLaws(lastUserMessage);

    // build context from results
    const context =
      laws.length > 0
        ? laws
            .map(
              (law, i) =>
                `--- Texte ${i + 1} ---
                Type: ${law.doc_type}
                Titre: ${law.title}
                Référence: ${law.reference_number}
                Ministère: ${law.ministry}
                Date: ${law.publication_date}
                Contenu: ${law.full_text}
                URL: ${law.source_url}`,
            )
            .join("\n\n")
        : "Aucun texte pertinent trouvé dans la base.";

    // build messages for Groq
    const groqMessages = [
      ...messages.slice(0, -1).map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      {
        role: "user" as const,
        content: `Contexte juridique:\n${context}\n\nQuestion: ${lastUserMessage}`,
      },
    ];

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...groqMessages],
      temperature: 0.2, // low temp = more factual, less creative
      max_tokens: 1024,
    });

    const reply = completion.choices[0].message.content;

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { error: "Failed to get response" },
      { status: 500 },
    );
  }
}
