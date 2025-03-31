import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaGoogle } from "react-icons/fa";
import { authApi } from "../api/authApi";
import { useAuth } from "../context/AuthContext";

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    username: "",
    verificationCode: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 이메일/닉네임 중복 체크 상태
  const [emailAvailable, setEmailAvailable] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);

  // 인증 코드 발송 상태
  const [codeSent, setCodeSent] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // 카운트다운 타이머
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // 인증 코드 유효 시간 포맷
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // 이메일이나 닉네임 변경 시 중복 체크 상태 초기화
    if (name === "email") {
      setEmailAvailable(false);
      setEmailVerified(false);
      setCodeSent(false);
    } else if (name === "username") {
      setUsernameAvailable(false);
    }
  };

  // 이메일 중복 체크
  const handleCheckEmail = async () => {
    // 이메일 유효성 검사
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email || !emailRegex.test(formData.email)) {
      setError("유효한 이메일 주소를 입력해주세요.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const isAvailable = await authApi.checkEmail(formData.email);
      setEmailAvailable(isAvailable);

      if (isAvailable) {
        setSuccessMessage(
          "사용 가능한 이메일입니다. 인증 코드를 발송해주세요."
        );
      } else {
        setError("이미 사용 중인 이메일입니다.");
      }
    } catch (err) {
      setError("이메일 중복 체크에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  // 닉네임 중복 체크
  const handleCheckUsername = async () => {
    if (!formData.username || formData.username.length < 2) {
      setError("닉네임은 2자 이상이어야 합니다.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const isAvailable = await authApi.checkUsername(formData.username);
      setUsernameAvailable(isAvailable);

      if (isAvailable) {
        setSuccessMessage("사용 가능한 닉네임입니다.");
      } else {
        setError("이미 사용 중인 닉네임입니다.");
      }
    } catch (err) {
      setError("닉네임 중복 체크에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  // 인증 코드 발송
  const handleSendVerificationCode = async () => {
    if (!emailAvailable) {
      setError("먼저 이메일 중복 체크를 해주세요.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await authApi.sendVerificationCode(formData.email);
      setCodeSent(true);
      setCountdown(600); // 10분
      setSuccessMessage(
        "인증 코드가 이메일로 발송되었습니다. 10분 내에 입력해주세요."
      );
    } catch (err) {
      setError("인증 코드 발송에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  // 인증 코드 확인
  const handleVerifyEmail = async () => {
    if (!codeSent) {
      setError("먼저 인증 코드를 발송해주세요.");
      return;
    }

    if (!formData.verificationCode || formData.verificationCode.length !== 6) {
      setError("6자리 인증 코드를 입력해주세요.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await authApi.verifyEmail(formData.email, formData.verificationCode);
      setEmailVerified(true);
      setSuccessMessage("이메일 인증이 완료되었습니다.");
    } catch (err) {
      setError("잘못된 인증 코드입니다. 다시 확인해주세요.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation(); // 이벤트 전파 중지 추가

    // 유효성 검사
    if (
      !formData.email ||
      !formData.password ||
      !formData.confirmPassword ||
      !formData.username
    ) {
      setError("모든 필드를 입력해주세요.");
      return;
    }

    if (!emailAvailable || !emailVerified) {
      setError("이메일 인증을 완료해주세요.");
      return;
    }

    if (!usernameAvailable) {
      setError("닉네임 중복 체크를 완료해주세요.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }

    if (formData.password.length < 6) {
      setError("비밀번호는 최소 6자 이상이어야 합니다.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // API 호출
      const response = await authApi.register({
        email: formData.email,
        password: formData.password,
        username: formData.username,
      });

      // 회원가입 성공
      navigate("/login", {
        state: { message: "회원가입이 완료되었습니다. 로그인해주세요." },
      });
    } catch (err: any) {
      if (err.response) {
        // 서버 응답이 있는 에러
        if (err.response.status === 409) {
          setError("이미 사용 중인 이메일 또는 사용자 이름입니다.");
        } else {
          setError("회원가입에 실패했습니다. 나중에 다시 시도해주세요.");
        }
      } else {
        // 네트워크 오류 등
        setError("서버에 연결할 수 없습니다. 인터넷 연결을 확인해주세요.");

        // 백엔드가 없는 경우 모킹 (성공 시뮬레이션)
        console.log("백엔드 API가 없습니다. 모킹 데이터를 사용합니다.");

        // 개발 환경에서만 모킹 기능 사용
        if (import.meta.env.DEV) {
          // 회원가입 후 자동 로그인 (모킹)
          if (false) {
            // 자동 로그인이 필요하다면 이 부분을 수정
            const mockUser = {
              id: 1,
              username: formData.username,
              email: formData.email,
              roles: ["USER"],
            };
            login("mock-token", mockUser);
            navigate("/");
          } else {
            setTimeout(() => {
              navigate("/login", {
                state: {
                  message: "회원가입이 완료되었습니다. 로그인해주세요.",
                },
              });
            }, 1000);
          }
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = () => {
    // Google OAuth 로그인/회원가입 구현
    console.log("Google 회원가입 시도");
    authApi.googleLogin();
  };

  return (
    <div className="flex min-h-[calc(100vh-64px)] flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <h1 className="mb-6 text-center text-2xl font-bold">회원가입</h1>

        <form
          className="mb-6 rounded-lg border border-gray-200 bg-white p-8 shadow-md"
          onSubmit={handleRegister}
          noValidate // HTML 기본 유효성 검사 비활성화
        >
          {/* 이메일 입력 및 중복 체크 */}
          <div className="mb-4">
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              이메일
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                id="email"
                name="email"
                className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                placeholder="example@email.com"
                value={formData.email}
                onChange={handleChange}
                disabled={emailVerified}
                required
              />
              <button
                type="button"
                onClick={handleCheckEmail}
                disabled={loading || emailVerified}
                className="whitespace-nowrap rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300"
              >
                중복 확인
              </button>
            </div>
            {emailAvailable && !emailVerified && (
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={handleSendVerificationCode}
                  disabled={loading || codeSent}
                  className="flex-1 rounded-md bg-blue-100 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
                >
                  인증 코드 발송
                </button>
              </div>
            )}
          </div>

          {/* 이메일 인증 코드 입력 */}
          {codeSent && !emailVerified && (
            <div className="mb-4">
              <label
                htmlFor="verificationCode"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                인증 코드
                {countdown > 0 && (
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    남은 시간: {formatTime(countdown)}
                  </span>
                )}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  id="verificationCode"
                  name="verificationCode"
                  className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                  placeholder="000000"
                  maxLength={6}
                  value={formData.verificationCode}
                  onChange={handleChange}
                  required
                />
                <button
                  type="button"
                  onClick={handleVerifyEmail}
                  disabled={loading || countdown === 0}
                  className="whitespace-nowrap rounded-md bg-blue-500 px-3 py-2 text-sm font-medium text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300"
                >
                  확인
                </button>
              </div>
            </div>
          )}

          {/* 닉네임 입력 및 중복 체크 */}
          <div className="mb-4">
            <label
              htmlFor="username"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              닉네임
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                id="username"
                name="username"
                className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                placeholder="닉네임을 입력하세요"
                value={formData.username}
                onChange={handleChange}
                required
              />
              <button
                type="button"
                onClick={handleCheckUsername}
                disabled={loading || usernameAvailable}
                className="whitespace-nowrap rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300"
              >
                중복 확인
              </button>
            </div>
          </div>

          <div className="mb-4">
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              비밀번호
            </label>
            <input
              type="password"
              id="password"
              name="password"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
              placeholder="********"
              value={formData.password}
              onChange={handleChange}
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              비밀번호는 최소 6자 이상이어야 합니다.
            </p>
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
              name="confirmPassword"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
              placeholder="********"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
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
            disabled={loading || !emailVerified || !usernameAvailable}
          >
            {loading ? "처리 중..." : "회원가입"}
          </button>

          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600">
              이미 계정이 있으신가요?{" "}
              <Link
                to="/login"
                className="font-medium text-blue-600 hover:text-blue-800"
              >
                로그인하기
              </Link>
            </p>
          </div>
        </form>

        <div className="flex items-center justify-center">
          <button
            onClick={handleGoogleRegister}
            className="flex items-center justify-center rounded-full border border-gray-300 px-6 py-2 text-sm font-medium text-gray-700 transition duration-150 hover:bg-gray-50"
          >
            <FaGoogle className="mr-2 text-red-500" />
            Sign up with Google
          </button>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
