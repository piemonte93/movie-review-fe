import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FaGoogle } from 'react-icons/fa';
import { authApi } from '../api/authApi';
import { useAuth } from '../context/AuthContext';

interface LocationState {
  message?: string;
}

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 회원가입 성공 등의 메시지를 처리
  useEffect(() => {
    const state = location.state as LocationState;
    if (state?.message) {
      setSuccessMessage(state.message);
      // 5초 후 메시지 제거
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [location.state]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 유효성 검사
    if (!email || !password) {
      setError('이메일과 비밀번호를 모두 입력해주세요.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 실제 API 호출하기
      const response = await authApi.login({ email, password });
      
      // 컨텍스트에 로그인 상태 업데이트
      login(response.token, response.user);
      
      // 로그인 성공 시 홈페이지로 이동
      navigate('/');
    } catch (err: any) {
      if (err.response) {
        // 서버 응답이 있는 에러
        if (err.response.status === 401) {
          setError('이메일 또는 비밀번호가 올바르지 않습니다.');
        } else {
          setError('로그인에 실패했습니다. 나중에 다시 시도해주세요.');
        }
      } else {
        // 네트워크 오류 등
        setError('서버에 연결할 수 없습니다. 인터넷 연결을 확인해주세요.');
        
        // 백엔드가 없는 경우 모킹
        console.log('백엔드 API가 없습니다. 모킹 데이터를 사용합니다.');
        
        // 모킹 데이터로 로그인
        const mockUser = {
          id: 1,
          username: email.split('@')[0],
          email,
          roles: ['USER']
        };
        
        // 컨텍스트에 로그인 상태 업데이트
        login('mock-token', mockUser);
        
        // 로그인 성공 시뮬레이션 (1초 지연)
        setTimeout(() => {
          navigate('/');
        }, 1000);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    // Google OAuth 로그인 구현 (실제로는 OAuth 인증 플로우가 필요)
    console.log('Google 로그인 시도');
  };

  return (
    <div className="flex min-h-[calc(100vh-64px)] flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <form 
          className="mb-6 rounded-lg border border-gray-200 bg-white p-8 shadow-md"
          onSubmit={handleLogin}
        >
          {successMessage && (
            <div className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-600">
              {successMessage}
            </div>
          )}
          
          <div className="mb-6">
            <label htmlFor="email" className="mb-2 block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              id="email"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
              placeholder="Value"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <div className="mb-6">
            <label htmlFor="password" className="mb-2 block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              type="password"
              id="password"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
              placeholder="Value"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
            disabled={loading}
          >
            {loading ? '로그인 중...' : 'Sign In'}
          </button>
          
          <div className="mt-4 text-center">
            <Link to="/forgot-password" className="text-sm text-gray-600 hover:text-gray-900">
              Forgot password?
            </Link>
          </div>
          
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600">
              계정이 없으신가요?{' '}
              <Link to="/register" className="font-medium text-blue-600 hover:text-blue-800">
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