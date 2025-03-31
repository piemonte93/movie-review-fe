import axios from "axios";
import {
  ContentResponse,
  ContentDetail,
  ReviewResponse,
  VideoResponse,
} from "../types/content";
import { toast } from "react-toastify";

// This will point to our Spring Boot backend
const BASE_URL = "http://localhost:8080/api";
const API_BASE_URL = BASE_URL;

// Create axios instance with timeout
const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000, // 10초 타임아웃
});

// API 인터셉터 설정
apiClient.interceptors.request.use(
  (config) => {
    // movie-reviews GET 요청인 경우 토큰을 포함하지 않음
    if (
      config.url?.includes("/movie-reviews") &&
      config.method?.toLowerCase() === "get"
    ) {
      console.log("영화 리뷰 조회 요청 - 토큰 제외");
      return config;
    }

    const token = localStorage.getItem("token");
    if (token) {
      // 토큰 형식 검증 및 정규화
      const normalizedToken = token.startsWith("Bearer ")
        ? token
        : `Bearer ${token}`;

      // 인증 헤더 설정
      config.headers["Authorization"] = normalizedToken;

      // 디버깅용 로그
      console.log(
        "JWT 토큰 설정됨:",
        normalizedToken.substring(0, 15) +
          "..." +
          normalizedToken.substring(normalizedToken.length - 5)
      );

      // API 요청 추적
      console.log(
        "요청 URL: " + config.url + ", 메소드: " + config.method?.toUpperCase()
      );
    } else {
      console.warn(
        "인증 토큰이 없습니다. 인증이 필요한 API는 실패할 수 있습니다."
      );
    }
    return config;
  },
  (error) => {
    console.error("API 요청 인터셉터 오류:", error);
    return Promise.reject(error);
  }
);

// 응답 인터셉터
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (axios.isAxiosError(error)) {
      // HTTP 상태 코드 확인
      const status = error.response?.status;
      const requestUrl = error.config?.url || "알 수 없는 URL";
      const method = error.config?.method?.toUpperCase() || "알 수 없는 메소드";

      // 401 에러 (인증 실패) 처리
      if (status === 401) {
        // movie-reviews GET 요청의 401 에러는 무시
        if (requestUrl.includes("/movie-reviews") && method === "GET") {
          console.log("영화 리뷰 조회 요청의 401 응답. 무시됨");
          return Promise.reject(error);
        }

        console.log("[401 인증 오류]", {
          url: requestUrl,
          method: method.toLowerCase(),
          status: 401,
          message: error.message,
          response: error.response?.data || "",
          headers: error.config?.headers,
        });

        // 토큰 유효성 확인
        const token = localStorage.getItem("token");
        if (token) {
          try {
            const tokenParts = token.split(".");
            if (tokenParts.length === 3) {
              const payload = JSON.parse(atob(tokenParts[1]));
              const currentTime = Math.floor(Date.now() / 1000);
              const expTime = payload.exp;

              const remainingTime = expTime - currentTime;
              const remainingMinutes = Math.floor(remainingTime / 60);
              const remainingSeconds = remainingTime % 60;

              console.log("토큰 검증 결과:", {
                현재시간: new Date(currentTime * 1000).toISOString(),
                만료시간: new Date(expTime * 1000).toISOString(),
                남은시간: `${remainingMinutes}분 ${remainingSeconds}초`,
                만료여부: currentTime < expTime ? "유효함" : "만료됨",
                페이로드: payload,
              });
            }
          } catch (e) {
            console.error("토큰 분석 오류:", e);
          }
        }

        // 중복 이벤트 방지
        const lastErrorTime = parseInt(
          sessionStorage.getItem("last_auth_error_time") || "0"
        );
        const currentTime = Date.now();

        // 5초 내에 동일한 에러 이벤트가 중복 발생하지 않도록 함
        if (currentTime - lastErrorTime > 5000) {
          sessionStorage.setItem(
            "last_auth_error_time",
            currentTime.toString()
          );

          // 인증 오류 이벤트 발생
          console.error(
            "인증 오류:",
            error.response?.data?.message ||
              "인증에 실패했습니다. 다시 로그인해주세요."
          );

          window.dispatchEvent(
            new CustomEvent("auth-error", {
              detail: {
                message:
                  error.response?.data?.message ||
                  "인증에 실패했습니다. 다시 로그인해주세요.",
                url: requestUrl,
                method: method.toLowerCase(),
              },
            })
          );
        }
      } else if (status === 400) {
        // 400 에러 (잘못된 요청) 처리
        console.warn(
          "[400 잘못된 요청]",
          error.response?.data || "요청 데이터가 올바르지 않습니다."
        );
      } else if (status === 404) {
        // 404 에러 (찾을 수 없음) 처리
        console.warn(
          "[404 리소스 없음]",
          requestUrl,
          error.response?.data || "요청한 리소스를 찾을 수 없습니다."
        );
      } else if (status === 500) {
        // 500 에러 (서버 오류) 처리
        console.error(
          "[500 서버 오류]",
          requestUrl,
          error.response?.data || "서버 내부 오류가 발생했습니다."
        );
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

// Post 타입 정의
export interface Post {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  user: {
    id: number;
    username: string;
    profileImageUrl: string | null;
  };
  likeCount: number;
  dislikeCount: number;
  commentCount: number;
  liked: boolean;
  disliked: boolean;
  mentions: UserItem[];
  comments?: Comment[];
}

// Comment 타입 정의
export interface Comment {
  id: number;
  content: string;
  createdAt: string;
  username: string;
  profileImageUrl: string | null;
  likeCount: number;
  dislikeCount: number;
  userId: number;
  user: {
    id: number;
    username: string;
    profileImageUrl: string | null;
  };
}

// User 타입 정의
export interface UserItem {
  id: number;
  username: string;
  profileImageUrl: string | null;
}

// 페이지 응답 타입 정의
export interface PageResponse<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

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
    try {
      const response = await apiClient.get(`/contents/movie/${id}`, {
        params: {
          language: "ko-KR", // 한국어 설정
        },
      });
      return response.data;
    } catch (error) {
      console.error("영화 상세 정보 요청 실패:", error);
      throw new Error("영화 정보를 불러오는데 실패했습니다.");
    }
  },

  getMovieReviews: async (id: number): Promise<ReviewResponse> => {
    try {
      const response = await apiClient.get(`/contents/movie/${id}/reviews`, {
        params: {
          language: "ko-KR", // 한국어 설정
        },
      });
      return response.data;
    } catch (error) {
      console.error("영화 리뷰 요청 실패:", error);
      throw new Error("영화 리뷰를 불러오는데 실패했습니다.");
    }
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

  // 커뮤니티 관련 API

  // 게시글 목록 조회
  getPosts: async (page = 0, size = 10): Promise<PageResponse<Post>> => {
    try {
      console.log("게시글 목록 요청 - 페이지:", page, "크기:", size);
      const response = await apiClient.get("/community/posts", {
        params: { page, size },
      });
      console.log("게시글 목록 응답:", response.data);
      return response.data;
    } catch (error) {
      console.error("게시글 목록 불러오기 실패:", error);

      // 401 Unauthorized 에러가 발생하면 빈 목록을 반환
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        console.log(
          "로그인하지 않은 상태로 게시글 목록을 요청했습니다. 빈 목록을 반환합니다."
        );
        return {
          content: [],
          totalPages: 0,
          totalElements: 0,
          size: size,
          number: page,
          first: true,
          last: true,
          empty: true,
        };
      }

      throw new Error("게시글 목록을 불러오는데 실패했습니다.");
    }
  },

  // 게시글 상세 조회
  getPostById: async (id: number): Promise<Post> => {
    try {
      const response = await apiClient.get(`/community/posts/${id}`);
      return response.data;
    } catch (error) {
      console.error("게시글 상세 불러오기 실패:", error);
      throw new Error("게시글을 불러오는데 실패했습니다.");
    }
  },

  // 게시글 작성
  createPost: async (title: string, content: string): Promise<Post> => {
    try {
      const response = await apiClient.post("/community/posts", {
        title,
        content,
      });
      return response.data;
    } catch (error) {
      console.error("게시글 작성 실패:", error);
      throw new Error("게시글 작성에 실패했습니다.");
    }
  },

  // 게시글 수정
  updatePost: async (
    id: number,
    title: string,
    content: string
  ): Promise<Post> => {
    try {
      const response = await apiClient.put(`/community/posts/${id}`, {
        title,
        content,
      });
      return response.data;
    } catch (error) {
      console.error("게시글 수정 실패:", error);
      throw new Error("게시글 수정에 실패했습니다.");
    }
  },

  // 게시글 삭제
  deletePost: async (id: number): Promise<void> => {
    try {
      await apiClient.delete(`/community/posts/${id}`);
    } catch (error) {
      console.error("게시글 삭제 실패:", error);
      throw new Error("게시글 삭제에 실패했습니다.");
    }
  },

  // 게시글 검색
  searchPosts: async (
    query: string,
    category = "title",
    page = 0,
    size = 10
  ): Promise<PageResponse<Post>> => {
    try {
      const response = await apiClient.get("/community/posts/search", {
        params: { query, category, page, size },
      });
      return response.data;
    } catch (error) {
      console.error("게시글 검색 실패:", error);
      throw new Error("게시글 검색에 실패했습니다.");
    }
  },

  // 게시글 좋아요
  likePost: async (postId: number): Promise<Post> => {
    const response = await apiClient.post(`/community/posts/${postId}/like`);
    return response.data;
  },

  // 게시글 싫어요
  dislikePost: async (postId: number): Promise<Post> => {
    const response = await apiClient.post(`/community/posts/${postId}/dislike`);
    return response.data;
  },

  // 댓글 목록 조회
  getCommentsByPostId: async (postId: number): Promise<Comment[]> => {
    try {
      const response = await apiClient.get(
        `/community/posts/${postId}/comments`
      );
      return response.data;
    } catch (error) {
      console.error("댓글 목록 불러오기 실패:", error);
      throw new Error("댓글 목록을 불러오는데 실패했습니다.");
    }
  },

  // 댓글 작성
  createComment: async (postId: number, content: string): Promise<Comment> => {
    try {
      const response = await apiClient.post(
        `/community/posts/${postId}/comments`,
        {
          content,
        }
      );
      return response.data;
    } catch (error) {
      console.error("댓글 작성 실패:", error);
      throw new Error("댓글 작성에 실패했습니다.");
    }
  },

  // 댓글 수정
  updateComment: async (id: number, content: string): Promise<Comment> => {
    try {
      const response = await apiClient.put(`/community/comments/${id}`, {
        content,
      });
      return response.data;
    } catch (error) {
      console.error("댓글 수정 실패:", error);
      throw new Error("댓글 수정에 실패했습니다.");
    }
  },

  // 댓글 삭제
  deleteComment: async (id: number): Promise<void> => {
    try {
      await apiClient.delete(`/community/comments/${id}`);
    } catch (error) {
      console.error("댓글 삭제 실패:", error);
      throw new Error("댓글 삭제에 실패했습니다.");
    }
  },

  // 댓글 좋아요
  likeComment: async (commentId: number): Promise<void> => {
    await apiClient.post(`/comments/${commentId}/like`);
  },

  // 댓글 싫어요
  dislikeComment: async (commentId: number): Promise<void> => {
    await apiClient.post(`/comments/${commentId}/dislike`);
  },

  // 영화 검색 API (영화 리뷰 작성 시 필요)
  searchMoviesByTitle: async (query: string): Promise<ContentResponse> => {
    try {
      const response = await apiClient.get("/contents/search", {
        params: {
          query,
          page: 1,
          language: "ko-KR",
        },
      });
      return response.data;
    } catch (error) {
      console.error("영화 검색 API 요청 실패:", error);
      if (axios.isAxiosError(error) && !error.response) {
        throw new Error("네트워크 연결을 확인해 주세요.");
      } else {
        throw new Error("영화 검색 결과를 불러오는데 실패했습니다.");
      }
    }
  },

  // 영화 포스터 경로 생성 (상대 경로를 절대 URL로 변환)
  getPosterUrl: (posterPath: string | null, size = "w154"): string => {
    if (!posterPath) return "";
    return `https://image.tmdb.org/t/p/${size}${posterPath}`;
  },

  // 모든 영화 리뷰 목록 가져오기
  getAllMovieReviews: async (
    page = 0,
    size = 10
  ): Promise<PageResponse<any>> => {
    try {
      console.log("===== 영화 리뷰 API 호출 =====");
      console.log("페이지:", page, "크기:", size);

      const response = await apiClient.get(`/movie-reviews`, {
        params: { page, size },
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      });

      console.log("리뷰 API 응답 상태:", response.status);
      console.log("리뷰 API 응답 데이터:", response.data);

      // 응답 데이터가 없거나 빈 배열인 경우
      if (
        !response.data ||
        (Array.isArray(response.data) && response.data.length === 0)
      ) {
        console.log("응답 데이터가 없거나 빈 배열입니다.");
        return {
          content: [],
          totalPages: 0,
          totalElements: 0,
          size: size,
          number: page,
          first: true,
          last: true,
          empty: true,
        };
      }

      // 응답 데이터가 배열인 경우
      if (Array.isArray(response.data)) {
        console.log(
          "응답 데이터가 배열입니다. PageResponse 형식으로 변환합니다."
        );
        return {
          content: response.data,
          totalPages: 1,
          totalElements: response.data.length,
          size: size,
          number: page,
          first: true,
          last: true,
          empty: response.data.length === 0,
        };
      }

      // 응답 데이터가 PageResponse 형식인 경우
      if (response.data.content !== undefined) {
        console.log("응답 데이터가 PageResponse 형식입니다.");
        return response.data;
      }

      // 그 외의 경우
      console.warn("예상치 못한 응답 데이터 형식:", response.data);
      return {
        content: [],
        totalPages: 0,
        totalElements: 0,
        size: size,
        number: page,
        first: true,
        last: true,
        empty: true,
      };
    } catch (error) {
      console.error("리뷰 목록 불러오기 실패:", error);
      if (axios.isAxiosError(error)) {
        console.error("HTTP 상태 코드:", error.response?.status);
        console.error("오류 응답 데이터:", error.response?.data);
      }
      // 에러 발생 시 빈 PageResponse 반환
      return {
        content: [],
        totalPages: 0,
        totalElements: 0,
        size: size,
        number: page,
        first: true,
        last: true,
        empty: true,
      };
    }
  },

  // 영화 리뷰 작성
  createMovieReview: async (reviewData: any): Promise<any> => {
    console.log("영화 리뷰 생성 API 호출 시작");
    console.log("원본 리뷰 데이터:", JSON.stringify(reviewData, null, 2));

    // 토큰 상태 디버깅
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    console.log("===== 리뷰 생성 API 호출 =====");
    console.log("토큰 상태 확인:", token ? "토큰 존재" : "토큰 없음");
    console.log("사용자 정보:", user);

    if (!token) {
      console.warn(
        "토큰이 없습니다. 인증이 필요한 API 호출이 실패할 수 있습니다."
      );
      throw new Error("로그인이 필요합니다.");
    }

    try {
      // 필수 필드 검증
      if (!reviewData.title || !reviewData.content || !reviewData.rating) {
        throw new Error("제목, 내용, 평점은 필수 항목입니다.");
      }

      if (!reviewData.movieId || !reviewData.movieTitle) {
        throw new Error("영화 정보가 누락되었습니다. 영화를 선택해주세요.");
      }

      // 내용 길이 검증
      if (reviewData.content.length < 10) {
        throw new Error("리뷰 내용은 최소 10자 이상 작성해주세요.");
      }
      if (reviewData.content.length > 1000) {
        throw new Error("리뷰 내용은 최대 1000자까지 작성 가능합니다.");
      }

      // 데이터 타입 변환 확인 및 로깅
      console.log("movieId 변환 전 타입:", typeof reviewData.movieId);

      // 수정된 데이터 변환 및 검증
      const transformedData = {
        title: String(reviewData.title).trim(),
        content: String(reviewData.content).trim(),
        rating: Math.round(Number(reviewData.rating)),
        movieId: parseInt(String(reviewData.movieId), 10),
        movieTitle: String(reviewData.movieTitle).trim(),
        moviePoster: reviewData.moviePoster || "",
        isSpoiler: Boolean(reviewData.isSpoiler),
        userId: user.id, // 사용자 ID 추가
        username: user.username, // 사용자명 추가
      };

      console.log(
        "변환된 리뷰 데이터:",
        JSON.stringify(transformedData, null, 2)
      );
      console.log("변환 결과 디버깅:", {
        movieId타입: typeof transformedData.movieId,
        movieId값: transformedData.movieId,
        rating타입: typeof transformedData.rating,
        rating값: transformedData.rating,
        title길이: transformedData.title.length,
        content길이: transformedData.content.length,
        userId: transformedData.userId,
        username: transformedData.username,
      });

      // 토큰 정규화 및 검증
      const normalizedToken = token.startsWith("Bearer ")
        ? token
        : `Bearer ${token}`;
      console.log("정규화된 토큰:", normalizedToken.substring(0, 20) + "...");

      // 토큰 페이로드 검증
      try {
        const tokenParts = normalizedToken.split(" ");
        if (tokenParts.length === 2) {
          const payload = JSON.parse(atob(tokenParts[1].split(".")[1]));
          const currentTime = Math.floor(Date.now() / 1000);
          const expTime = payload.exp;

          if (currentTime >= expTime) {
            console.log("토큰이 만료되었습니다.");
            throw new Error("세션이 만료되었습니다. 다시 로그인해주세요.");
          }

          console.log("토큰 페이로드:", payload);
        }
      } catch (e) {
        console.error("토큰 검증 오류:", e);
        throw new Error("유효하지 않은 토큰입니다. 다시 로그인해주세요.");
      }

      // API 호출 시도
      console.log("API 호출 시도");
      const response = await apiClient.post(`/movie-reviews`, transformedData, {
        headers: {
          Authorization: normalizedToken,
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      });

      console.log("API 응답 성공:", response.data);
      return response.data;
    } catch (error) {
      console.log("영화 리뷰 생성 오류:", error);

      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        let errorMessage = "영화 리뷰 등록에 실패했습니다.";

        // 응답 데이터 디코딩
        if (error.response?.data?.message) {
          try {
            const decoder = new TextDecoder("utf-8");
            const encodedMessage = new TextEncoder().encode(
              error.response.data.message
            );
            errorMessage = decoder.decode(encodedMessage);
          } catch (e) {
            console.error("응답 메시지 디코딩 실패:", e);
          }
        }

        console.log("HTTP 응답 상태:", status);
        console.log("응답 데이터:", error.response?.data);
        console.log("응답 헤더:", error.response?.headers);
        console.log("요청 내용:", error.config?.data);
        console.log("요청 헤더:", error.config?.headers);

        if (status === 401) {
          console.log("401 인증 오류 발생:", errorMessage);
          throw new Error("인증에 실패했습니다. 다시 로그인해주세요.");
        } else if (status === 400) {
          console.log("400 데이터 오류 발생:", errorMessage);
          throw new Error(errorMessage);
        }

        throw new Error(errorMessage);
      }

      throw error instanceof Error
        ? error
        : new Error("알 수 없는 오류가 발생했습니다.");
    }
  },

  // 영화 리뷰에 댓글 작성
  addReviewComment: async (
    reviewId: string | number,
    content: string
  ): Promise<any> => {
    try {
      // 토큰 상태 디버깅
      const token = localStorage.getItem("token");
      console.log(`===== 댓글 작성 API 호출 (리뷰 ID: ${reviewId}) =====`);
      console.log("토큰 상태 확인:", token ? "토큰 존재" : "토큰 없음");

      if (!token) {
        console.warn(
          "토큰이 없습니다. 인증이 필요한 API 호출이 실패할 수 있습니다."
        );
        throw new Error("로그인이 필요합니다.");
      }

      // 명시적으로 헤더 설정
      const response = await apiClient.post(
        `/movie-reviews/${reviewId}/comments`,
        { content }, // content를 객체로 감싸서 전송
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        }
      );

      console.log(
        `댓글 작성 응답 상태 (리뷰 ID: ${reviewId}):`,
        response.status
      );
      console.log(`댓글 작성 응답 (리뷰 ID: ${reviewId}):`, response.data);
      return response.data;
    } catch (error) {
      console.error(`댓글 작성 실패 (리뷰 ID: ${reviewId}):`, error);

      if (axios.isAxiosError(error)) {
        console.error("HTTP 상태 코드:", error.response?.status);
        console.error("오류 응답 데이터:", error.response?.data);
        console.error("요청 헤더:", error.config?.headers);

        if (error.response?.status === 401) {
          throw new Error("인증에 실패했습니다. 다시 로그인해주세요.");
        }
      }

      throw new Error("댓글 작성에 실패했습니다.");
    }
  },

  // 영화 리뷰 좋아요
  likeReview: async (reviewId: number): Promise<any> => {
    try {
      const response = await apiClient.post(`/movie-reviews/${reviewId}/like`);
      return response.data;
    } catch (error) {
      console.error("리뷰 좋아요 실패:", error);
      throw new Error("좋아요 처리에 실패했습니다.");
    }
  },

  // 영화 리뷰 싫어요
  dislikeReview: async (reviewId: number): Promise<any> => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("로그인이 필요합니다.");
      }

      const normalizedToken = token.startsWith("Bearer ")
        ? token
        : `Bearer ${token}`;

      const response = await apiClient.post(
        `/movie-reviews/${reviewId}/dislike`,
        {},
        {
          headers: {
            Authorization: normalizedToken,
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error("리뷰 싫어요 실패:", error);
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new Error("인증에 실패했습니다. 다시 로그인해주세요.");
        }
      }
      throw new Error("싫어요 처리에 실패했습니다.");
    }
  },

  // 리뷰 댓글 목록 가져오기
  getReviewComments: async (reviewId: number): Promise<Comment[]> => {
    try {
      // 토큰 상태 디버깅
      const token = localStorage.getItem("token");
      console.log(`===== 댓글 목록 조회 API (리뷰 ID: ${reviewId}) =====`);
      console.log("토큰 상태 확인:", token ? "토큰 존재" : "토큰 없음");

      if (!token) {
        console.warn(
          "토큰이 없습니다. 인증 필요한 API 호출이 실패할 수 있습니다."
        );
      }

      console.log(`리뷰 ID ${reviewId}의 댓글 목록 요청`);

      // 명시적으로 헤더 설정
      const response = await apiClient.get(
        `/movie-reviews/${reviewId}/comments`,
        {
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        }
      );

      console.log(
        `리뷰 ID ${reviewId}의 댓글 목록 응답 상태:`,
        response.status
      );
      console.log(`리뷰 ID ${reviewId}의 댓글 목록 응답:`, response.data);

      // 응답에서 comments 배열 추출
      const comments = response.data?.comments || [];
      return comments;
    } catch (error) {
      console.error(`리뷰 ID ${reviewId}의 댓글 목록 가져오기 실패:`, error);

      if (axios.isAxiosError(error)) {
        console.error("HTTP 상태 코드:", error.response?.status);
        console.error("오류 응답 데이터:", error.response?.data);
        console.error("요청 헤더:", error.config?.headers);
      }

      return []; // 오류 발생 시 빈 배열 반환
    }
  },

  // API 호출 함수 수정
  fetchReviewComments: async (
    reviewId: string | number
  ): Promise<Comment[]> => {
    try {
      // 토큰 상태 디버깅
      const token = localStorage.getItem("token");
      console.log(`===== 댓글 목록 API 호출 (리뷰 ID: ${reviewId}) =====`);
      console.log("토큰 상태 확인:", token ? "토큰 존재" : "토큰 없음");

      if (!token) {
        console.warn(
          "토큰이 없습니다. 인증 필요한 API 호출이 실패할 수 있습니다."
        );
      }

      // 캐시 방지용 타임스탬프 유지
      const timestamp = new Date().getTime();

      // 명시적으로 헤더 설정
      const response = await apiClient.get(
        `/movie-reviews/${reviewId}/comments?_t=${timestamp}`,
        {
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        }
      );

      console.log(
        `댓글 API 응답 상태 (리뷰 ID: ${reviewId}):`,
        response.status
      );
      console.log(
        `댓글 API 응답 데이터 (리뷰 ID: ${reviewId}):`,
        response.data
      );

      // 응답에서 comments 배열 추출
      const comments = response.data?.comments || [];
      return comments;
    } catch (error) {
      console.error(`댓글 불러오기 실패 (리뷰 ID: ${reviewId}):`, error);

      if (axios.isAxiosError(error)) {
        console.error("HTTP 상태 코드:", error.response?.status);
        console.error("오류 응답 데이터:", error.response?.data);
        console.error("요청 헤더:", error.config?.headers);
      }

      return [];
    }
  },

  searchUsers: async (query: string): Promise<UserItem[]> => {
    const response = await apiClient.get(`/users/search?query=${query}`);
    return response.data;
  },

  // 댓글 추가
  async addComment(reviewId: number, content: string): Promise<Comment> {
    const response = await apiClient.post(
      `/movie-reviews/${reviewId}/comments`,
      {
        content,
      }
    );
    return response.data;
  },
};
