import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useFilteredTvShows } from "../hooks/useSearch";
import ContentCard from "../components/ContentCard";
import { FaSearch } from "react-icons/fa";

// TV 쇼 장르 정의
const tvGenres = [
  { id: 10759, name: "액션/어드벤처" },
  { id: 16, name: "애니메이션" },
  { id: 35, name: "코미디" },
  { id: 80, name: "범죄" },
  { id: 99, name: "다큐멘터리" },
  { id: 18, name: "드라마" },
  { id: 10751, name: "가족" },
  { id: 10762, name: "키즈" },
  { id: 9648, name: "미스터리" },
  { id: 10763, name: "뉴스" },
  { id: 10764, name: "리얼리티" },
  { id: 10765, name: "SF/판타지" },
  { id: 10766, name: "소프" },
  { id: 10767, name: "토크" },
  { id: 10768, name: "전쟁/정치" },
  { id: 37, name: "서부" },
];

// 정렬 옵션
const sortOptions = [
  { value: "popularity.desc", label: "인기도 순" },
  { value: "vote_average.desc", label: "평점 순" },
  { value: "first_air_date.desc", label: "최신 순" },
  { value: "name.asc", label: "이름 순" },
];

const TvSearchPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const initialQuery = queryParams.get("q") || "";
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [currentPage, setCurrentPage] = useState(1);

  // 필터 상태
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
  const [voteRange, setVoteRange] = useState<number>(
    queryParams.get("vote_min") ? Number(queryParams.get("vote_min")) : 0
  );
  const [isKoreanShow, setIsKoreanShow] = useState<boolean>(
    queryParams.get("is_korean") === "true"
  );
  const [isForeignShow, setIsForeignShow] = useState<boolean>(
    queryParams.get("is_foreign") === "true"
  );
  const [networkInput, setNetworkInput] = useState<string>(
    queryParams.get("network") || ""
  );

  // URL의 쿼리 파라미터에서 페이지 정보를 가져옴
  useEffect(() => {
    const page = Number(queryParams.get("page")) || 1;
    setCurrentPage(page);

    // 다른 필터 파라미터들도 업데이트
    const genres = queryParams.get("genres");
    if (genres) setSelectedGenres(genres.split(",").map(Number));
    else setSelectedGenres([]);

    const year = queryParams.get("year");
    if (year) setSelectedYear(Number(year));
    else setSelectedYear(undefined);

    const sortBy = queryParams.get("sort_by");
    if (sortBy) setSelectedSort(sortBy);
    else setSelectedSort("popularity.desc");

    const voteMin = queryParams.get("vote_min");
    if (voteMin) setVoteRange(Number(voteMin));
    else setVoteRange(0);

    setIsKoreanShow(queryParams.get("is_korean") === "true");
    setIsForeignShow(queryParams.get("is_foreign") === "true");

    const network = queryParams.get("network");
    if (network) setNetworkInput(network);
    else setNetworkInput("");
  }, [location.search, queryParams]);

  // 검색 훅을 사용해 결과 가져오기
  const { contents, loading, error, totalPages, totalResults } =
    useFilteredTvShows(
      selectedGenres.length > 0 ? selectedGenres : undefined,
      selectedYear,
      selectedSort,
      currentPage,
      initialQuery,
      voteRange > 0 ? voteRange : undefined,
      isKoreanShow,
      isForeignShow,
      networkInput || undefined
    );

  // 검색 폼 제출 핸들러
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // 페이지를 1로 초기화하고 새 검색어로 이동
      const params = new URLSearchParams();
      params.set("q", searchQuery.trim());

      // 기존 필터 유지
      if (selectedGenres.length > 0)
        params.set("genres", selectedGenres.join(","));
      if (selectedYear) params.set("year", selectedYear.toString());
      if (selectedSort) params.set("sort_by", selectedSort);
      if (voteRange > 0) params.set("vote_min", voteRange.toString());
      if (isKoreanShow) params.set("is_korean", "true");
      if (isForeignShow) params.set("is_foreign", "true");
      if (networkInput.trim()) params.set("network", networkInput.trim());

      navigate(`/tv-search?${params.toString()}`);
    }
  };

  // 장르 토글 함수
  const toggleGenre = (genreId: number) => {
    const newGenres = selectedGenres.includes(genreId)
      ? selectedGenres.filter((id) => id !== genreId)
      : [...selectedGenres, genreId];

    updateFilters({ genres: newGenres });
  };

  // 년도 선택 핸들러
  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const year = e.target.value ? Number(e.target.value) : undefined;
    updateFilters({ year });
  };

  // 정렬 방식 선택 핸들러
  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateFilters({ sortBy: e.target.value });
  };

  // 한국/외국 TV 쇼 필터 토글
  const toggleKoreanShow = () => {
    updateFilters({ isKorean: !isKoreanShow });
  };

  const toggleForeignShow = () => {
    updateFilters({ isForeign: !isForeignShow });
  };

  // 네트워크 입력 핸들러
  const handleNetworkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNetworkInput(e.target.value);
  };

  // 필터 업데이트 함수
  const updateFilters = (filterChanges: {
    genres?: number[];
    year?: number | undefined;
    sortBy?: string;
    isKorean?: boolean;
    isForeign?: boolean;
    network?: string;
  }) => {
    const params = new URLSearchParams(location.search);

    // 검색어 유지
    if (initialQuery) params.set("q", initialQuery);

    // 장르 업데이트
    if (filterChanges.genres !== undefined) {
      if (filterChanges.genres.length > 0) {
        params.set("genres", filterChanges.genres.join(","));
        setSelectedGenres(filterChanges.genres);
      } else {
        params.delete("genres");
        setSelectedGenres([]);
      }
    }

    // 년도 업데이트
    if (filterChanges.year !== undefined) {
      if (filterChanges.year) {
        params.set("year", filterChanges.year.toString());
        setSelectedYear(filterChanges.year);
      } else {
        params.delete("year");
        setSelectedYear(undefined);
      }
    }

    // 정렬 방식 업데이트
    if (filterChanges.sortBy !== undefined) {
      params.set("sort_by", filterChanges.sortBy);
      setSelectedSort(filterChanges.sortBy);
    }

    // 한국 TV 쇼 필터 업데이트
    if (filterChanges.isKorean !== undefined) {
      if (filterChanges.isKorean) {
        params.set("is_korean", "true");
      } else {
        params.delete("is_korean");
      }
      setIsKoreanShow(filterChanges.isKorean);
    }

    // 외국 TV 쇼 필터 업데이트
    if (filterChanges.isForeign !== undefined) {
      if (filterChanges.isForeign) {
        params.set("is_foreign", "true");
      } else {
        params.delete("is_foreign");
      }
      setIsForeignShow(filterChanges.isForeign);
    }

    // 네트워크 업데이트
    if (filterChanges.network !== undefined) {
      if (filterChanges.network && filterChanges.network.trim() !== "") {
        params.set("network", filterChanges.network);
        setNetworkInput(filterChanges.network);
      } else {
        params.delete("network");
        setNetworkInput("");
      }
    }

    // 페이지 초기화
    params.delete("page");

    // 네비게이션
    navigate(`/tv-search?${params.toString()}`);
  };

  // 필터 적용 함수
  const applyFilters = () => {
    updateFilters({ network: networkInput });
  };

  // 페이지 변경 핸들러
  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(location.search);
    if (page > 1) {
      params.set("page", page.toString());
    } else {
      params.delete("page");
    }
    navigate(`/tv-search?${params.toString()}`);
    window.scrollTo(0, 0);
  };

  // 결과 없음 메시지 컴포넌트
  const NoResultsMessage = () => (
    <div className="rounded-lg bg-gray-50 p-6 text-center">
      <p className="text-lg text-gray-600">
        {initialQuery
          ? `"${initialQuery}"에 대한 검색 결과가 없습니다.`
          : "검색어를 입력해주세요."}
      </p>
      {initialQuery && (
        <div className="mt-4 text-sm text-gray-500">
          <p>검색 팁:</p>
          <ul className="mt-2 list-disc pl-5 text-left">
            <li>다른 키워드로 검색해보세요.</li>
            <li>더 일반적인 단어를 사용해보세요.</li>
            <li>오타가 없는지 확인해보세요.</li>
          </ul>
        </div>
      )}
    </div>
  );

  // 연도 옵션 생성
  const yearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let year = currentYear; year >= 1950; year--) {
      years.push(year);
    }
    return years;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold">TV 쇼 검색</h1>

      {/* 검색 폼 */}
      <form onSubmit={handleSubmit} className="mb-8 flex">
        <div className="relative flex-grow">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-gray-300 py-3 pl-12 pr-4 text-base focus:border-blue-500 focus:outline-none"
            placeholder="TV 쇼 제목 검색..."
          />
          <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 transform text-gray-400" />
        </div>
        <button
          type="submit"
          className="ml-2 rounded-lg bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700"
          disabled={loading}
        >
          검색
        </button>
      </form>

      {/* 필터 섹션 */}
      <div className="mb-6 bg-gray-50 p-4 rounded-lg">
        <h2 className="text-lg font-semibold mb-4">필터</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* 장르 필터 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              장르
            </label>
            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
              {tvGenres.map((genre) => (
                <button
                  key={genre.id}
                  className={`px-3 py-1 text-xs rounded-full ${
                    selectedGenres.includes(genre.id)
                      ? "bg-blue-500 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                  onClick={() => toggleGenre(genre.id)}
                >
                  {genre.name}
                </button>
              ))}
            </div>
          </div>

          {/* 년도 필터 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              방영 연도
            </label>
            <select
              value={selectedYear || ""}
              onChange={handleYearChange}
              className="w-full p-2 border border-gray-300 rounded"
            >
              <option value="">모든 년도</option>
              {yearOptions().map((year) => (
                <option key={year} value={year}>
                  {year}년
                </option>
              ))}
            </select>
          </div>

          {/* 정렬 필터 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              정렬
            </label>
            <select
              value={selectedSort}
              onChange={handleSortChange}
              className="w-full p-2 border border-gray-300 rounded"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* 방송사 필터 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              방송사
            </label>
            <div className="flex">
              <input
                type="text"
                value={networkInput}
                onChange={handleNetworkChange}
                placeholder="방송사 이름"
                className="flex-grow p-2 border border-gray-300 rounded-l"
              />
              <button
                type="button"
                onClick={applyFilters}
                className="bg-blue-500 text-white px-3 py-2 rounded-r hover:bg-blue-600"
              >
                적용
              </button>
            </div>
          </div>
        </div>

        {/* 추가 필터 옵션 */}
        <div className="mt-4 flex flex-wrap gap-4">
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              checked={isKoreanShow}
              onChange={toggleKoreanShow}
              className="form-checkbox h-5 w-5 text-blue-600"
            />
            <span className="ml-2 text-gray-700">한국 TV 쇼만</span>
          </label>
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              checked={isForeignShow}
              onChange={toggleForeignShow}
              className="form-checkbox h-5 w-5 text-blue-600"
            />
            <span className="ml-2 text-gray-700">외국 TV 쇼만</span>
          </label>
        </div>
      </div>

      {/* 결과 섹션 */}
      {loading ? (
        <div className="flex justify-center py-10">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
        </div>
      ) : error ? (
        <div className="rounded-lg bg-red-50 p-4 text-center text-red-600">
          {error}
        </div>
      ) : contents.length === 0 ? (
        <NoResultsMessage />
      ) : (
        <>
          {/* 검색 결과 개수 표시 */}
          <p className="mb-4 text-gray-600">
            총 {totalResults.toLocaleString()}개의 결과 중{" "}
            {((currentPage - 1) * 20 + 1).toLocaleString()} -{" "}
            {Math.min(currentPage * 20, totalResults).toLocaleString()}
          </p>

          {/* 결과 그리드 */}
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {contents.map((content) => (
              <ContentCard key={content.id} content={content} />
            ))}
          </div>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="mt-10 flex justify-center">
              <div className="flex flex-wrap gap-2">
                {/* 처음으로 버튼 */}
                {currentPage > 3 && (
                  <button
                    onClick={() => handlePageChange(1)}
                    className="rounded-md border border-gray-300 px-3 py-2 hover:bg-gray-50"
                  >
                    처음
                  </button>
                )}

                {/* 이전 버튼 */}
                {currentPage > 1 && (
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    className="rounded-md border border-gray-300 px-4 py-2 hover:bg-gray-50"
                  >
                    이전
                  </button>
                )}

                {/* 페이지 번호 생성 (최대 5개) */}
                {Array.from({ length: Math.min(5, totalPages) }).map(
                  (_, idx) => {
                    let pageNumber = 1;

                    if (currentPage <= 3) {
                      pageNumber = idx + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNumber = totalPages - 4 + idx;
                    } else {
                      pageNumber = currentPage - 2 + idx;
                    }

                    // 계산된 페이지 번호가 유효한 범위인지 확인
                    if (pageNumber > 0 && pageNumber <= totalPages) {
                      return (
                        <button
                          key={pageNumber}
                          onClick={() => handlePageChange(pageNumber)}
                          className={`rounded-md px-4 py-2 ${
                            currentPage === pageNumber
                              ? "bg-blue-600 text-white"
                              : "border border-gray-300 hover:bg-gray-50"
                          }`}
                        >
                          {pageNumber}
                        </button>
                      );
                    }
                    return null;
                  }
                )}

                {/* 다음 버튼 */}
                {currentPage < totalPages && (
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    className="rounded-md border border-gray-300 px-4 py-2 hover:bg-gray-50"
                  >
                    다음
                  </button>
                )}

                {/* 마지막으로 버튼 */}
                {currentPage < totalPages - 2 && (
                  <button
                    onClick={() => handlePageChange(totalPages)}
                    className="rounded-md border border-gray-300 px-3 py-2 hover:bg-gray-50"
                  >
                    마지막
                  </button>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default TvSearchPage;
