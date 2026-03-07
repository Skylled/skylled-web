import React, { useState, useEffect } from "react";
import { Search as SearchIcon, X, Book, Zap, LayoutGrid, FileText } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import DevSearchModal from "./DevSearchModal";

const POPULAR_LINKS = [
  { label: "Getting Started", href: "/docs/getting-started/", icon: Book, localize: false },
  { label: "Features", href: "/features/", icon: Zap },
  { label: "Design System", href: "/design/", icon: LayoutGrid },
  { label: "Blog", href: "/blog/", icon: FileText },
];

export default function Search({ placeholder = "Search...", devModalLabels, lang = "en" }) {
  const [open, setOpen] = useState(false);

  // Localize links
  const localizedLinks = POPULAR_LINKS.map(link => {
    // Return explicit non-localized or external links as is
    if (link.localize === false || link.href.startsWith('http')) {
        return link;
    }
    
    // Otherwise localize
    return {
        ...link,
        href: `/${lang}${link.href}`.replace(/\/+/g, '/')
    };
  });

  // Helper to dynamically load Pagefind assets
  const loadPagefind = async () => {
    if (window.PagefindUI) return;

    return new Promise((resolve, reject) => {
      // 1. Load CSS
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = '/pagefind/pagefind-ui.css';
      document.head.appendChild(link);

      // 2. Load JS
      const script = document.createElement('script');
      script.src = '/pagefind/pagefind-ui.js';
      script.async = true;
      script.onload = () => {
        if (window.PagefindUI) resolve(true);
        else reject(new Error('PagefindUI failed to load'));
      };
      script.onerror = () => reject(new Error('Failed to load Pagefind scripts'));
      document.head.appendChild(script);
    });
  };

  useEffect(() => {
    const down = (e) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
        if (!open) loadPagefind();
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open]);

  useEffect(() => {
    if (open && !import.meta.env.DEV) {
      const initSearch = async () => {
        try {
          await loadPagefind();
          setTimeout(() => {
            if (window.PagefindUI) {
              const container = document.getElementById("search-container");
              if (container) {
                container.innerHTML = "";
                new PagefindUI({ 
                  element: "#search-container", 
                  showSubResults: true,
                  autofocus: true,
                  baseUrl: "/",
                  bundlePath: "/pagefind/",
                  showImages: true,
                  translations: {
                    placeholder: placeholder
                  }
                });
              }
            }
          }, 50);
        } catch (error) {
          console.error('Search initialization failed:', error);
        }
      };
      initSearch();
    }
  }, [open, placeholder]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={placeholder}
        className="flex items-center gap-2 px-3 py-1.5 text-sm text-foreground/60 hover:text-foreground bg-foreground/5 hover:bg-foreground/10 border border-foreground/10 rounded-full transition-all hover:scale-105"
      >
        <SearchIcon size={14} />
        <span className="hidden lg:inline">{placeholder}</span>
        <div className="hidden lg:flex items-center gap-0.5 px-1.5 py-0.5 bg-background border border-foreground/10 rounded-full text-[10px] font-mono shadow-sm">
          <span className="text-[10px] text-foreground/90">⌘K</span>
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-100 flex items-start justify-center p-4 sm:p-6 md:p-20">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/75 shadow-2xl" 
              onClick={() => setOpen(false)}
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-background border border-foreground/20 rounded-2xl shadow-2xl ring-1 ring-foreground/20" 
              onClick={(e) => e.stopPropagation()}
            >
              {import.meta.env.DEV ? (
                <DevSearchModal onClose={() => setOpen(false)} labels={devModalLabels} />
              ) : (
                <div className="relative">
                  <button 
                    onClick={() => setOpen(false)}
                    className="absolute right-4 top-4 p-2 rounded-full text-foreground hover:bg-foreground/10 transition-colors z-20"
                    aria-label="Close Search"
                  >
                    <X size={18} />
                  </button>

                  <div className="p-4 pt-10" id="search-container">
                    {/* Pagefind UI will be injected here */}
                  </div>

                  {/* Empty State / Popular Links */}
                  <div className="px-6 pb-8 border-t border-foreground/10">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-foreground/50 mb-4 mt-6">
                      Popular Links
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                       {localizedLinks.map((link) => (
                         <a 
                            key={link.href}
                            href={link.href}
                            className="flex items-center gap-3 p-3 rounded-xl bg-foreground/5 hover:bg-foreground/10 transition-colors border border-foreground/5 group"
                         >
                            <div className="w-8 h-8 rounded-lg bg-background border border-foreground/10 flex items-center justify-center text-foreground group-hover:text-primary transition-colors">
                               <link.icon size={16} />
                            </div>
                            <span className="text-sm font-bold text-foreground group-hover:text-primary">{link.label}</span>
                         </a>
                       ))}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
