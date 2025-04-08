import React, { useEffect } from "react";
import {
  FaTimes,
  FaBell,
  FaHeart,
  FaComment,
  FaUserPlus,
  FaAt,
} from "react-icons/fa";
import { useNotifications } from "../context/NotificationContext";
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
  const { notifications, markAsRead, markAllAsRead, fetchNotifications } =
    useNotifications();
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

  // 알림 메시지 생성
  const getNotificationMessage = (notification: any) => {
    const fromUsername = notification.fromUser?.username || "알 수 없는 사용자";

    switch (notification.type) {
      case "LIKE":
        if (notification.reviewId) {
          return `내 리뷰에 좋아요를 눌렀습니다.`;
        } else {
          return `내 게시글에 좋아요를 눌렀습니다.`;
        }
      case "COMMENT":
        if (notification.reviewId) {
          return `내 리뷰에 댓글을 작성했습니다.`;
        } else {
          return `내 게시글에 댓글을 작성했습니다.`;
        }
      case "REPLY":
        return `내 댓글에 답글을 작성했습니다.`;
      case "FOLLOW":
        return `나를 팔로우했습니다.`;
      case "MENTION":
        return `게시글에서 나를 멘션했습니다.`;
      default:
        return `새로운 알림이 있습니다.`;
    }
  };

  // 모든 알림 읽음 처리
  const handleMarkAllAsRead = () => {
    markAllAsRead();
  };

  // 모달이 열려있지 않으면 null 반환
  if (!isOpen) return null;

  return (
    <div className="notification-dropdown absolute right-0 top-12 z-10 w-80 rounded-md border border-gray-200 bg-white shadow-lg">
      {/* 모달 헤더 */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <h3 className="text-lg font-medium">알림</h3>
        <div className="flex">
          <button
            onClick={handleMarkAllAsRead}
            className="mr-2 rounded-full p-1 text-sm text-gray-500 hover:bg-gray-100"
          >
            모두 읽음
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
            {notifications.map((notification) => (
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
                    <p className="text-sm text-gray-500">
                      {getNotificationMessage(notification)}
                    </p>
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
            ))}
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
