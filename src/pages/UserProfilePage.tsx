import React, { useState, useEffect } from "react";
import { useParams, Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  FaUser,
  FaBookmark,
  FaHeart,
  FaComment,
  FaTh,
  FaVideo,
  FaStar,
  FaPencilAlt,
} from "react-icons/fa";
import {
  getOtherUserProfile,
  getOtherUserActivity,
  getOtherUserScraps,
  toggleFollow,
} from "../api/userApi";
import { UserProfile, UserActivity } from "../types/user";
import ContentCard from "../components/ContentCard";

// 다른 사용자의 프로필 페이지 컴포넌트
const UserProfilePage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const { user: currentUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // 각 섹션 데이터 상태
  const [profileData, setProfileData] = useState<UserProfile | null>(null);
  const [activityData, setActivityData] = useState<UserActivity | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>("posts");
  const [scrappedMovies, setScrappedMovies] = useState<any[]>([]);
  const [isFollowing, setIsFollowing] = useState<boolean>(false);

  // userId 변경 감지 및 페이지 리로드
  useEffect(() => {
    const currentPath = location.pathname;
    const lastPath = localStorage.getItem('last_profile_path');

    if (lastPath && lastPath !== currentPath) {
      // 페이지 새로고침 대신 navigate 사용
      navigate(currentPath, { replace: true });
    }

    // 현재 경로 저장
    localStorage.setItem('last_profile_path', currentPath);
  }, [location.pathname, navigate]);

  useEffect(() => {
    // 사용자 데이터 로드
    const fetchUserData = async () => {
      if (!userId) return;

      try {
        setLoading(true);

        // 병렬로 여러 API 요청 처리
        const [profile, activity, scraps] = await Promise.all([
          getOtherUserProfile(userId),
          getOtherUserActivity(userId),
          getOtherUserScraps(userId),
        ]);

        setProfileData(profile);
        setActivityData(activity);
        setScrappedMovies(scraps);

        // 로컬 스토리지에서 팔로우 상태 확인
        const followStateKey = `follow_state_${userId}`;
        const savedFollowState = localStorage.getItem(followStateKey);

        // 저장된 상태가 있으면 그 상태를 사용하고, 없으면 API에서 받은 상태 사용
        setIsFollowing(
            savedFollowState !== null
                ? savedFollowState === 'true'
                : profile.isFollowing || false
        );
      } catch (error) {
        console.error("Failed to fetch user data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [userId]);

  // 팔로우/언팔로우 처리
  const handleFollowToggle = async () => {
    if (!userId) return;

    try {
      const result = await toggleFollow(userId);
      setIsFollowing(result.isFollowing);

      // 팔로워 수 업데이트
      if (profileData) {
        setProfileData({
          ...profileData,
          followerCount:
              profileData.followerCount + (result.isFollowing ? 1 : -1),
        });
      }
    } catch (error) {
      console.error("Failed to toggle follow", error);
    }
  };

  // 더미 포스트 데이터
  const dummyPosts = [
    {
      id: 1,
      imageUrl: "https://via.placeholder.com/300",
      likeCount: 24,
      commentCount: 5,
    },
    {
      id: 2,
      imageUrl: "https://via.placeholder.com/300",
      likeCount: 18,
      commentCount: 3,
    },
    {
      id: 3,
      imageUrl: "https://via.placeholder.com/300",
      likeCount: 32,
      commentCount: 7,
    },
  ];

  // 더미 리뷰 데이터
  const dummyReviews = [
    {
      id: 1,
      movieTitle: "인셉션",
      rating: 4.5,
      content: "꿈속의 꿈을 탐험하는 놀라운 영화였습니다.",
      date: "2023-05-15",
    },
    {
      id: 2,
      movieTitle: "기생충",
      rating: 5.0,
      content: "사회 계층에 대한 날카로운 비판을 담은 걸작입니다.",
      date: "2023-06-20",
    },
  ];

  // 스크랩 탭 렌더링
  const renderScrapsTab = () => {
    if (loading) {
      return <div className="text-center py-8">로딩 중...</div>;
    }

    if (!scrappedMovies || scrappedMovies.length === 0) {
      return (
          <div className="text-center py-8 text-gray-500">
            스크랩한 영화가 없습니다.
          </div>
      );
    }

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
          {scrappedMovies.map((movie) => (
              <ContentCard
                  key={movie.id}
                  content={movie}
                  type="movie"
                  className="w-full"
              />
          ))}
        </div>
    );
  };

  // 탭 컨텐츠 렌더링
  const renderTabContent = () => {
    switch (activeTab) {
      case "posts":
        return (
            <div className="grid grid-cols-3 gap-1 md:gap-4 mt-2">
              {dummyPosts.map((post) => (
                  <div key={post.id} className="relative group aspect-square">
                    <img
                        src={post.imageUrl}
                        alt={`게시물 ${post.id}`}
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200">
                      <div className="flex items-center space-x-4 text-white">
                        <div className="flex items-center">
                          <FaHeart className="mr-1" /> {post.likeCount}
                        </div>
                        <div className="flex items-center">
                          <FaComment className="mr-1" /> {post.commentCount}
                        </div>
                      </div>
                    </div>
                  </div>
              ))}
            </div>
        );
      case "reviews":
        return (
            <div className="mt-4">
              {dummyReviews.length > 0 ? (
                  <div className="space-y-4">
                    {dummyReviews.map((review) => (
                        <div
                            key={review.id}
                            className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-bold text-lg">{review.movieTitle}</h3>
                            <div className="flex items-center">
                              <FaStar className="text-yellow-400 mr-1" />
                              <span className="font-medium">{review.rating}</span>
                            </div>
                          </div>
                          <p className="text-gray-700 mb-3">{review.content}</p>
                          <div className="text-sm text-gray-500">{review.date}</div>
                        </div>
                    ))}
                  </div>
              ) : (
                  <div className="mt-8 text-center py-12 text-gray-500">
                    <FaPencilAlt className="text-4xl mx-auto mb-4" />
                    <h3 className="text-xl mb-2">작성한 리뷰가 없습니다</h3>
                  </div>
              )}
            </div>
        );
      case "scraps":
        return renderScrapsTab();
      default:
        return null;
    }
  };

  if (loading) {
    return (
        <div className="container mx-auto px-4 py-8 flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
    );
  }

  if (!profileData) {
    return (
        <div className="container mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold mb-4">사용자를 찾을 수 없습니다</h1>
          <Link to="/" className="text-blue-500 hover:underline">
            홈으로 돌아가기
          </Link>
        </div>
    );
  }

  return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* 프로필 헤더 섹션 */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row items-start md:items-center">
            {/* 프로필 이미지 */}
            <div className="relative mb-4 md:mb-0 md:mr-10 flex-shrink-0">
              <div className="h-28 w-28 md:h-36 md:w-36 rounded-full overflow-hidden bg-gray-200 border border-gray-300">
                {profileData.user.profileImageUrl ? (
                    <img
                        src={profileData.user.profileImageUrl}
                        alt="프로필 이미지"
                        className="h-full w-full object-cover"
                    />
                ) : (
                    <div className="h-full w-full flex items-center justify-center bg-gray-100">
                      <FaUser className="text-gray-400 text-4xl" />
                    </div>
                )}
              </div>
            </div>

            {/* 프로필 정보 */}
            <div className="flex-grow">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-xl md:text-2xl font-medium">
                  {profileData.user.username}
                </h1>
                {currentUser && currentUser.id !== Number(userId) && (
                    <button
                        onClick={handleFollowToggle}
                        className={`px-4 py-1.5 rounded-full font-bold text-sm ${
                            isFollowing
                                ? "bg-white text-black border border-gray-300 hover:border-red-500 hover:text-red-500 hover:bg-red-50"
                                : "bg-black text-white hover:bg-gray-800"
                        }`}
                        onMouseEnter={(e) => {
                          if (isFollowing) {
                            e.currentTarget.textContent = "언팔로우";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (isFollowing) {
                            e.currentTarget.textContent = "팔로잉";
                          }
                        }}
                    >
                      {isFollowing ? "팔로잉" : "팔로우"}
                    </button>
                )}
              </div>

              {/* 통계 (팔로워, 팔로잉 등) */}
              <div className="flex space-x-6 mb-4">
                <div className="text-center md:text-left">
                <span className="font-semibold">
                  {profileData.watchedMoviesCount}
                </span>
                  <span className="ml-1">게시물</span>
                </div>
                <div className="text-center md:text-left">
                <span className="font-semibold">
                  {profileData.followerCount}
                </span>
                  <span className="ml-1">팔로워</span>
                </div>
                <div className="text-center md:text-left">
                <span className="font-semibold">
                  {profileData.followingCount}
                </span>
                  <span className="ml-1">팔로우</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 프로필 설명 (Bio) */}
        <div className="mb-6 px-4">
          <p className="text-sm">{profileData.user.bio || "영화와 리뷰를 공유하는 공간"}</p>
        </div>

        {/* 탭 메뉴 */}
        <div className="border-t border-gray-200">
          <div className="flex justify-center">
            <button
                className={`px-6 py-3 flex items-center ${
                    activeTab === "posts"
                        ? "border-t border-black text-black"
                        : "text-gray-500"
                }`}
                onClick={() => setActiveTab("posts")}
            >
              <FaTh className="mr-1" /> 게시물
            </button>
            <button
                className={`px-6 py-3 flex items-center ${
                    activeTab === "reviews"
                        ? "border-t border-black text-black"
                        : "text-gray-500"
                }`}
                onClick={() => setActiveTab("reviews")}
            >
              <FaPencilAlt className="mr-1" /> 리뷰
            </button>
            <button
                className={`px-6 py-3 flex items-center ${
                    activeTab === "scraps"
                        ? "border-t border-black text-black"
                        : "text-gray-500"
                }`}
                onClick={() => setActiveTab("scraps")}
            >
              <FaBookmark className="mr-1" /> 스크랩
            </button>
          </div>
        </div>

        {/* 탭 컨텐츠 */}
        {renderTabContent()}
      </div>
  );
};

export default UserProfilePage;
