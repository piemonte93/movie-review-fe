import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationContext";
import { FaUser, FaComment, FaSearch, FaPen, FaReply, FaCaretDown, FaTimes, FaThumbsUp, FaThumbsDown } from "react-icons/fa";
import { Link, useNavigate, useLocation } from "react-router-dom";

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

// 사용자 데이터 타입 정의
interface UserItem {
  id: number;
  username: string;
  profileImageUrl: string | null;
}

// 댓글 데이터 타입 정의
interface Comment {
  id: number;
  content: string;
  createdAt: Date;
  likes: { userId: number }[];
  dislikes: { userId: number }[];
  user: {
    id: number;
    username: string;
    profileImageUrl: string | null;
  };
}

// 임시 데이터 타입 정의
interface Post {
  id: number;
  title: string;
  content: string;
  createdAt: Date;
  comments: Comment[];
  mentions: UserItem[];
  likes: { userId: number }[];
  dislikes: { userId: number }[];
  user: {
    id: number;
    username: string;
    profileImageUrl: string | null;
    reviewCount: number;
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
  const [searchCategory, setSearchCategory] = useState<'title' | 'content' | 'author'>('title');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  
  // 멘션 관련 상태
  const [showMentionList, setShowMentionList] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionUsers, setMentionUsers] = useState<UserItem[]>([]);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [mentionedUsers, setMentionedUsers] = useState<UserItem[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 가짜 사용자 데이터 (실제로는 API에서 가져와야 함)
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

  // 알림 데이터 (실제로는 API에서 가져와야 함)
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // URL 쿼리 파라미터 확인하여 특정 게시글 표시
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const postId = params.get('post');
    
    if (postId) {
      const id = parseInt(postId, 10);
      if (!isNaN(id)) {
        setExpandedPostId(id);
      }
    }
  }, [location]);

  // 게시글 데이터 가져오기 (임시 데이터)
  useEffect(() => {
    // API 호출을 대신하는 임시 데이터
    const mockPosts: Post[] = [
      {
        id: 1,
        title: "저번 주 일요일 CGV 반딧불이 누구나",
        content: "영화보다가 눈부셔서 뒤지는 줄 알았다. 영화보다가 눈부셔서 뒤지는 줄 알았다. 영화보다가 눈부셔서 뒤지는 줄 알았다. 영화보다가 눈부셔서 뒤지는 줄 알았다. 영화보다가 눈부셔서 뒤지는 줄 알았다. 영화보다가 눈부셔서 뒤지는 줄 알았다. 영화보다가 눈부셔서 뒤지는 줄 알았다. 영화보다가 눈부셔서 뒤지는 줄 알았다. 영화보다가 눈부셔서 뒤지는 줄 알았다. 영화보다가 눈부셔서 뒤지는 줄 알았다. 영화보다가 눈부셔서 뒤지는 줄 알았다.",
        createdAt: new Date(Date.now() - 1000 * 60 * 30), // 30분 전
        comments: [
          {
            id: 1,
            content: "정말 공감합니다. 저도 그 영화 보다가 눈부셔서 힘들었어요.",
            createdAt: new Date(Date.now() - 1000 * 60 * 20),
            likes: [{ userId: 3 }, { userId: 4 }],
            dislikes: [{ userId: 5 }],
            user: {
              id: 2,
              username: "영화덕후",
              profileImageUrl: null
            }
          },
          {
            id: 2,
            content: "저는 오히려 조명이 너무 어두워서 불편했어요.",
            createdAt: new Date(Date.now() - 1000 * 60 * 10),
            likes: [{ userId: 2 }],
            dislikes: [],
            user: {
              id: 3,
              username: "무비팬",
              profileImageUrl: null
            }
          }
        ],
        mentions: [],
        likes: [{ userId: 2 }, { userId: 4 }],
        dislikes: [{ userId: 5 }],
        user: {
          id: 1,
          username: "작성자 이름",
          profileImageUrl: null,
          reviewCount: 15
        }
      },
      {
        id: 2,
        title: "저번 주 일요일 CGV 반딧불이 누구나",
        content: "영화보다가 눈부셔서 뒤지는 줄 알았다. 영화보다가 눈부셔서 뒤지는 줄 알았다. 영화보다가 눈부셔서 뒤지는 줄 알았다. 영화보다가 눈부셔서 뒤지는 줄 알았다. 영화보다가 눈부셔서 뒤지는 줄 알았다. 영화보다가 눈부셔서 뒤지는 줄 알았다. 영화보다가 눈부셔서 뒤지는 줄 알았다. 영화보다가 눈부셔서 뒤지는 줄 알았다. 영화보다가 눈부셔서 뒤지는 줄 알았다. 영화보다가 눈부셔서 뒤지는 줄 알았다. 영화보다가 눈부셔서 뒤지는 줄 알았다. 영화보다가 눈부셔서 뒤지는 줄 알았다.",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2시간 전
        comments: [
          {
            id: 3,
            content: "CGV 반딧불이 지점은 항상 조명이 그렇더라고요.",
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 1),
            likes: [{ userId: 1 }, { userId: 2 }, { userId: 5 }],
            dislikes: [],
            user: {
              id: 4,
              username: "영화관탐험가",
              profileImageUrl: null
            }
          }
        ],
        mentions: [
          { id: 7, username: "영화덕후", profileImageUrl: null }
        ],
        likes: [{ userId: 1 }, { userId: 3 }],
        dislikes: [],
        user: {
          id: 2,
          username: "작성자 이름",
          profileImageUrl: null,
          reviewCount: 32
        }
      },
      {
        id: 3,
        title: "저번 주 일요일 CGV 반딧불이 누구나",
        content: "영화보다가 눈부셔서 뒤지는 줄 알았다. 영화보다가 눈부셔서 뒤지는 줄 알았다. 영화보다가 눈부셔서 뒤지는 줄 알았다. 영화보다가 눈부셔서 뒤지는 줄 알았다. 영화보다가 눈부셔서 뒤지는 줄 알았다. 영화보다가 눈부셔서 뒤지는 줄 알았다. 영화보다가 눈부셔서 뒤지는 줄 알았다. 영화보다가 눈부셔서 뒤지는 줄 알았다. 영화보다가 눈부셔서 뒤지는 줄 알았다. 영화보다가 눈부셔서 뒤지는 줄 알았다.",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5), // 5시간 전
        comments: [],
        mentions: [],
        likes: [],
        dislikes: [],
        user: {
          id: 3,
          username: "작성자 이름",
          profileImageUrl: null,
          reviewCount: 24
        }
      }
    ];

    setPosts(mockPosts);
    setSearchResults(mockPosts);
    setLoading(false);

    // 알림 목록 초기화 (실제로는 API 호출)
    const mockNotifications: Notification[] = [
      {
        id: 1,
        type: "mention",
        postId: 2,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 1),
        read: false,
        fromUser: {
          id: 2,
          username: "작성자 이름",
          profileImageUrl: null
        }
      }
    ];
    setNotifications(mockNotifications);
  }, []);

  // 멘션 리스트 필터링
  const filterMentionList = (query: string) => {
    if (!query) return [];
    
    return mockUsers.filter(user => 
      user.username.toLowerCase().includes(query.toLowerCase())
    );
  };

  // 텍스트 에어리어 변경 핸들러
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setContent(value);
    
    const cursorPos = e.target.selectionStart;
    setCursorPosition(cursorPos);
    
    // @ 문자 감지
    const textBeforeCursor = value.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const lastSpaceIndex = textBeforeCursor.substring(lastAtIndex).indexOf(' ');
      // 현재 입력 중인 @userName이 공백으로 끝나지 않았는지 확인
      const isTypingMention = lastSpaceIndex === -1 || lastSpaceIndex === textBeforeCursor.length - 1;
      
      if (isTypingMention) {
        // @ 다음의 문자열 추출
        const query = textBeforeCursor.substring(lastAtIndex + 1);
        
        if (query && !query.includes(' ')) {
          console.log("멘션 쿼리:", query);
          setMentionQuery(query);
          const filteredUsers = filterMentionList(query);
          setMentionUsers(filteredUsers);
          setShowMentionList(filteredUsers.length > 0);
          return;
        }
      }
    }
    
    setShowMentionList(false);
  };

  // 멘션 선택 핸들러
  const handleSelectMention = (selectedUser: UserItem) => {
    if (!mentionedUsers.some(user => user.id === selectedUser.id)) {
      setMentionedUsers([...mentionedUsers, selectedUser]);
    }
    
    if (textareaRef.current) {
      const value = textareaRef.current.value;
      const cursorPos = cursorPosition;
      const textBeforeCursor = value.substring(0, cursorPos);
      const textAfterCursor = value.substring(cursorPos);
      
      // 마지막 '@' 위치 찾기
      const lastAtIndex = textBeforeCursor.lastIndexOf('@');
      
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
    users.forEach(mentionedUser => {
      addNotification({
        type: "mention",
        postId,
        createdAt: new Date(),
        read: false,
        fromUser: {
          id: user?.id || 0,
          username: user?.username || "익명",
          profileImageUrl: user?.profileImageUrl || null
        }
      });
    });
  };

  // 알림 클릭 핸들러
  const handleNotificationClick = (notification: Notification) => {
    // 알림 읽음 처리
    const updatedNotifications = notifications.map(item => 
      item.id === notification.id ? { ...item, read: true } : item
    );
    setNotifications(updatedNotifications);
    
    // 해당 포스트로 이동 및 자동 펼치기
    setExpandedPostId(notification.postId);
    
    // 스크롤 이동 (선택적)
    const postElement = document.getElementById(`post-${notification.postId}`);
    if (postElement) {
      postElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // 게시글 작성 처리
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !content.trim()) {
      alert("제목과 내용을 입력해주세요!");
      return;
    }

    // 실제 구현에서는 API 호출로 대체
    const newPost: Post = {
      id: posts.length + 1,
      title,
      content,
      createdAt: new Date(),
      comments: [],
      mentions: mentionedUsers,
      likes: [],
      dislikes: [],
      user: {
        id: user?.id || 0,
        username: user?.username || "익명",
        profileImageUrl: user?.profileImageUrl || null,
        reviewCount: 0
      }
    };

    setPosts([newPost, ...posts]);
    setSearchResults([newPost, ...searchResults]);
    
    // 멘션된 사용자에게 알림 생성
    if (mentionedUsers.length > 0) {
      createNotification(mentionedUsers, newPost.id);
    }
    
    setTitle("");
    setContent("");
    setMentionedUsers([]);
    setShowWriteForm(false);
  };

  // 댓글 작성 처리
  const handleCommentSubmit = (postId: number) => {
    if (!commentContent.trim()) {
      alert("댓글 내용을 입력해주세요!");
      return;
    }

    // 실제 구현에서는 API 호출로 대체
    const newComment: Comment = {
      id: Math.floor(Math.random() * 1000) + 10, // 임의의 ID 생성
      content: commentContent,
      createdAt: new Date(),
      likes: [],
      dislikes: [],
      user: {
        id: user?.id || 0,
        username: user?.username || "익명",
        profileImageUrl: user?.profileImageUrl || null
      }
    };

    // 댓글이 추가된 새 게시글 목록 생성
    const updatedPosts = posts.map(post => {
      if (post.id === postId) {
        // 게시글 작성자에게 댓글 알림 생성
        if (post.user.id !== user?.id) {
          addNotification({
            type: "comment",
            postId,
            createdAt: new Date(),
            read: false,
            fromUser: {
              id: user?.id || 0,
              username: user?.username || "익명",
              profileImageUrl: user?.profileImageUrl || null
            }
          });
        }
        return { ...post, comments: [newComment, ...post.comments] };
      }
      return post;
    });

    setPosts(updatedPosts);
    setSearchResults(updatedPosts);
    setCommentContent("");
  };

  // 멘션된 사용자 표시 형식으로 텍스트 변환
  const formatContentWithMentions = (text: string) => {
    // '@username' 패턴을 찾아 강조 표시
    return text.replace(/@(\w+)/g, '<span class="text-blue-500 font-medium">@$1</span>');
  };

  // 날짜 포맷팅 함수
  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}일 전`;
    if (hours > 0) return `${hours}시간 전`;
    if (minutes > 0) return `${minutes}분 전`;
    return "방금 전";
  };

  // 검색 처리
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults(posts);
      return;
    }

    const filtered = posts.filter(post => {
      const query = searchQuery.toLowerCase();
      
      switch (searchCategory) {
        case 'title':
          return post.title.toLowerCase().includes(query);
        case 'content':
          return post.content.toLowerCase().includes(query);
        case 'author':
          return post.user.username.toLowerCase().includes(query);
        default:
          return post.title.toLowerCase().includes(query) || 
                 post.content.toLowerCase().includes(query);
      }
    });
    
    setSearchResults(filtered);
  };

  // 검색 카테고리를 표시하는 텍스트 반환
  const getCategoryText = () => {
    switch (searchCategory) {
      case 'title': return '제목';
      case 'content': return '내용';
      case 'author': return '작성자';
      default: return '제목';
    }
  };

  // 검색 초기화
  const resetSearch = () => {
    setSearchQuery("");
    setSearchResults(posts);
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
        profileImageUrl: null
      }
    });
    alert("테스트 알림이 생성되었습니다. 알림 아이콘을 확인해보세요.");
  };

  // 좋아요 처리
  const handlePostLike = (postId: number) => {
    if (!isLoggedIn || !user) {
      alert("좋아요를 누르려면 로그인이 필요합니다.");
      return;
    }

    const updatedPosts = posts.map(post => {
      if (post.id === postId) {
        // 이미 좋아요를 눌렀는지 확인
        const alreadyLiked = post.likes.some(like => like.userId === user.id);
        
        if (alreadyLiked) {
          // 이미 좋아요 누른 경우, 좋아요 취소
          return {
            ...post,
            likes: post.likes.filter(like => like.userId !== user.id)
          };
        } else {
          // 싫어요 취소 (있을 경우)
          const updatedDislikes = post.dislikes.filter(dislike => dislike.userId !== user.id);
          
          // 좋아요 추가
          return {
            ...post,
            likes: [...post.likes, { userId: user.id }],
            dislikes: updatedDislikes
          };
        }
      }
      return post;
    });
    
    setPosts(updatedPosts);
    setSearchResults(updatedPosts);
  };

  // 싫어요 처리
  const handlePostDislike = (postId: number) => {
    if (!isLoggedIn || !user) {
      alert("싫어요를 누르려면 로그인이 필요합니다.");
      return;
    }

    const updatedPosts = posts.map(post => {
      if (post.id === postId) {
        // 이미 싫어요를 눌렀는지 확인
        const alreadyDisliked = post.dislikes.some(dislike => dislike.userId === user.id);
        
        if (alreadyDisliked) {
          // 이미 싫어요 누른 경우, 싫어요 취소
          return {
            ...post,
            dislikes: post.dislikes.filter(dislike => dislike.userId !== user.id)
          };
        } else {
          // 좋아요 취소 (있을 경우)
          const updatedLikes = post.likes.filter(like => like.userId !== user.id);
          
          // 싫어요 추가
          return {
            ...post,
            dislikes: [...post.dislikes, { userId: user.id }],
            likes: updatedLikes
          };
        }
      }
      return post;
    });
    
    setPosts(updatedPosts);
    setSearchResults(updatedPosts);
  };

  return (
    <div className="container mx-auto px-4 py-2">
      {/* 상단 검색 및 버튼 영역 */}
      <div className="mb-4 flex items-center justify-between">
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
            
            <form onSubmit={handleSearch} className="mb-4">
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
                          setSearchCategory('title');
                          setShowCategoryDropdown(false);
                        }}
                      >
                        제목
                      </div>
                      <div 
                        className="px-3 py-1 hover:bg-gray-100 text-xs cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSearchCategory('content');
                          setShowCategoryDropdown(false);
                        }}
                      >
                        내용
                      </div>
                      <div 
                        className="px-3 py-1 hover:bg-gray-100 text-xs cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSearchCategory('author');
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
                  handleSearch(new Event('submit') as any);
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
            <h2 className="text-xl font-semibold">새 게시글 작성</h2>
            <button 
              onClick={() => setShowWriteForm(false)}
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
                  onClick={(e) => setCursorPosition((e.target as HTMLTextAreaElement).selectionStart)}
                  onKeyUp={(e) => setCursorPosition((e.target as HTMLTextAreaElement).selectionStart)}
                  maxLength={450}
                  required
                ></textarea>
                
                {/* 멘션 목록 */}
                {showMentionList && (
                  <div className="absolute left-0 z-10 mt-1 w-64 rounded-md bg-white shadow-lg">
                    <ul className="max-h-40 overflow-y-auto">
                      {mentionUsers.length === 0 ? (
                        <li className="px-4 py-2 text-sm text-gray-500">일치하는 사용자가 없습니다.</li>
                      ) : (
                        mentionUsers.map(user => (
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
                                    <FaUser className="text-gray-500" size={10} />
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
                      {mentionedUsers.map(user => (
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
              <p className="text-gray-600">게시글을 작성하려면 로그인이 필요합니다.</p>
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
      
      {/* 게시글 목록 */}
      <div className="space-y-6">
        {loading ? (
          <div className="flex justify-center py-10">
            <p>로딩 중...</p>
          </div>
        ) : searchResults.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
            <p className="text-gray-500">게시글이 없습니다. 첫 게시글을 작성해보세요!</p>
          </div>
        ) : (
          searchResults.map((post) => (
            <div
              id={`post-${post.id}`}
              key={post.id}
              className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm overflow-hidden"
            >
              {/* 게시글 본문 */}
              <div className="flex">
                {/* 사용자 프로필 영역 */}
                <div className="mr-4 flex flex-col items-center">
                  <Link to={`/profile/${post.user.id}`} className="flex flex-col items-center">
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
                  <h3 className="text-lg font-semibold">{post.title}</h3>
                  <p 
                    className="mt-2 text-gray-700"
                    dangerouslySetInnerHTML={{ __html: formatContentWithMentions(post.content) }}
                  ></p>
                  
                  {/* 멘션된 사용자 표시 */}
                  {post.mentions && post.mentions.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {post.mentions.map(user => (
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
                          className={`p-1 rounded-md ${post.likes.some(like => like.userId === user?.id) ? 'text-blue-600' : 'text-gray-400 hover:text-blue-600'}`}
                          onClick={() => handlePostLike(post.id)}
                          disabled={!isLoggedIn}
                          title={isLoggedIn ? "좋아요" : "로그인 필요"}
                        >
                          <FaThumbsUp size={14} />
                        </button>
                        <span>{post.likes.length}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button 
                          className={`p-1 rounded-md ${post.dislikes.some(dislike => dislike.userId === user?.id) ? 'text-red-600' : 'text-gray-400 hover:text-red-600'}`}
                          onClick={() => handlePostDislike(post.id)}
                          disabled={!isLoggedIn}
                          title={isLoggedIn ? "싫어요" : "로그인 필요"}
                        >
                          <FaThumbsDown size={14} />
                        </button>
                        <span>{post.dislikes.length}</span>
                      </div>
                      <button 
                        className="flex items-center cursor-pointer hover:text-blue-600"
                        onClick={() => toggleComments(post.id)}
                      >
                        댓글 : {post.comments.length}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 댓글 영역 */}
              {expandedPostId === post.id && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <h4 className="text-sm font-semibold mb-3">댓글 {post.comments.length}개</h4>
                  
                  {/* 댓글 목록 */}
                  <div className="space-y-3 mb-4">
                    {post.comments.map((comment) => (
                      <div key={comment.id} className="flex">
                        <Link to={`/profile/${comment.user.id}`} className="mr-2">
                          <div className="h-8 w-8 overflow-hidden rounded-full bg-gray-200 cursor-pointer">
                            {comment.user.profileImageUrl ? (
                              <img
                                src={comment.user.profileImageUrl}
                                alt={`${comment.user.username}의 프로필`}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-gray-200">
                                <FaUser className="text-gray-500" size={12} />
                              </div>
                            )}
                          </div>
                        </Link>
                        <div className="flex-1">
                          <div className="flex items-center">
                            <Link to={`/profile/${comment.user.id}`}>
                              <span className="text-xs font-medium hover:text-blue-500 cursor-pointer">{comment.user.username}</span>
                            </Link>
                            <span className="ml-2 text-xs text-gray-500">{formatDate(comment.createdAt)}</span>
                          </div>
                          <p className="text-sm mt-1">{comment.content}</p>
                        </div>
                      </div>
                    ))}
                    
                    {post.comments.length === 0 && (
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
                          value={commentContent}
                          onChange={(e) => setCommentContent(e.target.value)}
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
                      <p className="text-sm text-gray-500 mb-1">댓글을 작성하려면 로그인이 필요합니다.</p>
                      <Link to="/login" className="text-sm text-blue-600 hover:underline">
                        로그인하기
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CommunityPage; 