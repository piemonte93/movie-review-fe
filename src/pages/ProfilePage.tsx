import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
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
  FaTimes,
} from "react-icons/fa";
import {
  getUserProfile,
  getUserActivity,
  getFollowRecommendations,
  uploadProfileImage,
  updateUserProfile,
  getUserScraps,
  getFollowingList,
  getFollowersList,
  toggleFollow,
} from "../api/userApi";
import { UserProfile, UserActivity } from "../types/user";
import ContentCard from "../components/ContentCard";

// Timeout 타입 정의 추가
type TimeoutRef = ReturnType<typeof setTimeout> | null;

// 프로필 페이지 컴포넌트
const ProfilePage: React.FC = () => {
  const { user, isLoggedIn, updateUserInfo } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // 각 섹션 데이터 상태
  const [profileData, setProfileData] = useState<UserProfile | null>(null);
  const [activityData, setActivityData] = useState<UserActivity | null>(null);
  const [followRecommendations, setFollowRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [uploadingImage, setUploadingImage] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("posts");
  const [scrappedMovies, setScrappedMovies] = useState<any[]>([]);
  const [showFollowingModal, setShowFollowingModal] = useState<boolean>(false);
  const [showFollowersModal, setShowFollowersModal] = useState<boolean>(false);
  const [followingList, setFollowingList] = useState<any[]>([]);
  const [followersList, setFollowersList] = useState<any[]>([]);

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

  // 팔로잉 및 팔로워 목록 업데이트
  useEffect(() => {
    // 페이지가 로드될 때 팔로잉 및 팔로워 목록 미리 로드
    if (isLoggedIn && profileData) {
      fetchFollowingList();
      fetchFollowersList();
    }
  }, [isLoggedIn, profileData]);

  // 로컬 스토리지에서 팔로우한 사용자 ID 목록을 관리하는 함수
  const updateLocalFollowingCount = () => {
    // 로컬 스토리지 키
    const followingCountKey = 'following_count';
    const followingIdsKey = 'following_ids';
    
    // 로컬 스토리지에서 현재 팔로우 중인 ID 목록 가져오기
    const followingIdsStr = localStorage.getItem(followingIdsKey) || '[]';
    const followingIds = JSON.parse(followingIdsStr);
    
    // 팔로잉 수 업데이트
    if (profileData) {
      setProfileData({
        ...profileData,
        followingCount: followingIds.length,
      });
    }
    
    return followingIds;
  };

  // 페이지 로드 시 팔로잉 카운트 동기화
  useEffect(() => {
    if (profileData) {
      updateLocalFollowingCount();
    }
  }, [profileData]);

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

  // 팔로잉 목록 가져오기
  const fetchFollowingList = async () => {
    try {
      const data = await getFollowingList();
      setFollowingList(data);
      console.log("팔로잉 목록 로드됨:", data);
    } catch (error) {
      console.error("팔로잉 목록 가져오기 실패", error);
    }
  };

  // 팔로워 목록 가져오기
  const fetchFollowersList = async () => {
    try {
      const data = await getFollowersList();
      setFollowersList(data);
      console.log("팔로워 목록 로드됨:", data);
    } catch (error) {
      console.error("팔로워 목록 가져오기 실패", error);
    }
  };

  // 프로필 이미지 클릭 시 팔로잉 모달 열기
  const openFollowingModal = () => {
    fetchFollowingList();
    setShowFollowingModal(true);
  };

  // 프로필 이미지 클릭 시 팔로워 모달 열기
  const openFollowersModal = () => {
    fetchFollowersList();
    setShowFollowersModal(true);
  };

  // 프로필 이미지 클릭 시 팔로잉 모달 닫기
  const closeFollowingModal = () => {
    setShowFollowingModal(false);
  };

  // 프로필 이미지 클릭 시 팔로워 모달 닫기
  const closeFollowersModal = () => {
    setShowFollowersModal(false);
  };

  // 사용자 프로필 페이지로 이동
  const navigateToUserProfile = (userId: number) => {
    // URL만 변경하는 대신, 실제로 새 페이지로 이동하도록 합니다
    window.location.href = `/user/${userId}`;
    
    // 모달 닫기
    closeFollowingModal();
    closeFollowersModal();
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

  // 게시물 탭 렌더링
  const renderPostsTab = () => {
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
                  <FaBookmark className="mr-1" /> {post.commentCount}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // 리뷰 탭 렌더링
  const renderReviewsTab = () => {
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
            <p className="max-w-md mx-auto">
              영화를 감상하고 첫 번째 리뷰를 작성해보세요.
            </p>
          </div>
        )}
      </div>
    );
  };

  // 좋아요 탭 렌더링
  const renderLikesTab = () => {
    return (
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
                      <UserHoverCard userId={like.id} username={like.author || "알 수 없음"} />
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
                <a
                  href="/profile/edit"
                  className="text-sm px-3 py-1 border border-gray-300 rounded font-medium hover:bg-gray-50"
                  onClick={(e) => {
                    e.preventDefault();
                    // 로컬 스토리지에서 토큰 확인
                    const token = localStorage.getItem('token');
                    if (token) {
                      window.location.href = "/profile/edit";
                    } else {
                      window.location.href = "/login";
                    }
                  }}
                >
                  프로필 편집
                </a>
                <button className="p-2 text-gray-500">
                  <FaEllipsisH />
                </button>
              </div>
            </div>

            {/* 통계 (팔로워, 팔로잉 등) */}
            <div className="flex justify-center sm:justify-start space-x-6">
              <div className="text-center">
                <span className="block font-semibold">{profileData?.watchedMoviesCount || 0}</span>
                <span className="text-gray-500 text-sm">게시물</span>
              </div>
              <div className="text-center">
                <span className="block font-semibold">
                  <button
                    onClick={openFollowingModal}
                    className="font-semibold hover:underline focus:outline-none"
                  >
                    {profileData?.followingCount || 0}
                  </button>
                </span>
                <span className="text-gray-500 text-sm">팔로잉</span>
              </div>
              <div className="text-center">
                <span className="block font-semibold">
                  <button
                    onClick={openFollowersModal}
                    className="font-semibold hover:underline focus:outline-none"
                  >
                    {profileData?.followerCount || 0}
                  </button>
                </span>
                <span className="text-gray-500 text-sm">팔로워</span>
              </div>
            </div>

            {/* 프로필 소개 */}
            <div>
              <p className="text-sm">{user?.bio || "영화와 리뷰를 공유하는 공간"}</p>
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
      {activeTab === "posts" && renderTabContent()}

      {/* 리뷰 목록 */}
      {activeTab === "reviews" && renderTabContent()}

      {/* 좋아요 목록 */}
      {activeTab === "likes" && renderTabContent()}

      {/* 스크랩 목록 */}
      {activeTab === "scraps" && renderTabContent()}

      {/* 팔로잉 모달 */}
      {showFollowingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-96 max-h-96 overflow-hidden">
            <div className="border-b border-gray-200 p-4 text-center relative">
              <h3 className="font-semibold">팔로잉</h3>
              <button 
                className="absolute right-4 top-4 text-gray-400"
                onClick={closeFollowingModal}
              >
                <FaTimes />
              </button>
            </div>
            <div className="overflow-y-auto max-h-80">
              {followingList.length > 0 ? (
                followingList.map(user => {
                  // 맞팔 확인 (여기서는 팔로워 목록에 해당 유저 ID가 있는지 확인)
                  const isFollowingBack = followersList.some(follower => follower.id === user.id);
                  
                  return (
                    <div key={user.id} className="p-4 border-b border-gray-100 flex items-center">
                      <div 
                        className="w-12 h-12 rounded-full overflow-hidden mr-3 cursor-pointer"
                        onClick={() => navigateToUserProfile(user.id)}
                      >
                        <img 
                          src={user.profileImageUrl || "https://via.placeholder.com/40"} 
                          alt={user.username} 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 cursor-pointer" onClick={() => navigateToUserProfile(user.id)}>
                        <div className="flex items-center">
                          <span className="font-medium">
                            {user.username}
                          </span>
                          {isFollowingBack && (
                            <span className="ml-2 text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full">
                              맞팔로우
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                          {user.bio || "영화와 리뷰를 공유하는 공간"}
                        </p>
                      </div>
                      <FollowButton 
                        userId={user.id}
                        initialIsFollowing={true} // 팔로잉 목록이므로 항상 true로 시작
                        onToggleFollow={(userId, isFollowing) => {
                          if (!isFollowing) {
                            // 언팔로우한 경우
                            // 팔로잉 목록에서 제거
                            setFollowingList(followingList.filter(item => item.id !== userId));
                            // 팔로잉 수 감소
                            if (profileData) {
                              setProfileData({
                                ...profileData,
                                followingCount: Math.max(0, profileData.followingCount - 1)
                              });
                            }
                          }
                        }}
                      />
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-gray-500">
                  아직 팔로우한 사용자가 없습니다.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 팔로워 모달 */}
      {showFollowersModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-96 max-h-96 overflow-hidden">
            <div className="border-b border-gray-200 p-4 text-center relative">
              <h3 className="font-semibold">팔로워</h3>
              <button 
                className="absolute right-4 top-4 text-gray-400"
                onClick={closeFollowersModal}
              >
                <FaTimes />
              </button>
            </div>
            <div className="overflow-y-auto max-h-80">
              {followersList.length > 0 ? (
                followersList.map(user => {
                  // 이미 이 유저를 팔로우 하고 있는지 확인 (맞팔 여부)
                  const isFollowingUser = followingList.some(following => following.id === user.id);
                  
                  return (
                    <div key={user.id} className="p-4 border-b border-gray-100 flex items-center">
                      <div 
                        className="w-12 h-12 rounded-full overflow-hidden mr-3 cursor-pointer"
                        onClick={() => navigateToUserProfile(user.id)}
                      >
                        <img 
                          src={user.profileImageUrl || "https://via.placeholder.com/40"} 
                          alt={user.username} 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 cursor-pointer" onClick={() => navigateToUserProfile(user.id)}>
                        <div className="flex items-center">
                          <span className="font-medium">
                            {user.username}
                          </span>
                          {isFollowingUser && (
                            <span className="ml-2 text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full">
                              맞팔로우
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                          {user.bio || "영화와 리뷰를 공유하는 공간"}
                        </p>
                      </div>
                      <FollowButton 
                        userId={user.id}
                        initialIsFollowing={isFollowingUser}
                        onToggleFollow={(userId, isFollowing) => {
                          // 팔로잉 상태 변경 후 목록 상태 업데이트
                          if (isFollowing) {
                            // 팔로잉 목록에 추가
                            if (!followingList.some(item => item.id === userId)) {
                              // 팔로잉 모달에 즉시 표시할 수 있도록 완전한 사용자 객체를 포함
                              setFollowingList(prevList => [...prevList, user]);
                              fetchFollowingList(); // 팔로잉 목록 다시 불러오기
                            }
                            // 팔로잉 수 증가
                            if (profileData) {
                              setProfileData({
                                ...profileData,
                                followingCount: profileData.followingCount + 1
                              });
                            }
                          } else {
                            // 팔로잉 목록에서 제거
                            setFollowingList(prevList => prevList.filter(item => item.id !== userId));
                            // 팔로잉 수 감소
                            if (profileData) {
                              setProfileData({
                                ...profileData,
                                followingCount: Math.max(0, profileData.followingCount - 1)
                              });
                            }
                          }
                        }}
                      />
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-gray-500">
                  아직 팔로워가 없습니다.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// 새로운 사용자 호버 카드 컴포넌트
interface UserHoverCardProps {
  userId: number;
  username: string;
}

const UserHoverCard: React.FC<UserHoverCardProps> = ({ userId, username }) => {
  const [isHovering, setIsHovering] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowingBack, setIsFollowingBack] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const hoverTimeoutRef = useRef<TimeoutRef>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  
  // 호버 시작 시 타임아웃 설정 (바로 카드가 뜨지 않고 잠시 후에 표시)
  const handleMouseEnter = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovering(true);
      loadUserData();
    }, 500); // 0.5초 후 표시
  };
  
  // 호버 종료 시 카드 숨김
  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setIsHovering(false);
  };
  
  // 사용자 데이터 로드 (실제로는 API 호출이 필요하지만 여기서는 더미 데이터 사용)
  const loadUserData = () => {
    setLoading(true);
    
    // 팔로우 상태 확인
    const followStateKey = `follow_state_${userId}`;
    const currentState = localStorage.getItem(followStateKey);
    const isCurrentlyFollowing = currentState === 'true';
    setIsFollowing(isCurrentlyFollowing);
    
    // 맞팔로우 상태 확인
    // 로컬 스토리지에서 팔로잉 목록 가져오기
    const followingIdsKey = 'following_ids';
    const followingIdsStr = localStorage.getItem(followingIdsKey) || '[]';
    const followingIds = JSON.parse(followingIdsStr);
    
    // 이 사용자가 나를 팔로우하는지 (팔로워 목록) 확인
    // 현재는 더미 데이터로 확인
    const mockFollowers = [6, 7, 8, 9]; // 더미 팔로워 ID 목록
    
    // 맞팔로우 여부 설정 - 내가 사용자를 팔로우하고 있고, 사용자도 나를 팔로우하고 있다면 맞팔로우
    const userIdNum = parseInt(String(userId));
    setIsFollowingBack(isCurrentlyFollowing && mockFollowers.includes(userIdNum));
    
    // 실제 구현에서는 API 호출 (예: getUserById(userId))
    // 여기서는 더미 데이터로 대체
    setTimeout(() => {
      setUserData({
        id: userId,
        username: username,
        profileImageUrl: `https://via.placeholder.com/40?text=${username.charAt(0)}`,
        bio: "영화와 리뷰를 공유하는 열정적인 영화 팬입니다.",
        followerCount: Math.floor(Math.random() * 100),
        followingCount: Math.floor(Math.random() * 50)
      });
      setLoading(false);
    }, 300);
  };
  
  // 팔로우 버튼 클릭 핸들러
  const handleToggleFollow = async () => {
    if (followLoading) return;
    
    try {
      setFollowLoading(true);
      
      // 실제 API 호출 (현재는 모의 구현)
      const result = await toggleFollow(String(userId));
      
      // 팔로우 상태 업데이트
      setIsFollowing(result.isFollowing);
      
      // 로컬 스토리지에 팔로우 상태 저장
      const followStateKey = `follow_state_${userId}`;
      localStorage.setItem(followStateKey, String(result.isFollowing));
      
      // 팔로워/팔로잉 수 업데이트
      if (userData) {
        if (result.isFollowing) {
          setUserData({
            ...userData,
            followerCount: userData.followerCount + 1
          });
        } else {
          setUserData({
            ...userData,
            followerCount: Math.max(0, userData.followerCount - 1)
          });
        }
      }
    } catch (error) {
      console.error("팔로우 상태 변경 실패", error);
    } finally {
      setFollowLoading(false);
    }
  };
  
  return (
    <div className="relative inline-block" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <span className="font-medium mr-2 cursor-pointer text-blue-600 hover:underline">{username}</span>
      
      {isHovering && (
        <div 
          ref={cardRef}
          className="absolute left-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 w-64 z-50"
          style={{ marginTop: '10px' }}
        >
          <div className="absolute left-3 -top-2 w-4 h-4 bg-white transform rotate-45 border-t border-l border-gray-200"></div>
          
          {loading ? (
            <div className="p-4 text-center">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            </div>
          ) : userData ? (
            <div className="p-3">
              <div className="flex items-start justify-between">
                <div className="flex items-start">
                  <div className="w-12 h-12 rounded-full overflow-hidden mr-3">
                    <img 
                      src={userData.profileImageUrl} 
                      alt={userData.username} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <div className="flex items-center">
                      <div className="font-bold">{userData.username}</div>
                      {isFollowingBack && (
                        <span className="ml-2 text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full">
                          맞팔로우
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{userData.bio}</p>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between mt-3 text-xs text-gray-600 border-t border-gray-100 pt-2">
                <span>팔로워 {userData.followerCount}</span>
                <span>팔로잉 {userData.followingCount}</span>
              </div>
              
              <div className="mt-3 space-y-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleFollow();
                  }}
                  disabled={followLoading}
                  className={`w-full text-center text-sm py-1.5 rounded ${
                    isFollowing 
                      ? "bg-gray-100 text-gray-800 border border-gray-300 hover:bg-gray-200" 
                      : "bg-blue-500 text-white hover:bg-blue-600"
                  }`}
                >
                  {followLoading ? (
                    <span className="flex items-center justify-center">
                      <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin mr-1"></span>
                      처리 중...
                    </span>
                  ) : isFollowing ? "팔로잉" : "팔로우"}
                </button>
                
                <a 
                  href={`/user/${userData.id}`}
                  className="block text-center w-full text-xs bg-gray-100 text-gray-800 py-1.5 rounded hover:bg-gray-200"
                >
                  프로필 보기
                </a>
              </div>
            </div>
          ) : (
            <div className="p-4 text-center text-gray-500">정보를 불러올 수 없습니다.</div>
          )}
        </div>
      )}
    </div>
  );
};

// 팔로우 버튼 컴포넌트
interface FollowButtonProps {
  userId: number;
  initialIsFollowing: boolean;
  onToggleFollow: (userId: number, isFollowing: boolean) => void;
}

const FollowButton: React.FC<FollowButtonProps> = ({ userId, initialIsFollowing, onToggleFollow }) => {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  
  // 컴포넌트가 마운트될 때, 실제 로컬 스토리지 값으로 상태를 초기화
  useEffect(() => {
    const followStateKey = `follow_state_${userId}`;
    const currentState = localStorage.getItem(followStateKey);
    if (currentState !== null) {
      setIsFollowing(currentState === 'true');
    } else {
      setIsFollowing(initialIsFollowing);
    }
  }, [userId, initialIsFollowing]);
  
  const handleToggleFollow = async () => {
    try {
      const result = await toggleFollow(String(userId));
      setIsFollowing(result.isFollowing);
      onToggleFollow(userId, result.isFollowing);
    } catch (error) {
      console.error("팔로우 상태 변경 실패", error);
    }
  };
  
  if (isFollowing) {
    return (
      <button 
        className="text-sm bg-gray-50 px-3 py-1 rounded border border-gray-300 hover:bg-gray-100"
        onClick={(e) => {
          e.stopPropagation();
          handleToggleFollow();
        }}
        onMouseEnter={(e) => {
          e.currentTarget.textContent = "언팔로우";
          e.currentTarget.classList.add("text-red-500", "border-red-300", "hover:bg-red-50");
        }}
        onMouseLeave={(e) => {
          e.currentTarget.textContent = "팔로잉";
          e.currentTarget.classList.remove("text-red-500", "border-red-300", "hover:bg-red-50");
        }}
      >
        팔로잉
      </button>
    );
  }
  
  return (
    <button 
      className="text-sm bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
      onClick={(e) => {
        e.stopPropagation();
        handleToggleFollow();
      }}
    >
      팔로우
    </button>
  );
};

export default ProfilePage;
