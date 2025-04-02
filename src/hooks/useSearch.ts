import { useState, useEffect } from "react";
import { Content, TvShow } from "../types/content";
import { backendApi } from "../api/backendApi";
import axios from "axios";
import { TMDB_API_BASE_URL, TMDB_API_KEY } from "../constants";

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

export const useFilteredTvShows = (
  genres?: number[],
  year?: number,
  sortBy = "popularity.desc",
  page = 1,
  query?: string,
  voteMin?: number,
  isKorean?: boolean,
  isForeign?: boolean,
  network?: string
) => {
  const [contents, setContents] = useState<TvShow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);

  useEffect(() => {
    const fetchTvShows = async () => {
      try {
        setLoading(true);
        setError(null);

        let url = `${TMDB_API_BASE_URL}/discover/tv?api_key=${TMDB_API_KEY}&language=ko-KR&page=${page}&sort_by=${sortBy}`;

        if (genres && genres.length > 0) {
          url += `&with_genres=${genres.join(",")}`;
        }

        if (year) {
          url += `&first_air_date.gte=${year}-01-01&first_air_date.lte=${year}-12-31`;
        }

        if (voteMin) {
          url += `&vote_average.gte=${voteMin}`;
        }

        if (isKorean) {
          url += `&with_original_language=ko`;
        }

        if (isForeign) {
          url += `&with_original_language=!ko`;
        }

        // 방송사 필터 추가
        if (network) {
          // 방송사 검색을 위한 API 호출
          const networkSearchUrl = `${TMDB_API_BASE_URL}/search/company?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(network)}&page=1`;
          const networkResponse = await axios.get(networkSearchUrl);
          
          if (networkResponse.data.results && networkResponse.data.results.length > 0) {
            // 첫 번째 결과만 사용
            const networkId = networkResponse.data.results[0].id;
            url += `&with_companies=${networkId}`;
          } else {
            // 방송사가 없는 경우 빈 결과를 반환
            setContents([]);
            setTotalPages(0);
            setTotalResults(0);
            setLoading(false);
            return;
          }
        }

        const response = await axios.get(url);
        const tvShows = response.data.results.map((show: any) => ({
          id: show.id,
          title: show.name,
          overview: show.overview,
          poster_path: show.poster_path,
          backdrop_path: show.backdrop_path,
          vote_average: show.vote_average,
          release_date: show.first_air_date,
          type: "tv",
        }));

        setContents(tvShows);
        setTotalPages(Math.min(response.data.total_pages, 500));
        setTotalResults(response.data.total_results);
      } catch (err) {
        setError("TV 쇼 정보를 불러오는데 실패했습니다.");
        console.error("Error fetching TV shows:", err);
      } finally {
        setLoading(false);
      }
    };

    if (query) {
      const searchTvShows = async () => {
        try {
          setLoading(true);
          setError(null);

          const url = `${TMDB_API_BASE_URL}/search/tv?api_key=${TMDB_API_KEY}&language=ko-KR&query=${encodeURIComponent(
            query
          )}&page=${page}`;

          const response = await axios.get(url);
          const tvShows = response.data.results.map((show: any) => ({
            id: show.id,
            title: show.name,
            overview: show.overview,
            poster_path: show.poster_path,
            backdrop_path: show.backdrop_path,
            vote_average: show.vote_average,
            release_date: show.first_air_date,
            type: "tv",
          }));

          // 방송사 필터링 (검색 결과에서 방송사 필터링)
          if (network && tvShows.length > 0) {
            // 방송사 검색
            const networkSearchUrl = `${TMDB_API_BASE_URL}/search/company?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(network)}&page=1`;
            const networkResponse = await axios.get(networkSearchUrl);
            
            if (networkResponse.data.results && networkResponse.data.results.length > 0) {
              // 각 TV 쇼의 상세 정보 가져오기
              const networkId = networkResponse.data.results[0].id;
              const filteredShows = [];
              
              for (const show of tvShows) {
                const detailUrl = `${TMDB_API_BASE_URL}/tv/${show.id}?api_key=${TMDB_API_KEY}&language=ko-KR`;
                const detailResponse = await axios.get(detailUrl);
                const networks = detailResponse.data.networks || [];
                
                // 방송사 ID가 일치하면 결과에 포함
                if (networks.some((net: any) => net.id === networkId)) {
                  filteredShows.push(show);
                }
              }
              
              setContents(filteredShows);
              setTotalPages(Math.ceil(filteredShows.length / 20)); // 페이지당 20개로 가정
              setTotalResults(filteredShows.length);
            } else {
              setContents([]);
              setTotalPages(0);
              setTotalResults(0);
            }
          } else {
            setContents(tvShows);
            setTotalPages(Math.min(response.data.total_pages, 500));
            setTotalResults(response.data.total_results);
          }
        } catch (err) {
          setError("TV 쇼 검색에 실패했습니다.");
          console.error("Error searching TV shows:", err);
        } finally {
          setLoading(false);
        }
      };

      searchTvShows();
    } else {
      fetchTvShows();
    }
  }, [genres, year, sortBy, page, query, voteMin, isKorean, isForeign, network]);

  return { contents, loading, error, totalPages, totalResults };
};
