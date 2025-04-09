import { UserActivity, UserProfile } from "../types/user";
import { MovieReview, TvShowReview } from "../api/backendApi";
import { apiClient } from "./backendApi";

// 사용자 프로필 정보 가져오기
export const getUserProfile = async (): Promise<UserProfile> => {
  try {
    // 로컬 스토리지에서 사용자 정보 가져오기
    const userStr = localStorage.getItem("user");
    if (!userStr) {
      throw new Error("로컬 스토리지에 사용자 정보가 없습니다.");
    }

    const localUser = JSON.parse(userStr);
    const userId = localUser.id;
    const username = localUser.username;

    // 실제 API 연결 코드 활성화 - 현재 로그인한 사용자의 ID를 사용
    const response = await apiClient.get(`/api/profile/id/${userId}`);
    console.log("서버에서 받은 프로필 응답:", response.data);

    // 프로필 데이터 가져오기
    const profileData = response.data;

    // 백엔드에서 postCount가 없는 경우 게시글 수를 가져오기 위한 추가 요청
    if (profileData.postCount === undefined) {
      try {
        console.log(`사용자 ${username}의 게시글 수 조회 시작`);

        // 여러 방법으로 게시글 수 가져오기 시도
        let postCount = 0;

        // 방법 1: 전용 카운트 API 시도
        try {
          const countResponse = await apiClient.get(
            `/api/community/posts/count/${userId}`
          );
          if (typeof countResponse.data === "number") {
            console.log("게시글 수 카운트 API 응답:", countResponse.data);
            postCount = countResponse.data;
          }
        } catch (countError) {
          console.log("게시글 수 카운트 API 호출 실패:", countError);
        }

        // 방법 1이 실패하면 방법 2 시도: getUserPostCount 함수 사용
        if (postCount === 0) {
          postCount = await getUserPostCount(userId);
          console.log("getUserPostCount로 가져온 게시글 수:", postCount);
        }

        // 결과 설정
        profileData.postCount = postCount;
        console.log(`최종 게시글 수: ${postCount}`);
      } catch (postError) {
        console.error("게시글 수 가져오기 실패:", postError);
        console.log("게시글 수 기본값 0으로 설정");
        profileData.postCount = 0;
      }
    }

    return profileData;
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
          reviewCount: 0,
          postCount: 0,
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
      reviewCount: 0,
      postCount: 0,
    };
  }
};

// 사용자 활동 정보 가져오기
export const getUserActivity = async (): Promise<UserActivity> => {
  try {
    // 로컬 스토리지에서 사용자 정보 가져오기
    const userStr = localStorage.getItem("user");
    if (!userStr) {
      throw new Error("로컬 스토리지에 사용자 정보가 없습니다.");
    }

    const localUser = JSON.parse(userStr);
    const username = localUser.username;

    // 실제 API 연결 코드 활성화 - 실제 사용자명 사용
    const response = await apiClient.get(`/api/profile/${username}/activity`);
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
    // 백엔드에 해당 API가 구현되어 있지 않으므로 빈 배열 반환
    console.log("팔로우 추천 목록 - 백엔드 API 미구현으로 빈 배열 반환");
    return [];
  } catch (error) {
    console.error("Failed to fetch follow recommendations", error);
    return [];
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
    const processedScraps = response.data.map((scrap) => {
      // 기존 스크랩 데이터 복사
      const processedScrap = { ...scrap };

      // TV 프로그램인 경우 title 필드가 없을 수 있으므로 name 필드로 대체
      if (scrap.media_type === "tv") {
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

// 로컬 스토리지에서 사용자 ID에 해당하는 유저명 가져오기
const getLocalUsername = async (userId: string): Promise<string | null> => {
  try {
    // 1. 본인 ID인지 확인 (로컬 스토리지)
    const userStr = localStorage.getItem("user");
    if (userStr) {
      const localUser = JSON.parse(userStr);
      if (localUser.id === parseInt(userId)) {
        console.log(
          "현재 로그인한 사용자의 ID. 로컬 유저명 사용:",
          localUser.username
        );
        return localUser.username;
      }
    }

    // 2. 캐싱된 사용자 매핑 확인
    const userMappingStr = localStorage.getItem("user_id_mapping");
    if (userMappingStr) {
      const userMapping: Record<string, string> = JSON.parse(userMappingStr);
      if (userMapping[userId]) {
        console.log(
          `캐싱된 매핑에서 사용자 ID ${userId}의 유저명 찾음:`,
          userMapping[userId]
        );
        return userMapping[userId];
      }
    }

    return null;
  } catch (error) {
    console.error("로컬 유저명 조회 실패:", error);
    return null;
  }
};

// 프로필 API를 통해 사용자 ID로 사용자명 가져오기
export const getUsernameFromUserId = async (
  userId: string
): Promise<string> => {
  try {
    console.log(`[디버그] 사용자 ID ${userId}의 유저명 조회 시작`);

    // 1. 본인 ID인지 확인 (로컬 스토리지)
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        const localUser = JSON.parse(userStr);
        if (localUser.id === parseInt(userId)) {
          console.log(
            `[디버그] 현재 로그인한 사용자의 ID(${userId}). 로컬 유저명 사용:`,
            localUser.username
          );
          return localUser.username;
        }
      } catch (e) {
        console.error("[디버그] 로컬 스토리지 사용자 정보 파싱 오류:", e);
      }
    }

    // 2. 캐싱된 사용자 매핑 확인
    const userMappingStr = localStorage.getItem("user_id_mapping");
    if (userMappingStr) {
      try {
        const userMapping = JSON.parse(userMappingStr);
        if (userMapping[userId]) {
          console.log(
            `[디버그] 캐싱된 매핑에서 사용자 ID ${userId}의 유저명 찾음:`,
            userMapping[userId]
          );
          return userMapping[userId];
        }
      } catch (e) {
        console.error("[디버그] 사용자 매핑 캐시 파싱 실패:", e);
      }
    }

    // 3. 직접 API 호출로 프로필 정보 조회 (ID 기반)
    console.log(`[디버그] ID 기반 프로필 API 직접 호출: 사용자 ID ${userId}`);

    try {
      // 명시적인 타임아웃 설정하여 빠른 실패 처리
      const profileResponse = await apiClient.get(`/api/profile/id/${userId}`, {
        timeout: 3000, // 3초 타임아웃
      });

      console.log(`[디버그] 프로필 응답 데이터:`, profileResponse.data);

      if (profileResponse.data && profileResponse.data.username) {
        const username = profileResponse.data.username;
        console.log(
          `[디버그] API에서 사용자 ID ${userId}의 유저명 찾음:`,
          username
        );

        // 캐시에 사용자 ID-유저명 매핑 저장
        try {
          const userMappingStr =
            localStorage.getItem("user_id_mapping") || "{}";
          const userMapping: Record<string, string> =
            JSON.parse(userMappingStr);
          userMapping[userId] = username;
          localStorage.setItem("user_id_mapping", JSON.stringify(userMapping));
          console.log(
            `[디버그] 사용자 ID ${userId}와 유저명 ${username} 매핑 캐시 저장 완료`
          );
        } catch (e) {
          console.error("[디버그] 사용자 매핑 캐시 업데이트 실패:", e);
        }

        return username;
      } else {
        console.warn(`[디버그] 응답에 username이 없음:`, profileResponse.data);
      }
    } catch (apiError) {
      console.error(
        `[디버그] /api/profile/id/${userId} API 호출 실패:`,
        apiError
      );
      // 실패 시 fetch API로 한 번 더 시도
      try {
        console.log(`[디버그] fetch API로 재시도: /api/profile/id/${userId}`);
        const response = await fetch(
          `http://localhost:8080/api/profile/id/${userId}`
        );
        if (response.ok) {
          const data = await response.json();
          console.log(`[디버그] fetch API 응답:`, data);
          if (data && data.username) {
            // 캐시에 저장
            try {
              const userMappingStr =
                localStorage.getItem("user_id_mapping") || "{}";
              const userMapping: Record<string, string> =
                JSON.parse(userMappingStr);
              userMapping[userId] = data.username;
              localStorage.setItem(
                "user_id_mapping",
                JSON.stringify(userMapping)
              );
            } catch (e) {
              console.error("[디버그] 사용자 매핑 캐시 업데이트 실패:", e);
            }
            return data.username;
          }
        } else {
          console.error(`[디버그] fetch API 호출 실패:`, response.status);
        }
      } catch (fetchError) {
        console.error(`[디버그] fetch API 호출 중 오류:`, fetchError);
      }
    }

    // 4. 기본값 반환 (모든 시도 실패 시)
    console.warn(
      `[디버그] 사용자 ID ${userId}에 대한 유저명을 찾을 수 없음, 기본값 사용`
    );
    return `사용자${userId}`;
  } catch (error) {
    console.error(
      `[디버그] 사용자 ID ${userId}의 유저명 조회 중 예외 발생:`,
      error
    );
    return `사용자${userId}`;
  }
};

// 다른 사용자의 프로필 정보 가져오기
export const getOtherUserProfile = async (
  userId: string
): Promise<UserProfile> => {
  try {
    console.log(`사용자 ID: ${userId}의 프로필 데이터 요청 시작`);

    // 백엔드에서 사용자 프로필 정보를 가져옴 (ID 기반 직접 API 요청)
    const profileResponse = await apiClient.get(`/api/profile/id/${userId}`);
    console.log("사용자 프로필 데이터 응답:", profileResponse.data);

    // 디버깅: 응답에서 reviewCount와 postCount 확인
    console.log(
      `[디버그] 프로필 응답의 reviewCount: ${profileResponse.data.reviewCount}`
    );
    console.log(
      `[디버그] 프로필 응답의 postCount: ${profileResponse.data.postCount}`
    );

    // 응답 데이터를 UserProfile 형식에 맞게 변환
    const responseData = profileResponse.data;

    // 기본 프로필 데이터 구성
    const profileData = {
      user: {
        id: parseInt(userId),
        username: responseData.username || `사용자${userId}`,
        email: responseData.email || "user@example.com",
        bio: responseData.bio || "",
        roles: responseData.roles || ["USER"],
        profileImageUrl: responseData.profileImageUrl,
        createdAt: responseData.createdAt || "2023-01-01",
        updatedAt: responseData.updatedAt || "2023-01-01",
      },
      followingCount: responseData.followingCount || 0,
      followerCount: responseData.followerCount || 0,
      reviewCount: responseData.reviewCount || 0,
      postCount: responseData.postCount || 0,
      isFollowing: responseData.isFollowing || false,
      mutualFollow: responseData.mutualFollow || false,
      followsMe: responseData.followsMe || false,
    };

    // 디버깅: 생성된 profileData 객체의 값 확인
    console.log(
      `[디버그] 생성된 profileData 객체의 reviewCount: ${profileData.reviewCount}`
    );
    console.log(
      `[디버그] 생성된 profileData 객체의 postCount: ${profileData.postCount}`
    );

    // 백엔드에서 postCount가 없는 경우 게시글 수를 가져오기 위한 추가 요청
    if (profileData.postCount === undefined) {
      try {
        console.log(`사용자 ${userId}의 게시글 수 조회 시작`);

        // 여러 방법으로 게시글 수 가져오기 시도
        let postCount = 0;

        // 방법 1: 전용 카운트 API 시도
        try {
          const countResponse = await apiClient.get(
            `/api/community/posts/count/${userId}`
          );
          if (typeof countResponse.data === "number") {
            console.log("게시글 수 카운트 API 응답:", countResponse.data);
            postCount = countResponse.data;
          }
        } catch (countError) {
          console.log("게시글 수 카운트 API 호출 실패:", countError);
        }

        // 방법 1이 실패하면 방법 2 시도: getUserPostCount 함수 사용
        if (postCount === 0) {
          postCount = await getUserPostCount(userId);
          console.log("getUserPostCount로 가져온 게시글 수:", postCount);
        }

        // 결과 설정
        profileData.postCount = postCount;
        console.log(`최종 게시글 수: ${postCount}`);
      } catch (postError) {
        console.error("게시글 수 가져오기 실패:", postError);
        console.log("게시글 수 기본값 0으로 설정");
        profileData.postCount = 0;
      }
    }

    return profileData;
  } catch (error) {
    console.error("사용자 프로필 데이터 가져오기 실패:", error);

    // 폴백 데이터 (모든 API 실패 시)
    return {
      user: {
        id: parseInt(userId),
        username: "사용자" + userId,
        email: `user${userId}@example.com`,
        bio: "사용자 정보를 불러올 수 없습니다.",
        roles: ["USER"],
        createdAt: "2023-01-01",
        updatedAt: "2023-01-01",
        profileImageUrl: null,
      },
      followingCount: 0,
      followerCount: 0,
      reviewCount: 0,
      postCount: 0,
      isFollowing: false,
    };
  }
};

// 다른 사용자의 활동 정보 가져오기
export const getOtherUserActivity = async (
  userId: string
): Promise<UserActivity> => {
  try {
    console.log(`사용자 ID: ${userId}의 활동 데이터 요청 시작`);

    // ID로 유저명 가져오기 (업데이트된 함수 사용)
    const username = await getUsernameFromUserId(userId);
    console.log(`사용자 ID ${userId}의 변환된 유저명: ${username}`);

    // 유저명으로 활동 정보 요청
    const activityResponse = await apiClient.get(
      `/api/profile/${username}/activity`
    );
    console.log("사용자 활동 데이터 응답:", activityResponse.data);

    // 응답이 없거나 형식이 다를 경우를 대비한 기본값 설정
    return {
      favoriteMovies: activityResponse.data.favoriteMovies || [],
      favoriteReviews: activityResponse.data.favoriteReviews || [],
      favoritePosts: activityResponse.data.favoritePosts || [],
    };
  } catch (error) {
    console.error("다른 사용자의 활동 정보 가져오기 실패:", error);

    // 폴백 데이터 (모든 API 실패 시)
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
    console.log(`사용자 ID: ${userId}의 스크랩 데이터 요청 시작`);

    // ID로 유저명 가져오기 (업데이트된 함수 사용)
    const username = await getUsernameFromUserId(userId);
    console.log(`사용자 ID ${userId}의 변환된 유저명: ${username}`);

    // 유저명으로 스크랩 요청
    const scrapsResponse = await apiClient.get(
      `/api/profile/${username}/scraps`
    );
    console.log("사용자 스크랩 데이터 응답:", scrapsResponse.data);

    // 형식이 다를 경우를 대비해 가공
    const scraps = scrapsResponse.data;

    // 응답이 없거나 빈 배열인 경우 폴백 데이터 없이 그대로 반환
    if (!scraps || scraps.length === 0) {
      return [];
    }

    return scraps.map((item: any) => {
      const mediaType = item.mediaType || item.media_type || "movie";

      // TV 쇼와 영화 구분에 따른 데이터 가공
      const processedItem = {
        id: item.id || item.contentId,
        title: item.title || item.name || "제목 없음",
        name: item.name || item.title, // TV 쇼인 경우 name 필드 추가
        poster_path: item.posterPath || item.poster_path,
        vote_average: item.voteAverage || item.vote_average || 0,
        vote_count: item.voteCount || item.vote_count || 0,
        media_type: mediaType,
        overview: item.overview || "",
        backdrop_path: item.backdropPath || item.backdrop_path,
      };

      // TV 쇼인 경우 first_air_date 필드 추가
      if (mediaType === "tv") {
        processedItem.first_air_date =
          item.firstAirDate ||
          item.first_air_date ||
          item.releaseDate ||
          item.release_date;
      } else {
        processedItem.release_date =
          item.releaseDate ||
          item.release_date ||
          item.firstAirDate ||
          item.first_air_date;
      }

      return processedItem;
    });
  } catch (error) {
    console.error("다른 사용자의 스크랩 목록 가져오기 실패:", error);

    // 폴백 데이터 (모든 API 실패 시)
    return [];
  }
};

// 사용자 팔로우/언팔로우 함수
export const toggleFollow = async (userId: string): Promise<any> => {
  try {
    console.log(`팔로우 토글 API 호출: ${userId}`);

    // 명확한 API 엔드포인트 경로로 요청
    const response = await apiClient.post(`/api/users/follow/${userId}`);

    console.log("팔로우 토글 API 응답:", response.data);
    return response.data;
  } catch (error) {
    console.error("팔로우 토글 API 오류:", error);

    // 오류를 상위로 전파
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

// 사용자 게시글 수를 직접 가져오는 함수
export const getUserPostCount = async (userId: number): Promise<number> => {
  try {
    console.log(`사용자 ID ${userId}의 게시글 수 직접 조회 시도`);

    // 사용자의 게시글 목록을 가져옵니다 (첫 페이지만)
    const response = await apiClient.get(
      `/api/community/posts/user/${userId}`,
      {
        params: { page: 0, size: 1 }, // 페이지네이션 정보만 필요하므로 사이즈를 작게 설정
      }
    );

    console.log(`[디버그] getUserPostCount 응답:`, response.data);

    // totalElements 필드에서 총 게시글 수를 확인합니다
    if (response.data && typeof response.data.totalElements === "number") {
      console.log(
        `사용자 ID ${userId}의 게시글 수: ${response.data.totalElements}`
      );
      return response.data.totalElements;
    }

    console.log(
      `사용자 ID ${userId}의 게시글 수를 가져오지 못함, 기본값 0 반환`
    );
    return 0;
  } catch (error) {
    console.error(`사용자 ID ${userId}의 게시글 수 조회 실패:`, error);
    return 0;
  }
};

// New API function to update profile with potential image upload
export const updateMyProfileApi = async (
  formData: FormData
): Promise<UserProfile> => {
  console.log("Submitting profile update with FormData:");
  // Optional: Log FormData contents for debugging (can be tricky)
  // formData.forEach((value, key) => {
  //   console.log(key, value);
  // });

  try {
    // Use PUT request to the correct backend endpoint /api/profile/me
    const response = await apiClient.put<UserProfile>(
      "/api/profile/me",
      formData,
      {
        headers: {
          // Content-Type is automatically set
        },
      }
    );
    console.log("Profile update API response:", response.data);
    return response.data;
  } catch (error: any) {
    console.error(
      "Error updating profile:",
      error.response?.data || error.message
    );
    throw error;
  }
};
