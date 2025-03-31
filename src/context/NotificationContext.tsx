import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';

// 알림 데이터 타입 정의
export interface Notification {
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

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  markAsRead: (id: number) => void;
  markAllAsRead: () => void;
  unreadCount: number;
  clearNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // 로컬 스토리지에서 알림 로드 (실제 구현에서는 API 호출로 대체)
  useEffect(() => {
    const storedNotifications = localStorage.getItem('notifications');
    if (storedNotifications) {
      try {
        // 날짜 문자열을 Date 객체로 변환하는 과정 추가
        const parsedNotifications = JSON.parse(storedNotifications);
        const processedNotifications = parsedNotifications.map((notification: any) => ({
          ...notification,
          createdAt: new Date(notification.createdAt)
        }));
        setNotifications(processedNotifications);
      } catch (error) {
        console.error('Failed to parse notifications from localStorage', error);
      }
    }
  }, []);

  // 알림 상태가 변경될 때마다 로컬 스토리지에 저장
  useEffect(() => {
    localStorage.setItem('notifications', JSON.stringify(notifications));
  }, [notifications]);

  // 새 알림 추가
  const addNotification = (notification: Omit<Notification, 'id'>) => {
    const newId = Math.max(0, ...notifications.map(n => n.id)) + 1;
    const newNotification = { ...notification, id: newId };
    setNotifications(prev => [newNotification, ...prev]);
  };

  // 알림 읽음 처리
  const markAsRead = (id: number) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
  };

  // 모든 알림 읽음 처리
  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notification => ({ ...notification, read: true }))
    );
  };

  // 읽지 않은 알림 개수
  const unreadCount = notifications.filter(notification => !notification.read).length;

  // 모든 알림 삭제
  const clearNotifications = () => {
    setNotifications([]);
  };

  return (
    <NotificationContext.Provider value={{
      notifications,
      addNotification,
      markAsRead,
      markAllAsRead,
      unreadCount,
      clearNotifications
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext; 