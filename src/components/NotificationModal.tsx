import React from 'react';
import { FaTimes, FaBell, FaHeart, FaComment, FaUserPlus } from 'react-icons/fa';

// 알람 타입 정의
type NotificationType = 'like' | 'comment' | 'follow' | 'system';

// 알람 인터페이스 정의
interface Notification {
  id: number;
  type: NotificationType;
  message: string;
  from: string;
  time: string;
  read: boolean;
  relatedItemId?: number; // 관련 콘텐츠(영화, 게시글 등) ID
}

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const NotificationModal: React.FC<NotificationModalProps> = ({ isOpen, onClose }) => {
  // 모킹 알람 데이터
  const notifications: Notification[] = [
    {
      id: 1,
      type: 'like',
      message: '내 리뷰에 좋아요를 눌렀습니다.',
      from: '김영화',
      time: '5분 전',
      read: false,
      relatedItemId: 101,
    },
    {
      id: 2,
      type: 'comment',
      message: '내 리뷰에 댓글을 작성했습니다.',
      from: '이감독',
      time: '1시간 전',
      read: false,
      relatedItemId: 102,
    },
    {
      id: 3,
      type: 'follow',
      message: '나를 팔로우했습니다.',
      from: '박배우',
      time: '2시간 전',
      read: true,
    },
    {
      id: 4,
      type: 'system',
      message: '새로운 기능이 추가되었습니다. 확인해보세요!',
      from: 'MovieSocial',
      time: '1일 전',
      read: true,
    },
    {
      id: 5,
      type: 'like',
      message: '내 리뷰에 좋아요를 눌렀습니다.',
      from: '최배우',
      time: '2일 전',
      read: true,
      relatedItemId: 103,
    },
  ];

  // 알람 타입에 따라 아이콘 반환
  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'like':
        return <FaHeart className="text-red-500" />;
      case 'comment':
        return <FaComment className="text-blue-500" />;
      case 'follow':
        return <FaUserPlus className="text-green-500" />;
      case 'system':
        return <FaBell className="text-yellow-500" />;
      default:
        return <FaBell className="text-gray-500" />;
    }
  };

  // 모달이 열려있지 않으면 null 반환
  if (!isOpen) return null;

  return (
    <div className="notification-dropdown absolute right-0 top-12 z-10 w-80 rounded-md border border-gray-200 bg-white shadow-lg">
      {/* 모달 헤더 */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <h3 className="text-lg font-medium">알림</h3>
        <button 
          onClick={onClose}
          className="rounded-full p-1 hover:bg-gray-100"
        >
          <FaTimes />
        </button>
      </div>
      
      {/* 모달 내용 */}
      <div className="max-h-[400px] overflow-y-auto">
        {notifications.length > 0 ? (
          <ul className="divide-y divide-gray-100">
            {notifications.map((notification) => (
              <li 
                key={notification.id} 
                className={`cursor-pointer p-4 transition hover:bg-gray-50 ${
                  !notification.read ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 pt-1">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {notification.from}
                    </p>
                    <p className="text-sm text-gray-500">
                      {notification.message}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      {notification.time}
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
      
      {/* 모달 푸터 */}
      <div className="border-t border-gray-200 p-3 text-center">
        <button 
          className="text-sm font-medium text-blue-600 hover:text-blue-800"
          onClick={() => {/* 모든 알림 읽음 처리 로직 */}}
        >
          모든 알림 읽음 표시
        </button>
      </div>
    </div>
  );
};

export default NotificationModal;