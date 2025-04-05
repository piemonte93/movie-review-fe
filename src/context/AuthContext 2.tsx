import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { authApi } from "../api/authApi";
import { useNavigate } from "react-router-dom";

interface User {
  id: number;
  username: string;
  email: string;
  roles: string[];
  profileImageUrl?: string;
  bio?: string;
}

interface AuthContextType {
  isLoggedIn: boolean;
  user: User | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  refreshAuthStatus: () => void;
  updateUserInfo: (updatedUser: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();

  // 컴포넌트 마운트 시 인증 상태 확인
  useEffect(() => {
    refreshAuthStatus();

    // auth-error 이벤트 리스너 등록
    const handleAuthError = (event: CustomEvent) => {
      console.log("인증 오류 이벤트 수신:", event.detail);

      try {
        // 오류 메시지 추출
        let errorMessage = "인증에 문제가 발생했습니다. 다시 로그인해주세요.";
        if (typeof event.detail === "string") {
          errorMessage = event.detail;
        } else if (event.detail && event.detail.message) {
          errorMessage = event.detail.message;
        }

        // 영화 리뷰 페이지의 GET 요청에 대한 401 에러는 로그아웃 처리하지 않음
        if (
          window.location.pathname === "/movie-reviews" &&
          event.detail?.url?.includes("/api/movie-reviews") &&
          event.detail?.method === "GET"
        ) {
          console.log("영화 리뷰 조회 요청의 401 응답. 로그아웃 처리 생략");
          return;
        }

        // 중복 처리 방지를 위한 로직
        const AUTH_PROCESSING_KEY = "auth_error_processing";
        const processingStartTime = sessionStorage.getItem(AUTH_PROCESSING_KEY);
        const currentTime = Date.now();

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
      } catch (error) {
        console.error("인증 오류 처리 중 예외 발생:", error);
        // 오류 발생 시에도 처리 상태는 해제
        sessionStorage.removeItem("auth_error_processing");
      }
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

  const refreshAuthStatus = () => {
    try {
      console.log("인증 상태 새로고침 시작");

      // 토큰 및 사용자 정보 확인
      const token = localStorage.getItem("token");
      const userStr = localStorage.getItem("user");

      console.log("로컬 스토리지 상태:", {
        token: token ? "있음" : "없음",
        user: userStr ? "있음" : "없음",
      });

      // 두 가지 모두 있어야 로그인 상태로 인정
      const loggedIn = !!token && !!userStr;

      if (loggedIn) {
        try {
          // 사용자 정보 파싱
          const currentUser = JSON.parse(userStr!);

          // 필수 필드 검증
          if (
            !currentUser ||
            typeof currentUser !== "object" ||
            !currentUser.email ||
            !currentUser.username
          ) {
            console.error("사용자 정보가 유효하지 않습니다:", currentUser);

            // 유효하지 않은 사용자 정보는 삭제하고 로그아웃 상태로 전환
            localStorage.removeItem("user");
            localStorage.removeItem("token");
            setIsLoggedIn(false);
            setUser(null);
            return;
          }

          // 유효한 사용자 정보 - 로그인 상태 유지
          console.log("유효한 사용자 정보 확인:", currentUser.username);
          setIsLoggedIn(true);
          setUser(currentUser);
        } catch (e) {
          console.error("사용자 정보 파싱 오류:", e);

          // 파싱 오류 시 로그인 상태 초기화
          localStorage.removeItem("user");
          localStorage.removeItem("token");
          setIsLoggedIn(false);
          setUser(null);
        }
      } else {
        console.log("로그인 상태 아님");
        setIsLoggedIn(false);
        setUser(null);
      }

      console.log(
        "인증 상태 새로고침 완료:",
        loggedIn ? "로그인됨" : "로그아웃됨"
      );
    } catch (error) {
      // 예상치 못한 오류 발생 시 안전하게 로그아웃 상태로 설정
      console.error("인증 상태 확인 중 오류 발생:", error);
      setIsLoggedIn(false);
      setUser(null);
    }
  };

  const login = async (token: string, user: any) => {
    try {
      console.log("로그인 시작:", {
        token: token ? "있음" : "없음",
        user: user ? "있음" : "없음",
      });

      if (!token) {
        console.error("로그인 실패: 토큰이 없습니다");
        return false;
      }

      if (!user || typeof user !== "object") {
        console.error("로그인 실패: 사용자 정보가 유효하지 않습니다", user);
        return false;
      }

      // 필수 값 확인
      if (!user.email) {
        console.warn("사용자 정보에 이메일이 없습니다");
      }

      if (!user.username) {
        console.warn("사용자 정보에 사용자 이름이 없습니다");
        user.username = "사용자"; // 기본값 설정
      }

      // 로컬 스토리지에 저장
      try {
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user));

        // 저장 확인
        const savedToken = localStorage.getItem("token");
        const savedUser = localStorage.getItem("user");

        if (!savedToken || !savedUser) {
          console.error("로컬 스토리지 저장 실패:", {
            token: savedToken ? "저장됨" : "실패",
            user: savedUser ? "저장됨" : "실패",
          });

          // 재시도
          if (!savedToken) localStorage.setItem("token", token);
          if (!savedUser) localStorage.setItem("user", JSON.stringify(user));
        } else {
          console.log("로컬 스토리지 저장 성공");
        }
      } catch (e) {
        console.error("로컬 스토리지 저장 중 오류:", e);
        return false;
      }

      // 상태 업데이트
      setIsLoggedIn(true);
      setUser(user);
      console.log("로그인 완료:", user.username);
      return true;
    } catch (e) {
      console.error("로그인 처리 중 예외 발생:", e);
      return false;
    }
  };

  const logout = () => {
    console.log("AuthContext - 로그아웃 함수 호출됨");

    try {
      // 로컬 스토리지 토큰 정보 확인
      const token = localStorage.getItem("token");
      const userInfo = localStorage.getItem("user");

      // 로컬 스토리지에서 인증 관련 정보 제거
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      // 세션 스토리지에서 인증 관련 처리 정보 제거
      sessionStorage.removeItem("auth_error_processing");
      sessionStorage.removeItem("auth_error_count");
      sessionStorage.removeItem("last_auth_error_time");

      // 로그아웃 상태 업데이트
      setIsLoggedIn(false);
      setUser(null);

      console.log("AuthContext - 로그아웃 처리 완료", {
        이전토큰상태: token ? "있음" : "없음",
        이전사용자상태: userInfo ? "있음" : "없음",
        현재상태: "로그아웃됨",
      });

      // 캐시된 API 쿼리 등 정리 (필요 시 추가)

      return true;
    } catch (error) {
      console.error("로그아웃 처리 중 오류 발생:", error);
      return false;
    }
  };

  // 사용자 정보 업데이트 함수
  const updateUserInfo = (updatedUser: Partial<User>) => {
    if (!user) return;

    try {
      // 현재 사용자 정보 가져오기
      const userStr = localStorage.getItem("user");
      if (!userStr) {
        console.error("사용자 정보가 없습니다.");
        return;
      }

      // 기존 사용자 정보 파싱
      const currentUser = JSON.parse(userStr);

      // 업데이트된 정보로 객체 병합
      const newUserInfo = {
        ...currentUser,
        ...updatedUser,
      };

      // 로컬 스토리지 업데이트
      localStorage.setItem("user", JSON.stringify(newUserInfo));

      // 상태 업데이트
      setUser(newUserInfo);
      console.log("사용자 정보 업데이트 완료:", newUserInfo);
    } catch (e) {
      console.error("사용자 정보 업데이트 중 오류 발생:", e);
    }
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
