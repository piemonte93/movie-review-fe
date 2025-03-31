import React from "react";
import { FaTimes } from "react-icons/fa";

// 영화 장르 목록
export const genres = [
  { id: 28, name: "액션" },
  { id: 12, name: "모험" },
  { id: 16, name: "애니메이션" },
  { id: 35, name: "코미디" },
  { id: 80, name: "범죄" },
  { id: 99, name: "다큐멘터리" },
  { id: 18, name: "드라마" },
  { id: 10751, name: "가족" },
  { id: 14, name: "판타지" },
  { id: 36, name: "역사" },
  { id: 27, name: "공포" },
  { id: 10402, name: "음악" },
  { id: 9648, name: "미스터리" },
  { id: 10749, name: "로맨스" },
  { id: 878, name: "SF" },
  { id: 10770, name: "TV 영화" },
  { id: 53, name: "스릴러" },
  { id: 10752, name: "전쟁" },
  { id: 37, name: "서부" },
];

// 연도 목록
export const years = Array.from(
  { length: 25 },
  (_, i) => new Date().getFullYear() - i
);

// 정렬 옵션
export const sortOptions = [
  { value: "popularity.desc", label: "인기도 순" },
  { value: "vote_average.desc", label: "평점 순" },
  { value: "release_date.desc", label: "최신 순" },
  { value: "revenue.desc", label: "수익 순" },
];

// 영화 장르 정보는 props로 전달받도록 변경
interface Genre {
  id: number;
  name: string;
}

// 정렬 옵션 정보는 props로 전달받도록 변경
interface SortOption {
  value: string;
  label: string;
}

interface FilterPanelProps {
  genres: Genre[];
  selectedGenres: number[];
  toggleGenre: (genreId: number) => void;
  toggleAllGenres: () => void;
  years: number[];
  selectedYear: number | undefined;
  setSelectedYear: (year: number | undefined) => void;
  sortOptions: SortOption[];
  selectedSort: string;
  setSelectedSort: (sort: string) => void;
  voteRange: number;
  setVoteRange: (range: number) => void;
  isKoreanMovie: boolean;
  setIsKoreanMovie: (isKorean: boolean) => void;
  isForeignMovie: boolean;
  setIsForeignMovie: (isForeign: boolean) => void;
  applyFilters: () => void;
  resetFilters: () => void;
}

const FilterPanel: React.FC<FilterPanelProps> = ({
  genres,
  selectedGenres,
  toggleGenre,
  toggleAllGenres,
  years,
  selectedYear,
  setSelectedYear,
  sortOptions,
  selectedSort,
  setSelectedSort,
  voteRange,
  setVoteRange,
  isKoreanMovie,
  setIsKoreanMovie,
  isForeignMovie,
  setIsForeignMovie,
  applyFilters,
  resetFilters,
}) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
      <h2 className="font-bold text-lg mb-4">필터</h2>

      {/* 장르 필터 */}
      <div className="mb-6">
        <h3 className="font-medium mb-2">장르</h3>
        <div className="flex flex-wrap gap-2 mb-2">
          <button
            onClick={toggleAllGenres}
            className={`rounded-full px-3 py-1 text-sm ${
              selectedGenres.length === 0
                ? "bg-slate-900 text-white"
                : "border border-gray-300 hover:bg-gray-100"
            }`}
          >
            전체
          </button>
          {genres.map((genre) => (
            <button
              key={genre.id}
              onClick={() => toggleGenre(genre.id)}
              className={`rounded-full px-3 py-1 text-sm ${
                selectedGenres.includes(genre.id)
                  ? "bg-slate-900 text-white"
                  : "border border-gray-300 hover:bg-gray-100"
              }`}
            >
              {genre.name}
            </button>
          ))}
        </div>
      </div>

      {/* 연도 필터 */}
      <div className="mb-6">
        <h3 className="font-medium mb-2">연도</h3>
        <select
          value={selectedYear || ""}
          onChange={(e) =>
            setSelectedYear(
              e.target.value ? parseInt(e.target.value) : undefined
            )
          }
          className="w-full p-2 border border-gray-300 rounded"
        >
          <option value="">모든 연도</option>
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>

      {/* 정렬 필터 */}
      <div className="mb-6">
        <h3 className="font-medium mb-2">정렬</h3>
        <select
          value={selectedSort}
          onChange={(e) => setSelectedSort(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded"
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* 평점 필터 */}
      <div className="mb-6">
        <h3 className="font-medium mb-2">최소 평점</h3>
        <div className="flex justify-between text-xs mb-1">
          <span>0</span>
          <span>10</span>
        </div>
        <input
          type="range"
          min="0"
          max="10"
          step="0.5"
          value={voteRange}
          onChange={(e) => setVoteRange(parseFloat(e.target.value))}
          className="w-full"
        />
        <div className="text-center mt-1 text-sm">
          {voteRange > 0 ? `${voteRange}점 이상` : "모든 평점"}
        </div>
      </div>

      {/* 국내/해외 영화 필터 */}
      <div className="mb-6">
        <h3 className="font-medium mb-2">영화 지역</h3>
        <div className="space-y-2">
          <label className="flex items-center">
            <input
              type="checkbox"
              className="mr-2"
              checked={isKoreanMovie}
              onChange={(e) => {
                const checked = e.target.checked;
                setIsKoreanMovie(checked);
                if (checked && isForeignMovie) {
                  setIsForeignMovie(false);
                }
              }}
            />
            <span className="text-sm">한국 영화만 보기</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              className="mr-2"
              checked={isForeignMovie}
              onChange={(e) => {
                const checked = e.target.checked;
                setIsForeignMovie(checked);
                if (checked && isKoreanMovie) {
                  setIsKoreanMovie(false);
                }
              }}
            />
            <span className="text-sm">해외 영화만 보기</span>
          </label>
        </div>
      </div>

      {/* 버튼 그룹 */}
      <div className="flex space-x-2">
        <button
          onClick={resetFilters}
          className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 w-1/2"
        >
          초기화
        </button>
        <button
          onClick={applyFilters}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 w-1/2"
        >
          적용
        </button>
      </div>
    </div>
  );
};

export default FilterPanel;
