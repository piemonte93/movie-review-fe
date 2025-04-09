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
} from "react-icons/fa";
import { FaStarHalfStroke, FaTv } from "react-icons/fa6";
import { Link, useNavigate, useLocation } from "react-router-dom";
import InfiniteScroll from "react-infinite-scroll-component";
import { backendApi, BASE_URL } from "../api/backendApi";
import { toast } from "react-toastify";
import { Content } from "../types/content";
import axios from "axios";
import { formatDate } from "../utils/dateUtils";
// import Modal from "react-modal"; // 임시 주석 처리
import defaultAvatar from "../assets/default-profile.png";
import type { Page as ApiPage } from "../api/backendApi";

// Content 타입을 TvShow 타입으로 매핑하는 함수
const mapContentToTvShow = (content: Content): TvShow => {
  return {
    id: content.id,
    name: content.name || content.title || "제목 없음",
    poster_path: content.poster_path || "",
    first_air_date: content.first_air_date || content.release_date || "",
    overview: content.overview || "",
    vote_average: content.vote_average || 0,
  };
};

// TMDB API TV쇼 정보 타입
interface TvShow {
  id: number;
  name: string;
  poster_path: string;
  first_air_date: string;
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
  created_at?: string;
  createdAt?: string;
  user_id?: number;
  userId?: number;
  username?: string;
  user_profile_image_url?: string;
  user?: {
    userId: number;
    username: string;
    profileUrl: string | null;
  };
  likeCount?: number;
  dislikeCount?: number;
  liked?: boolean;
  disliked?: boolean;
}

// TV 쇼 리뷰 데이터 타입 정의
interface TvShowReview {
  id: number;
  title: string;
  content: string;
  rating: number;
  movieTitle: string;
  movieId: number;
  moviePoster?: string;
  createdAt: string; // Changed to string to match backend data format more closely
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
  tvPoster?: string;
}

// 백엔드에서 반환하는 리뷰 형식
interface TvShowReviewResponse {
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
    userId?: number;
    username?: string;
    userProfileImageUrl?: string | null;
    user?: {
      id: number;
      username: string;
      profileImageUrl: string | null;
    };
    movieId: number;
    movieTitle: string;
    moviePoster?: string;
    moviePosterPath?: string | null;
    title: string;
    content: string;
    rating: number;
    createdAt: string;
    updatedAt: string | null;
    commentCount: number;
    likeCount: number;
    dislikeCount: number;
    isSpoiler: boolean;
  }[];
  totalElements: number;
  totalPages: number;
  currentPage: number;
  size: number;
}

// 백엔드에서 온 날짜 문자열을 ISO 형식으로 변환
const convertBackendDateToISO = (date: string | null | undefined): string => {
  if (!date) {
    console.warn("날짜 값이 없어 현재 시간으로 대체합니다.");
    return new Date().toISOString();
  }

  try {
    // LocalDateTime 형식 확인 (2023-04-03T15:30:45)
    const localDateTimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/;

    if (localDateTimeRegex.test(date)) {
      console.log(`TV 리뷰 날짜가 LocalDateTime 형식입니다: ${date}`);

      // 중요: 서버에서 보낸 시간은 KST(한국시간)이지만 타임존 정보가 없음
      // 타임존 정보만 추가(KST = +09:00)하고 추가 계산을 하지 않음
      const dateObj = new Date(`${date}+09:00`);
      const isoString = dateObj.toISOString();

      console.log(`TV 리뷰 KST 타임존 정보 추가 후: ${isoString}`);
      return isoString;
    }

    // 이미 ISO 형식이거나 다른 형식의 경우 그대로 Date 객체로 변환
    return new Date(date).toISOString();
  } catch (error) {
    console.error("날짜 변환 오류:", error);
    return new Date().toISOString();
  }
};

const TvReviewsPage: React.FC = () => {
  const { isLoggedIn, user, isUserBlocked } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tvShowTitle, setTvShowTitle] = useState("");
  const [selectedTvShow, setSelectedTvShow] = useState<TvShow | null>(null);
  const [tvShowSearchQuery, setTvShowSearchQuery] = useState("");
  const [tvShowSearchResults, setTvShowSearchResults] = useState<TvShow[]>([]);
  const [isSearchingTvShow, setIsSearchingTvShow] = useState(false);
  const [rating, setRating] = useState<number>(0);
  const [isSpoiler, setIsSpoiler] = useState<boolean>(false);
  const [reviews, setReviews] = useState<TvShowReview[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [showWriteForm, setShowWriteForm] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [tvShowQuery, setTvShowQuery] = useState("");
  const [searchResults, setSearchResults] = useState<TvShowReview[]>([]);
  const [expandedCommentId, setExpandedCommentId] = useState<number | null>(
    null
  );
  const [commentContent, setCommentContent] = useState("");
  const [searchCategory, setSearchCategory] = useState<
    "title" | "content" | "author"
  >("title");
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  // 무한 스크롤 관련 상태 추가
  const [visibleReviews, setVisibleReviews] = useState<TvShowReview[]>([]);
  const [page, setPage] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [totalPages, setTotalPages] = useState<number>(0);
  const reviewsPerPage = 5; // 한 번에 보여줄 리뷰 수

  // 최상단으로 이동 버튼의 표시 여부 상태
  const [showScrollTop, setShowScrollTop] = useState(false);

  // TMDB API 키 (실제 환경에서는 환경 변수로 관리)
  const TMDB_API_KEY = "a95a7823323dd52f66d0dc776498a8a1";

  // 신고 관련 상태 추가
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportContent, setReportContent] = useState("");
  const [reportTargetId, setReportTargetId] = useState<number | null>(null);
  const [reportTargetType, setReportTargetType] = useState<
    "comment" | "review" | null
  >(null);

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

  // TV 쇼 검색 함수
  const searchTvShows = async (query: string) => {
    if (!query.trim()) {
      setTvShowSearchResults([]);
      return;
    }

    try {
      const response = await axios.get(
        `https://api.themoviedb.org/3/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(
          query
        )}&language=ko-KR`
      );
      setTvShowSearchResults(response.data.results);
    } catch (error) {
      console.error("TV 쇼 검색 중 오류 발생:", error);
      toast.error("TV 쇼 검색 중 오류가 발생했습니다.");
    }
  };

  // TV 쇼 검색어 변경 핸들러
  const handleTvShowSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setTvShowSearchQuery(query);
    setIsSearchingTvShow(true);

    // 디바운싱: 검색어 입력이 끝난 후 일정 시간 후에 검색 수행
    const timeoutId = setTimeout(() => {
      searchTvShows(query);
    }, 500);

    return () => clearTimeout(timeoutId);
  };

  // TV 쇼 선택 핸들러
  const handleSelectTvShow = (tvShow: TvShow) => {
    setSelectedTvShow(tvShow);
    setTvShowTitle(tvShow.name);
    setTvShowSearchQuery(""); // 검색어 초기화
    setIsSearchingTvShow(false);
    setTvShowSearchResults([]); // 검색 결과 초기화
    // 사용자가 이미 이 TV 쇼에 대한 리뷰를 작성했는지 확인
    checkUserReviewForTvShow(tvShow.id);
  };

  // 사용자가 TV 쇼에 대한 리뷰를 이미 작성했는지 확인
  const checkUserReviewForTvShow = async (tvShowId: number) => {
    if (!isLoggedIn || !user) {
      return;
    }

    try {
      const hasWrittenReview = await backendApi.checkUserReviewForTv(tvShowId);
      if (hasWrittenReview) {
        toast.info(
          "이미 이 TV 쇼에 대한 리뷰를 작성하셨습니다. 작성된 리뷰는 목록에서 확인 가능합니다."
        );
        // 리뷰 작성 폼 닫기
        setShowWriteForm(false);
      }
    } catch (error) {
      console.error("리뷰 확인 중 오류 발생:", error);
    }
  };

  // 선택한 TV 쇼 초기화
  const handleClearSelectedTvShow = () => {
    setSelectedTvShow(null);
    setTvShowTitle("");
  };

  // 리뷰 목록 가져오기
  const fetchReviews = async () => {
    try {
      setLoading(true);
      const response = await backendApi.getAllTvReviews(0, reviewsPerPage);
      if (response.content) {
        const formattedReviews = response.content.map((review: any) => ({
          ...review, // 기존 속성들 유지
          createdAt: convertBackendDateToISO(review.createdAt),
          comments: [],
          user: {
            id: review.userId,
            username: review.username,
            profileImageUrl: review.userProfileImageUrl,
            reviewCount: 0, // Assuming reviewCount is not directly available, fetch later if needed
          },
          // 수정: review.tvPosterPath -> review.moviePosterPath
          tvPoster: review.moviePosterPath,
        }));
        setReviews(formattedReviews);
        setVisibleReviews(formattedReviews);
        setTotalPages(response.totalPages);
        setHasMore(response.totalPages > 1);
      }
      setLoading(false);
    } catch (error) {
      console.error("TV 리뷰 로딩 실패:", error);
      toast.error("리뷰를 불러오는데 실패했습니다.");
      setLoading(false);
    }
  };

  // Fix fetchMoreReviews similarly
  const fetchMoreReviews = async () => {
    const nextPage = page + 1;
    if (nextPage >= totalPages) {
      setHasMore(false);
      return;
    }
    try {
      const response = await backendApi.getAllTvReviews(
        nextPage,
        reviewsPerPage
      );
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
          // 수정: review.tvPosterPath -> review.moviePosterPath
          tvPoster: review.moviePosterPath,
        }));
        setReviews((prev) => [...prev, ...formattedReviews]);
        setVisibleReviews((prev) => [...prev, ...formattedReviews]);
        setPage(nextPage);
        setHasMore(response.totalPages > nextPage + 1);
      }
    } catch (error) {
      console.error("TV 리뷰 더 불러오기 실패:", error);
      toast.error("리뷰를 더 불러오는데 실패했습니다.");
    }
  };

  // 리뷰 제출 핸들러
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isLoggedIn) {
      toast.error("리뷰를 작성하려면 로그인이 필요합니다.");
      navigate("/login", { state: { from: location } });
      return;
    }

    if (!selectedTvShow) {
      toast.error("리뷰할 TV 쇼를 선택해주세요.");
      return;
    }

    if (!title.trim()) {
      toast.error("리뷰 제목을 입력해주세요.");
      return;
    }

    if (!content.trim()) {
      toast.error("리뷰 내용을 입력해주세요.");
      return;
    }

    if (rating === 0) {
      toast.error("평점을 선택해주세요.");
      return;
    }

    setSubmitting(true);

    try {
      // 리뷰 데이터 준비
      const reviewData = {
        movie_id: selectedTvShow.id,
        movie_title: selectedTvShow.name,
        movie_poster_path: selectedTvShow.poster_path,
        title,
        content,
        rating,
        is_spoiler: isSpoiler,
      };

      console.log("전송할 리뷰 데이터:", reviewData);
      console.log("현재 편집 중인 리뷰 ID:", editingReviewId);

      let successMessage = "";

      // 리뷰 수정 또는 새 리뷰 작성 분기
      if (editingReviewId) {
        // 기존 리뷰 수정 - PUT 요청
        console.log(`리뷰 ID ${editingReviewId} 수정 요청 시작`);
        await backendApi.updateTvReview(editingReviewId, reviewData);
        successMessage = "TV 쇼 리뷰가 성공적으로 수정되었습니다.";
        // 편집 모드 종료
        setEditingReviewId(null);
      } else {
        // 새 리뷰 작성 - POST 요청
        console.log("새 TV 쇼 리뷰 작성 요청 시작");
        await backendApi.createTvReview(reviewData);
        successMessage = "TV 쇼 리뷰가 성공적으로 등록되었습니다.";
      }

      toast.success(successMessage);

      // 폼 초기화
      resetForm();

      // 리뷰 목록 새로고침
      setPage(0);
      await fetchReviews();

      // 작성 폼 닫기
      setShowWriteForm(false);
    } catch (error) {
      console.error("TV 쇼 리뷰 작성/수정 실패:", error);

      if (error instanceof Error) {
        // 이미 리뷰를 작성한 경우 처리
        if (
          error.message.includes(
            "이미 이 TV 프로그램에 대한 리뷰를 작성하셨습니다"
          )
        ) {
          toast.error(
            "이미 이 TV 쇼에 대한 리뷰를 작성하셨습니다. 기존 리뷰를 수정하시겠습니까?"
          );
        } else {
          toast.error(`리뷰 작성/수정 실패: ${error.message}`);
        }
      } else {
        toast.error("리뷰 작성/수정 중 오류가 발생했습니다.");
      }
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
      resetSearch(); // Reset if query is empty
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
    setVisibleReviews(filtered); // Update visible reviews
    setHasMore(false); // Disable infinite scroll for search results
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
    setSearchResults([]); // Clear search results state
    setVisibleReviews(reviews.slice(0, reviewsPerPage)); // Reset visible reviews
    setHasMore(reviews.length > reviewsPerPage); // Re-enable infinite scroll
    setShowSearch(false);
    setShowSearchModal(false);
    // Optionally reset page number if needed, e.g., setPage(0);
  };

  // 댓글 토글 함수 - 댓글 보여주기/숨기기 및 댓글 데이터 로드
  const toggleComments = async (reviewId: number) => {
    // 이미 확장된 댓글이면 닫기
    if (expandedCommentId === reviewId) {
      setExpandedCommentId(null);
      return;
    }

    try {
      console.log(`댓글 토글: ${reviewId} 현재: ${expandedCommentId}`);
      console.log(`리뷰 ID ${reviewId}의 댓글 목록 요청 시작`);
      // 댓글 로딩 상태 설정
      setLoading(true);

      // 댓글 데이터 가져오기 시도
      const response = await backendApi.getReviewComments(reviewId);
      console.log(`리뷰 ID ${reviewId}의 댓글 데이터 원본:`, response);
      console.log(
        `리뷰 ID ${reviewId}의 댓글 데이터 구조:`,
        Object.keys(response)
      );

      // 댓글 데이터가 없는 경우
      if (!response.content || !Array.isArray(response.content)) {
        console.warn(`리뷰 ID ${reviewId}의 댓글 데이터가 없습니다.`);
        setReviews((prevReviews) =>
          prevReviews.map((review) =>
            review.id === reviewId ? { ...review, comments: [] } : review
          )
        );
        setExpandedCommentId(reviewId);
        setLoading(false);
        return;
      }

      // 첫 번째 댓글의 구조 로깅 (디버깅용)
      if (response.content.length > 0) {
        console.log(`첫 번째 댓글 전체 구조:`, response.content[0]);
        console.log(`첫 번째 댓글 속성:`, {
          id: response.content[0].id,
          userId: response.content[0].userId,
          username: response.content[0].username,
          createdAt: response.content[0].createdAt,
          user: response.content[0].user,
        });
      }

      // 댓글 데이터 매핑
      const mappedComments: Comment[] = response.content.map(
        (comment: CommentResponse) => {
          // 로깅을 통해 어떤 필드가 존재하는지 확인
          console.log(`댓글 ID ${comment.id} 데이터:`, {
            createdAt: comment.createdAt,
            created_at: comment.created_at,
            typeOfCreatedAt: comment.createdAt
              ? typeof comment.createdAt
              : "undefined",
            user: comment.user,
            userId: comment.userId,
            username: comment.username,
          });

          // 날짜 변환 및 검증
          const createdAtValue = comment.created_at || comment.createdAt;
          const createdAt = convertBackendDateToISO(createdAtValue);
          console.log(`댓글 ID ${comment.id}의 최종 날짜 값:`, createdAt);

          // userId 추출 (comment.userId 또는 comment.user?.userId 중 하나에서)
          const userId =
            comment.userId || (comment.user && comment.user.userId);
          const username =
            comment.username ||
            (comment.user && comment.user.username) ||
            "사용자";
          const profileImageUrl =
            comment.user_profile_image_url ||
            (comment.user && comment.user.profileUrl);

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

      console.log(`리뷰 ID ${reviewId}의 변환된 댓글:`, mappedComments);

      // 댓글 상태 업데이트
      setReviews((prevReviews) =>
        prevReviews.map((review) =>
          review.id === reviewId
            ? { ...review, comments: mappedComments }
            : review
        )
      );

      // 가시적인 리뷰 목록도 업데이트
      setVisibleReviews((prevReviews) =>
        prevReviews.map((review) =>
          review.id === reviewId
            ? { ...review, comments: mappedComments }
            : review
        )
      );

      // 성공적으로 댓글을 가져왔으므로 확장된 댓글 ID 설정
      setExpandedCommentId(reviewId);
    } catch (error) {
      console.error(`리뷰 ID ${reviewId}의 댓글 목록 불러오기 실패:`, error);
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
      // 현재 리뷰 상태 확인
      const currentReview = reviews.find((r) => r.id === reviewId);
      const wasLiked = currentReview?.isLiked || false;

      // 실제 API 호출
      const updatedReview = await backendApi.likeReview(reviewId);
      console.log("서버 응답 (좋아요):", updatedReview);

      // isLiked 상태를 수동으로 계산
      const nowLiked = !wasLiked;

      const updateReviewState = (review: TvShowReview) =>
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

      const updateReviewState = (review: TvShowReview) =>
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
  const navigateToTvShowDetail = (tvShowId: number) => {
    navigate(`/tv/${tvShowId}`);
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

  // 다음 페이지 리뷰를 불러오는 함수 <<-- 이 함수를 삭제합니다.
  /* // 주석 처리 또는 삭제
  const fetchMoreReviews = () => {
    if (!hasMore || loading) return;
    setPage(page + 1);
  };
  */

  // 포스터 URL 가져오기 함수
  const getPosterUrl = (posterPath: string | null, size = "original") => {
    return backendApi.getPosterUrl(posterPath, size);
  };

  // 폼 리셋 함수
  const resetForm = () => {
    setTitle("");
    setContent("");
    setRating(0);
    setSelectedTvShow(null);
    setIsSpoiler(false);
    setSearchResults([]);
    setTvShowQuery("");
    setTvShowSearchQuery("");
    setTvShowSearchResults([]);
    setIsSearchingTvShow(false);
  };

  const [editingReviewId, setEditingReviewId] = useState<number | null>(null);

  // 리뷰 수정 핸들러
  const handleEditReview = (review: TvShowReview) => {
    setEditingReviewId(review.id);
    setTitle(review.title);
    setContent(review.content);
    setRating(review.rating);
    setIsSpoiler(review.isSpoiler);
    setSelectedTvShow({
      id: review.movieId,
      name: review.movieTitle,
      poster_path: review.moviePoster || "",
      first_air_date: "", // 기본 날짜로 초기화
      overview: "",
      vote_average: 0,
    });
    setShowWriteForm(true);

    // TV 쇼 정보 API로 가져오기
    const fetchTvShowDetails = async () => {
      try {
        const tvShowDetails = await backendApi.getTvDetails(review.movieId);
        if (tvShowDetails) {
          setSelectedTvShow({
            id: review.movieId,
            name: review.movieTitle,
            poster_path: review.moviePoster || "",
            first_air_date: tvShowDetails.first_air_date || "",
            overview: tvShowDetails.overview || "",
            vote_average: tvShowDetails.vote_average || 0,
          });
        }
      } catch (error) {
        console.error("TV 쇼 정보 가져오기 실패:", error);
      }
    };

    fetchTvShowDetails();
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
      await backendApi.deleteTvReview(reviewId);
      // 성공적으로 삭제된 후 리뷰 목록 새로고침
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
      toast.error("로그인이 필요합니다.");
      return;
    }

    const comment = reviews
      .find((r) => r.id === reviewId)
      ?.comments.find((c) => c.id === commentId);

    if (!comment) return;

    const hasPermission = isCommentAuthor(comment.userId) || isAdmin();

    if (!hasPermission) {
      toast.error("댓글 삭제 권한이 없습니다.");
      return;
    }

    try {
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

  // 댓글 목록 가져오기 함수
  const fetchReviewComments = async (reviewId: number) => {
    try {
      console.log(`리뷰 ID ${reviewId}의 댓글 목록 요청 시작`);
      const response = await backendApi.getReviewComments(reviewId);
      console.log(`리뷰 ID ${reviewId}의 댓글 데이터 매핑 시작:`, response);

      const mappedComments: Comment[] = response.content.map(
        (comment: CommentResponse) => {
          // 날짜 데이터 확인 및 처리
          // 서버 응답에서 날짜 필드 검사 (created_at 또는 createdAt)
          const dateValue = comment.created_at || comment.createdAt;

          console.log(`댓글 ID ${comment.id}의 날짜 데이터:`, {
            created_at: comment.created_at,
            createdAt: comment.createdAt,
            dateValue: dateValue,
            commentObj: comment,
          });

          // 날짜 변환 및 검증
          const createdAt = convertBackendDateToISO(dateValue);
          console.log(`댓글 ID ${comment.id}의 최종 날짜 값:`, createdAt);

          // userId 추출 (comment.userId 또는 comment.user.userId 중 하나에서)
          const userId =
            comment.userId || (comment.user && comment.user.userId);

          console.log(`댓글 ID ${comment.id}의 사용자 정보:`, {
            commentUserId: comment.userId,
            userObjectId: comment.user?.userId,
            finalUserId: userId,
          });

          return {
            id: comment.id,
            content: comment.content,
            createdAt: createdAt,
            username: comment.username,
            profileImageUrl: comment.user_profile_image_url,
            likeCount: 0,
            dislikeCount: 0,
            userId: userId,
          };
        }
      );

      console.log(`리뷰 ID ${reviewId}의 변환된 댓글:`, mappedComments);

      setReviews((prevReviews) =>
        prevReviews.map((review) =>
          review.id === reviewId
            ? { ...review, comments: mappedComments }
            : review
        )
      );

      setVisibleReviews((prevReviews) =>
        prevReviews.map((review) =>
          review.id === reviewId
            ? { ...review, comments: mappedComments }
            : review
        )
      );

      return mappedComments;
    } catch (error) {
      console.error(`리뷰 ID ${reviewId}의 댓글 목록 불러오기 실패:`, error);
      toast.error("댓글 목록을 불러오는데 실패했습니다.");
      throw error;
    }
  };

  // 무한 스크롤 관련 코드
  useEffect(() => {
    fetchReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, navigate, location]);

  // 스크롤 이벤트 리스너 추가
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 500);
    };

    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 댓글 제출 처리
  const handleCommentSubmit = async (reviewId: number) => {
    if (!isLoggedIn || !commentContent.trim()) {
      return;
    }

    // 차단된 사용자인 경우 댓글 작성 불가
    if (isUserBlocked()) {
      toast.error("현재 댓글 기능이 제한되었습니다. 관리자에게 문의해주세요.");
      return;
    }

    setSubmitting(true);

    try {
      const newComment = await backendApi.addReviewComment(
        reviewId,
        commentContent
      );

      console.log("새 댓글 생성 응답:", newComment);

      // 백엔드 응답에서 날짜 처리
      const commentCreatedAt = convertBackendDateToISO(newComment.createdAt);
      console.log("변환된 댓글 작성 시간:", commentCreatedAt);

      // 현재 리뷰 찾기
      const updatedReviews = reviews.map((review) => {
        if (review.id === reviewId) {
          // 새 댓글을 앞에 추가
          const updatedComments = [
            {
              id: newComment.id,
              content: newComment.content,
              createdAt: commentCreatedAt,
              username: user?.username || "알 수 없음",
              profileImageUrl: user?.profileImageUrl || null,
              likeCount: 0,
              dislikeCount: 0,
              userId: user?.id || 0,
            },
            ...review.comments,
          ];

          return {
            ...review,
            comments: updatedComments,
            commentCount: (review.commentCount || 0) + 1,
          };
        }
        return review;
      });

      setReviews(updatedReviews);
      setVisibleReviews(updatedReviews);
      setCommentContent("");

      toast.success("댓글이 등록되었습니다.");
    } catch (error) {
      console.error("댓글 작성 실패:", error);
      toast.error("댓글 작성에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  // 댓글 섹션 확장 시 댓글 데이터와 권한 정보를 로그에 출력
  useEffect(() => {
    if (expandedCommentId && reviews.length > 0) {
      const review = reviews.find((r) => r.id === expandedCommentId);
      if (review && review.comments) {
        review.comments.forEach((comment) => {
          console.log("댓글 권한 정보:", {
            commentId: comment.id,
            commentUserId: comment.userId,
            currentUserId: user?.id,
            isAdmin: user?.roles?.includes("ROLE_ADMIN"),
            isAuthor: user?.id === comment.userId,
            isLoggedIn,
          });
        });
      }
    }
  }, [expandedCommentId, reviews, user, isLoggedIn]);

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

  // 로그인한 사용자가 관리자인지 확인하는 함수
  const isAdmin = useCallback(() => {
    return (
      user?.roles?.includes("ROLE_ADMIN") ||
      user?.roles?.includes("ROLE_MODERATOR") ||
      false
    );
  }, [user]);

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
      // 댓글 찾기
      let targetUserId = 0;

      if (reportTargetType === "review") {
        // 리뷰인 경우 user.id를 사용
        const review = reviews.find((r) => r.id === reportTargetId);
        targetUserId = review?.user?.id || 0;
      } else if (reportTargetType === "comment") {
        // 댓글인 경우 comments 배열에서 찾아 userId를 사용
        const comment = reviews
          .flatMap((r) => r.comments)
          .find((c) => c.id === reportTargetId);
        targetUserId = comment?.userId || 0;

        // 디버깅 로그
        console.log("댓글 정보:", comment);
        console.log("댓글 작성자 ID:", targetUserId);
      }

      // 신고 생성 요청
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

  // Determine reviews to render
  const reviewsToRender = showSearch ? searchResults : visibleReviews;

  // 프로필 이미지 URL 처리 함수 추가
  const getProfileImageUrl = (imageUrl: string | null | undefined) => {
    if (!imageUrl) return null;

    // 절대 URL이면 그대로 사용
    if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
      return imageUrl;
    }

    // 상대 URL이면 BASE_URL 추가
    return `${BASE_URL}${imageUrl}`;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">TV 쇼 리뷰</h1>

      {/* 리뷰 작성 버튼 */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold">전체 리뷰 목록</h2>
          {totalPages > 0 && (
            <span className="text-gray-500 text-sm">
              (총 {reviews.length}개)
            </span>
          )}
        </div>
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
                        src={getProfileImageUrl(review.user.profileImageUrl)}
                        alt={review.user.username}
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
                  {isLoggedIn && (user?.id === review.user.id || isAdmin()) && (
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
                        isAdmin()) && (
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

              {/* TV 쇼 정보와 리뷰 내용 */}
              <div className="flex flex-col sm:flex-row mb-4">
                <div className="flex flex-col w-full sm:w-32 mb-3 sm:mb-0 sm:mr-4 flex-shrink-0 items-center sm:items-start">
                  {/* 수정: review.moviePoster -> review.tvPoster */}
                  {review.tvPoster ? (
                    <div
                      className="cursor-pointer"
                      onClick={() => navigateToTvShowDetail(review.movieId)}
                    >
                      <img
                        /* 수정: review.moviePoster -> review.tvPoster */
                        src={getPosterUrl(review.tvPoster, "w500")}
                        alt={review.movieTitle}
                        className="w-auto max-w-[150px] h-auto max-h-[225px] sm:w-32 sm:h-48 object-cover rounded mb-2"
                        onError={(e) => {
                          console.log(
                            /* 수정: review.moviePoster -> review.tvPoster */
                            `이미지 로드 실패: ${review.tvPoster}`
                          );
                          (e.target as HTMLImageElement).src =
                            "https://via.placeholder.com/1000x1500?text=No+Image";
                        }}
                      />
                      <p
                        className="text-sm font-semibold text-center w-full truncate max-w-[150px] sm:max-w-full"
                        title={review.movieTitle}
                      >
                        {review.movieTitle}
                      </p>
                    </div>
                  ) : (
                    <div
                      className="cursor-pointer"
                      onClick={() => navigateToTvShowDetail(review.movieId)}
                    >
                      <div className="w-[150px] h-[225px] sm:w-32 sm:h-48 bg-gray-200 rounded flex items-center justify-center mb-2">
                        <FaTv className="text-gray-400 text-4xl" />
                      </div>
                      <p
                        className="text-sm font-semibold text-center w-full truncate max-w-[150px] sm:max-w-full"
                        title={review.movieTitle}
                      >
                        {review.movieTitle}
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex-1">
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
                                {isLoggedIn &&
                                  !isUserBlocked() &&
                                  user?.id !== comment.userId && (
                                    <button
                                      className="p-1 hover:bg-gray-100 rounded-full"
                                      title="댓글 신고하기"
                                      onClick={() =>
                                        openReportModal(comment.id, "comment")
                                      }
                                    >
                                      <FaBell className="text-red-500 text-xs" />
                                    </button>
                                  )}
                                <span className="text-sm text-gray-500">
                                  {(() => {
                                    console.log(
                                      `댓글 ID ${comment.id}의 날짜 표시 전 값:`,
                                      comment.createdAt
                                    );
                                    const formattedDate = formatDate(
                                      comment.createdAt
                                    );
                                    console.log(
                                      `댓글 ID ${comment.id}의 날짜 표시 후 값:`,
                                      formattedDate
                                    );
                                    return formattedDate;
                                  })()}
                                </span>
                                {isLoggedIn &&
                                  (isCommentAuthor(comment.userId) ||
                                    isAdmin()) &&
                                  !isUserBlocked() && (
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
              {/* TV 쇼 검색 */}
              <div className="mb-4">
                <label className="block text-gray-700 font-medium mb-2">
                  TV 쇼 선택
                </label>
                <div className="relative">
                  {selectedTvShow ? (
                    <div className="flex items-center space-x-4 p-2 border rounded">
                      <img
                        src={getPosterUrl(selectedTvShow.poster_path, "w500")}
                        alt={selectedTvShow.name}
                        className="w-16 h-24 object-cover rounded"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            "https://via.placeholder.com/1000x1500?text=No+Image";
                        }}
                      />
                      <div className="flex-1">
                        <div className="font-medium">{selectedTvShow.name}</div>
                        <div className="text-sm text-gray-500">
                          {selectedTvShow.first_air_date
                            ? new Date(
                                selectedTvShow.first_air_date
                              ).getFullYear()
                            : "연도 정보 없음"}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleClearSelectedTvShow}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <FaTimes />
                      </button>
                    </div>
                  ) : (
                    <input
                      type="text"
                      placeholder="TV 쇼 제목 검색"
                      value={tvShowSearchQuery}
                      onChange={handleTvShowSearchChange}
                      onClick={() => setIsSearchingTvShow(true)}
                      className="w-full p-2 border rounded focus:outline-none focus:border-blue-500"
                    />
                  )}

                  {isSearchingTvShow && tvShowSearchResults.length > 0 && (
                    <div className="absolute left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white border rounded shadow-lg">
                      {tvShowSearchResults.map((tvShow) => (
                        <div
                          key={tvShow.id}
                          className="flex items-center p-2 hover:bg-gray-100 cursor-pointer"
                          onClick={() => handleSelectTvShow(tvShow)}
                        >
                          {tvShow.poster_path ? (
                            <img
                              src={getPosterUrl(tvShow.poster_path, "w342")}
                              alt={tvShow.name}
                              className="w-16 h-24 object-cover rounded mr-2"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src =
                                  "https://via.placeholder.com/342x513?text=No+Image";
                              }}
                            />
                          ) : (
                            <div className="w-16 h-24 bg-gray-200 rounded mr-2 flex items-center justify-center">
                              <FaTv className="text-gray-400" />
                            </div>
                          )}
                          <div>
                            <div className="font-medium">{tvShow.name}</div>
                            <div className="text-sm text-gray-500">
                              {tvShow.first_air_date
                                ? new Date(tvShow.first_air_date).getFullYear()
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
                  disabled={submitting || !selectedTvShow}
                  className={`px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors ${
                    (submitting || !selectedTvShow) &&
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

      {/* 신고 모달 - 임시 주석 처리 */}
      {/*
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
      */}
    </div>
  );
};

export default TvReviewsPage;
