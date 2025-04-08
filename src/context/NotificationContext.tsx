import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  ReactNode,
} from "react";
import { apiClient } from "../api/backendApi";
import { useAuth } from "./AuthContext";
import { toast } from 'react-toastify';

// 알림 타입 정의
export type NotificationType =
  | "LIKE"
  | "COMMENT"
  | "REPLY"
  | "MENTION"
  | "FOLLOW";

// 알림 데이터 타입 정의
export interface Notification {
  id: number;
  type: NotificationType;
  read: boolean;
  createdAt: string;
  fromUser: {
    id: number;
    username: string;
    profileImageUrl: string | null;
  };
  postId?: number;
  postTitle?: string;
  reviewId?: number;
  reviewTitle?: string;
  movieId?: number;
  movieTitle?: string;
  commentId?: number;
  commentContent?: string;
}

// NotificationContext 인터페이스 정의
interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearNotifications: () => Promise<void>;
  fetchNotifications: () => Promise<void>;
}

// Provider Props 타입 정의
interface NotificationProviderProps {
  children: ReactNode;
}

// NotificationContext 생성
const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

// NotificationContext 사용을 위한 훅
export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error(
      "useNotifications must be used within a NotificationProvider"
    );
  }
  return context;
};

// NotificationProvider 컴포넌트
export const NotificationProvider: React.FC<NotificationProviderProps> = ({
  children,
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const { isLoggedIn, user } = useAuth();

  // SSE 연결 상태
  const [eventSource, setEventSource] = useState<EventSource | null>(null);

  // 알림 데이터 불러오기
  const fetchNotifications = async () => {
    if (!isLoggedIn || !user) return;

    try {
      const response = await apiClient.get("/api/notifications");
      if (response.data && response.data.content) {
        setNotifications(response.data.content);
      }
    } catch (error) {
      console.error("Failed to fetch notifications", error);
    }
  };

  // 읽지 않은 알림 수 가져오기
  const fetchUnreadCount = async () => {
    if (!isLoggedIn || !user) return;

    try {
      const response = await apiClient.get("/api/notifications/unread-count");
      if (typeof response.data === "number") {
        setUnreadCount(response.data);
      }
    } catch (error) {
      console.error("Failed to fetch unread notification count", error);
    }
  };

  // SSE 연결 설정
  const setupSSE = () => {
    if (!isLoggedIn || !user || eventSource) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    const sse = new EventSource(
      `http://localhost:8080/api/notifications/subscribe`,
      {
        withCredentials: true,
      }
    );

    sse.addEventListener("connect", (event) => {
      console.log("SSE 연결 설정 완료:", event.data);
    });

    sse.addEventListener("notification", (event) => {
      try {
        const newNotification = JSON.parse(event.data) as Notification;

        // 새 알림을 목록에 추가하고 읽지 않은 알림 수 업데이트
        setNotifications((prev) => [newNotification, ...prev]);
        setUnreadCount((prev) => prev + 1);
      } catch (error) {
        console.error("SSE 이벤트 처리 오류:", error);
      }
    });

    sse.onerror = (error) => {
      console.error("SSE 연결 오류:", error);
      sse.close();
      setEventSource(null);
    };

    setEventSource(sse);
  };

  // SSE 연결 해제
  const closeSSE = () => {
    if (eventSource) {
      eventSource.close();
      setEventSource(null);
    }
  };

  // 알림 읽음 처리
  const markAsRead = async (id: number) => {
    if (!isLoggedIn || !user) return;

    try {
      await apiClient.put(`/api/notifications/${id}/read`);

      // 상태 업데이트
      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === id
            ? { ...notification, read: true }
            : notification
        )
      );

      // 읽지 않은 알림 수 다시 가져오기
      fetchUnreadCount();
    } catch (error) {
      console.error("Failed to mark notification as read", error);
    }
  };

  // 모든 알림 읽음 처리
  const markAllAsRead = async () => {
    if (!isLoggedIn || !user) return;

    try {
      await apiClient.put("/api/notifications/read-all");

      // 모든 알림을 읽음 상태로 업데이트
      setNotifications((prev) =>
        prev.map((notification) => ({ ...notification, read: true }))
      );

      // 읽지 않은 알림 수 0으로 설정
      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark all notifications as read", error);
    }
  };

  // 모든 알림 삭제 (Implement actual logic)
  const clearNotifications = async () => {
    if (!isLoggedIn || !user) {
        toast.warn("로그인이 필요합니다.");
        return;
    }

    try {
      // Call backend API to delete all notifications for the current user
      await apiClient.delete("/api/notifications");
      
      // Clear notifications and unread count in the frontend state
      setNotifications([]);
      setUnreadCount(0);
      toast.success("모든 알림이 삭제되었습니다."); // Add success toast

    } catch (error: any) {
      console.error("Failed to delete notifications", error);
      toast.error(error.response?.data?.message || "알림 삭제 중 오류가 발생했습니다."); // Add error toast
    }
  };

  // 로그인 상태가 변경될 때 SSE 연결 설정/해제
  useEffect(() => {
    if (isLoggedIn && user) {
      fetchNotifications();
      fetchUnreadCount();
      setupSSE();
    } else {
      closeSSE();
      setNotifications([]);
      setUnreadCount(0);
    }

    return () => {
      closeSSE();
    };
  }, [isLoggedIn, user]);

  // 컨텍스트 값
  const value = {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    fetchNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext;
