import React, { useMemo } from "react";
import { Star, Bookmark, Trash2, Clock } from "lucide-react";
import type { Article, BookmarkedArticle, ReadHistoryEntry } from "./types";

interface BookmarksViewProps {
  searchQuery: string;
  bookmarks: BookmarkedArticle[];
  readHistory: ReadHistoryEntry[];
  onOpenArticle: (article: Article) => void;
  toggleBookmark: (article: Article) => void;
}

export const BookmarksView: React.FC<BookmarksViewProps> = ({
  searchQuery, bookmarks, readHistory, onOpenArticle, toggleBookmark
}) => {
  const filteredBookmarks = useMemo(() => {
    if (!searchQuery.trim()) return bookmarks;
    const q = searchQuery.toLowerCase();
    return bookmarks.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q)
    );
  }, [bookmarks, searchQuery]);

  return (
    <div className="space-y-4 flex-grow animate-[fadeIn_0.3s_ease-out]">
      <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
        <h2 className="text-lg font-serif font-black text-[#2D323A] flex items-center gap-1.5">
          <Star className="w-4 h-4 text-[#8B6E3C]" />
          收藏夹
          <span className="text-sm font-sans font-normal text-slate-300 ml-1">({filteredBookmarks.length})</span>
        </h2>
      </div>

      {filteredBookmarks.length === 0 ? (
        <div className="flex-grow flex flex-col items-center justify-center py-16 text-center text-slate-300">
          <Bookmark className="w-8 h-8 mb-2" />
          <p className="text-[11px] font-medium">
            {searchQuery ? "无匹配收藏" : "还没有收藏文章，在阅读时点击书签图标即可收藏"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredBookmarks.map((article, idx) => (
            <div
              key={idx}
              className="group flex items-center gap-3 p-3 rounded-xl hover:bg-white/60 border border-transparent hover:border-[#E8E0D0] cursor-pointer transition-all"
            >
              <div className="flex-grow min-w-0" onClick={() => onOpenArticle(article)}>
                <h4 className="text-sm font-serif font-bold text-[#2D323A] group-hover:text-[#A34E36] transition-colors truncate">
                  {article.title}
                </h4>
                <div className="flex items-center gap-2 text-[10px] text-slate-300 font-medium mt-0.5">
                  {article.feedName && <span>{article.feedName}</span>}
                  <span>收藏于 {new Date(article.bookmarkedAt).toLocaleDateString("zh-CN")}</span>
                </div>
              </div>
              <button
                onClick={() => toggleBookmark(article)}
                className="p-1.5 rounded-lg text-[#8B6E3C] hover:bg-red-50 hover:text-red-400 transition-colors cursor-pointer flex-shrink-0"
                title="取消收藏"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {readHistory.length > 0 && (
        <div className="mt-6 pt-4 border-t border-dashed border-slate-200">
          <div className="flex items-center gap-1.5 mb-3">
            <Clock className="w-3.5 h-3.5 text-slate-300" />
            <span className="text-[9px] font-bold text-slate-300 uppercase tracking-[0.15em]">最近阅读</span>
          </div>
          <div className="space-y-1">
            {readHistory.slice(0, 10).map((entry, idx) => (
              <div key={idx} className="flex items-center gap-2 py-1.5 text-[11px] text-slate-400">
                <span className="w-1 h-1 rounded-full bg-slate-200 flex-shrink-0" />
                <span className="truncate font-medium">{entry.title}</span>
                <span className="text-slate-200 text-[9px] ml-auto flex-shrink-0">
                  {new Date(entry.readAt).toLocaleDateString("zh-CN")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
