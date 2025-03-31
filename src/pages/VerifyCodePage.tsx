import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { authApi } from '../api/authApi';

interface LocationState {
  email?: string;
}

const VerifyCodePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState;
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(600); // 10분 카운트다운

  useEffect(() => {
    // 이메일 상태 확인
    if (state?.email) {
      setEmail(state.email);
    } else {
      // 직접 URL 접근 시 비밀번호 찾기 페이지로 리다이렉트
      navigate('/forgot-password');
    }
  }, [state, navigate]);

  // 카운트다운 타이머
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      setError('인증 시간이 만료되었습니다. 다시 시도해주세요.');
    }
  }, [countdown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 유효성 검사
    if (!code || code.length !== 6) {
      setError('6자리 인증 코드를 입력해주세요.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 인증 코드 확인 API 호출
      const response = await authApi.verifyCode(email, code);
      
      // 비밀번호 재설정 페이지로 이동
      navigate('/reset-password', { 
        state: { 
          token: response.token,
          email 
        } 
      });
    } catch (err: any) {
      if (err.response) {
        setError(err.response.data.message || '인증 코드가 유효하지 않습니다.');
      } else {
        setError('서버에 연결할 수 없습니다. 인터넷 연결을 확인해주세요.');
      }
    } finally {
      setLoading(false);
    }
  };

  // 남은 시간 형식화 (mm:ss)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 인증 코드 재전송
  const resendCode = async () => {
    setLoading(true);
    setError(null);

    try {
      // 비밀번호 재설정 요청 API 다시 호출
      await authApi.requestPasswordReset(email);
      // 카운트다운 재설정
      setCountdown(600);
      setError(null);
    } catch (err: any) {
      if (err.response) {
        setError(err.response.data.message || '인증 코드 재전송에 실패했습니다.');
      } else {
        setError('서버에 연결할 수 없습니다. 인터넷 연결을 확인해주세요.');
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
          <h2 className="mb-6 text-center text-2xl font-bold text-gray-900">인증 코드 확인</h2>
          
          <div className="mb-6">
            <p className="mb-4 text-sm text-gray-600">
              <span className="font-semibold">{email}</span>로 전송된 6자리 인증 코드를 입력해주세요.
            </p>
            
            <div className="mb-4 text-center">
              <span className="text-sm font-medium text-gray-500">남은 시간: </span>
              <span className={`font-mono font-medium ${countdown < 60 ? 'text-red-500' : 'text-gray-700'}`}>
                {formatTime(countdown)}
              </span>
            </div>
            
            <label htmlFor="code" className="mb-2 block text-sm font-medium text-gray-700">
              인증 코드
            </label>
            <input
              type="text"
              id="code"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-center text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
              placeholder="6자리 인증 코드"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
              maxLength={6}
              required
            />
          </div>

          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full rounded-md bg-gray-800 px-4 py-3 text-center text-sm font-medium text-white hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-800 focus:ring-offset-2"
            disabled={loading || countdown === 0}
          >
            {loading ? '확인 중...' : '인증 코드 확인'}
          </button>

          <div className="mt-4 flex justify-between">
            <button
              type="button"
              onClick={resendCode}
              className="text-sm font-medium text-blue-600 hover:text-blue-800"
              disabled={loading}
            >
              인증 코드 재전송
            </button>
            <Link to="/forgot-password" className="text-sm text-gray-600 hover:text-gray-900">
              이메일 변경
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VerifyCodePage;