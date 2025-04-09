import React from "react";
import { Post, BASE_URL } from "../api/backendApi";
import { useNavigate } from "react-router-dom";
import { formatDate } from "../utils/dateUtils";
import {
  FaUserCircle,
  FaThumbsUp,
  FaThumbsDown,
  FaComment,
  FaEdit,
  FaTrash,
} from "react-icons/fa";
import { useAuth } from "../context/AuthContext";
import defaultAvatar from "../assets/default-profile.png";

interface PostCardProps {
  post: Post;
  onEdit?: (post: Post) => void; // Optional: For editing in profile page
  onDelete?: (postId: number) => void; // Optional: For deleting in profile page
}

const PostCard: React.FC<PostCardProps> = ({ post, onEdit, onDelete }) => {
  const navigate = useNavigate();
  const { user } = useAuth(); // Get current logged-in user

  const handleCardClick = (e: React.MouseEvent) => {
    // Prevent navigation when clicking edit/delete buttons
    if ((e.target as HTMLElement).closest(".post-actions")) {
      return;
    }
    // 커뮤니티 페이지에서 해당 게시물 제목을 검색
    navigate(`/community?search=${encodeURIComponent(post.title)}`);
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    if (onEdit) {
      onEdit(post);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    if (onDelete) {
      // Optional: Add confirmation dialog here
      onDelete(post.id);
    }
  };

  const authorUsername = post.user?.username || "익명";
  const authorProfileImg = post.user?.profileImageUrl;
  console.log("PostCard - 작성자 정보:", post.user);
  console.log("PostCard - 프로필 이미지 URL:", authorProfileImg);

  // 프로필 이미지 URL 처리 함수
  const getProfileImageUrl = (imageUrl: string | undefined) => {
    if (!imageUrl) return null;

    // 절대 URL이면 그대로 사용
    if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
      return imageUrl;
    }

    // 상대 URL이면 BASE_URL 추가
    return `${BASE_URL}${imageUrl}`;
  };

  const profileImageUrl = authorProfileImg
    ? getProfileImageUrl(authorProfileImg)
    : null;
  console.log("PostCard - 최종 프로필 이미지 URL:", profileImageUrl);

  // Check if the current user is the author to show edit/delete buttons
  const isAuthor = user?.id === post.user?.id;

  return (
    <div
      className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
      onClick={handleCardClick}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2 flex-grow min-w-0">
          {profileImageUrl ? (
            <img
              src={profileImageUrl}
              alt={authorUsername}
              className="w-6 h-6 rounded-full object-cover flex-shrink-0"
              onError={(e) => {
                e.currentTarget.src = defaultAvatar; // 이미지 로드 실패 시 기본 아바타로 대체
              }}
            />
          ) : (
            <FaUserCircle className="w-6 h-6 text-gray-400 flex-shrink-0" />
          )}
          <div className="min-w-0">
            <span className="text-sm font-medium truncate">
              {authorUsername}
            </span>
            <h3
              className="text-lg font-semibold truncate mt-1"
              title={post.title}
            >
              {post.title}
            </h3>
          </div>
        </div>
        {/* Show edit/delete only if callbacks are provided and user is author */}
        {isAuthor && onEdit && onDelete && (
          <div className="flex gap-2 flex-shrink-0 ml-2 post-actions">
            <button
              onClick={handleEditClick}
              className="text-gray-500 hover:text-blue-600 p-1"
              title="수정"
            >
              <FaEdit size={16} />
            </button>
            <button
              onClick={handleDeleteClick}
              className="text-gray-500 hover:text-red-600 p-1"
              title="삭제"
            >
              <FaTrash size={16} />
            </button>
          </div>
        )}
      </div>

      <p className="text-gray-700 mb-3 line-clamp-3">{post.content}</p>

      <div className="flex justify-between items-center text-xs text-gray-500 mt-3">
        <span>{formatDate(post.createdAt)}</span>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1">
            {/* TODO: Add liked/disliked state based on API response if available */}
            <FaThumbsUp className={`text-gray-400`} />
            <span>{post.likeCount || 0}</span>
          </div>
          <div className="flex items-center space-x-1">
            <FaThumbsDown className={`text-gray-400`} />
            <span>{post.dislikeCount || 0}</span>
          </div>
          <div className="flex items-center space-x-1">
            <FaComment className="text-gray-400" />
            <span>{post.commentCount || 0}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostCard;
