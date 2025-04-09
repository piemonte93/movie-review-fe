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
  getUserPostCount,
} from "../api/userApi";
import { UserProfile, UserActivity } from "../types/user";
import ContentCard from "../components/ContentCard";
import FollowModal from "../components/FollowModal";
import {
  backendApi,
  Post,
  MovieReview,
  TvShowReview,
  apiClient,
  BASE_URL,
} from "../api/backendApi";
import { formatDate } from "../utils/dateUtils";
import ReviewCard from "../components/ReviewCard.tsx";
import PostCard from "../components/PostCard.tsx";
import InfiniteScroll from "react-infinite-scroll-component";
import defaultAvatar from "../assets/default-profile.png";

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
  const [followActionInProgress, setFollowActionInProgress] =
    useState<boolean>(false);

  // 사용자 콘텐츠 상태
  const [posts, setPosts] = useState<Post[]>([]);
  const [reviews, setReviews] = useState<ExtendedMovieReview[]>([]);
  const [postsLoading, setPostsLoading] = useState<boolean>(false);
  const [reviewsLoading, setReviewsLoading] = useState<boolean>(false);
  const [scrapsLoading, setScrapsLoading] = useState<boolean>(false);
  const [page, setPage] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(true);

  // 모달 상태
  const [showFollowersModal, setShowFollowersModal] = useState<boolean>(false);
  const [showFollowingModal, setShowFollowingModal] = useState<boolean>(false);
  const [followersData, setFollowersData] = useState<any[]>([]);
  const [followingData, setFollowingData] = useState<any[]>([]);

  // 모달 내 팔로우 토글 처리 함수
  const handleModalToggleFollow = (modalUserId: number, newStatus: boolean) => {
    console.log(
      `모달 내 팔로우 토글 함수 호출됨: userId=${modalUserId}, newStatus=${newStatus}`
    );

    // 모달 내에서도 프로필 페이지의 사용자를 팔로우하는 경우 메인 프로필 UI 업데이트
    if (profileData && modalUserId === profileData.user.id) {
      setIsFollowing(newStatus);

      // 프로필 데이터도 업데이트
      const newFollowerCount = newStatus
        ? profileData.followerCount + 1
        : Math.max(0, profileData.followerCount - 1);

      setProfileData({
        ...profileData,
        followerCount: newFollowerCount,
        isFollowing: newStatus,
      });
    }
  };

  // 팔로우 카운트 업데이트 함수
  const updateFollowCounts = (isFollowing: boolean, userId: number) => {
    console.log(
      `팔로우 카운트 업데이트 함수 호출됨: isFollowing=${isFollowing}, userId=${userId}`
    );
    // 프로필 데이터가 있는 경우만 업데이트
    if (profileData) {
      const newFollowerCount = isFollowing
        ? profileData.followerCount + 1
        : Math.max(0, profileData.followerCount - 1);

      setProfileData({
        ...profileData,
        followerCount: newFollowerCount,
      });
    }
  };

  // 사용자 데이터 로드 함수
  const fetchUserData = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      console.log(`[디버그] 사용자 ${userId} 프로필 데이터 로드 시작`);

      // 잘못된 사용자 매핑 데이터 정리
      try {
        const userMappingStr = localStorage.getItem("user_id_mapping");
        if (userMappingStr) {
          const userMapping = JSON.parse(userMappingStr);
          // 잘못된 매핑 제거
          if (userMapping[userId]) {
            console.log(
              `[디버그] 사용자 ID ${userId}의 잘못된 매핑 제거:`,
              userMapping[userId]
            );
            delete userMapping[userId];
            localStorage.setItem(
              "user_id_mapping",
              JSON.stringify(userMapping)
            );
          }
        }
      } catch (cacheError) {
        console.error("[디버그] 사용자 매핑 캐시 정리 실패:", cacheError);
      }

      // 현재 로그인한 사용자가 자신의 프로필을 보는 경우는 팔로우 관련 처리 생략
      if (user?.id === parseInt(userId)) {
        console.log(
          "[디버그] 자신의 프로필을 보는 중이므로 팔로우 상태 처리 생략"
        );
        const profile = await getOtherUserProfile(userId);
        const activity = await getOtherUserActivity(userId);

        // 로컬 스토리지에서 내 프로필 캐시 확인 (최신 팔로잉 카운트 적용)
        try {
          const myProfileCacheKey = `my_profile_${userId}`;
          const cachedProfileData = localStorage.getItem(myProfileCacheKey);

          if (cachedProfileData) {
            const parsed = JSON.parse(cachedProfileData);
            // 24시간 이내의 캐시만 유효하게 처리
            const isRecent =
              new Date().getTime() - parsed.timestamp < 24 * 60 * 60 * 1000;

            if (
              isRecent &&
              parsed.followingCount !== undefined &&
              profile.followingCount !== parsed.followingCount
            ) {
              console.log(
                `[디버그] 내 프로필 캐시에서 팔로잉 카운트 업데이트: ${profile.followingCount} → ${parsed.followingCount}`
              );
              profile.followingCount = parsed.followingCount;
            }
          }
        } catch (cacheError) {
          console.error("[디버그] 내 프로필 캐시 읽기 실패:", cacheError);
        }

        setProfileData(profile);
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
        return;
      }

      // 로컬 스토리지에서 팔로우 상태 확인 (백업으로 사용)
      let cachedFollowState = false;
      try {
        const followStateKey = `follow_state_${userId}`;
        const cachedData = localStorage.getItem(followStateKey);
        if (cachedData) {
          const parsed = JSON.parse(cachedData);
          // 24시간 이내의 캐시만 유효하게 처리
          const isRecent =
            new Date().getTime() - parsed.timestamp < 24 * 60 * 60 * 1000;
          if (isRecent) {
            cachedFollowState = parsed.isFollowing === true;
            console.log(
              `[디버그] 로컬 스토리지에서 팔로우 상태 로드: ${cachedFollowState}`
            );
          } else {
            console.log("[디버그] 로컬 스토리지 캐시가 오래되어 무시됨");
            // 오래된 캐시 삭제
            const followStateKey = `follow_state_${userId}`;
            localStorage.removeItem(followStateKey);
          }
        }
      } catch (cacheError) {
        console.error("[디버그] 로컬 스토리지 캐시 읽기 실패:", cacheError);
      }

      try {
        // 백엔드에서 사용자 프로필 정보를 가져옴 (팔로우 상태 포함)
        const directResponse = await apiClient.get(`/api/profile/id/${userId}`);
        console.log(
          `[디버그] /api/profile/id/${userId} 직접 호출 응답:`,
          directResponse.data
        );

        if (directResponse.data && directResponse.data.username) {
          // API 응답에서 팔로우 상태 확인 (명시적으로 boolean 타입으로 변환)
          let isFollowingStatus = directResponse.data.isFollowing === true;
          const followsMeStatus = directResponse.data.followsMe === true;

          // API 응답이 false지만 로컬 캐시가 true인 경우, 일단 로컬 캐시 값을 우선 사용
          // (API가 부족한 경우의 임시 방어 로직)
          if (!isFollowingStatus && cachedFollowState) {
            console.log(
              "[디버그] API 응답과 로컬 캐시 불일치. 로컬 캐시 값을 사용합니다."
            );
            isFollowingStatus = cachedFollowState;
          }

          const mutualFollowStatus = isFollowingStatus && followsMeStatus;

          console.log(
            `[디버그] 최종 팔로우 상태: isFollowing=${isFollowingStatus}, followsMe=${followsMeStatus}, mutualFollow=${mutualFollowStatus}`
          );
          console.log(
            `[디버그] 직접 API 호출로 유저명 확인: ${directResponse.data.username}`
          );
          console.log(`[디버그] 팔로우 상태 설정: ${isFollowingStatus}`);
          console.log(
            `[디버그] 팔로워 카운트: ${directResponse.data.followerCount || 0}`
          );
          console.log(
            `[디버그] 팔로잉 카운트: ${directResponse.data.followingCount || 0}`
          );

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
            // 명시적으로 숫자 변환
            reviewCount: Number(directResponse.data.reviewCount || 0),
            postCount: Number(directResponse.data.postCount || 0),
            isFollowing: isFollowingStatus,
            mutualFollow: mutualFollowStatus,
            followsMe: followsMeStatus,
          };

          console.log(`[디버그] 직접 API에서 생성된 profileData:`, {
            reviewCount: profileData.reviewCount,
            postCount: profileData.postCount,
            reviewCountType: typeof profileData.reviewCount,
            postCountType: typeof profileData.postCount,
          });

          // 로컬 스토리지에 팔로우 상태 저장 (API 응답 기준)
          try {
            const followStateKey = `follow_state_${userId}`;
            localStorage.setItem(
              followStateKey,
              JSON.stringify({
                isFollowing: isFollowingStatus,
                timestamp: new Date().getTime(),
              })
            );
          } catch (storageError) {
            console.error("로컬 스토리지 저장 실패:", storageError);
          }

          setProfileData(profileData);
          // isFollowing 상태를 API 응답값으로 설정
          setIsFollowing(isFollowingStatus);

          // API 활동 정보 가져오기
          const activity = await getOtherUserActivity(userId);
          setActivityData(activity);

          // 초기 데이터 로드 (모든 탭 데이터를 미리 로드하여 카운트 정확도 높임)
          try {
            console.log("[디버그] 모든 탭 데이터 사전 로드 시작");

            // 비동기 병렬 로드로 성능 최적화
            const loadAllTabsData = async () => {
              // 게시물 로드와 리뷰 로드를 동시에 실행
              const [postsResponse, [movieReviews, tvReviews]] =
                await Promise.all([
                  backendApi.getUserPosts(parseInt(userId), 0).catch((err) => {
                    console.error("[디버그] 사전 로드: 게시물 로드 실패", err);
                    return { totalElements: 0 }; // 실패 시 기본값
                  }),
                  Promise.all([
                    backendApi
                      .getUserReviewsById(parseInt(userId), 0)
                      .catch((err) => {
                        console.error(
                          "[디버그] 사전 로드: 영화 리뷰 로드 실패",
                          err
                        );
                        return { totalElements: 0 }; // 실패 시 기본값
                      }),
                    backendApi
                      .getUserTvReviewsById(parseInt(userId), 0)
                      .catch((err) => {
                        console.error(
                          "[디버그] 사전 로드: TV 리뷰 로드 실패",
                          err
                        );
                        return { totalElements: 0 }; // 실패 시 기본값
                      }),
                  ]),
                ]);

              const loadedPostCount = Number(postsResponse?.totalElements || 0);
              const loadedReviewCount =
                Number(movieReviews?.totalElements || 0) +
                Number(tvReviews?.totalElements || 0);

              console.log(
                `[디버그] 사전 로드 완료: 게시물 수 = ${loadedPostCount}, 총 리뷰 수 = ${loadedReviewCount}`
              );

              // 모든 카운트를 가져온 후 상태를 한 번에 업데이트
              setProfileData((prev) => {
                if (!prev) return null; // 이전 상태가 null이면 업데이트하지 않음

                // 이전 상태를 기반으로 새 상태 객체 생성
                const newState = {
                  ...prev,
                  postCount: loadedPostCount,
                  reviewCount: loadedReviewCount,
                };

                console.log("[디버그] 사전 로드 후 profileData 업데이트:", {
                  postCount: newState.postCount,
                  reviewCount: newState.reviewCount,
                });

                return newState;
              });
            };

            // 비동기로 실행하여 UI 차단 방지
            loadAllTabsData().catch((err) =>
              console.error("[디버그] 탭 데이터 사전 로드 실패:", err)
            );
          } catch (preloadError) {
            console.error("[디버그] 탭 데이터 사전 로드 오류:", preloadError);
          }

          // 사용자가 선택한 활성 탭의 데이터 로드
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
      console.log(`[디버그] 기존 방식으로 프로필 정보 로드 시도`);

      // 병렬로 여러 API 요청 처리
      const [profile, activity] = await Promise.all([
        getOtherUserProfile(userId),
        getOtherUserActivity(userId),
      ]);

      console.log(
        "[디버그] getOtherUserProfile 사용자 프로필 데이터:",
        profile
      );
      console.log("[디버그] 사용자 username:", profile.user?.username);
      console.log("[디버그] 팔로우 상태:", profile.isFollowing);

      // API에서 팔로우 상태 확인 (명시적 비교로 boolean 값 확인)
      let isFollowingStatus = profile.isFollowing === true;
      const followsMeStatus = profile.followsMe === true;

      // API 응답이 false지만 로컬 캐시가 true인 경우, 로컬 캐시 값을 우선 사용
      if (!isFollowingStatus && cachedFollowState) {
        console.log(
          "[디버그] 기존 방식: API 응답과 로컬 캐시 불일치. 로컬 캐시 값 우선 사용"
        );
        isFollowingStatus = true;
      }

      // mutualFollow 속성 설정
      profile.mutualFollow = isFollowingStatus && followsMeStatus;
      profile.isFollowing = isFollowingStatus;
      profile.followsMe = followsMeStatus;

      // reviewCount와 postCount가 없는 경우 설정
      if (profile.reviewCount === undefined) {
        profile.reviewCount =
          profile.watchedMoviesCount || profile.reviewedMoviesCount || 0;
        console.log(`[디버그] reviewCount 설정: ${profile.reviewCount}`);
      }

      if (
        profile.postCount === undefined &&
        typeof profile.postCount !== "number"
      ) {
        // postCount를 가져오기 위해 추가 API 호출을 시도할 수 있습니다
        try {
          console.log(`[디버그] 사용자 ${userId}의 게시글 수 조회 시작`);
          profile.postCount = await getUserPostCount(parseInt(userId));
          console.log(`[디버그] 게시글 수 설정: ${profile.postCount}`);
        } catch (postError) {
          console.error("[디버그] 게시글 수 가져오기 실패:", postError);
          profile.postCount = 0;
        }
      }

      // 최종 확인: reviewCount, postCount가 확실히 number 타입으로 설정되도록 함
      profile.reviewCount = profile.reviewCount || 0;
      profile.postCount = profile.postCount || 0;

      console.log(
        `[디버그] 최종 설정된 값 - reviewCount: ${profile.reviewCount}, postCount: ${profile.postCount}`
      );

      console.log(
        `[디버그] 기존 방식으로 설정한 팔로우 상태: isFollowing=${isFollowingStatus}, followsMe=${followsMeStatus}, mutualFollow=${profile.mutualFollow}`
      );

      // 로컬 스토리지에 팔로우 상태 저장 (최종 설정 값 기준)
      try {
        const followStateKey = `follow_state_${userId}`;
        localStorage.setItem(
          followStateKey,
          JSON.stringify({
            isFollowing: isFollowingStatus,
            timestamp: new Date().getTime(),
          })
        );
      } catch (storageError) {
        console.error("로컬 스토리지 저장 실패:", storageError);
      }

      setProfileData(profile);
      setIsFollowing(isFollowingStatus);
      setActivityData(activity);

      // 초기 데이터 로드 (모든 탭 데이터를 미리 로드하여 카운트 정확도 높임)
      try {
        console.log("[디버그] 모든 탭 데이터 사전 로드 시작");

        // 비동기 병렬 로드로 성능 최적화
        const loadAllTabsData = async () => {
          // 게시물 로드와 리뷰 로드를 동시에 실행
          const [postsResponse, [movieReviews, tvReviews]] = await Promise.all([
            backendApi.getUserPosts(parseInt(userId), 0).catch((err) => {
              console.error("[디버그] 사전 로드: 게시물 로드 실패", err);
              return { totalElements: 0 }; // 실패 시 기본값
            }),
            Promise.all([
              backendApi
                .getUserReviewsById(parseInt(userId), 0)
                .catch((err) => {
                  console.error("[디버그] 사전 로드: 영화 리뷰 로드 실패", err);
                  return { totalElements: 0 }; // 실패 시 기본값
                }),
              backendApi
                .getUserTvReviewsById(parseInt(userId), 0)
                .catch((err) => {
                  console.error("[디버그] 사전 로드: TV 리뷰 로드 실패", err);
                  return { totalElements: 0 }; // 실패 시 기본값
                }),
            ]),
          ]);

          const loadedPostCount = Number(postsResponse?.totalElements || 0);
          const loadedReviewCount =
            Number(movieReviews?.totalElements || 0) +
            Number(tvReviews?.totalElements || 0);

          console.log(
            `[디버그] 사전 로드 완료: 게시물 수 = ${loadedPostCount}, 총 리뷰 수 = ${loadedReviewCount}`
          );

          // 모든 카운트를 가져온 후 상태를 한 번에 업데이트
          setProfileData((prev) => {
            if (!prev) return null; // 이전 상태가 null이면 업데이트하지 않음

            // 이전 상태를 기반으로 새 상태 객체 생성
            const newState = {
              ...prev,
              postCount: loadedPostCount,
              reviewCount: loadedReviewCount,
            };

            console.log("[디버그] 사전 로드 후 profileData 업데이트:", {
              postCount: newState.postCount,
              reviewCount: newState.reviewCount,
            });

            return newState;
          });
        };

        // 비동기로 실행하여 UI 차단 방지
        loadAllTabsData().catch((err) =>
          console.error("[디버그] 탭 데이터 사전 로드 실패:", err)
        );
      } catch (preloadError) {
        console.error("[디버그] 탭 데이터 사전 로드 오류:", preloadError);
      }

      // 사용자가 선택한 활성 탭의 데이터 로드
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

  useEffect(() => {
    if (userId) {
      fetchUserData();
    }
  }, [userId]); // activeTab 제거 - 탭 변경시 팔로우 상태가 초기화 되는 것 방지

  // 탭 변경 시 해당 데이터만 로드
  useEffect(() => {
    if (!userId || loading) return;

    // 탭이 변경되면 페이지 정보 초기화
    setPage(0);
    setHasMore(true);

    if (activeTab === "posts") {
      fetchUserPosts(0);
    } else if (activeTab === "reviews") {
      fetchUserReviews(0);
    } else if (activeTab === "scraps") {
      fetchUserScraps();
    }
  }, [activeTab]);

  // 사용자의 게시물 가져오기
  const fetchUserPosts = async (nextPage = 0) => {
    if (!userId) return;

    try {
      setPostsLoading(true);
      console.log(`사용자 ${userId}의 게시물 로드 시작 (페이지: ${nextPage})`);

      const response = await backendApi.getUserPosts(
        parseInt(userId),
        nextPage
      );
      console.log(`사용자 게시물 ${response.content.length}개 로드 완료`);

      if (nextPage === 0) {
        setPosts(response.content);

        // postCount 업데이트 -> loadAllTabsData에서 처리하므로 제거
        // if (profileData && response.totalElements !== undefined) {
        //   console.log(`[디버그] 게시물 수 업데이트: ${response.totalElements}`);
        //   setProfileData({
        //     ...profileData,
        //     postCount: response.totalElements,
        //   });
        // }
      } else {
        setPosts((prevPosts) => [...prevPosts, ...response.content]);
      }

      setPage(nextPage);
      setTotalPages(response.totalPages);
      setHasMore(nextPage < response.totalPages - 1);
    } catch (error) {
      console.error("사용자 게시물 로드 실패", error);
    } finally {
      setPostsLoading(false);
    }
  };

  // 사용자의 리뷰 가져오기
  const fetchUserReviews = async (nextPage = 0) => {
    if (!userId) return;

    try {
      setReviewsLoading(true);
      console.log(`사용자 ${userId}의 리뷰 로드 시작 (페이지: ${nextPage})`);

      // 영화 리뷰와 TV 쇼 리뷰를 모두 가져옴
      const [movieReviews, tvShowReviews] = await Promise.all([
        backendApi.getUserReviewsById(parseInt(userId), nextPage),
        backendApi.getUserTvReviewsById(parseInt(userId), nextPage),
      ]);

      // 영화 리뷰에 콘텐츠 타입 추가
      const moviesWithType = movieReviews.content.map(
        (review: MovieReview) => ({
          ...review,
          contentType: "movie",
        })
      );

      // TV 쇼 리뷰에 콘텐츠 타입 추가
      const tvShowsWithType = tvShowReviews.content.map(
        (review: TvShowReview) => ({
          ...review,
          contentType: "tv",
        })
      );

      // 두 배열 합치기
      const allReviews = [...moviesWithType, ...tvShowsWithType];

      // 날짜 기준으로 정렬 (최신순)
      allReviews.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      console.log(`사용자 리뷰 ${allReviews.length}개 로드 완료`);

      if (nextPage === 0) {
        setReviews(allReviews);

        // reviewCount 업데이트 (영화 리뷰와 TV 쇼 리뷰의 총 개수) -> loadAllTabsData에서 처리하므로 제거
        // if (profileData) {
        //   const totalReviewCount =
        //     (movieReviews.totalElements || 0) +
        //     (tvShowReviews.totalElements || 0);
        //   console.log(
        //     `[디버그] 리뷰 수 업데이트: ${totalReviewCount} (영화: ${movieReviews.totalElements || 0}, TV: ${tvShowReviews.totalElements || 0})`
        //   );
        //   setProfileData({
        //     ...profileData,
        //     reviewCount: totalReviewCount,
        //   });
        // }
      } else {
        setReviews((prevReviews) => [...prevReviews, ...allReviews]);
      }

      setPage(nextPage);
      // 두 API 중 더 많은 페이지를 가진 것으로 설정
      const maxTotalPages = Math.max(
        movieReviews.totalPages,
        tvShowReviews.totalPages
      );
      setTotalPages(maxTotalPages);
      setHasMore(nextPage < maxTotalPages - 1);
    } catch (error) {
      console.error("사용자 리뷰 로드 실패", error);
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
      console.error("사용자 스크랩 로드 실패", error);
    } finally {
      setScrapsLoading(false);
    }
  };

  // 팔로워 모달 데이터 로드 및 열기
  const loadFollowers = async () => {
    if (!userId) return;

    try {
      console.log(`사용자 ${userId}의 팔로워 목록 로드 시작`);
      const followers = await getUserFollowers(userId);
      console.log(`사용자 팔로워 ${followers.length}개 로드 완료`);

      setFollowersData(followers);
      setShowFollowersModal(true);
    } catch (error) {
      console.error("팔로워 목록 로드 실패", error);
    }
  };

  // 팔로잉 모달 데이터 로드 및 열기
  const loadFollowing = async () => {
    if (!userId) return;

    try {
      console.log(`사용자 ${userId}의 팔로잉 목록 로드 시작`);
      const following = await getUserFollowing(userId);
      console.log(`사용자 팔로잉 ${following.length}개 로드 완료`);

      setFollowingData(following);
      setShowFollowingModal(true);
    } catch (error) {
      console.error("팔로잉 목록 로드 실패", error);
    }
  };

  // 팔로우/언팔로우 토글 처리 함수
  const handleToggleFollow = async () => {
    if (!userId || !isLoggedIn) return;

    // 처리 중 상태면 중복 클릭 방지
    if (followActionInProgress) return;

    try {
      setFollowActionInProgress(true);

      // 현재 팔로우 상태의 반대로 변경 예정
      const newFollowState = !isFollowing;
      console.log(
        `[디버그] 팔로우 상태 토글: ${isFollowing} -> ${newFollowState}`
      );

      // 즉시 UI 상태 업데이트 (낙관적 UI 업데이트)
      setIsFollowing(newFollowState);

      // 팔로우 카운트 업데이트
      if (profileData) {
        const updatedProfileData = {
          ...profileData,
          followerCount: newFollowState
            ? profileData.followerCount + 1
            : Math.max(0, profileData.followerCount - 1),
          isFollowing: newFollowState,
          mutualFollow: newFollowState && profileData.followsMe === true,
        };
        setProfileData(updatedProfileData);
      }

      try {
        // 로컬 스토리지에 팔로우 상태 즉시 저장 (낙관적 업데이트)
        const followStateKey = `follow_state_${userId}`;
        localStorage.setItem(
          followStateKey,
          JSON.stringify({
            isFollowing: newFollowState,
            timestamp: new Date().getTime(),
          })
        );
        console.log(
          `[디버그] 로컬 스토리지에 팔로우 상태 저장: ${newFollowState}`
        );
      } catch (storageError) {
        console.error("로컬 스토리지 저장 실패:", storageError);
      }

      // API 호출 (팔로우/언팔로우 토글)
      try {
        // 백엔드는 하나의 토글 엔드포인트를 제공
        console.log(`[디버그] 유저 ID ${userId} 팔로우 상태 토글 요청 전송`);

        // 팔로우 API 호출
        let response;
        try {
          response = await apiClient.post(`/api/users/follow/${userId}`);
          console.log(
            `[디버그] 유저 ID ${userId} 팔로우 상태 토글 성공:`,
            response.data
          );
          console.log(
            `[디버그] API 응답 데이터 구조:`,
            JSON.stringify(response.data)
          );
        } catch (apiError: any) {
          console.error("[디버그] 팔로우 API 호출 실패:", apiError);
          throw apiError;
        }

        // 백엔드 응답에서 새로운 팔로우 상태 확인 (일관성 확인)
        if (
          response &&
          response.data &&
          response.data.isFollowing !== undefined
        ) {
          const apiFollowStatus = response.data.isFollowing === true;

          // API 응답 상태를 UI에 정확히 반영
          setIsFollowing(apiFollowStatus);

          if (profileData) {
            const correctedProfileData = {
              ...profileData,
              followerCount:
                response.data.followerCount !== undefined
                  ? response.data.followerCount
                  : apiFollowStatus
                    ? profileData.followerCount + 1
                    : Math.max(0, profileData.followerCount - 1),
              isFollowing: apiFollowStatus,
              mutualFollow: apiFollowStatus && profileData.followsMe === true,
            };
            setProfileData(correctedProfileData);
          }

          // 로컬 스토리지도 API 응답으로 업데이트
          try {
            const followStateKey = `follow_state_${userId}`;
            localStorage.setItem(
              followStateKey,
              JSON.stringify({
                isFollowing: apiFollowStatus,
                timestamp: new Date().getTime(),
              })
            );
          } catch (storageError) {
            console.error("로컬 스토리지 수정 실패:", storageError);
          }

          // API 응답에 followingCount가 있으면 업데이트
          if (profileData && response.data.followingCount !== undefined) {
            const updatedProfileData = {
              ...profileData,
              followingCount: response.data.followingCount,
            };
            setProfileData(updatedProfileData);
            console.log(
              `[디버그] 팔로잉 카운트 업데이트: ${response.data.followingCount}`
            );
          }

          // 로그인한 사용자의 내 프로필 팔로잉 카운트도 업데이트 (현재 사용자가 다른 사람 팔로우할 때)
          try {
            if (user && user.id !== parseInt(userId)) {
              console.log("[디버그] 내 프로필 팔로잉 카운트 업데이트 시도");

              // 내 프로필의 팔로잉 카운트를 API에서 직접 가져와서 업데이트
              try {
                // 현재 사용자의 마이페이지 새로고침을 위한 API 호출
                const myProfileResponse = await apiClient.get(
                  `/api/profile/id/${user.id}`
                );

                if (
                  myProfileResponse.data &&
                  myProfileResponse.data.followingCount !== undefined
                ) {
                  console.log(
                    `[디버그] 내 프로필 팔로잉 카운트 API 응답: ${myProfileResponse.data.followingCount}`
                  );

                  // 내 프로필의 정확한 팔로잉 수를 로컬 스토리지에 캐싱
                  const myProfileCacheKey = `my_profile_${user.id}`;
                  localStorage.setItem(
                    myProfileCacheKey,
                    JSON.stringify({
                      followingCount: myProfileResponse.data.followingCount,
                      timestamp: new Date().getTime(),
                    })
                  );

                  // 백엔드와 실제 동기화되었는지 확인을 위해
                  // 내 사용자 ID를 팔로잉한 대상 사용자 ID와 함께 로컬 스토리지에 저장
                  // 이 정보는 디버깅 및 비교 목적으로 유지
                  try {
                    const followingHistoryKey = `following_history_${user.id}`;
                    let followingHistory = [];

                    const existingHistory =
                      localStorage.getItem(followingHistoryKey);
                    if (existingHistory) {
                      followingHistory = JSON.parse(existingHistory);
                    }

                    // 새 항목 추가 (팔로우/언팔로우 상태와 함께)
                    followingHistory.push({
                      targetUserId: parseInt(userId),
                      action: apiFollowStatus ? "follow" : "unfollow",
                      timestamp: new Date().getTime(),
                      followingCount: myProfileResponse.data.followingCount,
                    });

                    // 최근 20개 항목만 유지
                    if (followingHistory.length > 20) {
                      followingHistory = followingHistory.slice(
                        followingHistory.length - 20
                      );
                    }

                    localStorage.setItem(
                      followingHistoryKey,
                      JSON.stringify(followingHistory)
                    );
                  } catch (historyError) {
                    console.error(
                      "[디버그] 팔로잉 히스토리 저장 실패:",
                      historyError
                    );
                  }
                }
              } catch (profileError) {
                console.error(
                  "[디버그] 내 프로필 정보 가져오기 실패:",
                  profileError
                );
              }
            }
          } catch (profileUpdateError) {
            console.error(
              "[디버그] 내 프로필 정보 업데이트 중 오류:",
              profileUpdateError
            );
          }
        }
      } catch (apiError: any) {
        // API 오류 처리
        console.error("[디버그] 팔로우 토글 API 호출 실패:", apiError);

        // 409 오류는 이미 적용된 상태 (이미 팔로우/언팔로우 상태)로 간주
        if (apiError.response?.status === 409) {
          console.log(
            "[디버그] 이미 요청된 상태와 동일한 상태입니다 (상태 유지)"
          );
          // 이미 올바른 상태이므로 UI 상태 유지
        } else {
          // 그 외의 에러는 상태 롤백 (API 호출 실패)
          throw apiError;
        }
      }
    } catch (error: any) {
      console.error("[디버그] 팔로우/언팔로우 처리 중 오류 발생:", error);

      // 오류 발생 시 상태 원복 (이전 상태로 되돌림)
      setIsFollowing(!isFollowing);

      // 프로필 데이터도 원복
      if (profileData) {
        const restoredProfileData = {
          ...profileData,
          followerCount: isFollowing
            ? profileData.followerCount + 1
            : Math.max(0, profileData.followerCount - 1),
          isFollowing: isFollowing,
          mutualFollow: isFollowing && profileData.followsMe === true,
        };
        setProfileData(restoredProfileData);
      }

      // 로컬 스토리지 상태도 원복
      try {
        const followStateKey = `follow_state_${userId}`;
        localStorage.setItem(
          followStateKey,
          JSON.stringify({
            isFollowing: isFollowing,
            timestamp: new Date().getTime(),
          })
        );
      } catch (storageError) {
        console.error("로컬 스토리지 복구 실패:", storageError);
      }

      // 오류 메시지 표시 (409 제외)
      if (error.response?.status !== 409) {
        let errorMessage = "팔로우 처리 중 오류가 발생했습니다.";
        if (error.response?.status === 403) {
          errorMessage = "로그인이 필요한 기능입니다.";
        } else if (error.response?.status === 404) {
          errorMessage = "요청한 사용자를 찾을 수 없습니다.";
        }
        alert(errorMessage);
      }
    } finally {
      setFollowActionInProgress(false);
    }
  };

  // 다음 페이지 로드 함수
  const handleLoadMore = () => {
    if (postsLoading || reviewsLoading) return;

    const nextPage = page + 1;
    if (activeTab === "posts") {
      fetchUserPosts(nextPage);
    } else if (activeTab === "reviews") {
      fetchUserReviews(nextPage);
    }
  };

  // 리뷰 탭 렌더링
  const renderReviewsTab = () => {
    if (reviewsLoading && reviews.length === 0) {
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
      <InfiniteScroll
        dataLength={reviews.length}
        next={handleLoadMore}
        hasMore={hasMore}
        loader={
          <div className="flex justify-center py-4">
            <div className="animate-spin h-8 w-8 border-4 border-gray-900 border-t-transparent rounded-full"></div>
          </div>
        }
        endMessage={
          <p className="text-center text-gray-500 py-4">
            모든 리뷰를 불러왔습니다.
          </p>
        }
      >
        <div className="mt-4">
          <div className="space-y-4">
            {reviews.map((review) => (
              <ReviewCard key={`review-${review.id}`} review={review as any} />
            ))}
          </div>
        </div>
      </InfiniteScroll>
    );
  };

  // 포스트 탭 렌더링
  const renderPostsTab = () => {
    if (postsLoading && posts.length === 0) {
      return <div className="text-center py-8">로딩 중...</div>;
    }

    if (!posts || posts.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">게시물이 없습니다.</div>
      );
    }

    return (
      <InfiniteScroll
        dataLength={posts.length}
        next={handleLoadMore}
        hasMore={hasMore}
        loader={
          <div className="flex justify-center py-4">
            <div className="animate-spin h-8 w-8 border-4 border-gray-900 border-t-transparent rounded-full"></div>
          </div>
        }
        endMessage={
          <p className="text-center text-gray-500 py-4">
            모든 게시물을 불러왔습니다.
          </p>
        }
      >
        <div className="space-y-6 mt-4">
          {posts.map((post) => (
            <PostCard key={`post-${post.id}`} post={post} />
          ))}
        </div>
      </InfiniteScroll>
    );
  };

  // 스크랩 탭 렌더링
  const renderScrapsTab = () => {
    if (scrapsLoading && scrappedMovies.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-8">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600">스크랩 목록을 불러오는 중입니다...</p>
        </div>
      );
    }

    if (!scrappedMovies || scrappedMovies.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-8 text-gray-500">
          <p className="text-lg mb-2">스크랩한 영화가 없습니다.</p>
          <p className="text-sm">
            영화나 TV 프로그램을 스크랩하면 여기에 표시됩니다.
          </p>
        </div>
      );
    }

    return (
      <div className="py-4">
        <h3 className="text-lg font-medium mb-4">
          스크랩한 콘텐츠 ({scrappedMovies.length})
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {scrappedMovies.map((movie) => (
            <ContentCard
              key={`scrap-${movie.id}`}
              content={movie}
              type={movie.media_type || "movie"}
              className="w-full hover:shadow-md transition-shadow"
            />
          ))}
        </div>
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
                  src={`${BASE_URL}${profileData.user.profileImageUrl}`}
                  alt={`${profileData.user?.username}의 프로필 이미지`}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    if (e.currentTarget.src !== defaultAvatar) {
                      e.currentTarget.src = defaultAvatar;
                    }
                  }}
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
                    disabled={followActionInProgress}
                    className={`text-sm px-4 py-1.5 rounded font-medium transition-colors relative ${
                      followActionInProgress
                        ? "opacity-70 cursor-not-allowed"
                        : ""
                    } ${
                      isFollowing
                        ? "border border-gray-300 text-black hover:bg-red-50 hover:text-red-600 hover:border-red-200 group"
                        : "bg-blue-500 text-white hover:bg-blue-600"
                    }`}
                  >
                    {followActionInProgress ? (
                      <span className="inline-block w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin"></span>
                    ) : isFollowing ? (
                      <>
                        <span className="group-hover:hidden">팔로잉</span>
                        <span className="hidden group-hover:inline text-red-600">
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
            <div className="flex space-x-6 mt-2">
              <div className="text-center md:text-left">
                <span className="font-semibold">
                  {(() => {
                    // 디버깅을 위한 값 출력
                    console.log("[디버그] 게시물 수 계산 시작");
                    console.log(
                      `- profileData.reviewCount: ${profileData?.reviewCount}`
                    );
                    console.log(
                      `- profileData.postCount: ${profileData?.postCount}`
                    );
                    console.log(`- reviews.length: ${reviews.length}`);
                    console.log(`- posts.length: ${posts.length}`);

                    // 최대한 간단하게 계산
                    const reviewCount = Number(profileData?.reviewCount || 0);
                    const postCount = Number(profileData?.postCount || 0);
                    const totalCount = reviewCount + postCount;

                    console.log(`[디버그] 총 게시물 수: ${totalCount}`);

                    // UI에 표시할 값 결정
                    // 계산된 값이 0이면 현재 로드된 데이터 개수를 사용
                    return totalCount > 0
                      ? totalCount
                      : reviews.length + posts.length;
                  })()}
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
