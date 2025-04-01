import { apiClient } from "./backendApi";
import { UserActivity, UserProfile } from "../types/user";

// 사용자 프로필 정보 가져오기
export const getUserProfile = async (): Promise<UserProfile> => {
  try {
    // 로컬 스토리지에서 현재 사용자 정보 가져오기
    const userStr = localStorage.getItem("user");
    let username = "사용자";
    let email = "user@example.com";
    let profileImageUrl;
    let bio = "";
    let userId = 1;

    // 로컬 스토리지에 사용자 정보가 있으면 사용
    if (userStr) {
      try {
        const userData = JSON.parse(userStr);
        username = userData.username || username;
        email = userData.email || email;
        profileImageUrl = userData.profileImageUrl;
        bio = userData.bio || "";
        userId = userData.id || userId;
      } catch (e) {
        console.error("로컬 스토리지 사용자 정보 파싱 오류:", e);
      }
    }

    // 백엔드 연결이 되지 않으므로 목업 데이터 반환 (로컬 스토리지 정보 활용)
    return {
      user: {
        id: userId,
        username: username,
        email: email,
        profileImageUrl: profileImageUrl,
        bio: bio,
        roles: ["USER"],
        createdAt: "2023-01-01",
        updatedAt: "2023-01-01",
      },
      followingCount: 0,
      followerCount: 0,
      watchedMoviesCount: 0,
      reviewedMoviesCount: 0,
    };

    // 실제 API 연결 코드는 다음과 같습니다:
    // const response = await apiClient.get('/api/profile/me');
    // return response.data;
  } catch (error) {
    console.error("Failed to fetch user profile", error);
    throw error;
  }
};

// 사용자 활동 정보 가져오기
export const getUserActivity = async (): Promise<UserActivity> => {
  try {
    // 백엔드 연결이 되지 않으므로 목업 데이터 반환
    return {
      favoriteMovies: [],
      favoriteReviews: [],
      favoritePosts: [],
    };

    // 실제 API 연결 코드는 다음과 같습니다:
    // const response = await apiClient.get('/api/users/activity');
    // return response.data;
  } catch (error) {
    console.error("Failed to fetch user activity", error);
    throw error;
  }
};

// 사용자 팔로우 추천 정보 가져오기
export const getFollowRecommendations = async () => {
  try {
    // 백엔드 연결이 되지 않으므로 빈 배열 반환
    return [];

    // 실제 API 연결 코드는 다음과 같습니다:
    // const response = await apiClient.get('/api/users/recommendations');
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

    // 백엔드 연결이 되지 않으므로 목업 데이터 반환
    console.log("프로필 이미지 업로드 요청:", file.name);

    // 임시 URL 생성 (실제로는 서버에서 반환된 URL을 사용해야 함)
    const tempUrl = URL.createObjectURL(file);

    // 실제 API 연결 코드는 다음과 같습니다:
    // const response = await apiClient.post('/api/users/profile-image', formData, {
    //   headers: {
    //     'Content-Type': 'multipart/form-data'
    //   }
    // });
    // return response.data;

    return { profileImageUrl: tempUrl };
  } catch (error) {
    console.error("프로필 이미지 업로드 실패", error);
    throw error;
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

    // 실제 API 연결 코드는 다음과 같습니다:
    // const response = await apiClient.put('/api/users/profile', profileData);
    // return response.data;

    return {
      success: true,
      message: "프로필이 성공적으로 업데이트되었습니다.",
    };
  } catch (error) {
    console.error("프로필 정보 업데이트 실패", error);
    throw error;
  }
};

// 사용자가 스크랩한 영화 목록 가져오기
export const getUserScraps = async () => {
  try {
    // 백엔드 연결이 되지 않으므로 목업 데이터 반환
    return [
      {
        id: 1,
        title: "어벤져스: 엔드게임",
        poster_path: "/n78FdiR0H9VSigcQdH30XFI1chD.jpg",
        vote_average: 8.3,
        vote_count: 18435,
        release_date: "2019-04-24",
        media_type: "movie",
        overview:
          "인피니티 워 이후 절반만 살아남은 지구, 마지막 희망이 된 어벤져스.",
        backdrop_path: "/7RyHsO4yDXtBv1zUU3mTpHeQ0d5.jpg",
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
      {
        id: 3,
        title: "조커",
        poster_path: "/wrCwH6WOvXQvVuqcKNUrLDCDxdw.jpg",
        vote_average: 8.2,
        vote_count: 18908,
        release_date: "2019-10-02",
        media_type: "movie",
        overview: "고담시의 광대 아서 플렉은 코미디언을 꿈꾸는 남자.",
        backdrop_path: "/n6bUvigpRFqSwmPp1m2YADdbRBc.jpg",
      },
    ];

    // 실제 API 연결 코드는 다음과 같습니다:
    // const response = await apiClient.get('/api/users/scraps');
    // return response.data;
  } catch (error) {
    console.error("Failed to fetch user scraps", error);
    throw error;
  }
};

// 다른 사용자의 프로필 정보 가져오기
export const getOtherUserProfile = async (
  userId: string
): Promise<UserProfile> => {
  try {
    // 백엔드 연결이 되지 않으므로 목업 데이터 반환
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

    // 실제 API 연결 코드는 다음과 같습니다:
    // const response = await apiClient.get(`/api/users/${userId}/profile`);
    // return response.data;
  } catch (error) {
    console.error("Failed to fetch other user profile", error);
    throw error;
  }
};

// 다른 사용자의 활동 정보 가져오기
export const getOtherUserActivity = async (
  userId: string
): Promise<UserActivity> => {
  try {
    // 백엔드 연결이 되지 않으므로 목업 데이터 반환
    return {
      favoriteMovies: [],
      favoriteReviews: [],
      favoritePosts: [],
    };

    // 실제 API 연결 코드는 다음과 같습니다:
    // const response = await apiClient.get(`/api/users/${userId}/activity`);
    // return response.data;
  } catch (error) {
    console.error("Failed to fetch other user activity", error);
    throw error;
  }
};

// 다른 사용자의 스크랩 목록 가져오기
export const getOtherUserScraps = async (userId: string) => {
  try {
    // 백엔드 연결이 되지 않으므로 목업 데이터 반환
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

    // 실제 API 연결 코드는 다음과 같습니다:
    // const response = await apiClient.get(`/api/users/${userId}/scraps`);
    // return response.data;
  } catch (error) {
    console.error("Failed to fetch other user scraps", error);
    throw error;
  }
};

// 사용자 팔로우/언팔로우 함수
export const toggleFollow = async (
  userId: string
): Promise<{ isFollowing: boolean }> => {
  try {
    // 백엔드 연결이 되지 않으므로 임의로 상태를 변경하는 방식으로 구현
    // 실제 구현에서는 이전 상태를 기억할 필요가 없고 서버에서 전달받은 결과를 사용합니다

    // localStorage에서 현재 팔로우 상태를 확인합니다
    const followStateKey = `follow_state_${userId}`;
    const currentState = localStorage.getItem(followStateKey);

    // 현재 상태의 반대 값으로 설정 (처음에는 팔로우 상태로 설정)
    const newFollowState = currentState === "true" ? false : true;

    // 로컬 스토리지에 상태 저장
    localStorage.setItem(followStateKey, String(newFollowState));

    // 로컬 스토리지에 팔로잉 목록 관리
    const followingIdsKey = "following_ids";
    const followingIdsStr = localStorage.getItem(followingIdsKey) || "[]";
    const followingIds = JSON.parse(followingIdsStr);

    // 현재 사용자 ID 숫자로 변환
    const userIdNum = parseInt(userId);

    if (newFollowState) {
      // 팔로우 추가
      if (!followingIds.includes(userIdNum)) {
        followingIds.push(userIdNum);
      }
    } else {
      // 팔로우 제거
      const index = followingIds.indexOf(userIdNum);
      if (index > -1) {
        followingIds.splice(index, 1);
      }
    }

    // 로컬 스토리지에 저장
    localStorage.setItem(followingIdsKey, JSON.stringify(followingIds));

    console.log(`사용자 ${userId} 팔로우 상태 변경: ${newFollowState}`);
    console.log(`팔로잉 목록:`, followingIds);

    return { isFollowing: newFollowState };

    // 실제 API 연결 코드는 다음과 같습니다:
    // const response = await apiClient.post(`/api/users/${userId}/follow`);
    // return response.data;
  } catch (error) {
    console.error("Failed to toggle follow", error);
    throw error;
  }
};

// 팔로잉 목록 가져오기
export const getFollowingList = async () => {
  try {
    // 로컬 스토리지에서 팔로잉 목록 가져오기
    const followingIdsKey = "following_ids";
    const followingIdsStr = localStorage.getItem(followingIdsKey) || "[]";
    const followingIds = JSON.parse(followingIdsStr);

    console.log("로컬 스토리지에서 팔로잉 ID 목록 가져옴:", followingIds);

    // 백엔드 연결이 되지 않으므로 목업 데이터 반환
    const mockUsers = [
      {
        id: 1,
        username: "영화광123",
        profileImageUrl: "https://via.placeholder.com/40",
        bio: "영화 리뷰어 / 시나리오 작가 / 영화제 심사위원",
      },
      {
        id: 2,
        username: "시네필",
        profileImageUrl: "https://via.placeholder.com/40",
        bio: "매일 한 편씩 영화 감상 중. 좋아하는 감독은 크리스토퍼 놀란.",
      },
      {
        id: 3,
        username: "무비맨",
        profileImageUrl: "https://via.placeholder.com/40",
        bio: "영화 평론가 / 매주 새로운 영화 리뷰 업로드",
      },
      {
        id: 4,
        username: "영화사랑",
        profileImageUrl: "https://via.placeholder.com/40",
        bio: "액션, 스릴러 영화 전문 리뷰어. 추천 문의 환영합니다!",
      },
      {
        id: 5,
        username: "필름러버",
        profileImageUrl: "https://via.placeholder.com/40",
        bio: "고전영화 마니아. 1950-60년대 작품 위주로 소개합니다.",
      },
      {
        id: 6,
        username: "영화덕후",
        profileImageUrl: "https://via.placeholder.com/40",
        bio: "독립영화 마니아, 영화제 평가단",
      },
      {
        id: 7,
        username: "무비로그",
        profileImageUrl: "https://via.placeholder.com/40",
        bio: "모든 장르의 영화를 좋아하는 영화 애호가, A24 팬",
      },
      {
        id: 8,
        username: "시네마틱",
        profileImageUrl: "https://via.placeholder.com/40",
        bio: "영화 사진작가, 촬영감독 지망생. 영화 미학 연구",
      },
      {
        id: 9,
        username: "필름워커",
        profileImageUrl: "https://via.placeholder.com/40",
        bio: "영화 제작/연출 스태프. 영화 기술적인 이야기를 공유합니다.",
      },
    ];

    // 실제로 팔로우하고 있는 사용자만 필터링
    const followingUsers = mockUsers.filter((user) =>
      followingIds.includes(user.id)
    );

    console.log("필터링된 팔로잉 목록:", followingUsers);

    return followingUsers;

    // 실제 API 연결 코드는 다음과 같습니다:
    // const response = await apiClient.get('/api/users/following');
    // return response.data;
  } catch (error) {
    console.error("팔로잉 목록 가져오기 실패", error);
    throw error;
  }
};

// 팔로워 목록 가져오기
export const getFollowersList = async () => {
  try {
    // 백엔드 연결이 되지 않으므로 목업 데이터 반환
    const mockFollowers = [
      {
        id: 6,
        username: "영화덕후",
        profileImageUrl: "https://via.placeholder.com/40",
        bio: "독립영화 마니아, 영화제 평가단",
      },
      {
        id: 7,
        username: "무비로그",
        profileImageUrl: "https://via.placeholder.com/40",
        bio: "모든 장르의 영화를 좋아하는 영화 애호가, A24 팬",
      },
      {
        id: 8,
        username: "시네마틱",
        profileImageUrl: "https://via.placeholder.com/40",
        bio: "영화 사진작가, 촬영감독 지망생. 영화 미학 연구",
      },
      {
        id: 9,
        username: "필름워커",
        profileImageUrl: "https://via.placeholder.com/40",
        bio: "영화 제작/연출 스태프. 영화 기술적인 이야기를 공유합니다.",
      },
    ];

    return mockFollowers;

    // 실제 API 연결 코드는 다음과 같습니다:
    // const response = await apiClient.get('/api/users/followers');
    // return response.data;
  } catch (error) {
    console.error("팔로워 목록 가져오기 실패", error);
    throw error;
  }
};
