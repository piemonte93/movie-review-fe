import axios from "axios";

// 백엔드 서버 URL
const BASE_URL = "http://localhost:8080/api";

// Axios 인스턴스 생성
const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// 요청 인터셉터 - 토큰 추가
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 응답 인터셉터 - 토큰 만료 처리
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      // 토큰 만료 또는 인증 오류
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      // 로그인 페이지로 리다이렉트
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// 인터페이스 정의
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  username: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: number;
    email: string;
    username: string;
    roles: string[];
  };
}

export interface PasswordResetRequest {
  email: string;
}

export interface VerifyCodeRequest {
  email: string;
  code: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface MessageResponse {
  message: string;
}

export interface TokenResponse {
  token: string;
}

// 인증 API
export const authApi = {
  // 로그인 API
  login: async (loginData: LoginRequest): Promise<AuthResponse> => {
    try {
      const response = await apiClient.post<AuthResponse>(
        "/auth/login",
        loginData
      );
      // 토큰 저장
      localStorage.setItem("token", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data.user));
      return response.data;
    } catch (error) {
      console.error("로그인 실패:", error);
      throw error;
    }
  },

  // 회원가입 API
  register: async (registerData: RegisterRequest): Promise<AuthResponse> => {
    try {
      const response = await apiClient.post<AuthResponse>(
        "/auth/register",
        registerData
      );
      return response.data;
    } catch (error) {
      console.error("회원가입 실패:", error);
      throw error;
    }
  },

  // 로그아웃 처리
  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  },

  // 현재 로그인한 사용자 정보 가져오기
  getCurrentUser: () => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch (e) {
        console.error("사용자 정보 파싱 오류:", e);
        localStorage.removeItem("user"); // 잘못된 형식의 데이터 제거
        return null;
      }
    }
    return null;
  },

  // 로그인 상태 확인
  isLoggedIn: () => {
    return !!localStorage.getItem("token");
  },

  // 비밀번호 재설정 요청
  requestPasswordReset: async (email: string): Promise<MessageResponse> => {
    try {
      const response = await apiClient.post<MessageResponse>(
        "/auth/forgot-password",
        { email }
      );
      return response.data;
    } catch (error) {
      console.error("비밀번호 재설정 요청 실패:", error);
      throw error;
    }
  },

  // 인증 코드 확인
  verifyCode: async (email: string, code: string): Promise<TokenResponse> => {
    try {
      const response = await apiClient.post<TokenResponse>(
        "/auth/verify-code",
        { email, code }
      );
      return response.data;
    } catch (error) {
      console.error("인증 코드 확인 실패:", error);
      throw error;
    }
  },

  // 비밀번호 재설정
  resetPassword: async (
    token: string,
    newPassword: string
  ): Promise<MessageResponse> => {
    try {
      // 요청 데이터 준비
      const requestData = {
        token: token,
        newPassword: newPassword,
      };
      console.log("비밀번호 재설정 요청 데이터:", requestData);
      console.log("JSON 문자열:", JSON.stringify(requestData));

      // 요청 데이터를 직접 지정하여 전송
      const response = await apiClient.post<MessageResponse>(
        "/auth/reset-password",
        JSON.stringify({
          token: token,
          newPassword: newPassword,
        }),
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error("비밀번호 재설정 실패:", error);
      throw error;
    }
  },
};

export default authApi;
