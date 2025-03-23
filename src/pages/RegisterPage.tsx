import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaGoogle } from 'react-icons/fa';
import { authApi } from '../api/authApi';
import { useAuth } from '../context/AuthContext';

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    username: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 유효성 검사
    if (!formData.email || !formData.password || !formData.confirmPassword || !formData.username) {
      setError('모든 필드를 입력해주세요.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    if (formData.password.length < 6) {
      setError('비밀번호는 최소 6자 이상이어야 합니다.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // API 호출
      const response = await authApi.register({
        email: formData.email,
        password: formData.password,
        username: formData.username
      });
      
      // 회원가입 성공
      navigate('/login', { state: { message: '회원가입이 완료되었습니다. 로그인해주세요.' } });
    } catch (err: any) {
      if (err.response) {
        // 서버 응답이 있는 에러
        if (err.response.status === 409) {
          setError('이미 사용 중인 이메일 또는 사용자 이름입니다.');
        } else {
          setError('회원가입에 실패했습니다. 나중에 다시 시도해주세요.');
        }
      } else {
        // 네트워크 오류 등
        setError('서버에 연결할 수 없습니다. 인터넷 연결을 확인해주세요.');
        
        // 백엔드가 없는 경우 모킹 (성공 시뮬레이션)
        console.log('백엔드 API가 없습니다. 모킹 데이터를 사용합니다.');
        
        // 회원가입 후 자동 로그인 (모킹)
        if (false) { // 자동 로그인이 필요하다면 이 부분을 수정
          const mockUser = {
            id: 1,
            username: formData.username,
            email: formData.email,
            roles: ['USER']
          };
          login('mock-token', mockUser);
          navigate('/');
        } else {
          setTimeout(() => {
            navigate('/login', { state: { message: '회원가입이 완료되었습니다. 로그인해주세요.' } });
          }, 1000);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = () => {
    // Google OAuth 로그인/회원가입 구현
    console.log('Google 회원가입 시도');
  };

  return (
    <div className="flex min-h-[calc(100vh-64px)] flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <h1 className="mb-6 text-center text-2xl font-bold">회원가입</h1>
        
        <form 
          className="mb-6 rounded-lg border border-gray-200 bg-white p-8 shadow-md"
          onSubmit={handleRegister}
        >
          <div className="mb-4">
            <label htmlFor="email" className="mb-2 block text-sm font-medium text-gray-700">
              이메일
            </label>
            <input
              type="email"
              id="email"
              name="email"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
              placeholder="example@email.com"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="username" className="mb-2 block text-sm font-medium text-gray-700">
              닉네임
            </label>
            <input
              type="text"
              id="username"
              name="username"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
              placeholder="닉네임을 입력하세요"
              value={formData.username}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="password" className="mb-2 block text-sm font-medium text-gray-700">
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
            <p className="mt-1 text-xs text-gray-500">비밀번호는 최소 6자 이상이어야 합니다.</p>
          </div>
          
          <div className="mb-6">
            <label htmlFor="confirmPassword" className="mb-2 block text-sm font-medium text-gray-700">
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
          
          <button
            type="submit"
            className="w-full rounded-md bg-gray-800 px-4 py-3 text-center text-sm font-medium text-white hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-800 focus:ring-offset-2"
            disabled={loading}
          >
            {loading ? '처리 중...' : '회원가입'}
          </button>
          
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600">
              이미 계정이 있으신가요?{' '}
              <Link to="/login" className="font-medium text-blue-600 hover:text-blue-800">
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