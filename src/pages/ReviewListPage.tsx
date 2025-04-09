import { useState, useEffect } from "react";
import { useParams, Link, useLocation, useNavigate } from "react-router-dom";
import { backendApi, CombinedReview, Review } from "../api/backendApi";
import { ContentDetail, Review as TmdbReview } from "../types/content";
import {
  FaArrowLeft,
  FaStar,
  FaUserCircle,
  FaCalendarAlt,
} from "react-icons/fa";
import InfiniteScroll from "react-infinite-scroll-component";
import { StarRating } from "../components/StarRating";
import { formatDate } from "../utils/dateUtils";
import defaultProfile from "../assets/default-profile.svg";

const ReviewListPage = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [content, setContent] = useState<ContentDetail | null>(null);
  const [combinedReviews, setCombinedReviews] = useState<CombinedReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewImageErrors, setReviewImageErrors] = useState<Record<string, boolean>>({});

  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const mediaType = location.pathname.includes("/tv/") ? "tv" : "movie";
  const contentId = id ? parseInt(id) : 0;

  const handleReviewImageError = (reviewId: string | number) => {
    setReviewImageErrors((prev) => ({ ...prev, [String(reviewId)]: true }));
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      if (!contentId) {
        setError("잘못된 콘텐츠 ID입니다.");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      setCombinedReviews([]);
      setPage(0);
      setHasMore(true);

      try {
        const detailsPromise = mediaType === "tv"
            ? backendApi.getTvDetails(contentId)
            : backendApi.getMovieDetails(contentId);

        const localReviewsPromise = mediaType === "tv"
            ? backendApi.getTvShowReviewsByTmdbId(contentId, 0)
            : backendApi.getMovieReviewsByTmdbId(contentId, 0);

        const tmdbReviewsPromise = mediaType === "tv"
            ? backendApi.getTvReviews(contentId)
            : backendApi.getMovieReviews(contentId);

        const [detailsResponse, localReviewsPage, tmdbReviewsResponse] =
          await Promise.all([
            detailsPromise,
            localReviewsPromise,
            tmdbReviewsPromise,
          ]);

        setContent(detailsResponse);

        const tmdbReviewsWithSource = (tmdbReviewsResponse.results || []).map(
          (review: TmdbReview) => ({
            ...review,
            source: "tmdb" as const,
            id: review.id,
            createdAt: review.created_at,
          })
        );

        const localReviewsWithSource = (localReviewsPage.content || []).map(
          (review: Review) => ({
            ...review,
            source: "local" as const,
          })
        );

        const initialReviews = [...localReviewsWithSource, ...tmdbReviewsWithSource].sort(
          (a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            if (dateA === 0 && dateB !== 0) return 1;
            if (dateA !== 0 && dateB === 0) return -1;
            if (dateA === 0 && dateB === 0) return 0;
            return dateB - dateA;
          }
        );

        setCombinedReviews(initialReviews);
        setHasMore(!localReviewsPage.last);
        setPage(0);

      } catch (err) {
        console.error("초기 리뷰 정보 가져오기 오류:", err);
        setError("리뷰 정보를 불러오는데 실패했습니다.");
        setHasMore(false);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [contentId, mediaType]);

  const fetchMoreReviews = async () => {
    const nextPage = page + 1;
    console.log(`Fetching more local reviews, page: ${nextPage}`);

    try {
      const localReviewsPage = mediaType === "tv"
          ? await backendApi.getTvShowReviewsByTmdbId(contentId, nextPage)
          : await backendApi.getMovieReviewsByTmdbId(contentId, nextPage);

      const newLocalReviews = (localReviewsPage.content || []).map(
        (review: Review) => ({
          ...review,
          source: "local" as const,
        })
      );

      setCombinedReviews((prevReviews) => [...prevReviews, ...newLocalReviews]);
      setPage(nextPage);
      setHasMore(!localReviewsPage.last);

    } catch (err) {
      console.error(`다음 페이지 리뷰(${nextPage}) 가져오기 오류:`, err);
      setHasMore(false);
    }
  };

  const renderReviewCard = (review: CombinedReview) => {
    const key = `${review.source}-${review.id}`;
    const isImageError = reviewImageErrors[String(review.id)];

    if (review.source === 'local') {
      return (
        <div key={key} className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-2 mb-2">
            {!isImageError && review.userProfileImageUrl ? (
              <img
                src={review.userProfileImageUrl}
                alt={review.username}
                className="w-8 h-8 rounded-full object-cover"
                onError={() => handleReviewImageError(String(review.id))}
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                <FaUserCircle className="text-gray-400" />
              </div>
            )}
            <span className="font-semibold">{review.username}</span>
          </div>
          <div className="flex items-center mb-2">
            <StarRating rating={review.rating || 0} />
            <span className="ml-2 text-sm text-gray-600">
              ({review.rating || 0}점)
            </span>
          </div>
          <div className="flex items-center text-xs text-gray-500 mb-2">
            <FaCalendarAlt className="mr-1" />
            {review.createdAt ? formatDate(review.createdAt) : ""}
          </div>
          {review.isSpoiler ? (
            <div className="group relative cursor-pointer">
              <span className="inline-block bg-red-500 text-white px-2 py-1 text-xs font-bold rounded mr-2">
                스포일러
              </span>
              <span className="text-sm text-gray-500 group-hover:hidden">
                (내용을 보려면 마우스를 올리세요)
              </span>
              <div className="hidden group-hover:block mt-1">
                {review.title && <h3 className="font-medium mb-1">{review.title}</h3>}
                <p className="text-gray-600 text-sm mb-1">{review.content}</p>
              </div>
            </div>
          ) : (
            <>
              {review.title && <h3 className="font-medium mb-1">{review.title}</h3>}
              <p className="text-gray-600 text-sm mb-1">{review.content}</p>
            </>
          )}
        </div>
      );
    }

    if (review.source === 'tmdb') {
      return (
        <div key={key} className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-2 mb-2">
            {!isImageError && review.author_details?.avatar_path ? (
              <img
                src={
                  review.author_details.avatar_path.startsWith("/http")
                    ? review.author_details.avatar_path.substring(1)
                    : `https://image.tmdb.org/t/p/w45${review.author_details.avatar_path}`
                }
                alt={review.author}
                className="w-8 h-8 rounded-full object-cover"
                onError={() => handleReviewImageError(String(review.id))}
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center">
                <img src={defaultProfile} alt={review.author} className="w-4 h-4 object-contain opacity-70" />
              </div>
            )}
            <span className="font-medium">{review.author}</span>
            <span className="ml-2 inline-block bg-gray-200 text-gray-600 px-2 py-0.5 text-xs font-semibold rounded">
              TMDB
            </span>
          </div>
          {review.createdAt && (
              <div className="flex items-center text-xs text-gray-500 mb-2">
                  <FaCalendarAlt className="mr-1" />
                  {formatDate(review.createdAt)}
              </div>
          )}
          {review.author_details?.rating !== null &&
            review.author_details?.rating !== undefined && (
              <div className="flex items-center mb-2">
                <StarRating rating={(review.author_details?.rating ?? 0) / 2} />
                <span className="ml-2 text-sm text-gray-600">
                  ({(review.author_details?.rating ?? 0).toFixed(1)}/10)
                </span>
              </div>
            )}
          <p className="text-gray-600 text-sm">{review.content}</p>
        </div>
      );
    }

    return null;
  };

  if (loading && combinedReviews.length === 0) {
    return <div className="flex justify-center items-center h-screen">로딩 중...</div>;
  }

  if (error) {
    return <div className="flex justify-center items-center h-screen text-red-500">{error}</div>;
  }

  if (!content) {
    return (
      <div className="flex justify-center items-center h-screen">
        콘텐츠 정보를 찾을 수 없습니다.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex items-start gap-4 bg-white p-4 rounded-lg shadow sticky top-20 z-10">
            <button
                onClick={() => navigate(-1)}
                className="text-gray-600 hover:text-gray-800 p-2 rounded-full hover:bg-gray-200 transition-colors"
                aria-label="뒤로가기"
            >
                <FaArrowLeft size={20} />
            </button>
            <div className="flex items-center gap-3 flex-1">
                {(content.posterPath || content.poster_path) && (
                <img
                    src={`https://image.tmdb.org/t/p/w92${
                    content.posterPath || content.poster_path
                    }`}
                    alt="Poster"
                    className="w-16 h-auto rounded flex-shrink-0"
                />
                )}
                <div className="flex-grow">
                <h1 className="text-2xl font-bold leading-tight">
                    {content.title || content.name}
                </h1>
                <p className="text-gray-600 mt-1">
                    전체 리뷰 ({combinedReviews.length}개)
                </p>
                </div>
            </div>
        </div>

        <InfiniteScroll
            dataLength={combinedReviews.length}
            next={fetchMoreReviews}
            hasMore={hasMore}
            loader={<div className="text-center py-4">로딩 중...</div>}
            endMessage={
                <p style={{ textAlign: 'center' }} className="py-4 text-gray-500">
                <b>모든 리뷰를 보셨습니다.</b>
                </p>
            }
            className="space-y-4"
        >
            {combinedReviews.map(renderReviewCard)}
        </InfiniteScroll>

        {!loading && combinedReviews.length === 0 && (
           <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500 mt-4">
              작성된 리뷰가 없습니다.
           </div>
        )}
      </div>
    </div>
  );
};

export default ReviewListPage;
