import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import {
  FaUser,
  FaComment,
  FaSearch,
  FaPen,
  FaReply,
  FaCaretDown,
  FaTimes,
  FaThumbsUp,
  FaThumbsDown,
  FaArrowUp,
  FaEdit,
  FaTrash,
  FaAt,
  FaBell,
  FaExclamationTriangle,
} from "react-icons/fa";
import { Link, useNavigate, useLocation } from "react-router-dom";
import InfiniteScroll from "react-infinite-scroll-component";
import { backendApi, BASE_URL } from "../api/backendApi";
import { toast } from "react-toastify";
import type {
  Post,
  Comment,
  UserItem,
  Page as ApiPage,
} from "../api/backendApi";
import { formatDate } from "../utils/dateUtils";
import { MentionsInput, Mention, SuggestionDataItem } from "react-mentions";
import { searchUsers as apiSearchUsers, UserResponse } from "../api/backendApi";
import defaultAvatar from "../assets/default-profile.png";

// 알림 데이터 타입 정의
interface Notification {
  id: number;
  type: "mention" | "comment";
  postId: number;
  createdAt: Date;
  read: boolean;
  fromUser: {
    id: number;
    username: string;
    profileImageUrl: string | null;
  };
}

interface UserMentionData extends SuggestionDataItem {
  id: string;
  display: string;
}

const CommunityPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoggedIn, user, isUserBlocked, isAdminOrModerator } = useAuth();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWriteForm, setShowWriteForm] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Post[]>([]);
  const [expandedPostId, setExpandedPostId] = useState<number | null>(null);
  const [commentContent, setCommentContent] = useState("");
  const [searchCategory, setSearchCategory] = useState<
    "title" | "content" | "author"
  >("title");
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  // 멘션 관련 상태
  const [showMentionList, setShowMentionList] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionUsers, setMentionUsers] = useState<UserItem[]>([]);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [mentionedUsers, setMentionedUsers] = useState<UserItem[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 알림 데이터 (실제로는 API에서 가져와야 함)
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // 무한 스크롤 관련 상태 추가
  const [visiblePosts, setVisiblePosts] = useState<Post[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const postsPerPage = 5; // 한 번에 보여줄 게시글 수
  const [totalPages, setTotalPages] = useState(0);

  // 최상단으로 이동 버튼의 표시 여부 상태
  const [showScrollTop, setShowScrollTop] = useState(false);

  const [mentions, setMentions] = useState<UserItem[]>([]);
  const [newComment, setNewComment] = useState("");

  // 게시글 수정 상태 추가
  const [editingPostId, setEditingPostId] = useState<number | null>(null);

  // 신고 관련 상태 추가
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportContent, setReportContent] = useState("");
  const [reportTargetId, setReportTargetId] = useState<number | null>(null);
  const [reportTargetType, setReportTargetType] = useState<
    "comment" | "post" | null
  >(null);

  const postTextAreaRef = useRef<HTMLTextAreaElement>(null);

  // 검색 결과 페이지네이션 상태 추가
  const [searchPage, setSearchPage] = useState(0);
  const [searchTotalPages, setSearchTotalPages] = useState(0);
  const [searchHasMore, setSearchHasMore] = useState(true);

  // 재렌더링을 위한 상태 추가
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // 검색 처리 함수 정의 복원
  const handleSearch = useCallback(
    async (query: string, category: string, newSearch = true) => {
      console.log(
        "handleSearch triggered with:",
        query,
        category,
        "newSearch:",
        newSearch
      ); // Add logging
      try {
        setLoading(true);
        console.log("Setting loading to true");
        const targetPage = newSearch ? 0 : searchPage + 1;
        const response = await backendApi.searchPosts(
          query,
          category,
          targetPage,
          postsPerPage
        );
        console.log("Search API response received:", response); // Log entire response

        if (response && response.content) {
          // Check if response and content exist
          console.log("Response content:", response.content);
          if (newSearch) {
            setSearchResults(response.content);
            setSearchPage(0);
            console.log("Set searchResults (new):", response.content);
          } else {
            setSearchResults((prevResults) => [
              ...prevResults,
              ...response.content,
            ]);
            setSearchPage(targetPage);
            console.log("Appended searchResults:", response.content);
          }

          setSearchTotalPages(response.totalPages);
          setSearchHasMore(response.totalPages > targetPage + 1);
          setShowSearch(true); // Ensure this is set *after* results are updated
          console.log(
            "Set showSearch to true, searchPage:",
            targetPage,
            "searchTotalPages:",
            response.totalPages,
            "searchHasMore:",
            response.totalPages > targetPage + 1
          );
        } else {
          console.error("Search API response is invalid or content is missing");
          // Handle invalid response
          setSearchResults([]);
          setSearchPage(0);
          setSearchTotalPages(0);
          setSearchHasMore(false);
          setShowSearch(true); // Still show search mode, but indicate no results
          toast.error("검색 결과를 가져오는데 문제가 발생했습니다.");
        }
      } catch (error) {
        console.error("검색 실패:", error);
        toast.error("검색에 실패했습니다.");
        // Reset search state on error
        setSearchResults([]);
        setSearchPage(0);
        setSearchTotalPages(0);
        setSearchHasMore(false);
        setShowSearch(false);
      } finally {
        setLoading(false);
        console.log("Setting loading to false");
      }
    },
    [searchPage, postsPerPage]
  ); // searchPage, postsPerPage 의존성 추가

  // MentionsInput의 onChange 핸들러 타입 수정
  const handleMentionsInputChange = (
    event: { target: { value: string } },
    newValue: string, // The new value of the input, including markup
    newPlainTextValue: string, // The new value without markup
    mentions: any[] // Information about the mentions detected
  ) => {
    setContent(newValue); // 마크업 포함된 값 저장
    console.log("MentionsInput changed:", {
      newValue,
      newPlainTextValue,
      mentions,
    });
    // 필요 시 커서 위치 로직 추가 (MentionsInput에서는 더 복잡할 수 있음)
  };

  // fetchUsers 함수 정의 복원
  const fetchUsers = useCallback(
    async (query: string, callback: (data: UserMentionData[]) => void) => {
      if (!query) {
        callback([]);
        return;
      }
      try {
        const response: ApiPage<UserResponse> = await apiSearchUsers(query);
        if (response && response.content) {
          const users: UserMentionData[] = response.content.map(
            (user: UserResponse) => ({
              id: user.username, // 멘션용 id로 username 사용
              display: user.username,
            })
          );
          callback(users);
        } else {
          callback([]);
        }
      } catch (fetchError) {
        console.error("Error fetching users for mention:", fetchError);
        callback([]);
      }
    },
    [] // apiSearchUsers가 안정적이라면 의존성 필요 없음
  );

  // URL 쿼리 파라미터 확인 useEffect 복원 (handleSearch 의존성 포함)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const postId = params.get("post");
    const searchParam = params.get("search");

    if (postId) {
      const id = parseInt(postId, 10);
      if (!isNaN(id)) {
        setExpandedPostId(id);
      }
    }

    if (searchParam) {
      setSearchQuery(searchParam);
      setSearchCategory("title");
      handleSearch(searchParam, "title"); // newSearch=true 기본값 사용
    }
  }, [location, handleSearch]); // handleSearch 의존성 유지

  // 게시글 데이터 가져오기 useEffect (변경 없음)
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
        const response = await backendApi.getPosts(0, postsPerPage);
        console.log("게시글 및 댓글 날짜 형식 확인:", {
          게시글작성일: response.content[0]?.createdAt,
          댓글작성일:
            response.content[0]?.comments &&
            response.content[0].comments.length > 0
              ? response.content[0].comments[0].createdAt
              : "댓글 없음",
        });
        setPosts(response.content as any);
        setVisiblePosts(response.content as any);
        setTotalPages(response.totalPages);
        setHasMore(response.totalPages > 1);
        setLoading(false);
      } catch (error) {
        console.error("게시글 로딩 실패:", error);
        toast.error("게시글을 불러오는데 실패했습니다.");
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  // 여기서 백엔드 API 응답에서 날짜 객체 프로퍼티 이름 확인
  useEffect(() => {
    const checkPostProperties = async () => {
      try {
        // 게시글 데이터 가져오기
        const response = await backendApi.getPosts(0, 5);
        if (response.content && response.content.length > 0) {
          const firstPost = response.content[0] as any;

          // 객체의 모든 프로퍼티 확인
          console.log("게시글 객체 프로퍼티 목록:", Object.keys(firstPost));

          // 실제 날짜 데이터 확인
          const dateValue =
            firstPost.createdAt || firstPost.created_at || firstPost.createdat;
          console.log("감지된 날짜 필드 값:", dateValue);

          // 댓글 체크
          if (firstPost.comments && firstPost.comments.length > 0) {
            const firstComment = firstPost.comments[0] as any;
            console.log("댓글 객체 프로퍼티 목록:", Object.keys(firstComment));
            const commentDateValue =
              firstComment.createdAt ||
              firstComment.created_at ||
              firstComment.createdat;
            console.log("감지된 댓글 날짜 필드 값:", commentDateValue);
          }
        }
      } catch (error) {
        console.error("게시글 프로퍼티 확인 중 오류:", error);
      }
    };

    checkPostProperties();
  }, []);

  // 강제 새로고침을 위한 useEffect 추가
  useEffect(() => {
    if (refreshTrigger > 0) {
      // 현재 페이지 데이터를 다시 로드
      const refreshData = async () => {
        try {
          const response = await backendApi.getPosts(page, postsPerPage);
          console.log("새로고침 데이터:", response);

          if (response && response.content) {
            // 검색 모드가 아닐 때만 업데이트
            if (!showSearch) {
              setPosts(response.content);
              setVisiblePosts(response.content);
            }
          }
        } catch (error) {
          console.error("데이터 새로고침 실패:", error);
        }
      };

      refreshData();
    }
  }, [refreshTrigger, page, postsPerPage, showSearch]);

  // 사용자 검색 API 호출 함수
  const searchUsers = async (query: string): Promise<UserItem[]> => {
    if (query.length < 2) return [];

    try {
      // 실제 API를 연결할 때는 아래 주석을 해제하고 목업 데이터를 제거해주세요
      // const response = await backendApi.searchUsers(query);
      // return response.data;

      // 임시 목업 데이터 (API 연결 전까지만 사용)
      const mockUsers: UserItem[] = [
        { id: 1, username: "user1", profileImageUrl: null },
        { id: 2, username: "moviefan", profileImageUrl: null },
        { id: 3, username: "cinephile", profileImageUrl: null },
        { id: 4, username: "director", profileImageUrl: null },
        { id: 5, username: "filmcritic", profileImageUrl: null },
        { id: 6, username: "actor", profileImageUrl: null },
        { id: 7, username: "영화덕후", profileImageUrl: null },
        { id: 8, username: "무비팬", profileImageUrl: null },
        { id: 9, username: "영화관탐험가", profileImageUrl: null },
      ];

      return mockUsers.filter((user) =>
        user.username.toLowerCase().includes(query.toLowerCase())
      );
    } catch (error) {
      console.error("사용자 검색 실패:", error);
      return [];
    }
  };

  const filterMentionList = async (query: string) => {
    // 여기서 실제 API를 호출할 수 있습니다
    if (query) {
      const users = await searchUsers(query);
      setMentionUsers(users);
      return users;
    }
    return [];
  };

  // 텍스트 에어리어 변경 핸들러
  const handleContentChange = async (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    const value = e.target.value;
    setContent(value);

    const cursorPos = e.target.selectionStart;
    setCursorPosition(cursorPos);

    // @ 문자 감지
    const textBeforeCursor = value.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");

    if (lastAtIndex !== -1) {
      const lastSpaceIndex = textBeforeCursor
        .substring(lastAtIndex)
        .indexOf(" ");
      // 현재 입력 중인 @userName이 공백으로 끝나지 않았는지 확인
      const isTypingMention =
        lastSpaceIndex === -1 || lastSpaceIndex === textBeforeCursor.length - 1;

      if (isTypingMention) {
        // @ 다음의 문자열 추출
        const query = textBeforeCursor.substring(lastAtIndex + 1);

        if (query && !query.includes(" ")) {
          console.log("멘션 쿼리:", query);
          setMentionQuery(query);
          const users = await filterMentionList(query);
          setShowMentionList(users.length > 0);
          return;
        }
      }
    }

    setShowMentionList(false);
  };

  // 멘션 선택 핸들러
  const handleSelectMention = (selectedUser: UserItem) => {
    setMentions([]);
    setNewComment((prev: string) => prev + `@${selectedUser.username} `);
  };

  // 알림 생성 함수
  /*
  const createNotification = (users: UserItem[], postId: number) => {
    // 실제로는 API 호출로 알림 생성
    users.forEach((mentionedUser) => {
      addNotification({
        type: "mention",
        postId,
        createdAt: new Date(),
        read: false,
        fromUser: {
          id: user?.id || 0,
          username: user?.username || "익명",
          profileImageUrl: user?.profileImageUrl || null,
        },
      });
    });
  };
  */

  // 알림 클릭 핸들러
  const handleNotificationClick = (notification: Notification) => {
    // 알림 읽음 처리
    const updatedNotifications = notifications.map((item) =>
      item.id === notification.id ? { ...item, read: true } : item
    );
    setNotifications(updatedNotifications);

    // 해당 포스트로 이동 및 자동 펼치기
    setExpandedPostId(notification.postId);

    // 스크롤 이동 (선택적)
    const postElement = document.getElementById(`post-${notification.postId}`);
    if (postElement) {
      postElement.scrollIntoView({ behavior: "smooth" });
    }
  };

  // 게시글 수정 처리
  const handleEditPost = (post: Post) => {
    setEditingPostId(post.id);
    setTitle(post.title);
    setContent(post.content);
    setShowWriteForm(true);
    setMentionedUsers(post.mentions || []);
  };

  // Admin 또는 Moderator인지 확인하는 함수
  const isAdmin = () => {
    return isAdminOrModerator();
  };

  // 게시글 삭제 함수
  const handleDeletePost = async (postId: number) => {
    if (!isLoggedIn) {
      toast.error("로그인이 필요합니다.");
      return;
    }

    // 권한 확인: 자신의 게시글이거나 관리자/모더레이터 권한이 있는 경우
    const post = posts.find((p) => p.id === postId);
    if (!post) {
      toast.error("게시글을 찾을 수 없습니다.");
      return;
    }

    const isAuthor = user?.id === post.user.id;
    if (!isAuthor && !isAdmin()) {
      toast.error("삭제 권한이 없습니다.");
      return;
    }

    if (!window.confirm("정말 삭제하시겠습니까?")) {
      return;
    }

    try {
      await backendApi.deletePost(postId);
      toast.success("게시글이 삭제되었습니다.");

      // 현재 보고 있는 게시글 목록에서 삭제된 게시글 제거
      setPosts(posts.filter((p) => p.id !== postId));
      setVisiblePosts(visiblePosts.filter((p) => p.id !== postId));

      // 재렌더링 트리거
      setRefreshTrigger((prev) => prev + 1);
    } catch (error) {
      console.error("게시글 삭제 실패:", error);
      toast.error("게시글 삭제에 실패했습니다.");
    }
  };

  // 댓글 삭제 함수
  const handleDeleteComment = async (postId: number, commentId: number) => {
    if (!isLoggedIn) {
      toast.error("로그인이 필요합니다.");
      return;
    }

    // 삭제할 댓글이 포함된 게시물 찾기
    const post = posts.find((p) => p.id === postId);
    if (!post || !post.comments) {
      toast.error("게시글 또는 댓글을 찾을 수 없습니다.");
      return;
    }

    // 삭제할 댓글 찾기
    const comment = post.comments.find((c) => c.id === commentId);
    if (!comment) {
      toast.error("댓글을 찾을 수 없습니다.");
      return;
    }

    // 권한 확인: 자신의 댓글이거나 관리자/모더레이터 권한이 있는 경우
    const isCommentAuthor = user?.id === comment.user.id;
    if (!isCommentAuthor && !isAdmin()) {
      toast.error("삭제 권한이 없습니다.");
      return;
    }

    try {
      await backendApi.deleteComment(commentId);
      toast.success("댓글이 삭제되었습니다.");

      // UI 업데이트 - 삭제된 댓글 제거
      setPosts(
        posts.map((p) => {
          if (p.id === postId) {
            return {
              ...p,
              comments: p.comments.filter((c) => c.id !== commentId),
            };
          }
          return p;
        })
      );

      // visiblePosts도 함께 업데이트 추가
      setVisiblePosts(
        visiblePosts.map((p) => {
          if (p.id === postId) {
            return {
              ...p,
              comments: p.comments.filter((c) => c.id !== commentId),
            };
          }
          return p;
        })
      );

      // 재렌더링 트리거
      setRefreshTrigger((prev) => prev + 1);
    } catch (error) {
      console.error("댓글 삭제 실패:", error);
      toast.error("댓글 삭제에 실패했습니다.");
    }
  };

  // 기존 handleSubmit 함수 수정 (게시글 수정 기능 추가)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isLoggedIn) {
      navigate("/login", { state: { from: location } });
      return;
    }

    if (!title.trim() || !content.trim()) {
      toast.error("제목과 내용을 모두 입력해주세요.");
      return;
    }

    try {
      // 수정 모드인 경우
      if (editingPostId) {
        const updatedPost = await backendApi.updatePost(editingPostId, {
          title: title,
          content: content,
        });

        // 게시글 목록 업데이트
        const updatedPosts = posts.map((post) =>
          post.id === editingPostId
            ? {
                ...post,
                title: updatedPost.title,
                content: updatedPost.content,
                // mentions 속성이 있을 경우만 설정
                ...(post.mentions && { mentions: post.mentions }),
              }
            : post
        );

        setPosts(updatedPosts);
        setVisiblePosts(updatedPosts);

        // 재렌더링 트리거
        setRefreshTrigger((prev) => prev + 1);

        toast.success("게시글이 수정되었습니다.");
      } else {
        // 새 게시글 작성 모드
        const newPost = await backendApi.createPost({
          title: title,
          content: content,
        });

        // Post 타입에 맞게 필드 추가
        const completePost: Post = {
          ...newPost,
          comments: [],
          likeCount: 0,
          dislikeCount: 0,
          commentCount: 0,
          liked: false,
          disliked: false,
        };

        // 새 게시글을 목록 최상단에 추가
        setPosts((prevPosts) => [completePost, ...prevPosts]);
        setVisiblePosts((prevPosts) => [completePost, ...prevPosts]);

        // 재렌더링 트리거
        setRefreshTrigger((prev) => prev + 1);

        toast.success("게시글이 등록되었습니다.");
      }

      // 폼 초기화 및 닫기
      resetForm();
      setShowWriteForm(false);
      setEditingPostId(null);
    } catch (error) {
      console.error("게시글 처리 실패:", error);
      toast.error(
        editingPostId
          ? "게시글 수정에 실패했습니다."
          : "게시글 등록에 실패했습니다."
      );
    }
  };

  const resetForm = () => {
    setTitle("");
    setContent("");
    setMentionedUsers([]);
    setEditingPostId(null);
  };

  const handleMentionSearch = async (query: string): Promise<void> => {
    try {
      const response = await backendApi.searchUsers(query);
      setMentions(response);
    } catch (error) {
      console.error("사용자 검색 실패:", error);
      toast.error("사용자 검색에 실패했습니다.");
    }
  };

  const handleMentionSelect = (user: UserItem) => {
    setMentions([]);
    setNewComment((prev: string) => prev + `@${user.username} `);
  };

  // 멘션된 사용자 표시 형식으로 텍스트 변환
  const formatContentWithMentions = (text: string) => {
    // '@username' 패턴을 찾아 강조 표시
    return text.replace(
      /@(\w+)/g,
      '<span class="text-blue-600 font-medium">@$1</span>'
    );
  };

  // 댓글 작성 처리
  const handleCommentSubmit = async (postId: number) => {
    if (!isLoggedIn) {
      navigate("/login", { state: { from: location } });
      return;
    }

    if (!newComment.trim()) {
      toast.error("댓글 내용을 입력해주세요.");
      return;
    }

    // 차단된 사용자인 경우 댓글 작성 불가
    if (isUserBlocked()) {
      toast.error("현재 댓글 기능이 제한되었습니다. 관리자에게 문의해주세요.");
      return;
    }

    try {
      const response = await backendApi.createComment(postId, newComment);
      console.log("새 댓글 응답:", response);
      console.log("댓글 날짜 형식:", response.createdAt);

      // createdAt 필드 확인 및 보정
      if (!response.createdAt || response.createdAt === "") {
        console.warn(
          "createdAt 필드가 비어있습니다. 현재 시간으로 대체합니다."
        );
        response.createdAt = new Date().toISOString();
      }

      // 명시적으로 날짜가 있는 새 댓글 객체 생성
      const newCommentWithDate = {
        ...response,
        createdAt: response.createdAt || new Date().toISOString(),
      };

      // 성공적으로 댓글을 추가한 후 현재 게시글 목록을 업데이트
      setPosts((prevPosts) =>
        prevPosts.map((post) =>
          post.id === postId
            ? { ...post, comments: [...post.comments, newCommentWithDate] }
            : post
        )
      );

      // visiblePosts도 함께 업데이트 추가
      setVisiblePosts((prevPosts) =>
        prevPosts.map((post) =>
          post.id === postId
            ? { ...post, comments: [...post.comments, newCommentWithDate] }
            : post
        )
      );

      // 재렌더링 트리거
      setRefreshTrigger((prev) => prev + 1);

      setNewComment("");
      toast.success("댓글이 등록되었습니다.");
    } catch (error) {
      console.error("댓글 작성 실패:", error);
      toast.error("댓글 작성에 실패했습니다.");
    }
  };

  // 댓글 토글
  const toggleComments = async (postId: number) => {
    if (expandedPostId === postId) {
      setExpandedPostId(null);
      return;
    }

    try {
      const comments = await backendApi.getComments(postId);
      console.log(`게시글 ID ${postId}의 댓글 목록:`, comments);

      // 댓글 데이터 검증 및 가공
      const processedComments = comments.map((comment) => ({
        ...comment,
        likeCount: parseInt(String(comment.likeCount || "0"), 10),
        dislikeCount: parseInt(String(comment.dislikeCount || "0"), 10),
        liked: !!comment.liked,
        disliked: !!comment.disliked,
      }));

      console.log(`가공된 댓글 데이터:`, processedComments);

      // 게시글 목록에서 해당 게시글의 댓글 목록 업데이트
      setPosts((prevPosts) =>
        prevPosts.map((post) =>
          post.id === postId ? { ...post, comments: processedComments } : post
        )
      );
      setVisiblePosts((prevPosts) =>
        prevPosts.map((post) =>
          post.id === postId ? { ...post, comments: processedComments } : post
        )
      );
      setExpandedPostId(postId);
    } catch (error) {
      console.error(`게시글 ID ${postId}의 댓글 목록 가져오기 실패:`, error);
      toast.error("댓글 목록을 불러오는데 실패했습니다.");
    }
  };

  // 게시글 좋아요 처리
  const handlePostLike = async (postId: number) => {
    if (!isLoggedIn) {
      navigate("/login", { state: { from: location } });
      return;
    }

    try {
      const foundPost = posts.find((p) => p.id === postId);
      console.log(`게시글 ID ${postId} 좋아요 요청 전 UI 상태:`, {
        likeCount: foundPost?.likeCount,
        dislikeCount: foundPost?.dislikeCount,
        liked: foundPost?.liked,
        disliked: foundPost?.disliked,
      });

      const updatedPost = await backendApi.likePost(postId);
      console.log("좋아요 API 응답 데이터:", updatedPost);
      console.log(
        "API 응답의 좋아요 수:",
        updatedPost.likeCount,
        typeof updatedPost.likeCount
      );
      console.log(
        "API 응답의 싫어요 수:",
        updatedPost.dislikeCount,
        typeof updatedPost.dislikeCount
      );
      console.log(
        "API 응답의 좋아요 상태:",
        updatedPost.liked,
        typeof updatedPost.liked
      );
      console.log(
        "API 응답의 싫어요 상태:",
        updatedPost.disliked,
        typeof updatedPost.disliked
      );

      // 게시글 목록 업데이트
      setPosts((prevPosts) =>
        prevPosts.map((post) => {
          if (post.id === postId) {
            const updatedPostData = {
              ...post,
              likeCount: updatedPost.likeCount,
              dislikeCount: updatedPost.dislikeCount,
              liked: updatedPost.liked,
              disliked: updatedPost.disliked,
            };
            console.log("업데이트된 게시글 데이터:", updatedPostData);
            return updatedPostData;
          }
          return post;
        })
      );

      setVisiblePosts((prevPosts) =>
        prevPosts.map((post) => {
          if (post.id === postId) {
            const updatedPostData = {
              ...post,
              likeCount: updatedPost.likeCount,
              dislikeCount: updatedPost.dislikeCount,
              liked: updatedPost.liked,
              disliked: updatedPost.disliked,
            };
            console.log("업데이트된 visible 게시글 데이터:", updatedPostData);
            return updatedPostData;
          }
          return post;
        })
      );

      // 업데이트 후 상태 확인을 위한 setTimeout 추가
      setTimeout(() => {
        const updatedFoundPost = posts.find((p) => p.id === postId);
        console.log(`게시글 ID ${postId} 좋아요 처리 후 UI 상태:`, {
          likeCount: updatedFoundPost?.likeCount,
          dislikeCount: updatedFoundPost?.dislikeCount,
          liked: updatedFoundPost?.liked,
          disliked: updatedFoundPost?.disliked,
        });
      }, 0);

      toast.success(
        updatedPost.liked
          ? "게시글을 좋아요 했습니다."
          : "좋아요를 취소했습니다."
      );
    } catch (error) {
      console.error("게시글 좋아요 실패:", error);
      toast.error("게시글 좋아요에 실패했습니다.");
    }
  };

  // 게시글 싫어요 처리
  const handlePostDislike = async (postId: number) => {
    if (!isLoggedIn) {
      navigate("/login", { state: { from: location } });
      return;
    }

    try {
      const foundPost = posts.find((p) => p.id === postId);
      console.log(`게시글 ID ${postId} 싫어요 요청 전 UI 상태:`, {
        likeCount: foundPost?.likeCount,
        dislikeCount: foundPost?.dislikeCount,
        liked: foundPost?.liked,
        disliked: foundPost?.disliked,
      });

      const updatedPost = await backendApi.dislikePost(postId);
      console.log("싫어요 API 응답 데이터:", updatedPost);
      console.log(
        "API 응답의 좋아요 수:",
        updatedPost.likeCount,
        typeof updatedPost.likeCount
      );
      console.log(
        "API 응답의 싫어요 수:",
        updatedPost.dislikeCount,
        typeof updatedPost.dislikeCount
      );
      console.log(
        "API 응답의 좋아요 상태:",
        updatedPost.liked,
        typeof updatedPost.liked
      );
      console.log(
        "API 응답의 싫어요 상태:",
        updatedPost.disliked,
        typeof updatedPost.disliked
      );

      // 게시글 목록 업데이트
      setPosts((prevPosts) =>
        prevPosts.map((post) => {
          if (post.id === postId) {
            const updatedPostData = {
              ...post,
              likeCount: updatedPost.likeCount,
              dislikeCount: updatedPost.dislikeCount,
              liked: updatedPost.liked,
              disliked: updatedPost.disliked,
            };
            console.log("업데이트된 게시글 데이터:", updatedPostData);
            return updatedPostData;
          }
          return post;
        })
      );

      setVisiblePosts((prevPosts) =>
        prevPosts.map((post) => {
          if (post.id === postId) {
            const updatedPostData = {
              ...post,
              likeCount: updatedPost.likeCount,
              dislikeCount: updatedPost.dislikeCount,
              liked: updatedPost.liked,
              disliked: updatedPost.disliked,
            };
            console.log("업데이트된 visible 게시글 데이터:", updatedPostData);
            return updatedPostData;
          }
          return post;
        })
      );

      // 업데이트 후 상태 확인을 위한 setTimeout 추가
      setTimeout(() => {
        const updatedFoundPost = posts.find((p) => p.id === postId);
        console.log(`게시글 ID ${postId} 싫어요 처리 후 UI 상태:`, {
          likeCount: updatedFoundPost?.likeCount,
          dislikeCount: updatedFoundPost?.dislikeCount,
          liked: updatedFoundPost?.liked,
          disliked: updatedFoundPost?.disliked,
        });
      }, 0);

      toast.success(
        updatedPost.disliked
          ? "게시글을 싫어요 했습니다."
          : "싫어요를 취소했습니다."
      );
    } catch (error) {
      console.error("게시글 싫어요 실패:", error);
      toast.error("게시글 싫어요에 실패했습니다.");
    }
  };

  // 검색 카테고리를 표시하는 텍스트 반환
  const getCategoryText = () => {
    switch (searchCategory) {
      case "title":
        return "제목";
      case "content":
        return "내용";
      case "author":
        return "작성자";
      default:
        return "제목";
    }
  };

  // 검색 초기화
  const resetSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setSearchCategory("title");
    setShowSearch(false);
    setShowSearchModal(false);
  };

  // 스크롤 이벤트 핸들러
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const showScrollButton = scrollY > 300; // 스크롤이 300px 이상 내려갔을 때 버튼 표시
      setShowScrollTop(showScrollButton);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // 최상단으로 스크롤하는 함수
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // 다음 페이지 게시글을 불러오는 함수 수정
  const fetchMorePosts = async () => {
    const currentPage = showSearch ? searchPage : page;
    const currentTotalPages = showSearch ? searchTotalPages : totalPages;

    if (currentPage + 1 >= currentTotalPages) {
      if (showSearch) setSearchHasMore(false);
      else setHasMore(false);
      return;
    }

    const nextPage = currentPage + 1;

    try {
      let response;
      if (showSearch && searchQuery) {
        response = await backendApi.searchPosts(
          searchQuery,
          searchCategory,
          nextPage,
          postsPerPage
        );
        setSearchResults((prevResults) => [
          ...prevResults,
          ...response.content,
        ]);
        setSearchPage(nextPage);
        setSearchHasMore(response.totalPages > nextPage + 1);
      } else {
        response = await backendApi.getPosts(nextPage, postsPerPage);
        if (response.content) {
          setVisiblePosts((prevPosts) => [
            ...prevPosts,
            ...(response.content as Post[]),
          ]);
        }
        setPage(nextPage);
        setHasMore(response.totalPages > nextPage + 1);
      }
    } catch (error) {
      console.error("게시글 더 불러오기 실패:", error);
      toast.error("게시글을 더 불러오는데 실패했습니다.");
    }
  };

  const handleCommentLike = async (commentId: number) => {
    if (!isLoggedIn) {
      toast.error("로그인이 필요합니다.");
      return;
    }

    try {
      const response = await backendApi.likeComment(commentId);
      console.log("댓글 좋아요 응답:", response);
      console.log(
        "응답의 좋아요 수:",
        response.likeCount,
        typeof response.likeCount
      );
      console.log(
        "응답의 싫어요 수:",
        response.dislikeCount,
        typeof response.dislikeCount
      );
      console.log("응답의 좋아요 상태:", response.liked, typeof response.liked);
      console.log(
        "응답의 싫어요 상태:",
        response.disliked,
        typeof response.disliked
      );

      // 현재 게시글의 댓글 목록 업데이트
      const updatedPosts = posts.map((post) => {
        if (post.id === expandedPostId) {
          const updatedComments = post.comments.map((comment) => {
            if (comment.id === commentId) {
              const updatedComment = {
                ...comment,
                likeCount: parseInt(String(response.likeCount || "0"), 10),
                dislikeCount: parseInt(
                  String(response.dislikeCount || "0"),
                  10
                ),
                liked: !!response.liked,
                disliked: !!response.disliked,
              };
              console.log("업데이트된 댓글 데이터:", updatedComment);
              return updatedComment;
            }
            return comment;
          });

          return { ...post, comments: updatedComments };
        }
        return post;
      });

      setPosts(updatedPosts);
      // 현재 보이는 게시글 목록도 업데이트
      setVisiblePosts(
        visiblePosts.map((post) =>
          post.id === expandedPostId
            ? updatedPosts.find((p) => p.id === expandedPostId) || post
            : post
        )
      );

      toast.success(
        response.liked
          ? "댓글에 좋아요를 표시했습니다."
          : "댓글에 좋아요를 취소했습니다."
      );
    } catch (error) {
      console.error("댓글 좋아요 처리 실패:", error);
      toast.error("좋아요 처리에 실패했습니다.");
    }
  };

  const handleCommentDislike = async (commentId: number) => {
    if (!isLoggedIn) {
      toast.error("로그인이 필요합니다.");
      return;
    }

    try {
      const response = await backendApi.dislikeComment(commentId);
      console.log("댓글 싫어요 응답:", response);
      console.log(
        "응답의 좋아요 수:",
        response.likeCount,
        typeof response.likeCount
      );
      console.log(
        "응답의 싫어요 수:",
        response.dislikeCount,
        typeof response.dislikeCount
      );

      // 현재 게시글의 댓글 목록 업데이트
      const updatedPosts = posts.map((post) => {
        if (post.id === expandedPostId) {
          const updatedComments = post.comments.map((comment) => {
            if (comment.id === commentId) {
              const updatedComment = {
                ...comment,
                likeCount: parseInt(String(response.likeCount || "0"), 10),
                dislikeCount: parseInt(
                  String(response.dislikeCount || "0"),
                  10
                ),
                liked: !!response.liked,
                disliked: !!response.disliked,
              };
              console.log("업데이트된 댓글 데이터:", updatedComment);
              return updatedComment;
            }
            return comment;
          });

          return { ...post, comments: updatedComments };
        }
        return post;
      });

      setPosts(updatedPosts);
      // 현재 보이는 게시글 목록도 업데이트
      setVisiblePosts(
        visiblePosts.map((post) =>
          post.id === expandedPostId
            ? updatedPosts.find((p) => p.id === expandedPostId) || post
            : post
        )
      );

      toast.success(
        response.disliked
          ? "댓글에 싫어요를 표시했습니다."
          : "싫어요를 취소했습니다."
      );
    } catch (error) {
      console.error("댓글 싫어요 처리 실패:", error);
      toast.error("싫어요 처리에 실패했습니다.");
    }
  };

  // 신고 관련 함수 추가
  const openReportModal = (targetId: number, type: "comment" | "post") => {
    setReportTargetId(targetId);
    setReportTargetType(type);
    setReportContent("");
    setShowReportModal(true);
  };

  const handleReportSubmit = async () => {
    if (!reportContent.trim()) {
      toast.error("신고 내용을 입력해주세요.");
      return;
    }

    if (!reportTargetId || !reportTargetType) {
      toast.error("신고 대상 정보가 잘못되었습니다.");
      return;
    }

    try {
      // 현재 신고 대상이 되는 사용자 ID 찾기
      const targetUserId =
        reportTargetType === "post"
          ? posts.find((post) => post.id === reportTargetId)?.user.id
          : posts
              .find((post) =>
                post.comments.some((comment) => comment.id === reportTargetId)
              )
              ?.comments.find((comment) => comment.id === reportTargetId)?.user
              .id;

      if (!targetUserId) {
        toast.error("신고 대상의 사용자 정보를 찾을 수 없습니다.");
        return;
      }

      // 신고 API 호출
      await backendApi.createReport({
        targetId: reportTargetId,
        targetUserId: targetUserId,
        reportType: reportTargetType,
        content: reportContent,
      });

      toast.success("신고가 접수되었습니다. 검토 후 조치하겠습니다.");
      setShowReportModal(false);
    } catch (error) {
      console.error("신고 접수 실패:", error);
      toast.error("신고 접수에 실패했습니다. 다시 시도해주세요.");
    }
  };

  // 다른 상태 변경 로직 확인 필요 (예: 검색어 입력 변경, 카테고리 변경 등)
  // 예시: 검색어 상태 변경 시 로깅
  const handleSearchQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setSearchQuery(newQuery);
    console.log("Search query changed to:", newQuery);
    // 검색어가 비워지면 검색 상태를 리셋할 수 있음
    if (newQuery === "") {
      setShowSearch(false);
      setSearchResults([]);
      console.log("Search query cleared, resetting search state");
    }
  };

  // 예시: 카테고리 변경 시 로깅
  const handleCategoryChange = (category: "title" | "content" | "author") => {
    setSearchCategory(category);
    console.log("Search category changed to:", category);
    // 카테고리 변경 시 검색을 다시 실행하거나 상태를 리셋할 수 있음
    // handleSearch(searchQuery, category); // 또는
    // setShowSearch(false);
    // setSearchResults([]);
  };

  // 게시글 목록을 렌더링할 데이터 결정 (return 문 바로 위에 추가)
  const postsToRender = showSearch ? searchResults : visiblePosts;
  // 검색 결과 메시지 (return 문 바로 위에 추가)
  const searchResultMessage = showSearch
    ? searchResults.length > 0
      ? `${searchResults.length}개의 검색 결과가 있습니다.`
      : "검색 결과가 없습니다."
    : "";

  return (
    <div className="container mx-auto px-4 py-2">
      {/* 상단 검색 및 버튼 영역 - 고정 헤더로 변경 */}
      <div className="fixed top-16 right-0 left-0 z-40 bg-white bg-opacity-95 shadow-sm py-3">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">커뮤니티</h1>
          <div className="flex items-center space-x-2">
            <button
              className="rounded-full p-2 hover:bg-gray-100"
              onClick={() => {
                setShowSearchModal(true);
                setShowWriteForm(false);
              }}
              aria-label="검색"
              title="검색하기"
            >
              <FaSearch className="text-gray-600" />
            </button>
            <button
              onClick={() => {
                if (isUserBlocked()) {
                  toast.error(
                    "현재 글쓰기 기능이 제한되었습니다. 관리자에게 문의해주세요."
                  );
                  return;
                }
                setShowWriteForm(true);
                setShowSearch(false);
                setShowSearchModal(false);
              }}
              className="rounded-full p-2 hover:bg-gray-100"
              title="글 작성하기"
            >
              <FaPen />
            </button>
          </div>
        </div>
      </div>

      {/* 헤더 아래 여백 */}
      <div className="h-16"></div>

      {/* 검색 모달 */}
      {showSearchModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="relative w-full max-w-md bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">검색</h2>
              <button
                onClick={() => setShowSearchModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <FaTimes />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                // 이벤트 객체(e)를 받도록 수정
                e.preventDefault(); // 기본 폼 제출(새로고침) 방지
                handleSearch(searchQuery, searchCategory); // 검색 실행
                setShowSearchModal(false); // 모달 닫기
              }}
              className="mb-4"
            >
              <div className="relative">
                <div
                  className="absolute left-3 top-1/2 -translate-y-1/2 transform bg-gray-100 rounded-md px-2 py-1 text-xs flex items-center cursor-pointer border-r border-gray-300"
                  onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                >
                  <span>{getCategoryText()}</span>
                  <FaCaretDown className="ml-1 text-gray-500" size={10} />

                  {showCategoryDropdown && (
                    <div className="absolute left-0 top-6 bg-white border border-gray-200 rounded-md shadow-md z-20">
                      <div
                        className="px-3 py-1 hover:bg-gray-100 text-xs cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCategoryChange("title"); // 핸들러 연결
                          setShowCategoryDropdown(false);
                        }}
                      >
                        제목
                      </div>
                      <div
                        className="px-3 py-1 hover:bg-gray-100 text-xs cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCategoryChange("content"); // 핸들러 연결
                          setShowCategoryDropdown(false);
                        }}
                      >
                        내용
                      </div>
                      <div
                        className="px-3 py-1 hover:bg-gray-100 text-xs cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCategoryChange("author"); // 핸들러 연결
                          setShowCategoryDropdown(false);
                        }}
                      >
                        작성자
                      </div>
                    </div>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="검색어 입력..."
                  value={searchQuery}
                  onChange={handleSearchQueryChange} // 핸들러 연결
                  className="w-full rounded-md border border-gray-300 py-2 pl-20 pr-10 text-sm focus:border-blue-500 focus:outline-none"
                  autoFocus
                />
                <button
                  type="submit" // 이 버튼이 폼 제출을 담당
                  className="absolute right-2 top-1/2 -translate-y-1/2 transform text-gray-400 cursor-pointer"
                >
                  <FaSearch />
                </button>
              </div>
            </form>

            <div className="flex space-x-2">
              {/* 이 버튼은 이제 폼 제출을 유발하지 않으므로, 클릭 시 검색 실행 및 모달 닫기만 수행 */}
              <button
                onClick={() => {
                  handleSearch(searchQuery, searchCategory);
                  setShowSearchModal(false);
                }}
                className="flex-1 rounded-md bg-gray-900 px-4 py-2 text-white hover:bg-gray-700"
              >
                검색
              </button>
              <button
                onClick={resetSearch}
                className="flex-1 rounded-md bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 게시글 작성 폼 */}
      {showWriteForm && (
        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">
              {editingPostId ? "게시글 수정" : "새 게시글 작성"}
            </h2>
            <button
              onClick={() => {
                setShowWriteForm(false);
                resetForm();
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              닫기
            </button>
          </div>

          {isLoggedIn ? (
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
              <div className="mb-4 relative">
                {/* Replace textarea with MentionsInput */}
                <MentionsInput
                  value={content}
                  onChange={handleMentionsInputChange} // 수정된 핸들러 연결
                  placeholder="내용은 450자까지 입력 가능합니다. @를 입력하여 다른 사용자를 언급하세요."
                  className="mentions-input w-full h-32 rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:outline-none"
                  a11ySuggestionsListLabel={"Suggested users for mention"}
                  maxLength={450}
                >
                  <Mention
                    trigger="@"
                    data={fetchUsers} // 복원된 함수 연결
                    displayTransform={(username: string) => `@${username}`}
                    className="mentions__mention"
                    appendSpaceOnAdd={true}
                  />
                </MentionsInput>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="rounded-md bg-gray-900 px-4 py-2 text-white hover:bg-gray-700"
                >
                  등록
                </button>
              </div>
            </form>
          ) : (
            <div className="rounded-md bg-gray-100 p-4 text-center">
              <p className="text-gray-600">
                게시글을 작성하려면 로그인이 필요합니다.
              </p>
              <Link
                to="/login"
                className="mt-2 inline-block rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              >
                로그인
              </Link>
            </div>
          )}
        </div>
      )}

      {/* 게시글 목록 - 무한 스크롤 적용 */}
      {loading && page === 0 && !showSearch ? ( // 초기 로딩 시에만 전체 스피너 표시 (검색 로딩은 다르게 처리 가능)
        <div className="flex justify-center py-8">
          <div className="animate-spin h-8 w-8 border-4 border-gray-900 border-t-transparent rounded-full"></div>
        </div>
      ) : (
        <InfiniteScroll
          dataLength={postsToRender.length}
          next={fetchMorePosts}
          hasMore={showSearch ? searchHasMore : hasMore}
          loader={
            <div className="flex justify-center py-4">
              <div className="animate-spin h-8 w-8 border-4 border-gray-900 border-t-transparent rounded-full"></div>
            </div>
          }
          endMessage={
            <p className="text-center text-gray-500 py-4">
              {postsToRender.length > 0
                ? "모든 게시글을 불러왔습니다."
                : showSearch
                  ? "검색 결과가 없습니다."
                  : "게시글이 없습니다."}
            </p>
          }
          scrollThreshold={0.9}
        >
          <div className="space-y-6">
            {postsToRender.map((post) => (
              <div
                key={post.id}
                className="border border-gray-200 rounded-lg bg-white p-4 shadow-sm"
              >
                {/* 게시글 본문 */}
                <div className="flex">
                  {/* 사용자 프로필 영역 */}
                  <div className="mr-4 flex flex-col items-center">
                    <Link
                      to={
                        post.user?.id === user?.id
                          ? "/profile"
                          : `/user-profile/${post.user?.id}`
                      }
                      className="flex-shrink-0"
                    >
                      <div className="w-10 h-10 bg-gray-200 rounded-full overflow-hidden cursor-pointer flex items-center justify-center">
                        {post.user?.profileImageUrl ? (
                          <img
                            src={`${BASE_URL}${post.user.profileImageUrl}`}
                            alt={post.user.username || "사용자"}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              if (e.currentTarget.src !== defaultAvatar) {
                                e.currentTarget.src = defaultAvatar;
                              }
                            }}
                          />
                        ) : (
                          <FaUser className="text-gray-400 text-xl" />
                        )}
                      </div>
                    </Link>
                    <div className="text-center mt-1">
                      <Link
                        to={
                          post.user?.id === user?.id
                            ? "/profile"
                            : `/user-profile/${post.user?.id}`
                        }
                        className="font-bold text-sm hover:underline"
                      >
                        {post.user?.username || "사용자"}
                      </Link>
                      <div className="text-xs text-gray-500">
                        {formatDate(post.createdAt)}
                      </div>
                    </div>
                  </div>

                  {/* 게시글 내용 영역 */}
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-lg font-semibold">{post.title}</h3>
                      <div className="flex gap-2">
                        {isLoggedIn &&
                          user?.id === post.user.id &&
                          !isUserBlocked() && (
                            <button
                              onClick={() => handleEditPost(post)}
                              className="text-gray-500 hover:text-blue-500"
                              title="수정"
                            >
                              <FaEdit />
                            </button>
                          )}
                        {isLoggedIn &&
                          ((user?.id === post.user.id && !isUserBlocked()) ||
                            isAdminOrModerator()) && (
                            <button
                              onClick={() => handleDeletePost(post.id)}
                              className="text-gray-500 hover:text-red-500"
                              title="삭제"
                            >
                              <FaTrash />
                            </button>
                          )}
                      </div>
                    </div>
                    <p
                      className="mt-2 text-gray-700"
                      dangerouslySetInnerHTML={{
                        __html: formatContentWithMentions(post.content),
                      }}
                    ></p>

                    {/* 멘션된 사용자 표시 */}
                    {post.mentions && post.mentions.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {post.mentions.map((user) => (
                          <span
                            key={user.id}
                            className="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700"
                          >
                            @{user.username}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="mt-3 flex justify-between items-center text-xs text-gray-500">
                      <span></span>
                      <div className="flex items-center space-x-3">
                        {isLoggedIn &&
                          !isUserBlocked() &&
                          user?.id !== post.user.id && (
                            <button
                              className="p-1 rounded-md text-red-500"
                              title="게시글 신고하기"
                              onClick={() => openReportModal(post.id, "post")}
                            >
                              <FaBell size={14} />
                            </button>
                          )}
                        <div className="flex items-center space-x-1">
                          <button
                            className={`p-1 rounded-md ${post.liked ? "text-blue-600" : "text-gray-400 hover:text-blue-600"}`}
                            onClick={() => handlePostLike(post.id)}
                            disabled={!isLoggedIn}
                            title={isLoggedIn ? "좋아요" : "로그인 필요"}
                          >
                            <FaThumbsUp size={14} />
                          </button>
                          <span className="text-sm">
                            {post.likeCount !== undefined ? post.likeCount : 0}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <button
                            className={`p-1 rounded-md ${post.disliked ? "text-red-600" : "text-gray-400 hover:text-red-600"}`}
                            onClick={() => handlePostDislike(post.id)}
                            disabled={!isLoggedIn}
                            title={isLoggedIn ? "싫어요" : "로그인 필요"}
                          >
                            <FaThumbsDown size={14} />
                          </button>
                          <span className="text-sm">
                            {post.dislikeCount !== undefined
                              ? post.dislikeCount
                              : 0}
                          </span>
                        </div>
                        <button
                          className="flex items-center cursor-pointer hover:text-blue-600"
                          onClick={() => toggleComments(post.id)}
                        >
                          댓글 : {post.comments?.length || 0}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 댓글 영역 */}
                {expandedPostId === post.id && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <h4 className="text-sm font-semibold mb-3">
                      댓글 {post.comments?.length || 0}개
                    </h4>

                    {/* 댓글 목록 */}
                    <div className="space-y-3 mb-4">
                      {post.comments?.map((comment) => (
                        <div key={comment.id} className="flex">
                          <div className="flex flex-col items-center mr-2">
                            <Link
                              to={`/user-profile/${comment.user.id}`}
                              className="flex-shrink-0"
                            >
                              <div className="w-8 h-8 bg-gray-200 rounded-full overflow-hidden cursor-pointer flex items-center justify-center">
                                {comment.user.profileImageUrl ? (
                                  <img
                                    src={`${BASE_URL}${comment.user.profileImageUrl}`}
                                    alt={comment.user.username}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      if (
                                        e.currentTarget.src !== defaultAvatar
                                      ) {
                                        e.currentTarget.src = defaultAvatar;
                                      }
                                    }}
                                  />
                                ) : (
                                  <FaUser className="text-gray-400 text-sm" />
                                )}
                              </div>
                            </Link>
                            <Link
                              to={`/user-profile/${comment.user.id}`}
                              className="text-xs font-medium hover:underline text-center mt-1"
                            >
                              {comment.user.username}
                            </Link>
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between items-center mb-1">
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-gray-500">
                                  {new Date(comment.createdAt).toLocaleString()}
                                </span>
                                {isLoggedIn &&
                                  !isUserBlocked() &&
                                  user?.id !== comment.user.id && (
                                    <button
                                      className="p-1 hover:bg-gray-100 rounded-full"
                                      title="댓글 신고하기"
                                      onClick={() =>
                                        openReportModal(comment.id, "comment")
                                      }
                                    >
                                      <FaBell className="text-red-500 text-xs" />
                                    </button>
                                  )}
                              </div>
                              {isLoggedIn &&
                                user?.id === comment.user.id &&
                                !isUserBlocked() && (
                                  <button
                                    onClick={() =>
                                      handleDeleteComment(post.id, comment.id)
                                    }
                                    className="text-xs text-gray-500 hover:text-red-500"
                                    title="삭제"
                                  >
                                    <FaTrash />
                                  </button>
                                )}
                            </div>
                            <div
                              className="text-sm"
                              dangerouslySetInnerHTML={{
                                __html: formatContentWithMentions(
                                  comment.content
                                ),
                              }}
                            />
                            <div className="mt-1 flex items-center space-x-4">
                              <button
                                onClick={() => handleCommentLike(comment.id)}
                                className={`flex items-center text-xs space-x-1 ${
                                  comment.liked
                                    ? "text-blue-500"
                                    : "text-gray-500"
                                }`}
                              >
                                <FaThumbsUp />
                                <span>
                                  {Number.isInteger(comment.likeCount)
                                    ? comment.likeCount
                                    : parseInt(
                                        String(comment.likeCount || "0"),
                                        10
                                      )}
                                </span>
                              </button>
                              <button
                                onClick={() => handleCommentDislike(comment.id)}
                                className={`flex items-center text-xs space-x-1 ${
                                  comment.disliked
                                    ? "text-red-500"
                                    : "text-gray-500"
                                }`}
                              >
                                <FaThumbsDown />
                                <span>
                                  {Number.isInteger(comment.dislikeCount)
                                    ? comment.dislikeCount
                                    : parseInt(
                                        String(comment.dislikeCount || "0"),
                                        10
                                      )}
                                </span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}

                      {(!post.comments || post.comments.length === 0) && (
                        <p className="text-sm text-gray-500 text-center py-2">
                          아직 댓글이 없습니다. 첫 댓글을 작성해보세요!
                        </p>
                      )}
                    </div>

                    {/* 댓글 작성 폼 */}
                    {isLoggedIn ? (
                      <div className="flex">
                        <div className="mr-2 h-8 w-8 overflow-hidden rounded-full bg-gray-200">
                          {user?.profileImageUrl ? (
                            <img
                              src={`${BASE_URL}${user.profileImageUrl}`}
                              alt="내 프로필"
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                if (e.currentTarget.src !== defaultAvatar) {
                                  e.currentTarget.src = defaultAvatar;
                                }
                              }}
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-gray-200">
                              <FaUser className="text-gray-500" size={12} />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 flex">
                          <input
                            type="text"
                            placeholder={
                              isUserBlocked()
                                ? "댓글 작성이 제한되었습니다"
                                : "댓글을 입력하세요..."
                            }
                            className="flex-1 rounded-l-md border border-gray-300 px-3 py-1 text-sm focus:border-blue-500 focus:outline-none"
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            disabled={isUserBlocked()}
                          />
                          <button
                            className={`rounded-r-md bg-gray-800 px-3 py-1 text-sm text-white ${
                              isUserBlocked()
                                ? "opacity-50 cursor-not-allowed"
                                : ""
                            }`}
                            onClick={() => handleCommentSubmit(post.id)}
                            disabled={isUserBlocked()}
                          >
                            <FaReply />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-2">
                        <p className="text-sm text-gray-500 mb-1">
                          댓글을 작성하려면 로그인이 필요합니다.
                        </p>
                        <Link
                          to="/login"
                          className="text-sm text-blue-600 hover:underline"
                        >
                          로그인하기
                        </Link>
                      </div>
                    )}

                    {isLoggedIn && isUserBlocked() && (
                      <p className="text-xs text-red-500 mt-1 text-center">
                        현재 댓글 기능이 제한되었습니다. 관리자에게
                        문의해주세요.
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </InfiniteScroll>
      )}

      {/* 최상단으로 이동하는 버튼 */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 bg-gray-800 text-white p-3 rounded-full shadow-lg hover:bg-gray-700 transition-all z-50"
          aria-label="맨 위로 이동"
        >
          <FaArrowUp />
        </button>
      )}

      {/* 신고 모달 */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="relative w-full max-w-md bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center mb-4">
              <FaExclamationTriangle className="text-red-500 mr-2" />
              <h2 className="text-xl font-bold">
                {reportTargetType === "comment" ? "댓글 신고" : "게시글 신고"}
              </h2>
              <button
                onClick={() => setShowReportModal(false)}
                className="absolute right-4 top-4 text-gray-500 hover:text-gray-700"
              >
                <FaTimes />
              </button>
            </div>

            <textarea
              value={reportContent}
              onChange={(e) => setReportContent(e.target.value)}
              placeholder="신고 내용을 자세히 입력해주세요..."
              className="w-full h-32 p-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500"
            ></textarea>

            <div className="mt-4 flex justify-end space-x-2">
              <button
                onClick={() => setShowReportModal(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                취소
              </button>
              <button
                onClick={handleReportSubmit}
                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
              >
                신고
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommunityPage;
