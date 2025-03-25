import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useFilteredMovies } from "../hooks/useSearch";
import ContentCard from "../components/ContentCard";
import FilterPanel from "../components/FilterPanel";
import { FaFilter } from "react-icons/fa";
import Pagination from "../components/Pagination";

// genres와 sortOptions 정의
const movieGenres = [
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

// 정렬 옵션
const movieSortOptions = [
  { value: "popularity.desc", label: "인기도 순" },
  { value: "vote_average.desc", label: "평점 순" },
  { value: "release_date.desc", label: "최신 순" },
  { value: "revenue.desc", label: "수익 순" },
];

// 연도 목록
const movieYears = Array.from(
  { length: 25 },
  (_, i) => new Date().getFullYear() - i
);

const MoviesPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);

  // URL 파라미터에서 필터 값 가져오기
  const [selectedGenres, setSelectedGenres] = useState<number[]>(
    queryParams.get("genres")
      ? queryParams.get("genres")!.split(",").map(Number)
      : []
  );
  const [selectedYear, setSelectedYear] = useState<number | undefined>(
    queryParams.get("year") ? Number(queryParams.get("year")) : undefined
  );
  const [selectedSort, setSelectedSort] = useState<string>(
    queryParams.get("sort_by") || "popularity.desc"
  );
  const [searchQuery, setSearchQuery] = useState<string>(
    queryParams.get("query") || ""
  );
  const [searchInput, setSearchInput] = useState<string>(
    queryParams.get("query") || ""
  );
  // 현재 페이지 상태 추가
  const [currentPage, setCurrentPage] = useState<number>(
    queryParams.get("page") ? Number(queryParams.get("page")) : 1
  );
  // 사용자 평점 범위 상태 추가
  const [voteRange, setVoteRange] = useState<number>(
    queryParams.get("vote_min") ? Number(queryParams.get("vote_min")) : 0
  );
  // 국내/해외 영화 필터 상태 추가
  const [isKoreanMovie, setIsKoreanMovie] = useState<boolean>(
    queryParams.get("is_korean") === "true"
  );
  const [isForeignMovie, setIsForeignMovie] = useState<boolean>(
    queryParams.get("is_foreign") === "true"
  );
  // 모바일에서 필터 패널 표시 여부를 위한 상태
  const [isFilterVisible, setIsFilterVisible] = useState<boolean>(false);

  // URL 변경 시 필터 상태 업데이트
  useEffect(() => {
    const genres = queryParams.get("genres");
    const year = queryParams.get("year");
    const sortBy = queryParams.get("sort_by");
    const query = queryParams.get("query");
    const page = queryParams.get("page");
    const voteMin = queryParams.get("vote_min");
    const isKorean = queryParams.get("is_korean");
    const isForeign = queryParams.get("is_foreign");

    if (genres) setSelectedGenres(genres.split(",").map(Number));
    else setSelectedGenres([]);

    if (year) setSelectedYear(Number(year));
    else setSelectedYear(undefined);

    if (sortBy) setSelectedSort(sortBy);
    else setSelectedSort("popularity.desc");

    if (query) {
      setSearchQuery(query);
      setSearchInput(query);
    } else {
      setSearchQuery("");
      setSearchInput("");
    }

    if (page) setCurrentPage(Number(page));
    else setCurrentPage(1);

    if (voteMin) setVoteRange(Number(voteMin));
    else setVoteRange(0);

    setIsKoreanMovie(isKorean === "true");
    setIsForeignMovie(isForeign === "true");
  }, [location.search]);

  // 필터링된 영화 목록을 가져오는 함수
  const { contents, loading, error, totalPages, totalResults } =
    useFilteredMovies(
      selectedGenres.length > 0 ? selectedGenres : undefined,
      selectedYear,
      selectedSort,
      currentPage,
      searchQuery,
      voteRange > 0 ? voteRange : undefined,
      isKoreanMovie,
      isForeignMovie
    );

  // 장르 토글 함수
  const toggleGenre = (genreId: number) => {
    if (selectedGenres.includes(genreId)) {
      setSelectedGenres(selectedGenres.filter((id) => id !== genreId));
    } else {
      setSelectedGenres([...selectedGenres, genreId]);
    }
  };

  // 전체 선택/해제
  const toggleAllGenres = () => {
    if (selectedGenres.length > 0) {
      setSelectedGenres([]);
    } else {
      // 모든 장르 ID 추가
      setSelectedGenres([
        878, 10770, 10751, 27, 18, 10749, 9648, 80, 16, 35, 53, 28, 12, 14, 36,
        10402, 99, 37,
      ]);
    }
  };

  // 필터 적용 함수
  const applyFilters = () => {
    const params = new URLSearchParams();

    if (selectedGenres.length > 0)
      params.set("genres", selectedGenres.join(","));
    if (selectedYear) params.set("year", selectedYear.toString());
    if (selectedSort) params.set("sort_by", selectedSort);
    if (searchInput.trim()) params.set("query", searchInput.trim());
    if (currentPage > 1) params.set("page", currentPage.toString());
    if (voteRange > 0) params.set("vote_min", voteRange.toString());
    if (isKoreanMovie) params.set("is_korean", "true");
    if (isForeignMovie) params.set("is_foreign", "true");

    navigate(`/movies?${params.toString()}`);
    // 모바일 필터 패널 닫기
    setIsFilterVisible(false);
  };

  // 필터 초기화 함수
  const resetFilters = () => {
    setSelectedGenres([]);
    setSelectedYear(undefined);
    setSelectedSort("popularity.desc");
    setCurrentPage(1);
    setVoteRange(0);
    setIsKoreanMovie(false);
    setIsForeignMovie(false);
    // 검색어는 초기화하지 않음
  };

  // 페이지 변경 핸들러
  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(location.search);
    if (page > 1) {
      params.set("page", page.toString());
    } else {
      params.delete("page");
    }
    navigate(`/movies?${params.toString()}`);
    // 페이지 상단으로 스크롤
    window.scrollTo(0, 0);
  };

  // 검색어 입력 핸들러
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchInput(newValue);

    // 검색어 변경 시 실시간으로 검색 결과 업데이트 (타이핑 후 200ms 동안 변경이 없으면 검색)
    clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      const params = new URLSearchParams(location.search);

      if (newValue.trim()) {
        params.set("query", newValue.trim());
      } else {
        params.delete("query");
      }

      // 페이지 파라미터 초기화
      params.delete("page");

      navigate(`/movies?${params.toString()}`);
    }, 200); // 500ms에서 200ms로 감소
  };

  // 검색 타임아웃 참조
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // 검색어 초기화 핸들러
  const clearSearchQuery = () => {
    setSearchInput("");
    const params = new URLSearchParams(location.search);
    params.delete("query");
    params.delete("page");
    navigate(`/movies?${params.toString()}`);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:justify-between items-center mb-4">
          <h1 className="text-2xl font-bold mb-4 sm:mb-0">영화 탐색</h1>
          <div className="w-full sm:w-auto flex items-center mb-4 sm:mb-0">
            <div className="relative w-full sm:w-80">
              <input
                type="text"
                value={searchInput}
                onChange={handleSearchInputChange}
                placeholder="영화 검색..."
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={clearSearchQuery}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* 모바일에서 필터 토글 버튼 */}
          <button
            className="sm:hidden flex items-center bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors w-full justify-center mt-2"
            onClick={() => setIsFilterVisible(!isFilterVisible)}
          >
            <FaFilter className="mr-2" />
            필터 {isFilterVisible ? "숨기기" : "보기"}
          </button>
        </div>

        {/* 검색 결과 요약 */}
        {searchQuery && (
          <div className="mb-4 text-gray-600">
            "{searchQuery}" 검색 결과: {totalResults}개의 영화
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row">
        {/* 필터 패널 - 모바일에서는 토글 버튼으로 표시 여부 제어 */}
        <aside
          className={`${
            isFilterVisible ? "block" : "hidden"
          } sm:block sm:w-64 mb-6 sm:mb-0 sm:mr-6`}
        >
          <FilterPanel
            genres={movieGenres}
            selectedGenres={selectedGenres}
            toggleGenre={toggleGenre}
            toggleAllGenres={toggleAllGenres}
            years={movieYears}
            selectedYear={selectedYear}
            setSelectedYear={setSelectedYear}
            sortOptions={movieSortOptions}
            selectedSort={selectedSort}
            setSelectedSort={setSelectedSort}
            voteRange={voteRange}
            setVoteRange={setVoteRange}
            isKoreanMovie={isKoreanMovie}
            setIsKoreanMovie={setIsKoreanMovie}
            isForeignMovie={isForeignMovie}
            setIsForeignMovie={setIsForeignMovie}
            applyFilters={applyFilters}
            resetFilters={resetFilters}
          />
        </aside>

        {/* 영화 목록 */}
        <div className="flex-1">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <div className="text-red-500 text-center py-8">{error}</div>
          ) : contents.length > 0 ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {contents.map((movie) => (
                  <ContentCard key={movie.id} content={movie} />
                ))}
              </div>

              {/* 페이지네이션 */}
              {totalPages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                  className="mt-8"
                />
              )}
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">
              {searchQuery
                ? `"${searchQuery}"에 대한 검색 결과가 없습니다.`
                : "조건에 맞는 영화가 없습니다. 다른 필터를 시도해보세요."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MoviesPage;
