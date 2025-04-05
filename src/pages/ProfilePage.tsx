import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
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
  FaEdit,
  FaTrash,
  FaThumbsUp,
  FaThumbsDown,
} from "react-icons/fa";
import {
  getUserProfile,
  getUserActivity,
  getFollowRecommendations,
  uploadProfileImage,
  updateUserProfile,
  getUserScraps,
  getMyFollowers,
  getMyFollowing,
  toggleFollow,
} from "../api/userApi";
import { UserProfile, UserActivity } from "../types/user";
import ContentCard from "../components/ContentCard";
import FollowModal from "../components/FollowModal";
import InfiniteScroll from "react-infinite-scroll-component";
import { formatDate } from "../utils/dateUtils";
import { backendApi, Post, MovieReview } from "../api/backendApi";
import { toast } from "react-hot-toast";

// 프로필 페이지 컴포넌트
const ProfilePage: React.FC = () => {
  const { user, isLoggedIn, updateUserInfo } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [posts, setPosts] = useState<Post[]>([]);
  const [reviews, setReviews] = useState<MovieReview[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [showWriteForm, setShowWriteForm] = useState(false);
  const [editingPostId, setEditingPostId] = useState<number | null>(null);

  // 각 섹션 데이터 상태
  const [profileData, setProfileData] = useState<UserProfile | null>(null);
  const [activityData, setActivityData] = useState<UserActivity | null>(null);
  const [followRecommendations, setFollowRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [uploadingImage, setUploadingImage] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("posts");
  const [scrappedMovies, setScrappedMovies] = useState<any[]>([]);

  // 모달 상태
  const [showFollowersModal, setShowFollowersModal] = useState<boolean>(false);
  const [showFollowingModal, setShowFollowingModal] = useState<boolean>(false);
  const [followersData, setFollowersData] = useState<any[]>([]);
  const [followingData, setFollowingData] = useState<any[]>([]);

  // 상태 추가
  const [scrapLoading, setScrapLoading] = useState(false);
  const [scrapError, setScrapError] = useState(false);

  // 현재 경로 디버깅을 위한 로그 - 이전 경로 비교 추가
  const [prevPathname, setPrevPathname] = useState(location.pathname);

  useEffect(() => {
    // 경로가 실제로 변경된 경우에만 로그 출력
    if (prevPathname !== location.pathname) {
      console.log("Current pathname changed:", location.pathname);
      console.log("Current location key:", location.key);
      setPrevPathname(location.pathname);
    }
  }, [location, prevPathname]);

  useEffect(() => {
    // 사용자 데이터 로드
    const fetchUserData = async () => {
      try {
        setLoading(true);
        console.log("프로필 페이지에서 사용자 데이터 로드 시작");

        // 병렬로 여러 API 요청 처리
        const [profile, activity, recommendations, scraps] = await Promise.all([
          getUserProfile(),
          getUserActivity(),
          getFollowRecommendations(),
          getUserScraps(),
        ]);

        console.log("프로필 데이터:", profile);
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

  // 팔로워 모달을 위한 데이터 로딩
  const loadFollowers = async () => {
    try {
      console.log("나의 팔로워 목록 로드 시작");
      const followers = await getMyFollowers();
      console.log("팔로워 목록:", followers);
      setFollowersData(followers);
      setShowFollowersModal(true);
    } catch (error) {
      console.error("팔로워 목록 로드 실패:", error);
    }
  };

  // 팔로잉 모달을 위한 데이터 로딩
  const loadFollowing = async () => {
    try {
      console.log("나의 팔로잉 목록 로드 시작");
      const following = await getMyFollowing();
      console.log("팔로잉 목록:", following);
      setFollowingData(following);
      setShowFollowingModal(true);
    } catch (error) {
      console.error("팔로잉 목록 로드 실패:", error);
    }
  };

  // 모달 내에서 팔로우 상태 변경 시 처리
  const handleModalToggleFollow = async (
    userId: number,
    newStatus: boolean
  ) => {
    try {
      console.log(`모달 내 사용자 ${userId} 팔로우 상태 변경: ${newStatus}`);

      // API 호출
      const result = await toggleFollow(userId.toString());
      console.log("팔로우 토글 API 응답:", result);

      if (!result) {
        throw new Error("팔로우 상태 변경 실패");
      }

      // 팔로워 목록 업데이트
      setFollowersData((prevData) =>
        prevData.map((user) => {
          if (user.id === userId) {
            return {
              ...user,
              isFollowing: result.isFollowing,
              mutualFollow: result.isFollowing && user.followsMe,
            };
          }
          return user;
        })
      );

      // 팔로잉 목록 업데이트
      setFollowingData((prevData) =>
        prevData.map((user) => {
          if (user.id === userId) {
            return {
              ...user,
              isFollowing: result.isFollowing,
              mutualFollow: result.isFollowing && user.followsMe,
            };
          }
          return user;
        })
      );

      // 프로필 데이터 업데이트
      if (profileData) {
        setProfileData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            followerCount: result.followerCount || prev.followerCount,
            followingCount: result.followingCount || prev.followingCount,
          };
        });
      }
    } catch (error) {
      console.error("모달 내 팔로우 상태 업데이트 실패:", error);
    }
  };

  // 팔로워/팔로우 숫자 업데이트
  const updateFollowCounts = async (isFollowing: boolean, userId: number) => {
    try {
      // API 호출
      const result = await toggleFollow(userId.toString());

      if (!result) {
        throw new Error("팔로우 상태 변경 실패");
      }

      // 프로필 데이터 업데이트
      if (profileData) {
        setProfileData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            followerCount: result.followerCount || prev.followerCount,
            followingCount: result.followingCount || prev.followingCount,
          };
        });
      }
    } catch (error) {
      console.error("팔로우 카운트 업데이트 실패:", error);
    }
  };

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

        console.log("프로필 이미지 업로드 시작");
        // 이미지 업로드 API 호출
        const result = await uploadProfileImage(file);
        console.log("이미지 업로드 결과:", result);

        // 프로필 정보 업데이트 API 호출
        await updateUserProfile({ profileImageUrl: result.profileImageUrl });

        // AuthContext를 통해 사용자 정보 업데이트
        updateUserInfo({ profileImageUrl: result.profileImageUrl });

        // 로컬 스토리지의 캐시된 프로필 데이터 업데이트
        try {
          const cachedProfileDataStr = localStorage.getItem(
            "cached_profile_data"
          );
          if (cachedProfileDataStr) {
            const cachedProfileData = JSON.parse(cachedProfileDataStr);
            const updatedCachedProfile = {
              ...cachedProfileData,
              profileImageUrl: result.profileImageUrl,
            };
            localStorage.setItem(
              "cached_profile_data",
              JSON.stringify(updatedCachedProfile)
            );
            console.log("캐시된 프로필 데이터 업데이트 완료");
          }
        } catch (cacheError) {
          console.error("캐시된 프로필 데이터 업데이트 실패:", cacheError);
        }

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

  // 게시물 로딩
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        if (!user) return;
        setIsLoading(true);
        const response = await backendApi.getUserPosts(user.id, page);

        // 페이지가 0일 때는 기존 게시물을 초기화하고, 그 외에는 추가
        if (page === 0) {
          setPosts(response.content);
        } else {
          setPosts((prev) => [...prev, ...response.content]);
        }

        setHasMore(page < response.totalPages - 1);
      } catch (error) {
        console.error("게시물 로딩 실패:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPosts();
  }, [user, page]);

  // 게시물 수정 처리
  const handleEditPost = (post: Post) => {
    setEditingPostId(post.id);
    setTitle(post.title);
    setContent(post.content);
    setShowWriteForm(true);
  };

  // 게시물 수정 폼 제출
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !content.trim()) {
      toast.error("제목과 내용을 모두 입력해주세요.");
      return;
    }

    try {
      if (editingPostId) {
        const updatedPost = await backendApi.updatePost(editingPostId, {
          title: title,
          content: content,
        });

        // 게시물 목록 업데이트
        setPosts(
          posts.map((post) =>
            post.id === editingPostId
              ? {
                  ...post,
                  title: updatedPost.title,
                  content: updatedPost.content,
                }
              : post
          )
        );

        toast.success("게시글이 수정되었습니다.");
        setShowWriteForm(false);
        setEditingPostId(null);
        setTitle("");
        setContent("");
      }
    } catch (error) {
      console.error("게시글 수정 실패:", error);
      toast.error("게시글 수정에 실패했습니다.");
    }
  };

  // 리뷰 데이터 로드
  const fetchReviews = async (page: number) => {
    if (!user) return;
    try {
      setLoading(true);

      console.log(`사용자 ${user.username}의 리뷰 데이터 로드 시작`);

      // 영화 리뷰와 TV 쇼 리뷰를 병렬로 가져옴
      const [movieReviewsResponse, tvReviewsResponse] = await Promise.all([
        backendApi.getUserReviews(user.username, page),
        backendApi.getUserTvReviews(user.username, page),
      ]);

      console.log(
        `영화 리뷰 ${movieReviewsResponse.content.length}개, TV 쇼 리뷰 ${tvReviewsResponse.content.length}개 로드 완료`
      );

      // 두 결과를 합침
      const allReviews = [
        ...movieReviewsResponse.content,
        ...tvReviewsResponse.content,
      ];

      // 날짜 기준으로 정렬 (최신순)
      const sortedReviews = allReviews.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setReviews(sortedReviews);

      // 총 페이지 수는 두 API 중 더 큰 값을 사용
      const maxTotalPages = Math.max(
        movieReviewsResponse.totalPages || 0,
        tvReviewsResponse.totalPages || 0
      );
      setTotalPages(maxTotalPages);
    } catch (error) {
      console.error("리뷰 로딩 실패:", error);
      toast.error("리뷰를 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 스크랩 데이터 로드 함수 추가
  const loadScraps = useCallback(async () => {
    try {
      console.log("스크랩 데이터 로드 시작");
      setScrapLoading(true);
      setScrapError(false);

      // 타임아웃 설정
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error("스크랩 데이터 로드 타임아웃")),
          5000
        );
      });

      // 실제 API 호출
      const dataPromise = getUserScraps();

      // 경쟁 상태로 둘 중 먼저 완료되는 것 처리
      const scraps = await Promise.race([dataPromise, timeoutPromise]);

      console.log("스크랩 데이터 로드 완료:", scraps);
      setScrappedMovies(scraps);
    } catch (error) {
      console.error("스크랩 데이터 로드 실패:", error);
      setScrapError(true);
    } finally {
      setScrapLoading(false);
    }
  }, []);

  // 탭 변경 처리 수정
  useEffect(() => {
    console.log("활성화된 탭 변경:", activeTab);

    if (activeTab === "reviews" && user) {
      fetchReviews(0);
    } else if (activeTab === "scraps") {
      console.log("스크랩 탭 활성화됨");
      loadScraps();
    }
  }, [activeTab, user, loadScraps]);

  const handleLoadMore = () => {
    if (activeTab === "posts") {
      setPage((prev) => prev + 1);
    } else if (activeTab === "reviews" && page < totalPages - 1) {
      setPage((prev) => prev + 1);
      fetchReviews(page + 1);
    }
  };

  // 게시물 탭 렌더링
  const renderPostsTab = () => {
    const loadMore = () => {
      setPage((prev) => prev + 1);
    };

    if (isLoading && posts.length === 0) {
      return (
        <div className="flex justify-center py-8">
          <div className="animate-spin h-8 w-8 border-4 border-gray-900 border-t-transparent rounded-full"></div>
        </div>
      );
    }

    if (posts.length === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-500">작성한 게시물이 없습니다.</p>
        </div>
      );
    }

    return (
      <>
        {showWriteForm && (
          <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">게시글 수정</h2>
              <button
                onClick={() => {
                  setShowWriteForm(false);
                  setTitle("");
                  setContent("");
                  setEditingPostId(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                닫기
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="제목을 입력하세요."
                  className="w-full rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:outline-none"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              <div className="mb-4">
                <textarea
                  placeholder="내용을 입력하세요."
                  className="w-full rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:outline-none"
                  rows={5}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  required
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                >
                  수정하기
                </button>
              </div>
            </form>
          </div>
        )}

        <InfiniteScroll
          dataLength={posts.length}
          next={loadMore}
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
          <div className="space-y-6">
            {posts.map((post) => (
              <div
                key={post.id}
                className="border border-gray-200 rounded-lg bg-white p-4 shadow-sm"
              >
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg font-semibold">{post.title}</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditPost(post)}
                      className="text-gray-600 hover:text-blue-600"
                      title="수정"
                    >
                      <FaEdit />
                    </button>
                    <button
                      onClick={() => handleDeletePost(post.id)}
                      className="text-gray-600 hover:text-red-600"
                      title="삭제"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
                <p className="mt-2 text-gray-700">{post.content}</p>
                <div className="mt-3 flex justify-between items-center text-xs text-gray-500">
                  <span>{formatDate(post.createdAt)}</span>
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-1">
                      <FaThumbsUp
                        className={
                          post.liked ? "text-blue-600" : "text-gray-400"
                        }
                      />
                      <span>{post.likeCount}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <FaThumbsDown
                        className={
                          post.disliked ? "text-red-600" : "text-gray-400"
                        }
                      />
                      <span>{post.dislikeCount}</span>
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
        </InfiniteScroll>
      </>
    );
  };

  // 리뷰 탭 렌더링
  const renderReviewsTab = () => {
    if (loading) {
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
                      {review.contentType === "tv" ? "TV 쇼" : "영화"}
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

  // 스크랩 탭 렌더링
  const renderScrapsTab = () => {
    console.log("스크랩 탭 렌더링:", { scrapLoading, scrappedMovies });

    if (scrapLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-8">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600">스크랩 목록을 불러오는 중입니다...</p>
        </div>
      );
    }

    if (scrapError) {
      return (
        <div className="text-center py-8 text-gray-500">
          <p className="mb-2">
            스크랩 데이터를 불러오는 중 오류가 발생했습니다.
          </p>
          <button
            onClick={loadScraps}
            className="text-blue-500 hover:underline"
          >
            다시 시도
          </button>
        </div>
      );
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
          <ContentCard key={movie.id} content={movie} className="w-full" />
        ))}
      </div>
    );
  };

  // 좋아요 탭 렌더링
  const renderLikesTab = () => {
    if (loading) {
      return <div className="text-center py-8">로딩 중...</div>;
    }

    if (!reviews || reviews.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          좋아요한 리뷰가 없습니다.
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
                      {review.contentType === "tv" ? "TV 쇼" : "영화"}
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

  // 게시물 삭제 처리
  const handleDeletePost = async (postId: number) => {
    if (!window.confirm("게시물을 삭제하시겠습니까?")) {
      return;
    }

    try {
      await backendApi.deletePost(postId);
      // 게시물 목록에서 삭제된 게시물 제거
      setPosts(posts.filter((post: Post) => post.id !== postId));
      toast.success("게시물이 삭제되었습니다.");
    } catch (error) {
      console.error("게시물 삭제 실패:", error);
      toast.error("게시물 삭제에 실패했습니다.");
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

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* 프로필 헤더 섹션 - 인스타그램 스타일 */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row items-start md:items-center">
          {/* 프로필 이미지 */}
          <div className="relative mb-4 md:mb-0 md:mr-10 flex-shrink-0">
            <div
              className="h-28 w-28 md:h-36 md:w-36 rounded-full overflow-hidden bg-gray-200 cursor-pointer group border border-gray-300"
              onClick={handleProfileImageClick}
            >
              {user?.profileImageUrl ? (
                <img
                  src={user.profileImageUrl}
                  alt="프로필 이미지"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center bg-gray-100">
                  <FaUser className="text-gray-400 text-4xl" />
                </div>
              )}
              <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <FaCamera className="text-white text-xl" />
              </div>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageChange}
              accept="image/*"
              className="hidden"
              disabled={uploadingImage}
            />
            {uploadingImage && (
              <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-70 rounded-full">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>

          {/* 프로필 정보 */}
          <div className="flex-grow">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-xl md:text-2xl font-medium">
                {user?.username || "사용자"}
              </h1>
              <div className="flex space-x-2">
                <Link
                  to="/profile/edit"
                  className="text-sm px-3 py-1 border border-gray-300 rounded font-medium hover:bg-gray-50"
                >
                  프로필 편집
                </Link>
                <button className="p-2 text-gray-500">
                  <FaEllipsisH />
                </button>
              </div>
            </div>

            {/* 통계 (팔로워, 팔로잉 등) */}
            <div className="flex space-x-6 mb-4">
              <div className="text-center md:text-left">
                <span className="font-semibold">
                  {profileData?.watchedMoviesCount || 0}
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
                {user?.bio || "영화와 리뷰를 공유하는 공간"}
              </p>
              <p className="text-sm text-gray-500 mt-1">{user?.email}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 탭 메뉴 */}
      <div className="border-t border-gray-200">
        <div className="flex justify-center">
          <button
            className={`px-6 py-3 flex items-center ${activeTab === "posts" ? "border-t border-black text-black" : "text-gray-500"}`}
            onClick={() => setActiveTab("posts")}
          >
            <FaTh className="mr-1" /> 게시물
          </button>
          <button
            className={`px-6 py-3 flex items-center ${activeTab === "reviews" ? "border-t border-black text-black" : "text-gray-500"}`}
            onClick={() => setActiveTab("reviews")}
          >
            <FaPencilAlt className="mr-1" /> 리뷰
          </button>
          <button
            className={`px-6 py-3 flex items-center ${activeTab === "likes" ? "border-t border-black text-black" : "text-gray-500"}`}
            onClick={() => setActiveTab("likes")}
          >
            <FaHeart className="mr-1" /> 좋아요
          </button>
          <button
            className={`px-6 py-3 flex items-center ${activeTab === "scraps" ? "border-t border-black text-black" : "text-gray-500"}`}
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

export default ProfilePage;
