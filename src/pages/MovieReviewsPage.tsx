import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import {
  FaUser,
  FaComment,
  FaStar,
  FaSearch,
  FaPen,
  FaReply,
  FaTimes,
  FaCaretDown,
  FaThumbsUp,
  FaThumbsDown,
  FaArrowUp,
  FaEdit,
  FaTrash,
  FaBell,
  FaExclamationTriangle,
  FaPlus,
  FaFilm,
  FaCommentSlash,
  FaCheck,
} from "react-icons/fa";
import { FaStarHalfStroke } from "react-icons/fa6";
import { Link, useNavigate, useLocation } from "react-router-dom";
import InfiniteScroll from "react-infinite-scroll-component";
import { backendApi, BASE_URL } from "../api/backendApi";
import { toast } from "react-toastify";
import { Content } from "../types/content";
import axios from "axios";
import { formatDate } from "../utils/dateUtils";
import Modal from "react-modal";
import defaultAvatar from "../assets/default-profile.png";
import type { Page as ApiPage } from "../api/backendApi";

// Content 타입을 Movie 타입으로 매핑하는 함수
const mapContentToMovie = (content: Content): Movie | null => {
  // TV 쇼는 제외하고 영화만 매핑
  if (content.media_type === "tv") {
    return null;
  }

  return {
    id: content.id,
    title: content.title || content.name || "제목 없음",
    poster_path: content.poster_path || "",
    release_date: content.release_date || content.first_air_date || "",
    overview: content.overview || "",
    vote_average: content.vote_average || 0,
  };
};

// TMDB API 영화 정보 타입
interface Movie {
  id: number;
  title: string;
  poster_path: string;
  release_date: string;
  overview?: string;
  vote_average?: number;
}

// 댓글 데이터 타입 정의
interface Comment {
  id: number;
  content: string;
  createdAt: string;
  username: string;
  profileImageUrl: string | null;
  likeCount: number;
  dislikeCount: number;
  userId: number;
  user?: {
    id: number;
    username: string;
    profileImageUrl?: string | null;
  };
}

// 백엔드에서 반환하는 댓글 형식
interface CommentResponse {
  id: number;
  content: string;
  username: string;
  user_profile_image_url: string | null;
  created_at: string;
  updated_at: string | null;
  user_id: number;
  // 추가 필드
  userId?: number;
  createdAt?: string;
  user?: {
    userId: number;
    username: string;
    profileUrl: string | null;
  };
  likeCount?: number;    // <--- 추가
  dislikeCount?: number; // <--- 추가
  liked?: boolean;       // <--- 추가 (TvReviewsPage와 통일)
  disliked?: boolean;    // <--- 추가 (TvReviewsPage와 통일)
}

// 영화 리뷰 데이터 타입 정의
interface MovieReview {
  id: number;
  title: string;
  content: string;
  rating: number;
  movieTitle: string;
  movieId: number;
  moviePoster?: string;
  createdAt: Date;
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

// 백엔드에서 반환하는 리뷰 형식
interface MovieReviewResponse {
  id: number;
  userId: number;
  username: string;
  userProfileUrl: string | null;
  title: string;
  content: string;
  rating: number;
  movieId: number;
  movieTitle: string;
  moviePoster?: string;
  createdAt: string;
  updatedAt?: string;
  likeCount: number;
  dislikeCount: number;
  commentCount: number;
  isSpoiler: boolean;
  isLiked: boolean;
  isDisliked: boolean;
  comments?: Comment[];
}

// 백엔드 API 응답 구조에 맞게 인터페이스 수정
interface ReviewResponse {
  content: {
    id: number;
    userId: number;
    username: string;
    userProfileImageUrl: string | null;
    movieId: number;
    movieTitle: string;
    moviePosterPath: string | null;
    title: string;
    content: string;
    rating: number;
    createdAt: string;
    updatedAt: string | null;
    commentCount: number;
    likeCount: number;
    dislikeCount: number;
    isSpoiler: boolean;
    contentType?: string;
  }[];
  totalElements: number;
  totalPages: number;
  currentPage: number;
  size: number;
}

// 백엔드 날짜 문자열을 ISO 형식으로 변환하는 유틸리티 함수
const convertBackendDateToISO = (
  dateValue: string | undefined | null
): string => {
  if (!dateValue) {
    console.warn("날짜 필드가 없습니다. 현재 시간으로 설정합니다.");
    return new Date().toISOString();
  }

  if (typeof dateValue !== "string" || dateValue.trim() === "") {
    console.warn("날짜 필드가 비어있습니다. 현재 시간으로 설정합니다.");
    return new Date().toISOString();
  }

  try {
    // 서버로부터 온 LocalDateTime 문자열 처리 (2023-04-03T15:30:45)
    const localDateTimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/;
    if (localDateTimeRegex.test(dateValue)) {
      console.log(`LocalDateTime 형식 날짜 변환 전: ${dateValue}`);

      // 중요: 서버에서 보낸 시간은 이미 KST(한국시간)이지만 타임존 정보가 없음
      // 타임존 정보만 추가(KST = +09:00)하고 추가 계산을 하지 않음
      const date = new Date(`${dateValue}+09:00`);
      const isoDate = date.toISOString();

      console.log(
        `LocalDateTime 형식 날짜 변환 후(KST 타임존 추가): ${isoDate}`
      );

      // 날짜 유효성 검사
      const testDate = new Date(isoDate);
      if (!isNaN(testDate.getTime())) {
        return isoDate;
      }
    }

    // 다른 형식의 유효한 날짜인 경우
    const date = new Date(dateValue);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }

    throw new Error(`유효하지 않은 날짜 형식: ${dateValue}`);
  } catch (error) {
    console.warn(`날짜 파싱 오류:`, error);
    return new Date().toISOString();
  }
};

const MovieReviewsPage: React.FC = () => {
  const { isLoggedIn, user, isUserBlocked } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [movieTitle, setMovieTitle] = useState("");
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [movieSearchQuery, setMovieSearchQuery] = useState("");
  const [movieSearchResults, setMovieSearchResults] = useState<Movie[]>([]);
  const [isSearchingMovie, setIsSearchingMovie] = useState(false);
  const [rating, setRating] = useState<number>(0);
  const [isSpoiler, setIsSpoiler] = useState<boolean>(false);
  const [reviews, setReviews] = useState<MovieReview[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [showWriteForm, setShowWriteForm] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [movieQuery, setMovieQuery] = useState("");
  const [searchResults, setSearchResults] = useState<MovieReview[]>([]);
  const [expandedCommentId, setExpandedCommentId] = useState<number | null>(
    null
  );
  const [commentContent, setCommentContent] = useState("");
  const [searchCategory, setSearchCategory] = useState<
    "title" | "content" | "author"
  >("title");
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  // 무한 스크롤 관련 상태 추가
  const [visibleReviews, setVisibleReviews] = useState<MovieReview[]>([]);
  const [page, setPage] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [totalPages, setTotalPages] = useState<number>(0);
  const reviewsPerPage = 5; // 한 번에 보여줄 리뷰 수

  // 최상단으로 이동 버튼의 표시 여부 상태
  const [showScrollTop, setShowScrollTop] = useState(false);

  // TMDB API 키 (실제 환경에서는 환경 변수로 관리)
  const TMDB_API_KEY = "a95a7823323dd52f66d0dc776498a8a1";

  // 영화 검색 함수
  const searchMovies = async (query: string) => {
    if (!query.trim()) {
      setMovieSearchResults([]);
      return;
    }

    try {
      const response = await backendApi.searchMoviesByTitle(query);
      // Content 타입을 Movie 타입으로 변환
      const movies = response.results.map(mapContentToMovie);
      setMovieSearchResults(
        movies.filter((movie) => movie !== null) as Movie[]
      );
    } catch (error) {
      console.error("영화 검색 중 오류 발생:", error);
      toast.error("영화 검색에 실패했습니다.");
      setMovieSearchResults([]);
    }
  };

  // 영화 검색어 변경 핸들러
  const handleMovieSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setMovieSearchQuery(query);
    setIsSearchingMovie(true);

    // 디바운싱을 위한 타이머
    const timer = setTimeout(() => {
      searchMovies(query);
    }, 500);

    return () => clearTimeout(timer);
  };

  // 영화 선택 핸들러
  const handleSelectMovie = (movie: Movie) => {
    console.log("영화 선택:", movie);

    // 필수 필드 검증
    if (!movie.id) {
      console.error("선택된 영화에 id가 없습니다:", movie);
      toast.error("유효하지 않은 영화입니다. 다른 영화를 선택해주세요.");
      return;
    }

    if (!movie.title) {
      console.error("선택된 영화에 title이 없습니다:", movie);
      toast.error("영화 제목이 없습니다. 다른 영화를 선택해주세요.");
      return;
    }

    // 영화 정보 설정
    setSelectedMovie({
      id: movie.id,
      title: movie.title,
      poster_path: movie.poster_path || "",
      release_date: movie.release_date || "",
      overview: movie.overview || "",
      vote_average: movie.vote_average || 0,
    });

    setMovieTitle(movie.title);
    setMovieSearchQuery("");
    setMovieSearchResults([]);
    setIsSearchingMovie(false);

    console.log("영화 선택 완료:", {
      id: movie.id,
      title: movie.title,
      poster_path: movie.poster_path || "",
    });
  };

  // 선택한 영화 취소 핸들러
  const handleClearSelectedMovie = () => {
    setSelectedMovie(null);
    setMovieTitle("");
  };

  // 리뷰 목록 가져오기 함수
  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const response = await backendApi.getReviews(0, reviewsPerPage);
      if (response.content) {
        const formattedReviews = response.content.map((review: any) => ({
          ...review,
          createdAt: convertBackendDateToISO(review.createdAt),
          comments: [],
          user: {
            id: review.userId,
            username: review.username,
            profileImageUrl: review.userProfileImageUrl,
            reviewCount: 0,
          },
          moviePoster: review.moviePosterPath,
        }));
        setReviews(formattedReviews);
        setVisibleReviews(formattedReviews);
        setTotalPages(response.totalPages);
        setHasMore(response.totalPages > 1);
      }
      setLoading(false);
    } catch (error) {
      console.error("영화 리뷰 로딩 실패:", error);
      toast.error("리뷰를 불러오는데 실패했습니다.");
      setLoading(false);
    }
  }, [reviewsPerPage]);

  // useEffect에서 fetchReviews 호출
  useEffect(() => {
    fetchReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // <-- 의존성 배열을 빈 배열로 수정

  // 리뷰 작성 처리
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoggedIn) {
      toast.error("로그인이 필요합니다.");
      return;
    }

    if (!selectedMovie) {
      toast.error("영화를 선택해주세요.");
      return;
    }

    if (!title.trim() || !content.trim()) {
      toast.error("제목과 내용을 모두 입력해주세요.");
      return;
    }

    setSubmitting(true);
    try {
      if (editingReviewId) {
        // 리뷰 수정 로직
        // 현재 수정 중인 리뷰 찾기
        const currentReview = reviews.find(
          (review) => review.id === editingReviewId
        );

        // 영화가 변경되었는지 확인
        if (currentReview && selectedMovie.id !== currentReview.movieId) {
          // 해당 영화에 대한 리뷰가 이미 존재하는지 확인
          try {
            const hasExistingReview = await backendApi.checkUserReviewForMovie(
              selectedMovie.id
            );

            if (hasExistingReview) {
              toast.error("이미 선택한 영화에 대한 리뷰를 작성하셨습니다.");
              setSubmitting(false);
              return;
            }
          } catch (checkError) {
            console.error("리뷰 존재 여부 확인 실패:", checkError);

            // API 호출이 실패한 경우 클라이언트 측에서 확인
            const existingReview = reviews.find(
              (review) =>
                review.id !== editingReviewId &&
                review.movieId === selectedMovie.id
            );

            if (existingReview) {
              toast.error("이미 선택한 영화에 대한 리뷰를 작성하셨습니다.");
              setSubmitting(false);
              return;
            }
          }
        }

        const reviewData = {
          title: title.trim(),
          content: content.trim(),
          rating: rating,
          is_spoiler: isSpoiler,
          movie_id: selectedMovie.id,
          movie_title: selectedMovie.title,
          movie_poster_path: selectedMovie.poster_path || "",
        };

        console.log(`리뷰 ID ${editingReviewId} 수정 요청:`, reviewData);

        // 백엔드 API 호출
        await backendApi.updateMovieReview(editingReviewId, reviewData);

        // 현재 리뷰 목록에서 수정된 리뷰를 찾아 업데이트
        const updatedReviews = reviews.map((review) =>
          review.id === editingReviewId
            ? {
                ...review,
                title: title.trim(),
                content: content.trim(),
                rating: rating,
                isSpoiler: isSpoiler,
                movieId: selectedMovie.id,
                movieTitle: selectedMovie.title,
                moviePoster: selectedMovie.poster_path || "",
              }
            : review
        );

        // 상태 업데이트
        setReviews(updatedReviews);
        setVisibleReviews(updatedReviews);

        // 폼 초기화
        resetForm();
        setShowWriteForm(false);
        setEditingReviewId(null);

        toast.success("리뷰가 성공적으로 수정되었습니다.");
      } else {
        // 새 리뷰 작성
        // 해당 영화에 대한 리뷰가 이미 존재하는지 사전 확인
        try {
          const hasExistingReview = await backendApi.checkUserReviewForMovie(
            selectedMovie.id
          );

          if (hasExistingReview) {
            toast.error("이미 선택한 영화에 대한 리뷰를 작성하셨습니다.", {
              autoClose: 5000,
              onClose: () => {
                setTimeout(() => {
                  const shouldEdit = window.confirm(
                    "이미 작성된 리뷰를 수정하시겠습니까?"
                  );
                  if (shouldEdit) {
                    // 기존 리뷰 찾기
                    const existingReview = reviews.find(
                      (review) => review.movieId === selectedMovie?.id
                    );
                    if (existingReview) {
                      handleEditReview(existingReview);
                    } else {
                      toast.error(
                        "기존 리뷰를 찾을 수 없습니다. 리뷰 목록을 새로고침합니다."
                      );
                      fetchReviews();
                    }
                  }
                }, 500);
              },
            });
            setSubmitting(false);
            return;
          }
        } catch (checkError) {
          console.error("리뷰 존재 여부 확인 실패:", checkError);

          // API 호출이 실패한 경우 클라이언트 측에서 확인
          const existingReview = reviews.find(
            (review) => review.movieId === selectedMovie.id
          );

          if (existingReview) {
            toast.error("이미 선택한 영화에 대한 리뷰를 작성하셨습니다.", {
              autoClose: 5000,
              onClose: () => {
                setTimeout(() => {
                  const shouldEdit = window.confirm(
                    "이미 작성된 리뷰를 수정하시겠습니까?"
                  );
                  if (shouldEdit) {
                    handleEditReview(existingReview);
                  }
                }, 500);
              },
            });
            setSubmitting(false);
            return;
          }
        }

        const reviewData = {
          movie_id: selectedMovie.id,
          movie_title: selectedMovie.title,
          movie_poster_path: selectedMovie.poster_path,
          title: title.trim(),
          content: content.trim(),
          rating: rating,
          is_spoiler: isSpoiler,
        };

        console.log("리뷰 작성 요청 데이터:", reviewData);
        const response = await backendApi.createMovieReview(reviewData);
        console.log("리뷰 생성 성공:", response);

        toast.success("리뷰가 성공적으로 등록되었습니다.");
        resetForm(); // Reset form fields
        setShowWriteForm(false); // <-- Explicitly close the modal
        setPage(0); // Reset page for infinite scroll
        fetchReviews(); // Fetch updated reviews
      }
    } catch (error) {
      console.error("리뷰 제출 실패:", error);
      console.log("리뷰 제출 오류 타입:", typeof error);

      // 에러 객체 자세히 로깅
      if (error instanceof Error) {
        console.log("에러 객체 이름:", error.name);
        console.log("에러 메시지:", error.message);
        console.log("에러 스택:", error.stack);

        // 에러 메시지가 비어있거나 undefined인 경우 기본 메시지 설정
        const errorMessage = error.message || "알 수 없는 오류가 발생했습니다.";
        console.log("최종 표시할 에러 메시지:", errorMessage);

        // 중복 리뷰 에러 메시지 처리
        if (
          errorMessage.includes("이미 이 영화에 대한 리뷰를 작성하셨습니다") ||
          errorMessage.includes("기존 리뷰를 수정하시겠습니까")
        ) {
          // 중복 리뷰 메시지 표시 및 수정 확인 다이얼로그
          toast.error(errorMessage, {
            autoClose: 5000,
            onClose: () => {
              setTimeout(() => {
                const shouldEdit = window.confirm(
                  "이미 작성된 리뷰를 수정하시겠습니까?"
                );
                if (shouldEdit) {
                  // 기존 리뷰 찾기
                  const existingReview = reviews.find(
                    (review) => review.movieId === selectedMovie?.id
                  );
                  if (existingReview) {
                    handleEditReview(existingReview);
                  } else {
                    toast.error(
                      "기존 리뷰를 찾을 수 없습니다. 리뷰 목록을 새로고침합니다."
                    );
                    fetchReviews();
                  }
                }
              }, 500);
            },
          });
        } else {
          // 기타 오류 메시지 표시
          toast.error(errorMessage, {
            autoClose: 7000,
          });
        }
      } else if (axios.isAxiosError(error) && error.response) {
        // Axios 에러인 경우 응답 데이터에서 메시지 추출
        const errorResponse = error.response.data;
        let errorMessage = "리뷰 작성에 실패했습니다.";

        if (typeof errorResponse === "string") {
          errorMessage = errorResponse;
        } else if (errorResponse && typeof errorResponse === "object") {
          errorMessage =
            errorResponse.message ||
            errorResponse.error ||
            JSON.stringify(errorResponse);
        }

        console.log("Axios 에러에서 추출한 메시지:", errorMessage);
        toast.error(errorMessage, {
          autoClose: 7000,
        });
      } else {
        toast.error("리뷰 작성에 실패했습니다. 서버 연결을 확인해주세요.", {
          autoClose: 7000,
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  // 리뷰 댓글 작성 처리
  const handleCommentSubmit = async (reviewId: number) => {
    if (!commentContent.trim()) return;

    // 차단된 사용자인 경우 댓글 작성 불가
    if (isUserBlocked()) {
      toast.error("현재 댓글 기능이 제한되었습니다. 관리자에게 문의해주세요.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await backendApi.addReviewComment(
        reviewId,
        commentContent
      );
      console.log("새 리뷰 댓글 응답:", response);

      // createdAt 필드 확인 및 보정
      let createdAtValue;
      if (!response.createdAt || response.createdAt === "") {
        console.warn(
          "리뷰 댓글의 createdAt 필드가 비어있습니다. 현재 시간으로 대체합니다."
        );
        createdAtValue = new Date().toISOString();
      } else {
        // 서버로부터 온 LocalDateTime 문자열 처리 (2023-04-03T15:30:45)
        const localDateTimeRegex =
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/;
        if (localDateTimeRegex.test(response.createdAt)) {
          console.log(`새 댓글의 LocalDateTime 형식 감지:`, response.createdAt);

          // 중요: 서버에서 보낸 시간은 이미 KST(한국시간)이지만 타임존 정보가 없음
          // 타임존 정보만 추가(KST = +09:00)하고 추가 계산을 하지 않음
          const date = new Date(`${response.createdAt}+09:00`);
          createdAtValue = date.toISOString();

          console.log(`새 댓글의 KST 타임존 정보 추가:`, createdAtValue);
        } else {
          createdAtValue = response.createdAt;
        }
      }

      // 명시적으로 날짜가 있는 새 댓글 객체 생성
      const newComment: Comment = {
        id: response.id,
        content: response.content,
        createdAt: createdAtValue,
        username: user?.username || "알 수 없는 사용자",
        profileImageUrl: user?.profileImageUrl || null,
        userId: user?.id || 0,
        likeCount: 0,
        dislikeCount: 0,
        user: {
          id: user?.id || 0,
          username: user?.username || "",
          profileImageUrl: user?.profileImageUrl || null,
        },
      };

      // 리뷰 업데이트
      setReviews((prevReviews) =>
        prevReviews.map((review) => {
          if (review.id === reviewId) {
            return {
              ...review,
              comments: [...(review.comments || []), newComment],
              commentCount: (review.commentCount || 0) + 1,
            };
          }
          return review;
        })
      );

      setVisibleReviews((prevReviews) =>
        prevReviews.map((review) => {
          if (review.id === reviewId) {
            return {
              ...review,
              comments: [...(review.comments || []), newComment],
              commentCount: (review.commentCount || 0) + 1,
            };
          }
          return review;
        })
      );

      // 댓글 입력창 초기화
      setCommentContent("");
      toast.success("댓글이 등록되었습니다.");
    } catch (error) {
      console.error("댓글 작성 실패:", error);
      toast.error("댓글 작성에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  // 별점 렌더링 함수
  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<FaStar key={i} className="text-yellow-400" />);
      } else if (i === fullStars && hasHalfStar) {
        stars.push(<FaStarHalfStroke key={i} className="text-yellow-400" />);
      } else {
        stars.push(<FaStar key={i} className="text-gray-300" />);
      }
    }

    return (
      <div className="flex items-center">
        <div className="flex">{stars}</div>
        <span className="ml-1 text-yellow-500 font-medium">
          ({rating.toFixed(1)})
        </span>
      </div>
    );
  };

  // 별점 선택 핸들러
  const handleRatingClick = (index: number, isHalf: boolean) => {
    const newRating = isHalf ? index + 0.5 : index + 1;
    setRating(newRating);
  };

  // 검색 처리
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      // If search query is empty, reset to show all reviews (or initial page)
      resetSearch();
      return;
    }

    const filtered = reviews.filter((review) => {
      const query = searchQuery.toLowerCase();

      switch (searchCategory) {
        case "title":
          return (
            review.title.toLowerCase().includes(query) ||
            review.movieTitle.toLowerCase().includes(query)
          );
        case "content":
          return review.content.toLowerCase().includes(query);
        case "author":
          return review.user.username.toLowerCase().includes(query);
        default:
          return (
            review.title.toLowerCase().includes(query) ||
            review.content.toLowerCase().includes(query) ||
            review.movieTitle.toLowerCase().includes(query)
          );
      }
    });

    setSearchResults(filtered);
    setVisibleReviews(filtered); // Update the visible list with search results
    setHasMore(false); // Disable infinite scroll when showing search results
  };

  // 검색 초기화
  const resetSearch = () => {
    setSearchQuery("");
    setSearchResults([]); // Clear search results state
    setVisibleReviews(reviews.slice(0, reviewsPerPage)); // Reset visible reviews to the first page
    setHasMore(reviews.length > reviewsPerPage); // Re-enable infinite scroll if needed
    setShowSearch(false);
    setShowSearchModal(false);
    // Optionally reset page number if needed, e.g., setPage(0);
  };

  // 검색 카테고리를 표시하는 텍스트 반환
  const getCategoryText = () => {
    switch (searchCategory) {
      case "title":
        return "제목";
      case "content":
        return "내용";
      case "author":
        return "작성자";
      default:
        return "제목";
    }
  };

  // 리뷰 수정 핸들러
  const handleEditReview = (review: MovieReview) => {
    setEditingReviewId(review.id);
    setTitle(review.title);
    setContent(review.content);
    setRating(review.rating);
    setIsSpoiler(review.isSpoiler);
    setSelectedMovie({
      id: review.movieId,
      title: review.movieTitle,
      poster_path: review.moviePoster || "",
      release_date: "", // 영화 개봉일 정보를 빈 문자열로 설정하면 기본 영화 정보로 초기화
      vote_average: 0,
    });
    setShowWriteForm(true);

    // 영화 정보 API로 가져오기
    const fetchMovieDetails = async () => {
      try {
        const movieDetails = await backendApi.getMovieDetails(review.movieId);
        if (movieDetails) {
          setSelectedMovie({
            id: review.movieId,
            title: review.movieTitle,
            poster_path: review.moviePoster || "",
            release_date: movieDetails.release_date || "",
            vote_average: movieDetails.vote_average || 0,
          });
        }
      } catch (error) {
        console.error("영화 정보 가져오기 실패:", error);
      }
    };

    fetchMovieDetails();
  };

  // 리뷰 삭제 핸들러
  const handleDeleteReview = async (reviewId: number) => {
    // 로그인 확인
    if (!isLoggedIn) {
      toast.error("로그인이 필요합니다.");
      navigate("/login", { state: { from: location } });
      return;
    }

    // 삭제 확인
    if (!window.confirm("리뷰를 삭제하시겠습니까?")) {
      return;
    }

    try {
      await backendApi.deleteMovieReview(reviewId);
      // 성공적으로 삭제된 후, 리뷰 목록 새로고침
      fetchReviews();
      toast.success("리뷰가 삭제되었습니다.");
    } catch (error) {
      console.error("리뷰 삭제 실패:", error);
      toast.error("리뷰 삭제에 실패했습니다.");
    }
  };

  // 댓글 삭제 핸들러
  const handleDeleteComment = async (reviewId: number, commentId: number) => {
    if (!isLoggedIn) {
      navigate("/login", { state: { from: location } });
      return;
    }

    if (!window.confirm("댓글을 삭제하시겠습니까?")) {
      return;
    }

    try {
      console.log(
        `댓글 삭제 시도: reviewId=${reviewId}, commentId=${commentId}`
      );
      await backendApi.deleteReviewComment(reviewId, commentId);
      console.log(`댓글 삭제 API 호출 성공`);

      // 성공 후 UI에서 해당 댓글 제거
      const updatedReviews = reviews.map((review) => {
        if (review.id === reviewId) {
          return {
            ...review,
            comments: review.comments.filter(
              (comment) => comment.id !== commentId
            ),
            commentCount: Math.max(0, (review.commentCount || 0) - 1),
          };
        }
        return review;
      });

      // 상태 업데이트
      setReviews(updatedReviews);
      setVisibleReviews(updatedReviews);

      // 성공 메시지 표시
      toast.success("댓글이 삭제되었습니다.");

      // 서버에서 최신 데이터 가져오기 (백그라운드에서 처리)
      fetchReviewComments(reviewId).catch((error) => {
        console.error(`댓글 목록 새로고침 실패: ${error}`);
      });
    } catch (error) {
      console.error("댓글 삭제 실패:", error);

      let errorMessage = "댓글 삭제에 실패했습니다.";

      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const data = error.response?.data;

        console.error(`댓글 삭제 오류 상태 코드: ${status}`);
        console.error(`댓글 삭제 오류 응답 데이터:`, data);

        if (status === 403) {
          errorMessage = "댓글 삭제 권한이 없습니다.";
        } else if (status === 404) {
          errorMessage = "댓글을 찾을 수 없습니다.";
        } else if (status === 500) {
          errorMessage = "서버 오류가 발생했습니다. 나중에 다시 시도해주세요.";
        }
      }

      toast.error(errorMessage);

      // 오류 발생 시에도 댓글 목록 다시 가져오기
      try {
        await fetchReviewComments(reviewId);
      } catch (refreshError) {
        console.error("댓글 목록 새로고침 실패:", refreshError);
      }
    }
  };

  // 스크롤 이벤트 핸들러
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const showScrollButton = scrollY > 300; // 스크롤이 300px 이상 내려갔을 때 버튼 표시
      setShowScrollTop(showScrollButton);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // URL 쿼리 파라미터 확인하여 검색 실행
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const searchParam = params.get("search");

    // 검색어가 있으면 자동으로 검색 실행
    if (searchParam) {
      setSearchQuery(searchParam);
      setSearchCategory("title"); // 기본 검색 카테고리를 제목으로 설정

      // 데이터 로드 후 검색 수행
      if (reviews.length > 0) {
        const filtered = reviews.filter((review) => {
          const query = searchParam.toLowerCase();
          return review.title.toLowerCase().includes(query);
        });

        setSearchResults(filtered);
        setVisibleReviews(filtered);
        setHasMore(false);
      }
    }
  }, [location, reviews]);

  // 최상단으로 스크롤하는 함수
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // 다음 페이지 리뷰를 불러오는 함수
  const fetchMoreReviews = async () => {
    const nextPage = page + 1;
    if (nextPage >= totalPages) {
      setHasMore(false);
      return;
    }
    try {
      const response = await backendApi.getReviews(nextPage, reviewsPerPage);
      if (response.content) {
        const formattedReviews = response.content.map((review: any) => ({
          ...review, // 기존 속성들 유지
          createdAt: convertBackendDateToISO(review.createdAt),
          comments: [],
          user: {
            id: review.userId,
            username: review.username,
            profileImageUrl: review.userProfileImageUrl,
            reviewCount: 0,
          },
          // 백엔드의 moviePosterPath를 프론트엔드의 moviePoster로 명시적 매핑
          moviePoster: review.moviePosterPath,
        }));
        setReviews((prev) => [...prev, ...formattedReviews]);
        setVisibleReviews((prev) => [...prev, ...formattedReviews]);
        setPage(nextPage);
        setHasMore(response.totalPages > nextPage + 1);
      }
    } catch (error) {
      console.error("영화 리뷰 더 불러오기 실패:", error);
      toast.error("리뷰를 더 불러오는데 실패했습니다.");
    }
  };

  // 포스터 URL 가져오기 함수
  const getPosterUrl = (posterPath: string | null, size = "original") => {
    return backendApi.getPosterUrl(posterPath, size);
  };

  // 폼 리셋 함수 추가
  const resetForm = () => {
    setTitle("");
    setContent("");
    setRating(0);
    setSelectedMovie(null);
    setIsSpoiler(false);
    setSearchResults([]);
    setMovieQuery("");
    setMovieSearchQuery("");
    setMovieSearchResults([]);
    setIsSearchingMovie(false);
  };

  const [editingReviewId, setEditingReviewId] = useState<number | null>(null);

  // 로그인 사용자가 댓글 작성자인지 확인하는 함수
  const isCommentAuthor = useCallback(
    (commentUserId: number | undefined) => {
      if (!isLoggedIn || !user || !commentUserId) {
        console.log("댓글 작성자 확인 실패 - 정보 부족:", {
          isLoggedIn,
          user: user ? `ID: ${user.id}` : "없음",
          commentUserId: commentUserId || "없음",
        });
        return false;
      }

      const userIdString = String(user.id);
      const commentUserIdString = String(commentUserId);

      console.log("댓글 작성자 비교:", {
        userIdString,
        commentUserIdString,
        isMatch: userIdString === commentUserIdString,
      });

      return userIdString === commentUserIdString;
    },
    [isLoggedIn, user]
  );

  // 좋아요 처리
  const handleReviewLike = async (reviewId: number) => {
    if (!isLoggedIn) {
      navigate("/login", { state: { from: location } });
      return;
    }

    try {
      // 현재 리뷰 상태 확인
      const currentReview = reviews.find((r) => r.id === reviewId);
      const wasLiked = currentReview?.isLiked || false;

      // 실제 API 호출
      const updatedReview = await backendApi.likeReview(reviewId);
      console.log("서버 응답 (좋아요):", updatedReview);

      // isLiked 상태를 수동으로 계산
      // 좋아요를 눌렀는데 좋아요 수가 증가했으면 좋아요가 추가된 것
      // 좋아요를 눌렀는데 좋아요 수가 감소했으면 좋아요가 취소된 것
      const nowLiked = !wasLiked;

      const updateReviewState = (review: MovieReview) =>
        review.id === reviewId
          ? {
              ...review,
              isLiked: nowLiked,
              likeCount: updatedReview.likeCount,
              isDisliked: false,
              dislikeCount: updatedReview.dislikeCount,
            }
          : review;

      // 리뷰 목록 업데이트
      setReviews((prevReviews) => prevReviews.map(updateReviewState));
      setVisibleReviews((prevReviews) => prevReviews.map(updateReviewState));
      setSearchResults((prevResults) => prevResults.map(updateReviewState));

      toast.success(
        nowLiked ? "좋아요가 추가되었습니다." : "좋아요가 취소되었습니다."
      );
    } catch (error) {
      console.error("좋아요 처리 실패:", error);
      toast.error("좋아요 처리에 실패했습니다.");
    }
  };

  // 싫어요 처리
  const handleReviewDislike = async (reviewId: number) => {
    if (!isLoggedIn) {
      navigate("/login", { state: { from: location } });
      return;
    }

    try {
      // 현재 리뷰 상태 확인
      const currentReview = reviews.find((r) => r.id === reviewId);
      const wasDisliked = currentReview?.isDisliked || false;

      // 실제 API 호출
      const updatedReview = await backendApi.dislikeReview(reviewId);
      console.log("서버 응답 (싫어요):", updatedReview);

      // isDisliked 상태를 수동으로 계산
      const nowDisliked = !wasDisliked;

      const updateReviewState = (review: MovieReview) =>
        review.id === reviewId
          ? {
              ...review,
              isDisliked: nowDisliked,
              dislikeCount: updatedReview.dislikeCount,
              isLiked: false,
              likeCount: updatedReview.likeCount,
            }
          : review;

      // 리뷰 목록 업데이트
      setReviews((prevReviews) => prevReviews.map(updateReviewState));
      setVisibleReviews((prevReviews) => prevReviews.map(updateReviewState));
      setSearchResults((prevResults) => prevResults.map(updateReviewState));

      toast.success(
        nowDisliked ? "싫어요가 추가되었습니다." : "싫어요가 취소되었습니다."
      );
    } catch (error) {
      console.error("싫어요 처리 실패:", error);
      toast.error("싫어요 처리에 실패했습니다.");
    }
  };

  // 영화 상세 페이지로 이동하는 함수
  const navigateToMovieDetail = (movieId: number) => {
    navigate(`/movie/${movieId}`);
  };

  // 신고 관련 상태 추가
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportContent, setReportContent] = useState("");
  const [reportTargetId, setReportTargetId] = useState<number | null>(null);
  const [reportTargetType, setReportTargetType] = useState<
    "comment" | "review" | null
  >(null);

  // 이미 신고한 항목인지 확인하는 함수
  const isAlreadyReported = (
    id: number,
    type: "comment" | "review"
  ): boolean => {
    const reportedItems = JSON.parse(
      localStorage.getItem("reportedItems") || "{}"
    );
    const key = `${type}_${id}`;
    return !!reportedItems[key];
  };

  // 신고 기록을 저장하는 함수
  const saveReportRecord = (id: number, type: "comment" | "review"): void => {
    const reportedItems = JSON.parse(
      localStorage.getItem("reportedItems") || "{}"
    );
    const key = `${type}_${id}`;
    reportedItems[key] = true;
    localStorage.setItem("reportedItems", JSON.stringify(reportedItems));
  };

  // 신고 모달 열기 함수
  const openReportModal = (id: number, type: "comment" | "review") => {
    // 이미 신고한 항목인지 확인
    if (isAlreadyReported(id, type)) {
      toast.warning("이미 신고한 항목입니다.");
      return;
    }

    setReportTargetId(id);
    setReportTargetType(type);
    setReportContent("");
    setShowReportModal(true);
  };

  // 신고 제출 처리 함수
  const handleReportSubmit = async () => {
    if (!reportContent.trim()) {
      toast.error("신고 내용을 자세히 입력해주세요.");
      return;
    }

    try {
      let targetUserId = 0;

      if (reportTargetType === "review") {
        // 리뷰 신고인 경우
        const targetReview = reviews.find((r) => r.id === reportTargetId);
        targetUserId = targetReview?.user?.id || 0;
      } else if (reportTargetType === "comment") {
        // 댓글 신고인 경우 - 모든 리뷰의 모든 댓글을 확인
        for (const review of reviews) {
          if (review.comments) {
            const targetComment = review.comments.find(
              (c) => c.id === reportTargetId
            );
            if (targetComment) {
              // userId 필드를 우선적으로 사용하고, 없으면 user.id를 시도
              targetUserId =
                targetComment.userId || targetComment.user?.id || 0;
              console.log(
                `댓글 ID ${reportTargetId}에 대한 사용자 ID를 찾았습니다: ${targetUserId}`
              );
              break;
            }
          }
        }
      }

      // 대상 사용자 ID가 없는 경우 로그
      if (targetUserId === 0) {
        console.warn(
          `신고 대상의 사용자 ID를 찾을 수 없습니다. 타입: ${reportTargetType}, 대상 ID: ${reportTargetId}`
        );
      }

      console.log(`신고 요청 데이터:`, {
        targetId: reportTargetId,
        targetUserId: targetUserId,
        reportType: reportTargetType === "review" ? "review" : "comment",
        content: reportContent,
      });

      await backendApi.createReport({
        targetId: reportTargetId!,
        targetUserId: targetUserId,
        reportType: reportTargetType === "review" ? "review" : "comment",
        content: reportContent,
      });

      // 신고 성공 시 로컬 스토리지에 기록
      if (reportTargetId && reportTargetType) {
        saveReportRecord(reportTargetId, reportTargetType);
      }

      toast.success("신고가 접수되었습니다.");
      setShowReportModal(false);
      setReportContent("");
      setReportTargetId(null);
      setReportTargetType(null);
    } catch (error) {
      console.error("신고 접수 실패:", error);
      toast.error("신고 접수에 실패했습니다. 다시 시도해주세요.");
    }
  };

  // Admin 권한을 확인하는 함수 추가
  const isAdmin = () => {
    return (
      user?.roles?.includes("ROLE_ADMIN") ||
      user?.roles?.includes("ROLE_MODERATOR") ||
      false
    );
  };

  // 글쓰기 버튼 클릭 처리 핸들러
  const handleWriteButtonClick = async () => {
    try {
      if (isUserBlocked()) {
        toast.error(
          "현재 글쓰기 기능이 제한되었습니다. 관리자에게 문의해주세요."
        );
        return;
      }

      // 정상 상태인 경우 글쓰기 폼 표시
      setShowWriteForm(true);
    } catch (error) {
      console.error("사용자 상태 확인 실패:", error);
      toast.error("사용자 정보를 확인할 수 없습니다. 다시 시도해주세요.");
    }
  };

  // Optionally reset page number if needed, e.g., setPage(0);

  // --- Start: Restore toggleComments and fetchReviewComments ---

  // 댓글 토글 함수 - 댓글 보여주기/숨기기 및 댓글 데이터 로드
  const toggleComments = async (reviewId: number) => {
    console.log(
      "댓글 토글 시도:",
      reviewId,
      "현재 확장 ID:",
      expandedCommentId
    );
    // 이미 확장된 댓글이면 닫기
    if (expandedCommentId === reviewId) {
      console.log(`리뷰 ${reviewId} 댓글 닫기`);
      setExpandedCommentId(null);
      return;
    }

    // 댓글 로딩 상태 설정 (선택적)
    // setLoading(true); // 필요하다면 로딩 상태 관리 추가

    try {
      console.log(`리뷰 ${reviewId} 댓글 로드 시작`);
      // 댓글 데이터 가져오기 (fetchReviewComments 함수 사용)
      const comments = await fetchReviewComments(reviewId);
      console.log(`리뷰 ${reviewId} 댓글 로드 완료:`, comments);
      // 성공적으로 댓글을 가져왔으면 해당 리뷰의 댓글 섹션 확장
      setExpandedCommentId(reviewId);
      console.log(`리뷰 ${reviewId} 댓글 확장됨`);
    } catch (error) {
      console.error(`리뷰 ID ${reviewId}의 댓글 목록 불러오기 실패:`, error);
      toast.error("댓글 목록을 불러오는데 실패했습니다.");
      setExpandedCommentId(null); // 에러 발생 시 확장 상태 해제
    } finally {
      // setLoading(false); // 로딩 상태 해제
    }
  };

  // 특정 리뷰의 댓글 목록을 가져오고 상태를 업데이트하는 함수
  const fetchReviewComments = async (reviewId: number): Promise<Comment[]> => {
    try {
      console.log(`API 호출: 리뷰 ID ${reviewId}의 댓글 목록 가져오기`);
      const response = await backendApi.getReviewComments(reviewId);
      console.log(`리뷰 ID ${reviewId} 댓글 API 응답 원본:`, response);

      if (!response || !response.content || !Array.isArray(response.content)) {
        console.warn(
          `리뷰 ID ${reviewId}에 대한 댓글 데이터 형식이 잘못되었거나 데이터가 없습니다.`
        );
        // 댓글 데이터가 없어도 리뷰 상태 업데이트 (빈 배열로)
        updateReviewCommentsState(reviewId, []);
        return []; // 빈 배열 반환
      }

      const mappedComments: Comment[] = response.content.map(
        (comment: CommentResponse) => {
          const dateValue = comment.created_at || comment.createdAt;
          const createdAt = convertBackendDateToISO(dateValue);
          const userId =
            comment.user_id ?? comment.userId ?? comment.user?.userId ?? 0;
          const username =
            comment.username ?? comment.user?.username ?? "알 수 없음";
          const profileImageUrl =
            comment.user_profile_image_url ?? comment.user?.profileUrl ?? null;

          return {
            id: comment.id,
            content: comment.content,
            createdAt: createdAt,
            username: username,
            profileImageUrl: profileImageUrl,
            likeCount: comment.likeCount || 0,
            dislikeCount: comment.dislikeCount || 0,
            userId: userId,
          };
        }
      );

      console.log(`리뷰 ID ${reviewId} 매핑된 댓글:`, mappedComments);

      // 댓글 데이터로 리뷰 상태 업데이트
      updateReviewCommentsState(reviewId, mappedComments);

      return mappedComments;
    } catch (error) {
      console.error(`리뷰 ID ${reviewId} 댓글 목록 가져오기 실패:`, error);
      toast.error("댓글 목록을 불러오는 중 오류가 발생했습니다.");
      // 에러 발생 시에도 리뷰 상태 업데이트 (빈 배열로)
      updateReviewCommentsState(reviewId, []);
      throw error; // 에러를 다시 던져 toggleComments에서 처리하도록 함
    }
  };

  // 리뷰 상태 업데이트 로직 분리 (코드 중복 방지)
  const updateReviewCommentsState = (reviewId: number, comments: Comment[]) => {
    setReviews((prevReviews) =>
      prevReviews.map((review) =>
        review.id === reviewId ? { ...review, comments: comments } : review
      )
    );
    setVisibleReviews((prevVisibleReviews) =>
      prevVisibleReviews.map((review) =>
        review.id === reviewId ? { ...review, comments: comments } : review
      )
    );
  };

  // --- End: Restore toggleComments and fetchReviewComments ---

  // Determine reviews to render
  const reviewsToRender = showSearch ? searchResults : visibleReviews;

  // 프로필 이미지 URL 처리 함수 추가
  const getProfileImageUrl = (imageUrl: string | null | undefined): string | undefined => {
    if (!imageUrl) return undefined; // null 또는 undefined 이면 undefined 반환

    // 절대 URL이면 그대로 사용
    if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
      return imageUrl;
    }

    // 상대 URL이면 BASE_URL 추가
    const separator = (!BASE_URL.endsWith('/') && !imageUrl.startsWith('/')) ? '/' : '';
    return `${BASE_URL}${separator}${imageUrl}`;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* 리뷰 작성 버튼 */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">영화 리뷰</h1>
        {isLoggedIn && (
          <button
            onClick={handleWriteButtonClick}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
          >
            리뷰 작성
          </button>
        )}
      </div>

      {/* 검색 바 */}
      <div className="mb-6">
        <div className="relative">
          <form onSubmit={handleSearch} className="flex">
            <div className="relative flex-1">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                <button
                  type="button"
                  onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                  className="text-gray-500 hover:text-gray-700 focus:outline-none"
                >
                  {getCategoryText()} <FaCaretDown className="inline" />
                </button>
              </div>

              {showCategoryDropdown && (
                <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                  <div
                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                    onClick={() => {
                      setSearchCategory("title");
                      setShowCategoryDropdown(false);
                    }}
                  >
                    제목
                  </div>
                  <div
                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                    onClick={() => {
                      setSearchCategory("content");
                      setShowCategoryDropdown(false);
                    }}
                  >
                    내용
                  </div>
                  <div
                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                    onClick={() => {
                      setSearchCategory("author");
                      setShowCategoryDropdown(false);
                    }}
                  >
                    작성자
                  </div>
                </div>
              )}

              <input
                type="text"
                placeholder="검색어를 입력하세요..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-24 pr-10 py-2 border border-gray-300 rounded-l focus:outline-none focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              className="px-6 py-2 bg-blue-500 text-white rounded-r hover:bg-blue-600 transition-colors"
            >
              검색
            </button>
          </form>
        </div>
      </div>

      {/* 리뷰 목록 */}
      <InfiniteScroll
        dataLength={reviewsToRender.length}
        next={fetchMoreReviews}
        hasMore={hasMore}
        loader={
          <div className="flex justify-center my-4">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        }
        endMessage={
          <div className="text-center text-gray-500 my-4">
            {reviewsToRender.length > 0
              ? "모든 리뷰를 불러왔습니다."
              : "작성된 리뷰가 없습니다."}
          </div>
        }
      >
        <div className="space-y-6">
          {reviewsToRender.map((review) => (
            <div
              key={review.id}
              className="border border-gray-200 rounded-lg bg-white p-4 shadow-sm"
            >
              {/* 리뷰 헤더 - 작성자 정보 */}
              <div className="flex items-center mb-4">
                <Link
                  to={
                    review.user.id === user?.id
                      ? "/profile"
                      : `/user-profile/${review.user.id}`
                  }
                  className="flex-shrink-0"
                >
                  <div className="w-10 h-10 bg-gray-200 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center cursor-pointer">
                    {review.user?.profileImageUrl ? (
                      <img
                        src={`${BASE_URL}${review.user.profileImageUrl}`}
                        alt={review.user?.username || "사용자"}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          if (e.currentTarget.src !== defaultAvatar) {
                            e.currentTarget.src = defaultAvatar;
                          }
                        }}
                      />
                    ) : (
                      <FaUser className="text-gray-400 w-full h-full p-2" />
                    )}
                  </div>
                </Link>
                <div className="ml-3">
                  <div className="text-xs text-gray-500">작성자 이름</div>
                  <Link
                    to={
                      review.user.id === user?.id
                        ? "/profile"
                        : `/user-profile/${review.user.id}`
                    }
                    className="font-bold hover:underline"
                  >
                    {review.user.username}{" "}
                    {review.user.reviewCount > 0 &&
                      `(${review.user.reviewCount})`}
                  </Link>
                </div>
                <div className="ml-auto flex items-center">
                  {renderStars(review.rating)}
                </div>
              </div>

              {/* 리뷰 제목 */}
              <div className="mb-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={`inline-block transition-all duration-300 ${
                        review.isSpoiler ? "blur-sm hover:blur-none" : ""
                      }`}
                    >
                      <h3 className="text-xl font-bold">{review.title}</h3>
                    </div>
                    {review.isSpoiler && (
                      <span className="text-xs bg-red-500 text-white px-2 py-1 rounded">
                        스포일러
                      </span>
                    )}
                  </div>
                  {isLoggedIn &&
                    (user?.id === review.user.id ||
                      user?.roles?.includes("ROLE_ADMIN") ||
                      false) && (
                      <div className="flex space-x-2">
                        {user?.id === review.user.id && !isUserBlocked() && (
                          <button
                            onClick={() => handleEditReview(review)}
                            className="text-gray-500 hover:text-blue-500"
                            title="수정"
                          >
                            <FaEdit />
                          </button>
                        )}
                        {((user?.id === review.user.id && !isUserBlocked()) ||
                          user?.roles?.includes("ROLE_ADMIN") ||
                          false) && (
                          <button
                            onClick={() => handleDeleteReview(review.id)}
                            className="text-gray-500 hover:text-red-500"
                            title="삭제"
                          >
                            <FaTrash />
                          </button>
                        )}
                      </div>
                    )}
                </div>
              </div>

              {/* 영화 정보와 리뷰 내용 */}
              <div className="flex flex-col sm:flex-row mb-4">
                {/* Poster Container */}
                <div className="flex flex-col w-full sm:w-32 mb-3 sm:mb-0 sm:mr-4 flex-shrink-0 items-center sm:items-start">
                  {review.moviePoster ? (
                    // Apply aspect ratio to this wrapper div
                    <div
                      className="cursor-pointer w-full aspect-[2/3] mb-1" // Added aspect-ratio and adjusted margin
                      onClick={() => navigateToMovieDetail(review.movieId)}
                    >
                      <img
                        src={getPosterUrl(review.moviePoster, "w500")}
                        alt={review.movieTitle}
                        // Image fills the aspect ratio container, keep object-cover and rounded
                        className="w-full h-full object-cover rounded"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            "https://via.placeholder.com/500x750?text=No+Image";
                        }}
                      />
                    </div>
                  ) : (
                    // Apply same aspect ratio to placeholder wrapper
                    <div
                      className="cursor-pointer w-full aspect-[2/3] mb-1"
                      onClick={() => navigateToMovieDetail(review.movieId)}
                    >
                      {/* Placeholder fills the aspect ratio container */}
                      <div className="w-full h-full bg-gray-200 rounded flex items-center justify-center">
                        <FaFilm className="text-gray-400 text-4xl" />
                      </div>
                    </div>
                  )}
                  {/* Movie title below the aspect ratio container */}
                  <p
                    className="text-sm font-semibold text-center w-full truncate max-w-full" // Use max-w-full for consistency
                    title={review.movieTitle}
                  >
                    {review.movieTitle}
                  </p>
                </div>
                {/* Content Container - Add min-w-0 */}
                <div className="flex-1 min-w-0">
                  <div
                    className={`transition-all duration-300 ${
                      review.isSpoiler ? "blur-sm hover:blur-none" : ""
                    }`}
                  >
                    <p className="text-gray-700 break-words whitespace-pre-wrap">
                      {review.content}
                    </p>
                  </div>
                </div>
              </div>

              {/* 리뷰 액션 버튼 */}
              <div className="flex items-center justify-between border-t pt-3">
                <div className="text-xs text-gray-500">
                  {(() => {
                    console.log(
                      `리뷰 ID ${review.id}의 날짜 표시 전 값:`,
                      review.createdAt
                    );
                    const formattedDate = formatDate(review.createdAt);
                    console.log(
                      `리뷰 ID ${review.id}의 날짜 표시 후 값:`,
                      formattedDate
                    );
                    return formattedDate;
                  })()}
                </div>
                <div className="flex items-center space-x-4">
                  {isLoggedIn &&
                    !isUserBlocked() &&
                    user?.id !== review.user.id && (
                      <button
                        className="flex items-center space-x-1"
                        title="리뷰 신고하기"
                        onClick={() => openReportModal(review.id, "review")}
                      >
                        <FaBell className="text-red-500" />
                      </button>
                    )}
                  <button
                    onClick={() => handleReviewLike(review.id)}
                    className="flex items-center space-x-1"
                  >
                    <FaThumbsUp
                      className={
                        review.isLiked ? "text-blue-500" : "text-gray-500"
                      }
                    />
                    <span className="text-gray-500">
                      {review.likeCount || 0}
                    </span>
                  </button>
                  <button
                    onClick={() => handleReviewDislike(review.id)}
                    className="flex items-center space-x-1"
                  >
                    <FaThumbsDown
                      className={
                        review.isDisliked ? "text-red-500" : "text-gray-500"
                      }
                    />
                    <span className="text-gray-500">
                      {review.dislikeCount || 0}
                    </span>
                  </button>
                  <button
                    onClick={() => toggleComments(review.id)}
                    className="flex items-center space-x-1"
                  >
                    <FaComment className="text-gray-500" />
                    <span className="text-gray-500">
                      댓글 {review.commentCount || 0}개
                    </span>
                  </button>
                </div>
              </div>

              {/* 댓글 섹션 */}
              {expandedCommentId === review.id && (
                <div className="mt-4 pt-4 border-t">
                  <div className="text-sm font-bold mb-3">
                    댓글 {review.comments?.length || 0}개
                  </div>

                  <div className="space-y-3 mb-4">
                    {review.comments && review.comments.length > 0 ? (
                      review.comments.map((comment) => (
                        <div
                          key={comment.id}
                          className="flex items-start space-x-2"
                        >
                          <Link
                            to={
                              comment.userId === user?.id
                                ? "/profile"
                                : `/user-profile/${comment.userId}`
                            }
                            className="flex-shrink-0"
                          >
                            <div className="w-8 h-8 bg-gray-200 rounded-full overflow-hidden flex items-center justify-center cursor-pointer">
                              {comment.profileImageUrl ? (
                                <img
                                  src={getProfileImageUrl(
                                    comment.profileImageUrl
                                  )}
                                  alt={comment.username}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <FaUser className="text-gray-400" />
                              )}
                            </div>
                          </Link>
                          <div className="flex-1">
                            <div className="flex justify-between mb-1">
                              <Link
                                to={
                                  comment.userId === user?.id
                                    ? "/profile"
                                    : `/user-profile/${comment.userId}`
                                }
                                className="font-medium hover:underline"
                              >
                                {comment.username || "알 수 없는 사용자"}
                              </Link>
                              <div className="flex items-center gap-2">
                                {/* 댓글 작성 날짜와 신고 버튼 */}
                                <div className="flex justify-between items-center mb-1">
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs text-gray-500">
                                      {formatDate(comment.createdAt)}
                                    </span>
                                    {isLoggedIn &&
                                      !isUserBlocked() &&
                                      user?.id !== comment.userId && (
                                        <button
                                          className="p-1 hover:bg-gray-100 rounded-full"
                                          title="댓글 신고하기"
                                          onClick={() =>
                                            openReportModal(
                                              comment.id,
                                              "comment"
                                            )
                                          }
                                        >
                                          <FaBell className="text-red-500 text-xs" />
                                        </button>
                                      )}
                                  </div>
                                  {isLoggedIn &&
                                    ((user?.id === comment.userId &&
                                      !isUserBlocked()) ||
                                      user?.roles?.includes("ROLE_ADMIN") ||
                                      false) && (
                                      <button
                                        onClick={() =>
                                          handleDeleteComment(
                                            review.id,
                                            comment.id
                                          )
                                        }
                                        className="text-xs text-gray-500 hover:text-red-500"
                                        title="삭제"
                                      >
                                        <FaTrash />
                                      </button>
                                    )}
                                </div>
                              </div>
                            </div>
                            <p className="text-sm">{comment.content}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-gray-500 py-4">
                        <div>아직 댓글이 없습니다. 첫 댓글을 작성해보세요!</div>
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex border rounded overflow-hidden">
                      <input
                        type="text"
                        value={commentContent}
                        onChange={(e) => setCommentContent(e.target.value)}
                        placeholder={
                          isUserBlocked()
                            ? "댓글 작성이 제한되었습니다"
                            : "댓글을 입력하세요..."
                        }
                        className="w-full p-2 text-sm focus:outline-none flex-1"
                        disabled={!isLoggedIn || isUserBlocked()}
                      />
                      <button
                        onClick={() => handleCommentSubmit(review.id)}
                        className="px-4 bg-blue-500 text-white text-sm hover:bg-blue-600 transition-colors"
                        disabled={
                          !isLoggedIn ||
                          !commentContent.trim() ||
                          isUserBlocked()
                        }
                      >
                        등록
                      </button>
                    </div>
                    {isLoggedIn && isUserBlocked() && (
                      <p className="text-xs text-red-500 mt-1">
                        현재 댓글 기능이 제한되었습니다. 관리자에게
                        문의해주세요.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </InfiniteScroll>

      {/* 리뷰 작성 모달 */}
      {showWriteForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">
                {editingReviewId ? "리뷰 수정" : "리뷰 작성"}
              </h2>
              <button
                onClick={() => {
                  setShowWriteForm(false);
                  resetForm();
                  setEditingReviewId(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleSubmitReview} className="space-y-4">
              {/* 영화 검색 */}
              <div className="mb-4">
                <label className="block text-gray-700 font-medium mb-2">
                  영화 선택
                </label>
                <div className="relative">
                  {selectedMovie ? (
                    <div className="flex items-center space-x-4 p-2 border rounded">
                      <div className="w-24 h-36 relative">
                        <img
                          src={getPosterUrl(selectedMovie.poster_path, "w500")}
                          alt={selectedMovie.title}
                          className="w-full h-full object-cover rounded"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              "https://via.placeholder.com/1000x1500?text=No+Image";
                          }}
                        />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold">{selectedMovie.title}</h3>
                        <p className="text-sm text-gray-500">
                          {selectedMovie.release_date
                            ? new Date(selectedMovie.release_date).getFullYear()
                            : "연도 정보 없음"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleClearSelectedMovie}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <FaTimes />
                      </button>
                    </div>
                  ) : (
                    <input
                      type="text"
                      placeholder="영화 제목 검색"
                      value={movieSearchQuery}
                      onChange={handleMovieSearchChange}
                      onClick={() => setIsSearchingMovie(true)}
                      className="w-full p-2 border rounded focus:outline-none focus:border-blue-500"
                    />
                  )}

                  {isSearchingMovie && movieSearchResults.length > 0 && (
                    <div className="absolute left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white border rounded shadow-lg">
                      {movieSearchResults.map((movie) => (
                        <div
                          key={movie.id}
                          className="flex items-center p-2 hover:bg-gray-100 cursor-pointer"
                          onClick={() => handleSelectMovie(movie)}
                        >
                          {movie.poster_path ? (
                            <img
                              src={getPosterUrl(movie.poster_path, "w342")}
                              alt={movie.title}
                              className="w-16 h-24 object-cover rounded mr-2"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src =
                                  "https://via.placeholder.com/342x513?text=No+Image";
                              }}
                            />
                          ) : (
                            <div className="w-16 h-24 bg-gray-200 rounded mr-2 flex items-center justify-center">
                              <FaFilm className="text-gray-400" />
                            </div>
                          )}
                          <div>
                            <div className="font-medium">{movie.title}</div>
                            <div className="text-sm text-gray-500">
                              {movie.release_date
                                ? new Date(movie.release_date).getFullYear()
                                : "연도 정보 없음"}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 리뷰 제목 */}
              <div>
                <label className="block text-gray-700 font-medium mb-2">
                  제목
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-2 border rounded focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              {/* 별점 */}
              <div>
                <label className="block text-gray-700 font-medium mb-2">
                  별점
                </label>
                <div className="flex items-center space-x-1">
                  {[0, 1, 2, 3, 4].map((index) => (
                    <div key={index} className="text-2xl flex">
                      {/* 별 왼쪽 부분 (0.5 점) */}
                      <div
                        onClick={() => handleRatingClick(index, true)}
                        className="w-[0.5em] h-[1em] overflow-hidden cursor-pointer"
                        title={`${index + 0.5}점`}
                      >
                        {index + 0.5 <= rating ? (
                          <div className="text-yellow-400 w-[1em]">
                            <FaStar />
                          </div>
                        ) : (
                          <div className="text-gray-300 w-[1em]">
                            <FaStar />
                          </div>
                        )}
                      </div>

                      {/* 별 오른쪽 부분 (1.0 점) */}
                      <div
                        onClick={() => handleRatingClick(index, false)}
                        className="w-[0.5em] h-[1em] overflow-hidden cursor-pointer"
                        title={`${index + 1}점`}
                      >
                        {index + 1 <= rating ? (
                          <div className="text-yellow-400 w-[1em] ml-[-0.5em]">
                            <FaStar />
                          </div>
                        ) : (
                          <div className="text-gray-300 w-[1em] ml-[-0.5em]">
                            <FaStar />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  <span className="ml-2 text-lg font-medium text-yellow-500">
                    ({rating.toFixed(1)})
                  </span>
                </div>
              </div>

              {/* 리뷰 내용 */}
              <div>
                <label className="block text-gray-700 font-medium mb-2">
                  내용
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={6}
                  className="w-full p-2 border rounded focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              {/* 스포일러 체크박스 */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="spoiler"
                  checked={isSpoiler}
                  onChange={(e) => setIsSpoiler(e.target.checked)}
                  className="mr-2"
                />
                <label htmlFor="spoiler" className="text-gray-700">
                  스포일러 포함
                </label>
              </div>

              {/* 제출 버튼 */}
              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowWriteForm(false);
                    resetForm();
                    setEditingReviewId(null);
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={submitting || !selectedMovie}
                  className={`px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors ${
                    (submitting || !selectedMovie) &&
                    "opacity-50 cursor-not-allowed"
                  }`}
                >
                  {submitting
                    ? "저장 중..."
                    : editingReviewId
                      ? "수정"
                      : "저장"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 최상단으로 이동 버튼 */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 bg-blue-500 text-white p-3 rounded-full shadow-lg hover:bg-blue-600 transition-colors"
        >
          <FaArrowUp />
        </button>
      )}

      {/* 스포일러 컨텐츠에 대한 CSS 스타일 */}
      <style>
        {`
          .spoiler-content {
            filter: blur(4px);
            transition: filter 0.3s ease;
          }
          .spoiler-content:hover {
            filter: blur(0);
          }
        `}
      </style>

      {/* 신고 모달 */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="relative w-full max-w-md bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center mb-4">
              <FaExclamationTriangle className="text-red-500 mr-2" />
              <h2 className="text-xl font-bold">
                {reportTargetType === "comment" ? "댓글 신고" : "리뷰 신고"}
              </h2>
              <button
                onClick={() => setShowReportModal(false)}
                className="absolute right-4 top-4 text-gray-500 hover:text-gray-700"
              >
                <FaTimes />
              </button>
            </div>

            <textarea
              value={reportContent}
              onChange={(e) => setReportContent(e.target.value)}
              placeholder="신고 내용을 자세히 입력해주세요..."
              className="w-full h-32 p-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500"
            ></textarea>

            <div className="mt-4 flex justify-end space-x-2">
              <button
                onClick={() => setShowReportModal(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                취소
              </button>
              <button
                onClick={handleReportSubmit}
                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
              >
                신고
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MovieReviewsPage;
