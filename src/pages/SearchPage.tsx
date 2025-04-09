import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSearch } from "../hooks/useSearch";
import ContentCard from "../components/ContentCard";
import { FaSearch } from "react-icons/fa";

const SearchPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const initialQuery = queryParams.get("q") || "";
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [currentPage, setCurrentPage] = useState(1);

  // URL의 쿼리 파라미터에서 페이지 정보를 가져옴
  useEffect(() => {
    const page = Number(queryParams.get("page")) || 1;
    setCurrentPage(page);
  }, [location.search, queryParams]);

  // 검색 훅을 사용해 결과 가져오기
  const { contents, loading, error, totalPages, totalResults } = useSearch(
    initialQuery,
    currentPage
  );

  // 검색 폼 제출 핸들러
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // 페이지를 1로 초기화하고 새 검색어로 이동
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  // 페이지 변경 핸들러
  const handlePageChange = (page: number) => {
    navigate(`/search?q=${encodeURIComponent(initialQuery)}&page=${page}`);
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

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold">컨텐츠 검색</h1>

      {/* 검색 폼 */}
      <form onSubmit={handleSubmit} className="mb-8 flex">
        <div className="relative flex-grow">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-gray-300 py-3 pl-12 pr-4 text-base focus:border-blue-500 focus:outline-none"
            placeholder="영화 또는 TV 프로그램 검색..."
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
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <span className="font-medium">필터:</span>

        {/* 장르 필터 - 실제 적용은 되지 않지만 UI만 구현 */}
        <select className="rounded-md border border-gray-300 px-3 py-2">
          <option value="">모든 장르</option>
          <option value="28">액션</option>
          <option value="12">모험</option>
          <option value="16">애니메이션</option>
          <option value="35">코미디</option>
          <option value="18">드라마</option>
        </select>

        {/* 정렬 필터 */}
        <select className="rounded-md border border-gray-300 px-3 py-2">
          <option value="popularity.desc">인기도 순</option>
          <option value="vote_average.desc">평점 순</option>
          <option value="release_date.desc">최신 순</option>
        </select>
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
              <ContentCard
                key={content.id}
                content={content}
                type={
                  content.media_type ||
                  (content.first_air_date ? "tv" : "movie")
                }
              />
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

export default SearchPage;
