import React from "react";
import { FaStar } from "react-icons/fa";
import { Movie } from "../types/movie";

interface MovieCardProps {
  movie: Movie;
}

const MovieCard: React.FC<MovieCardProps> = ({ movie }) => {
  // Use placeholder image if poster_path is not available
  // 더 높은 해상도의 이미지 요청 (w342 -> w500)
  const imageUrl = movie.poster_path
    ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
    : "https://via.placeholder.com/500x750?text=No+Poster";

  // 제목은 타입에 따라 결정 (영화면 title, TV면 name 사용)
  const displayTitle =
    movie.media_type === "tv"
      ? movie.name || movie.original_name || "제목 없음"
      : movie.title || movie.original_title || "제목 없음";

  // 개봉일/방영일 포맷팅
  const date = movie.media_type === "tv" ? movie.first_air_date : movie.release_date;
  const formattedDate = date
    ? new Date(date).toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : movie.media_type === "tv"
      ? "방영일 미정"
      : "개봉일 미정";

  // 미디어 타입에 따른 레이블
  const typeLabel = movie.media_type === "tv" ? "TV" : "영화";

  return (
    <div className="min-w-[200px] max-w-[220px] flex-shrink-0 overflow-hidden rounded-lg shadow-md transition-transform hover:scale-105 sm:min-w-[220px] md:min-w-[200px]">
      <div className="relative aspect-[2/3] w-full">
        <img
          src={imageUrl}
          alt={displayTitle}
          className="h-full w-full object-cover"
          onError={(e) => {
            e.currentTarget.src = "https://via.placeholder.com/500x750?text=No+Poster";
          }}
        />
        {movie.media_type && (
          <div className="absolute right-2 top-2 rounded bg-black/70 px-2 py-1 text-xs text-white">
            {typeLabel}
          </div>
        )}
      </div>
      <div className="p-3">
        <h3 className="line-clamp-1 text-base font-bold">{displayTitle}</h3>
        <div className="flex items-center gap-1 text-sm">
          <FaStar className="text-yellow-500" />
          <span>{movie.vote_average.toFixed(1)}</span>
        </div>
        <p className="text-xs text-gray-500">
          평점 ({movie.vote_count}) · {formattedDate}
        </p>
      </div>
    </div>
  );
};

export default MovieCard;
