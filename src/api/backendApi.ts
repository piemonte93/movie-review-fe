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

// 요청 인터셉터 추가
apiClient.interceptors.request.use(
  (config) => {
    // 로컬 스토리지에서 토큰을 가져와 헤더에 추가
    const token = localStorage.getItem("accessToken");
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

// Post 타입 정의
export interface Post {
  id: number;
  title: string;
  content: string;
  createdAt: Date;
  comments: Comment[];
  mentions: UserItem[];
  likes: { userId: number }[];
  dislikes: { userId: number }[];
  user: {
    id: number;
    username: string;
    profileImageUrl: string | null;
    reviewCount: number;
  };
}

// Comment 타입 정의
export interface Comment {
  id: number;
  content: string;
  createdAt: Date;
  likes: { userId: number }[];
  dislikes: { userId: number }[];
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
          language: "ko-KR" // 한국어 설정
        }
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
          language: "ko-KR" // 한국어 설정
        }
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
      const response = await apiClient.get("/community/posts", {
        params: { page, size }
      });
      return response.data;
    } catch (error) {
      console.error("게시글 목록 불러오기 실패:", error);
      
      // 401 Unauthorized 에러가 발생하면 빈 목록을 반환
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        console.log("로그인하지 않은 상태로 게시글 목록을 요청했습니다. 빈 목록을 반환합니다.");
        return {
          content: [],
          totalPages: 0,
          totalElements: 0,
          size: size,
          number: page,
          first: true,
          last: true,
          empty: true
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
        content
      });
      return response.data;
    } catch (error) {
      console.error("게시글 작성 실패:", error);
      throw new Error("게시글 작성에 실패했습니다.");
    }
  },

  // 게시글 수정
  updatePost: async (id: number, title: string, content: string): Promise<Post> => {
    try {
      const response = await apiClient.put(`/community/posts/${id}`, {
        title,
        content
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
        params: { query, category, page, size }
      });
      return response.data;
    } catch (error) {
      console.error("게시글 검색 실패:", error);
      throw new Error("게시글 검색에 실패했습니다.");
    }
  },

  // 게시글 좋아요
  likePost: async (id: number): Promise<Post> => {
    try {
      const response = await apiClient.post(`/community/posts/${id}/like`);
      return response.data;
    } catch (error) {
      console.error("게시글 좋아요 실패:", error);
      throw new Error("게시글 좋아요에 실패했습니다.");
    }
  },

  // 게시글 싫어요
  dislikePost: async (id: number): Promise<Post> => {
    try {
      const response = await apiClient.post(`/community/posts/${id}/dislike`);
      return response.data;
    } catch (error) {
      console.error("게시글 싫어요 실패:", error);
      throw new Error("게시글 싫어요에 실패했습니다.");
    }
  },

  // 댓글 목록 조회
  getCommentsByPostId: async (postId: number): Promise<Comment[]> => {
    try {
      const response = await apiClient.get(`/community/posts/${postId}/comments`);
      return response.data;
    } catch (error) {
      console.error("댓글 목록 불러오기 실패:", error);
      throw new Error("댓글 목록을 불러오는데 실패했습니다.");
    }
  },

  // 댓글 작성
  createComment: async (postId: number, content: string): Promise<Comment> => {
    try {
      const response = await apiClient.post(`/community/posts/${postId}/comments`, {
        content
      });
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
        content
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
  likeComment: async (id: number): Promise<Comment> => {
    try {
      const response = await apiClient.post(`/community/comments/${id}/like`);
      return response.data;
    } catch (error) {
      console.error("댓글 좋아요 실패:", error);
      throw new Error("댓글 좋아요에 실패했습니다.");
    }
  },

  // 댓글 싫어요
  dislikeComment: async (id: number): Promise<Comment> => {
    try {
      const response = await apiClient.post(`/community/comments/${id}/dislike`);
      return response.data;
    } catch (error) {
      console.error("댓글 싫어요 실패:", error);
      throw new Error("댓글 싫어요에 실패했습니다.");
    }
  },

  // 영화 검색 API (영화 리뷰 작성 시 필요)
  searchMoviesByTitle: async (query: string): Promise<ContentResponse> => {
    try {
      const response = await apiClient.get("/contents/search", {
        params: {
          query,
          page: 1,
          language: "ko-KR"
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
  getAllMovieReviews: async (page = 0, size = 10): Promise<PageResponse<any>> => {
    try {
      const response = await apiClient.get("/movie-reviews", {
        params: { page, size }
      });
      return response.data;
    } catch (error) {
      console.error("영화 리뷰 목록 불러오기 실패:", error);
      throw new Error("영화 리뷰 목록을 불러오는데 실패했습니다.");
    }
  },

  // 영화 리뷰 작성
  createMovieReview: async (reviewData: {
    title: string;
    content: string;
    rating: number;
    movieId: number;
    movieTitle: string;
    moviePoster?: string | null;
    isSpoiler: boolean;
  }): Promise<any> => {
    try {
      const response = await apiClient.post("/movie-reviews", reviewData);
      return response.data;
    } catch (error) {
      console.error("영화 리뷰 작성 실패:", error);
      throw new Error("영화 리뷰 작성에 실패했습니다.");
    }
  },

  // 영화 리뷰에 댓글 작성
  addReviewComment: async (reviewId: number, content: string): Promise<any> => {
    try {
      const response = await apiClient.post(`/movie-reviews/${reviewId}/comments`, {
        content
      });
      return response.data;
    } catch (error) {
      console.error("댓글 작성 실패:", error);
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
      const response = await apiClient.post(`/movie-reviews/${reviewId}/dislike`);
      return response.data;
    } catch (error) {
      console.error("리뷰 싫어요 실패:", error);
      throw new Error("싫어요 처리에 실패했습니다.");
    }
  },
};
