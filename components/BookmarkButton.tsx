"use client";
import { Bookmark } from "lucide-react";
import { useBookmarks } from "@/lib/useBookmarks";
import { cn } from "@/lib/utils";

export function BookmarkButton({ slug }: { slug: string }) {
  const { isBookmarked, toggle } = useBookmarks();
  const bookmarked = isBookmarked(slug);

  return (
    <button
      onClick={() => toggle(slug)}
      className={cn(
        "w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border text-sm font-medium transition-colors",
        bookmarked
          ? "bg-forest-50 border-forest-200 text-forest-700 hover:bg-forest-100"
          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
      )}
    >
      <Bookmark size={15} className={bookmarked ? "fill-current" : ""} />
      {bookmarked ? "Saved" : "Save Program"}
    </button>
  );
}
