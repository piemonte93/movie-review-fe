import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { FaUser, FaComment, FaStar, FaSearch, FaPen, FaReply, FaTimes, FaCaretDown, FaThumbsUp, FaThumbsDown } from "react-icons/fa";
import { FaStarHalfStroke, FaFilm } from "react-icons/fa6";
import { Link } from "react-router-dom";

// TMDB API 영화 정보 타입
interface Movie {
  id: number;
  title: string;
  poster_path: string | null;
  release_date: string;
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

// 영화 리뷰 데이터 타입 정의
interface MovieReview {
  id: number;
  title: string;
  content: string;
  rating: number;
  movieTitle: string;
  movieId: number;
  moviePoster?: string;
  createdAt: Date;
  comments: Comment[];
  likes: { userId: number }[];
  dislikes: { userId: number }[];
  isSpoiler: boolean;
  user: {
    id: number;
    username: string;
    profileImageUrl: string | null;
    reviewCount: number;
  };
}

const MovieReviewsPage: React.FC = () => {
  const { isLoggedIn, user } = useAuth();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [movieTitle, setMovieTitle] = useState("");
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [movieSearchQuery, setMovieSearchQuery] = useState("");
  const [movieSearchResults, setMovieSearchResults] = useState<Movie[]>([]);
  const [isSearchingMovie, setIsSearchingMovie] = useState(false);
  const [rating, setRating] = useState<number>(0);
  const [isSpoiler, setIsSpoiler] = useState(false);
  const [reviews, setReviews] = useState<MovieReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWriteForm, setShowWriteForm] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<MovieReview[]>([]);
  const [expandedReviewId, setExpandedReviewId] = useState<number | null>(null);
  const [commentContent, setCommentContent] = useState("");
  const [searchCategory, setSearchCategory] = useState<'title' | 'content' | 'author'>('title');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  // TMDB API 키 (실제 환경에서는 환경 변수로 관리)
  const TMDB_API_KEY = "a95a7823323dd52f66d0dc776498a8a1";
  
  // 영화 검색 함수
  const searchMovies = async (query: string) => {
    if (!query.trim()) {
      setMovieSearchResults([]);
      return;
    }
    
    try {
      const response = await fetch(
        `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=ko-KR`
      );
      const data = await response.json();
      setMovieSearchResults(data.results);
    } catch (error) {
      console.error("영화 검색 중 오류 발생:", error);
      setMovieSearchResults([]);
    }
  };

  // 영화 검색어 변경 핸들러
  const handleMovieSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setMovieSearchQuery(query);
    setIsSearchingMovie(true);
    
    // 디바운싱을 위한 타이머
    const timer = setTimeout(() => {
      searchMovies(query);
    }, 500);

    return () => clearTimeout(timer);
  };

  // 영화 선택 핸들러
  const handleSelectMovie = (movie: Movie) => {
    setSelectedMovie(movie);
    setMovieTitle(movie.title);
    setMovieSearchQuery("");
    setMovieSearchResults([]);
    setIsSearchingMovie(false);
  };

  // 선택한 영화 취소 핸들러
  const handleClearSelectedMovie = () => {
    setSelectedMovie(null);
    setMovieTitle("");
  };

  // 영화 리뷰 데이터 가져오기 (임시 데이터)
  useEffect(() => {
    // API 호출을 대신하는 임시 데이터
    const mockReviews: MovieReview[] = [
      {
        id: 1,
        title: "인셉션 - 빛나는 걸작!",
        content: "크리스토퍼 놀란 감독의 걸작으로, 꿈과 현실의 경계를 탐험하는 놀라운 영화입니다. 레오나르도 디카프리오의 연기는 정말 탁월했고, 영화의 시각적 효과와 스토리텔링은 최고였습니다.",
        rating: 4.5,
        movieTitle: "인셉션",
        movieId: 27205,
        moviePoster: "/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg",
        createdAt: new Date(Date.now() - 1000 * 60 * 45), // 45분 전
        comments: [
          {
            id: 1,
            content: "정말 공감합니다. 저도 인셉션을 정말 좋아해요!",
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
            content: "음악도 정말 좋았죠. 한스 짐머의 음악은 항상 훌륭합니다.",
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
        likes: [{ userId: 2 }, { userId: 4 }],
        dislikes: [{ userId: 5 }],
        isSpoiler: false,
        user: {
          id: 1,
          username: "작성자 이름",
          profileImageUrl: null,
          reviewCount: 15
        }
      },
      {
        id: 2,
        title: "어벤져스: 엔드게임 - 좋은 마무리",
        content: "마블 시네마틱 유니버스의 3단계를 마무리하는 영화로, 10년 동안의 이야기가 훌륭하게 마무리되었습니다. 감동적인 장면들이 많았고, 캐릭터들의 아크도 잘 완성되었습니다.",
        rating: 4.0,
        movieTitle: "어벤져스: 엔드게임",
        movieId: 299534,
        moviePoster: "/n78LK2t1uQ6LZKHyMrzKtuXrNjQ.jpg",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3), // 3시간 전
        comments: [
          {
            id: 3,
            content: "아이언맨의 최후가 너무 슬펐어요...",
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
        likes: [{ userId: 1 }, { userId: 3 }],
        dislikes: [],
        isSpoiler: true,
        user: {
          id: 2,
          username: "작성자 이름",
          profileImageUrl: null,
          reviewCount: 32
        }
      },
      {
        id: 3,
        title: "기생충 - 뛰어난 한국 영화",
        content: "봉준호 감독의 뛰어난 작품으로, 계급 갈등을 섬세하게 묘사한 영화입니다. 배우들의 연기도 정말 훌륭했고, 스토리 전개와 반전이 뛰어났습니다. 아카데미상을 받은 데는 충분한 이유가 있습니다.",
        rating: 5,
        movieTitle: "기생충",
        movieId: 496243,
        moviePoster: "/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 7), // 7시간 전
        comments: [],
        likes: [],
        dislikes: [],
        isSpoiler: false,
        user: {
          id: 3,
          username: "작성자 이름",
          profileImageUrl: null,
          reviewCount: 24
        }
      }
    ];

    setReviews(mockReviews);
    setSearchResults(mockReviews);
    setLoading(false);
  }, []);

  // 리뷰 작성 처리
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !content.trim() || !selectedMovie || rating === 0) {
      alert("모든 항목을 입력해주세요!");
      return;
    }

    // 실제 구현에서는 API 호출로 대체
    const newReview: MovieReview = {
      id: reviews.length + 1,
      title,
      content,
      rating,
      movieTitle: selectedMovie.title,
      movieId: selectedMovie.id,
      moviePoster: selectedMovie.poster_path ?? undefined,
      createdAt: new Date(),
      comments: [],
      likes: [],
      dislikes: [],
      isSpoiler,
      user: {
        id: user?.id || 0,
        username: user?.username || "익명",
        profileImageUrl: user?.profileImageUrl || null,
        reviewCount: 0
      }
    };

    setReviews([newReview, ...reviews]);
    setSearchResults([newReview, ...searchResults]);
    setTitle("");
    setContent("");
    setSelectedMovie(null);
    setMovieTitle("");
    setRating(0);
    setIsSpoiler(false);
    setShowWriteForm(false);
  };

  // 댓글 작성 처리
  const handleCommentSubmit = (reviewId: number) => {
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

    // 댓글이 추가된 새 리뷰 목록 생성
    const updatedReviews = reviews.map(review => 
      review.id === reviewId 
        ? { ...review, comments: [newComment, ...review.comments] } 
        : review
    );

    setReviews(updatedReviews);
    setSearchResults(updatedReviews);
    setCommentContent("");
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

  // 별점 렌더링 함수
  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<FaStar key={i} className="text-yellow-400" />);
      } else if (i === fullStars && hasHalfStar) {
        stars.push(<FaStarHalfStroke key={i} className="text-yellow-400" />);
      } else {
        stars.push(<FaStar key={i} className="text-gray-300" />);
      }
    }
    
    return (
      <div className="flex">
        {stars}
        <span className="ml-1 text-sm">({rating.toFixed(1)})</span>
      </div>
    );
  };

  // 별점 선택 핸들러
  const handleRatingClick = (index: number, isHalf: boolean) => {
    const newRating = isHalf ? index + 0.5 : index + 1;
    setRating(newRating);
  };

  // 검색 처리
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults(reviews);
      return;
    }

    const filtered = reviews.filter(review => {
      const query = searchQuery.toLowerCase();
      
      switch (searchCategory) {
        case 'title':
          return review.title.toLowerCase().includes(query) || 
                 review.movieTitle.toLowerCase().includes(query);
        case 'content':
          return review.content.toLowerCase().includes(query);
        case 'author':
          return review.user.username.toLowerCase().includes(query);
        default:
          return review.title.toLowerCase().includes(query) || 
                 review.content.toLowerCase().includes(query) || 
                 review.movieTitle.toLowerCase().includes(query);
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
    setSearchResults(reviews);
    setShowSearch(false);
    setShowSearchModal(false);
  };

  // 댓글 토글
  const toggleComments = (reviewId: number) => {
    setExpandedReviewId(expandedReviewId === reviewId ? null : reviewId);
  };

  // 좋아요 처리
  const handleReviewLike = (reviewId: number) => {
    if (!isLoggedIn || !user) {
      alert("좋아요를 누르려면 로그인이 필요합니다.");
      return;
    }

    const updatedReviews = reviews.map(review => {
      if (review.id === reviewId) {
        // 이미 좋아요를 눌렀는지 확인
        const alreadyLiked = review.likes.some(like => like.userId === user.id);
        
        if (alreadyLiked) {
          // 이미 좋아요 누른 경우, 좋아요 취소
          return {
            ...review,
            likes: review.likes.filter(like => like.userId !== user.id)
          };
        } else {
          // 싫어요 취소 (있을 경우)
          const updatedDislikes = review.dislikes.filter(dislike => dislike.userId !== user.id);
          
          // 좋아요 추가
          return {
            ...review,
            likes: [...review.likes, { userId: user.id }],
            dislikes: updatedDislikes
          };
        }
      }
      return review;
    });
    
    setReviews(updatedReviews);
    setSearchResults(updatedReviews);
  };

  // 싫어요 처리
  const handleReviewDislike = (reviewId: number) => {
    if (!isLoggedIn || !user) {
      alert("싫어요를 누르려면 로그인이 필요합니다.");
      return;
    }

    const updatedReviews = reviews.map(review => {
      if (review.id === reviewId) {
        // 이미 싫어요를 눌렀는지 확인
        const alreadyDisliked = review.dislikes.some(dislike => dislike.userId === user.id);
        
        if (alreadyDisliked) {
          // 이미 싫어요 누른 경우, 싫어요 취소
          return {
            ...review,
            dislikes: review.dislikes.filter(dislike => dislike.userId !== user.id)
          };
        } else {
          // 좋아요 취소 (있을 경우)
          const updatedLikes = review.likes.filter(like => like.userId !== user.id);
          
          // 싫어요 추가
          return {
            ...review,
            dislikes: [...review.dislikes, { userId: user.id }],
            likes: updatedLikes
          };
        }
      }
      return review;
    });
    
    setReviews(updatedReviews);
    setSearchResults(updatedReviews);
  };

  // 영화 상세 페이지로 이동하는 함수 추가
  const navigateToMovieDetail = (movieId: number) => {
    window.location.href = `/movie/${movieId}`;
  };

  return (
    <div className="container mx-auto px-4 py-2">
      {/* 상단 검색 및 버튼 영역 */}
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">영화 리뷰</h1>
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
            title="리뷰 작성하기"
          >
            <FaPen />
          </button>
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

      {/* 리뷰 작성 폼 */}
      {showWriteForm && (
        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">새 리뷰 작성</h2>
            <button 
              onClick={() => setShowWriteForm(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              닫기
            </button>
          </div>
          
          {isLoggedIn ? (
            <form onSubmit={handleSubmit}>
              <div className="mb-4 relative">
                {selectedMovie ? (
                  <div className="flex items-center border border-gray-300 rounded-md p-2">
                    {selectedMovie.poster_path && (
                      <img 
                        src={`https://image.tmdb.org/t/p/w92${selectedMovie.poster_path}`} 
                        alt={selectedMovie.title}
                        className="w-16 h-24 object-cover rounded mr-3"
                      />
                    )}
                    <div className="flex-1">
                      <div className="flex justify-between items-center">
                        <h3 className="font-medium">{selectedMovie.title}</h3>
                        <button 
                          type="button"
                          onClick={handleClearSelectedMovie}
                          className="text-gray-500 hover:text-red-500"
                        >
                          <FaTimes />
                        </button>
                      </div>
                      <p className="text-sm text-gray-600">
                        {selectedMovie.release_date ? new Date(selectedMovie.release_date).getFullYear() : '출시년도 정보 없음'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      placeholder="영화 제목 검색"
                      className="w-full rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:outline-none"
                      value={movieSearchQuery}
                      onChange={handleMovieSearchChange}
                      onClick={() => setIsSearchingMovie(true)}
                    />
                    {isSearchingMovie && movieSearchResults.length > 0 && (
                      <div className="absolute left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white border border-gray-300 rounded-md shadow-lg z-50">
                        {movieSearchResults.map((movie) => (
                          <div 
                            key={movie.id}
                            className="flex items-center p-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100"
                            onClick={() => handleSelectMovie(movie)}
                          >
                            <div className="flex-shrink-0 w-10 h-14 bg-gray-200 flex items-center justify-center rounded overflow-hidden mr-2">
                              {movie.poster_path ? (
                                <img 
                                  src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`} 
                                  alt={movie.title}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <FaFilm className="text-gray-400" />
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="font-medium text-sm">{movie.title}</div>
                              <div className="text-xs text-gray-500">
                                {movie.release_date ? new Date(movie.release_date).getFullYear() : '연도 정보 없음'}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="리뷰 제목"
                  className="w-full rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:outline-none"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              <div className="mb-4">
                <div className="flex items-center mb-2">
                  <span className="mr-2">별점:</span>
                  <div className={`flex relative ${isSearchingMovie && movieSearchResults.length > 0 ? 'hidden' : ''}`}>
                    {[0, 1, 2, 3, 4].map((index) => (
                      <div key={index} className="relative">
                        {/* 별 왼쪽 절반 (0.5) */}
                        <div 
                          className="absolute left-0 top-0 w-[12px] h-[24px] overflow-hidden cursor-pointer z-10"
                          onClick={() => handleRatingClick(index, true)}
                        >
                          <div className="w-[24px] h-[24px]">
                            {index + 0.5 <= rating ? (
                              <FaStar className="text-yellow-400" size={24} />
                            ) : (
                              <FaStar className="text-gray-300" size={24} />
                            )}
                          </div>
                        </div>
                        
                        {/* 별 오른쪽 절반 (1.0) */}
                        <div 
                          className="absolute left-[12px] top-0 w-[12px] h-[24px] overflow-hidden cursor-pointer z-10"
                          onClick={() => handleRatingClick(index, false)}
                        >
                          <div className="absolute right-0 top-0 w-[24px] h-[24px]">
                            {index + 1 <= rating ? (
                              <FaStar className="text-yellow-400" size={24} />
                            ) : (
                              <FaStar className="text-gray-300" size={24} />
                            )}
                          </div>
                        </div>

                        {/* 배경 별 */}
                        <div className="w-[24px] h-[24px] relative opacity-0">
                          <FaStar size={24} />
                        </div>
                      </div>
                    ))}
                    <span className="ml-2 text-sm">{rating.toFixed(1)}</span>
                  </div>
                </div>
              </div>
              <div className="mb-4">
                <textarea
                  placeholder="내용은 450자까지 입력 가능합니다."
                  className="h-32 w-full rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:outline-none"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  maxLength={450}
                  required
                ></textarea>
              </div>
              <div className="mb-4 flex justify-between items-center">
                <div></div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="spoilerCheck"
                    checked={isSpoiler}
                    onChange={(e) => setIsSpoiler(e.target.checked)}
                    className="mr-2 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="spoilerCheck" className="text-sm text-gray-700">
                    스포일러 포함
                  </label>
                </div>
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
              <p className="text-gray-600">리뷰를 작성하려면 로그인이 필요합니다.</p>
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
      
      {/* 리뷰 목록 */}
      <div className="space-y-6">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin h-8 w-8 border-4 border-gray-900 border-t-transparent rounded-full"></div>
          </div>
        ) : searchResults.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
            <p className="text-gray-500">등록된 리뷰가 없습니다. 첫 리뷰를 작성해보세요!</p>
          </div>
        ) : (
          searchResults.map((review) => (
            <div
              key={review.id}
              className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm overflow-hidden"
            >
              {/* 리뷰 본문 */}
              <div className="flex">
                {/* 사용자 프로필 영역 */}
                <div className="mr-4 flex flex-col items-center">
                  <Link to={`/profile/${review.user.id}`} className="flex flex-col items-center">
                    <div className="h-12 w-12 overflow-hidden rounded-full bg-gray-300 cursor-pointer">
                      {review.user.profileImageUrl ? (
                        <img
                          src={review.user.profileImageUrl}
                          alt={`${review.user.username}의 프로필`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gray-300">
                          <FaUser className="text-gray-600" />
                        </div>
                      )}
                    </div>
                    <p className="mt-1 text-center text-xs text-gray-700 hover:text-blue-500">
                      {review.user.username}
                    </p>
                  </Link>
                  <p className="flex items-center text-xs text-gray-500">
                    <FaComment className="mr-1" size={10} />
                    {review.user.reviewCount}
                  </p>
                </div>
                
                {/* 리뷰 내용 영역 */}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold">{review.title}</h3>
                    <div className="text-xs">
                      {renderStars(review.rating)}
                    </div>
                  </div>
                  
                  <div className="flex mb-4">
                    {review.moviePoster && (
                      <img 
                        src={`https://image.tmdb.org/t/p/w154${review.moviePoster}`}
                        alt={review.movieTitle}
                        className="w-24 h-36 object-cover rounded mr-3 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => navigateToMovieDetail(review.movieId)}
                      />
                    )}
                    <div className="flex-1">
                      <p 
                        className="text-sm text-blue-600 font-medium mb-1 cursor-pointer hover:underline"
                        onClick={() => navigateToMovieDetail(review.movieId)}
                      >
                        영화: {review.movieTitle}
                      </p>
                      <div 
                        className={`text-gray-700 text-sm ${review.isSpoiler ? 'spoiler-content' : ''}`}
                      >
                        {review.content}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-3 flex justify-between items-center text-xs text-gray-500">
                    <span>{formatDate(review.createdAt)}</span>
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-1">
                        <button 
                          className={`p-1 rounded-md ${review.likes.some(like => like.userId === user?.id) ? 'text-blue-600' : 'text-gray-400 hover:text-blue-600'}`}
                          onClick={() => handleReviewLike(review.id)}
                          disabled={!isLoggedIn}
                          title={isLoggedIn ? "좋아요" : "로그인 필요"}
                        >
                          <FaThumbsUp size={14} />
                        </button>
                        <span>{review.likes.length}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button 
                          className={`p-1 rounded-md ${review.dislikes.some(dislike => dislike.userId === user?.id) ? 'text-red-600' : 'text-gray-400 hover:text-red-600'}`}
                          onClick={() => handleReviewDislike(review.id)}
                          disabled={!isLoggedIn}
                          title={isLoggedIn ? "싫어요" : "로그인 필요"}
                        >
                          <FaThumbsDown size={14} />
                        </button>
                        <span>{review.dislikes.length}</span>
                      </div>
                      <button 
                        className="flex items-center cursor-pointer hover:text-blue-600"
                        onClick={() => toggleComments(review.id)}
                      >
                        댓글 : {review.comments.length}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 댓글 영역 */}
              {expandedReviewId === review.id && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <h4 className="text-sm font-semibold mb-3">댓글 {review.comments.length}개</h4>
                  
                  {/* 댓글 목록 */}
                  <div className="space-y-3 mb-4">
                    {review.comments.map((comment) => (
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
                    
                    {review.comments.length === 0 && (
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
                          onClick={() => handleCommentSubmit(review.id)}
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
      
      {/* 스포일러 컨텐츠에 대한 CSS 스타일 */}
      <style>
        {`
          .spoiler-content {
            filter: blur(4px);
            transition: filter 0.3s ease;
          }
          .spoiler-content:hover {
            filter: blur(0);
          }
        `}
      </style>
    </div>
  );
};

export default MovieReviewsPage; 