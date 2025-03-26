import axios from "axios";
import {
  ContentResponse,
  ContentDetail,
  ReviewResponse,
  VideoResponse,
} from "../types/content";

// This will point to our Spring Boot backend
const BASE_URL = "http://localhost:8080/api";

// Create axios instance with timeout
const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000, // 10초 타임아웃
});

// 에러 발생 시 로그 기록을 위한 인터셉터 추가
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error("[API 오류]", {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      message: error.message,
    });
    return Promise.reject(error);
  }
);

// 빈 결과값을 반환하는 헬퍼 함수
const emptyContentResponse = (): ContentResponse => ({
  page: 1,
  results: [],
  total_pages: 0,
  total_results: 0,
});

export const backendApi = {
  // Movie endpoints
  getTrendingMovies: async (): Promise<ContentResponse> => {
    const response = await apiClient.get("/contents/trending");
    return response.data;
  },

  getTrendingAll: async (): Promise<ContentResponse> => {
    const response = await apiClient.get("/contents/trending-all");
    return response.data;
  },

  getTopRatedMovies: async (): Promise<ContentResponse> => {
    const response = await apiClient.get("/contents/top-rated");
    return response.data;
  },

  getUpcomingMovies: async (): Promise<ContentResponse> => {
    const response = await apiClient.get("/contents/upcoming");
    return response.data;
  },

  getNowPlayingMovies: async (): Promise<ContentResponse> => {
    const response = await apiClient.get("/contents/now-playing");
    return response.data;
  },

  getMovieDetails: async (id: number): Promise<ContentDetail> => {
    const response = await apiClient.get(`/contents/movie/${id}`);
    return response.data;
  },

  getMovieReviews: async (id: number): Promise<ReviewResponse> => {
    const response = await apiClient.get(`/contents/movie/${id}/reviews`);
    return response.data;
  },

  getMovieVideos: async (id: number): Promise<VideoResponse> => {
    const response = await apiClient.get(`/contents/movie/${id}/videos`);
    return response.data;
  },

  // TV 프로그램 관련 API
  getTvDetails: async (id: number): Promise<ContentDetail> => {
    const response = await apiClient.get(`/contents/tv/${id}`);
    return response.data;
  },

  getTvReviews: async (id: number): Promise<ReviewResponse> => {
    const response = await apiClient.get(`/contents/tv/${id}/reviews`);
    return response.data;
  },

  getTvVideos: async (id: number): Promise<VideoResponse> => {
    const response = await apiClient.get(`/contents/tv/${id}/videos`);
    return response.data;
  },

  // 검색 API
  searchContents: async (query: string, page = 1): Promise<ContentResponse> => {
    try {
      const response = await apiClient.get("/contents/search", {
        params: {
          query,
          page,
        },
      });
      return response.data;
    } catch (error) {
      console.error("검색 API 요청 실패:", error);
      if (axios.isAxiosError(error) && !error.response) {
        throw new Error("네트워크 연결을 확인해 주세요.");
      } else {
        throw new Error("검색 결과를 불러오는데 실패했습니다.");
      }
    }
  },

  // 필터링 API
  getFilteredMovies: async (
    genres?: number | number[],
    year?: number,
    sortBy?: string,
    page = 1,
    query?: string,
    voteAvgMin?: number,
    isKoreanMovie?: boolean,
    isForeignMovie?: boolean
  ): Promise<ContentResponse> => {
    try {
      // genres가 배열인 경우 comma-separated string으로 변환
      const genreParam = Array.isArray(genres) ? genres.join(",") : genres;

      // 요청 파라미터 정리 - 불필요한 항목 제거
      const params: Record<string, any> = {};
      if (genreParam) params.genres = genreParam;
      if (year) params.year = year;
      if (sortBy) params.sort_by = sortBy;
      if (page) params.page = page;
      if (query) params.query = query;
      if (voteAvgMin) params.voteAvgMin = voteAvgMin;
      if (isKoreanMovie) params.isKorean = isKoreanMovie;
      if (isForeignMovie) params.isForeign = isForeignMovie;

      const response = await apiClient.get("/contents/discover/movie", {
        params: params,
      });

      return response.data;
    } catch (error) {
      console.error("필터링 API 요청 실패:", error);

      if (axios.isAxiosError(error)) {
        if (error.code === "ECONNABORTED") {
          throw new Error("요청 시간이 초과되었습니다. 다시 시도해 주세요.");
        } else if (!error.response) {
          throw new Error(
            "백엔드 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해 주세요."
          );
        } else if (error.response.status === 404) {
          return emptyContentResponse();
        } else if (error.response.status >= 500) {
          throw new Error(
            "백엔드 서버에 오류가 발생했습니다. 잠시 후 다시 시도해 주세요."
          );
        }
      }

      throw new Error("영화 목록을 불러오는데 실패했습니다.");
    }
  },

  // 영화 출연진 정보 가져오기
  getMovieCredits: async (movieId: number) => {
    try {
      const response = await axios.get(
        `${TMDB_BASE_URL}/movie/${movieId}/credits`,
        {
          params: {
            api_key: TMDB_API_KEY,
            language: "ko-KR",
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching movie credits:", error);
      throw error;
    }
  },

  // TV 프로그램 출연진 정보 가져오기
  getTvCredits: async (tvId: number) => {
    try {
      const response = await axios.get(`${TMDB_BASE_URL}/tv/${tvId}/credits`, {
        params: {
          api_key: TMDB_API_KEY,
          language: "ko-KR",
        },
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching TV credits:", error);
      throw error;
    }
  },

  // User related endpoints will be added later
};
