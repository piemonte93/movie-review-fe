import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FaSearch,
  FaBell,
  FaUser,
  FaSignOutAlt,
  FaCog,
  FaChevronDown,
} from "react-icons/fa";
import NotificationModal from "./NotificationModal";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationContext";

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const { isLoggedIn, user, logout } = useAuth();
  const { unreadCount } = useNotifications();

  // 알람 모달 열림/닫힘 상태
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);

  // 사용자 메뉴 열림/닫힘 상태
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // 커뮤니티 메뉴 열림/닫힘 상태
  const [isCommunityMenuOpen, setIsCommunityMenuOpen] = useState(false);

  // 검색창 확장 상태
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);

  // 검색어 상태
  const [searchQuery, setSearchQuery] = useState("");

  // TV 메뉴 열림/닫힘 상태
  const [isTvMenuOpen, setIsTvMenuOpen] = useState(false);

  // 사용자 아이콘 클릭 핸들러
  const handleUserIconClick = () => {
    if (isLoggedIn) {
      // 사용자 메뉴 토글
      setIsUserMenuOpen(!isUserMenuOpen);
    } else {
      // 로그인 페이지로 이동
      navigate("/login");
    }
  };

  // 로그아웃 핸들러
  const handleLogout = () => {
    logout();
    setIsUserMenuOpen(false);
    navigate("/");
  };

  // 검색 아이콘 클릭 핸들러
  const handleSearchIconClick = () => {
    setIsSearchExpanded(!isSearchExpanded);
    if (!isSearchExpanded) {
      // 검색창이 확장될 때 자동으로 포커스
      setTimeout(() => {
        const searchInput = document.getElementById("search-input");
        if (searchInput) {
          searchInput.focus();
        }
      }, 100);
    }
  };

  // 검색 제출 핸들러
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
      setIsSearchExpanded(false);
      setSearchQuery("");
    }
  };

  // 외부 클릭 시 메뉴와 검색창 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".user-menu") && !target.closest(".user-icon")) {
        setIsUserMenuOpen(false);
      }
      if (!target.closest(".search-container")) {
        setIsSearchExpanded(false);
      }
      if (
        !target.closest(".community-menu") &&
        !target.closest(".community-button")
      ) {
        setIsCommunityMenuOpen(false);
      }
      if (
        !target.closest(".notification-dropdown") &&
        !target.closest(".notification-bell")
      ) {
        setIsNotificationModalOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <header className="border-b border-gray-200 bg-white fixed top-0 left-0 right-0 z-50 shadow-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center space-x-8">
          <div className="text-xl font-bold">
            <Link to="/">MovieSocial</Link>
          </div>

          <nav className="hidden md:block">
            <ul className="flex space-x-6">
              <li>
                <Link to="/" className="hover:text-blue-600">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/movies" className="hover:text-blue-600">
                  Movies
                </Link>
              </li>
              <li>
                <Link to="/tv" className="hover:text-blue-600">
                  TV Show
                </Link>
              </li>
              <li className="relative community-menu">
                <button
                  className="community-button flex items-center hover:text-blue-600"
                  onMouseEnter={() => setIsCommunityMenuOpen(true)}
                  onClick={() => setIsCommunityMenuOpen(!isCommunityMenuOpen)}
                >
                  Community
                  <FaChevronDown className="ml-1 h-3 w-3" />
                </button>

                {isCommunityMenuOpen && (
                  <div
                    className="absolute left-0 mt-2 w-48 rounded-md bg-white py-2 shadow-lg ring-1 ring-black ring-opacity-5 z-50"
                    onMouseLeave={() => setIsCommunityMenuOpen(false)}
                  >
                    {isLoggedIn && (
                      <>
                        <Link
                          to="/movie-reviews"
                          className="block px-4 py-2 text-gray-800 hover:bg-gray-200"
                          onClick={() => setIsCommunityMenuOpen(false)}
                        >
                          영화 리뷰
                        </Link>
                        <Link
                          to="/tv-reviews"
                          className="block px-4 py-2 text-gray-800 hover:bg-gray-200"
                          onClick={() => setIsCommunityMenuOpen(false)}
                        >
                          TV쇼 리뷰
                        </Link>
                        <Link
                          to="/community"
                          className="block px-4 py-2 text-gray-800 hover:bg-gray-200"
                          onClick={() => setIsCommunityMenuOpen(false)}
                        >
                          커뮤니티
                        </Link>
                      </>
                    )}
                  </div>
                )}
              </li>
            </ul>
          </nav>
        </div>

        <div className="flex items-center space-x-4">
          <div className="search-container relative">
            <div className="flex items-center">
              {isSearchExpanded ? (
                <form onSubmit={handleSearchSubmit}>
                  <input
                    id="search-input"
                    type="text"
                    placeholder="Search..."
                    className="w-40 rounded-full border border-gray-300 py-1 pl-8 pr-2 text-sm focus:border-blue-500 focus:outline-none md:w-60"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <FaSearch
                    className="absolute left-3 top-1/2 -translate-y-1/2 transform text-gray-400 cursor-pointer"
                    onClick={handleSearchSubmit}
                  />
                </form>
              ) : (
                <button
                  className="rounded-full p-2 hover:bg-gray-100"
                  onClick={handleSearchIconClick}
                  aria-label="검색"
                >
                  <FaSearch className="text-gray-600" />
                </button>
              )}
            </div>
          </div>

          {isLoggedIn && (
            <div className="relative notification-bell">
              <button
                className="relative rounded-full p-2 hover:bg-gray-100"
                onClick={() =>
                  setIsNotificationModalOpen(!isNotificationModalOpen)
                }
                aria-label="알림"
              >
                <FaBell className="text-gray-600" />
                {/* 읽지 않은 알람이 있을 경우 표시할 빨간 점 */}
                {unreadCount > 0 && (
                  <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-red-500"></span>
                )}
              </button>

              {/* 알람 드롭다운 */}
              <NotificationModal
                isOpen={isNotificationModalOpen}
                onClose={() => setIsNotificationModalOpen(false)}
              />
            </div>
          )}

          {isLoggedIn ? (
            <div className="relative user-menu">
              <button
                className="user-icon relative rounded-full p-2 hover:bg-gray-100"
                onClick={handleUserIconClick}
                aria-label="프로필"
              >
                {user?.profileImageUrl ? (
                  <img
                    src={user.profileImageUrl}
                    alt="프로필"
                    className="w-6 h-6 rounded-full object-cover"
                  />
                ) : (
                  <FaUser className="text-gray-600" />
                )}
              </button>

              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-md bg-white py-2 shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                  <div className="border-b border-gray-100 px-4 py-2 mb-1">
                    <div className="font-medium text-sm">
                      {user?.username || "사용자"}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {user?.email || "email@example.com"}
                    </div>
                  </div>
                  <Link
                    to="/profile"
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setIsUserMenuOpen(false)}
                  >
                    <FaUser className="mr-2 text-gray-400" />
                    프로필
                  </Link>
                  <Link
                    to="/profile/edit"
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setIsUserMenuOpen(false)}
                  >
                    <FaCog className="mr-2 text-gray-400" />
                    프로필 수정
                  </Link>
                  {user?.roles?.includes("ROLE_ADMIN") && (
                    <Link
                      to="/admin"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      <FaCog className="mr-2 text-gray-400" />
                      관리자 페이지
                    </Link>
                  )}
                  <div className="border-t border-gray-100"></div>
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <FaSignOutAlt className="mr-2 text-red-500" />
                    로그아웃
                  </button>
                </div>
              )}
            </div>
          ) : (
            // 로그인 상태가 아닐 때는 로그인/회원가입 버튼 표시
            <Link
              to="/login"
              className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
            >
              Log in/ Sign Up
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
