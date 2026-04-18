import { FileText, ArrowUpRight } from "lucide-react";

export function PdfLinks({ links }: { links: string[] }) {
  return (
    <div className="flex flex-col gap-2">
      {links.map((url, i) => (
        <a
          key={i}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 p-3 rounded-lg border border-black/[0.07] hover:border-red-200 hover:bg-red-50/50 transition-all group no-underline"
        >
          <div className="w-8 h-8 rounded-md bg-red-50 flex items-center justify-center shrink-0">
            <FileText size={14} className="text-red-500" />
          </div>
          <span className="text-sm text-[#333] group-hover:text-red-700 truncate flex-1 transition-colors">
            {url.split("/").pop() || `Document ${i + 1}`}
          </span>
          <ArrowUpRight size={13} className="text-[#AAA] shrink-0" />
        </a>
      ))}
    </div>
  );
}
