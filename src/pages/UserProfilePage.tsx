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
  const [followActionInProgress, setFollowActionInProgress] = useState<boolean>(false);

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

      // 현재 로그인한 사용자가 자신의 프로필을 보는 경우는 팔로우 관련 처리 생략
      if (user?.id === parseInt(userId)) {
        console.log('[디버그] 자신의 프로필을 보는 중이므로 팔로우 상태 처리 생략');
        const profile = await getOtherUserProfile(userId);
        const activity = await getOtherUserActivity(userId);
        
        // 로컬 스토리지에서 내 프로필 캐시 확인 (최신 팔로잉 카운트 적용)
        try {
          const myProfileCacheKey = `my_profile_${userId}`;
          const cachedProfileData = localStorage.getItem(myProfileCacheKey);
          
          if (cachedProfileData) {
            const parsed = JSON.parse(cachedProfileData);
            // 24시간 이내의 캐시만 유효하게 처리
            const isRecent = (new Date().getTime() - parsed.timestamp) < 24 * 60 * 60 * 1000;
            
            if (isRecent && parsed.followingCount !== undefined && profile.followingCount !== parsed.followingCount) {
              console.log(`[디버그] 내 프로필 캐시에서 팔로잉 카운트 업데이트: ${profile.followingCount} → ${parsed.followingCount}`);
              profile.followingCount = parsed.followingCount;
            }
          }
        } catch (cacheError) {
          console.error('[디버그] 내 프로필 캐시 읽기 실패:', cacheError);
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
          const isRecent = (new Date().getTime() - parsed.timestamp) < 24 * 60 * 60 * 1000;
          if (isRecent) {
            cachedFollowState = parsed.isFollowing === true;
            console.log(`[디버그] 로컬 스토리지에서 팔로우 상태 로드: ${cachedFollowState}`);
          } else {
            console.log('[디버그] 로컬 스토리지 캐시가 오래되어 무시됨');
            // 오래된 캐시 삭제
            const followStateKey = `follow_state_${userId}`;
            localStorage.removeItem(followStateKey);
          }
        }
      } catch (cacheError) {
        console.error('[디버그] 로컬 스토리지 캐시 읽기 실패:', cacheError);
      }

      try {
        // 백엔드에서 사용자 프로필 정보를 가져옴 (팔로우 상태 포함)
        const directResponse = await apiClient.get(`/api/profile/id/${userId}`);
        console.log(`[디버그] /api/profile/id/${userId} 직접 호출 응답:`, directResponse.data);
        
        if (directResponse.data && directResponse.data.username) {
          // API 응답에서 팔로우 상태 확인 (명시적으로 boolean 타입으로 변환)
          let isFollowingStatus = directResponse.data.isFollowing === true;
          const followsMeStatus = directResponse.data.followsMe === true;
          
          // API 응답이 false지만 로컬 캐시가 true인 경우, 일단 로컬 캐시 값을 우선 사용
          // (API가 부족한 경우의 임시 방어 로직)
          if (!isFollowingStatus && cachedFollowState) {
            console.log('[디버그] API 응답과 로컬 캐시 불일치. 로컬 캐시 값을 사용합니다.');
            isFollowingStatus = cachedFollowState;
          }
          
          const mutualFollowStatus = isFollowingStatus && followsMeStatus;
          
          console.log(`[디버그] 최종 팔로우 상태: isFollowing=${isFollowingStatus}, followsMe=${followsMeStatus}, mutualFollow=${mutualFollowStatus}`);
          console.log(`[디버그] 직접 API 호출로 유저명 확인: ${directResponse.data.username}`);
          console.log(`[디버그] 팔로우 상태 설정: ${isFollowingStatus}`);
          console.log(`[디버그] 팔로워 카운트: ${directResponse.data.followerCount || 0}`);
          console.log(`[디버그] 팔로잉 카운트: ${directResponse.data.followingCount || 0}`);

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
            isFollowing: isFollowingStatus,
            mutualFollow: mutualFollowStatus,
            followsMe: followsMeStatus,
          };
          
          // 로컬 스토리지에 팔로우 상태 저장 (API 응답 기준)
          try {
            const followStateKey = `follow_state_${userId}`;
            localStorage.setItem(followStateKey, JSON.stringify({ 
              isFollowing: isFollowingStatus,
              timestamp: new Date().getTime()
            }));
          } catch (storageError) {
            console.error("로컬 스토리지 저장 실패:", storageError);
          }
          
          setProfileData(profileData);
          // isFollowing 상태를 API 응답값으로 설정
          setIsFollowing(isFollowingStatus);
          
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
      console.log(`[디버그] 기존 방식으로 프로필 정보 로드 시도`);
      
      // 병렬로 여러 API 요청 처리
      const [profile, activity] = await Promise.all([
        getOtherUserProfile(userId),
        getOtherUserActivity(userId),
      ]);

      console.log("[디버그] getOtherUserProfile 사용자 프로필 데이터:", profile);
      console.log("[디버그] 사용자 username:", profile.user?.username);
      console.log("[디버그] 팔로우 상태:", profile.isFollowing);

      // API에서 팔로우 상태 확인 (명시적 비교로 boolean 값 확인)
      let isFollowingStatus = profile.isFollowing === true;
      const followsMeStatus = profile.followsMe === true;
      
      // API 응답이 false지만 로컬 캐시가 true인 경우, 로컬 캐시 값을 우선 사용
      if (!isFollowingStatus && cachedFollowState) {
        console.log('[디버그] 기존 방식: API 응답과 로컬 캐시 불일치. 로컬 캐시 값 우선 사용');
        isFollowingStatus = true;
      }
      
      // mutualFollow 속성 설정
      profile.mutualFollow = isFollowingStatus && followsMeStatus;
      profile.isFollowing = isFollowingStatus;
      profile.followsMe = followsMeStatus;

      console.log(`[디버그] 기존 방식으로 설정한 팔로우 상태: isFollowing=${isFollowingStatus}, followsMe=${followsMeStatus}, mutualFollow=${profile.mutualFollow}`);

      // 로컬 스토리지에 팔로우 상태 저장 (최종 설정 값 기준)
      try {
        const followStateKey = `follow_state_${userId}`;
        localStorage.setItem(followStateKey, JSON.stringify({ 
          isFollowing: isFollowingStatus,
          timestamp: new Date().getTime()
        }));
      } catch (storageError) {
        console.error("로컬 스토리지 저장 실패:", storageError);
      }
      
      setProfileData(profile);
      setIsFollowing(isFollowingStatus);
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

  useEffect(() => {
    if (userId) {
      fetchUserData();
    }
  }, [userId]); // activeTab 제거 - 탭 변경시 팔로우 상태가 초기화 되는 것 방지

  // 탭 변경 시 해당 데이터만 로드
  useEffect(() => {
    if (!userId || loading) return;
    
    if (activeTab === "posts") {
      fetchUserPosts();
    } else if (activeTab === "reviews") {
      fetchUserReviews();
    } else if (activeTab === "scraps") {
      fetchUserScraps();
    }
  }, [activeTab]);

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
      console.error("사용자 게시물 로드 실패", error);
    } finally {
      setPostsLoading(false);
    }
  };

  // 사용자의 리뷰 가져오기
  const fetchUserReviews = async () => {
    if (!userId) return;

    try {
      setReviewsLoading(true);
      console.log(`사용자 ${userId}의 리뷰 로드 시작`);

      // 영화 리뷰와 TV 쇼 리뷰를 모두 가져옴
      const [movieReviews, tvShowReviews] = await Promise.all([
        backendApi.getUserReviewsById(parseInt(userId), page),
        backendApi.getUserTvReviewsById(parseInt(userId), page),
      ]);

      // 영화 리뷰에 콘텐츠 타입 추가
      const moviesWithType = movieReviews.content.map((review: MovieReview) => ({
        ...review,
        contentType: "movie",
      }));

      // TV 쇼 리뷰에 콘텐츠 타입 추가
      const tvShowsWithType = tvShowReviews.content.map((review: TvShowReview) => ({
        ...review,
        contentType: "tv",
      }));

      // 두 배열 합치기
      const allReviews = [...moviesWithType, ...tvShowsWithType];

      // 날짜 기준으로 정렬 (최신순)
      allReviews.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      console.log(`사용자 리뷰 ${allReviews.length}개 로드 완료`);
      setReviews(allReviews);
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
      console.log(`[디버그] 팔로우 상태 토글: ${isFollowing} -> ${newFollowState}`);

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
        localStorage.setItem(followStateKey, JSON.stringify({ 
          isFollowing: newFollowState,
          timestamp: new Date().getTime()
        }));
        console.log(`[디버그] 로컬 스토리지에 팔로우 상태 저장: ${newFollowState}`);
      } catch (storageError) {
        console.error("로컬 스토리지 저장 실패:", storageError);
      }

      // API 호출 (팔로우/언팔로우 토글)
      try {
        // 백엔드는 하나의 토글 엔드포인트를 제공
        console.log(`[디버그] 유저 ID ${userId} 팔로우 상태 토글 요청 전송`);
        const response = await apiClient.post(`/api/users/follow/${userId}`);
        console.log(`[디버그] 유저 ID ${userId} 팔로우 상태 토글 성공:`, response.data);
        console.log(`[디버그] API 응답 데이터 구조:`, JSON.stringify(response.data));
        
        // 백엔드 응답에서 새로운 팔로우 상태 확인 (일관성 확인)
        if (response.data && response.data.isFollowing !== undefined) {
          const apiFollowStatus = response.data.isFollowing === true;
          
          // API 응답 상태와 현재 UI 상태가 다른 경우 (드문 경우)
          if (apiFollowStatus !== newFollowState) {
            console.log(`[디버그] 경고: API 응답 상태(${apiFollowStatus})와 예상 상태(${newFollowState})가 다릅니다. API 응답을 우선합니다.`);
            
            // API 응답 상태로 UI 업데이트
            setIsFollowing(apiFollowStatus);
            
            if (profileData) {
              const correctedProfileData = {
                ...profileData,
                followerCount: apiFollowStatus
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
              localStorage.setItem(followStateKey, JSON.stringify({ 
                isFollowing: apiFollowStatus,
                timestamp: new Date().getTime()
              }));
            } catch (storageError) {
              console.error("로컬 스토리지 수정 실패:", storageError);
            }
          }
          
          // API 응답에 followingCount가 있으면 업데이트 
          if (profileData && response.data.followingCount !== undefined) {
            const updatedProfileData = {
              ...profileData,
              followingCount: response.data.followingCount
            };
            setProfileData(updatedProfileData);
            console.log(`[디버그] 팔로잉 카운트 업데이트: ${response.data.followingCount}`);
          }
          
          // 로그인한 사용자의 내 프로필 팔로잉 카운트도 업데이트 (현재 사용자가 다른 사람 팔로우할 때)
          try {
            if (user && user.id !== parseInt(userId)) {
              console.log('[디버그] 내 프로필 팔로잉 카운트 업데이트 시도');
              
              // 내 프로필의 팔로잉 카운트 로컬 업데이트 (즉시 반영)
              const myProfileCacheKey = `my_profile_${user.id}`;
              let updatedFollowingCount = 0;
              
              // 기존에 캐시된 정보가 있으면 가져옴
              try {
                const existingCache = localStorage.getItem(myProfileCacheKey);
                if (existingCache) {
                  const parsed = JSON.parse(existingCache);
                  updatedFollowingCount = parsed.followingCount || 0;
                }
              } catch (cacheReadError) {
                console.error('[디버그] 캐시 읽기 실패:', cacheReadError);
              }
              
              // 새로운 팔로잉 상태에 따라 카운트 계산
              updatedFollowingCount = apiFollowStatus 
                ? updatedFollowingCount + 1 
                : Math.max(0, updatedFollowingCount - 1);
              
              console.log(`[디버그] 내 프로필 팔로잉 카운트 로컬 업데이트: ${updatedFollowingCount}`);
              
              // 새 값 캐싱
              localStorage.setItem(myProfileCacheKey, JSON.stringify({
                followingCount: updatedFollowingCount,
                timestamp: new Date().getTime()
              }));
              
              // 서버에서도 최신 정보 가져와서 정확한 값 확인
              const myProfileResponse = await apiClient.get(`/api/profile/id/${user.id}`);
              
              if (myProfileResponse.data && myProfileResponse.data.followingCount !== undefined) {
                console.log(`[디버그] 내 프로필 팔로잉 카운트 API 응답: ${myProfileResponse.data.followingCount}`);
                
                // 서버 값으로 캐시 업데이트
                localStorage.setItem(myProfileCacheKey, JSON.stringify({
                  followingCount: myProfileResponse.data.followingCount,
                  timestamp: new Date().getTime()
                }));
              }
            }
          } catch (profileError) {
            console.error('[디버그] 내 프로필 정보 업데이트 실패:', profileError);
          }
        }
      } catch (apiError: any) {
        // API 오류 처리
        console.error('[디버그] 팔로우 토글 API 호출 실패:', apiError);
        
        // 409 오류는 이미 적용된 상태 (이미 팔로우/언팔로우 상태)로 간주
        if (apiError.response?.status === 409) {
          console.log('[디버그] 이미 요청된 상태와 동일한 상태입니다 (상태 유지)');
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
        localStorage.setItem(followStateKey, JSON.stringify({ 
          isFollowing: isFollowing,
          timestamp: new Date().getTime()
        }));
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
                    disabled={followActionInProgress}
                    className={`text-sm px-4 py-1.5 rounded font-medium transition-colors relative ${
                      followActionInProgress ? "opacity-70 cursor-not-allowed" : ""
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
                        <span className="hidden group-hover:inline text-red-600">언팔로우</span>
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

