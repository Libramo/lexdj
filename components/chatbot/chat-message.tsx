type Props = {
  role: "user" | "assistant";
  content: string;
};

export function ChatMessage({ role, content }: Props) {
  return (
    <div
      className={`flex gap-2 ${role === "user" ? "flex-row-reverse" : "flex-row"}`}
    >
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm leading-relaxed ${
          role === "user"
            ? "bg-primary text-primary-foreground rounded-tr-sm"
            : "bg-muted text-foreground rounded-tl-sm"
        }`}
      >
        {content}
      </div>
    </div>
  );
}
