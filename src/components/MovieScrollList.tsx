import React from "react";
import MovieCard from "./MovieCard";
import { Movie } from "../types/movie";
import { FaChevronRight } from "react-icons/fa";

interface MovieScrollListProps {
  title: string;
  movies: Movie[];
  loading?: boolean;
  error?: string | null;
  category?: string;
}

const MovieScrollList: React.FC<MovieScrollListProps> = ({
  title,
  movies,
  loading = false,
  error = null,
  category = "",
}) => {
  // 최대 10개의 영화만 표시하도록 제한
  const displayMovies = movies.slice(0, 9);
  const hasMoreMovies = movies.length > 9;

  return (
    <div className="my-10">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-2xl font-bold">{title}</h2>
        {hasMoreMovies && !loading && (
          <button className="flex items-center gap-1 text-sm text-blue-500 hover:text-blue-700">
            <span>더보기</span>
            <FaChevronRight size={12} />
          </button>
        )}
      </div>

      {loading && (
        <div className="flex justify-center py-6">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
        </div>
      )}

      {error && <div className="py-4 text-center text-red-500">{error}</div>}

      {!loading && !error && (
        <div className="relative">
          <div className="scrollbar-hide flex gap-4 overflow-x-auto pb-5">
            {displayMovies.map((movie) => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MovieScrollList;
