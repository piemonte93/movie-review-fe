import axios from "axios";

// 백엔드 서버 URL
const BASE_URL = "http://localhost:8080";

// Axios 인스턴스 생성
const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: false, // CORS 문제 해결을 위해 credentials 비활성화
});

// 요청 인터셉터 - 토큰 추가
apiClient.interceptors.request.use(
  (config) => {
    // 매 요청마다 로컬 스토리지에서 새로 토큰을 가져옴
    const token = localStorage.getItem("token");

    // 디버깅용 로그 (개발 중에만 사용)
    console.log(`API 요청 [${config.method?.toUpperCase()}] ${config.url}`);
    console.log("토큰 상태:", token ? "있음" : "없음");

    if (token) {
      // 토큰이 있으면 인증 헤더 추가
      config.headers["Authorization"] = `Bearer ${token}`;
    } else {
      // 토큰이 없으면 인증 헤더 삭제 (이미 있을 경우)
      if (config.headers && config.headers["Authorization"]) {
        delete config.headers["Authorization"];
      }
    }

    return config;
  },
  (error) => {
    console.error("API 요청 인터셉터 오류:", error);
    return Promise.reject(error);
  }
);

// 응답 인터셉터 - 401/403 오류 처리
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // 오류 요약 정보 얻기
    const requestMethod = error.config?.method?.toUpperCase() || "알 수 없음";
    const requestUrl = error.config?.url || "알 수 없음";
    const statusCode = error.response?.status;
    const errorMessage = error.message || "알 수 없음";

    console.log(
      `API 오류 [${requestMethod} ${requestUrl}] ${statusCode}: ${errorMessage}`
    );

    // OAuth 관련 경로 확인 (로그아웃 처리 제외 대상)
    const isOAuthPath =
      requestUrl.includes("/oauth2/") ||
      requestUrl.includes("/api/auth/oauth") ||
      requestUrl.includes("/api/auth/check-username") ||
      requestUrl.includes("/api/auth/update-username");

    // 로그인 요청인지 확인 (로그아웃 처리 제외 대상)
    const isLoginPath = requestUrl.includes("/api/auth/login");

    // 401 Unauthorized (인증 실패) 처리
    if (
      error.response &&
      error.response.status === 401 &&
      !isOAuthPath &&
      !isLoginPath
    ) {
      console.log("401 오류 발생 - 로그아웃 처리 (OAuth 경로와 로그인 제외)");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    // 403 Forbidden (권한 부족) 처리 - 로그아웃하지 않고 오류만 표시
    else if (error.response && error.response.status === 403) {
      console.log("403 오류 발생 - 권한이 없습니다. 로그아웃하지 않습니다.");
      // 토큰 유효성 체크
      const token = localStorage.getItem("token");
      if (token) {
        try {
          // 토큰 디코딩
          const payload = JSON.parse(atob(token.split(".")[1]));
          const username = payload.sub;
          console.log(
            `현재 토큰의 사용자: ${username} - 토큰은 유효하지만 권한이 없습니다.`
          );
        } catch (e) {
          console.error("토큰 디코딩 오류:", e);
        }
      }
    }
    // OAuth 또는 로그인 관련 401 오류 처리
    else if (
      error.response &&
      error.response.status === 401 &&
      (isOAuthPath || isLoginPath)
    ) {
      console.log("OAuth 또는 로그인 관련 401 오류 - 로그아웃 처리 생략");
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
  isNewUser?: boolean; // 구글 로그인 시 새 사용자 여부 추가
  user?: {
    id: number;
    email: string;
    username: string;
    roles: string[];
    status?: "ACTIVE" | "BLOCKED" | "DELETED"; // 사용자 상태 필드 추가
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

export interface EmailVerificationRequest {
  email: string;
  code?: string;
}

// 인증 API
export const authApi = {
  // 로그인 API
  login: async (loginData: LoginRequest): Promise<AuthResponse> => {
    try {
      const response = await apiClient.post("/api/auth/login", {
        email: loginData.email,
        password: loginData.password,
      });

      // 백엔드 응답을 프론트엔드 AuthResponse 형식으로 변환
      if (response.data && response.data.token) {
        // 토큰 저장
        localStorage.setItem("token", response.data.token);

        // 사용자 정보 구성
        const userData = {
          id: response.data.id,
          username: response.data.username,
          email: response.data.email,
          roles: response.data.roles || [],
        };

        // 로컬 스토리지에 사용자 정보 저장
        localStorage.setItem("user", JSON.stringify(userData));

        // 응답 형식 변환
        return {
          token: response.data.token,
          user: userData,
        };
      }

      throw new Error("로그인 응답이 유효하지 않습니다.");
    } catch (error) {
      console.error("로그인 실패:", error);
      throw error;
    }
  },

  // 회원가입 API
  register: async (registerData: RegisterRequest): Promise<AuthResponse> => {
    try {
      const response = await apiClient.post<AuthResponse>(
        "/api/auth/register",
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
  getCurrentUser: async () => {
    const userStr = localStorage.getItem("user");
    console.log("로컬스토리지에서 가져온 사용자 정보 문자열:", userStr);

    if (userStr) {
      try {
        const parsedUser = JSON.parse(userStr);
        console.log("파싱된 사용자 정보:", parsedUser);

        // 토큰이 있다면 사용자 상태를 서버에서 확인
        const token = localStorage.getItem("token");
        if (token) {
          try {
            // 사용자 상태 정보 가져오기
            const userStatusResponse = await apiClient.get("/api/users/status");
            if (userStatusResponse.data && userStatusResponse.data.status) {
              // 사용자 정보에 상태 추가
              parsedUser.status = userStatusResponse.data.status;

              // 로컬 스토리지에 업데이트된 정보 저장
              localStorage.setItem("user", JSON.stringify(parsedUser));
            }
          } catch (error) {
            console.error("사용자 상태 정보 로드 실패:", error);
          }
        }

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
        "/api/auth/forgot-password",
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
        "/api/auth/verify-code",
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
        "/api/auth/reset-password",
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

  // 구글 OAuth 로그인 URL 생성 및 리다이렉트
  googleLogin: () => {
    // OAuth 관련 설정
    const GOOGLE_AUTH_URL = `${BASE_URL}/api/auth/oauth2/authorize/google`;

    // 리다이렉트 URL - 하드코딩으로 정확한 URI 설정
    const REDIRECT_URI = "http://localhost:5173/oauth2/redirect";

    // 구글 로그인 URL 생성
    const googleAuthUrl = `${GOOGLE_AUTH_URL}?redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;

    console.log("구글 로그인 URL:", googleAuthUrl);

    // 구글 로그인 페이지로 리다이렉트
    window.location.href = googleAuthUrl;
  },

  // OAuth 리다이렉트 처리
  handleOAuthRedirect: async (token: string): Promise<AuthResponse> => {
    try {
      // URL에서 isNewUser 파라미터 확인 (URL 파라미터로 직접 전달된 경우)
      const urlParams = new URLSearchParams(window.location.search);
      const isNewUserParam = urlParams.get("isNewUser") === "true";

      console.log("URL 파라미터의 isNewUser:", isNewUserParam);
      console.log(
        "handleOAuthRedirect 처리 시작 - 토큰:",
        token.substring(0, 10) + "..."
      );

      // 사전에 로컬 스토리지 확인 및 초기화
      const existingToken = localStorage.getItem("token");
      if (existingToken) {
        console.log(
          "기존 토큰 발견, 제거합니다:",
          existingToken.substring(0, 10) + "..."
        );
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }

      // 토큰 저장 (API 호출 전에 저장하여 API 호출 시 인증 헤더가 포함되도록 함)
      console.log("새 토큰 저장:", token.substring(0, 10) + "...");
      localStorage.setItem("token", token);

      // 토큰으로 사용자 정보 요청
      console.log("사용자 정보 요청 시작...");
      const response = await apiClient.get<AuthResponse>(
        "/api/auth/user-info",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      console.log("사용자 정보 응답:", response.data);

      // 응답에서 필요한 정보 추출 및 검증
      if (!response.data) {
        throw new Error("서버 응답에 데이터가 없습니다");
      }

      // 사용자 정보 처리 - 기본값 제공으로 안정성 향상
      const userData = {
        id: response.data.id || 0,
        username: response.data.username || "사용자",
        email: response.data.email || "",
        roles: response.data.roles || ["ROLE_USER"],
        profileImageUrl: response.data.profileImageUrl,
        status: response.data.status,
        bio: response.data.bio,
      };

      console.log("변환된 사용자 정보:", userData);

      // 필수 정보 검증
      if (!userData.email) {
        console.warn("사용자 이메일이 비어있습니다. 응답:", response.data);
      }

      // 사용자 정보 저장
      try {
        const userDataString = JSON.stringify(userData);
        console.log("저장할 사용자 정보 문자열:", userDataString);
        localStorage.setItem("user", userDataString);

        // 저장 확인
        const savedUser = localStorage.getItem("user");
        if (!savedUser) {
          console.error("사용자 정보가 저장되지 않았습니다. 다시 시도합니다.");
          localStorage.setItem("user", userDataString);
        }
        console.log("로컬스토리지에 저장된 사용자 정보:", savedUser);
      } catch (err) {
        console.error("사용자 정보 저장 중 오류:", err);
        // 오류 발생 시 간단한 형태로 다시 저장 시도
        try {
          const simpleUser = JSON.stringify({
            id: userData.id,
            email: userData.email,
            username: userData.username,
            roles: ["ROLE_USER"],
          });
          localStorage.setItem("user", simpleUser);
          console.log("간단한 형태로 사용자 정보 저장 완료");
        } catch (e) {
          console.error("사용자 정보 재저장 실패:", e);
        }
      }

      // 구글 로그인 사용자가 새 사용자인지 여부
      // API 응답의 isNewUser 또는 URL 파라미터의 isNewUser 중 하나라도 true면 true
      const isNewUser = response.data.isNewUser || isNewUserParam;

      console.log("API 응답의 isNewUser:", response.data.isNewUser);
      console.log("최종 isNewUser 결정:", isNewUser);
      console.log("handleOAuthRedirect 처리 완료");

      // 반환 형태 맞추기
      return {
        token: token,
        user: userData,
        isNewUser: isNewUser,
      };
    } catch (error: any) {
      console.error("OAuth 리다이렉트 처리 실패:", error);
      // 오류 상세 정보 기록
      if (error.response) {
        console.error("응답 오류:", {
          status: error.response.status,
          data: error.response.data,
          headers: error.response.headers,
        });
      } else if (error.request) {
        console.error("요청 오류 (응답 없음):", error.request);
      } else {
        console.error("오류 메시지:", error.message);
      }

      // 오류 발생 시 로컬 스토리지 상태 확인
      console.error("오류 발생 시 로컬 스토리지:", {
        token: localStorage.getItem("token"),
        user: localStorage.getItem("user"),
      });

      throw error;
    }
  },

  // 닉네임 중복 체크
  checkUsername: async (username: string): Promise<boolean> => {
    try {
      const response = await apiClient.get<{ available: boolean }>(
        `/api/auth/check-username?username=${encodeURIComponent(username)}`
      );
      return response.data.available;
    } catch (error) {
      console.error("닉네임 중복 체크 실패:", error);
      throw error;
    }
  },

  // 닉네임 업데이트
  updateUsername: async (username: string): Promise<AuthResponse> => {
    try {
      const response = await apiClient.post<AuthResponse>(
        "/api/auth/update-username",
        { username }
      );

      // 사용자 정보 업데이트
      const userData = {
        id: response.data.id || 0,
        username: username, // 업데이트된 닉네임
        email: response.data.email || "",
        roles: response.data.roles || [],
      };

      // 로컬스토리지 사용자 정보 업데이트
      localStorage.setItem("user", JSON.stringify(userData));

      return response.data;
    } catch (error) {
      console.error("닉네임 업데이트 실패:", error);
      throw error;
    }
  },

  // OAuth 회원가입 취소
  cancelOAuthSignup: async (): Promise<MessageResponse> => {
    try {
      const response = await apiClient.delete<MessageResponse>(
        "/api/auth/cancel-oauth-signup"
      );

      // 로컬 스토리지 초기화
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      console.log("OAuth 회원가입 취소 완료:", response.data);
      return response.data;
    } catch (error) {
      console.error("OAuth 회원가입 취소 실패:", error);
      // 오류가 발생해도 로컬 스토리지는 초기화
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      throw error;
    }
  },

  // 이메일 중복 체크
  checkEmail: async (email: string): Promise<boolean> => {
    try {
      const response = await apiClient.get<{ available: boolean }>(
        `/api/auth/public/check-email?email=${encodeURIComponent(email)}`
      );
      return response.data.available;
    } catch (error) {
      console.error("이메일 중복 체크 실패:", error);
      throw error;
    }
  },

  // 이메일 인증 코드 요청
  sendVerificationCode: async (email: string): Promise<MessageResponse> => {
    try {
      const response = await apiClient.post<MessageResponse>(
        "/api/auth/send-verification-code",
        { email }
      );
      return response.data;
    } catch (error) {
      console.error("이메일 인증 코드 요청 실패:", error);
      throw error;
    }
  },

  // 이메일 인증 코드 확인
  verifyEmail: async (
    email: string,
    code: string
  ): Promise<MessageResponse> => {
    try {
      const response = await apiClient.post<MessageResponse>(
        "/api/auth/verify-email",
        { email, code }
      );
      return response.data;
    } catch (error) {
      console.error("이메일 인증 코드 확인 실패:", error);
      throw error;
    }
  },
};

export default authApi;
