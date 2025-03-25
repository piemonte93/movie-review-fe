import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  FaCamera,
  FaUser,
  FaEllipsisH,
  FaBookmark,
  FaHeart,
  FaComment,
  FaTh,
  FaVideo,
  FaStar,
  FaPencilAlt,
} from "react-icons/fa";
import {
  getUserProfile,
  getUserActivity,
  getFollowRecommendations,
  uploadProfileImage,
  updateUserProfile,
  getUserScraps,
} from "../api/userApi";
import { UserProfile, UserActivity } from "../types/user";
import ContentCard from "../components/ContentCard";

// 프로필 페이지 컴포넌트
const ProfilePage: React.FC = () => {
  const { user, isLoggedIn, updateUserInfo } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 각 섹션 데이터 상태
  const [profileData, setProfileData] = useState<UserProfile | null>(null);
  const [activityData, setActivityData] = useState<UserActivity | null>(null);
  const [followRecommendations, setFollowRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [uploadingImage, setUploadingImage] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("posts");
  const [scrappedMovies, setScrappedMovies] = useState<any[]>([]);

  useEffect(() => {
    // 사용자 데이터 로드
    const fetchUserData = async () => {
      try {
        setLoading(true);

        // 병렬로 여러 API 요청 처리
        const [profile, activity, recommendations, scraps] = await Promise.all([
          getUserProfile(),
          getUserActivity(),
          getFollowRecommendations(),
          getUserScraps(),
        ]);

        setProfileData(profile);
        setActivityData(activity);
        setFollowRecommendations(recommendations);
        setScrappedMovies(scraps);
      } catch (error) {
        console.error("Failed to fetch user data", error);
      } finally {
        setLoading(false);
      }
    };

    if (isLoggedIn) {
      fetchUserData();
    }
  }, [isLoggedIn]);

  // 프로필 이미지 선택 처리
  const handleProfileImageClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // 프로필 이미지 변경 처리
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try {
        setUploadingImage(true);
        const file = e.target.files[0];

        // 이미지 파일 타입 확인
        if (!file.type.startsWith("image/")) {
          alert("이미지 파일만 업로드 가능합니다.");
          return;
        }

        // 파일 크기 제한 (5MB)
        if (file.size > 5 * 1024 * 1024) {
          alert("파일 크기는 5MB 이하여야 합니다.");
          return;
        }

        // 이미지 업로드 API 호출
        const result = await uploadProfileImage(file);

        // 프로필 정보 업데이트 API 호출
        await updateUserProfile({ profileImageUrl: result.profileImageUrl });

        // AuthContext를 통해 사용자 정보 업데이트
        updateUserInfo({ profileImageUrl: result.profileImageUrl });

        // 성공 메시지
        alert("프로필 이미지가 업데이트되었습니다.");
      } catch (error) {
        console.error("프로필 이미지 업로드 실패:", error);
        alert("이미지 업로드에 실패했습니다. 다시 시도해주세요.");
      } finally {
        setUploadingImage(false);
        // 파일 입력 초기화
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
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
    {
      id: 4,
      imageUrl: "https://via.placeholder.com/300",
      likeCount: 15,
      commentCount: 2,
    },
    {
      id: 5,
      imageUrl: "https://via.placeholder.com/300",
      likeCount: 27,
      commentCount: 4,
    },
    {
      id: 6,
      imageUrl: "https://via.placeholder.com/300",
      likeCount: 42,
      commentCount: 9,
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
    {
      id: 3,
      movieTitle: "다크나이트",
      rating: 4.8,
      content: "히어로 영화의 한계를 뛰어넘은 명작입니다.",
      date: "2023-07-08",
    },
  ];

  // 더미 좋아요 데이터
  const dummyLikes = [
    {
      id: 1,
      type: "movie",
      title: "어벤져스: 엔드게임",
      imageUrl: "https://via.placeholder.com/150",
      date: "2023-08-12",
    },
    {
      id: 2,
      type: "review",
      author: "영화광123",
      title: "기생충 리뷰",
      content: "사회 계층에 대한 날카로운 비판을 담은 걸작입니다.",
      date: "2023-07-18",
    },
    {
      id: 3,
      type: "movie",
      title: "라라랜드",
      imageUrl: "https://via.placeholder.com/150",
      date: "2023-06-05",
    },
    {
      id: 4,
      type: "review",
      author: "시네필",
      title: "인셉션 리뷰",
      content: "꿈속의 꿈을 탐험하는 놀라운 영화였습니다.",
      date: "2023-05-22",
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
        return renderPostsTab();
      case "reviews":
        return renderReviewsTab();
      case "likes":
        return renderLikesTab();
      case "scraps":
        return renderScrapsTab();
      default:
        return null;
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="container mx-auto px-4 py-8 flex flex-col items-center justify-center h-64">
        <h1 className="text-2xl font-bold mb-4">로그인이 필요합니다</h1>
        <p className="mb-4">이 페이지를 보려면 로그인해주세요.</p>
        <Link
          to="/login"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          로그인 페이지로 이동
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* 프로필 헤더 섹션 - 인스타그램 스타일 */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row items-start md:items-center">
          {/* 프로필 이미지 */}
          <div className="relative mb-4 md:mb-0 md:mr-10 flex-shrink-0">
            <div
              className="h-28 w-28 md:h-36 md:w-36 rounded-full overflow-hidden bg-gray-200 cursor-pointer group border border-gray-300"
              onClick={handleProfileImageClick}
            >
              {user?.profileImageUrl ? (
                <img
                  src={user.profileImageUrl}
                  alt="프로필 이미지"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center bg-gray-100">
                  <FaUser className="text-gray-400 text-4xl" />
                </div>
              )}
              <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <FaCamera className="text-white text-xl" />
              </div>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageChange}
              accept="image/*"
              className="hidden"
              disabled={uploadingImage}
            />
            {uploadingImage && (
              <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-70 rounded-full">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>

          {/* 프로필 정보 */}
          <div className="flex-grow">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-xl md:text-2xl font-medium">
                {user?.username || "사용자"}
              </h1>
              <div className="flex space-x-2">
                <Link
                  to="/profile/edit"
                  className="text-sm px-3 py-1 border border-gray-300 rounded font-medium hover:bg-gray-50"
                >
                  프로필 편집
                </Link>
                <button className="p-2 text-gray-500">
                  <FaEllipsisH />
                </button>
              </div>
            </div>

            {/* 통계 (팔로워, 팔로잉 등) */}
            <div className="flex space-x-6 mb-4">
              <div className="text-center md:text-left">
                <span className="font-semibold">
                  {profileData?.watchedMoviesCount || 0}
                </span>
                <span className="ml-1">게시물</span>
              </div>
              <div className="text-center md:text-left">
                <span className="font-semibold">
                  {profileData?.followerCount || 0}
                </span>
                <span className="ml-1">팔로워</span>
              </div>
              <div className="text-center md:text-left">
                <span className="font-semibold">
                  {profileData?.followingCount || 0}
                </span>
                <span className="ml-1">팔로우</span>
              </div>
            </div>

            {/* 프로필 소개 */}
            <div>
              <p className="text-sm">영화와 리뷰를 공유하는 공간</p>
              <p className="text-sm text-gray-500 mt-1">{user?.email}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 스토리 하이라이트 */}
      <div className="mb-8 border-t border-gray-200 pt-4">
        <div className="flex space-x-4 overflow-x-auto pb-2">
          {/* 하이라이트 항목들 */}
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-full border border-gray-300 flex items-center justify-center mb-1">
              <span className="text-3xl text-gray-300">+</span>
            </div>
            <span className="text-xs">새로 만들기</span>
          </div>
          {/* 추가 하이라이트 */}
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-full border border-gray-300 overflow-hidden mb-1">
              <img
                src="https://via.placeholder.com/64"
                alt="하이라이트"
                className="w-full h-full object-cover"
              />
            </div>
            <span className="text-xs">좋아하는 영화</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-full border border-gray-300 overflow-hidden mb-1">
              <img
                src="https://via.placeholder.com/64"
                alt="하이라이트"
                className="w-full h-full object-cover"
              />
            </div>
            <span className="text-xs">리뷰 모음</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-full border border-gray-300 overflow-hidden mb-1">
              <img
                src="https://via.placeholder.com/64"
                alt="하이라이트"
                className="w-full h-full object-cover"
              />
            </div>
            <span className="text-xs">영화제</span>
          </div>
        </div>
      </div>

      {/* 탭 메뉴 */}
      <div className="border-t border-gray-200">
        <div className="flex justify-center">
          <button
            className={`px-6 py-3 flex items-center ${activeTab === "posts" ? "border-t border-black text-black" : "text-gray-500"}`}
            onClick={() => setActiveTab("posts")}
          >
            <FaTh className="mr-1" /> 게시물
          </button>
          <button
            className={`px-6 py-3 flex items-center ${activeTab === "reviews" ? "border-t border-black text-black" : "text-gray-500"}`}
            onClick={() => setActiveTab("reviews")}
          >
            <FaPencilAlt className="mr-1" /> 리뷰
          </button>
          <button
            className={`px-6 py-3 flex items-center ${activeTab === "likes" ? "border-t border-black text-black" : "text-gray-500"}`}
            onClick={() => setActiveTab("likes")}
          >
            <FaHeart className="mr-1" /> 좋아요
          </button>
          <button
            className={`px-6 py-3 flex items-center ${activeTab === "scraps" ? "border-t border-black text-black" : "text-gray-500"}`}
            onClick={() => setActiveTab("scraps")}
          >
            <FaBookmark className="mr-1" /> 스크랩
          </button>
        </div>
      </div>

      {/* 게시물 그리드 */}
      {activeTab === "posts" && (
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
                    <FaBookmark className="mr-1" /> {post.commentCount}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 리뷰 목록 */}
      {activeTab === "reviews" && (
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
              <p className="max-w-md mx-auto">
                영화를 감상하고 첫 번째 리뷰를 작성해보세요.
              </p>
            </div>
          )}
        </div>
      )}

      {/* 좋아요 목록 */}
      {activeTab === "likes" && (
        <div className="mt-4">
          {dummyLikes.length > 0 ? (
            <div className="space-y-4">
              {dummyLikes.map((like) => (
                <div
                  key={like.id}
                  className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  {like.type === "movie" ? (
                    <div className="flex">
                      <img
                        src={like.imageUrl}
                        alt={like.title}
                        className="w-16 h-24 object-cover rounded mr-4"
                      />
                      <div>
                        <h3 className="font-bold">{like.title}</h3>
                        <p className="text-sm text-gray-500 mt-1">영화</p>
                        <p className="text-xs text-gray-400 mt-2">
                          {like.date}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center mb-2">
                        <span className="font-medium mr-2">{like.author}</span>
                        <span className="text-sm text-gray-500">의 리뷰</span>
                      </div>
                      <h3 className="font-bold mb-1">{like.title}</h3>
                      <p className="text-gray-700 text-sm mb-2">
                        {like.content}
                      </p>
                      <p className="text-xs text-gray-400">{like.date}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-8 text-center py-12 text-gray-500">
              <FaHeart className="text-4xl mx-auto mb-4" />
              <h3 className="text-xl mb-2">좋아요한 항목이 없습니다</h3>
              <p className="max-w-md mx-auto">
                영화, 리뷰, 게시물에 좋아요를 누르면 여기에 표시됩니다.
              </p>
            </div>
          )}
        </div>
      )}

      {/* 스크랩 목록 */}
      {activeTab === "scraps" && renderTabContent()}
    </div>
  );
};

export default ProfilePage;
