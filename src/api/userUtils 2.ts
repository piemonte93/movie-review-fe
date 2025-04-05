import { apiClient } from "./backendApi";

/**
 * 사용자 ID를 유저명으로 변환하는 함수 (백엔드 API가 제공되지 않을 경우 폴백 메커니즘)
 * @param userId 사용자 ID
 * @returns 변환된 유저명
 */
export const getUsernameFromUserId = async (
  userId: string
): Promise<string> => {
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
      const userMapping = JSON.parse(userMappingStr);
      if (userMapping[userId]) {
        console.log(
          `캐싱된 매핑에서 사용자 ID ${userId}의 유저명 찾음:`,
          userMapping[userId]
        );
        return userMapping[userId];
      }
    }

    // 3. 다양한 API 시도
    // 3.1 첫 번째 시도: 프로필 API (더 안정적인 API를 우선 시도)
    try {
      console.log(`프로필 API로 사용자 ID ${userId}의 사용자명 조회 시도`);
      const profileResponse = await apiClient.get(`/api/profile/id/${userId}`);
      if (profileResponse.data && profileResponse.data.username) {
        const username = profileResponse.data.username;
        console.log(`프로필 API에서 사용자명 찾음: ${username}`);
        // 캐싱
        cacheUserIdMapping(userId, username);
        return username;
      }
    } catch (e) {
      console.error("프로필 API에서 유저명 조회 실패:", e);
    }

    // 3.2. 두 번째 시도: 커뮤니티 API (폴백)
    try {
      console.log(`커뮤니티 API로 사용자 ID ${userId}의 사용자명 조회 시도`);
      const communityResponse = await apiClient.get(
        `/api/community/users/${userId}/username`
      );
      if (communityResponse.data && communityResponse.data.username) {
        const username = communityResponse.data.username;
        console.log(`커뮤니티 API에서 사용자명 찾음: ${username}`);
        // 캐싱
        cacheUserIdMapping(userId, username);
        return username;
      }
    } catch (e) {
      console.error("커뮤니티 API에서 유저명 조회 실패:", e);
    }

    // 4. 임시 폴백: ID 자체를 유저명으로 사용
    console.warn(
      `사용자 ID ${userId}에 대한 유저명을 찾을 수 없어 기본값을 사용합니다.`
    );
    return `user${userId}`;
  } catch (error) {
    console.error(`사용자 ID ${userId}를 유저명으로 변환 실패:`, error);
    return `user${userId}`;
  }
};

/**
 * 사용자 ID - 유저명 매핑 캐싱
 * @param userId 사용자 ID
 * @param username 유저명
 */
export const cacheUserIdMapping = (userId: string, username: string) => {
  try {
    let userMapping = {};
    const userMappingStr = localStorage.getItem("user_id_mapping");

    if (userMappingStr) {
      userMapping = JSON.parse(userMappingStr);
    }

    userMapping[userId] = username;
    localStorage.setItem("user_id_mapping", JSON.stringify(userMapping));
    console.log(`사용자 ID ${userId} - 유저명 ${username} 매핑 캐싱 완료`);
  } catch (e) {
    console.error("ID-유저명 매핑 캐싱 실패:", e);
  }
};
