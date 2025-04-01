import React from "react";
import { FaStar } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { Content } from "../types/content";

interface ContentCardProps {
  content: Content;
  type?: string;
  className?: string;
}

const ContentCard: React.FC<ContentCardProps> = ({ content, type, className = "" }) => {
  const navigate = useNavigate();
  const imageUrl = content.poster_path
      ? `https://image.tmdb.org/t/p/w500${content.poster_path}`
      : "https://via.placeholder.com/500x750?text=No+Poster";
  const displayTitle =
      content.media_type === "tv"
          ? content.name || content.original_name || "제목 없음"
          : content.title || content.original_title || "제목 없음";
  const date =
      content.media_type === "tv" ? content.first_air_date : content.release_date;
  const formattedDate = date
      ? new Date(date).toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
      : content.media_type === "tv"
          ? "방영일 미정"
          : "개봉일 미정";
  const typeLabel = content.media_type === "tv" ? "TV" : "영화";
  const handleClick = () => {
    const mediaType = content.media_type === "tv" ? "tv" : "movie";
    navigate(`/${mediaType}/${content.id}`);
  };
  return (
      <div
          className={`min-w-[200px] max-w-[220px] flex-shrink-0 overflow-hidden rounded-lg shadow-md transition-transform hover:scale-105 sm:min-w-[220px] md:min-w-[200px] cursor-pointer ${className}`}
          onClick={handleClick}
      >
        {" "}
        <div className="relative aspect-[2/3] w-full">
          {" "}
          <img
              src={imageUrl}
              alt={displayTitle}
              className="h-full w-full object-cover"
              onError={(e) => {
                e.currentTarget.src =
                    "https://via.placeholder.com/500x750?text=No+Poster";
              }}
          />{" "}
          {content.media_type && (
              <div className="absolute right-2 top-2 rounded bg-black/70 px-2 py-1 text-xs text-white">
                {" "}
                {typeLabel}{" "}
              </div>
          )}{" "}
        </div>{" "}
        <div className="p-3">
          {" "}
          <h3 className="line-clamp-1 text-base font-bold">
            {displayTitle}
          </h3>{" "}
          <div className="flex items-center gap-1 text-sm">
            {" "}
            <FaStar className="text-yellow-500" />{" "}
            <span>{content.vote_average.toFixed(1)}</span>{" "}
          </div>{" "}
          <p className="text-xs text-gray-500">
            {" "}
            평점 ({content.vote_count}) · {formattedDate}{" "}
          </p>{" "}
        </div>{" "}
      </div>
  );
};
export default ContentCard;
