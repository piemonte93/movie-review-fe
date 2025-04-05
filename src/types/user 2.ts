// 사용자 프로필 관련 타입 정의
export interface User {
  id: number;
  username: string;
  email: string;
  bio?: string;
  roles: string[];
  profileImageUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserProfile {
  user: User;
  followingCount: number;
  followerCount: number;
  watchedMoviesCount: number;
  reviewedMoviesCount: number;
  isFollowing?: boolean;
  mutualFollow?: boolean;
  followsMe?: boolean;
}

export interface UserActivity {
  favoriteMovies: any[];
  favoriteReviews: any[];
  favoritePosts: any[];
}

export interface FollowRecommendation {
  id: number;
  username: string;
  reviewCount: number;
  posterUrl?: string;
}
