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
  FaExchangeAlt,
} from "react-icons/fa";
import {
  getOtherUserProfile,
  getOtherUserActivity,
  getOtherUserScraps,
  toggleFollow,
  getUserFollowers,
  getUserFollowing,
} from "../api/userApi";
import { UserProfile, UserActivity } from "../types/user";
import ContentCard from "../components/ContentCard";
import FollowModal from "../components/FollowModal";
import { backendApi, Post, MovieReview, TvShowReview, apiClient } from "../api/backendApi";
import { formatDate } from "../utils/dateUtils";

// MovieReview 인터페이스를 확장하여 contentType 속성 추가
interface ExtendedMovieReview extends MovieReview {
  contentType?: string;
}

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

  // 사용자 콘텐츠 상태
  const [posts, setPosts] = useState<Post[]>([]);
  const [reviews, setReviews] = useState<ExtendedMovieReview[]>([]);
  const [postsLoading, setPostsLoading] = useState<boolean>(false);
  const [reviewsLoading, setReviewsLoading] = useState<boolean>(false);
  const [scrapsLoading, setScrapsLoading] = useState<boolean>(false);
  const [page, setPage] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(0);

  // 모달 상태
  const [showFollowersModal, setShowFollowersModal] = useState<boolean>(false);
  const [showFollowingModal, setShowFollowingModal] = useState<boolean>(false);
  const [followersData, setFollowersData] = useState<any[]>([]);
  const [followingData, setFollowingData] = useState<any[]>([]);

  // 모달 내 팔로우 토글 처리 함수
  const handleModalToggleFollow = (userId: number, newStatus: boolean) => {
    console.log(
      `모달 내 팔로우 토글 함수 호출됨: userId=${userId}, newStatus=${newStatus}`
    );
    // 실제 구현은 필요에 따라 추가 가능
  };

  // 팔로우 카운트 업데이트 함수
  const updateFollowCounts = (isFollowing: boolean, userId: number) => {
    console.log(
      `팔로우 카운트 업데이트 함수 호출됨: isFollowing=${isFollowing}, userId=${userId}`
    );
    // 실제 구현은 필요에 따라 추가 가능
  };

  useEffect(() => {
    // 사용자 데이터 로드
    const fetchUserData = async () => {
      if (!userId) return;

      try {
        setLoading(true);
        console.log(`[디버그] 사용자 ${userId} 프로필 데이터 로드 시작`);

        // 백엔드에서 사용자 정보 직접 가져오기 시도
        try {
          const directResponse = await apiClient.get(`/api/profile/id/${userId}`);
          console.log(`[디버그] /api/profile/id/${userId} 직접 호출 응답:`, directResponse.data);
          
          if (directResponse.data && directResponse.data.username) {
            // 직접 백엔드에서 가져온 프로필 정보로 상태 업데이트
            const profileData = {
              user: {
                id: parseInt(userId),
                username: directResponse.data.username,
                email: directResponse.data.email || "",
                bio: directResponse.data.bio || "",
                roles: directResponse.data.roles || ["USER"],
                profileImageUrl: directResponse.data.profileImageUrl,
                createdAt: "2023-01-01",
                updatedAt: "2023-01-01",
              },
              followingCount: directResponse.data.followingCount || 0,
              followerCount: directResponse.data.followerCount || 0,
              watchedMoviesCount: directResponse.data.reviewCount || 0,
              reviewedMoviesCount: directResponse.data.reviewCount || 0,
              isFollowing: directResponse.data.isFollowing || false,
              mutualFollow: directResponse.data.mutualFollow || false,
              followsMe: directResponse.data.followsMe || false,
            };
            
            console.log(`[디버그] 직접 API 호출로 유저명 확인: ${directResponse.data.username}`);
            setProfileData(profileData);
            setIsFollowing(profileData.isFollowing || false);
            
            // API 활동 정보 가져오기
            const activity = await getOtherUserActivity(userId);
            setActivityData(activity);
            
            // 초기 데이터 로드
            if (activeTab === "posts") {
              fetchUserPosts();
            } else if (activeTab === "reviews") {
              fetchUserReviews();
            } else if (activeTab === "scraps") {
              fetchUserScraps();
            }
            
            setLoading(false);
            return; // 성공적으로 처리했으므로 여기서 종료
          }
        } catch (directError) {
          console.error(`[디버그] 직접 API 호출 실패:`, directError);
        }

        // 직접 API 호출이 실패한 경우 기존 방식 시도
        // 병렬로 여러 API 요청 처리
        const [profile, activity] = await Promise.all([
          getOtherUserProfile(userId),
          getOtherUserActivity(userId),
        ]);

        console.log("[디버그] getOtherUserProfile 사용자 프로필 데이터:", profile);
        console.log("[디버그] 사용자 username:", profile.user?.username);

        // mutualFollow 속성이 API에서 제공되지 않는 경우 설정
        if (
          profile.mutualFollow === undefined &&
          profile.isFollowing !== undefined
        ) {
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

        // 초기 데이터 로드
        if (activeTab === "posts") {
          fetchUserPosts();
        } else if (activeTab === "reviews") {
          fetchUserReviews();
        } else if (activeTab === "scraps") {
          fetchUserScraps();
        }
      } catch (error) {
        console.error("[디버그] 사용자 데이터 로드 실패", error);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchUserData();
    }
  }, [userId, activeTab]);

  // 사용자의 게시물 가져오기
  const fetchUserPosts = async () => {
    if (!userId) return;

    try {
      setPostsLoading(true);
      console.log(`사용자 ${userId}의 게시물 로드 시작`);

      const response = await backendApi.getUserPosts(parseInt(userId), page);
      console.log(`사용자 게시물 ${response.content.length}개 로드 완료`);

      setPosts(response.content);
      setTotalPages(response.totalPages);
    } catch (error) {
      console.error("사용자 게시물 로드 실패:", error);
    } finally {
      setPostsLoading(false);
    }
  };

  // 사용자의 리뷰 가져오기
  const fetchUserReviews = async () => {
    if (!userId) return;

    try {
      setReviewsLoading(true);
      console.log(`사용자 ID ${userId}의 리뷰 로드 시작`);

      // 영화 리뷰와 TV 쇼 리뷰를 병렬로 가져옴 (사용자 ID 기반)
      const [movieReviewsResponse, tvReviewsResponse] = await Promise.all([
        backendApi.getUserReviewsById(parseInt(userId), page),
        backendApi.getUserTvReviewsById(parseInt(userId), page),
      ]);

      console.log(
        `영화 리뷰 ${movieReviewsResponse.content.length}개, TV 쇼 리뷰 ${tvReviewsResponse.content.length}개 로드 완료`
      );

      // 두 결과를 합침
      const allReviews = [
        ...movieReviewsResponse.content.map((review: MovieReview) => ({
          ...review,
          contentType: "movie",
        })),
        ...tvReviewsResponse.content.map((review: TvShowReview) => ({
          ...review,
          contentType: "tv",
        })),
      ];

      // 날짜 기준으로 정렬 (최신순)
      const sortedReviews = allReviews.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setReviews(sortedReviews);

      // 총 페이지 수는 두 API 중 더 큰 값을 사용
      const maxTotalPages = Math.max(
        movieReviewsResponse.totalPages || 0,
        tvReviewsResponse.totalPages || 0
      );
      setTotalPages(maxTotalPages);
    } catch (error) {
      console.error("사용자 리뷰 로드 실패:", error);
      setReviews([]);
    } finally {
      setReviewsLoading(false);
    }
  };

  // 사용자의 스크랩 가져오기
  const fetchUserScraps = async () => {
    if (!userId) return;

    try {
      setScrapsLoading(true);
      console.log(`사용자 ${userId}의 스크랩 로드 시작`);

      const scraps = await getOtherUserScraps(userId);
      console.log(`사용자 스크랩 ${scraps.length}개 로드 완료`);

      setScrappedMovies(scraps);
    } catch (error) {
      console.error("사용자 스크랩 로드 실패:", error);
    } finally {
      setScrapsLoading(false);
    }
  };

  // 탭 변경 처리
  useEffect(() => {
    if (!userId) return;

    if (activeTab === "posts") {
      fetchUserPosts();
    } else if (activeTab === "reviews") {
      fetchUserReviews();
    } else if (activeTab === "scraps") {
      fetchUserScraps();
    }
  }, [activeTab, userId, page]);

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
          mutualFollow: isMutualFollow,
        });
      }

      try {
        // API 호출
        const result = await toggleFollow(userId);
        
        // API 응답 확인
        console.log("팔로우 토글 API 응답:", result);

        // API 결과를 기반으로 상태 업데이트 (실제 상태 반영)
        if (result && result.isFollowing !== undefined) {
          setIsFollowing(result.isFollowing);

          if (profileData) {
            const followerCount =
              result.followerCount !== undefined
                ? result.followerCount
                : result.isFollowing
                  ? profileData.followerCount + 1
                  : Math.max(0, profileData.followerCount - 1);

            const followsMe = profileData.followsMe || false;
            const isMutualFollow = result.isFollowing && followsMe;

            setProfileData({
              ...profileData,
              followerCount: followerCount,
              isFollowing: result.isFollowing,
              mutualFollow: isMutualFollow,
            });
          }
        }
      } catch (apiError) {
        console.error("API 호출 중 오류 발생:", apiError);
        // API 오류 발생 시 낙관적 업데이트 유지 (UI 상태 변경 안 함)
        console.log("API 오류로 인해 클라이언트 상태 유지함");
      }
    } catch (error) {
      console.error("팔로우 상태 업데이트 실패:", error);

      // 에러 발생 시 UI 상태 원래대로 되돌리기
      setIsFollowing(isFollowing);
      if (profileData) {
        setProfileData({
          ...profileData,
          isFollowing: isFollowing,
        });
      }
    }
  };

  // 리뷰 탭 렌더링
  const renderReviewsTab = () => {
    if (reviewsLoading) {
      return <div className="text-center py-8">로딩 중...</div>;
    }

    if (!reviews || reviews.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          작성한 리뷰가 없습니다.
        </div>
      );
    }

    return (
      <div className="mt-4">
        <div className="space-y-4">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-lg">{review.movieTitle}</h3>
                    <span className="text-xs px-2 py-1 bg-gray-100 rounded-full text-gray-600">
                      {review.contentType === "tv" ? "TV" : "영화"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center">
                  <span className="text-yellow-400 mr-1">★</span>
                  <span className="font-medium">{review.rating}</span>
                </div>
              </div>
              <p className="text-gray-700 mb-3">{review.content}</p>
              <div className="text-sm text-gray-500">
                {formatDate(review.createdAt)}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // 포스트 탭 렌더링
  const renderPostsTab = () => {
    if (postsLoading) {
      return <div className="text-center py-8">로딩 중...</div>;
    }

    if (!posts || posts.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">게시물이 없습니다.</div>
      );
    }

    return (
      <div className="space-y-6 mt-4">
        {posts.map((post) => (
          <div
            key={post.id}
            className="border border-gray-200 rounded-lg bg-white p-4 shadow-sm"
          >
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-semibold">{post.title}</h3>
            </div>
            <p className="mt-2 text-gray-700">{post.content}</p>
            <div className="mt-3 flex justify-between items-center text-xs text-gray-500">
              <span>{formatDate(post.createdAt)}</span>
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-1">
                  <FaHeart
                    className={post.liked ? "text-blue-600" : "text-gray-400"}
                  />
                  <span>{post.likeCount}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <FaComment className="text-gray-400" />
                  <span>{post.commentCount}</span>
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
    if (scrapsLoading) {
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
                  <span
                    className="ml-2 text-blue-500 flex items-center"
                    title="맞팔로잉"
                  >
                    <FaExchangeAlt />
                  </span>
                )}
              </div>
              <div className="flex space-x-2">
                {/* 블라인드 표시 */}
                <div className="text-sm px-4 py-1.5 rounded font-medium transition-colors bg-red-500 text-white flex items-center justify-center">
                  블라인드
                </div>
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
                        <span className="hidden group-hover:inline">
                          언팔로우
                        </span>
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
                  {posts.length || 0}
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
              <p className="text-sm">
                {profileData.user?.bio || "영화와 리뷰를 공유하는 공간"}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {profileData.user?.email}
              </p>
            </div>
          </div>
        </div>
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

      {/* 게시물 그리드 */}
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
