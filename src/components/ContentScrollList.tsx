import React from "react";
import ContentCard from "./ContentCard";
import { Content } from "../types/content";
import { FaChevronRight } from "react-icons/fa";

interface ContentScrollListProps {
  title: string;
  contents: Content[];
  loading?: boolean;
  error?: string | null;
  category?: string;
  emptyMessage?: string;
}

const ContentScrollList: React.FC<ContentScrollListProps> = ({
  title,
  contents,
  loading = false,
  error = null,
  category = "",
  emptyMessage = "콘텐츠가 없습니다.",
}) => {
  const displayContents = contents.slice(0, 9);
  const hasMoreContents = contents.length > 9;
  
  return (
    <div className="my-10">
      {" "}
      <div className="mb-5 flex items-center justify-between">
        {" "}
        <h2 className="text-2xl font-bold">{title}</h2>{" "}
        {hasMoreContents && !loading && (
          <button className="flex items-center gap-1 text-sm text-blue-500 hover:text-blue-700">
            {" "}
            <span>더보기</span> <FaChevronRight size={12} />{" "}
          </button>
        )}{" "}
      </div>{" "}
      {loading && (
        <div className="flex justify-center py-6">
          {" "}
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>{" "}
        </div>
      )}{" "}
      {error && <div className="py-4 text-center text-red-500">{error}</div>}{" "}
      {!loading && !error && (
        <div className="relative">
          {" "}
          <div className="scrollbar-hide flex gap-4 overflow-x-auto pb-5">
            {" "}
            {displayContents.length > 0 ? (
              displayContents.map((content) => (
                <ContentCard key={content.id} content={content} />
              ))
            ) : (
              <div className="w-full py-8 text-center text-gray-500">{emptyMessage}</div>
            )}{" "}
          </div>{" "}
        </div>
      )}{" "}
    </div>
  );
};

export default ContentScrollList;
