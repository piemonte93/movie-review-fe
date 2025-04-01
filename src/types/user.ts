// 사용자 프로필 관련 타입 정의
export interface User {
  id: number;
  username: string;
  email: string;
  roles: string[];
  profileImageUrl?: string;
  bio?: string;
  createdAt?: string;
  updatedAt?: string;
  followerCount?: number;
  followingCount?: number;
  watchedMoviesCount?: number;
  reviewedMoviesCount?: number;
  isFollowing?: boolean;
}

export interface UserProfile {
  user: User;
  followingCount: number;
  followerCount: number;
  watchedMoviesCount: number;
  reviewedMoviesCount: number;
  isFollowing?: boolean;
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
