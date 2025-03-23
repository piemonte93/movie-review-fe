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

// AuthResponse 인터페이스를 백엔드 응답 구조와 일치하도록 수정
export interface AuthResponse {
  token: string;
  id?: number;
  username?: string;
  email?: string;
  roles?: string[];
  type?: string;
  user?: {
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

      // 디버깅: 응답 데이터 출력
      console.log("로그인 응답:", response.data);

      // JwtResponse 형식에 맞게 구조 변환
      // 백엔드가 user 객체로 감싸서 주지 않고 flat 구조로 응답을 보내는 경우 처리
      const userData = {
        id: response.data.id || 0,
        username: response.data.username || "",
        email: response.data.email || "",
        roles: response.data.roles || [],
      };

      console.log("변환된 사용자 정보:", userData);

      // 토큰 저장
      localStorage.setItem("token", response.data.token);
      localStorage.setItem("user", JSON.stringify(userData));

      // 프론트엔드에서 사용할 사용자 정보 형식으로 변환하여 반환
      return {
        token: response.data.token,
        user: userData,
      };
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
    console.log("로컬스토리지에서 가져온 사용자 정보 문자열:", userStr);

    if (userStr) {
      try {
        const parsedUser = JSON.parse(userStr);
        console.log("파싱된 사용자 정보:", parsedUser);
        return parsedUser;
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
