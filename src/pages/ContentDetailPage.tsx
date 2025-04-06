import { useState, useEffect } from "react";
import { useParams, Link, useLocation, useNavigate } from "react-router-dom";
import { backendApi } from "../api/backendApi";
import { FaStar, FaTimes, FaBookmark } from "react-icons/fa";
import { ContentDetail, Review, Video } from "../types/content";
import VideoPlayerModal from "../components/VideoPlayerModal";
import CastCarousel from "../components/CastCarousel";
import defaultProfile from "../assets/default-profile.svg";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-toastify";
import { checkContentScrapStatus, toggleContentScrap } from "../api/userApi";
import { Button } from "../components/ui/button";

/* // 임시 데이터는 주석 처리
const mockMovieDetails = {
  id: 1234,
  title: '에이리언: 로뮬루스 (2024)',
  rating: 0,
  overview: '비폭력적 인간형 안드로이드 공포 개념.\n우주선 체계 내부의 인간드라마와 연관된 외계 생명체와의 만남. 외딴 나온 철저 창가 처형 작전이 붕괴됐다. 하지만 이럴리 없는 거지 최루가스 누수 이상한 인물들 짝찍이고 끼친 쪽이어야 한다욤 무시 푸렌저스 요격팀 뭐가더 사격하냐. 그 녀구도 그렇게 정찡을 모을 수 있는 우주 우리끼리 세우다 발로할 자신된 시동을 달았어야 하는데...',
  posterPath: 'https://image.tmdb.org/t/p/w500/1E9W0qhjJ3mK8zXlXXlPsRW3sFZ.jpg',
  releaseDate: '2024-05-15',
  runtime: 155,
};

// 임시 리뷰 데이터
const mockReviews = [
  {
    id: 1,
    userName: '이름1',
    content: '리뷰1',
    rating: 4,
    avatar: 'https://via.placeholder.com/50',
  },
  {
    id: 2,
    userName: '이름2',
    content: '리뷰2',
    rating: 3,
    avatar: 'https://via.placeholder.com/50',
  },
  {
    id: 3,
    userName: '이름3',
    content: '리뷰3',
    rating: 5,
    avatar: 'https://via.placeholder.com/50',
  },
  {
    id: 4,
    userName: '이름4',
    content: '리뷰4',
    rating: 2,
    avatar: 'https://via.placeholder.com/50',
  },
];

// 임시 비디오 데이터
const mockVideos = [
  {
    id: 1,
    key: 'video1',
    name: '예고편 1',
    thumbnail: 'https://via.placeholder.com/300x200',
  },
  {
    id: 2,
    key: 'video2',
    name: '예고편 2',
    thumbnail: 'https://via.placeholder.com/300x200',
  },
  {
    id: 3,
    key: 'video3',
    name: '예고편 3',
    thumbnail: 'https://via.placeholder.com/300x200',
  },
];
*/

const ContentDetailPage = () => {
  const { isLoggedIn, user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [content, setContent] = useState<ContentDetail | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [cast, setCast] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTV, setIsTV] = useState(false);
  const [reviewImageErrors, setReviewImageErrors] = useState<{
    [key: number]: boolean;
  }>({});
  const [isScraped, setIsScraped] = useState<boolean>(false);
  const [scrappingInProgress, setScrappingInProgress] =
    useState<boolean>(false);

  // 리뷰 작성 모달 관련 상태
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [title, setTitle] = useState("");
  const [reviewContent, setReviewContent] = useState("");
  const [rating, setRating] = useState<number>(0);
  const [isSpoiler, setIsSpoiler] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // URL 경로에서 미디어 타입 결정 (tv 또는 movie)
  const mediaType = location.pathname.includes("/tv/") ? "tv" : "movie";

  // 비디오 모달 상태 관리
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);

  const handleVideoClick = (video: Video) => {
    setSelectedVideo(video);
    setIsVideoModalOpen(true);
  };

  const closeVideoModal = () => {
    setIsVideoModalOpen(false);
    setSelectedVideo(null);
  };

  const handleReviewImageError = (reviewId: number) => {
    setReviewImageErrors((prev) => ({ ...prev, [reviewId]: true }));
  };

  const handleReviewSubmit = async (reviewData: {
    title: string;
    content: string;
    rating: number;
    is_spoiler: boolean;
  }) => {
    if (!content) return;

    try {
      setIsSubmitting(true);

      // TV 프로그램인 경우
      if (content.type === "tv") {
        await backendApi.createTvReview({
          movie_id: content.id,
          movie_title: content.title || content.name || "",
          movie_poster_path: content.poster_path || null,
          title: reviewData.title,
          content: reviewData.content,
          rating: reviewData.rating,
          is_spoiler: reviewData.is_spoiler
        });
      } else {
        // 영화인 경우 (기존 로직)
        await backendApi.createMovieReview({
          movie_id: content.id,
          movie_title: content.title || "",
          movie_poster_path: content.poster_path || null,
          title: reviewData.title,
          content: reviewData.content,
          rating: reviewData.rating,
          is_spoiler: reviewData.is_spoiler
        });
      }

      toast.success(
        content.type === "tv" 
          ? "TV 프로그램 리뷰가 성공적으로 등록되었습니다!" 
          : "영화 리뷰가 성공적으로 등록되었습니다!"
      );

      // 리뷰 목록 새로고침
      await fetchReviews();
      
      // 리뷰 작성 모달 닫기
      setShowReviewModal(false);
    } catch (error) {
      console.error("리뷰 작성 실패:", error);
      if (error instanceof Error) {
        // 중복 리뷰 체크
        if (error.message.includes("이미") && error.message.includes("리뷰를 작성하셨습니다")) {
          const isConfirmed = window.confirm(error.message);
          if (isConfirmed) {
            // 기존 리뷰 수정 페이지로 이동
            navigate(`/profile/me/reviews`);
          }
        } else {
          toast.error(error.message);
        }
      } else {
      toast.error("리뷰 작성에 실패했습니다. 다시 시도해주세요.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // 리뷰 작성 버튼 렌더링 함수
  const renderReviewButton = () => {
    if (!isLoggedIn) {
      return (
        <Button
          onClick={() => navigate("/login")}
          className="w-full md:w-auto px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark"
        >
          로그인하고 리뷰 작성하기
        </Button>
      );
    }

    return (
      <Button
        onClick={() => setShowReviewModal(true)}
        className="w-full md:w-auto px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark"
      >
        {content?.type === "tv" ? "TV 프로그램 리뷰 작성" : "영화 리뷰 작성"}
      </Button>
    );
  };

  // 별점 클릭 핸들러
  const handleRatingClick = (index: number, isHalf: boolean) => {
    // isHalf가 true이면 0.5 단위, false면 1.0 단위로 설정
    const newRating = isHalf ? index + 0.5 : index + 1;
    setRating(newRating);
  };

  // 스크랩 상태 확인
  useEffect(() => {
    const checkScrapStatus = async () => {
      if (isLoggedIn && id) {
        try {
          const contentId = parseInt(id);
          const mediaType = isTV ? "tv" : "movie";
          const scrapStatus = await checkContentScrapStatus(
            contentId,
            mediaType
          );
          setIsScraped(scrapStatus);
        } catch (error) {
          console.error("스크랩 상태 확인 실패:", error);
        }
      }
    };

    if (content) {
      checkScrapStatus();
    }
  }, [isLoggedIn, id, content, isTV]);

  // 스크랩 토글 핸들러
  const handleToggleScrap = async () => {
    if (!isLoggedIn) {
      toast.info("스크랩 기능을 사용하려면 로그인이 필요합니다.");
      return;
    }

    if (!id) return;

    try {
      setScrappingInProgress(true);
      const contentId = parseInt(id);
      const mediaType = isTV ? "tv" : "movie";
      const response = await toggleContentScrap(contentId, mediaType);
      setIsScraped(response.isScraped);

      toast.success(
        response.isScraped
          ? "콘텐츠가 스크랩 되었습니다. 마이페이지에서 확인하세요."
          : "스크랩이 취소되었습니다."
      );
    } catch (error) {
      console.error("스크랩 토글 실패:", error);
      toast.error("스크랩 처리 중 오류가 발생했습니다.");
    } finally {
      setScrappingInProgress(false);
    }
  };

  // 리뷰 목록 새로고침 함수 추가
  const fetchReviews = async () => {
    if (!id) return;
    try {
      const response = mediaType === "tv"
        ? await backendApi.getTvReviews(parseInt(id))
        : await backendApi.getMovieReviews(parseInt(id));
      setReviews(response.results || []);
    } catch (error) {
      console.error("리뷰 목록 조회 실패:", error);
    }
  };

  useEffect(() => {
    const fetchContentDetails = async () => {
      setLoading(true);
      try {
        if (id) {
          // 미디어 타입에 따라 API 호출 결정
          if (mediaType === "tv") {
            // TV 프로그램인 경우
            setIsTV(true);
            const tvResponse = await backendApi.getTvDetails(parseInt(id));
            setContent(tvResponse);

            // TV 출연진 정보 가져오기
            const creditsResponse = await backendApi.getTvCredits(parseInt(id));
            setCast(creditsResponse.cast || []);

            // TV 리뷰 가져오기
            const reviewsResponse = await backendApi.getTvReviews(parseInt(id));
            setReviews(reviewsResponse.results || []);

            // TV 비디오 가져오기
            try {
              const videosResponse = await backendApi.getTvVideos(parseInt(id));
              setVideos(videosResponse.results || []);
            } catch (videoError) {
              console.error("Error fetching TV videos:", videoError);
              setVideos([]);
            }
          } else {
            // 영화인 경우
            setIsTV(false);
            const movieResponse = await backendApi.getMovieDetails(
              parseInt(id)
            );
            setContent(movieResponse);

            // 영화 출연진 정보 가져오기
            const creditsResponse = await backendApi.getMovieCredits(
              parseInt(id)
            );
            setCast(creditsResponse.cast || []);

            // 리뷰 정보 가져오기
            const reviewsResponse = await backendApi.getMovieReviews(
              parseInt(id)
            );
            setReviews(reviewsResponse.results || []);

            // 비디오 정보 가져오기
            try {
              const videosResponse = await backendApi.getMovieVideos(
                parseInt(id)
              );
              setVideos(videosResponse.results || []);
            } catch (videoError) {
              console.error("Error fetching videos:", videoError);
              setVideos([]);
            }
          }
        }
      } catch (error) {
        console.error(`Error fetching ${mediaType} details:`, error);
        setError(
          `${isTV ? "TV 프로그램" : "영화"} 정보를 가져오는 중 오류가 발생했습니다.`
        );
      } finally {
        setLoading(false);
      }
    };

    fetchContentDetails();
  }, [id, mediaType]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        로딩 중...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen text-red-500">
        {error}
      </div>
    );
  }

  if (!content) {
    return (
      <div className="flex justify-center items-center h-screen">
        콘텐츠 정보를 찾을 수 없습니다.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-6xl mx-auto py-6 px-4">
        {/* 영화/TV 정보 섹션 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* 포스터 이미지 */}
            <div className="w-full md:w-64 lg:w-80">
              {content.poster_path ? (
                <img
                  src={`https://image.tmdb.org/t/p/w500${content.poster_path}`}
                  alt={content.title || content.name}
                  className="w-full h-auto rounded-md shadow"
                />
              ) : (
                <div className="w-full h-96 bg-gray-200 flex items-center justify-center rounded-md">
                  <span className="text-gray-400">이미지 없음</span>
                </div>
              )}
            </div>

            {/* 영화/TV 정보 */}
            <div className="flex-1">
              <h1 className="text-2xl font-bold mb-2">
                {content.title || content.name}
              </h1>
              {content.tagline && (
                <p className="text-gray-600 italic mb-2">"{content.tagline}"</p>
              )}
              <p className="text-gray-600 mb-4">
                {isTV ? (
                  <>
                    {content.first_air_date
                      ? `${new Date(content.first_air_date).toLocaleDateString("ko-KR", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })} 방영`
                      : "방영일 정보 없음"}
                    {content.number_of_seasons
                      ? ` • 시즌 ${content.number_of_seasons}개`
                      : ""}
                    {content.number_of_episodes
                      ? ` • 에피소드 ${content.number_of_episodes}개`
                      : ""}
                  </>
                ) : (
                  <>
                    {content.release_date
                      ? `${new Date(content.release_date).toLocaleDateString("ko-KR", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })} 개봉`
                      : ""}
                    {content.runtime ? ` • 상영 시간: ${content.runtime}분` : ""}
                  </>
                )}
              </p>

              {/* 장르 */}
              {content.genres && content.genres.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {content.genres.map((genre) => (
                    <span
                      key={genre.id}
                      className="bg-gray-200 px-2 py-1 rounded text-sm"
                    >
                      {genre.name}
                    </span>
                  ))}
                </div>
              )}

              {/* 별점 */}
              <div className="flex items-center mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <FaStar
                    key={star}
                    className={
                      star <= (content.vote_average || 0) / 2
                        ? "text-yellow-400"
                        : "text-gray-300"
                    }
                    size={24}
                  />
                ))}
                <span className="ml-2">
                  {(content.vote_average || 0).toFixed(1)}/10 ({content.vote_count || 0})
                </span>
              </div>

              {/* 줄거리 */}
              <div className="mb-4">
                <h2 className="text-lg font-semibold mb-2">줄거리</h2>
                <p className="text-gray-700 whitespace-pre-line">
                  {content.overview || "줄거리 정보가 없습니다."}
                </p>
              </div>

              {/* 제작사 정보가 있는 경우 표시 */}
              {content.production_companies &&
                content.production_companies.length > 0 && (
                  <div className="mb-4">
                    <h2 className="text-lg font-semibold mb-2">제작사</h2>
                    <div className="flex flex-wrap gap-2">
                      {content.production_companies.map((company) => (
                        <span key={company.id} className="text-gray-700">
                          {company.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

              {/* 버튼 섹션 */}
              <div className="flex flex-wrap gap-4 mt-6">
                {/* 리뷰 작성 버튼 */}
                {isLoggedIn ? (
                  <Button
                    onClick={() => setShowReviewModal(true)}
                    className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold shadow-md transition-colors"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <FaStar className="text-yellow-400" />
                      {content?.type === "tv" ? "TV 프로그램 리뷰 작성" : "영화 리뷰 작성"}
                    </div>
                  </Button>
                ) : (
                  <Button
                    onClick={() => navigate("/login")}
                    className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold shadow-md transition-colors"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <FaStar className="text-yellow-400" />
                      로그인하고 리뷰 작성하기
                    </div>
                  </Button>
                )}

                {/* 스크랩 버튼 */}
                {isLoggedIn && (
                  <Button
                    onClick={handleToggleScrap}
                    disabled={scrappingInProgress}
                    className={`flex-1 md:flex-none px-6 py-3 rounded-lg font-semibold shadow-md transition-colors ${
                      isScraped
                        ? "bg-yellow-500 hover:bg-yellow-600 text-white"
                        : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <FaBookmark />
                    {isScraped ? "스크랩됨" : "스크랩하기"}
                    </div>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 리뷰 섹션 */}
        <div className="mt-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">리뷰</h2>
            {isLoggedIn ? (
              <Button
                onClick={() => setShowReviewModal(true)}
                className="bg-primary hover:bg-primary-dark text-white"
              >
                {content?.type === "tv" ? "TV 프로그램 리뷰 작성" : "영화 리뷰 작성"}
              </Button>
            ) : (
              <Button
                onClick={() => navigate("/login")}
                className="bg-primary hover:bg-primary-dark text-white"
              >
                로그인하고 리뷰 작성하기
              </Button>
                )}
              </div>

          {/* 리뷰 목록 */}
          <div className="space-y-4">
            {reviews.length > 0 ? (
              reviews.map((review) => (
                <div
                  key={review.id}
                  className="bg-white p-4 rounded-lg shadow"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <img
                          src={review.avatar_path || "/default-avatar.png"}
                          alt={review.author}
                          className="w-10 h-10 rounded-full"
                        />
                        <div>
                          <h3 className="font-semibold">{review.author}</h3>
                          <p className="text-sm text-gray-500">
                            {new Date(review.created_at).toLocaleDateString()}
                          </p>
            </div>
                      </div>
                      <p className="mt-2">{review.content}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">
                아직 작성된 리뷰가 없습니다.
              </p>
            )}
          </div>
        </div>

        {/* 리뷰 작성 모달 */}
        {showReviewModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">리뷰 작성</h2>
                <button
                  onClick={() => setShowReviewModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <FaTimes size={24} />
                </button>
              </div>

              <form onSubmit={(e) => {
                e.preventDefault();
                handleReviewSubmit({
                  title,
                  content: reviewContent,
                  rating,
                  is_spoiler: isSpoiler
                });
              }} className="space-y-4">
                {/* 컨텐츠 정보 표시 */}
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded">
                  {content?.poster_path && (
                    <img
                      src={`https://image.tmdb.org/t/p/w92${content.poster_path}`}
                      alt={content.title || content.name}
                        className="w-16 h-24 object-cover rounded"
                      />
                    )}
                  <div>
                    <h3 className="font-bold">
                      {content?.title || content?.name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {content?.release_date
                        ? new Date(content.release_date).getFullYear()
                        : content?.first_air_date
                        ? new Date(content.first_air_date).getFullYear()
                        : ""}
                    </p>
                      </div>
                      </div>

                {/* 별점 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    별점
                  </label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star * 2)}
                        className="text-2xl focus:outline-none"
                      >
                        <FaStar
                          className={
                            star <= rating / 2
                              ? "text-yellow-400"
                              : "text-gray-300"
                          }
                        />
                      </button>
                    ))}
                    <span className="ml-2 text-sm text-gray-600">
                      {rating}/10
                    </span>
                  </div>
                </div>

                {/* 제목 입력 */}
                <div>
                  <label
                    htmlFor="title"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    제목
                  </label>
                  <input
                    type="text"
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                    required
                  />
                </div>

                {/* 내용 입력 */}
                <div>
                  <label
                    htmlFor="content"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    내용
                  </label>
                  <textarea
                    id="content"
                    value={reviewContent}
                    onChange={(e) => setReviewContent(e.target.value)}
                    rows={5}
                    className="w-full px-3 py-2 border rounded-md"
                    required
                  />
                </div>

                {/* 스포일러 체크박스 */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="spoiler"
                    checked={isSpoiler}
                    onChange={(e) => setIsSpoiler(e.target.checked)}
                    className="rounded"
                  />
                  <label
                    htmlFor="spoiler"
                    className="text-sm text-gray-700"
                  >
                    스포일러 포함
                  </label>
                </div>

                {/* 버튼 */}
                <div className="flex justify-end gap-2 mt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowReviewModal(false)}
                    className="px-6 py-2 text-gray-700 hover:bg-gray-100"
                  >
                    취소
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2 bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-400"
                  >
                    {isSubmitting ? "제출 중..." : "확인"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 출연진 섹션 */}
        {cast.length > 0 && <CastCarousel cast={cast} />}

        {/* 비디오 섹션 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">비디오</h2>
            {videos.length > 3 && (
              <Link
                to={`/${mediaType}/${id}/videos`}
                className="text-blue-600 hover:underline flex items-center"
              >
                <span>전체보기</span>
                <svg
                  className="w-4 h-4 ml-1"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </Link>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {videos.length > 0 ? (
              videos.slice(0, 3).map((video) => (
                <div
                  key={video.id}
                  className="border rounded-lg p-2 cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() =>
                    video.site === "YouTube" && handleVideoClick(video)
                  }
                >
                  {video.site === "YouTube" ? (
                    <>
                      <div className="aspect-video relative overflow-hidden rounded">
                        <img
                          src={`https://img.youtube.com/vi/${video.key}/mqdefault.jpg`}
                          alt={video.name}
                          className="w-full h-full object-cover transition-transform hover:scale-105"
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-16 h-16 bg-black bg-opacity-60 rounded-full flex items-center justify-center transition-transform hover:scale-110 hover:bg-opacity-70">
                            <svg
                              viewBox="0 0 24 24"
                              className="w-8 h-8 text-white ml-1"
                              fill="currentColor"
                            >
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </div>
                        </div>
                      </div>
                      <p className="text-sm font-medium pt-2 line-clamp-1">
                        {video.name}
                      </p>
                    </>
                  ) : (
                    <div className="aspect-video bg-gray-200 flex items-center justify-center">
                      <p className="text-gray-600">{video.name}</p>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="col-span-3 text-center py-4 text-gray-500">
                사용 가능한 비디오가 없습니다.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 비디오 재생 모달 */}
      {selectedVideo && (
        <VideoPlayerModal
          videoKey={selectedVideo.key}
          videoName={selectedVideo.name}
          isOpen={isVideoModalOpen}
          onClose={closeVideoModal}
        />
      )}

      {/* 푸터 영역 */}
      <footer className="bg-gray-800 text-white py-8 mt-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between">
            <div className="mb-4 md:mb-0">
              <h3 className="font-medium mb-2">Site name</h3>
            </div>

            <div className="grid grid-cols-3 gap-8">
              <div>
                <h4 className="font-medium mb-2">Topic</h4>
                <ul className="space-y-1">
                  <li>
                    <a href="#" className="text-gray-300 hover:text-white">
                      Page
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-gray-300 hover:text-white">
                      Page
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-gray-300 hover:text-white">
                      Page
                    </a>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium mb-2">Topic</h4>
                <ul className="space-y-1">
                  <li>
                    <a href="#" className="text-gray-300 hover:text-white">
                      Page
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-gray-300 hover:text-white">
                      Page
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-gray-300 hover:text-white">
                      Page
                    </a>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium mb-2">Topic</h4>
                <ul className="space-y-1">
                  <li>
                    <a href="#" className="text-gray-300 hover:text-white">
                      Page
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-gray-300 hover:text-white">
                      Page
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-gray-300 hover:text-white">
                      Page
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ContentDetailPage;
