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
    reviewCount: number;
  };
  comments: Comment[];
  mentions: UserItem[];
  likeCount: number;
  dislikeCount: number;
  liked: boolean;
  disliked: boolean;
}

// 사용자 관련 타입 정의
export interface UserItem {
  id: number;
  username: string;
  profileImageUrl: string | null;
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
      const response = await apiClient.get(
        `/contents/movie/${movieId}/credits`
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
      const response = await apiClient.get(`/contents/tv/${tvId}/credits`);
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
    const response = await apiClient.get("/reviews", {
      params: { page, size, sort: "created_at,desc" },
    });
    return response.data;
  },

  // TMDB 포스터 URL 생성 함수
  getPosterUrl: (posterPath: string | null, size = "w154"): string => {
    if (!posterPath) return "";
    return `https://image.tmdb.org/t/p/${size}${posterPath}`;
  },

  // 영화 제목으로 검색하는 함수
  searchMoviesByTitle: async (query: string): Promise<ContentResponse> => {
    try {
      const response = await apiClient.get("/contents/search", {
        params: {
          query,
          page: 1,
        },
      });
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

  // 영화 리뷰 생성 함수
  createMovieReview: async (reviewData: {
    movie_id: number;
    movie_title: string;
    movie_poster_path: string;
    title: string;
    content: string;
    rating: number;
    is_spoiler: boolean;
  }): Promise<ReviewResponse> => {
    try {
      // 요청 데이터 유효성 검사
      if (!reviewData.title) {
        console.error("리뷰 제목이 없습니다:", reviewData);
        throw new Error("리뷰 제목을 입력해주세요.");
      }

      if (!reviewData.content) {
        console.error("리뷰 내용이 없습니다:", reviewData);
        throw new Error("리뷰 내용을 입력해주세요.");
      }

      if (!reviewData.movie_id) {
        console.error("영화 ID가 없습니다:", reviewData);
        throw new Error("영화를 선택해주세요.");
      }

      // 요청 로깅
      console.log(
        "리뷰 생성 요청 데이터:",
        JSON.stringify(reviewData, null, 2)
      );

      const token = localStorage.getItem("token");
      if (!token) {
        console.error("인증 토큰이 없습니다.");
        throw new Error("로그인이 필요합니다.");
      }

      console.log(
        "토큰 페이로드:",
        token ? JSON.parse(atob(token.split(".")[1])) : null
      );

      // API 요청 직전 확인 로그
      console.log("최종 요청 데이터:", {
        url: "/review",
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        data: reviewData,
      });

      const response = await apiClient.post("/review", reviewData);
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
    content: {
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
    }[];
    totalElements: number;
    totalPages: number;
    currentPage: number;
    size: number;
  }> => {
    try {
      const response = await apiClient.get("/community/posts", {
        params: { page, size },
      });
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
      const response = await apiClient.post("/community/posts", postData);
      return response.data;
    } catch (error) {
      console.error("게시글 작성 실패:", error);
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
        `/community/posts/${postId}`,
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
      await apiClient.delete(`/community/posts/${postId}`);
    } catch (error) {
      console.error("게시글 삭제 실패:", error);
      throw new Error("게시글 삭제에 실패했습니다.");
    }
  },

  likePost: async (
    postId: number
  ): Promise<{
    id: number;
    likeCount: number;
    liked: boolean;
  }> => {
    try {
      const response = await apiClient.post(`/community/posts/${postId}/like`);
      return response.data;
    } catch (error) {
      console.error("게시글 좋아요 실패:", error);
      throw new Error("게시글 좋아요에 실패했습니다.");
    }
  },

  dislikePost: async (
    postId: number
  ): Promise<{
    id: number;
    dislikeCount: number;
    disliked: boolean;
  }> => {
    try {
      const response = await apiClient.post(
        `/community/posts/${postId}/dislike`
      );
      return response.data;
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
    content: {
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
    }[];
    totalElements: number;
    totalPages: number;
    currentPage: number;
    size: number;
  }> => {
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

  // 댓글 작성
  createComment: async (postId: number, content: string): Promise<Comment> => {
    try {
      const response = await apiClient.post(
        `/community/posts/${postId}/comments`,
        { content }
      );
      return response.data;
    } catch (error) {
      console.error("댓글 작성 실패:", error);
      throw error;
    }
  },

  // 댓글 좋아요
  likeComment: async (commentId: number): Promise<void> => {
    try {
      await apiClient.post(
        `/comments/${commentId}/like`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
    } catch (error) {
      console.error("댓글 좋아요 실패:", error);
      throw error;
    }
  },

  // 댓글 싫어요
  dislikeComment: async (commentId: number): Promise<void> => {
    try {
      await apiClient.post(
        `/comments/${commentId}/dislike`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
    } catch (error) {
      console.error("댓글 싫어요 실패:", error);
      throw error;
    }
  },

  // 사용자 검색
  searchUsers: async (query: string): Promise<UserItem[]> => {
    try {
      const response = await apiClient.get("/users/search", {
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
    const response = await apiClient.get("/reviews", {
      params: {
        page,
        size,
        sort,
      },
    });
    return response.data;
  },

  getReviewComments: async (reviewId: number, page = 0, size = 10) => {
    const response = await apiClient.get(`/reviews/${reviewId}/comments`, {
      params: {
        page,
        size,
      },
    });
    return response.data;
  },

  addReviewComment: async (reviewId: number, content: string) => {
    const response = await apiClient.post(`/reviews/${reviewId}/comments`, {
      content,
    });
    return response.data;
  },

  updateReviewComment: async (
    reviewId: number,
    commentId: number,
    content: string
  ) => {
    const response = await apiClient.put(
      `/reviews/${reviewId}/comments/${commentId}`,
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
      console.log(`요청 URL: /reviews/${reviewId}/comments/${commentId}`);

      const token = localStorage.getItem("token");
      console.log("인증 토큰:", token ? "토큰 있음" : "토큰 없음");

      const response = await apiClient.delete(
        `/reviews/${reviewId}/comments/${commentId}`
      );

      console.log("댓글 삭제 응답 상세:", {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data: response.data,
      });

      return response.data;
    } catch (error) {
      console.error("댓글 삭제 API 호출 실패:", error);
      if (axios.isAxiosError(error)) {
        console.error("Axios 에러 상세:", {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          message: error.message,
        });
      }
      throw error;
    }
  },

  likeReviewComment: async (reviewId: number, commentId: number) => {
    const response = await apiClient.post(
      `/reviews/${reviewId}/comments/${commentId}/like`
    );
    return response.data;
  },

  dislikeReviewComment: async (reviewId: number, commentId: number) => {
    const response = await apiClient.post(
      `/reviews/${reviewId}/comments/${commentId}/dislike`
    );
    return response.data;
  },

  // 리뷰 좋아요/싫어요 API
  likeReview: async (reviewId: number) => {
    const response = await apiClient.post(`/reviews/${reviewId}/like`);
    return response.data;
  },

  dislikeReview: async (reviewId: number) => {
    const response = await apiClient.post(`/reviews/${reviewId}/dislike`);
    return response.data;
  },

  // 영화 리뷰 삭제
  deleteMovieReview: async (reviewId: number): Promise<void> => {
    try {
      await apiClient.delete(`/reviews/${reviewId}`);
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
      await apiClient.put(`/reviews/${reviewId}`, reviewData);
    } catch (error) {
      console.error("리뷰 수정 실패:", error);
      throw error;
    }
  },

  // 사용자가 특정 영화에 대해 작성한 리뷰가 있는지 확인
  checkUserReviewForMovie: async (movieId: number): Promise<boolean> => {
    try {
      const response = await apiClient.get(`/reviews/check`, {
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
      await apiClient.put(`/reviews/${reviewId}/title`, { title });
    } catch (error) {
      console.error("리뷰 제목 수정 실패:", error);
      throw error;
    }
  },
};
