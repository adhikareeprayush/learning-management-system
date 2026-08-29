"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";

export function HeroSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/courses?q=${encodeURIComponent(q)}` : "/courses");
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex w-full max-w-[489px] items-center gap-2 rounded-[7px] bg-white p-2 shadow-xl shadow-black/15"
    >
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search web, marketing, design…"
        className="min-w-0 flex-1 bg-transparent px-2 py-3 text-[15px] text-[#4f547b] outline-none placeholder:text-[#4f547b]/80 sm:px-3"
      />
      <button
        type="submit"
        className="inline-flex h-[46px] shrink-0 items-center justify-center gap-2 rounded-[10px] bg-brand-gradient px-3 text-[15px] font-medium text-white transition hover:brightness-110 sm:h-[50px] sm:px-5"
        aria-label="Search courses"
      >
        <Search className="size-5" strokeWidth={2} />
        <span className="hidden sm:inline">Search</span>
      </button>
    </form>
  );
}
