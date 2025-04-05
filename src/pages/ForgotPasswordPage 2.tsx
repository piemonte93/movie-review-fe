import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authApi } from "../api/authApi";

const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 유효성 검사
    if (!email) {
      setError("이메일을 입력해주세요.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("유효한 이메일 주소를 입력해주세요.");
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      // 비밀번호 재설정 요청 API 호출
      const response = await authApi.requestPasswordReset(email);
      setMessage(response.message);

      // 인증 코드 입력 페이지로 이동 (1초 타임아웃)
      setTimeout(() => {
        navigate(`/verify-code`, { state: { email } });
      }, 1000);
    } catch (err: any) {
      if (err.response) {
        setError(
          err.response.data.message || "오류가 발생했습니다. 다시 시도해주세요."
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
            비밀번호 찾기
          </h2>

          <div className="mb-6">
            <p className="mb-4 text-sm text-gray-600">
              가입하신 이메일 주소를 입력하시면 인증 코드를 보내드립니다.
            </p>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              이메일 주소
            </label>
            <input
              type="email"
              id="email"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
              placeholder="이메일 주소를 입력하세요"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {message && (
            <div className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-600">
              {message}
            </div>
          )}

          <button
            type="submit"
            className={`w-full rounded-md px-4 py-3 text-center text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              loading
                ? "bg-gray-500 cursor-wait"
                : "bg-gray-800 hover:bg-gray-900 focus:ring-gray-800"
            }`}
            disabled={loading}
          >
            {loading ? "인증 코드 전송 중..." : "인증 코드 받기"}
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

export default ForgotPasswordPage;
