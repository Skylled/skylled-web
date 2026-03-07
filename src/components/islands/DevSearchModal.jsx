import React from "react";
import { Search as SearchIcon, ExternalLink } from "lucide-react";

export default function DevSearchModal({ onClose, labels }) {
  return (
    <div className="p-8 sm:p-12 text-center flex flex-col items-center gap-6">
      <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-2 ring-8 ring-primary/5">
        <SearchIcon className="text-primary w-10 h-10" />
      </div>
      
      <div className="space-y-2">
        <h3 className="text-2xl font-bold tracking-tight">{labels?.title || "Search is a Production Superpower! 🚀"}</h3>
        <p className="text-foreground/60 max-w-sm mx-auto leading-relaxed">
          {labels?.description || "To enable our lightning-fast search, Pagefind needs a static build index. Run the following command to see it in action:"}
        </p>
      </div>

      <div className="w-full bg-foreground/5 p-4 rounded-xl border border-foreground/5 font-mono text-sm relative group overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <code className="relative z-10 text-primary font-bold">npm run build</code>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
        <button
            onClick={onClose}
            className="px-8 py-3 bg-primary text-white rounded-xl hover:shadow-lg hover:shadow-primary/20 transition-all text-sm font-semibold active:scale-95"
        >
            {labels?.gotIt || "Got it, thanks!"}
        </button>
        <a 
            href="https://pagefind.app/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="px-8 py-3 bg-foreground/5 text-foreground/70 rounded-xl hover:bg-foreground/10 transition-all text-sm font-semibold flex items-center justify-center gap-2"
        >
            {labels?.doc || "Documentation"} <ExternalLink size={14} />
        </a>
      </div>
    </div>
  );
}
