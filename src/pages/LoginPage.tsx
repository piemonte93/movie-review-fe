import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { FaGoogle } from "react-icons/fa";
import { authApi } from "../api/authApi";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import { toast } from "react-toastify";

interface LocationState {
  message?: string;
  from?: string;
  authError?: string;
}

// User 인터페이스 추가
interface User {
  id: number;
  username: string;
  email: string;
  roles: string[];
}

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 회원가입 성공 등의 메시지를 처리
  useEffect(() => {
    const state = location.state as LocationState;
    if (state?.message) {
      setSuccessMessage(state.message);
      // 10초 후 메시지 제거 (기존 5초에서 변경)
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [location.state]);

  // location.state를 통해 전달된 인증 오류 확인 및 표시
  useEffect(() => {
    const state = location.state as { from?: string; authError?: string };
    if (state?.authError) {
      console.log("로그인 페이지 - 인증 오류 메시지 표시:", state.authError);
      setError(state.authError);
      toast.error(state.authError, {
        position: "top-center",
        autoClose: 5000,
      });

      // 오류 메시지를 표시한 후 URL에서 상태 제거 (페이지 새로고침 시 메시지 중복 표시 방지)
      window.history.replaceState(
        { ...state, authError: undefined },
        document.title,
        location.pathname
      );
    }
  }, [location.state]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); // 폼 기본 동작 방지 (페이지 새로고침 방지)
    e.stopPropagation(); // 이벤트 전파 중지 추가
    console.log("로그인 시도 - preventDefault 호출됨");

    // 유효성 검사
    if (!email || !password) {
      setError("이메일과 비밀번호를 모두 입력해주세요.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log("로그인 API 호출 전");
      // 실제 API 호출하기
      const response = await authApi.login({ email, password });
      console.log("로그인 API 호출 성공:", response);

      // 컨텍스트에 로그인 상태 업데이트
      if (response && response.token && response.user) {
        login(response.token, response.user);
        console.log("로그인 성공, 홈으로 리다이렉트");
        // 로그인 성공 시 홈페이지로 이동
        navigate("/");
      } else {
        throw new Error("로그인 응답이 유효하지 않습니다.");
      }
    } catch (err: any) {
      console.error("로그인 오류:", err);

      if (err.response) {
        // 서버 응답이 있는 에러
        console.log("서버 응답 오류:", err.response.status, err.response.data);

        // 특정 응답 메시지 처리
        const errorMessage = err.response.data?.message;
        if (
          errorMessage &&
          errorMessage.includes("구글 로그인으로 가입된 계정입니다")
        ) {
          setError(
            "이 계정은 구글 로그인으로 가입된 계정입니다. 구글 로그인 버튼을 이용해주세요."
          );
        } else if (err.response.status === 401 || err.response.status === 403) {
          setError("이메일 또는 비밀번호가 틀렸습니다.");
        } else {
          setError("로그인에 실패했습니다. 나중에 다시 시도해주세요.");
        }
      } else if (err.request) {
        // 요청은 했으나 응답이 없는 경우
        console.log("응답 없음:", err.request);
        setError("서버에 연결할 수 없습니다. 인터넷 연결을 확인해주세요.");

        // 백엔드가 없는 경우 모킹 (개발 환경에서만 사용)
        if (import.meta.env.DEV) {
          console.log("백엔드 API가 없습니다. 모킹 데이터를 사용합니다.");

          // 모킹 데이터로 로그인
          const mockUser: User = {
            id: 1,
            username: email.split("@")[0],
            email,
            roles: ["USER"],
          };

          // 컨텍스트에 로그인 상태 업데이트
          login("mock-token", mockUser);

          // 로그인 성공 시뮬레이션 (1초 지연)
          setTimeout(() => {
            navigate("/");
          }, 1000);
        }
      } else {
        // 요청 설정하는 중에 발생한 오류
        console.log("요청 설정 오류:", err.message);
        setError(`요청 중 오류가 발생했습니다: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    // Google OAuth 로그인 구현
    console.log("Google 로그인 시도");
    try {
      // 구글 OAuth 로그인 함수 호출
      authApi.googleLogin();
    } catch (error) {
      console.error("구글 로그인 오류:", error);
      setError("구글 로그인 중 오류가 발생했습니다. 다시 시도해주세요.");
    }
  };

  // 에러 메시지 닫기 핸들러 추가
  const handleCloseError = () => {
    setError(null);
  };

  // 인풋 변경 핸들러
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
  };

  return (
    <div className="flex min-h-[calc(100vh-64px)] flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <form
          className="mb-6 rounded-lg border border-gray-200 bg-white p-8 shadow-md"
          onSubmit={handleLogin}
          noValidate // HTML 기본 유효성 검사 비활성화
        >
          {successMessage && (
            <div className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-600">
              {successMessage}
            </div>
          )}

          <div className="mb-6">
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Email
            </label>
            <input
              type="email"
              id="email"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
              placeholder="이메일"
              value={email}
              onChange={handleEmailChange}
              required
            />
          </div>

          <div className="mb-6">
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Password
            </label>
            <input
              type="password"
              id="password"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
              placeholder="패스워드"
              value={password}
              onChange={handlePasswordChange}
              required
            />
          </div>

          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600 flex justify-between items-center">
              <span>{error}</span>
              <button
                type="button"
                onClick={handleCloseError}
                className="text-red-500 hover:text-red-700 focus:outline-none"
              >
                ×
              </button>
            </div>
          )}

          <button
            type="submit"
            className="w-full rounded-md bg-gray-800 px-4 py-3 text-center text-sm font-medium text-white hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-800 focus:ring-offset-2"
            disabled={loading}
          >
            {loading ? "로그인 중..." : "Sign In"}
          </button>

          <div className="mt-4 text-center">
            <Link
              to="/forgot-password"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              비밀번호를 잊으셨나요?
            </Link>
          </div>

          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600">
              계정이 없으신가요?{" "}
              <Link
                to="/register"
                className="font-medium text-blue-600 hover:text-blue-800"
              >
                회원가입
              </Link>
            </p>
          </div>
        </form>

        <div className="flex items-center justify-center">
          <button
            onClick={handleGoogleLogin}
            className="flex items-center justify-center rounded-full border border-gray-300 px-6 py-2 text-sm font-medium text-gray-700 transition duration-150 hover:bg-gray-50"
          >
            <FaGoogle className="mr-2 text-red-500" />
            Sign in with Google
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
