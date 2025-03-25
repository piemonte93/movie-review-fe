import { apiClient } from "./backendApi";
import { UserActivity, UserProfile } from "../types/user";

// 사용자 프로필 정보 가져오기
export const getUserProfile = async (): Promise<UserProfile> => {
  try {
    // 백엔드 연결이 되지 않으므로 목업 데이터 반환
    return {
      user: {
        id: 1,
        username: "사용자",
        email: "user@example.com",
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
    // const response = await apiClient.get('/api/users/profile');
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
    // 백엔드 연결이 되지 않으므로 목업 데이터 반환
    return { isFollowing: true };

    // 실제 API 연결 코드는 다음과 같습니다:
    // const response = await apiClient.post(`/api/users/${userId}/follow`);
    // return response.data;
  } catch (error) {
    console.error("Failed to toggle follow", error);
    throw error;
  }
};
