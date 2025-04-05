import { useState, useEffect } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
import { backendApi } from "../api/backendApi";
import { ContentDetail, Video } from "../types/content";
import VideoPlayerModal from "../components/VideoPlayerModal";

const ContentVideosPage = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const mediaType = location.pathname.includes("/tv/") ? "tv" : "movie";

  const [content, setContent] = useState<ContentDetail | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);

  useEffect(() => {
    const fetchVideos = async () => {
      setLoading(true);
      try {
        if (id) {
          // 미디어 타입에 따라 API 호출 결정
          if (mediaType === "tv") {
            // TV 프로그램인 경우
            const tvResponse = await backendApi.getTvDetails(parseInt(id));
            setContent(tvResponse);

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
            const movieResponse = await backendApi.getMovieDetails(
              parseInt(id)
            );
            setContent(movieResponse);

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
          `${mediaType === "tv" ? "TV 프로그램" : "영화"} 정보를 가져오는 중 오류가 발생했습니다.`
        );
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, [id, mediaType]);

  const handleVideoClick = (video: Video) => {
    setSelectedVideo(video);
    setIsVideoModalOpen(true);
  };

  const closeVideoModal = () => {
    setIsVideoModalOpen(false);
    setSelectedVideo(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-6xl mx-auto py-6 px-4">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <Link
              to={`/${mediaType}/${id}`}
              className="text-blue-500 hover:underline mb-2 inline-block"
            >
              &larr; {content?.title || content?.name || "콘텐츠"} 상세 페이지로
              돌아가기
            </Link>
            <h1 className="text-2xl font-bold">
              {content?.title || content?.name || "콘텐츠"} 비디오
            </h1>
          </div>
        </div>

        {videos.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            비디오 정보가 없습니다.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((video) => {
              // YouTube 비디오만 지원
              if (video.site === "YouTube") {
                return (
                  <div
                    key={video.id}
                    className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer transform transition hover:scale-105"
                    onClick={() => handleVideoClick(video)}
                  >
                    <div className="relative">
                      <img
                        src={`https://img.youtube.com/vi/${video.key}/mqdefault.jpg`}
                        alt={video.name}
                        className="w-full h-48 object-cover"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
                        <svg
                          className="w-16 h-16 text-white opacity-80"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-lg truncate">
                        {video.name}
                      </h3>
                      <p className="text-gray-600 text-sm">{video.type}</p>
                    </div>
                  </div>
                );
              }
              return null;
            })}
          </div>
        )}

        {/* 비디오 플레이어 모달 */}
        {selectedVideo && (
          <VideoPlayerModal
            isOpen={isVideoModalOpen}
            onClose={closeVideoModal}
            videoKey={selectedVideo.key}
            videoName={selectedVideo.name}
          />
        )}
      </div>
    </div>
  );
};

export default ContentVideosPage;
