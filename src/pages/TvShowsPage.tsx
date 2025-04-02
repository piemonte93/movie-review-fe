import React, { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useFilteredTvShows } from "../hooks/useSearch";
import ContentCard from "../components/ContentCard";
import FilterPanel from "../components/FilterPanel";
import { FaFilter } from "react-icons/fa";
import { TvShow } from "../types/content";

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
const tvSortOptions = [
  { value: "popularity.desc", label: "인기도 순" },
  { value: "vote_average.desc", label: "평점 순" },
  { value: "first_air_date.desc", label: "최신 순" },
  { value: "name.asc", label: "이름 순" },
];

// 연도 목록
const tvYears = Array.from(
  { length: 25 },
  (_, i) => new Date().getFullYear() - i
);

const TvShowsPage: React.FC = () => {
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
  const [currentPage, setCurrentPage] = useState<number>(
    queryParams.get("page") ? Number(queryParams.get("page")) : 1
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
  const [isFilterVisible, setIsFilterVisible] = useState<boolean>(false);

  // 방송사 필터 상태 추가
  const [networkInput, setNetworkInput] = useState<string>(
    queryParams.get("network") || ""
  );
  const [selectedNetwork, setSelectedNetwork] = useState<string>(
    queryParams.get("network") || ""
  );

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
    const network = queryParams.get("network");

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

    setIsKoreanShow(isKorean === "true");
    setIsForeignShow(isForeign === "true");
    
    if (network) {
      setNetworkInput(network);
      setSelectedNetwork(network);
    } else {
      setNetworkInput("");
      setSelectedNetwork("");
    }
  }, [location.search]);

  // 필터링된 TV 쇼 목록을 가져오는 함수
  const { contents, loading, error, totalPages, totalResults } =
    useFilteredTvShows(
      selectedGenres.length > 0 ? selectedGenres : undefined,
      selectedYear,
      selectedSort,
      currentPage,
      searchQuery,
      voteRange > 0 ? voteRange : undefined,
      isKoreanShow,
      isForeignShow,
      selectedNetwork || undefined
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
      setSelectedGenres(tvGenres.map((genre) => genre.id));
    }
  };

  // 방송사 입력 핸들러
  const handleNetworkInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNetworkInput(e.target.value);
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
    if (isKoreanShow) params.set("is_korean", "true");
    if (isForeignShow) params.set("is_foreign", "true");
    if (networkInput.trim()) params.set("network", networkInput.trim());

    navigate(`/tv?${params.toString()}`);
    setIsFilterVisible(false);
  };

  // 필터 초기화 함수
  const resetFilters = () => {
    setSelectedGenres([]);
    setSelectedYear(undefined);
    setSelectedSort("popularity.desc");
    setCurrentPage(1);
    setVoteRange(0);
    setIsKoreanShow(false);
    setIsForeignShow(false);
    setNetworkInput("");
    setSelectedNetwork("");
  };

  // 페이지 변경 핸들러
  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(location.search);
    if (page > 1) {
      params.set("page", page.toString());
    } else {
      params.delete("page");
    }
    navigate(`/tv?${params.toString()}`);
    window.scrollTo(0, 0);
  };

  // 누적된 TV 쇼 목록을 저장하는 상태
  const [allShows, setAllShows] = useState<TvShow[]>([]);
  
  // 추가 데이터를 로드 중인지 여부
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  
  // 모든 데이터를 로드했는지 여부
  const [hasMore, setHasMore] = useState<boolean>(true);
  
  // 마지막 요소를 감지하는 ref
  const observer = useRef<IntersectionObserver | null>(null);
  
  // 마지막 요소를 감지하는 콜백 함수
  const lastShowElementRef = useCallback((node: HTMLDivElement) => {
    if (loading || loadingMore) return;
    
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && currentPage < totalPages) {
        // 다음 페이지로 이동
        const nextPage = currentPage + 1;
        const params = new URLSearchParams(location.search);
        params.set("page", nextPage.toString());
        navigate(`/tv?${params.toString()}`, { replace: true });
      }
    }, { threshold: 0.5 });
    
    if (node) observer.current.observe(node);
  }, [loading, loadingMore, hasMore, currentPage, totalPages]);
  
  // contents가 변경될 때마다 allShows 업데이트
  useEffect(() => {
    if (!loading && contents.length > 0) {
      if (currentPage === 1) {
        // 첫 페이지는 기존 목록을 대체
        setAllShows(contents);
      } else {
        // 이후 페이지는 기존 목록에 추가
        setAllShows(prev => {
          // 중복 항목 제거를 위해 ID 기준으로 필터링
          const uniqueShows = contents.filter(
            newShow => !prev.some(existingShow => existingShow.id === newShow.id)
          );
          return [...prev, ...uniqueShows];
        });
      }
      setHasMore(currentPage < totalPages);
      setLoadingMore(false);
    }
  }, [contents, loading, currentPage, totalPages]);
  
  // 페이지 로드 완료 시 로딩 상태 제거
  useEffect(() => {
    if (!loading) {
      setLoadingMore(false);
    }
  }, [loading]);
  
  // 필터가 변경되면 모든 상태를 초기화
  useEffect(() => {
    // 필터 조건이 변경됐을 때(URL 파라미터가 변경됐을 때) 페이지가 1로 초기화되면
    // allShows를 비우고 hasMore를 true로 설정
    if (currentPage === 1) {
      setAllShows([]);
      setHasMore(true);
    }
  }, [selectedGenres, selectedYear, selectedSort, searchQuery, voteRange, isKoreanShow, isForeignShow, selectedNetwork]);
  
  // 검색어 입력 핸들러
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchInput(newValue);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      const params = new URLSearchParams(location.search);

      if (newValue.trim()) {
        params.set("query", newValue.trim());
      } else {
        params.delete("query");
      }

      params.delete("page");
      setAllShows([]); // 검색어 변경 시 목록 초기화
      navigate(`/tv?${params.toString()}`);
    }, 200);
  };

  // 검색 타임아웃 참조
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    navigate(`/tv?${params.toString()}`);
  };

  return (
    <div className="container mx-auto px-4 py-8 mb-16">
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:justify-between items-center mb-4">
          <h1 className="text-2xl font-bold mb-4 sm:mb-0">TV 쇼 탐색</h1>
          <div className="w-full sm:w-auto flex items-center mb-4 sm:mb-0">
            <div className="relative w-full sm:w-80">
              <input
                type="text"
                value={searchInput}
                onChange={handleSearchInputChange}
                placeholder="TV 쇼 검색..."
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

          <button
            className="sm:hidden flex items-center bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors w-full justify-center mt-2"
            onClick={() => setIsFilterVisible(!isFilterVisible)}
          >
            <FaFilter className="mr-2" />
            필터 {isFilterVisible ? "숨기기" : "보기"}
          </button>
        </div>

        {searchQuery && (
          <div className="mb-4 text-gray-600">
            "{searchQuery}" 검색 결과: {totalResults}개의 TV 쇼
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row">
        <aside
          className={`${
            isFilterVisible ? "block" : "hidden"
          } sm:block sm:w-64 mb-6 sm:mb-0 sm:mr-6`}
        >
          <FilterPanel
            genres={tvGenres}
            selectedGenres={selectedGenres}
            toggleGenre={toggleGenre}
            toggleAllGenres={toggleAllGenres}
            years={tvYears}
            selectedYear={selectedYear}
            setSelectedYear={setSelectedYear}
            sortOptions={tvSortOptions}
            selectedSort={selectedSort}
            setSelectedSort={setSelectedSort}
            voteRange={voteRange}
            setVoteRange={setVoteRange}
            isKoreanMovie={isKoreanShow}
            setIsKoreanMovie={setIsKoreanShow}
            isForeignMovie={isForeignShow}
            setIsForeignMovie={setIsForeignShow}
            networkInput={networkInput}
            setNetworkInput={handleNetworkInputChange}
            applyFilters={applyFilters}
            resetFilters={resetFilters}
            isTvShow={true}
          />
        </aside>

        <div className="flex-1">
          {loading && currentPage === 1 ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <div className="text-red-500 text-center py-8">{error}</div>
          ) : allShows.length > 0 ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {allShows.map((show, index) => {
                  if (allShows.length === index + 1) {
                    return (
                      <div ref={lastShowElementRef} key={show.id}>
                        <ContentCard content={show} />
                      </div>
                    );
                  } else {
                    return <ContentCard key={show.id} content={show} />;
                  }
                })}
              </div>
              
              {loadingMore && (
                <div className="flex justify-center items-center py-6">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              )}
              
              {!hasMore && allShows.length > 0 && (
                <div className="text-center py-6 text-gray-500">
                  모든 TV 쇼를 불러왔습니다.
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">
              {searchQuery
                ? `"${searchQuery}"에 대한 검색 결과가 없습니다.`
                : "조건에 맞는 TV 쇼가 없습니다. 다른 필터를 시도해보세요."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TvShowsPage; 