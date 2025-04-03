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
} from "react-icons/fa";
import { FaStarHalfStroke, FaFilm } from "react-icons/fa6";
import { Link, useNavigate, useLocation } from "react-router-dom";
import InfiniteScroll from "react-infinite-scroll-component";
import { backendApi } from "../api/backendApi";
import { toast } from "react-toastify";
import { Content } from "../types/content";
import axios from "axios";

// Content 타입을 Movie 타입으로 매핑하는 함수
const mapContentToMovie = (content: Content): Movie => {
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

interface ReviewResponse {
  content: {
    id: number;
    username: string;
    user_profile_image_url: string | null;
    movie_id: number;
    movie_title: string;
    movie_poster_path: string | null;
    title: string;
    content: string;
    rating: number;
    created_at: string;
    updated_at: string | null;
    comment_count: number;
    is_spoiler: boolean;
  }[];
  totalElements: number;
  totalPages: number;
  currentPage: number;
  size: number;
}

const MovieReviewsPage: React.FC = () => {
  const { isLoggedIn, user } = useAuth();
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
      setMovieSearchResults(movies);
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
  const fetchReviews = async () => {
    try {
      setLoading(true);
      const response = await backendApi.getReviews(page, reviewsPerPage);
      console.log("리뷰 API 응답 원본:", JSON.stringify(response, null, 2));

      if (response && response.content) {
        const validReviews = response.content.filter(
          (review: ReviewResponse["content"][0]) =>
            review && review.id && review.username && review.movie_id
        );
        console.log("유효한 리뷰:", validReviews);
        console.log(
          "리뷰의 comment_count 값들:",
          validReviews.map((review: ReviewResponse["content"][0]) => ({
            id: review.id,
            comment_count: review.comment_count,
          }))
        );

        const mappedComments: Comment[] = [];
        console.log(`리뷰 ID ${validReviews[0].id}의 댓글 데이터:`, []);
        console.log(
          `리뷰 ID ${validReviews[0].id}의 변환된 댓글:`,
          mappedComments
        );

        const mappedReviews = validReviews.map(
          (review: ReviewResponse["content"][0]) => {
            return {
              id: review.id,
              title: review.title,
              content: review.content,
              rating: review.rating,
              movieTitle: review.movie_title,
              movieId: review.movie_id,
              moviePoster: review.movie_poster_path || "",
              createdAt: new Date(review.created_at),
              comments: mappedComments,
              likes: [],
              dislikes: [],
              isSpoiler: review.is_spoiler,
              isLiked: false,
              isDisliked: false,
              likeCount: 0,
              dislikeCount: 0,
              commentCount: review.comment_count ?? 0,
              user: {
                id: 0,
                username: review.username,
                profileImageUrl: review.user_profile_image_url,
                reviewCount: 0,
              },
            };
          }
        );

        console.log("변환된 리뷰:", mappedReviews);

        if (page === 0) {
          setReviews(mappedReviews);
          setVisibleReviews(mappedReviews);
        } else {
          setReviews((prev) => [...prev, ...mappedReviews]);
          setVisibleReviews((prev) => [...prev, ...mappedReviews]);
        }

        setTotalPages(response.totalPages || 0);
        setHasMore(response.currentPage < (response.totalPages || 0) - 1);
      } else {
        console.error("Invalid response format:", response);
        setReviews([]);
        setVisibleReviews([]);
        setTotalPages(0);
        setHasMore(false);
      }
    } catch (error) {
      console.error("리뷰 목록 불러오기 실패:", error);
      if (error instanceof Error && error.message === "로그인이 필요합니다.") {
        toast.error("로그인이 필요합니다.");
        navigate("/login", { state: { from: location } });
      } else {
        toast.error("리뷰 목록을 불러오는데 실패했습니다.");
      }
      setReviews([]);
      setVisibleReviews([]);
      setTotalPages(0);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  // useEffect에서 fetchReviews 호출
  useEffect(() => {
    fetchReviews();
  }, [page, navigate, location]);

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
        resetForm();
        setPage(0);
        fetchReviews();
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

  // 댓글 작성 처리
  const handleCommentSubmit = async (reviewId: number) => {
    if (!isLoggedIn) {
      navigate("/login", { state: { from: location } });
      return;
    }

    if (!commentContent.trim()) {
      toast.error("댓글 내용을 입력해주세요.");
      return;
    }

    try {
      // 실제 API 호출
      const response = await backendApi.addReviewComment(
        reviewId,
        commentContent
      );
      console.log("댓글 작성 서버 응답:", response);

      // 서버에서 반환한 댓글 데이터를 Comment 인터페이스에 맞게 변환
      const newComment: Comment = {
        id: response.id,
        content: response.content,
        createdAt: response.created_at,
        username: response.username,
        profileImageUrl: response.user_profile_image_url,
        likeCount: 0,
        dislikeCount: 0,
        userId: response.user_id,
      };

      // 리뷰 목록 업데이트
      const updatedReviews = reviews.map((review) =>
        review.id === reviewId
          ? {
              ...review,
              comments: [newComment, ...(review.comments || [])],
              commentCount: (review.commentCount || 0) + 1,
            }
          : review
      );

      setReviews(updatedReviews);
      setVisibleReviews(updatedReviews);
      setCommentContent("");
      toast.success("댓글이 등록되었습니다.");
    } catch (error) {
      console.error("댓글 작성 실패:", error);
      toast.error("댓글 작성에 실패했습니다.");
    }
  };

  // 날짜 포맷팅 함수
  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}일 전`;
    if (hours > 0) return `${hours}시간 전`;
    if (minutes > 0) return `${minutes}분 전`;
    return "방금 전";
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
      setSearchResults(reviews);
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

  // 검색 초기화
  const resetSearch = () => {
    setSearchQuery("");
    setSearchResults(reviews);
    setShowSearch(false);
    setShowSearchModal(false);
  };

  // 댓글 토글
  const toggleComments = async (reviewId: number) => {
    console.log("댓글 토글:", reviewId, "현재:", expandedCommentId);

    // 이미 확장된 경우 닫기
    if (expandedCommentId === reviewId) {
      setExpandedCommentId(null);
      return;
    }

    try {
      console.log(`리뷰 ID ${reviewId}의 댓글 목록 요청 시작`);
      // 댓글 로딩 상태 설정
      setLoading(true);

      // 댓글 데이터 가져오기 시도
      const response = await backendApi.getReviewComments(reviewId);
      console.log(`리뷰 ID ${reviewId}의 댓글 데이터:`, response);

      // 댓글 데이터 매핑
      const mappedComments: Comment[] = response.content.map(
        (comment: CommentResponse) => ({
          id: comment.id,
          content: comment.content,
          createdAt: comment.created_at,
          username: comment.username,
          profileImageUrl: comment.user_profile_image_url,
          likeCount: 0,
          dislikeCount: 0,
          userId: comment.user_id,
        })
      );

      console.log(`리뷰 ID ${reviewId}의 변환된 댓글:`, mappedComments);

      // 리뷰 상태 업데이트
      const updatedReviews = reviews.map((review) =>
        review.id === reviewId
          ? {
              ...review,
              comments: mappedComments,
            }
          : review
      );

      setReviews(updatedReviews);
      setVisibleReviews(updatedReviews);
      setExpandedCommentId(reviewId);
    } catch (error) {
      console.error(`리뷰 ID ${reviewId}의 댓글 목록 가져오기 실패:`, error);
      toast.error("댓글 목록을 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 좋아요 처리
  const handleReviewLike = async (reviewId: number) => {
    if (!isLoggedIn) {
      navigate("/login", { state: { from: location } });
      return;
    }

    try {
      // 실제 API 호출
      const updatedReview = await backendApi.likeReview(reviewId);
      console.log("서버 응답 (좋아요):", updatedReview);

      // 리뷰 목록 업데이트
      setReviews((prevReviews) =>
        prevReviews.map((review) =>
          review.id === reviewId
            ? {
                ...review,
                isLiked: updatedReview.isLiked,
                likeCount: updatedReview.likeCount,
                isDisliked: false,
                dislikeCount: updatedReview.dislikeCount,
              }
            : review
        )
      );

      // 검색 결과도 업데이트
      setSearchResults((prevResults) =>
        prevResults.map((review) =>
          review.id === reviewId
            ? {
                ...review,
                isLiked: updatedReview.isLiked,
                likeCount: updatedReview.likeCount,
                isDisliked: false,
                dislikeCount: updatedReview.dislikeCount,
              }
            : review
        )
      );

      toast.success(
        updatedReview.isLiked
          ? "좋아요가 추가되었습니다."
          : "좋아요가 취소되었습니다."
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
      // 실제 API 호출
      const updatedReview = await backendApi.dislikeReview(reviewId);
      console.log("서버 응답 (싫어요):", updatedReview);

      // 리뷰 목록 업데이트
      setReviews((prevReviews) =>
        prevReviews.map((review) =>
          review.id === reviewId
            ? {
                ...review,
                isDisliked: updatedReview.isDisliked,
                dislikeCount: updatedReview.dislikeCount,
                isLiked: false,
                likeCount: updatedReview.likeCount,
              }
            : review
        )
      );

      // 검색 결과도 업데이트
      setSearchResults((prevResults) =>
        prevResults.map((review) =>
          review.id === reviewId
            ? {
                ...review,
                isDisliked: updatedReview.isDisliked,
                dislikeCount: updatedReview.dislikeCount,
                isLiked: false,
                likeCount: updatedReview.likeCount,
              }
            : review
        )
      );

      toast.success(
        updatedReview.isDisliked
          ? "싫어요가 추가되었습니다."
          : "싫어요가 취소되었습니다."
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

  // 최상단으로 스크롤하는 함수
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // 다음 페이지 리뷰를 불러오는 함수
  const fetchMoreReviews = () => {
    if (!hasMore || loading) return;
    setPage(page + 1);
  };

  // 포스터 URL 가져오기 함수
  const getPosterUrl = (posterPath: string | null, size = "w154") => {
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
  };

  const fetchReviewComments = async (reviewId: number) => {
    try {
      console.log(`리뷰 ID ${reviewId}의 댓글 목록 요청 시작`);
      const response = await backendApi.getReviewComments(reviewId);
      console.log(`리뷰 ID ${reviewId}의 댓글 데이터 매핑 시작:`, response);

      const mappedComments: Comment[] = response.content.map(
        (comment: CommentResponse) => ({
          id: comment.id,
          content: comment.content,
          createdAt: comment.created_at,
          username: comment.username,
          profileImageUrl: comment.user_profile_image_url,
          likeCount: 0,
          dislikeCount: 0,
          userId: comment.user_id,
        })
      );

      console.log(`리뷰 ID ${reviewId}의 변환된 댓글:`, mappedComments);

      setReviews((prevReviews) =>
        prevReviews.map((review) =>
          review.id === reviewId
            ? { ...review, comments: mappedComments }
            : review
        )
      );
    } catch (error) {
      console.error(`리뷰 ID ${reviewId}의 댓글 목록 불러오기 실패:`, error);
      toast.error("댓글 목록을 불러오는데 실패했습니다.");
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
    // 삭제 확인
    if (!window.confirm("리뷰를 삭제하시겠습니까?")) {
      return;
    }

    try {
      await backendApi.deleteMovieReview(reviewId);
      // 성공적으로 삭제된 후 리뷰 목록 새로고침
      fetchReviews();
      toast.success("리뷰가 삭제되었습니다.");
    } catch (error) {
      console.error("리뷰 삭제 실패:", error);
      toast.error("리뷰 삭제에 실패했습니다.");
    }
  };

  // 댓글 삭제 핸들러 추가 (handleDeleteComment 함수)
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

  const [editingReviewId, setEditingReviewId] = useState<number | null>(null);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* 리뷰 작성 버튼 */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">영화 리뷰</h1>
        {isLoggedIn && (
          <button
            onClick={() => setShowWriteForm(true)}
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
        dataLength={visibleReviews.length}
        next={fetchMoreReviews}
        hasMore={hasMore}
        loader={
          <div className="flex justify-center my-4">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        }
        endMessage={
          <div className="text-center text-gray-500 my-4">
            {visibleReviews.length > 0
              ? "모든 리뷰를 불러왔습니다."
              : "작성된 리뷰가 없습니다."}
          </div>
        }
      >
        <div className="space-y-8">
          {visibleReviews.map((review) => (
            <div
              key={review.id}
              className="bg-white rounded-lg shadow p-6 border border-gray-300"
            >
              {/* 리뷰 헤더 - 작성자 정보 */}
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-gray-200 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center">
                  <FaUser className="text-gray-400 text-2xl" />
                </div>
                <div className="ml-3">
                  <div className="text-xs text-gray-500">작성자 이름</div>
                  <div className="font-bold">{review.user.username}</div>
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
                  {isLoggedIn && user?.username === review.user.username && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditReview(review)}
                        className="text-gray-600 hover:text-blue-600"
                        title="수정"
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => handleDeleteReview(review.id)}
                        className="text-gray-600 hover:text-red-600"
                        title="삭제"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* 영화 정보와 리뷰 내용 */}
              <div className="flex mb-4">
                {review.moviePoster && (
                  <img
                    src={getPosterUrl(review.moviePoster)}
                    alt={review.movieTitle}
                    className="w-24 h-36 object-cover rounded mr-4"
                  />
                )}
                <div className="flex-1">
                  <p className="text-sm text-gray-600 mb-2">
                    영화:{" "}
                    <span className="text-blue-600 font-medium">
                      {review.movieTitle}
                    </span>
                  </p>
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
                  {formatDate(review.createdAt)}
                </div>
                <div className="flex items-center space-x-4">
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
                          <div className="w-8 h-8 bg-gray-200 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center">
                            <FaUser className="text-gray-400" />
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between mb-1">
                              <span className="font-medium">
                                {comment.username || "알 수 없는 사용자"}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">
                                  {formatDate(new Date(comment.createdAt))}
                                </span>
                                {isLoggedIn &&
                                  user?.username === comment.username && (
                                    <button
                                      onClick={() =>
                                        handleDeleteComment(
                                          review.id,
                                          comment.id
                                        )
                                      }
                                      className="text-xs text-red-500 hover:text-red-700"
                                      title="삭제"
                                    >
                                      <FaTrash />
                                    </button>
                                  )}
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
                        placeholder="댓글을 입력하세요..."
                        className="w-full p-2 text-sm focus:outline-none flex-1"
                      />
                      <button
                        onClick={() => handleCommentSubmit(review.id)}
                        className="px-4 bg-blue-500 text-white text-sm hover:bg-blue-600 transition-colors"
                        disabled={!isLoggedIn || !commentContent.trim()}
                      >
                        등록
                      </button>
                    </div>
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
              <h2 className="text-2xl font-bold">리뷰 작성</h2>
              <button
                onClick={() => setShowWriteForm(false)}
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
                      {selectedMovie.poster_path && (
                        <img
                          src={getPosterUrl(selectedMovie.poster_path, "w92")}
                          alt={selectedMovie.title}
                          className="w-16 h-24 object-cover rounded"
                        />
                      )}
                      <div className="flex-1">
                        <div className="font-medium">{selectedMovie.title}</div>
                        <div className="text-sm text-gray-500">
                          {selectedMovie.release_date
                            ? new Date(selectedMovie.release_date).getFullYear()
                            : "연도 정보 없음"}
                        </div>
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
                              src={getPosterUrl(movie.poster_path, "w92")}
                              alt={movie.title}
                              className="w-12 h-18 object-cover rounded mr-2"
                            />
                          ) : (
                            <div className="w-12 h-18 bg-gray-200 rounded mr-2 flex items-center justify-center">
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
                  onClick={() => setShowWriteForm(false)}
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
                  {submitting ? "저장 중..." : "저장"}
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
    </div>
  );
};

export default MovieReviewsPage;
