import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationContext";
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
} from "react-icons/fa";
import { Link, useNavigate, useLocation } from "react-router-dom";
import InfiniteScroll from "react-infinite-scroll-component";
import { backendApi } from "../api/backendApi";
import { toast } from "react-toastify";
import type { Post, Comment, UserItem } from "../api/backendApi";
import { formatDate } from "../utils/dateUtils";

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

const CommunityPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoggedIn, user } = useAuth();
  const { addNotification } = useNotifications();
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

  // URL 쿼리 파라미터 확인하여 특정 게시글 표시
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const postId = params.get("post");

    if (postId) {
      const id = parseInt(postId, 10);
      if (!isNaN(id)) {
        setExpandedPostId(id);
      }
    }
  }, [location]);

  // 게시글 데이터 가져오기
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
    if (!mentionedUsers.some((user) => user.id === selectedUser.id)) {
      setMentionedUsers([...mentionedUsers, selectedUser]);
    }

    if (textareaRef.current) {
      const value = textareaRef.current.value;
      const cursorPos = cursorPosition;
      const textBeforeCursor = value.substring(0, cursorPos);
      const textAfterCursor = value.substring(cursorPos);

      // 마지막 '@' 위치 찾기
      const lastAtIndex = textBeforeCursor.lastIndexOf("@");

      if (lastAtIndex !== -1) {
        // '@query' 대신 '@username ' 넣기
        const newText =
          value.substring(0, lastAtIndex) +
          `@${selectedUser.username} ` +
          textAfterCursor;

        setContent(newText);

        setShowMentionList(false);

        // 포커스 및 커서 위치 설정
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.focus();
            const newCursorPos = lastAtIndex + selectedUser.username.length + 2; // '@username ' 길이
            textareaRef.current.selectionStart = newCursorPos;
            textareaRef.current.selectionEnd = newCursorPos;
            setCursorPosition(newCursorPos);
          }
        }, 0);
      }
    }
  };

  // 알림 생성 함수
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

  // 게시글 삭제 처리
  const handleDeletePost = async (postId: number) => {
    if (!window.confirm("게시글을 삭제하시겠습니까?")) {
      return;
    }

    try {
      await backendApi.deletePost(postId);
      // 성공 후 UI에서 제거
      setPosts(posts.filter((post) => post.id !== postId));
      setVisiblePosts(visiblePosts.filter((post) => post.id !== postId));
      toast.success("게시글이 삭제되었습니다.");
    } catch (error) {
      console.error("게시글 삭제 실패:", error);
      toast.error("게시글 삭제에 실패했습니다.");
    }
  };

  // 댓글 삭제 처리
  const handleDeleteComment = async (postId: number, commentId: number) => {
    if (!window.confirm("댓글을 삭제하시겠습니까?")) {
      return;
    }

    try {
      await backendApi.deleteComment(commentId);

      // 성공 후 UI 업데이트
      const updatedPosts = posts.map((post) => {
        if (post.id === postId) {
          return {
            ...post,
            comments: post.comments.filter(
              (comment) => comment.id !== commentId
            ),
            commentCount: Math.max(0, post.commentCount - 1),
          };
        }
        return post;
      });

      setPosts(updatedPosts);
      setVisiblePosts(updatedPosts);
      toast.success("댓글이 삭제되었습니다.");
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

        // 멘션된 사용자에게 알림 생성
        if (mentionedUsers.length > 0) {
          createNotification(mentionedUsers, completePost.id);
        }

        // 새 게시글을 목록 최상단에 추가
        setPosts((prevPosts) => [completePost, ...prevPosts]);
        setVisiblePosts((prevPosts) => [completePost, ...prevPosts]);

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

  const handleCommentSubmit = async (postId: number) => {
    if (!isLoggedIn) {
      navigate("/login", { state: { from: location } });
      return;
    }

    if (!newComment.trim()) {
      toast.error("댓글 내용을 입력해주세요.");
      return;
    }

    try {
      const response = await backendApi.createComment(postId, newComment);
      console.log("새 댓글 응답:", response);
      console.log("댓글 날짜 형식:", response.createdAt);

      // Post 타입에 맞게 업데이트
      setPosts((prevPosts) =>
        prevPosts.map((post) =>
          post.id === postId
            ? {
                ...post,
                comments: [...(post.comments || []), response],
                commentCount: post.commentCount + 1,
              }
            : post
        )
      );
      setNewComment("");
      toast.success("댓글이 등록되었습니다.");
    } catch (error) {
      console.error("댓글 작성 실패:", error);
      toast.error("댓글 작성에 실패했습니다.");
    }
  };

  // 멘션된 사용자 표시 형식으로 텍스트 변환
  const formatContentWithMentions = (text: string) => {
    // '@username' 패턴을 찾아 강조 표시
    return text.replace(
      /@(\w+)/g,
      '<span class="text-blue-500 font-medium">@$1</span>'
    );
  };

  // 검색 처리
  const handleSearch = async (query: string, category: string) => {
    try {
      setLoading(true);
      const response = await backendApi.searchPosts(query, category);
      setSearchResults(response.content);
      setShowSearch(true);
    } catch (error) {
      console.error("검색 실패:", error);
      toast.error("검색에 실패했습니다.");
    } finally {
      setLoading(false);
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

  // 댓글 토글
  const toggleComments = (postId: number) => {
    setExpandedPostId(expandedPostId === postId ? null : postId);
  };

  // 테스트용 알림 생성 버튼 핸들러
  const handleCreateTestNotification = () => {
    addNotification({
      type: "mention",
      postId: 1,
      createdAt: new Date(),
      read: false,
      fromUser: {
        id: 2,
        username: "테스트사용자",
        profileImageUrl: null,
      },
    });
    alert("테스트 알림이 생성되었습니다. 알림 아이콘을 확인해보세요.");
  };

  // 좋아요 처리
  const handlePostLike = async (postId: number) => {
    if (!isLoggedIn) {
      toast.error("좋아요를 누르려면 로그인이 필요합니다.");
      return;
    }

    try {
      const updatedPost = await backendApi.likePost(postId);
      // 게시글 목록 새로고침
      const postsResponse = await backendApi.getPosts(0, postsPerPage);
      setPosts(postsResponse.content);
      setVisiblePosts(postsResponse.content);
      toast.success(
        updatedPost.liked
          ? "게시글을 좋아요 했습니다."
          : "좋아요를 취소했습니다."
      );
    } catch (error: any) {
      console.error("게시글 좋아요 실패:", error);
      if (error.response?.status === 401) {
        toast.error("세션이 만료되었습니다. 다시 로그인해주세요.");
        navigate("/login", { state: { from: location } });
      } else {
        toast.error("게시글 좋아요에 실패했습니다.");
      }
    }
  };

  // 싫어요 처리
  const handlePostDislike = async (postId: number) => {
    if (!isLoggedIn) {
      toast.error("싫어요를 누르려면 로그인이 필요합니다.");
      return;
    }

    try {
      const updatedPost = await backendApi.dislikePost(postId);
      // 게시글 목록 새로고침
      const postsResponse = await backendApi.getPosts(0, postsPerPage);
      setPosts(postsResponse.content);
      setVisiblePosts(postsResponse.content);
      toast.success(
        updatedPost.disliked
          ? "게시글을 싫어요 했습니다."
          : "싫어요를 취소했습니다."
      );
    } catch (error: any) {
      console.error("게시글 싫어요 실패:", error);
      if (error.response?.status === 401) {
        toast.error("세션이 만료되었습니다. 다시 로그인해주세요.");
        navigate("/login", { state: { from: location } });
      } else {
        toast.error("게시글 싫어요에 실패했습니다.");
      }
    }
  };

  const handleCommentLike = async (commentId: number) => {
    try {
      await backendApi.likeComment(commentId);
      setPosts((prevPosts) =>
        prevPosts.map((post) => ({
          ...post,
          comments: post.comments.map((comment) =>
            comment.id === commentId
              ? { ...comment, likeCount: comment.likeCount + 1 }
              : comment
          ),
        }))
      );
    } catch (error) {
      console.error("댓글 좋아요 실패:", error);
      toast.error("댓글 좋아요에 실패했습니다.");
    }
  };

  const handleCommentDislike = async (commentId: number) => {
    try {
      await backendApi.dislikeComment(commentId);
      setPosts((prevPosts) =>
        prevPosts.map((post) => ({
          ...post,
          comments: post.comments.map((comment) =>
            comment.id === commentId
              ? { ...comment, dislikeCount: comment.dislikeCount + 1 }
              : comment
          ),
        }))
      );
    } catch (error) {
      console.error("댓글 싫어요 실패:", error);
      toast.error("댓글 싫어요에 실패했습니다.");
    }
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

  // 다음 페이지 게시글을 불러오는 함수
  const fetchMorePosts = async () => {
    if (page + 1 >= totalPages) {
      setHasMore(false);
      return;
    }

    try {
      const nextPage = page + 1;
      let response;

      if (showSearch && searchQuery) {
        // 검색 결과 더 불러오기
        response = await backendApi.searchPosts(
          searchQuery,
          searchCategory,
          nextPage,
          postsPerPage
        );
      } else {
        // 일반 게시글 더 불러오기
        response = await backendApi.getPosts(nextPage, postsPerPage);
      }

      // 기존 게시글에 새로 불러온 게시글 추가
      setVisiblePosts((prevPosts) => [...prevPosts, ...response.content]);
      setPage(nextPage);

      // 더 불러올 게시글이 없는 경우 hasMore를 false로 설정
      if (nextPage + 1 >= response.totalPages) {
        setHasMore(false);
      }
    } catch (error) {
      console.error("게시글 더 불러오기 실패:", error);
      toast.error("게시글을 더 불러오는데 실패했습니다.");
    }
  };

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
                setShowWriteForm(true);
                setShowSearch(false);
                setShowSearchModal(false);
              }}
              className="rounded-full p-2 hover:bg-gray-100"
              title="글 작성하기"
            >
              <FaPen />
            </button>
            {isLoggedIn && (
              <button
                className="rounded-full p-2 hover:bg-gray-100"
                title="테스트 알림 생성"
                onClick={handleCreateTestNotification}
              >
                테스트 알림
              </button>
            )}
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
              onSubmit={() => handleSearch(searchQuery, searchCategory)}
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
                          setSearchCategory("title");
                          setShowCategoryDropdown(false);
                        }}
                      >
                        제목
                      </div>
                      <div
                        className="px-3 py-1 hover:bg-gray-100 text-xs cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSearchCategory("content");
                          setShowCategoryDropdown(false);
                        }}
                      >
                        내용
                      </div>
                      <div
                        className="px-3 py-1 hover:bg-gray-100 text-xs cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSearchCategory("author");
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
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-md border border-gray-300 py-2 pl-20 pr-10 text-sm focus:border-blue-500 focus:outline-none"
                  autoFocus
                />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 transform text-gray-400 cursor-pointer"
                >
                  <FaSearch />
                </button>
              </div>
            </form>

            <div className="flex space-x-2">
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
                <textarea
                  ref={textareaRef}
                  placeholder="내용은 450자까지 입력 가능합니다. @를 입력하여 다른 사용자를 언급하세요."
                  className="h-32 w-full rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:outline-none"
                  value={content}
                  onChange={handleContentChange}
                  onClick={(e) =>
                    setCursorPosition(
                      (e.target as HTMLTextAreaElement).selectionStart
                    )
                  }
                  onKeyUp={(e) =>
                    setCursorPosition(
                      (e.target as HTMLTextAreaElement).selectionStart
                    )
                  }
                  maxLength={450}
                  required
                ></textarea>

                {/* 멘션 목록 */}
                {showMentionList && (
                  <div className="absolute left-0 z-10 mt-1 w-64 rounded-md bg-white shadow-lg">
                    <ul className="max-h-40 overflow-y-auto">
                      {mentionUsers.length === 0 ? (
                        <li className="px-4 py-2 text-sm text-gray-500">
                          일치하는 사용자가 없습니다.
                        </li>
                      ) : (
                        mentionUsers.map((user) => (
                          <li
                            key={user.id}
                            className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                            onClick={() => handleSelectMention(user)}
                          >
                            <div className="flex items-center">
                              <div className="h-6 w-6 rounded-full bg-gray-200 mr-2">
                                {user.profileImageUrl ? (
                                  <img
                                    src={user.profileImageUrl}
                                    alt={user.username}
                                    className="h-full w-full rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center">
                                    <FaUser
                                      className="text-gray-500"
                                      size={10}
                                    />
                                  </div>
                                )}
                              </div>
                              <span>{user.username}</span>
                            </div>
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                )}

                {/* 언급된 사용자 목록 */}
                {mentionedUsers.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-500 mb-1">언급된 사용자:</p>
                    <div className="flex flex-wrap gap-1">
                      {mentionedUsers.map((user) => (
                        <span
                          key={user.id}
                          className="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700"
                        >
                          @{user.username}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
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
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin h-8 w-8 border-4 border-gray-900 border-t-transparent rounded-full"></div>
        </div>
      ) : showSearch ? (
        searchResults.length > 0 ? (
          <InfiniteScroll
            dataLength={visiblePosts.length}
            next={fetchMorePosts}
            hasMore={hasMore}
            loader={
              <div className="flex justify-center py-4">
                <div className="animate-spin h-8 w-8 border-4 border-gray-900 border-t-transparent rounded-full"></div>
              </div>
            }
            endMessage={
              <p className="text-center text-gray-500 py-4">
                모든 게시글을 불러왔습니다.
              </p>
            }
            scrollThreshold={0.9}
          >
            <div className="space-y-6">
              {visiblePosts.map((post) => (
                <div
                  key={post.id}
                  className="border border-gray-200 rounded-lg bg-white p-4 shadow-sm"
                >
                  {/* 게시글 본문 */}
                  <div className="flex">
                    {/* 사용자 프로필 영역 */}
                    <div className="mr-4 flex flex-col items-center">
                      <Link
                        to={`/profile/${post.user.id}`}
                        className="flex flex-col items-center"
                      >
                        <div className="h-12 w-12 overflow-hidden rounded-full bg-gray-300 cursor-pointer">
                          {post.user.profileImageUrl ? (
                            <img
                              src={post.user.profileImageUrl}
                              alt={`${post.user.username}의 프로필`}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-gray-300">
                              <FaUser className="text-gray-600" />
                            </div>
                          )}
                        </div>
                        <p className="mt-1 text-center text-xs text-gray-700 hover:text-blue-500">
                          {post.user.username}
                        </p>
                      </Link>
                      <p className="flex items-center text-xs text-gray-500">
                        <FaComment className="mr-1" size={10} />
                        {post.user.reviewCount}
                      </p>
                    </div>

                    {/* 게시글 내용 영역 */}
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="text-lg font-semibold">{post.title}</h3>
                        {isLoggedIn && user?.id === post.user.id && (
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
                        )}
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
                        <span>{formatDate(post.createdAt)}</span>
                        <div className="flex items-center space-x-3">
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
                              {post.likeCount || 0}
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
                              {post.dislikeCount || 0}
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
                            <Link
                              to={`/profile/${comment.user.id}`}
                              className="mr-2"
                            >
                              <div className="h-8 w-8 overflow-hidden rounded-full bg-gray-200 cursor-pointer">
                                {comment.user.profileImageUrl ? (
                                  <img
                                    src={comment.user.profileImageUrl}
                                    alt={comment.user.username}
                                    className="h-8 w-8 rounded-full"
                                  />
                                ) : (
                                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200">
                                    <FaUser
                                      className="text-gray-500"
                                      size={12}
                                    />
                                  </div>
                                )}
                              </div>
                            </Link>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-gray-900">
                                  {comment.user.username}
                                </span>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-gray-500">
                                    {formatDate(comment.createdAt)}
                                  </span>
                                  {isLoggedIn &&
                                    user?.id === comment.user.id && (
                                      <button
                                        onClick={() =>
                                          handleDeleteComment(
                                            post.id,
                                            comment.id
                                          )
                                        }
                                        className="text-gray-500 hover:text-red-500"
                                        title="댓글 삭제"
                                      >
                                        <FaTrash size={12} />
                                      </button>
                                    )}
                                </div>
                              </div>
                              <p className="text-sm mt-1">{comment.content}</p>
                              <div className="mt-2 flex items-center space-x-4">
                                <button
                                  onClick={() => handleCommentLike(comment.id)}
                                  className={`flex items-center text-sm ${
                                    comment.likeCount > 0
                                      ? "text-blue-600"
                                      : "text-gray-500"
                                  }`}
                                >
                                  <FaThumbsUp className="mr-1" />
                                  {comment.likeCount}
                                </button>
                                <button
                                  onClick={() =>
                                    handleCommentDislike(comment.id)
                                  }
                                  className={`flex items-center text-sm ${
                                    comment.dislikeCount > 0
                                      ? "text-red-600"
                                      : "text-gray-500"
                                  }`}
                                >
                                  <FaThumbsDown className="mr-1" />
                                  {comment.dislikeCount}
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
                                src={user.profileImageUrl}
                                alt="내 프로필"
                                className="h-full w-full object-cover"
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
                              placeholder="댓글을 입력하세요..."
                              className="flex-1 rounded-l-md border border-gray-300 px-3 py-1 text-sm focus:border-blue-500 focus:outline-none"
                              value={newComment}
                              onChange={(e) => setNewComment(e.target.value)}
                            />
                            <button
                              className="rounded-r-md bg-gray-800 px-3 py-1 text-sm text-white"
                              onClick={() => handleCommentSubmit(post.id)}
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
                    </div>
                  )}
                </div>
              ))}
            </div>
          </InfiniteScroll>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">검색 결과가 없습니다.</p>
          </div>
        )
      ) : (
        <InfiniteScroll
          dataLength={visiblePosts.length}
          next={fetchMorePosts}
          hasMore={hasMore}
          loader={
            <div className="flex justify-center py-4">
              <div className="animate-spin h-8 w-8 border-4 border-gray-900 border-t-transparent rounded-full"></div>
            </div>
          }
          endMessage={
            <p className="text-center text-gray-500 py-4">
              모든 게시글을 불러왔습니다.
            </p>
          }
          scrollThreshold={0.9}
        >
          <div className="space-y-6">
            {visiblePosts.map((post) => (
              <div
                key={post.id}
                className="border border-gray-200 rounded-lg bg-white p-4 shadow-sm"
              >
                {/* 게시글 본문 */}
                <div className="flex">
                  {/* 사용자 프로필 영역 */}
                  <div className="mr-4 flex flex-col items-center">
                    <Link
                      to={`/profile/${post.user.id}`}
                      className="flex flex-col items-center"
                    >
                      <div className="h-12 w-12 overflow-hidden rounded-full bg-gray-300 cursor-pointer">
                        {post.user.profileImageUrl ? (
                          <img
                            src={post.user.profileImageUrl}
                            alt={`${post.user.username}의 프로필`}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-gray-300">
                            <FaUser className="text-gray-600" />
                          </div>
                        )}
                      </div>
                      <p className="mt-1 text-center text-xs text-gray-700 hover:text-blue-500">
                        {post.user.username}
                      </p>
                    </Link>
                    <p className="flex items-center text-xs text-gray-500">
                      <FaComment className="mr-1" size={10} />
                      {post.user.reviewCount}
                    </p>
                  </div>

                  {/* 게시글 내용 영역 */}
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-lg font-semibold">{post.title}</h3>
                      {isLoggedIn && user?.id === post.user.id && (
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
                      )}
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
                      <span>{formatDate(post.createdAt)}</span>
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-1">
                          <button
                            className={`p-1 rounded-md ${post.liked ? "text-blue-600" : "text-gray-400 hover:text-blue-600"}`}
                            onClick={() => handlePostLike(post.id)}
                            disabled={!isLoggedIn}
                            title={isLoggedIn ? "좋아요" : "로그인 필요"}
                          >
                            <FaThumbsUp size={14} />
                          </button>
                          <span className="text-sm">{post.likeCount || 0}</span>
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
                            {post.dislikeCount || 0}
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
                          <Link
                            to={`/profile/${comment.user.id}`}
                            className="mr-2"
                          >
                            <div className="h-8 w-8 overflow-hidden rounded-full bg-gray-200 cursor-pointer">
                              {comment.user.profileImageUrl ? (
                                <img
                                  src={comment.user.profileImageUrl}
                                  alt={comment.user.username}
                                  className="h-8 w-8 rounded-full"
                                />
                              ) : (
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200">
                                  <FaUser className="text-gray-500" size={12} />
                                </div>
                              )}
                            </div>
                          </Link>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-gray-900">
                                {comment.user.username}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-500">
                                  {formatDate(comment.createdAt)}
                                </span>
                                {isLoggedIn && user?.id === comment.user.id && (
                                  <button
                                    onClick={() =>
                                      handleDeleteComment(post.id, comment.id)
                                    }
                                    className="text-gray-500 hover:text-red-500"
                                    title="댓글 삭제"
                                  >
                                    <FaTrash size={12} />
                                  </button>
                                )}
                              </div>
                            </div>
                            <p className="text-sm mt-1">{comment.content}</p>
                            <div className="mt-2 flex items-center space-x-4">
                              <button
                                onClick={() => handleCommentLike(comment.id)}
                                className={`flex items-center text-sm ${
                                  comment.likeCount > 0
                                    ? "text-blue-600"
                                    : "text-gray-500"
                                }`}
                              >
                                <FaThumbsUp className="mr-1" />
                                {comment.likeCount}
                              </button>
                              <button
                                onClick={() => handleCommentDislike(comment.id)}
                                className={`flex items-center text-sm ${
                                  comment.dislikeCount > 0
                                    ? "text-red-600"
                                    : "text-gray-500"
                                }`}
                              >
                                <FaThumbsDown className="mr-1" />
                                {comment.dislikeCount}
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
                              src={user.profileImageUrl}
                              alt="내 프로필"
                              className="h-full w-full object-cover"
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
                            placeholder="댓글을 입력하세요..."
                            className="flex-1 rounded-l-md border border-gray-300 px-3 py-1 text-sm focus:border-blue-500 focus:outline-none"
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                          />
                          <button
                            className="rounded-r-md bg-gray-800 px-3 py-1 text-sm text-white"
                            onClick={() => handleCommentSubmit(post.id)}
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
    </div>
  );
};

export default CommunityPage;
