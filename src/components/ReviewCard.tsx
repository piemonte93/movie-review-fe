import React from "react";
import { MovieReview, TvShowReview } from "../api/backendApi";
import { useNavigate } from "react-router-dom";
import { formatDate } from "../utils/dateUtils";
import StarRating from "./StarRating";
import { FaUserCircle, FaTv, FaFilm } from "react-icons/fa";

interface ReviewCardProps {
  review: MovieReview | TvShowReview;
  // 필요에 따라 추가 props (e.g., onDelete, onEdit)
}

const ReviewCard: React.FC<ReviewCardProps> = ({ review }) => {
  const navigate = useNavigate();

  // 더 정확한 타입 체크 - contentType 필드가 있으면 우선 사용
  const isMovieReview = (r: MovieReview | TvShowReview): r is MovieReview => {
    if ("contentType" in r && r.contentType) {
      return r.contentType.toLowerCase() === "movie";
    }
    // contentType이 없으면 movieId/tvShowId로 구분
    return "movieId" in r && r.movieId !== undefined;
  };

  const isTvShowReview = (r: MovieReview | TvShowReview): boolean => {
    if ("contentType" in r && r.contentType) {
      return r.contentType.toLowerCase() === "tv";
    }
    // contentType이 없으면 tvShowId로 구분
    return "tvShowId" in r && r.tvShowId !== undefined;
  };

  // 디버깅용 콘솔 로그
  console.log("Review data:", {
    hasMovieId: "movieId" in review,
    hasTvShowId: "tvShowId" in review,
    contentType: "contentType" in review ? review.contentType : "undefined",
    movieTitle: "movieTitle" in review ? review.movieTitle : "undefined",
    isMovie: isMovieReview(review),
    isTvShow: isTvShowReview(review),
  });

  const contentType = isMovieReview(review) ? "movie" : "tv";
  const contentId = isMovieReview(review)
    ? review.movieId
    : review.tvShowId || review.movieId;

  // TV 쇼인 경우에도 movieTitle 필드를 사용
  // (백엔드에서 TV 쇼 제목도 movieTitle에 저장하고 있음)
  const title = review.movieTitle || "제목 없음";

  // 리뷰 작성글 제목 - 검색에 사용할 값
  const reviewTitle = review.title || "";

  // 마찬가지로 포스터 경로도 moviePoster 필드 사용
  const posterPath = review.moviePoster || "";

  // TODO: Fetch or use user info from review object if available
  const authorUsername = review.user?.username || "익명";
  const authorProfileImg = review.user?.profileImageUrl;

  const handleCardClick = () => {
    // contentType과 contentId에 따라 적절한 페이지로 이동
    if (isMovieReview(review)) {
      // 영화 리뷰인 경우 영화 리뷰 페이지에서 검색
      navigate(`/movie-reviews?search=${encodeURIComponent(reviewTitle)}`);
    } else {
      // TV 쇼 리뷰인 경우 TV 쇼 리뷰 페이지에서 검색
      navigate(`/tv-reviews?search=${encodeURIComponent(reviewTitle)}`);
    }
  };

  return (
    <div
      className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
      onClick={handleCardClick}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3 flex-grow min-w-0">
          {posterPath && (
            <img
              src={
                posterPath.startsWith("/") || posterPath.startsWith("http")
                  ? posterPath
                  : `https://image.tmdb.org/t/p/w92${posterPath}`
              }
              alt={title}
              className="w-12 h-[72px] object-cover rounded flex-shrink-0"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }} // Hide on error
            />
          )}
          <div className="flex-grow min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {contentType === "movie" ? (
                <FaFilm className="text-blue-500 flex-shrink-0" />
              ) : (
                <FaTv className="text-green-500 flex-shrink-0" />
              )}
              <h3 className="font-bold text-lg truncate" title={reviewTitle}>
                {reviewTitle || "제목 없음"}
              </h3>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <div
                className="text-md font-medium text-gray-700 truncate"
                title={title}
              >
                {title}
              </div>
              <span
                className={`text-xs px-1.5 py-0.5 rounded-full ${
                  contentType === "movie"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-green-100 text-green-700"
                }`}
              >
                {contentType === "movie" ? "영화" : "TV쇼"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              {authorProfileImg ? (
                <img
                  src={authorProfileImg}
                  alt={authorUsername}
                  className="w-5 h-5 rounded-full object-cover"
                />
              ) : (
                <FaUserCircle className="w-5 h-5 text-gray-400" />
              )}
              <span>{authorUsername}</span>
            </div>
          </div>
        </div>
        <div className="flex-shrink-0 ml-2">
          <StarRating rating={review.rating} size={14} />
        </div>
      </div>

      <p className="text-gray-700 mb-3 line-clamp-3">{review.content}</p>

      <div className="text-xs text-gray-500 flex justify-end">
        {formatDate(review.createdAt)}
      </div>
    </div>
  );
};

export default ReviewCard;
