import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  FaUser,
  FaEllipsisH,
  FaBookmark,
  FaHeart,
  FaComment,
  FaTh,
  FaVideo,
  FaStar,
  FaPencilAlt,
  FaExchangeAlt
} from "react-icons/fa";
import {
  getOtherUserProfile,
  getOtherUserActivity,
  getOtherUserScraps,
  toggleFollow,
  getUserFollowers,
  getUserFollowing
} from "../api/userApi";
import { UserProfile, UserActivity } from "../types/user";
import ContentCard from "../components/ContentCard";
import FollowModal from "../components/FollowModal";

// 다른 사용자의 프로필 페이지 컴포넌트
const UserProfilePage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const { isLoggedIn, user } = useAuth();

  // 각 섹션 데이터 상태
  const [profileData, setProfileData] = useState<UserProfile | null>(null);
  const [activityData, setActivityData] = useState<UserActivity | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>("posts");
  const [scrappedMovies, setScrappedMovies] = useState<any[]>([]);
  const [isFollowing, setIsFollowing] = useState<boolean>(false);
  
  // 모달 상태
  const [showFollowersModal, setShowFollowersModal] = useState<boolean>(false);
  const [showFollowingModal, setShowFollowingModal] = useState<boolean>(false);
  const [followersData, setFollowersData] = useState<any[]>([]);
  const [followingData, setFollowingData] = useState<any[]>([]);

  useEffect(() => {
    // 사용자 데이터 로드
    const fetchUserData = async () => {
      if (!userId) return;
      
      try {
        setLoading(true);
        console.log(`사용자 ${userId} 프로필 데이터 로드 시작`);

        // 병렬로 여러 API 요청 처리
        const [profile, activity, scraps] = await Promise.all([
          getOtherUserProfile(userId),
          getOtherUserActivity(userId),
          getOtherUserScraps(userId),
        ]);

        console.log("사용자 프로필 데이터:", profile);
        
        // mutualFollow 속성이 API에서 제공되지 않는 경우 설정
        if (profile.mutualFollow === undefined && profile.isFollowing !== undefined) {
          // 백엔드에서 followsMe 속성을 제공하는 경우
          if (profile.followsMe !== undefined) {
            profile.mutualFollow = profile.isFollowing && profile.followsMe;
          } else {
            // 백엔드에서 followsMe 속성을 제공하지 않는 경우 기본값 false
            profile.mutualFollow = false;
          }
        }
        
        setProfileData(profile);
        setIsFollowing(profile.isFollowing || false);
        setActivityData(activity);
        setScrappedMovies(scraps);
      } catch (error) {
        console.error("Failed to fetch user data", error);
      } finally {
        setLoading(false);
      }
    };

    if (isLoggedIn && userId) {
      fetchUserData();
    }
  }, [isLoggedIn, userId]);

  // 팔로워 모달을 위한 데이터 로딩
  const loadFollowers = async () => {
    if (!userId) return;
    
    try {
      console.log(`사용자 ${userId}의 팔로워 목록 로드 시작`);
      const followers = await getUserFollowers(userId);
      setFollowersData(followers);
      setShowFollowersModal(true);
    } catch (error) {
      console.error("팔로워 데이터 로드 실패:", error);
    }
  };

  // 팔로잉 모달을 위한 데이터 로딩
  const loadFollowing = async () => {
    if (!userId) return;
    
    try {
      console.log(`사용자 ${userId}의 팔로잉 목록 로드 시작`);
      const following = await getUserFollowing(userId);
      setFollowingData(following);
      setShowFollowingModal(true);
    } catch (error) {
      console.error("팔로잉 데이터 로드 실패:", error);
    }
  };

  // 팔로우 상태 토글
  const handleToggleFollow = async () => {
    if (!userId) return;
    
    try {
      console.log(`사용자 ${userId} 팔로우 상태 토글 시작`);
      
      // 토글 전 상태 저장
      const prevIsFollowing = isFollowing;
      
      // 먼저 UI 상태 업데이트 (낙관적 업데이트)
      const newIsFollowing = !prevIsFollowing;
      setIsFollowing(newIsFollowing);
      
      // 프로필 데이터의 팔로워 수 업데이트 (UI 먼저 업데이트)
      if (profileData) {
        const newFollowerCount = newIsFollowing
          ? profileData.followerCount + 1
          : Math.max(0, profileData.followerCount - 1);
          
        // 맞팔로잉 상태도 업데이트
        const followsMe = profileData.followsMe || false;
        const isMutualFollow = newIsFollowing && followsMe;
        
        setProfileData({
          ...profileData,
          followerCount: newFollowerCount,
          isFollowing: newIsFollowing,
          mutualFollow: isMutualFollow
        });
      }
      
      // API 호출
      const result = await toggleFollow(userId);
      
      // API 결과로 상태 다시 설정 (실제 결과 반영)
      if (result) {
        setIsFollowing(result.isFollowing);
        
        if (profileData) {
          // followerCount와 followingCount 값 사용 (API에서 반환한 경우)
          const apiFollowerCount = result.followerCount !== undefined 
            ? result.followerCount 
            : newIsFollowing ? profileData.followerCount + 1 : Math.max(0, profileData.followerCount - 1);
          
          const apiFollowingCount = result.followingCount !== undefined
            ? result.followingCount
            : profileData.followingCount;
            
          // 맞팔로잉 상태 업데이트
          const followsMe = profileData.followsMe || false;
          const isMutualFollow = result.isFollowing && followsMe;
          
          setProfileData({
            ...profileData,
            followerCount: apiFollowerCount,
            followingCount: apiFollowingCount,
            isFollowing: result.isFollowing,
            mutualFollow: isMutualFollow
          });
        }
      }
    } catch (error) {
      // 에러 발생 시 원래 상태로 복원
      console.error("팔로우 상태 토글 실패:", error);
      setIsFollowing(isFollowing);
      if (profileData) {
        setProfileData({
          ...profileData,
          isFollowing: isFollowing,
          mutualFollow: isFollowing && (profileData.followsMe || false)
        });
      }
    }
  };

  // 모달 내에서 팔로우 상태 변경 시 처리
  const handleModalToggleFollow = (userId: number, newStatus: boolean) => {
    console.log(`모달 내 사용자 ${userId} 팔로우 상태 변경: ${newStatus}`);
    
    // 팔로워 목록 업데이트 - followsMe 속성도 업데이트
    setFollowersData(
      followersData.map((user) => {
        if (user.id === userId) {
          return { 
            ...user, 
            isFollowing: newStatus,
            // 맞팔로잉 상태 업데이트 (내가 팔로우하고 + 상대방도 나를 팔로우)
            mutualFollow: newStatus && user.followsMe === true
          };
        }
        return user;
      })
    );
    
    // 팔로잉 목록 업데이트
    setFollowingData(
      followingData.map((user) => {
        if (user.id === userId) {
          return { 
            ...user, 
            isFollowing: newStatus,
            // 팔로잉 목록에서는 내가 항상 팔로우하고 있으므로 상대방이 나를 팔로우하는지 확인
            mutualFollow: newStatus && user.followsMe === true
          };
        }
        return user;
      })
    );
    
    // 프로필 데이터 업데이트
    if (profileData) {
      // 팔로워 목록에서 팔로우/언팔로우 시 현재 사용자의 followingCount 변경
      if (showFollowersModal) {
        setProfileData({
          ...profileData,
          followingCount: newStatus 
            ? profileData.followingCount + 1 
            : Math.max(0, profileData.followingCount - 1)
        });
      }
      
      // 팔로잉 목록에서 언팔로우 시 현재 사용자의 followingCount 감소
      if (showFollowingModal && !newStatus) {
        setProfileData({
          ...profileData,
          followingCount: Math.max(0, profileData.followingCount - 1)
        });
      }
    }
  };

  // 팔로워/팔로우 숫자 업데이트를 위한 콜백
  const updateFollowCounts = (isFollowing: boolean, targetUserId: number) => {
    console.log(`팔로우 카운트 업데이트: ${isFollowing ? '팔로우' : '언팔로우'} 사용자 ID: ${targetUserId}`);
    
    if (profileData && userId) {
      const currentProfileUserId = parseInt(userId);
      // 현재 보고 있는 프로필이 대상 사용자인 경우
      if (currentProfileUserId === targetUserId) {
        // 나의 팔로잉/팔로워 상태에 따라 사용자의 팔로워 수 업데이트
        setProfileData({
          ...profileData,
          followerCount: isFollowing
            ? profileData.followerCount + 1
            : Math.max(0, profileData.followerCount - 1)
        });
      } 
      // 내가 팔로워 목록에서 다른 사람을 팔로우/언팔로우하는 경우
      else if (showFollowersModal) {
        setProfileData({
          ...profileData,
          // 내 팔로잉 상태는 변경되었지만 현재 프로필의 팔로워/팔로잉 수는 영향 없음
          // 필요시 팔로워/팔로잉 관계 업데이트
        });
      }
      // 내가 팔로잉 목록에서 다른 사람을 언팔로우하는 경우
      else if (showFollowingModal && !isFollowing) {
        setProfileData({
          ...profileData,
          // 팔로잉 수 업데이트 (선택 사항)
        });
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

  // 리뷰 탭 렌더링
  const renderReviewsTab = () => {
    if (loading) {
      return <div className="text-center py-8">로딩 중...</div>;
    }

    if (!dummyReviews || dummyReviews.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          작성한 리뷰가 없습니다.
        </div>
      );
    }

    return (
      <div className="mt-4">
        <div className="space-y-4">
          {dummyReviews.map((review) => (
            <div
              key={review.id}
              className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-lg">{review.movieTitle}</h3>
                <div className="flex items-center">
                  <span className="text-yellow-400 mr-1">★</span>
                  <span className="font-medium">{review.rating}</span>
                </div>
              </div>
              <p className="text-gray-700 mb-3">{review.content}</p>
              <div className="text-sm text-gray-500">{review.date}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // 포스트 탭 렌더링
  const renderPostsTab = () => {
    if (loading) {
      return <div className="text-center py-8">로딩 중...</div>;
    }

    if (!dummyPosts || dummyPosts.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          게시물이 없습니다.
        </div>
      );
    }

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
  };

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

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-4">사용자를 찾을 수 없습니다</h1>
        <p>요청하신 프로필을 찾을 수 없습니다.</p>
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
              {profileData.user?.profileImageUrl ? (
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
              <div className="flex items-center">
                <h1 className="text-xl md:text-2xl font-medium">
                  {profileData.user?.username || "사용자"}
                </h1>
                {profileData.mutualFollow && (
                  <span className="ml-2 text-blue-500 flex items-center" title="맞팔로잉">
                    <FaExchangeAlt />
                  </span>
                )}
              </div>
              <div className="flex space-x-2">
                {/* 팔로우/언팔로우 버튼 */}
                {profileData.user?.id !== user?.id && (
                  <button
                    onClick={handleToggleFollow}
                    className={`text-sm px-4 py-1.5 rounded font-medium transition-colors ${
                      isFollowing
                        ? "border border-gray-300 hover:bg-red-50 hover:text-red-600 hover:border-red-200 group"
                        : "bg-blue-500 text-white hover:bg-blue-600"
                    }`}
                  >
                    {isFollowing ? (
                      <>
                        <span className="group-hover:hidden">팔로잉</span>
                        <span className="hidden group-hover:inline">언팔로우</span>
                      </>
                    ) : (
                      "팔로우"
                    )}
                  </button>
                )}
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
              <button 
                onClick={loadFollowers}
                className="text-center md:text-left hover:underline"
              >
                <span className="font-semibold">
                  {profileData?.followerCount || 0}
                </span>
                <span className="ml-1">팔로워</span>
              </button>
              <button 
                onClick={loadFollowing}
                className="text-center md:text-left hover:underline"
              >
                <span className="font-semibold">
                  {profileData?.followingCount || 0}
                </span>
                <span className="ml-1">팔로우</span>
              </button>
            </div>

            {/* 프로필 소개 */}
            <div>
              <p className="text-sm">{profileData.user?.bio || "영화와 리뷰를 공유하는 공간"}</p>
              <p className="text-sm text-gray-500 mt-1">{profileData.user?.email}</p>
            </div>
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
            className={`px-6 py-3 flex items-center ${activeTab === "scraps" ? "border-t border-black text-black" : "text-gray-500"}`}
            onClick={() => setActiveTab("scraps")}
          >
            <FaBookmark className="mr-1" /> 스크랩
          </button>
        </div>
      </div>

      {/* 탭 콘텐츠 */}
      {renderTabContent()}

      {/* 팔로워 모달 */}
      <FollowModal
        isOpen={showFollowersModal}
        onClose={() => setShowFollowersModal(false)}
        title="팔로워"
        users={followersData}
        onToggleFollow={handleModalToggleFollow}
        updateFollowCounts={updateFollowCounts}
      />

      {/* 팔로잉 모달 */}
      <FollowModal
        isOpen={showFollowingModal}
        onClose={() => setShowFollowingModal(false)}
        title="팔로잉"
        users={followingData}
        onToggleFollow={handleModalToggleFollow}
        updateFollowCounts={updateFollowCounts}
      />
    </div>
  );
};

export default UserProfilePage;
