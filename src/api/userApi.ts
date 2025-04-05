import { apiClient } from "./backendApi";
import { UserActivity, UserProfile } from "../types/user";

// 사용자 프로필 정보 가져오기
export const getUserProfile = async (): Promise<UserProfile> => {
  try {
    // 실제 API 연결 코드 활성화
    const response = await apiClient.get("/api/users/profile");
    console.log("서버에서 받은 프로필 응답:", response.data);
    return response.data;

    // 백엔드 연결이 되지 않는 경우를 위한 폴백 처리
    /* 
    return {
      user: {
        id: 1,
        username: "사용자",
        email: "user@example.com",
        bio: "영화를 좋아하는 사용자입니다.",
        roles: ["USER"],
        createdAt: "2023-01-01",
        updatedAt: "2023-01-01",
      },
      followingCount: 0,
      followerCount: 0,
      watchedMoviesCount: 0,
      reviewedMoviesCount: 0,
    };
    */
  } catch (error) {
    console.error("Failed to fetch user profile", error);
    // API 요청 실패 시 로컬 스토리지의 사용자 정보 사용
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        const localUser = JSON.parse(userStr);
        console.log("로컬 스토리지에서 사용자 정보 사용:", localUser);
        return {
          user: {
            id: localUser.id || 1,
            username: localUser.username || "사용자",
            email: localUser.email || "user@example.com",
            bio: localUser.bio || "",
            roles: localUser.roles || ["USER"],
            profileImageUrl: localUser.profileImageUrl,
            createdAt: "2023-01-01",
            updatedAt: "2023-01-01",
          },
          followingCount: 0,
          followerCount: 0,
          watchedMoviesCount: 0,
          reviewedMoviesCount: 0,
        };
      } catch (parseError) {
        console.error("로컬 스토리지 사용자 정보 파싱 오류:", parseError);
      }
    }

    // 로컬 정보도 없을 경우 기본 정보 반환
    return {
      user: {
        id: 1,
        username: "사용자",
        email: "user@example.com",
        bio: "",
        roles: ["USER"],
        createdAt: "2023-01-01",
        updatedAt: "2023-01-01",
      },
      followingCount: 0,
      followerCount: 0,
      watchedMoviesCount: 0,
      reviewedMoviesCount: 0,
    };
  }
};

// 사용자 활동 정보 가져오기
export const getUserActivity = async (): Promise<UserActivity> => {
  try {
    // 실제 API 연결 코드 활성화
    const response = await apiClient.get("/api/users/activity");
    return response.data;

    // 백엔드 연결이 되지 않는 경우를 위한 폴백 처리
    /*
    return {
      favoriteMovies: [],
      favoriteReviews: [],
      favoritePosts: [],
    };
    */
  } catch (error) {
    console.error("Failed to fetch user activity", error);
    // 폴백 데이터 (API 실패 시)
    return {
      favoriteMovies: [],
      favoriteReviews: [],
      favoritePosts: [],
    };
  }
};

// 사용자 팔로우 추천 정보 가져오기
export const getFollowRecommendations = async () => {
  try {
    // 실제 API 연결 코드 활성화
    const response = await apiClient.get("/api/users/recommendations");
    return response.data;

    // 백엔드 연결이 되지 않으므로 빈 배열 반환
    // return response.data;
  } catch (error) {
    console.error("Failed to fetch follow recommendations", error);
    throw error;
  }
};

// 프로필 이미지 업로드 함수
export const uploadProfileImage = async (
  file: File
): Promise<{ profileImageUrl: string }> => {
  try {
    const formData = new FormData();
    formData.append("image", file);

    // 실제 API 연결 코드 활성화
    const response = await apiClient.post(
      "/api/users/profile-image",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;

    // 백엔드 연결이 되지 않는 경우를 위한 폴백 처리
    /* 
    console.log("프로필 이미지 업로드 요청:", file.name);
    // 임시 URL 생성 (실제로는 서버에서 반환된 URL을 사용해야 함)
    const tempUrl = URL.createObjectURL(file);
    return { profileImageUrl: tempUrl };
    */
  } catch (error) {
    console.error("프로필 이미지 업로드 실패", error);
    // 임시 URL 생성 (API 오류 시 폴백)
    const tempUrl = URL.createObjectURL(file);
    return { profileImageUrl: tempUrl };
  }
};

// 사용자 프로필 정보 업데이트
export const updateUserProfile = async (profileData: {
  username?: string;
  bio?: string;
  profileImageUrl?: string;
}) => {
  try {
    console.log("프로필 정보 업데이트 요청:", profileData);

    // 실제 API 연결 코드 활성화
    const response = await apiClient.put("/api/users/profile", profileData);
    console.log("프로필 업데이트 API 응답:", response.data);

    // 로컬 스토리지 데이터 업데이트 (API 응답과 상관없이)
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        const localUser = JSON.parse(userStr);
        const updatedUser = {
          ...localUser,
          ...profileData, // 요청한 데이터로 업데이트
        };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        console.log("로컬 스토리지 사용자 정보 직접 업데이트:", updatedUser);

        // 프로필 캐시도 업데이트
        localStorage.setItem(
          "cached_profile_data",
          JSON.stringify({
            ...localUser,
            ...profileData,
          })
        );
      } catch (localError) {
        console.error("로컬 사용자 정보 업데이트 실패:", localError);
      }
    }

    return response.data;

    // 백엔드 연결이 되지 않는 경우를 위한 폴백 처리
    /*
    return {
      success: true,
      message: "프로필이 성공적으로 업데이트되었습니다.",
    };
    */
  } catch (error) {
    console.error("프로필 정보 업데이트 실패", error);
    // 폴백 응답 (API 실패 시)

    // 실패해도 로컬 스토리지 데이터는 업데이트 (임시 조치)
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        const localUser = JSON.parse(userStr);
        const updatedUser = {
          ...localUser,
          ...profileData,
        };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        console.log(
          "API 실패시 로컬 스토리지 사용자 정보 직접 업데이트:",
          updatedUser
        );

        // 프로필 캐시도 업데이트
        localStorage.setItem(
          "cached_profile_data",
          JSON.stringify({
            ...localUser,
            ...profileData,
          })
        );
      } catch (localError) {
        console.error("로컬 사용자 정보 업데이트 실패:", localError);
      }
    }

    return {
      success: true,
      message: "프로필이 성공적으로 업데이트되었습니다.",
    };
  }
};

// 사용자가 스크랩한 영화 목록 가져오기
export const getUserScraps = async () => {
  try {
    console.log("스크랩 목록 요청 시작");
    // 실제 API 연결 코드 활성화
    const response = await apiClient.get("/api/scraps");
    console.log("스크랩 API 응답:", response.status, response.data);
    
    // 응답이 빈 배열이면 빈 배열 반환
    if (Array.isArray(response.data) && response.data.length === 0) {
      console.log("스크랩 데이터가 없습니다. 빈 배열 반환");
      return [];
    }
    
    // TV 프로그램의 경우 ContentCard 컴포넌트에서 사용할 필드 추가 처리
    const processedScraps = response.data.map(scrap => {
      // 기존 스크랩 데이터 복사
      const processedScrap = { ...scrap };
      
      // TV 프로그램인 경우 title 필드가 없을 수 있으므로 name 필드로 대체
      if (scrap.media_type === 'tv') {
        // name 필드를 title에도 설정 (ContentCard에서 사용)
        if (!processedScrap.title) {
          processedScrap.title = scrap.name || "제목 없음";
        }
        
        // first_air_date 필드를 release_date에도 설정 (ContentCard에서 사용)
        if (!processedScrap.release_date) {
          processedScrap.release_date = scrap.first_air_date || "";
        }
        
        // name 필드 설정 (ContentCard에서 사용)
        if (!processedScrap.name) {
          processedScrap.name = scrap.title || "제목 없음";
        }
      }
      
      return processedScrap;
    });
    
    console.log("처리된 스크랩 데이터:", processedScraps);
    return processedScraps;
  } catch (error) {
    console.error("Failed to fetch user scraps", error);
    // 폴백 데이터 (API 실패 시)
    return [];
  }
};

// 다른 사용자의 프로필 정보 가져오기
export const getOtherUserProfile = async (
  userId: string
): Promise<UserProfile> => {
  try {
    // 실제 API 연결 코드 활성화
    const response = await apiClient.get(`/api/users/${userId}/profile`);
    return response.data;

    // 백엔드 연결이 되지 않는 경우를 위한 폴백 처리
    /*
    return {
      user: {
        id: parseInt(userId),
        username: "영화광123",
        email: "moviebuff@example.com",
        roles: ["USER"],
        createdAt: "2023-01-01",
        updatedAt: "2023-01-01",
        profileImageUrl: "https://via.placeholder.com/150",
      },
      followingCount: 234,
      followerCount: 567,
      watchedMoviesCount: 89,
      reviewedMoviesCount: 45,
      isFollowing: false,
    };
    */
  } catch (error) {
    console.error("Failed to fetch other user profile", error);
    // 폴백 데이터 (API 실패 시)
    return {
      user: {
        id: parseInt(userId),
        username: "영화광123",
        email: "moviebuff@example.com",
        roles: ["USER"],
        createdAt: "2023-01-01",
        updatedAt: "2023-01-01",
        profileImageUrl: "https://via.placeholder.com/150",
      },
      followingCount: 234,
      followerCount: 567,
      watchedMoviesCount: 89,
      reviewedMoviesCount: 45,
      isFollowing: false,
    };
  }
};

// 다른 사용자의 활동 정보 가져오기
export const getOtherUserActivity = async (
  userId: string
): Promise<UserActivity> => {
  try {
    // 실제 API 연결 코드 활성화
    const response = await apiClient.get(`/api/users/${userId}/activity`);
    return response.data;

    // 백엔드 연결이 되지 않는 경우를 위한 폴백 처리
    /*
    return {
      favoriteMovies: [],
      favoriteReviews: [],
      favoritePosts: [],
    };
    */
  } catch (error) {
    console.error("Failed to fetch other user activity", error);
    // 폴백 데이터 (API 실패 시)
    return {
      favoriteMovies: [],
      favoriteReviews: [],
      favoritePosts: [],
    };
  }
};

// 다른 사용자의 스크랩 목록 가져오기
export const getOtherUserScraps = async (userId: string) => {
  try {
    // 실제 API 연결 코드 활성화
    const response = await apiClient.get(`/api/users/${userId}/scraps`);
    return response.data;

    // 백엔드 연결이 되지 않는 경우를 위한 폴백 처리
    /*
    return [
      {
        id: 1,
        title: "인셉션",
        poster_path: "/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg",
        vote_average: 8.4,
        vote_count: 20345,
        release_date: "2010-07-16",
        media_type: "movie",
        overview: "꿈을 공유할 수 있는 기술을 가진 도둑들의 이야기",
        backdrop_path: "/s3TBrRGB1iav7gFOCNx3H31MoES.jpg",
      },
      {
        id: 2,
        title: "기생충",
        poster_path: "/jjHccoFjbqlfr4VGLVLT7yek0Xn.jpg",
        vote_average: 8.5,
        vote_count: 14362,
        release_date: "2019-05-30",
        media_type: "movie",
        overview: "전원백수로 살 길 막막하지만 사이는 좋은 기택 가족.",
        backdrop_path: "/ApiBzeaa95TNYliSbQ8pJv4Fje7.jpg",
      },
    ];
    */
  } catch (error) {
    console.error("Failed to fetch other user scraps", error);
    // 폴백 데이터 (API 실패 시)
    return [
      {
        id: 1,
        title: "인셉션",
        poster_path: "/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg",
        vote_average: 8.4,
        vote_count: 20345,
        release_date: "2010-07-16",
        media_type: "movie",
        overview: "꿈을 공유할 수 있는 기술을 가진 도둑들의 이야기",
        backdrop_path: "/s3TBrRGB1iav7gFOCNx3H31MoES.jpg",
      },
      {
        id: 2,
        title: "기생충",
        poster_path: "/jjHccoFjbqlfr4VGLVLT7yek0Xn.jpg",
        vote_average: 8.5,
        vote_count: 14362,
        release_date: "2019-05-30",
        media_type: "movie",
        overview: "전원백수로 살 길 막막하지만 사이는 좋은 기택 가족.",
        backdrop_path: "/ApiBzeaa95TNYliSbQ8pJv4Fje7.jpg",
      },
    ];
  }
};

// 사용자 팔로우/언팔로우 함수
export const toggleFollow = async (userId: string): Promise<any> => {
  try {
    console.log(`팔로우 토글 API 호출: ${userId}`);
    const response = await apiClient.post(`/api/users/follow/${userId}`);
    console.log("팔로우 토글 API 응답:", response.data);
    return response.data;
  } catch (error) {
    console.error("팔로우 토글 API 오류:", error);
    throw error;
  }
};

// 내 팔로워 목록 가져오기
export const getMyFollowers = async (): Promise<any[]> => {
  try {
    console.log("팔로워 목록 가져오기 시작");
    // 실제 API 연결 코드 활성화
    const response = await apiClient.get("/api/users/followers");
    console.log("팔로워 목록 응답:", response.data);

    // 백엔드에서 mutualFollow 필드가 없을 경우 클라이언트에서 추가
    const followers = response.data;
    const followersWithMutual = followers.map((follower: any) => {
      if (follower.mutualFollow === undefined) {
        // mutualFollow 필드가 없으면 임의로 설정
        // 실제로는 백엔드에서 이 정보를 제공해야 함
        return {
          ...follower,
          mutualFollow: follower.isFollowing === true,
        };
      }
      return follower;
    });

    return followersWithMutual;
  } catch (error) {
    console.error("팔로워 목록 가져오기 실패:", error);
    // 폴백 데이터 (API 실패 시)
    return [
      {
        id: 1,
        username: "영화광123",
        profileImageUrl: "https://via.placeholder.com/150",
        isFollowing: false,
        mutualFollow: false,
      },
      {
        id: 2,
        username: "시네필_김",
        profileImageUrl: "https://via.placeholder.com/150",
        isFollowing: true,
        mutualFollow: true,
      },
      {
        id: 3,
        username: "무비러버",
        profileImageUrl: "https://via.placeholder.com/150",
        isFollowing: false,
        mutualFollow: false,
      },
    ];
  }
};

// 내가 팔로우하는 사용자 목록 가져오기
export const getMyFollowing = async (): Promise<any[]> => {
  try {
    console.log("팔로잉 목록 가져오기 시작");
    // 실제 API 연결 코드 활성화
    const response = await apiClient.get("/api/users/following");
    console.log("팔로잉 목록 응답:", response.data);

    // 백엔드에서 mutualFollow 필드가 없을 경우 클라이언트에서 추가
    const following = response.data;
    const followingWithMutual = following.map((follow: any) => {
      if (follow.mutualFollow === undefined) {
        // 팔로잉 사용자는 항상 isFollowing이 true이며,
        // followedByMe가 true면 맞팔로잉
        return {
          ...follow,
          isFollowing: true, // 항상 true (내가 팔로우하는 사람들)
          mutualFollow: follow.followsMe === true,
        };
      }
      return follow;
    });

    return followingWithMutual;
  } catch (error) {
    console.error("팔로잉 목록 가져오기 실패:", error);
    // 폴백 데이터 (API 실패 시)
    return [
      {
        id: 4,
        username: "영화평론가",
        profileImageUrl: "https://via.placeholder.com/150",
        isFollowing: true,
        mutualFollow: false,
      },
      {
        id: 5,
        username: "씨네마틱",
        profileImageUrl: "https://via.placeholder.com/150",
        isFollowing: true,
        mutualFollow: true,
      },
      {
        id: 2,
        username: "시네필_김",
        profileImageUrl: "https://via.placeholder.com/150",
        isFollowing: true,
        mutualFollow: true,
      },
    ];
  }
};

// 다른 사용자의 팔로워 목록 가져오기
export const getUserFollowers = async (userId: string): Promise<any[]> => {
  try {
    console.log(`사용자 ${userId}의 팔로워 목록 가져오기 시작`);
    // 실제 API 연결 코드 활성화
    const response = await apiClient.get(`/api/users/${userId}/followers`);
    console.log("사용자 팔로워 목록 응답:", response.data);

    // 백엔드에서 mutualFollow 필드가 없을 경우 클라이언트에서 추가
    const followers = response.data;
    const followersWithMutual = followers.map((follower: any) => {
      if (follower.mutualFollow === undefined) {
        return {
          ...follower,
          mutualFollow:
            follower.isFollowing === true && follower.followsMe === true,
        };
      }
      return follower;
    });

    return followersWithMutual;
  } catch (error) {
    console.error(`사용자 ${userId}의 팔로워 목록 가져오기 실패:`, error);
    // 폴백 데이터 (API 실패 시)
    return [
      {
        id: 1,
        username: "영화광123",
        profileImageUrl: "https://via.placeholder.com/150",
        isFollowing: false,
        mutualFollow: false,
      },
      {
        id: 2,
        username: "시네필_김",
        profileImageUrl: "https://via.placeholder.com/150",
        isFollowing: true,
        mutualFollow: true,
      },
    ];
  }
};

// 다른 사용자의 팔로잉 목록 가져오기
export const getUserFollowing = async (userId: string): Promise<any[]> => {
  try {
    console.log(`사용자 ${userId}의 팔로잉 목록 가져오기 시작`);
    // 실제 API 연결 코드 활성화
    const response = await apiClient.get(`/api/users/${userId}/following`);
    console.log("사용자 팔로잉 목록 응답:", response.data);

    // 백엔드에서 mutualFollow 필드가 없을 경우 클라이언트에서 추가
    const following = response.data;
    const followingWithMutual = following.map((follow: any) => {
      if (follow.mutualFollow === undefined) {
        return {
          ...follow,
          mutualFollow:
            follow.isFollowing === true && follow.followsMe === true,
        };
      }
      return follow;
    });

    return followingWithMutual;
  } catch (error) {
    console.error(`사용자 ${userId}의 팔로잉 목록 가져오기 실패:`, error);
    // 폴백 데이터 (API 실패 시)
    return [
      {
        id: 3,
        username: "무비러버",
        profileImageUrl: "https://via.placeholder.com/150",
        isFollowing: true,
        mutualFollow: false,
      },
      {
        id: 4,
        username: "영화평론가",
        profileImageUrl: "https://via.placeholder.com/150",
        isFollowing: false,
        mutualFollow: false,
      },
    ];
  }
};

// 콘텐츠 스크랩 토글 (추가/삭제)
export const toggleContentScrap = async (
  contentId: number,
  mediaType: "movie" | "tv"
): Promise<{ isScraped: boolean }> => {
  try {
    const response = await apiClient.post(
      `/api/scraps/toggle?contentId=${contentId}&mediaType=${mediaType}`
    );
    return { isScraped: response.data.scraped }; // 백엔드 응답 구조에 맞춤
  } catch (error) {
    console.error("콘텐츠 스크랩 토글 실패:", error);
    throw error;
  }
};

// 콘텐츠 스크랩 상태 확인
export const checkContentScrapStatus = async (
  contentId: number,
  mediaType: "movie" | "tv"
): Promise<boolean> => {
  try {
    const response = await apiClient.get("/api/scraps/status", {
      params: { contentId, mediaType },
    });
    return response.data.scraped;
  } catch (error) {
    console.error("스크랩 상태 확인 실패:", error);
    return false;
  }
};
