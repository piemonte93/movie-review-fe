import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { authApi } from "../api/authApi";

interface LocationState {
  token?: string;
  email?: string;
}

const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState;

  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    // 토큰과 이메일 상태 확인
    if (state?.token && state?.email) {
      setToken(state.token);
      setEmail(state.email);
    } else {
      // 직접 URL 접근 시 비밀번호 찾기 페이지로 리다이렉트
      navigate("/forgot-password");
    }
  }, [state, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 유효성 검사
    if (!password || !confirmPassword) {
      setError("모든 필드를 입력해주세요.");
      return;
    }

    if (password !== confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }

    if (password.length < 6) {
      setError("비밀번호는 6자 이상이어야 합니다.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 비밀번호 재설정 API 호출
      const response = await authApi.resetPassword(token, password);
      setSuccessMessage(response.message);

      // 3초 후 로그인 페이지로 이동
      setTimeout(() => {
        navigate("/login", {
          state: {
            message:
              "비밀번호가 성공적으로 재설정되었습니다. 새 비밀번호로 로그인해주세요.",
          },
        });
      }, 3000);
    } catch (err: any) {
      if (err.response) {
        setError(
          err.response.data.message || "비밀번호 재설정에 실패했습니다."
        );
      } else {
        setError("서버에 연결할 수 없습니다. 인터넷 연결을 확인해주세요.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-64px)] flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <form
          className="mb-6 rounded-lg border border-gray-200 bg-white p-8 shadow-md"
          onSubmit={handleSubmit}
        >
          <h2 className="mb-6 text-center text-2xl font-bold text-gray-900">
            비밀번호 재설정
          </h2>

          <div className="mb-4">
            <p className="mb-4 text-sm text-gray-600">
              <span className="font-semibold">{email}</span>의 새 비밀번호를
              설정해주세요.
            </p>
          </div>

          <div className="mb-6">
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              새 비밀번호
            </label>
            <input
              type="password"
              id="password"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
              placeholder="새 비밀번호 입력"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>

          <div className="mb-6">
            <label
              htmlFor="confirmPassword"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              비밀번호 확인
            </label>
            <input
              type="password"
              id="confirmPassword"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
              placeholder="비밀번호 다시 입력"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>

          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-600">
              {successMessage}
            </div>
          )}

          <button
            type="submit"
            className="w-full rounded-md bg-gray-800 px-4 py-3 text-center text-sm font-medium text-white hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-800 focus:ring-offset-2"
            disabled={loading}
          >
            {loading ? "처리 중..." : "비밀번호 재설정"}
          </button>

          <div className="mt-4 text-center">
            <Link
              to="/login"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              로그인으로 돌아가기
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
