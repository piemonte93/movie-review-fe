import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import { authApi } from "../api/authApi";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

interface User {
  id: number;
  username: string;
  email: string;
  roles: string[];
  profileImageUrl?: string;
  bio?: string;
  status?: "ACTIVE" | "BLOCKED" | "DELETED";
}

interface AuthContextType {
  isLoggedIn: boolean;
  user: User | null;
  login: (token: string) => Promise<boolean>;
  logout: () => void;
  refreshAuthStatus: () => Promise<void>;
  updateUserInfo: (updatedUser: Partial<User>) => void;
  isUserBlocked: () => boolean;
  isAdminOrModerator: () => boolean;
  authLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const navigate = useNavigate();

  // 컴포넌트 마운트 시 인증 상태 확인
  useEffect(() => {
    refreshAuthStatus();

    // auth-error 이벤트 리스너 등록
    const handleAuthError = (event: CustomEvent) => {
      const errorMessage = event.detail?.message || "인증 오류가 발생했습니다.";
      const statusCode = event.detail?.statusCode;
      const currentTime = Date.now();

      // 디버깅 정보 출력
      console.log("인증 오류 이벤트 수신:", {
        message: errorMessage,
        statusCode: statusCode,
        time: new Date(currentTime).toLocaleString(),
      });

      // 403 Forbidden 오류는 권한 문제이므로 로그아웃하지 않음
      if (statusCode === 403) {
        console.log("403 Forbidden 오류: 권한이 없지만 로그아웃하지 않습니다.");
        return;
      }

      // 이전 처리 중인지 확인 (중복 처리 방지)
      const processingStartTime = sessionStorage.getItem(AUTH_PROCESSING_KEY);

      // 진행 중인 처리가 있고 5초 이내인 경우 중복 처리로 간주하고 무시
      if (processingStartTime) {
        const timeSinceProcessingStarted =
          currentTime - parseInt(processingStartTime);
        if (timeSinceProcessingStarted < 5000) {
          console.log(
            `인증 오류 처리가 이미 진행 중입니다. (${Math.floor(timeSinceProcessingStarted / 1000)}초 전에 시작됨)`
          );
          return;
        }
      }

      // 현재 토큰 상태 확인
      const token = localStorage.getItem("token");
      const userInfo = localStorage.getItem("user");

      // 이미 로그아웃된 상태면 추가 처리 불필요
      if (!token || !userInfo) {
        console.log("이미 로그아웃된 상태입니다. 추가 처리 불필요");

        // 로그인 페이지가 아니면 리디렉션만 수행
        if (window.location.pathname !== "/login") {
          console.log("로그인 페이지로 리디렉션합니다.");
          navigate("/login", {
            state: {
              from: window.location.pathname,
              authError: errorMessage,
            },
          });
        }
        return;
      }

      // 처리 시작 시간 기록
      sessionStorage.setItem(AUTH_PROCESSING_KEY, currentTime.toString());

      // 5초 후 자동으로 처리 상태 해제 (타임아웃 안전장치)
      setTimeout(() => {
        sessionStorage.removeItem(AUTH_PROCESSING_KEY);
      }, 5000);

      console.log("인증 오류 처리 시작:", errorMessage);

      // 로그아웃 수행
      const logoutSuccess = logout();
      console.log("로그아웃 결과:", logoutSuccess ? "성공" : "실패");

      // 오류 메시지와 함께 로그인 페이지로 리디렉션
      if (window.location.pathname !== "/login") {
        navigate("/login", {
          state: {
            from: window.location.pathname,
            authError: errorMessage,
          },
        });
      }

      // 처리 완료 후 처리 상태 해제
      sessionStorage.removeItem(AUTH_PROCESSING_KEY);
      console.log("인증 오류 처리 완료");
    };

    // 이벤트 리스너 등록
    window.addEventListener("auth-error", handleAuthError as EventListener);

    // 컴포넌트 언마운트 시 이벤트 리스너 제거
    return () => {
      window.removeEventListener(
        "auth-error",
        handleAuthError as EventListener
      );
    };
  }, [navigate]);

  const refreshAuthStatus = useCallback(async () => {
    setAuthLoading(true);
    try {
      console.log("인증 상태 새로고침 시작");

      // 토큰 및 사용자 정보 확인
      const token = localStorage.getItem("token");
      const userStr = localStorage.getItem("user");

      console.log("로컬 스토리지 상태:", {
        token: token ? "있음" : "없음",
        user: userStr ? "있음" : "없음",
      });

      // 토큰이 있어야만 유효성 검사 진행
      if (token) {
        try {
          // 사용자 정보 가져오기 (백엔드 /api/users/status 호출)
          const currentUser = await authApi.getCurrentUser();

          // 필수 필드 검증 (백엔드 응답 검증)
          if (
            !currentUser ||
            typeof currentUser !== "object" ||
            !currentUser.id ||
            !currentUser.email ||
            !currentUser.username ||
            !Array.isArray(currentUser.roles)
          ) {
            console.error(
              "백엔드에서 받은 사용자 정보가 유효하지 않습니다:",
              currentUser
            );
            // 유효하지 않은 정보 -> 로그아웃 처리
            localStorage.removeItem("user");
            localStorage.removeItem("token");
            setIsLoggedIn(false);
            setUser(null);
            return;
          }

          // 유효한 사용자 정보 확인 -> 상태 및 localStorage 업데이트
          console.log(
            "유효한 사용자 정보 확인 및 업데이트:",
            currentUser.username
          );
          console.log(
            "AuthContext: Updating user state and attempting to update localStorage...",
            currentUser
          );
          setIsLoggedIn(true);
          setUser(currentUser);
          localStorage.setItem("user", JSON.stringify(currentUser));
          const savedUserStr = localStorage.getItem("user");
          console.log(
            "AuthContext: localStorage 'user' updated.",
            savedUserStr ? JSON.parse(savedUserStr) : "Failed to read back"
          );
        } catch (error) {
          // getCurrentUser API 호출 실패 (e.g., 401 Unauthorized, network error)
          console.error("사용자 정보 가져오기 실패:", error);
          // API 호출 실패 시 로그인 상태 초기화 (토큰이 유효하지 않을 수 있음)
          localStorage.removeItem("user");
          localStorage.removeItem("token");
          setIsLoggedIn(false);
          setUser(null);
        }
      } else {
        // 토큰이 없는 경우 -> 로그아웃 상태
        console.log("로컬 스토리지에 토큰 없음. 로그아웃 상태.");
        setIsLoggedIn(false);
        setUser(null);
        if (userStr) localStorage.removeItem("user");
      }

      // Use the most recent state value for logging completion status
      const currentLoginStatus =
        !!localStorage.getItem("token") && !!localStorage.getItem("user");
      console.log(
        "인증 상태 새로고침 완료:",
        currentLoginStatus ? "로그인됨" : "로그아웃됨"
      );
    } catch (error) {
      // 예상치 못한 오류 발생 시 안전하게 로그아웃 상태로 설정
      console.error("인증 상태 확인 중 예외 발생:", error);
      setIsLoggedIn(false);
      setUser(null);
      localStorage.removeItem("user");
      localStorage.removeItem("token");
    } finally {
      setAuthLoading(false);
      console.log("인증 상태 새로고침 완료, authLoading: false");
    }
  }, []);

  const login = async (token: string): Promise<boolean> => {
    try {
      console.log("AuthContext: 로그인 함수 시작", { tokenProvided: !!token });

      if (!token) {
        console.error("AuthContext: 로그인 실패 - 토큰 없음");
        toast.error("로그인 처리 중 오류가 발생했습니다. (토큰 누락)");
        return false;
      }

      // 1. 토큰 저장
      localStorage.setItem("token", token);
      console.log("AuthContext: 토큰 저장 완료");

      // 2. 토큰 저장 후 즉시 최신 사용자 정보 로드 및 상태/스토리지 업데이트
      await refreshAuthStatus();

      // 3. refreshAuthStatus 결과 확인 (선택적)
      const updatedUser = JSON.parse(localStorage.getItem("user") || "null");
      if (!updatedUser || !localStorage.getItem("token")) {
        console.error("AuthContext: 로그인 후 상태 업데이트 실패");
        toast.error("로그인 후 사용자 정보를 불러오는 데 실패했습니다.");
        logout();
        return false;
      }

      console.log(
        "AuthContext: 로그인 성공 및 상태 업데이트 완료",
        updatedUser.username
      );
      toast.success(`${updatedUser.username}님, 환영합니다!`);
      return true;
    } catch (error) {
      console.error("AuthContext: 로그인 처리 중 오류 발생", error);
      toast.error("로그인 중 예상치 못한 오류가 발생했습니다.");
      logout();
      return false;
    }
  };

  const logout = useCallback(() => {
    console.log("AuthContext: 로그아웃 시작");
    try {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setIsLoggedIn(false);
      setUser(null);
      console.log("AuthContext: 로그아웃 완료, 상태 및 스토리지 정리됨");

      toast.info("로그아웃 되었습니다.");

      return true;
    } catch (error) {
      console.error("AuthContext: 로그아웃 중 오류 발생", error);
      return false;
    }
  }, []);

  const updateUserInfo = (updatedFields: Partial<User>) => {
    setUser((prevUser) => {
      if (!prevUser) return null;

      const newUser = { ...prevUser, ...updatedFields };

      try {
        localStorage.setItem("user", JSON.stringify(newUser));
        console.log(
          "AuthContext: 사용자 정보 업데이트 및 localStorage 저장 완료",
          newUser
        );
      } catch (error) {
        console.error(
          "AuthContext: localStorage 사용자 정보 업데이트 실패",
          error
        );
        toast.error("사용자 정보를 로컬에 저장하는 중 오류가 발생했습니다.");
      }

      return newUser;
    });
  };

  const isUserBlocked = () => {
    if (!user) return false;

    if (typeof user.status === "string") {
      return user.status === "BLOCKED" || user.status === "DELETED";
    }

    return false;
  };

  const isAdminOrModerator = () => {
    if (!user || !user.roles) return false;
    return (
      user.roles.includes("ROLE_ADMIN") || user.roles.includes("ROLE_MODERATOR")
    );
  };

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn,
        user,
        login,
        logout,
        refreshAuthStatus,
        updateUserInfo,
        isUserBlocked,
        isAdminOrModerator,
        authLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
