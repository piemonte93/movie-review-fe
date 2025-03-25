import { useState, useEffect } from "react";
import { Content } from "../types/content";
import { backendApi } from "../api/backendApi";

/**
 * 단순 검색 기능을 위한 훅
 * 검색어와 페이지를 받아 검색 결과를 반환합니다.
 */
export const useSearch = (query: string, page = 1) => {
  const [contents, setContents] = useState<Content[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [totalResults, setTotalResults] = useState<number>(0);

  useEffect(() => {
    const fetchSearchResults = async () => {
      // 검색어가 없으면 검색하지 않음
      if (!query.trim()) {
        setContents([]);
        setLoading(false);
        setError(null);
        setTotalPages(0);
        setTotalResults(0);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // 실제 API 호출
        const response = await backendApi.searchContents(query, page);

        // 응답에서 컨텐츠 목록 및 페이지 정보 추출
        setContents(response.results || []);
        setTotalPages(response.total_pages || 0);
        setTotalResults(response.total_results || 0);
      } catch (err) {
        console.error("Error searching contents:", err);
        setError("검색 결과를 가져오는데 실패했습니다");
        setContents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSearchResults();
  }, [query, page]); // 검색어나 페이지가 변경되면 재검색

  return { contents, loading, error, totalPages, totalResults };
};

/**
 * 필터링된 영화 목록을 가져오는 훅
 * 필터 조건과 페이지를 받아 필터링된 결과를 반환합니다.
 */
export const useFilteredMovies = (
  genres?: number | number[],
  year?: number,
  sortBy?: string,
  page = 1,
  query?: string,
  voteAvgMin?: number,
  isKoreanMovie?: boolean,
  isForeignMovie?: boolean
) => {
  const [contents, setContents] = useState<Content[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [totalResults, setTotalResults] = useState<number>(0);

  useEffect(() => {
    const fetchFilteredMovies = async () => {
      try {
        setLoading(true);
        setError(null);

        // 빈 검색어 처리 - 빈 문자열이면 undefined로 설정
        const searchQuery = query && query.trim() ? query.trim() : undefined;

        // 실제 API 호출
        const response = await backendApi.getFilteredMovies(
          genres,
          year,
          sortBy,
          page,
          searchQuery,
          voteAvgMin,
          isKoreanMovie,
          isForeignMovie
        );

        // 응답에서 컨텐츠 목록 및 페이지 정보 추출
        setContents(response.results || []);
        setTotalPages(response.total_pages || 0);
        setTotalResults(response.total_results || 0);
      } catch (err) {
        console.error("Error fetching filtered movies:", err);
        setError("영화 목록을 가져오는데 실패했습니다");
        setContents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchFilteredMovies();
  }, [
    genres,
    year,
    sortBy,
    page,
    query,
    voteAvgMin,
    isKoreanMovie,
    isForeignMovie,
  ]); // 필터 조건이나 페이지가 변경되면 재검색

  return { contents, loading, error, totalPages, totalResults };
};
