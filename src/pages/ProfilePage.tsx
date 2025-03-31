import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  FaCamera,
  FaUser,
  FaEllipsisH,
  FaBookmark,
  FaHeart,
  FaComment,
  FaTh,
  FaVideo,
  FaStar,
  FaPencilAlt,
} from "react-icons/fa";
import {
  getUserProfile,
  getUserActivity,
  getFollowRecommendations,
  uploadProfileImage,
  updateUserProfile,
  getUserScraps,
} from "../api/userApi";
import { backendApi } from "../api/backendApi";
import { UserProfile, UserActivity } from "../types/user";
import ProfilePageCard from "../components/ProfilePageCard";
import { toast } from "react-toastify";
import styles from "./ProfilePage.module.css";

interface LikedReviewsResponse {
  content: Array<{
    id: number;
    userId: number;
    username: string;
    userProfileImageUrl: string;
    movieId: number;
    movieTitle: string;
    content: string;
    rating: number;
    likeCount: number;
    dislikeCount: number;
    commentCount: number;
    createdAt: string;
  }>;
  totalElements: number;
  totalPages: number;
}

// 프로필 페이지 컴포넌트
const ProfilePage: React.FC = () => {
  const { user, isLoggedIn, updateUserInfo } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 각 섹션 데이터 상태
  const [profileData, setProfileData] = useState<UserProfile | null>(null);
  const [activityData, setActivityData] = useState<UserActivity | null>(null);
  const [followRecommendations, setFollowRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [uploadingImage, setUploadingImage] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("posts");
  const [scrappedMovies, setScrappedMovies] = useState<any[]>([]);
  const [likedReviews, setLikedReviews] = useState<LikedReviewsResponse>({
    content: [],
    totalElements: 0,
    totalPages: 0
  });
  const [likedReviewsLoading, setLikedReviewsLoading] = useState<boolean>(false);
  const [page, setPage] = useState<number>(0);

  useEffect(() => {
    // 사용자 데이터 로드
    const fetchUserData = async () => {
      try {
        setLoading(true);

        // 병렬로 여러 API 요청 처리
        const [profile, activity, recommendations, scraps] = await Promise.all([
          getUserProfile(),
          getUserActivity(),
          getFollowRecommendations(),
          getUserScraps(),
        ]);

        setProfileData(profile);
        setActivityData(activity);
        setFollowRecommendations(recommendations);
        setScrappedMovies(scraps);
      } catch (error) {
        console.error("Failed to fetch user data", error);
      } finally {
        setLoading(false);
      }
    };

    if (isLoggedIn) {
      fetchUserData();
    }
  }, [isLoggedIn]);

  // 좋아요한 리뷰 목록 가져오기
  const fetchLikedReviews = useCallback(async () => {
    if (activeTab !== 'likes') return;
    
    setLikedReviewsLoading(true);
    try {
      console.log('좋아요한 리뷰 가져오기 시작');
      const response = await backendApi.getLikedReviews(page, 10);
      console.log('좋아요한 리뷰 응답:', response);
      
      if (response && response.content) {
        setLikedReviews(response);
      } else {
        console.error('유효하지 않은 응답 형식:', response);
        setLikedReviews({
          content: [],
          totalElements: 0,
          totalPages: 0
        });
      }
    } catch (error) {
      console.error('좋아요한 리뷰를 가져오는 중 오류 발생:', error);
      toast.error('좋아요한 리뷰를 가져오는 데 실패했습니다.');
      setLikedReviews({
        content: [],
        totalElements: 0,
        totalPages: 0
      });
    } finally {
      setLikedReviewsLoading(false);
    }
  }, [activeTab, page]);

  // 좋아요 취소 처리
  const handleUnlikeReview = async (reviewId: number) => {
    try {
      await backendApi.likeReview(reviewId);
      toast.success('좋아요가 취소되었습니다.');
      // 좋아요 목록에서 해당 리뷰 제거
      setLikedReviews(prev => ({
        ...prev,
        content: prev.content.filter(review => review.id !== reviewId),
        totalElements: prev.totalElements - 1
      }));
      
      // 데이터 갱신을 위해 페이지를 다시 로드
      fetchLikedReviews();
    } catch (error) {
      console.error('좋아요 취소 중 오류 발생:', error);
      toast.error('좋아요 취소에 실패했습니다.');
    }
  };

  // 날짜 포맷 함수
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid date';
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // 탭 변경 시 데이터 로드
  useEffect(() => {
    if (activeTab === "likes") {
      fetchLikedReviews();
    }
  }, [activeTab, fetchLikedReviews]);

  // 프로필 이미지 선택 처리
  const handleProfileImageClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // 프로필 이미지 변경 처리
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try {
        setUploadingImage(true);
        const file = e.target.files[0];

        // 이미지 파일 타입 확인
        if (!file.type.startsWith("image/")) {
          alert("이미지 파일만 업로드 가능합니다.");
          return;
        }

        // 파일 크기 제한 (5MB)
        if (file.size > 5 * 1024 * 1024) {
          alert("파일 크기는 5MB 이하여야 합니다.");
          return;
        }

        // 이미지 업로드 API 호출
        const result = await uploadProfileImage(file);

        // 프로필 정보 업데이트 API 호출
        await updateUserProfile({ profileImageUrl: result.profileImageUrl });

        // AuthContext를 통해 사용자 정보 업데이트
        updateUserInfo({ profileImageUrl: result.profileImageUrl });

        // 성공 메시지
        alert("프로필 이미지가 업데이트되었습니다.");
      } catch (error) {
        console.error("프로필 이미지 업로드 실패:", error);
        alert("이미지 업로드에 실패했습니다. 다시 시도해주세요.");
      } finally {
        setUploadingImage(false);
        // 파일 입력 초기화
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    }
  };

  // 게시물 탭 렌더링
  const renderPostsTab = () => {
    const dummyPosts = [
      {
        id: 1,
        title: "내 첫 번째 게시물",
        content: "이것은 내 첫 번째 게시물입니다.",
        type: "post",
      },
      {
        id: 2,
        title: "두 번째 게시물",
        content: "영화에 대한 생각을 공유합니다.",
        type: "post",
      },
    ];

    return (
      <div className={styles.tabContent}>
        {dummyPosts.map((post) => (
          <ProfilePageCard
            key={post.id}
            content={post}
            className={styles.contentCard}
          />
        ))}
      </div>
    );
  };

  // 리뷰 탭 렌더링
  const renderReviewsTab = () => {
    const dummyReviews = [
      {
        id: 1,
        movieTitle: "인셉션",
        content: "놀라운 영화였습니다. 크리스토퍼 놀란의 걸작!",
        rating: 4.8,
        type: "review",
      },
      {
        id: 2,
        movieTitle: "인터스텔라",
        content: "감동적인 스토리와 놀라운 영상미.",
        rating: 4.9,
        type: "review",
      },
    ];

    return (
      <div className={styles.tabContent}>
        {dummyReviews.map((review) => (
          <ProfilePageCard
            key={review.id}
            content={review}
            className={styles.contentCard}
          />
        ))}
      </div>
    );
  };

  // 좋아요 탭 렌더링
  const renderLikesTab = () => {
    return (
      <div className={styles.tabContent}>
        {likedReviewsLoading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">로딩 중...</span>
            </div>
          </div>
        ) : likedReviews.content.length === 0 ? (
          <div className="text-center py-5">
            <p>좋아요한 리뷰가 없습니다.</p>
          </div>
        ) : (
          <div className="row">
            {likedReviews.content.map((review) => (
              <div key={review.id} className="col-md-6 mb-4">
                <div className="card h-100">
                  <div className="card-body">
                    <div className="d-flex justify-content-between">
                      <h5 className="card-title">{review.movieTitle}</h5>
                      <div>
                        <span className="me-2">⭐ {review.rating}</span>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleUnlikeReview(review.id)}
                          title="좋아요 취소"
                        >
                          ❤️
                        </button>
                      </div>
                    </div>
                    <p className="card-text">{review.content}</p>
                    <p className="card-text text-muted">
                      <small>작성자: {review.username}</small><br />
                      <small>작성일: {formatDate(review.createdAt)}</small>
                    </p>
                    <div className="d-flex justify-content-between align-items-center">
                      <Link to={`/movie/${review.movieId}`} className="btn btn-sm btn-primary">
                        영화 보기
                      </Link>
                      <div>
                        <span className="me-2">❤️ {review.likeCount}</span>
                        <span>👎 {review.dislikeCount}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // 스크랩 탭 렌더링
  const renderScrapsTab = () => {
    const dummyScraps = [
      {
        id: 1,
        title: "영화 추천 목록",
        content: "꼭 봐야 할 영화 10선",
        type: "scrap",
      },
      {
        id: 2,
        title: "영화 팬들이 선정한 베스트 영화",
        content: "영화 커뮤니티가 선정한 올해의 영화 20선",
        type: "scrap",
      },
    ];

    return (
      <div className={styles.tabContent}>
        {dummyScraps.map((scrap) => (
          <ProfilePageCard
            key={scrap.id}
            content={scrap}
            className={styles.contentCard}
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
      case "likes":
        return renderLikesTab();
      case "scraps":
        return renderScrapsTab();
      default:
        return null;
    }
  };

  if (!isLoggedIn) {
    return (
      <div className={styles.container}>
        <div className={styles.notLoggedIn}>
          <h2>로그인이 필요합니다</h2>
          <p>마이페이지를 이용하려면 로그인해 주세요.</p>
          <Link to="/login" className={styles.loginButton}>
            로그인 하기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* 프로필 헤더 섹션 - 인스타그램 스타일 */}
      <div className={styles.profileHeader}>
        <div className={styles.profileImage} onClick={handleProfileImageClick}>
          {uploadingImage ? (
            <div className={styles.uploadingOverlay}>
              <div className={styles.spinner}></div>
            </div>
          ) : null}
          {profileData?.user.profileImageUrl ? (
            <img
              src={profileData.user.profileImageUrl}
              alt="프로필 이미지"
              className={styles.profileImg}
            />
          ) : (
            <div className={styles.defaultProfileImage}>
              <FaUser />
            </div>
          )}
          <div className={styles.editOverlay}>
            <span>수정</span>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageChange}
            accept="image/*"
            style={{ display: "none" }}
          />
        </div>
        <div className={styles.profileInfo}>
          <div className={styles.flexItemsBetween}>
            <h1 className={styles.username}>
              {profileData?.user.username || user?.username}
            </h1>
            <div className={styles.flexSpaceX2}>
              <Link
                to="/profile/edit"
                className={styles.editLink}
              >
                프로필 편집
              </Link>
              <button className={styles.editButton}>
                <FaEllipsisH />
              </button>
            </div>
          </div>
          <div className={styles.stats}>
            <div className={styles.stat}>
              <span className={styles.count}>
                {profileData?.watchedMoviesCount || 0}
              </span>
              <span className={styles.label}>게시물</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.count}>
                {profileData?.followerCount || 0}
              </span>
              <span className={styles.label}>팔로워</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.count}>
                {profileData?.followingCount || 0}
              </span>
              <span className={styles.label}>팔로우</span>
            </div>
          </div>
          <div>
            <p className={styles.bio}>{user?.email || "소개글이 없습니다."}</p>
            <p className={styles.email}>{user?.email}</p>
          </div>
        </div>
      </div>

      {/* 스토리 하이라이트 */}
      <div className={styles.storyHighlight}>
        <div className={styles.flexSpaceX4}>
          <div className={styles.flexItemsCenter}>
            <div className={styles.w16h16}>
              <span className={styles.text3xl}>+</span>
            </div>
            <span className={styles.textxs}>새로 만들기</span>
          </div>
          <div className={styles.flexItemsCenter}>
            <div className={styles.w16h16}>
              <img
                src="https://via.placeholder.com/64"
                alt="하이라이트"
                className={styles.wFull}
              />
            </div>
            <span className={styles.textxs}>좋아하는 영화</span>
          </div>
          <div className={styles.flexItemsCenter}>
            <div className={styles.w16h16}>
              <img
                src="https://via.placeholder.com/64"
                alt="하이라이트"
                className={styles.wFull}
              />
            </div>
            <span className={styles.textxs}>리뷰 모음</span>
          </div>
          <div className={styles.flexItemsCenter}>
            <div className={styles.w16h16}>
              <img
                src="https://via.placeholder.com/64"
                alt="하이라이트"
                className={styles.wFull}
              />
            </div>
            <span className={styles.textxs}>영화제</span>
          </div>
        </div>
      </div>

      {/* 탭 메뉴 */}
      <div className={styles.tabMenu}>
        <button
          className={activeTab === "posts" ? styles.activeTab : ""}
          onClick={() => setActiveTab("posts")}
        >
          <FaTh className={styles.mr1} /> 게시물
        </button>
        <button
          className={activeTab === "reviews" ? styles.activeTab : ""}
          onClick={() => setActiveTab("reviews")}
        >
          <FaPencilAlt className={styles.mr1} /> 리뷰
        </button>
        <button
          className={activeTab === "likes" ? styles.activeTab : ""}
          onClick={() => setActiveTab("likes")}
        >
          <FaHeart className={styles.mr1} /> 좋아요
        </button>
        <button
          className={activeTab === "scraps" ? styles.activeTab : ""}
          onClick={() => setActiveTab("scraps")}
        >
          <FaBookmark className={styles.mr1} /> 스크랩
        </button>
      </div>

      {/* 탭 콘텐츠 */}
      <div className={styles.tabContainer}>
        {activeTab === "posts" && renderPostsTab()}
        {activeTab === "reviews" && renderReviewsTab()}
        {activeTab === "likes" && renderLikesTab()}
        {activeTab === "scraps" && renderTabContent()}
      </div>
    </div>
  );
};

export default ProfilePage;
