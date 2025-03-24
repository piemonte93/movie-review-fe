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
}

interface AuthContextType {
  isLoggedIn: boolean;
  user: User | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  refreshAuthStatus: () => void;
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
      logout();
      navigate("/login");
    };

    // 이벤트 리스너 추가
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

    // 토큰과 사용자 정보 제거
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    // 상태 업데이트
    setIsLoggedIn(false);
    setUser(null);

    console.log("AuthContext - 로그아웃 처리 완료");
  };

  return (
    <AuthContext.Provider
      value={{ isLoggedIn, user, login, logout, refreshAuthStatus }}
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
