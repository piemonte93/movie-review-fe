import { useState, useEffect } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
import { backendApi, CombinedReview, Review } from "../api/backendApi";
import {
  FaStar,
  FaTimes,
  FaBookmark,
  FaUserCircle,
  FaCalendarAlt,
} from "react-icons/fa";
import { ContentDetail, Review as TmdbReview, Video } from "../types/content";
import VideoPlayerModal from "../components/VideoPlayerModal";
import CastCarousel from "../components/CastCarousel";
import defaultProfile from "../assets/default-profile.svg";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-toastify";
import { checkContentScrapStatus, toggleContentScrap } from "../api/userApi";
import { StarRating } from "../components/StarRating";
import { formatDate } from "../utils/dateUtils";

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
  const { isLoggedIn, user, isUserBlocked } = useAuth();
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const [content, setContent] = useState<ContentDetail | null>(null);
  const [tmdbReviews, setTmdbReviews] = useState<TmdbReview[]>([]);
  const [localReviews, setLocalReviews] = useState<Review[]>([]);
  const [combinedReviews, setCombinedReviews] = useState<CombinedReview[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [cast, setCast] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTV, setIsTV] = useState(false);
  const [reviewImageErrors, setReviewImageErrors] = useState<{
    [key: string]: boolean;
  }>({});
  const [isScraped, setIsScraped] = useState<boolean>(false);
  const [scrappingInProgress, setScrappingInProgress] =
    useState<boolean>(false);

  // 리뷰 작성 모달 관련 상태
  const [showWriteForm, setShowWriteForm] = useState(false);
  const [title, setTitle] = useState("");
  const [reviewContent, setReviewContent] = useState("");
  const [rating, setRating] = useState<number>(0);
  const [isSpoiler, setIsSpoiler] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

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

  const handleReviewImageError = (reviewId: string | number) => {
    setReviewImageErrors((prev) => ({ ...prev, [String(reviewId)]: true }));
  };

  // 리뷰 작성 제출 핸들러
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isLoggedIn) {
      toast.error("리뷰를 작성하려면 로그인이 필요합니다.");
      return;
    }

    if (!content) {
      toast.error("컨텐츠 정보를 찾을 수 없습니다.");
      return;
    }

    if (!title.trim() || !reviewContent.trim()) {
      toast.error("제목과 내용을 모두 입력해주세요.");
      return;
    }

    if (rating === 0) {
      toast.error("별점을 선택해주세요.");
      return;
    }

    try {
      setSubmitting(true);

      // 해당 영화에 대한 리뷰가 이미 존재하는지 사전 확인
      try {
        const hasExistingReview = await backendApi.checkUserReviewForMovie(
          parseInt(id!)
        );

        if (hasExistingReview) {
          toast.error("이미 이 영화에 대한 리뷰를 작성하셨습니다.");
          setSubmitting(false);
          return;
        }
      } catch (checkError) {
        console.error("리뷰 존재 여부 확인 실패:", checkError);
      }

      const reviewData = {
        movie_id: parseInt(id!),
        movie_title: content.title || content.name || "",
        movie_poster_path: content.posterPath || content.poster_path || "",
        title: title.trim(),
        content: reviewContent.trim(),
        rating: rating,
        is_spoiler: isSpoiler,
      };

      console.log("리뷰 작성 요청 데이터:", reviewData);
      const response = await backendApi.createMovieReview(reviewData);
      console.log("리뷰 생성 성공:", response);

      toast.success("리뷰가 성공적으로 등록되었습니다.");
      resetForm();

      // 리뷰 목록 새로고침
      if (mediaType === "movie") {
        const reviewsResponse = await backendApi.getMovieReviews(parseInt(id!));
        setTmdbReviews(reviewsResponse.results || []);
      }
    } catch (error) {
      console.error("리뷰 작성 실패:", error);
      toast.error("리뷰 작성에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  // 폼 초기화
  const resetForm = () => {
    setTitle("");
    setReviewContent("");
    setRating(0);
    setIsSpoiler(false);
    setShowWriteForm(false);
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

  useEffect(() => {
    const fetchContentDetails = async () => {
      if (!id) {
        setError("Invalid content ID.");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      setIsTV(mediaType === "tv");

      try {
        const detailsPromise =
          mediaType === "tv"
            ? backendApi.getTvDetails(parseInt(id))
            : backendApi.getMovieDetails(parseInt(id));
        const creditsPromise =
          mediaType === "tv"
            ? backendApi.getTvCredits(parseInt(id))
            : backendApi.getMovieCredits(parseInt(id));
        const videosPromise =
          mediaType === "tv"
            ? backendApi.getTvVideos(parseInt(id))
            : backendApi.getMovieVideos(parseInt(id));
        const localReviewsPromise =
          mediaType === "tv"
            ? backendApi.getTvShowReviewsByTmdbId(parseInt(id), 0, 10)
            : backendApi.getMovieReviewsByTmdbId(parseInt(id), 0, 10);
        const tmdbReviewsPromise =
          mediaType === "tv"
            ? backendApi.getTvReviews(parseInt(id))
            : backendApi.getMovieReviews(parseInt(id));

        const [
          detailsResponse,
          creditsResponse,
          videosResponse,
          localReviewsResponse,
          tmdbReviewsResponse,
        ] = await Promise.all([
          detailsPromise,
          creditsPromise,
          videosPromise,
          localReviewsPromise,
          tmdbReviewsPromise,
        ]);

        setContent(detailsResponse);
        setCast(creditsResponse.cast || []);
        setVideos(videosResponse.results || []);

        // 로컬 리뷰 설정
        setLocalReviews(localReviewsResponse.content || []);

        // TMDB 리뷰 설정
        setTmdbReviews(tmdbReviewsResponse.results || []);

        // 로컬 리뷰와 TMDB 리뷰를 결합하여 combinedReviews 설정
        const tmdbReviewsWithSource = (tmdbReviewsResponse.results || []).map(
          (review) => ({
            ...review,
            source: "tmdb" as const,
            id: review.id,
          })
        );

        // 로컬 리뷰가 TMDB 리뷰보다 우선순위가 높도록 합침
        const localReviewsWithSource = (localReviewsResponse.content || []).map(
          (review) => ({
            ...review,
            source: "local" as const,
          })
        );

        setCombinedReviews([
          ...localReviewsWithSource,
          ...tmdbReviewsWithSource,
        ]);

        // 스크랩 상태 확인 (로그인한 경우)
        if (isLoggedIn) {
          try {
            const scrapStatus = await checkContentScrapStatus(
              parseInt(id),
              mediaType
            );
            setIsScraped(scrapStatus);
          } catch (error) {
            console.error("스크랩 상태 확인 실패:", error);
          }
        }
      } catch (error) {
        console.error(
          `콘텐츠 상세 정보 가져오기 실패 (타입: ${mediaType}, ID: ${id}):`,
          error
        );
        setError("콘텐츠 정보를 불러오는데 실패했습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchContentDetails();
  }, [id, mediaType, isLoggedIn]);

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
              {content.posterPath || content.poster_path ? (
                <img
                  src={`https://image.tmdb.org/t/p/w500${content.posterPath || content.poster_path}`}
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
                    {content.firstAirDate || content.first_air_date
                      ? `${new Date(
                          content.firstAirDate || content.first_air_date || ""
                        ).toLocaleDateString("ko-KR", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })} 방영`
                      : "방영일 정보 없음"}
                    {content.numberOfSeasons || content.number_of_seasons
                      ? ` • 시즌 ${content.numberOfSeasons || content.number_of_seasons}개`
                      : ""}
                    {content.numberOfEpisodes || content.number_of_episodes
                      ? ` • 에피소드 ${content.numberOfEpisodes || content.number_of_episodes}개`
                      : ""}
                  </>
                ) : (
                  <>
                    {content.releaseDate || content.release_date
                      ? `${new Date(
                          content.releaseDate || content.release_date || ""
                        ).toLocaleDateString("ko-KR", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })} 개봉`
                      : ""}
                    {content.runtime
                      ? ` • 상영 시간: ${content.runtime}분`
                      : ""}
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
                      star <=
                      (content.voteAverage || content.vote_average || 0) / 2
                        ? "text-yellow-400"
                        : "text-gray-300"
                    }
                    size={24}
                  />
                ))}
                <span className="ml-2">
                  {(content.voteAverage || content.vote_average || 0).toFixed(
                    1
                  )}
                  /10 ({content.voteCount || content.vote_count || 0})
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

              {/* 안에 버튼 부분 수정: 리뷰 쓰기 버튼 옆에 스크랩 버튼 추가 */}
              <div className="flex flex-wrap gap-2 mt-4">
                {!isTV && isLoggedIn && !isUserBlocked() && (
                  <button
                    onClick={() => setShowWriteForm(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
                  >
                    리뷰 쓰기
                  </button>
                )}
                {isLoggedIn && (
                  <button
                    onClick={handleToggleScrap}
                    disabled={scrappingInProgress}
                    className={`flex items-center px-4 py-2 rounded transition ${
                      isScraped
                        ? "bg-yellow-500 text-white hover:bg-yellow-600"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    <FaBookmark className="mr-1" />
                    {isScraped ? "스크랩됨" : "스크랩하기"}
                  </button>
                )}
                {!isLoggedIn && (
                  <Link
                    to="/login"
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
                  >
                    로그인하고 리뷰 쓰기
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

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
                {/* 영화 정보 표시 */}
                <div className="mb-4">
                  <label className="block text-gray-700 font-medium mb-2">
                    영화
                  </label>
                  <div className="flex items-center space-x-4 p-2 border rounded">
                    {(content.posterPath || content.poster_path) && (
                      <img
                        src={`https://image.tmdb.org/t/p/w92${content.posterPath || content.poster_path}`}
                        alt={content.title || content.name || ""}
                        className="w-16 h-24 object-cover rounded"
                      />
                    )}
                    <div className="flex-1">
                      <div className="font-medium">
                        {content.title || content.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {content.releaseDate || content.release_date
                          ? new Date(
                              content.releaseDate || content.release_date || ""
                            ).getFullYear()
                          : "연도 정보 없음"}
                      </div>
                    </div>
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
                    <span className="ml-2 text-gray-700">{rating}점</span>
                  </div>
                </div>

                {/* 리뷰 내용 */}
                <div>
                  <label className="block text-gray-700 font-medium mb-2">
                    내용
                  </label>
                  <textarea
                    value={reviewContent}
                    onChange={(e) => setReviewContent(e.target.value)}
                    rows={6}
                    className="w-full p-2 border rounded focus:outline-none focus:border-blue-500"
                    required
                  ></textarea>
                </div>

                {/* 스포일러 여부 */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isSpoiler"
                    checked={isSpoiler}
                    onChange={(e) => setIsSpoiler(e.target.checked)}
                    className="mr-2"
                  />
                  <label htmlFor="isSpoiler">스포일러 포함</label>
                </div>

                {/* 제출 버튼 */}
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowWriteForm(false)}
                    className="mr-2 px-4 py-2 border rounded"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-400"
                  >
                    {submitting ? "제출 중..." : "리뷰 등록"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 출연진 섹션 */}
        {cast.length > 0 && <CastCarousel cast={cast} />}

        {/* 리뷰 섹션 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">리뷰</h2>
            <button className="text-blue-600 hover:underline">전체보기</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {combinedReviews.length > 0 ? (
              combinedReviews.slice(0, 4).map((review) => (
                <div key={review.id} className="border rounded-lg p-4">
                  {review.source === "local" ? (
                    // 로컬 리뷰 표시
                    <>
                      <div className="flex items-center gap-2 mb-2">
                        {review.user?.profileImageUrl ? (
                          <img
                            src={review.user.profileImageUrl}
                            alt={review.user?.username}
                            className="w-8 h-8 rounded-full object-cover"
                            onError={() =>
                              handleReviewImageError(String(review.id))
                            }
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                            <FaUserCircle className="text-gray-400" />
                          </div>
                        )}
                        <span className="font-semibold">{review.username}</span>
                      </div>

                      {/* 별점 표시 */}
                      <div className="flex items-center mb-2">
                        <StarRating rating={review.rating || 0} />
                        <span className="ml-2 text-sm text-gray-600">
                          ({review.rating || 0}점)
                        </span>
                      </div>

                      {/* 작성 날짜 */}
                      <div className="flex items-center text-xs text-gray-500 mb-2">
                        <FaCalendarAlt className="mr-1" />
                        {review.createdAt ? formatDate(review.createdAt) : ""}
                      </div>

                      {/* 리뷰 제목 */}
                      {review.title && (
                        <h3 className="font-medium mb-1">{review.title}</h3>
                      )}

                      {/* 리뷰 내용 */}
                      <p className="text-gray-600 text-sm mb-1 line-clamp-3">
                        {review.content}
                      </p>
                    </>
                  ) : (
                    // TMDB 리뷰 표시 (기존 방식)
                    <>
                      <div className="flex items-center gap-2 mb-2">
                        {!reviewImageErrors[String(review.id)] &&
                        review.avatar_path ? (
                          <img
                            src={
                              review.avatar_path.startsWith("/http")
                                ? review.avatar_path.substring(1)
                                : `https://image.tmdb.org/t/p/w200${review.avatar_path}`
                            }
                            alt={review.author}
                            className="w-8 h-8 rounded-full object-cover"
                            onError={() =>
                              handleReviewImageError(String(review.id))
                            }
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center">
                            <img
                              src={defaultProfile}
                              alt={review.author}
                              className="w-4 h-4 object-contain opacity-70"
                            />
                          </div>
                        )}
                        <span className="font-medium">{review.author}</span>
                      </div>

                      {/* TMDB 별점 표시 (있는 경우) */}
                      {review.author_details?.rating && (
                        <div className="flex items-center mb-2">
                          <StarRating
                            rating={review.author_details.rating / 2}
                          />
                          <span className="ml-2 text-sm text-gray-600">
                            ({review.author_details.rating}/10)
                          </span>
                        </div>
                      )}

                      <p className="text-gray-600 text-sm mb-1 line-clamp-3">
                        {review.content}
                      </p>
                    </>
                  )}
                </div>
              ))
            ) : (
              <div className="col-span-4 text-center py-4 text-gray-500">
                작성된 리뷰가 없습니다.
              </div>
            )}
          </div>
        </div>

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
                    <div className="aspect-video flex items-center justify-center bg-gray-100 rounded">
                      <span className="text-sm text-gray-500">
                        {video.site} 비디오
                      </span>
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
