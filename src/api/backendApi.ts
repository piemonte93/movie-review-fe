import axios from "axios";
import { TMDB_API_BASE_URL, TMDB_API_KEY } from "../constants";
import {
  Content,
  ContentDetail,
  ContentResponse,
  ReviewResponse,
  VideoResponse,
} from "../types/content";
import { TvShow } from "../types/content";

// This will point to our Spring Boot backend
const BASE_URL = "http://localhost:8080";

// Create axios instance with timeout
export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000, // 15초 타임아웃
});

// 요청 인터셉터 추가
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 에러 발생 시 로그 기록을 위한 인터셉터 추가
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // 오류 상세 정보 콘솔에 출력
    console.error("[API 오류 상세]", {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message,
    });

    // 토큰 유효성 체크
    if (error.response?.status === 401 || error.response?.status === 403) {
      const token = localStorage.getItem("token");
      console.log("현재 토큰 확인:", token ? "토큰 있음" : "토큰 없음");

      if (token) {
        try {
          // 토큰 만료 시간 체크
          const payload = JSON.parse(atob(token.split(".")[1]));
          const expiration = payload.exp * 1000; // 밀리초로 변환
          const now = Date.now();

          console.log("토큰 만료 정보:", {
            현재시간: new Date(now).toLocaleString(),
            만료시간: new Date(expiration).toLocaleString(),
            만료여부: now > expiration ? "만료됨" : "유효함",
          });

          if (now > expiration) {
            console.log("토큰이 만료되었습니다. 로그아웃이 필요합니다.");
          }
        } catch (e) {
          console.error("토큰 분석 중 오류:", e);
        }
      }
    }

    // 오류 응답 구조 분석
    if (error.response?.data) {
      const errorData = error.response.data;
      if (typeof errorData === "string") {
        console.error("[API 오류 메시지]", errorData);
      } else if (typeof errorData === "object") {
        console.error("[API 오류 객체]", JSON.stringify(errorData, null, 2));
      }
    }

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

// 댓글 관련 타입 정의
export interface Comment {
  id: number;
  content: string;
  createdAt: string;
  user: {
    id: number;
    username: string;
    profileImageUrl: string | null;
  };
  likeCount: number;
  dislikeCount: number;
  liked: boolean;
  disliked: boolean;
}

// 게시글 관련 타입 정의
export interface Post {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  user: {
    id: number;
    username: string;
    profileImageUrl: string | null;
    reviewCount?: number;
  };
  comments: Comment[];
  mentions?: UserItem[];
  likeCount: number;
  dislikeCount: number;
  commentCount: number;
  liked: boolean;
  disliked: boolean;
}

// 사용자 관련 타입 정의
export interface UserItem {
  id: number;
  username: string;
  profileImageUrl: string | null;
}

// 영화 리뷰 데이터 타입 정의
export interface MovieReview {
  id: number;
  title: string;
  content: string;
  rating: number;
  movieTitle: string;
  movieId: number;
  moviePoster?: string;
  createdAt: string;
  comments: Comment[];
  likes: { userId: number }[];
  dislikes: { userId: number }[];
  isSpoiler: boolean;
  isLiked?: boolean;
  isDisliked?: boolean;
  likeCount?: number;
  dislikeCount?: number;
  commentCount?: number;
  user: {
    id: number;
    username: string;
    profileImageUrl: string | null;
    reviewCount: number;
  };
}

// 페이징 인터페이스 정의
export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

// TV 쇼 리뷰 데이터 타입 정의
export interface TvShowReview {
  id: number;
  title: string;
  content: string;
  rating: number;
  movieTitle: string;
  movieId: number;
  moviePoster?: string;
  createdAt: string;
  comments: Comment[];
  likes: { userId: number }[];
  dislikes: { userId: number }[];
  isSpoiler: boolean;
  isLiked?: boolean;
  isDisliked?: boolean;
  likeCount?: number;
  dislikeCount?: number;
  commentCount?: number;
  contentType: string;
  user: {
    id: number;
    username: string;
    profileImageUrl: string | null;
    reviewCount: number;
  };
}

// 사용자 ID로 사용자명(username) 가져오기
export const getUsernameById = async (
  userId: number | string
): Promise<string> => {
  if (!userId) return "알 수 없는 사용자";

  try {
    console.log(`사용자 ID ${userId}의 사용자명 조회 시작`);

    // 1. 로컬 스토리지에서 먼저 확인
    const userMappingStr = localStorage.getItem("user_id_mapping");
    if (userMappingStr) {
      try {
        const userMapping = JSON.parse(userMappingStr);
        if (userMapping[userId]) {
          console.log(
            `캐시된 매핑에서 사용자 ID ${userId}의 유저명 찾음:`,
            userMapping[userId]
          );
          return userMapping[userId];
        }
      } catch (e) {
        console.error("사용자 매핑 캐시 파싱 실패:", e);
      }
    }

    // 2. 프로필 API 호출
    try {
      const response = await apiClient.get(`/api/profile/id/${userId}`);

      if (response.data && response.data.username) {
        const username = response.data.username;
        console.log(`사용자 ID ${userId}의 사용자명 조회 성공:`, username);

        // 캐시에 사용자 ID-유저명 매핑 저장
        try {
          const userMappingStr =
            localStorage.getItem("user_id_mapping") || "{}";
          const userMapping: Record<string, string> =
            JSON.parse(userMappingStr);
          userMapping[String(userId)] = username;
          localStorage.setItem("user_id_mapping", JSON.stringify(userMapping));
          console.log(
            `사용자 ID ${userId}와 유저명 ${username} 매핑 캐시 저장 완료`
          );
        } catch (e) {
          console.error("사용자 매핑 캐시 업데이트 실패:", e);
        }

        return username;
      }
    } catch (apiError) {
      console.error(`/api/profile/id/${userId} API 호출 실패:`, apiError);
    }

    console.log(`사용자 ID ${userId}의 사용자명 정보 없음, 기본값 사용`);
    return `사용자${userId}`;
  } catch (error) {
    console.error(`사용자 ID ${userId}의 사용자명 조회 실패:`, error);
    return `사용자${userId}`;
  }
};

// 사용자 ID를 유저명으로 변환하는 유틸리티 함수
const getUsernameByIdInternal = async (userId: string): Promise<string> => {
  try {
    // 1. 본인 ID인지 확인 (로컬 스토리지)
    const userStr = localStorage.getItem("user");
    if (userStr) {
      const localUser = JSON.parse(userStr);
      if (localUser.id === parseInt(userId)) {
        console.log(
          "현재 로그인한 사용자의 ID. 로컬 유저명 사용:",
          localUser.username
        );
        return localUser.username;
      }
    }

    // 2. 캐싱된 사용자 매핑 확인
    const userMappingStr = localStorage.getItem("user_id_mapping");
    if (userMappingStr) {
      const userMapping = JSON.parse(userMappingStr);
      if (userMapping[userId]) {
        console.log(
          `캐싱된 매핑에서 사용자 ID ${userId}의 유저명 찾음:`,
          userMapping[userId]
        );
        return userMapping[userId];
      }
    }

    // 3. 다양한 API 시도
    // 3.1. 첫 번째 시도: 커뮤니티 API
    try {
      const communityResponse = await apiClient.get(
        `/api/community/users/${userId}/username`
      );
      if (communityResponse.data && communityResponse.data.username) {
        // 캐싱
        cacheUserIdMapping(userId, communityResponse.data.username);
        return communityResponse.data.username;
      }
    } catch (e) {
      console.error("커뮤니티 API에서 유저명 조회 실패:", e);
    }

    // 3.2. 두 번째 시도: 프로필 API
    try {
      const profileResponse = await apiClient.get(`/api/profile/id/${userId}`);
      if (profileResponse.data && profileResponse.data.username) {
        // 캐싱
        cacheUserIdMapping(userId, profileResponse.data.username);
        return profileResponse.data.username;
      }
    } catch (e) {
      console.error("프로필 API에서 유저명 조회 실패:", e);
    }

    // 4. 임시 폴백: ID 자체를 유저명으로 사용
    console.warn(
      `사용자 ID ${userId}에 대한 유저명을 찾을 수 없어 ID를 사용합니다.`
    );
    return `user${userId}`;
  } catch (error) {
    console.error(`사용자 ID ${userId}를 유저명으로 변환 실패:`, error);
    return `user${userId}`;
  }
};

// 사용자 ID - 유저명 매핑 캐싱
const cacheUserIdMapping = (userId: string, username: string) => {
  try {
    let userMapping: Record<string, string> = {};
    const userMappingStr = localStorage.getItem("user_id_mapping");

    if (userMappingStr) {
      userMapping = JSON.parse(userMappingStr);
    }

    userMapping[userId] = username;
    localStorage.setItem("user_id_mapping", JSON.stringify(userMapping));
    console.log(`사용자 ID ${userId} - 유저명 ${username} 매핑 캐싱 완료`);
  } catch (e) {
    console.error("ID-유저명 매핑 캐싱 실패:", e);
  }
};

// 사용자 상태 확인 API 함수 추가
export const checkUserStatus = async (): Promise<{ status: string }> => {
  try {
    const response = await apiClient.get("/api/users/status");
    return response.data;
  } catch (error) {
    console.error("사용자 상태 확인 실패:", error);
    throw error;
  }
};

export const backendApi = {
  // Movie endpoints
  getTrendingMovies: async (): Promise<ContentResponse> => {
    const response = await apiClient.get("/api/contents/trending");
    return response.data;
  },

  getTrendingAll: async (): Promise<ContentResponse> => {
    const response = await apiClient.get("/api/contents/trending-all");
    return response.data;
  },

  getTopRatedMovies: async (): Promise<ContentResponse> => {
    const response = await apiClient.get("/api/contents/top-rated");
    return response.data;
  },

  getUpcomingMovies: async (): Promise<ContentResponse> => {
    const response = await apiClient.get("/api/contents/upcoming");
    return response.data;
  },

  getNowPlayingMovies: async (): Promise<ContentResponse> => {
    const response = await apiClient.get("/api/contents/now-playing");
    return response.data;
  },

  getMovieDetails: async (id: number): Promise<ContentDetail> => {
    const response = await apiClient.get(`/api/contents/movie/${id}`);
    return response.data;
  },

  getMovieReviews: async (id: number): Promise<ReviewResponse> => {
    const response = await apiClient.get(`/api/contents/movie/${id}/reviews`);
    return response.data;
  },

  getMovieVideos: async (id: number): Promise<VideoResponse> => {
    const response = await apiClient.get(`/api/contents/movie/${id}/videos`);
    return response.data;
  },

  // TV 프로그램 관련 API
  getTvDetails: async (id: number): Promise<ContentDetail> => {
    const response = await apiClient.get(`/api/contents/tv/${id}`);
    return response.data;
  },

  getTvReviews: async (id: number): Promise<ReviewResponse> => {
    const response = await apiClient.get(`/api/contents/tv/${id}/reviews`);
    return response.data;
  },

  getTvVideos: async (id: number): Promise<VideoResponse> => {
    const response = await apiClient.get(`/api/contents/tv/${id}/videos`);
    return response.data;
  },

  // 검색 API
  searchContents: async (query: string, page = 1): Promise<ContentResponse> => {
    try {
      const response = await apiClient.get("/api/contents/search", {
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

      const response = await apiClient.get("/api/contents/discover/movie", {
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

  // TV 쇼 필터링 API
  getFilteredTvShows: async (
    genres?: number | number[],
    year?: number,
    sortBy?: string,
    page = 1,
    query?: string,
    voteAvgMin?: number,
    isKoreanTv?: boolean,
    isForeignTv?: boolean,
    network?: string
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
      if (voteAvgMin) params.voteMin = voteAvgMin;
      if (isKoreanTv) params.isKorean = isKoreanTv;
      if (isForeignTv) params.isForeign = isForeignTv;
      if (network) params.network = network;

      console.log("TV 쇼 필터링 API 요청 파라미터:", params);

      // 검색어가 있을 경우, 검색 API를 사용
      if (query && query.trim() !== "") {
        console.log("검색어가 있어 searchTvShowsByTitle 사용:", query);
        return await backendApi.searchTvShowsByTitle(query);
      }

      const response = await apiClient.get("/api/tv", {
        params: params,
      });

      console.log("TV 쇼 필터링 API 응답:", response.data);

      // 응답 데이터 형식이 백엔드에서 반환하는 페이지 형식인 경우 ContentResponse 형식으로 변환
      if (response.data.content && Array.isArray(response.data.content)) {
        // 백엔드에서 반환한 페이지 형식 데이터를 ContentResponse 형식으로 변환
        const result = {
          page: response.data.number + 1, // 스프링의 페이지는 0-기반, 프론트엔드는 1-기반
          results: response.data.content.map((item: any) => ({
            ...item,
            type: "tv",
            title: item.name || item.title || "제목 없음",
            release_date: item.first_air_date || item.release_date,
          })),
          total_pages: response.data.totalPages,
          total_results: response.data.totalElements,
        };

        // 결과가 비어있고 필터링이 적용된 경우 TMDB API 직접 호출
        if (result.results.length === 0 && (genres || year || voteAvgMin)) {
          console.log(
            "백엔드 필터링 결과가 비어있어 TMDB API를 직접 호출합니다."
          );
          const genreParamValue = Array.isArray(genres)
            ? genres.join(",")
            : genres;
          return await backendApi.getTmdbFilteredTvShows(
            genreParamValue,
            year,
            sortBy,
            page,
            voteAvgMin
          );
        }

        // 필터링이 없는 경우 인기 TV 쇼 가져오기
        if (result.results.length === 0 && !query && !genres && !year) {
          console.log("필터링된 결과가 비어있어 인기 TV 쇼를 가져옵니다.");
          return await backendApi.getPopularTvShows(page);
        }

        return result;
      }

      // 결과가 비어있고 필터링이 적용된 경우 TMDB API 직접 호출
      if (
        (!response.data.results || response.data.results.length === 0) &&
        (genres || year || voteAvgMin)
      ) {
        console.log(
          "백엔드 필터링 결과가 비어있어 TMDB API를 직접 호출합니다."
        );
        const genreParamValue = Array.isArray(genres)
          ? genres.join(",")
          : genres;
        return await backendApi.getTmdbFilteredTvShows(
          genreParamValue,
          year,
          sortBy,
          page,
          voteAvgMin
        );
      }

      // 결과가 비어있으면 인기 TV 쇼 가져오기
      if (
        (!response.data.results || response.data.results.length === 0) &&
        !query &&
        !genres &&
        !year
      ) {
        console.log("결과가 비어있어 인기 TV 쇼를 가져옵니다.");
        return await backendApi.getPopularTvShows(page);
      }

      return response.data;
    } catch (error) {
      console.error("TV 쇼 필터링 API 요청 실패:", error);

      if (axios.isAxiosError(error)) {
        console.error("API 오류 상세:", {
          url: error.config?.url,
          params: error.config?.params,
          status: error.response?.status,
          data: error.response?.data,
        });

        // 오류가 발생하고 필터링이 적용된 경우 TMDB API 직접 호출
        if (genres || year || voteAvgMin) {
          console.log("API 오류로 인해 TMDB API를 직접 호출합니다.");
          const genreParamValue = Array.isArray(genres)
            ? genres.join(",")
            : genres;
          return await backendApi.getTmdbFilteredTvShows(
            genreParamValue,
            year,
            sortBy,
            page,
            voteAvgMin
          );
        }

        if (error.code === "ECONNABORTED") {
          throw new Error("요청 시간이 초과되었습니다. 다시 시도해 주세요.");
        } else if (!error.response) {
          throw new Error(
            "백엔드 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해 주세요."
          );
        } else if (error.response.status === 404) {
          console.log("TV 쇼를 찾을 수 없어 인기 TV 쇼를 가져옵니다.");
          return await backendApi.getPopularTvShows(page);
        } else if (error.response.status >= 500) {
          throw new Error(
            "백엔드 서버에 오류가 발생했습니다. 잠시 후 다시 시도해 주세요."
          );
        }
      }

      // 오류 발생 시 인기 TV 쇼 가져오기
      console.log("오류로 인해 인기 TV 쇼를 가져옵니다.");
      try {
        return await backendApi.getPopularTvShows(page);
      } catch (popError) {
        console.error("인기 TV 쇼를 가져오는데 실패했습니다:", popError);
        return emptyContentResponse();
      }
    }
  },

  // TMDB API를 직접 호출하여 TV 쇼 필터링 결과를 가져오는 함수
  getTmdbFilteredTvShows: async (
    genres?: number | string,
    year?: number,
    sortBy = "popularity.desc",
    page = 1,
    voteMin?: number,
    isKorean?: boolean,
    isForeign?: boolean,
    network?: string,
    searchQuery?: string
  ): Promise<ContentResponse> => {
    try {
      // 백엔드 API를 통해 필터링된 TV 쇼 가져오기
      const url = `/api/contents/discover/tv`;

      const params: Record<string, any> = {
        page,
        sort_by: sortBy,
      };

      // 장르 파라미터 설정
      if (genres) {
        params.genres = genres;
      }

      // 연도 파라미터 설정
      if (year) {
        params.year = year;
      }

      // 최소 평점 파라미터 설정
      if (voteMin) {
        params.voteAvgMin = voteMin;
      }

      // 한국/외국 필터 설정
      if (isKorean !== undefined) {
        params.isKorean = isKorean;
      }

      if (isForeign !== undefined) {
        params.isForeign = isForeign;
      }

      // 방송사 필터 설정
      if (network) {
        params.network = network;
      }

      // 검색어 파라미터 설정
      if (searchQuery && searchQuery.trim()) {
        params.query = searchQuery.trim();
      }

      const response = await apiClient.get(url, { params });

      return response.data;
    } catch (error) {
      console.error("TV 쇼 필터링 API 요청 실패:", error);

      // 오류 발생 시 인기 TV 쇼 가져오기
      try {
        return await backendApi.getPopularTvShows(page);
      } catch (popError) {
        console.error("인기 TV 쇼를 가져오는데 실패했습니다:", popError);
        return emptyContentResponse();
      }
    }
  },

  // 인기 TV 쇼 가져오기
  getPopularTvShows: async (page = 1): Promise<ContentResponse> => {
    try {
      console.log("인기 TV 쇼 요청, 페이지:", page);
      const response = await apiClient.get("/api/tv/popular", {
        params: { page },
      });
      console.log("인기 TV 쇼 응답:", response.data);
      return response.data;
    } catch (error) {
      console.error("인기 TV 쇼 요청 실패:", error);
      return emptyContentResponse();
    }
  },

  // 영화 출연진 정보 가져오기
  getMovieCredits: async (movieId: number) => {
    try {
      const response = await apiClient.get(
        `/api/contents/movie/${movieId}/credits`
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
      const response = await apiClient.get(`/api/contents/tv/${tvId}/credits`);
      return response.data;
    } catch (error) {
      console.error("Error fetching TV credits:", error);
      throw error;
    }
  },

  // User related endpoints will be added later
  getAllMovieReviews: async (
    page = 0,
    size = 10
  ): Promise<{
    content: {
      id: number;
      username: string;
      user_profile_image_url: string | null;
      movie_id: number;
      movie_title: string;
      movie_poster_path: string | null;
      content: string;
      rating: number;
      created_at: string;
      updated_at: string | null;
    }[];
    totalElements: number;
    totalPages: number;
    currentPage: number;
    size: number;
  }> => {
    const response = await apiClient.get("/api/reviews", {
      params: { page, size, sort: "created_at,desc" },
    });
    return response.data;
  },

  // TMDB 포스터 URL 생성 함수
  getPosterUrl: (posterPath: string | null, size = "original"): string => {
    if (!posterPath) return "";
    return `https://image.tmdb.org/t/p/${size}${posterPath}`;
  },

  // 영화 제목으로 검색하는 함수
  searchMoviesByTitle: async (query: string): Promise<ContentResponse> => {
    try {
      console.log("영화 검색 요청:", query);
      const response = await apiClient.get("/api/contents/search", {
        params: {
          query,
          page: 1,
          mediaType: "movie", // 영화만 검색하도록 mediaType 파라미터 추가
          includeAdult: false, // 성인 콘텐츠 제외
        },
      });
      console.log("영화 검색 결과:", response.data);

      // 혹시 API에서 영화 이외의 결과가 포함될 경우를 대비해 추가 필터링
      if (response.data && response.data.results) {
        response.data.results = response.data.results.filter(
          (item: Content) => item.media_type === "movie" || !item.media_type
        );
      }

      return response.data;
    } catch (error) {
      console.error("영화 검색 API 요청 실패:", error);
      if (axios.isAxiosError(error) && !error.response) {
        throw new Error("네트워크 연결을 확인해 주세요.");
      } else {
        throw new Error("검색 결과를 불러오는데 실패했습니다.");
      }
    }
  },

  // TV 쇼 제목으로 검색하는 함수
  searchTvShowsByTitle: async (query: string): Promise<ContentResponse> => {
    try {
      // 빈 검색어인 경우 인기 TV 쇼 목록 반환
      if (!query || query.trim() === "") {
        console.log("검색어가 비어있어 인기 TV 쇼를 반환합니다.");
        return await backendApi.getPopularTvShows(1);
      }

      console.log("TV 쇼 검색 요청:", query);

      // 더 빠른 응답을 위해 짧은 타임아웃 설정 (2초로 줄임)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const response = await apiClient.get("/api/contents/search", {
        params: {
          query,
          page: 1,
          mediaType: "tv", // TV 쇼만 검색하도록 mediaType 파라미터 추가
          includeAdult: false, // 성인 콘텐츠 제외
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log("TV 쇼 검색 결과:", response.data);

      // 검색 결과가 있는지 확인
      if (
        response.data &&
        response.data.results &&
        response.data.results.length > 0
      ) {
        // media_type이 tv인 항목만 필터링
        const filteredResults = response.data.results.filter(
          (item: any) =>
            item.media_type === "tv" ||
            (!item.media_type && item.first_air_date) // media_type 없지만 first_air_date가 있으면 TV쇼로 간주
        );

        // 필터링된 결과가 있는지 확인
        if (filteredResults.length > 0) {
          // 모든 결과에 type과 title 필드 확실히 추가
          const tvShows = filteredResults.map((item: any) => ({
            ...item,
            media_type: "tv", // media_type 명시적 설정
            type: "tv",
            title: item.name || item.title || "제목 없음",
            // first_air_date가 없는 경우 release_date 사용
            first_air_date: item.first_air_date || item.release_date,
          }));

          return {
            ...response.data,
            results: tvShows,
          };
        }
      }

      // 검색 결과가 없거나 TV 쇼가 없으면 빈 결과 반환
      console.log("TV 쇼 검색 결과가 없습니다.");
      return {
        page: 1,
        results: [],
        total_pages: 0,
        total_results: 0,
      };
    } catch (error) {
      console.error("TV 쇼 검색 API 요청 실패:", error);

      if (error instanceof DOMException && error.name === "AbortError") {
        console.log("검색 요청 시간 초과, 빈 결과 반환");
      }

      // 모든 에러에 대해 빈 결과 반환
      console.log("오류 발생, 빈 결과 반환");
      return {
        page: 1,
        results: [],
        total_pages: 0,
        total_results: 0,
      };
    }
  },

  // 영화 리뷰 생성 함수
  createMovieReview: async (reviewData: {
    movie_id: number;
    movie_title: string;
    movie_poster_path: string | null;
    title: string;
    content: string;
    rating: number;
    is_spoiler: boolean;
  }) => {
    try {
      console.log("리뷰 작성 요청 데이터:", {
        ...reviewData,
        url: "/api/review",
      });

      const token = localStorage.getItem("token");

      // JWT 토큰 디버깅
      if (token) {
        try {
          const base64Url = token.split(".")[1];
          const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
          const payload = JSON.parse(atob(base64));
          console.log("토큰 페이로드:", payload);
          console.log(
            "토큰 만료 시간:",
            new Date(payload.exp * 1000).toLocaleString()
          );
        } catch (e) {
          console.error("토큰 파싱 실패:", e);
        }
      }

      // Axios 요청 사전 확인
      console.log("API 요청 설정:", {
        url: "/api/review",
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        data: reviewData,
      });

      const response = await apiClient.post("/api/review", reviewData);
      console.log("리뷰 생성 성공 응답:", response.data);
      return response.data;
    } catch (error) {
      console.log("===== 리뷰 생성 API 요청 실패 =====");

      // Axios 오류인 경우
      if (axios.isAxiosError(error)) {
        console.log("요청 URL:", error.config?.url);
        console.log("요청 메소드:", error.config?.method);
        console.log(
          "요청 데이터:",
          typeof error.config?.data === "string"
            ? JSON.parse(error.config?.data)
            : error.config?.data
        );
        console.log("Axios 오류 상태 코드:", error.response?.status);
        console.log("Axios 오류 상태 텍스트:", error.response?.statusText);

        // 응답이 없는 경우 (네트워크 오류 등)
        if (!error.response) {
          console.log("서버 응답 없음 (네트워크 오류)");
          throw new Error(
            "서버에 연결할 수 없습니다. 인터넷 연결을 확인해주세요."
          );
        }

        // 응답 데이터 추출 (문자열 또는 객체)
        let errorMessage: string;
        const responseData = error.response.data;

        if (typeof responseData === "string") {
          errorMessage = responseData;
          console.log("문자열 오류 응답:", errorMessage);

          // 백엔드에서 보내는 "이미 이 영화에 대한 리뷰를 작성하셨습니다. 기존 리뷰를 수정하시겠습니까?" 메시지 처리
          if (
            responseData.includes("이미 이 영화에 대한 리뷰를 작성하셨습니다")
          ) {
            throw new Error(
              "이미 이 영화에 대한 리뷰를 작성하셨습니다. 기존 리뷰를 수정하시겠습니까?"
            );
          }
        } else if (responseData && typeof responseData === "object") {
          errorMessage =
            responseData.message ||
            responseData.error ||
            JSON.stringify(responseData);
          console.log("객체 오류 응답:", responseData);

          // 객체 형태의 오류 메시지에서도 중복 리뷰 확인
          if (
            errorMessage.includes("이미 이 영화에 대한 리뷰를 작성하셨습니다")
          ) {
            throw new Error(
              "이미 이 영화에 대한 리뷰를 작성하셨습니다. 기존 리뷰를 수정하시겠습니까?"
            );
          }
        } else {
          errorMessage = "알 수 없는 오류가 발생했습니다.";
          console.log("예상치 못한 응답 형식:", responseData);
        }

        // 빈 오류 메시지 처리
        if (!errorMessage || errorMessage.trim() === "") {
          errorMessage = "서버에서 자세한 오류 메시지를 제공하지 않았습니다.";
        }

        console.log("최종 오류 메시지:", errorMessage);

        // HTTP 상태 코드별 처리
        if (error.response.status === 401) {
          throw new Error("인증이 필요합니다. 다시 로그인해주세요.");
        } else if (error.response.status === 403) {
          // 403 권한 오류일 때 명확한 메시지 전달
          if (errorMessage.includes("리뷰 작성 권한이 없습니다")) {
            throw new Error("리뷰 작성 권한이 없습니다.");
          } else if (
            errorMessage.includes("이미 이 영화에 대한 리뷰를 작성하셨습니다")
          ) {
            throw new Error(
              "이미 이 영화에 대한 리뷰를 작성하셨습니다. 기존 리뷰를 수정하시겠습니까?"
            );
          } else {
            throw new Error("접근 권한이 없습니다.");
          }
        } else if (error.response.status === 400) {
          throw new Error(`입력 데이터가 올바르지 않습니다: ${errorMessage}`);
        } else if (error.response.status === 500) {
          throw new Error(
            "서버 오류가 발생했습니다. 나중에 다시 시도해주세요."
          );
        }

        // 기본 오류 메시지 반환
        throw new Error(errorMessage);
      }

      // Axios 오류가 아닌 경우
      console.log("일반 오류:", error);
      if (error instanceof Error) {
        // 이미 Error 객체인 경우 그대로 전달
        // 중복 리뷰 문구가 포함된 경우 확인
        if (
          error.message.includes("이미 이 영화에 대한 리뷰를 작성하셨습니다")
        ) {
          throw new Error(
            "이미 이 영화에 대한 리뷰를 작성하셨습니다. 기존 리뷰를 수정하시겠습니까?"
          );
        }
        throw error;
      } else {
        throw new Error("리뷰 작성에 실패했습니다. 다시 시도해주세요.");
      }
    }
  },

  // 게시글 관련 API
  getPosts: async (
    page = 0,
    size = 10
  ): Promise<{
    content: Post[];
    totalElements: number;
    totalPages: number;
    currentPage: number;
    size: number;
  }> => {
    try {
      const response = await apiClient.get("/api/community/posts", {
        params: { page, size },
      });

      // 서버 응답 로그
      console.log("서버에서 받은 게시글 데이터:", response.data);

      // 백엔드에서 날짜 형식을 확인하기 위한 로그
      if (response.data.content && response.data.content.length > 0) {
        const firstPost = response.data.content[0];
        console.log("첫 번째 게시글 날짜 형식:", firstPost.createdAt);
        console.log(
          "첫 번째 게시글 전체 데이터:",
          JSON.stringify(firstPost, null, 2)
        );

        // 좋아요/싫어요 상태 상세 확인
        console.log(
          "백엔드 응답 첫 번째 게시글의 좋아요 수:",
          firstPost.likeCount,
          typeof firstPost.likeCount
        );
        console.log(
          "백엔드 응답 첫 번째 게시글의 싫어요 수:",
          firstPost.dislikeCount,
          typeof firstPost.dislikeCount
        );
        console.log(
          "백엔드 응답 첫 번째 게시글의 좋아요 상태:",
          firstPost.liked,
          typeof firstPost.liked
        );
        console.log(
          "백엔드 응답 첫 번째 게시글의 싫어요 상태:",
          firstPost.disliked,
          typeof firstPost.disliked
        );

        // 댓글 확인
        if (firstPost.comments && firstPost.comments.length > 0) {
          console.log(
            "첫 번째 댓글 날짜 형식:",
            firstPost.comments[0].createdAt
          );
          console.log(
            "첫 번째 댓글 전체 데이터:",
            JSON.stringify(firstPost.comments[0], null, 2)
          );

          // 댓글 좋아요/싫어요 상태 상세 확인
          console.log(
            "백엔드 응답 첫 번째 댓글의 좋아요 수:",
            firstPost.comments[0].likeCount,
            typeof firstPost.comments[0].likeCount
          );
          console.log(
            "백엔드 응답 첫 번째 댓글의 싫어요 수:",
            firstPost.comments[0].dislikeCount,
            typeof firstPost.comments[0].dislikeCount
          );
          console.log(
            "백엔드 응답 첫 번째 댓글의 좋아요 상태:",
            firstPost.comments[0].liked,
            typeof firstPost.comments[0].liked
          );
          console.log(
            "백엔드 응답 첫 번째 댓글의 싫어요 상태:",
            firstPost.comments[0].disliked,
            typeof firstPost.comments[0].disliked
          );
        }
      }

      // 게시글과 댓글의 좋아요/싫어요 수와 상태를 확인하고 처리
      if (response.data.content) {
        response.data.content = response.data.content.map((post: Post) => ({
          ...post,
          likeCount: post.likeCount ?? 0,
          dislikeCount: post.dislikeCount ?? 0,
          commentCount: post.commentCount ?? 0,
          liked: Boolean(post.liked),
          disliked: Boolean(post.disliked),
          comments:
            post.comments?.map((comment) => ({
              ...comment,
              likeCount: comment.likeCount ?? 0,
              dislikeCount: comment.dislikeCount ?? 0,
              liked: Boolean(comment.liked),
              disliked: Boolean(comment.disliked),
            })) || [],
        }));
      }

      return response.data;
    } catch (error) {
      console.error("게시글 목록 조회 실패:", error);
      throw new Error("게시글 목록을 불러오는데 실패했습니다.");
    }
  },

  createPost: async (postData: {
    title: string;
    content: string;
  }): Promise<{
    id: number;
    title: string;
    content: string;
    createdAt: string;
    user: {
      id: number;
      username: string;
      profileImageUrl: string | null;
    };
  }> => {
    try {
      const token = localStorage.getItem("token");

      console.log("현재 토큰 확인:", token ? "토큰 있음" : "토큰 없음");

      // 토큰 디코딩을 통한 디버깅 정보 추가
      if (token) {
        try {
          // JWT 토큰 디코딩 (header.payload.signature)
          const base64Url = token.split(".")[1]; // 페이로드 부분만 추출
          const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
          const payload = JSON.parse(atob(base64));

          console.log("토큰 페이로드:", payload);
          console.log("사용자 역할:", payload.roles || "역할 정보 없음");
          console.log(
            "토큰 만료 시간:",
            new Date(payload.exp * 1000).toLocaleString()
          );

          // 로컬 스토리지에 저장된 사용자 정보와 비교
          try {
            const userStr = localStorage.getItem("user");
            if (userStr) {
              const user = JSON.parse(userStr);
              console.log("로컬 스토리지 사용자 정보:", user);
              console.log("로컬 스토리지 사용자 역할:", user.roles);
            }
          } catch (e) {
            console.error("로컬 스토리지 사용자 정보 파싱 실패:", e);
          }
        } catch (e) {
          console.error("토큰 디코딩 실패:", e);
        }
      }

      console.log("게시글 작성 요청 데이터:", postData);

      // 명시적으로 헤더 설정
      const response = await apiClient.post("/api/community/posts", postData, {
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
      });

      console.log("게시글 작성 성공 응답:", response.data);
      return response.data;
    } catch (error) {
      console.error("게시글 작성 실패:", error);

      // 상세 오류 정보 로깅
      if (axios.isAxiosError(error)) {
        console.error("오류 상태 코드:", error.response?.status);
        console.error("오류 응답 데이터:", error.response?.data);

        // 403 오류 상세 분석
        if (error.response?.status === 403) {
          console.error(
            "권한 오류: 사용자가 필요한 역할이 없거나 토큰이 유효하지 않습니다."
          );
        }
      }

      throw new Error("게시글 작성에 실패했습니다.");
    }
  },

  updatePost: async (
    postId: number,
    postData: {
      title: string;
      content: string;
    }
  ): Promise<{
    id: number;
    title: string;
    content: string;
    createdAt: string;
    user: {
      id: number;
      username: string;
      profileImageUrl: string | null;
    };
  }> => {
    try {
      const response = await apiClient.put(
        `/api/community/posts/${postId}`,
        postData
      );
      return response.data;
    } catch (error) {
      console.error("게시글 수정 실패:", error);
      throw new Error("게시글 수정에 실패했습니다.");
    }
  },

  deletePost: async (postId: number): Promise<void> => {
    try {
      await apiClient.delete(`/api/community/posts/${postId}`);
    } catch (error) {
      console.error("게시글 삭제 실패:", error);
      throw new Error("게시글 삭제에 실패했습니다.");
    }
  },

  likePost: async (postId: number): Promise<Post> => {
    try {
      const response = await apiClient.post(
        `/api/community/posts/${postId}/like`
      );
      console.log("게시글 좋아요 응답:", response.data);
      console.log("게시글 좋아요 수:", response.data.likeCount);
      console.log("게시글 싫어요 수:", response.data.dislikeCount);
      console.log("게시글 좋아요 상태:", response.data.liked);

      // 응답 데이터에 likeCount/dislikeCount가 없거나 잘못된 경우 처리
      const processedResponse = {
        ...response.data,
        likeCount: response.data.likeCount ?? 0,
        dislikeCount: response.data.dislikeCount ?? 0,
        commentCount: response.data.commentCount ?? 0,
        liked: Boolean(response.data.liked),
        disliked: Boolean(response.data.disliked),
      };

      console.log("가공된 게시글 좋아요 응답:", processedResponse);
      return processedResponse;
    } catch (error) {
      console.error("게시글 좋아요 실패:", error);
      throw new Error("게시글 좋아요에 실패했습니다.");
    }
  },

  dislikePost: async (postId: number): Promise<Post> => {
    try {
      const response = await apiClient.post(
        `/api/community/posts/${postId}/dislike`
      );
      console.log("게시글 싫어요 응답:", response.data);
      console.log("게시글 좋아요 수:", response.data.likeCount);
      console.log("게시글 싫어요 수:", response.data.dislikeCount);
      console.log("게시글 싫어요 상태:", response.data.disliked);

      // 응답 데이터에 likeCount/dislikeCount가 없거나 잘못된 경우 처리
      const processedResponse = {
        ...response.data,
        likeCount: response.data.likeCount ?? 0,
        dislikeCount: response.data.dislikeCount ?? 0,
        commentCount: response.data.commentCount ?? 0,
        liked: Boolean(response.data.liked),
        disliked: Boolean(response.data.disliked),
      };

      console.log("가공된 게시글 싫어요 응답:", processedResponse);
      return processedResponse;
    } catch (error) {
      console.error("게시글 싫어요 실패:", error);
      throw new Error("게시글 싫어요에 실패했습니다.");
    }
  },

  searchPosts: async (
    query: string,
    category = "title",
    page = 0,
    size = 10
  ): Promise<{
    content: Post[];
    totalElements: number;
    totalPages: number;
    currentPage: number;
    size: number;
  }> => {
    try {
      const response = await apiClient.get("/api/community/posts/search", {
        params: { query, category, page, size },
      });
      return response.data;
    } catch (error) {
      console.error("게시글 검색 실패:", error);
      throw new Error("게시글 검색에 실패했습니다.");
    }
  },

  // 댓글 작성
  createComment: async (postId: number, content: string): Promise<Comment> => {
    try {
      const response = await apiClient.post(
        `/api/community/posts/${postId}/comments`,
        { content }
      );
      console.log("생성된 댓글의 날짜 형식:", response.data.createdAt);

      // 날짜 필드 확인 및 처리
      const commentData = response.data;
      if (!commentData.createdAt || commentData.createdAt === "") {
        console.warn("댓글 생성 응답에 createdAt 필드가 없거나 비어 있습니다.");
        // 현재 시간으로 기본값 설정
        commentData.createdAt = new Date().toISOString();
      }

      return commentData;
    } catch (error) {
      console.error("댓글 작성 실패:", error);
      throw error;
    }
  },

  // 게시글 댓글 가져오기
  getComments: async (postId: number): Promise<Comment[]> => {
    try {
      console.log(`게시글 ID ${postId}의 댓글 목록 가져오기 요청`);
      const response = await apiClient.get(
        `/api/community/posts/${postId}/comments`
      );
      console.log(`게시글 ID ${postId}의 댓글 목록 응답:`, response.data);

      // 각 댓글의 좋아요/싫어요 상태와 개수를 상세 로깅
      response.data.forEach((comment: any, index: number) => {
        console.log(`댓글 ${index + 1} (ID: ${comment.id})의 상세 정보:`);
        console.log(`- 내용: ${comment.content}`);
        console.log(
          `- 좋아요 수: ${comment.likeCount} (타입: ${typeof comment.likeCount})`
        );
        console.log(
          `- 싫어요 수: ${comment.dislikeCount} (타입: ${typeof comment.dislikeCount})`
        );
        console.log(
          `- 좋아요 상태: ${comment.liked} (타입: ${typeof comment.liked})`
        );
        console.log(
          `- 싫어요 상태: ${comment.disliked} (타입: ${typeof comment.disliked})`
        );
      });

      // 댓글 데이터 가공: 좋아요/싫어요 수 확인 및 숫자로 변환
      const processedComments = response.data.map((comment: any) => ({
        ...comment,
        likeCount:
          typeof comment.likeCount === "number" ? comment.likeCount : 0,
        dislikeCount:
          typeof comment.dislikeCount === "number" ? comment.dislikeCount : 0,
        liked: Boolean(comment.liked),
        disliked: Boolean(comment.disliked),
      }));

      console.log(`가공된 댓글 데이터:`, processedComments);
      return processedComments;
    } catch (error) {
      console.error(`게시글 ID ${postId}의 댓글 목록 가져오기 실패:`, error);
      throw error;
    }
  },

  // 댓글 좋아요
  likeComment: async (
    commentId: number
  ): Promise<{
    id: number;
    content: string;
    createdAt: string;
    postId: number;
    user: {
      id: number;
      username: string;
      profileImageUrl: string | null;
    };
    likeCount: number;
    dislikeCount: number;
    liked: boolean;
    disliked: boolean;
  }> => {
    try {
      console.log(`댓글 ID ${commentId} 좋아요 요청`);
      const response = await apiClient.post(
        `/api/community/comments/${commentId}/like`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      console.log("댓글 좋아요 응답:", response.data);
      console.log("댓글 좋아요 수:", response.data.likeCount);
      console.log("댓글 싫어요 수:", response.data.dislikeCount);
      console.log("댓글 좋아요 상태:", response.data.liked);
      console.log("댓글 싫어요 상태:", response.data.disliked);

      // 응답 데이터에 likeCount/dislikeCount가 없는 경우 0으로 설정
      const processedResponse = {
        ...response.data,
        likeCount: response.data.likeCount || 0,
        dislikeCount: response.data.dislikeCount || 0,
      };

      return processedResponse;
    } catch (error) {
      console.error("댓글 좋아요 실패:", error);
      throw error;
    }
  },

  // 댓글 싫어요
  dislikeComment: async (
    commentId: number
  ): Promise<{
    id: number;
    content: string;
    createdAt: string;
    postId: number;
    user: {
      id: number;
      username: string;
      profileImageUrl: string | null;
    };
    likeCount: number;
    dislikeCount: number;
    liked: boolean;
    disliked: boolean;
  }> => {
    try {
      console.log(`댓글 ID ${commentId} 싫어요 요청`);
      const response = await apiClient.post(
        `/api/community/comments/${commentId}/dislike`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      console.log("댓글 싫어요 응답:", response.data);
      console.log("댓글 좋아요 수:", response.data.likeCount);
      console.log("댓글 싫어요 수:", response.data.dislikeCount);
      console.log("댓글 좋아요 상태:", response.data.liked);
      console.log("댓글 싫어요 상태:", response.data.disliked);

      // 응답 데이터에 likeCount/dislikeCount가 없는 경우 0으로 설정
      const processedResponse = {
        ...response.data,
        likeCount: response.data.likeCount || 0,
        dislikeCount: response.data.dislikeCount || 0,
      };

      return processedResponse;
    } catch (error) {
      console.error("댓글 싫어요 실패:", error);
      throw error;
    }
  },

  // 댓글 삭제
  deleteComment: async (commentId: number): Promise<void> => {
    try {
      console.log(`댓글 삭제 요청: commentId=${commentId}`);
      console.log(`요청 URL: /api/community/comments/${commentId}`);

      const token = localStorage.getItem("token");
      console.log("인증 토큰:", token ? "토큰 있음" : "토큰 없음");

      // 요청 시작 시간 기록
      const startTime = new Date().getTime();

      // API 호출
      const response = await apiClient.delete(
        `/api/community/comments/${commentId}`
      );

      // 응답 시간 계산
      const endTime = new Date().getTime();
      const responseTime = endTime - startTime;

      console.log(`댓글 삭제 응답 시간: ${responseTime}ms`);
      console.log("댓글 삭제 응답 상세:", {
        status: response.status,
        statusText: response.statusText,
        data: response.data,
      });

      console.log("댓글 삭제 성공");
    } catch (error) {
      console.error("댓글 삭제 실패:", error);
      if (axios.isAxiosError(error)) {
        console.error("API 호출 오류 상세:", {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          message: error.message,
        });
      }
      throw new Error("댓글 삭제에 실패했습니다.");
    }
  },

  // 사용자 검색
  searchUsers: async (query: string): Promise<UserItem[]> => {
    try {
      const response = await apiClient.get("/api/users/search", {
        params: { query },
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      return response.data;
    } catch (error) {
      console.error("사용자 검색 실패:", error);
      throw error;
    }
  },

  // 리뷰 관련 API
  getReviews: async (page = 0, size = 10, sort = "created_at,desc") => {
    try {
      console.log(`리뷰 데이터 요청: page=${page}, size=${size}, sort=${sort}`);
      const response = await apiClient.get("/api/reviews", {
        params: {
          page,
          size,
          sort,
        },
      });

      console.log("리뷰 API 응답 코드:", response.status);
      console.log("리뷰 API 응답 헤더:", response.headers);

      // 응답 데이터 구조 로깅
      const responseData = response.data;
      console.log("리뷰 응답 데이터 키:", Object.keys(responseData));

      if (responseData.content) {
        console.log(`리뷰 데이터 ${responseData.content.length}개 수신 성공`);
        // 첫 번째 리뷰의 데이터 구조 샘플로 확인
        if (responseData.content.length > 0) {
          console.log("첫 번째 리뷰 샘플:", {
            id: responseData.content[0].id,
            title: responseData.content[0].title,
            username: responseData.content[0].username,
            isLiked: responseData.content[0].isLiked,
            isDisliked: responseData.content[0].isDisliked,
            likeCount: responseData.content[0].likeCount,
            dislikeCount: responseData.content[0].dislikeCount,
          });
        }
      } else {
        console.log("리뷰 데이터가 없거나 content 배열이 없습니다");
      }

      return responseData;
    } catch (error) {
      console.error("리뷰 목록 가져오기 실패:", error);
      if (axios.isAxiosError(error)) {
        console.error("API 호출 오류 상세:", {
          status: error.response?.status,
          data: error.response?.data,
          url: error.config?.url,
          method: error.config?.method,
        });
      }
      throw error;
    }
  },

  getReviewComments: async (reviewId: number, page = 0, size = 10) => {
    try {
      console.log(
        `리뷰 ID ${reviewId}의 댓글 목록 요청: 페이지=${page}, 사이즈=${size}`
      );

      const response = await apiClient.get(
        `/api/reviews/${reviewId}/comments`,
        {
          params: {
            page,
            size,
          },
        }
      );

      // 응답 데이터 로깅
      console.log(`리뷰 ID ${reviewId}의 댓글 응답 데이터:`, response.data);

      // 댓글 날짜 처리
      if (response.data.content) {
        response.data.content = response.data.content.map((comment: any) => {
          // 날짜 필드 확인 (createdAt 또는 created_at)
          const dateField = comment.createdAt || comment.created_at;

          // created_at 필드 처리
          if (
            !dateField ||
            (typeof dateField === "string" && dateField.trim() === "")
          ) {
            console.warn(
              `댓글 ID ${comment.id}의 날짜가 비어있습니다. 현재 시간으로 설정합니다.`
            );
            comment.created_at = new Date().toISOString();
          } else {
            try {
              // 서버로부터 온 LocalDateTime 문자열 처리 (2023-04-03T15:30:45)
              const localDateTimeRegex =
                /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/;
              if (
                typeof dateField === "string" &&
                localDateTimeRegex.test(dateField)
              ) {
                // 중요: 서버에서 보낸 시간은 이미 KST(한국시간)이지만 타임존 정보가 없음
                // 올바른 방식: 한국 타임존(+09:00)을 추가
                const isoDate = new Date(dateField + "+09:00").toISOString();
                comment.created_at = isoDate;
                console.log(
                  `날짜 형식 변환 완료 (댓글 ID: ${comment.id}):`,
                  comment.created_at
                );
              } else if (typeof dateField === "string") {
                // 다른 형식의 날짜는 그대로 사용
                comment.created_at = dateField;
              }

              // 날짜 형식 검증만 수행 (미래 날짜 검증 제거)
              const testDate = new Date(comment.created_at);
              if (isNaN(testDate.getTime())) {
                console.warn(
                  `댓글 ID ${comment.id}의 날짜 형식이 잘못되었습니다:`,
                  comment.created_at
                );
                comment.created_at = new Date().toISOString();
              }
            } catch (error) {
              console.error(
                `댓글 ID ${comment.id}의 날짜 처리 중 오류:`,
                error
              );
              comment.created_at = new Date().toISOString();
            }
          }
          return comment;
        });
      }

      console.log(`리뷰 ID ${reviewId}의 댓글 데이터 처리 완료`);
      return response.data;
    } catch (error) {
      console.error(`리뷰 ID ${reviewId}의 댓글 목록 가져오기 실패:`, error);
      throw error;
    }
  },

  addReviewComment: async (reviewId: number, content: string) => {
    try {
      console.log(`리뷰 ID ${reviewId}에 댓글 작성: "${content}"`);

      const response = await apiClient.post(
        `/api/reviews/${reviewId}/comments`,
        {
          content,
        }
      );

      console.log("새 댓글 생성 응답 데이터:", response.data);

      // 반환된 댓글 데이터 처리
      const commentData = response.data;

      // 날짜 필드 확인 (createdAt 또는 created_at)
      const dateField = commentData.createdAt || commentData.created_at;

      if (
        !dateField ||
        (typeof dateField === "string" && dateField.trim() === "")
      ) {
        console.warn("리뷰 댓글 생성 응답에 날짜 필드가 없거나 비어 있습니다.");
        // 현재 시간으로 기본값 설정
        commentData.createdAt = new Date().toISOString();
      } else if (typeof dateField === "string") {
        // 날짜 문자열 처리
        try {
          // 서버로부터 온 LocalDateTime 문자열 처리 (2023-04-03T15:30:45)
          const localDateTimeRegex =
            /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/;
          if (localDateTimeRegex.test(dateField)) {
            // 중요: 서버에서 보낸 시간은 이미 KST(한국시간)이지만 타임존 정보가 없음
            // 올바른 방식: 한국 타임존(+09:00)을 추가
            commentData.createdAt = new Date(
              dateField + "+09:00"
            ).toISOString();
            console.log("날짜 형식 변환 완료:", commentData.createdAt);
          } else {
            // 그 외 형식은 그대로 사용
            commentData.createdAt = dateField;
          }

          // 날짜 유효성 검사
          const testDate = new Date(commentData.createdAt);
          if (isNaN(testDate.getTime())) {
            throw new Error("유효하지 않은 날짜 형식");
          }
        } catch (error) {
          console.warn("날짜 변환 오류, 현재 시간으로 설정:", error);
          commentData.createdAt = new Date().toISOString();
        }
      }

      return commentData;
    } catch (error) {
      console.error("리뷰 댓글 작성 실패:", error);
      throw error;
    }
  },

  updateReviewComment: async (
    reviewId: number,
    commentId: number,
    content: string
  ) => {
    const response = await apiClient.put(
      `/api/reviews/${reviewId}/comments/${commentId}`,
      {
        content,
      }
    );
    return response.data;
  },

  deleteReviewComment: async (reviewId: number, commentId: number) => {
    try {
      console.log(
        `댓글 삭제 요청: reviewId=${reviewId}, commentId=${commentId}`
      );
      console.log(`요청 URL: /api/reviews/${reviewId}/comments/${commentId}`);

      const token = localStorage.getItem("token");
      console.log("인증 토큰:", token ? "토큰 있음" : "토큰 없음");

      // 요청 시작 시간 기록
      const startTime = new Date().getTime();

      // API 호출
      const response = await apiClient.delete(
        `/api/reviews/${reviewId}/comments/${commentId}`
      );

      // 응답 시간 계산
      const endTime = new Date().getTime();
      const responseTime = endTime - startTime;

      console.log(`댓글 삭제 응답 시간: ${responseTime}ms`);
      console.log("댓글 삭제 응답 상세:", {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data: response.data,
      });

      // 백엔드로부터 업데이트된 리뷰 정보 가져오기
      console.log(`해당 리뷰(ID: ${reviewId})의 최신 정보 가져오기 시도`);
      try {
        const reviewResponse = await apiClient.get(`/api/reviews/${reviewId}`);
        console.log("리뷰 업데이트 정보:", reviewResponse.data);
        return {
          success: true,
          message: "댓글이 성공적으로 삭제되었습니다.",
          updatedReview: reviewResponse.data,
        };
      } catch (reviewError) {
        console.log("리뷰 정보 가져오기 실패, 기본 성공 응답 반환");
        return {
          success: true,
          message: "댓글이 삭제되었지만 리뷰 정보를 가져오지 못했습니다.",
        };
      }
    } catch (error) {
      console.error("댓글 삭제 API 호출 실패:", error);
      if (axios.isAxiosError(error)) {
        console.error("Axios 에러 상세:", {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          message: error.message,
        });

        const errorMessage =
          error.response?.data?.message || "댓글 삭제에 실패했습니다.";
        throw new Error(errorMessage);
      }
      throw error;
    }
  },

  likeReviewComment: async (reviewId: number, commentId: number) => {
    const response = await apiClient.post(
      `/api/reviews/${reviewId}/comments/${commentId}/like`
    );
    return response.data;
  },

  dislikeReviewComment: async (reviewId: number, commentId: number) => {
    const response = await apiClient.post(
      `/api/reviews/${reviewId}/comments/${commentId}/dislike`
    );
    return response.data;
  },

  // 리뷰 좋아요/싫어요 API
  likeReview: async (reviewId: number) => {
    const response = await apiClient.post(`/api/reviews/${reviewId}/like`);
    return response.data;
  },

  dislikeReview: async (reviewId: number) => {
    const response = await apiClient.post(`/api/reviews/${reviewId}/dislike`);
    return response.data;
  },

  // 영화 리뷰 삭제
  deleteMovieReview: async (reviewId: number): Promise<void> => {
    try {
      await apiClient.delete(`/api/reviews/${reviewId}`);
    } catch (error) {
      console.error("리뷰 삭제 실패:", error);
      throw error;
    }
  },

  // 영화 리뷰 수정
  updateMovieReview: async (
    reviewId: number,
    reviewData: {
      title: string;
      content: string;
      rating: number;
      is_spoiler: boolean;
      movie_id?: number;
      movie_title?: string;
      movie_poster_path?: string;
    }
  ): Promise<void> => {
    try {
      console.log("리뷰 수정 데이터:", reviewData);
      await apiClient.put(`/api/reviews/${reviewId}`, reviewData);
    } catch (error) {
      console.error("리뷰 수정 실패:", error);
      throw error;
    }
  },

  // 사용자가 특정 영화에 대해 작성한 리뷰가 있는지 확인
  checkUserReviewForMovie: async (movieId: number): Promise<boolean> => {
    try {
      const response = await apiClient.get(`/api/reviews/check`, {
        params: { movie_id: movieId },
      });
      return response.data.exists;
    } catch (error) {
      console.error("리뷰 확인 실패:", error);
      return false;
    }
  },

  // 영화 리뷰 제목 직접 수정 (타이틀만 업데이트)
  updateReviewTitle: async (reviewId: number, title: string): Promise<void> => {
    try {
      console.log("리뷰 제목 수정 데이터:", { title });
      await apiClient.put(`/api/reviews/${reviewId}/title`, { title });
    } catch (error) {
      console.error("리뷰 제목 수정 실패:", error);
      throw error;
    }
  },

  getUserPosts: async (
    userId: number,
    page = 0,
    size = 10
  ): Promise<{
    content: Post[];
    totalPages: number;
    totalElements: number;
  }> => {
    try {
      const response = await apiClient.get(
        `/api/community/posts/user/${userId}`,
        {
          params: { page, size },
        }
      );
      return response.data;
    } catch (error) {
      console.error("사용자 게시물 조회 실패:", error);
      throw new Error("사용자 게시물을 불러오는데 실패했습니다.");
    }
  },

  // 사용자의 리뷰 목록을 가져오는 함수
  getUserReviews: async (username: string, page = 0, size = 10) => {
    try {
      console.log(
        `사용자 리뷰 데이터 요청: username=${username}, page=${page}, size=${size}`
      );

      // contentType 파라미터 추가하여 movie 타입의 리뷰만 가져오도록 수정
      const response = await apiClient.get(`/api/profile/${username}/reviews`, {
        params: {
          page,
          size,
          contentType: "movie", // 영화 리뷰만 가져오기
        },
      });

      console.log("사용자 리뷰 API 응답 코드:", response.status);
      console.log("사용자 리뷰 API 응답 헤더:", response.headers);

      // 응답 데이터 구조 로깅
      const responseData = response.data;
      console.log("사용자 리뷰 응답 데이터 키:", Object.keys(responseData));

      if (responseData.content) {
        console.log(
          `사용자 리뷰 데이터 ${responseData.content.length}개 수신 성공`
        );
        // 첫 번째 리뷰의 데이터 구조 샘플로 확인
        if (responseData.content.length > 0) {
          console.log("첫 번째 리뷰 샘플:", {
            id: responseData.content[0].id,
            title: responseData.content[0].title,
            username: responseData.content[0].username,
            contentType: responseData.content[0].contentType || "movie",
          });
        }

        // 추가 검증으로 데이터 필터링
        const filteredContent = responseData.content.filter(
          (review: any) => review.contentType === "movie"
        );

        // 필터링 결과 로깅
        if (filteredContent.length !== responseData.content.length) {
          console.log(
            `필터링: ${responseData.content.length}개 → ${filteredContent.length}개 영화 리뷰`
          );
        }

        // 필터링된 결과로 교체
        responseData.content = filteredContent;
      } else {
        console.log("사용자 리뷰 데이터가 없거나 content 배열이 없습니다");
      }

      return responseData;
    } catch (error) {
      console.error("사용자 리뷰 목록 가져오기 실패:", error);
      if (axios.isAxiosError(error)) {
        console.error("API 호출 오류 상세:", {
          status: error.response?.status,
          data: error.response?.data,
          url: error.config?.url,
          method: error.config?.method,
        });
      }
      throw error;
    }
  },

  // TV 쇼 리뷰 생성 함수
  createTvReview: async (reviewData: {
    movie_id: number;
    movie_title: string;
    movie_poster_path: string | null;
    title: string;
    content: string;
    rating: number;
    is_spoiler: boolean;
  }) => {
    try {
      console.log("TV 쇼 리뷰 작성 요청 데이터:", {
        ...reviewData,
        url: "/api/tvreview", // '/api/tvreviews'에서 '/api/tvreview'로 변경
      });

      const token = localStorage.getItem("token");

      // JWT 토큰 디버깅
      if (token) {
        try {
          const base64Url = token.split(".")[1];
          const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
          const payload = JSON.parse(atob(base64));
          console.log("토큰 페이로드:", payload);
          console.log(
            "토큰 만료 시간:",
            new Date(payload.exp * 1000).toLocaleString()
          );
        } catch (e) {
          console.error("토큰 파싱 실패:", e);
        }
      }

      // Axios 요청 사전 확인
      console.log("API 요청 설정:", {
        url: "/api/tvreview", // '/api/tvreviews'에서 '/api/tvreview'로 변경
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        data: reviewData,
      });

      const response = await apiClient.post("/api/tvreview", reviewData); // '/api/tvreviews'에서 '/api/tvreview'로 변경
      console.log("TV 쇼 리뷰 생성 성공 응답:", response.data);
      return response.data;
    } catch (error) {
      console.log("===== TV 쇼 리뷰 생성 API 요청 실패 =====");

      // Axios 오류인 경우
      if (axios.isAxiosError(error)) {
        console.log("요청 URL:", error.config?.url);
        console.log("요청 메소드:", error.config?.method);
        console.log(
          "요청 데이터:",
          typeof error.config?.data === "string"
            ? JSON.parse(error.config?.data)
            : error.config?.data
        );
        console.log("Axios 오류 상태 코드:", error.response?.status);
        console.log("Axios 오류 상태 텍스트:", error.response?.statusText);

        // 응답이 없는 경우 (네트워크 오류 등)
        if (!error.response) {
          console.log("서버 응답 없음 (네트워크 오류)");
          throw new Error(
            "서버에 연결할 수 없습니다. 인터넷 연결을 확인해주세요."
          );
        }

        // 응답 데이터 추출 (문자열 또는 객체)
        let errorMessage: string;
        const responseData = error.response.data;

        if (typeof responseData === "string") {
          errorMessage = responseData;
          console.log("문자열 오류 응답:", errorMessage);

          // 백엔드에서 보내는 "이미 이 TV 프로그램에 대한 리뷰를 작성하셨습니다. 기존 리뷰를 수정하시겠습니까?" 메시지 처리
          if (
            responseData.includes(
              "이미 이 TV 프로그램에 대한 리뷰를 작성하셨습니다"
            )
          ) {
            throw new Error(
              "이미 이 TV 프로그램에 대한 리뷰를 작성하셨습니다. 기존 리뷰를 수정하시겠습니까?"
            );
          }
        } else if (responseData && typeof responseData === "object") {
          errorMessage =
            responseData.message ||
            responseData.error ||
            JSON.stringify(responseData);
          console.log("객체 오류 응답:", responseData);

          // 객체 형태의 오류 메시지에서도 중복 리뷰 확인
          if (
            errorMessage.includes(
              "이미 이 TV 프로그램에 대한 리뷰를 작성하셨습니다"
            )
          ) {
            throw new Error(
              "이미 이 TV 프로그램에 대한 리뷰를 작성하셨습니다. 기존 리뷰를 수정하시겠습니까?"
            );
          }
        } else {
          errorMessage = "알 수 없는 오류가 발생했습니다.";
          console.log("예상치 못한 응답 형식:", responseData);
        }

        // 빈 오류 메시지 처리
        if (!errorMessage || errorMessage.trim() === "") {
          errorMessage = "서버에서 자세한 오류 메시지를 제공하지 않았습니다.";
        }

        console.log("최종 오류 메시지:", errorMessage);

        // HTTP 상태 코드별 처리
        if (error.response.status === 401) {
          throw new Error("인증이 필요합니다. 다시 로그인해주세요.");
        } else if (error.response.status === 403) {
          // 403 권한 오류일 때 명확한 메시지 전달
          if (errorMessage.includes("리뷰 작성 권한이 없습니다")) {
            throw new Error("리뷰 작성 권한이 없습니다.");
          } else if (
            errorMessage.includes(
              "이미 이 TV 프로그램에 대한 리뷰를 작성하셨습니다"
            )
          ) {
            throw new Error(
              "이미 이 TV 프로그램에 대한 리뷰를 작성하셨습니다. 기존 리뷰를 수정하시겠습니까?"
            );
          } else {
            throw new Error("접근 권한이 없습니다.");
          }
        } else if (error.response.status === 400) {
          throw new Error(`입력 데이터가 올바르지 않습니다: ${errorMessage}`);
        } else if (error.response.status === 500) {
          throw new Error(
            "서버 오류가 발생했습니다. 나중에 다시 시도해주세요."
          );
        }

        // 기본 오류 메시지 반환
        throw new Error(errorMessage);
      }

      // Axios 오류가 아닌 경우
      console.log("일반 오류:", error);
      if (error instanceof Error) {
        // 이미 Error 객체인 경우 그대로 전달
        // 중복 리뷰 문구가 포함된 경우 확인
        if (
          error.message.includes(
            "이미 이 TV 프로그램에 대한 리뷰를 작성하셨습니다"
          )
        ) {
          throw new Error(
            "이미 이 TV 프로그램에 대한 리뷰를 작성하셨습니다. 기존 리뷰를 수정하시겠습니까?"
          );
        }
        throw error;
      } else {
        throw new Error("리뷰 작성에 실패했습니다. 다시 시도해주세요.");
      }
    }
  },

  // TV 쇼 리뷰 수정
  updateTvReview: async (
    reviewId: number,
    reviewData: {
      title: string;
      content: string;
      rating: number;
      is_spoiler: boolean;
      movie_id?: number;
      movie_title?: string;
      movie_poster_path?: string;
    }
  ): Promise<void> => {
    try {
      console.log("===== TV 쇼 리뷰 수정 요청 시작 =====");
      console.log(`리뷰 ID ${reviewId} 수정 데이터:`, reviewData);

      // 토큰 및 인증 정보 확인
      const token = localStorage.getItem("token");
      if (token) {
        console.log("인증 토큰 존재함");
        try {
          const base64Url = token.split(".")[1];
          const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
          const payload = JSON.parse(atob(base64));
          console.log("토큰 페이로드:", payload);
          console.log(
            "토큰 만료 시간:",
            new Date(payload.exp * 1000).toLocaleString()
          );
        } catch (e) {
          console.error("토큰 파싱 실패:", e);
        }
      } else {
        console.warn("인증 토큰이 없습니다!");
      }

      // API 요청 상세 로깅
      console.log(`API 요청 URL: /api/tvreviews/${reviewId}`);
      console.log("API 요청 메소드: PUT");
      console.log("API 요청 헤더:", {
        Authorization: token ? `Bearer ${token}` : "없음",
        "Content-Type": "application/json",
      });

      const response = await apiClient.put(
        `/api/tvreviews/${reviewId}`,
        reviewData
      );
      console.log(
        "TV 쇼 리뷰 수정 성공 응답:",
        response.status,
        response.statusText
      );
      console.log("응답 데이터:", response.data);
      return response.data;
    } catch (error) {
      console.error("===== TV 쇼 리뷰 수정 실패 =====");

      if (axios.isAxiosError(error)) {
        console.error("요청 URL:", error.config?.url);
        console.error("요청 메소드:", error.config?.method);
        console.error(
          "요청 데이터:",
          error.config?.data ? JSON.parse(error.config?.data) : {}
        );
        console.error("응답 상태:", error.response?.status);
        console.error("응답 메시지:", error.response?.statusText);

        if (error.response?.status === 403) {
          throw new Error("권한이 없거나 로그인이 필요합니다.");
        } else if (error.response?.status === 404) {
          throw new Error("수정할 리뷰를 찾을 수 없습니다.");
        }
      }

      console.error("TV 쇼 리뷰 수정 실패:", error);
      throw error;
    }
  },

  // 사용자가 특정 TV 쇼에 대해 작성한 리뷰가 있는지 확인
  checkUserReviewForTv: async (tvId: number): Promise<boolean> => {
    try {
      const response = await apiClient.get(`/api/tvreviews/check`, {
        params: { tv_id: tvId },
      });
      return response.data.exists;
    } catch (error) {
      console.error("TV 쇼 리뷰 확인 실패:", error);
      return false;
    }
  },

  // TV 쇼 리뷰 목록 가져오기
  getAllTvReviews: async (
    page = 0,
    size = 10
  ): Promise<{
    content: TvShowReview[];
    totalElements: number;
    totalPages: number;
    currentPage: number;
    size: number;
  }> => {
    try {
      console.log(`TV 쇼 리뷰 데이터 요청: page=${page}, size=${size}`);
      const response = await apiClient.get("/api/tvreviews", {
        params: {
          page,
          size,
          sort: "created_at,desc",
        },
      });

      console.log("TV 쇼 리뷰 API 응답 코드:", response.status);
      console.log("TV 쇼 리뷰 API 응답 헤더:", response.headers);

      // 응답 데이터 구조 로깅
      const responseData = response.data;
      console.log("TV 쇼 리뷰 응답 데이터 키:", Object.keys(responseData));

      if (responseData.content) {
        console.log(
          `TV 쇼 리뷰 데이터 ${responseData.content.length}개 수신 성공`
        );
        // 첫 번째 리뷰의 데이터 구조 샘플로 확인
        if (responseData.content.length > 0) {
          console.log("첫 번째 TV 쇼 리뷰 샘플:", {
            id: responseData.content[0].id,
            title: responseData.content[0].title,
            username: responseData.content[0].username,
            contentType: responseData.content[0].contentType || "tv",
            isLiked: responseData.content[0].isLiked,
            isDisliked: responseData.content[0].isDisliked,
            likeCount: responseData.content[0].likeCount,
            dislikeCount: responseData.content[0].dislikeCount,
          });
        }
      } else {
        console.log("TV 쇼 리뷰 데이터가 없거나 content 배열이 없습니다");
      }

      return responseData;
    } catch (error) {
      console.error("TV 쇼 리뷰 목록 가져오기 실패:", error);
      if (axios.isAxiosError(error)) {
        console.error("API 호출 오류 상세:", {
          status: error.response?.status,
          data: error.response?.data,
          url: error.config?.url,
          method: error.config?.method,
        });
      }
      throw error;
    }
  },

  // TV 쇼 ID로 리뷰 조회
  getReviewsByTvId: async (
    tvId: number,
    page = 0,
    size = 10
  ): Promise<Page<TvShowReview>> => {
    try {
      const response = await apiClient.get(`/api/tvreviews/tv/${tvId}`, {
        params: { page, size },
      });
      return response.data;
    } catch (error) {
      console.error(`TV 쇼 ID ${tvId}의 리뷰 조회 실패:`, error);
      throw error;
    }
  },

  // 사용자의 TV 쇼 리뷰 목록 조회
  getUserTvReviews: async (
    username: string,
    page = 0,
    size = 10
  ): Promise<Page<TvShowReview>> => {
    try {
      const response = await apiClient.get(`/api/tvreviews/user/${username}`, {
        params: { page, size },
      });
      return response.data;
    } catch (error) {
      console.error(`사용자 ${username}의 TV 쇼 리뷰 조회 실패:`, error);
      throw error;
    }
  },

  // TV 쇼 리뷰 삭제
  deleteTvReview: async (reviewId: number): Promise<void> => {
    try {
      const response = await apiClient.delete(`/api/tv-reviews/${reviewId}`);
      console.log("TV 쇼 리뷰 삭제 성공:", response.status);
    } catch (error) {
      console.error("TV 쇼 리뷰 삭제 실패:", error);
      throw error;
    }
  },

  // 사용자 ID로 리뷰 가져오기
  getUserReviewsById: async (
    userId: number,
    page = 0,
    size = 10
  ): Promise<Page<MovieReview>> => {
    try {
      console.log(
        `사용자 ID ${userId}의 영화 리뷰 요청 - 페이지: ${page}, 사이즈: ${size}`
      );

      // ID로 유저명 가져오기
      const username = await getUsernameByIdInternal(userId.toString());
      console.log(`사용자 ID ${userId}의 변환된 유저명: ${username}`);

      // 유저명으로 리뷰 조회
      const response = await apiClient.get(`/api/profile/${username}/reviews`, {
        params: {
          page,
          size,
          contentType: "movie", // 명시적으로 영화 리뷰만 요청
        },
      });

      console.log(`사용자 ${username}의 영화 리뷰 응답:`, response.data);

      // 추가 검증으로 데이터 필터링
      if (response.data && response.data.content) {
        // contentType이 movie인 리뷰만 필터링
        const filteredContent = response.data.content.filter(
          (review: any) => review.contentType === "movie"
        );

        // 필터링 결과 로깅
        if (filteredContent.length !== response.data.content.length) {
          console.log(
            `필터링: ${response.data.content.length}개 → ${filteredContent.length}개 영화 리뷰`
          );
        }

        // 필터링된 결과로 교체
        response.data.content = filteredContent;
      }

      return response.data;
    } catch (error) {
      console.error(`사용자 ID ${userId}의 영화 리뷰 조회 실패:`, error);

      // 기본 빈 응답 반환
      return {
        content: [],
        totalElements: 0,
        totalPages: 0,
        size: size,
        number: page,
        first: true,
        last: true,
        empty: true,
      };
    }
  },

  // 사용자 ID로 TV 쇼 리뷰 가져오기
  getUserTvReviewsById: async (
    userId: number,
    page = 0,
    size = 10
  ): Promise<Page<TvShowReview>> => {
    try {
      console.log(
        `사용자 ID ${userId}의 TV 쇼 리뷰 요청 - 페이지: ${page}, 사이즈: ${size}`
      );

      // ID로 유저명 가져오기
      const username = await getUsernameByIdInternal(userId.toString());
      console.log(`사용자 ID ${userId}의 변환된 유저명: ${username}`);

      // 유저명으로 리뷰 조회
      const response = await apiClient.get(`/api/profile/${username}/reviews`, {
        params: {
          page,
          size,
          contentType: "tv", // 명시적으로 TV 쇼 리뷰만 요청
        },
      });

      console.log(`사용자 ${username}의 TV 쇼 리뷰 응답:`, response.data);

      // 추가 검증으로 데이터 필터링
      if (response.data && response.data.content) {
        // contentType이 tv인 리뷰만 필터링
        const filteredContent = response.data.content.filter(
          (review: any) => review.contentType === "tv"
        );

        // 필터링 결과 로깅
        if (filteredContent.length !== response.data.content.length) {
          console.log(
            `필터링: ${response.data.content.length}개 → ${filteredContent.length}개 TV 쇼 리뷰`
          );
        }

        // 필터링된 결과로 교체
        response.data.content = filteredContent;
      }

      return response.data;
    } catch (error) {
      console.error(`사용자 ID ${userId}의 TV 쇼 리뷰 조회 실패:`, error);

      // 기본 빈 응답 반환
      return {
        content: [],
        totalElements: 0,
        totalPages: 0,
        size: size,
        number: page,
        first: true,
        last: true,
        empty: true,
      };
    }
  },

  // 신고 관련 API
  createReport: async (reportData: ReportRequest): Promise<Report> => {
    try {
      // 백엔드 API 호출
      const response = await apiClient.post("/api/reports", {
        targetId: reportData.targetId,
        targetUserId: reportData.targetUserId, // 신고 대상 사용자 ID
        reportType: reportData.reportType.toUpperCase(), // 대문자로 변환 (POST, COMMENT, REVIEW)
        content: reportData.content,
      });

      console.log("신고 처리 완료:", response.data);
      return response.data;
    } catch (error) {
      console.error("신고 처리 중 오류 발생:", error);
      throw error;
    }
  },

  getReports: async (): Promise<Report[]> => {
    try {
      // 백엔드 API 호출
      const response = await apiClient.get("/api/reports");
      console.log("신고 목록 조회 완료:", response.data);

      if (response.data && response.data.content) {
        return response.data.content;
      } else {
        return response.data;
      }
    } catch (error) {
      console.error("신고 목록 조회 중 오류 발생:", error);
      throw error;
    }
  },

  updateReportStatus: async (
    reportId: number,
    status: "PROCESSED" | "REJECTED"
  ): Promise<Report> => {
    try {
      // 백엔드 API 호출
      const response = await apiClient.put(
        `/api/reports/${reportId}/status?status=${status}`
      );
      console.log("신고 상태 업데이트 완료:", response.data);
      return response.data;
    } catch (error) {
      console.error("신고 상태 업데이트 중 오류 발생:", error);
      throw error;
    }
  },

  // 관리자용: 모든 사용자 목록 조회
  getAllUsers: async (page = 0, size = 20): Promise<Page<User>> => {
    try {
      const response = await apiClient.get("/api/admin/users", {
        params: { page, size },
      });
      console.log("전체 사용자 목록 조회 완료:", response.data);
      return response.data;
    } catch (error) {
      console.error("사용자 목록 조회 중 오류 발생:", error);
      throw error;
    }
  },

  // 관리자용: 사용자 차단/차단해제
  updateUserStatus: async (
    userId: number,
    status: "ACTIVE" | "BLOCKED",
    reason?: string
  ): Promise<User> => {
    try {
      const response = await apiClient.put(
        `/api/admin/users/${userId}/status`,
        {
          status,
          reason,
        }
      );
      console.log("사용자 상태 업데이트 완료:", response.data);
      return response.data;
    } catch (error) {
      console.error("사용자 상태 업데이트 중 오류 발생:", error);
      throw error;
    }
  },

  checkUserStatus,
};

// 신고 관련 타입 정의
export interface Report {
  id: number;
  content: string;
  createdAt: string;
  reportType: "comment" | "post" | "review";
  targetId: number;
  status: "PENDING" | "PROCESSED" | "REJECTED";
  reporter: {
    id: number;
    username: string;
    profileImageUrl: string | null;
  };
  targetUser?: {
    id: number;
    username: string;
    profileImageUrl: string | null;
  };
  // 이전 버전과의 호환성을 위해 target 속성도 유지
  target?: {
    id: number;
    username: string;
    profileImageUrl: string | null;
  };
}

// 신고 생성 요청 타입
export interface ReportRequest {
  targetId: number;
  targetUserId: number; // 신고 대상 사용자 ID
  reportType: "comment" | "post" | "review";
  content: string;
}

// 사용자 조회 결과 인터페이스
export interface User {
  id: number;
  username: string;
  email: string;
  profileImageUrl: string | null;
  bio: string | null;
  socialLogin: boolean;
  roles: string[];
  createdAt?: string;
  updatedAt?: string;
  status?: "ACTIVE" | "BLOCKED" | "DELETED";
  blockReason?: string | null;
  blockDate?: string | null;
}
