import React, { useState, useEffect } from "react";
import ContentScrollList from "../components/ContentScrollList";
import { useContents, useTrendingAll } from "../hooks/useContents";
import { useAuth } from "../context/AuthContext";
import { backendApi, MovieReview } from "../api/backendApi";
import { Link } from "react-router-dom";
import { FaUser } from "react-icons/fa";
import { fetchImageAsBlobUrl } from "../utils/imageUtils";

const HomePage: React.FC = () => {
  const { isLoggedIn, user } = useAuth();
  const [hotReviews, setHotReviews] = useState<MovieReview[]>([]);
  const [hotReviewsLoading, setHotReviewsLoading] = useState(true);
  const [hotReviewsError, setHotReviewsError] = useState<string | null>(null);
  const [reviewImageUrls, setReviewImageUrls] = useState<Record<number, string | null>>({});

  const {
    contents: trendingAllContent,
    loading: trendingAllLoading,
    error: trendingAllError,
  } = useTrendingAll();

  const {
    contents: topRatedContents,
    loading: topRatedLoading,
    error: topRatedError,
  } = useContents("topRated");

  const {
    contents: upcomingContents,
    loading: upcomingLoading,
    error: upcomingError,
  } = useContents("upcoming");

  const {
    contents: nowPlayingContents,
    loading: nowPlayingLoading,
    error: nowPlayingError,
  } = useContents("nowPlaying");

  useEffect(() => {
    const fetchHotReviews = async () => {
      try {
        setHotReviewsLoading(true);
        setHotReviewsError(null);
        const reviews = await backendApi.getHotReviews(3);
        setHotReviews(reviews);
      } catch (error) {
        console.error("인기 리뷰 로딩 실패:", error);
        setHotReviewsError("인기 리뷰를 불러오는데 실패했습니다.");
      } finally {
        setHotReviewsLoading(false);
      }
    };

    fetchHotReviews();
  }, []);

  useEffect(() => {
    const loadReviewImages = async () => {
      const urls: Record<number, string | null> = {};
      for (const review of hotReviews) {
        if (review.user.profileImageUrl) {
          const blobUrl = await fetchImageAsBlobUrl(review.user.profileImageUrl);
          urls[review.user.id] = blobUrl;
        } else {
          urls[review.user.id] = null;
        }
      }
      setReviewImageUrls(urls);
    };

    if (hotReviews.length > 0) {
      loadReviewImages();
    }

    return () => {
      Object.values(reviewImageUrls).forEach(url => {
        if (url) URL.revokeObjectURL(url);
      });
    }
  }, [hotReviews]);

  return (
    <div className="container mx-auto px-5 py-10">
      <h1 className="mb-10 text-3xl font-bold">영화 정보</h1>

      <ContentScrollList
        title="현재 상영작"
        contents={nowPlayingContents}
        loading={nowPlayingLoading}
        error={nowPlayingError}
        category="nowPlaying"
      />

      <ContentScrollList
        title="사이트 HOT 랭킹 (영화/TV)"
        contents={trendingAllContent}
        loading={trendingAllLoading}
        error={trendingAllError}
        category="trendingAll"
      />

      {isLoggedIn && (
        <ContentScrollList
          title={`${user?.username || "사용자"}님의 친구가 보고있는 작품`}
          contents={topRatedContents}
          loading={topRatedLoading}
          error={topRatedError}
          category="topRated"
        />
      )}

      <section className="my-14">
        <h2 className="mb-6 text-2xl font-bold">현재 HOT 코멘트🔥</h2>
        {hotReviewsLoading ? (
          <p>인기 리뷰를 불러오는 중...</p>
        ) : hotReviewsError ? (
          <p className="text-red-500">{hotReviewsError}</p>
        ) : hotReviews.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {hotReviews.map((review) => (
              <Link 
                key={review.id} 
                to={`/${review.contentType === 'movie' ? 'movie-reviews' : 'tv-reviews'}/${review.id}`}
                className="block rounded-lg border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow"
              >
                <p className="mb-3 text-lg font-semibold truncate">"{review.title}"</p>
                <p className="mb-4 text-gray-600 text-sm line-clamp-3">{review.content}</p>
                <div className="mt-auto flex items-center">
                  <div className="h-10 w-10 rounded-full bg-gray-100 overflow-hidden border border-gray-200">
                    {review.user && reviewImageUrls[review.user.id] ? (
                      <img 
                        src={reviewImageUrls[review.user.id]!}
                        alt={review.user?.username ?? 'Unknown User'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <FaUser className="text-gray-400 w-full h-full p-2" />
                    )}
                  </div>
                  <div className="ml-3">
                    <p className="font-medium text-sm">{review.user?.username ?? 'Unknown User'}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p>최근 인기 리뷰가 없습니다.</p>
        )}
      </section>

      <ContentScrollList
        title="공개 예정작"
        contents={upcomingContents}
        loading={upcomingLoading}
        error={upcomingError}
        category="upcoming"
      />
    </div>
  );
};

export default HomePage;
