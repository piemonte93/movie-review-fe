import React, { useEffect, useState } from "react";
import ContentCard from "./ContentCard";
import { Content } from "../types/content";
import { FaChevronRight } from "react-icons/fa";
import { backendApi } from "../api/backendApi";

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
  const [localRatings, setLocalRatings] = useState<
    Record<number, number | null>
  >({});

  useEffect(() => {
    const fetchLocalRatings = async () => {
      const ratings: Record<number, number | null> = {};

      for (const content of displayContents) {
        if (content.id) {
          const mediaType = content.media_type || "movie";
          try {
            const rating = await backendApi.getAverageContentRating(
              content.id,
              mediaType === "tv" ? "tv" : "movie"
            );
            ratings[content.id] = rating;
          } catch (error) {
            console.error(
              `콘텐츠 ID ${content.id}의 로컬 평점을 가져오는 중 오류 발생:`,
              error
            );
            ratings[content.id] = null;
          }
        }
      }

      setLocalRatings(ratings);
    };

    if (displayContents.length > 0 && !loading) {
      fetchLocalRatings();
    }
  }, [displayContents, loading]);

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
                <ContentCard
                  key={content.id}
                  content={content}
                  localRating={content.id ? localRatings[content.id] : null}
                />
              ))
            ) : (
              <div className="w-full py-8 text-center text-gray-500">
                {emptyMessage}
              </div>
            )}{" "}
          </div>{" "}
        </div>
      )}{" "}
    </div>
  );
};

export default ContentScrollList;
