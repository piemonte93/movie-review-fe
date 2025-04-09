import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8080/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor for adding auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // 401 Unauthorized 오류만 로그아웃 처리
    if (error.response?.status === 401) {
      console.log("API 오류: 401 Unauthorized - 로그아웃 처리");
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    // 403 Forbidden은 로그아웃하지 않고 오류 로그만 출력
    else if (error.response?.status === 403) {
      console.log("API 오류: 403 Forbidden - 권한이 없지만 로그아웃하지 않음");
    }
    return Promise.reject(error);
  }
);

export default api;
