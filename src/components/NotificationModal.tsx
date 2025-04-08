import React, { useEffect } from "react";
import {
  FaTimes,
  FaBell,
  FaHeart,
  FaComment,
  FaUserPlus,
  FaAt,
} from "react-icons/fa";
import { useNotifications, Notification } from "../context/NotificationContext";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

// 모달 프롭스 타입 정의
interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const NotificationModal: React.FC<NotificationModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    notifications,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    fetchNotifications,
  } = useNotifications();
  const navigate = useNavigate();

  // 모달이 열릴 때 알림 데이터 불러오기
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  // 알람 타입에 따라 아이콘 반환
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "LIKE":
        return <FaHeart className="text-red-500" />;
      case "COMMENT":
      case "REPLY":
        return <FaComment className="text-blue-500" />;
      case "FOLLOW":
        return <FaUserPlus className="text-green-500" />;
      case "MENTION":
        return <FaAt className="text-purple-500" />;
      default:
        return <FaBell className="text-gray-500" />;
    }
  };

  // 알림 클릭 시 처리
  const handleNotificationClick = (
    notificationId: number,
    notification: any
  ) => {
    markAsRead(notificationId);

    // 알림 타입에 따라 다른 페이지로 이동
    if (notification.postId) {
      navigate(`/community/posts/${notification.postId}`);
    } else if (notification.reviewId) {
      const baseUrl = `/movies/${notification.movieId}/reviews`;
      navigate(`${baseUrl}?reviewId=${notification.reviewId}`);
    }

    onClose();
  };

  // 알림 메시지 생성 (댓글 내용은 분리)
  const getNotificationMessage = (notification: Notification) => {
    switch (notification.type) {
      case "LIKE":
        if (notification.reviewId) {
          const reviewTitle = notification.reviewTitle || "해당 리뷰";
          return `'${reviewTitle}' 리뷰에 좋아요를 눌렀습니다.`;
        } else if (notification.postId) {
          const postTitle = notification.postTitle || "해당 게시글";
          return `'${postTitle}' 게시글에 좋아요를 눌렀습니다.`;
        } else {
          return `좋아요를 눌렀습니다.`;
        }
      case "COMMENT":
        if (notification.reviewId) {
          const reviewTitle = notification.reviewTitle || "해당 리뷰";
          return `'${reviewTitle}' 리뷰에 댓글을 작성했습니다.`; // Return only base message
        } else if (notification.postId) {
          const postTitle = notification.postTitle || "해당 게시글";
          return `'${postTitle}' 게시글에 댓글을 작성했습니다.`; // Return only base message
        } else {
          return `댓글을 작성했습니다.`; // Return only base message
        }
      case "REPLY":
        return `내 댓글에 답글을 작성했습니다.`;
      case "FOLLOW":
        return `나를 팔로우했습니다.`;
      case "MENTION":
        const postTitleMention = notification.postTitle || "해당 게시글";
        return `'${postTitleMention}' 게시글에서 나를 멘션했습니다.`;
      default:
        return `새로운 알림이 있습니다.`;
    }
  };

  // 댓글 미리보기 생성
  const getCommentPreview = (notification: Notification) => {
    const MAX_COMMENT_LENGTH = 20;
    if (notification.type === "COMMENT" && notification.commentContent) {
      return notification.commentContent.length > MAX_COMMENT_LENGTH
        ? `"${notification.commentContent.substring(0, MAX_COMMENT_LENGTH)}..."`
        : `"${notification.commentContent}"`;
    }
    return null;
  };

  // 모든 알림 읽음 처리
  const handleMarkAllAsRead = () => {
    markAllAsRead();
  };

  // 모든 알림 삭제 처리 (New Handler)
  const handleDeleteAll = () => {
    // Ask for confirmation before deleting
    if (
      window.confirm(
        "정말로 모든 알림을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
      )
    ) {
      clearNotifications();
    }
  };

  // 모달이 열려있지 않으면 null 반환
  if (!isOpen) return null;

  return (
    <div className="notification-dropdown absolute right-0 top-12 z-10 w-80 rounded-md border border-gray-200 bg-white shadow-lg">
      {/* 모달 헤더 */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <h3 className="text-lg font-medium">알림</h3>
        <div className="flex items-center">
          {" "}
          {/* Use items-center for vertical alignment */}
          <button
            onClick={handleMarkAllAsRead}
            className="mr-2 rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100" // Adjusted padding/margin/size
          >
            모두 읽음
          </button>
          {/* New Delete All Button */}
          <button
            onClick={handleDeleteAll}
            className="mr-2 rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50" // Adjusted padding/margin/size, added red color
          >
            모두 삭제
          </button>
          <button
            onClick={onClose}
            className="rounded-full p-1 hover:bg-gray-100"
          >
            <FaTimes />
          </button>
        </div>
      </div>

      {/* 모달 내용 */}
      <div className="max-h-[400px] overflow-y-auto">
        {notifications.length > 0 ? (
          <ul className="divide-y divide-gray-100">
            {notifications.map((notification) => {
              // Generate message and preview for each notification
              const message = getNotificationMessage(notification);
              const commentPreview = getCommentPreview(notification);

              return (
                <li
                  key={notification.id}
                  className={`cursor-pointer p-4 transition hover:bg-gray-50 ${
                    !notification.read ? "bg-blue-50" : ""
                  }`}
                  onClick={() =>
                    handleNotificationClick(notification.id, notification)
                  }
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 pt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {notification.fromUser
                          ? notification.fromUser.username
                          : "시스템"}
                      </p>
                      {/* Render base message */}
                      <p className="text-sm text-gray-500">{message}</p>
                      {/* Render comment preview if it exists */}
                      {commentPreview && (
                        <p className="mt-1 text-sm text-gray-600 pl-2 border-l-2 border-gray-300 italic">
                          {commentPreview}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-gray-400">
                        {formatDistanceToNow(new Date(notification.createdAt), {
                          addSuffix: true,
                          locale: ko,
                        })}
                      </p>
                    </div>
                    {!notification.read && (
                      <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <FaBell className="mb-2 text-3xl text-gray-300" />
            <p className="text-gray-500">알림이 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationModal;
