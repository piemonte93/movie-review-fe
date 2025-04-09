import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { authApi } from "../api/authApi"; // handleOAuthRedirect 대신 authApi 객체 전체를 가져옴
import { toast } from "react-toastify";
import UsernameModal from "../components/UsernameModal";

// OAuth2RedirectHandler 컴포넌트
const OAuth2RedirectHandler: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { login, user, isLoggedIn } = useAuth(); // login 함수와 상태 가져오기
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 닉네임 모달 상태
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [tempUser, setTempUser] = useState<any>(null);

  useEffect(() => {
    const handleAuth = async () => {
      setLoading(true);
      setError(null);
      console.log("OAuth2RedirectHandler 마운트됨, 인증 처리 시작");

      const params = new URLSearchParams(location.search);
      const token = params.get("token");
      const isNewUserParam = params.get("isNewUser");
      console.log("OAuth2Redirect 쿼리 파라미터:", {
        token: token ? "있음" : "없음",
        isNewUser: isNewUserParam,
      });

      if (token) {
        console.log("토큰 발견:", token ? "있음" : "없음");
        console.log("토큰 처리 시작...");
        console.log("로컬 스토리지 (토큰 처리 전):", {
          token: localStorage.getItem("token") ? "있음" : "없음",
          user: localStorage.getItem("user") ? "있음" : "없음",
        });

        try {
          // handleOAuthRedirect 호출을 authApi.handleOAuthRedirect로 수정
          const { user: fetchedUser, isNewUser: determinedIsNewUser } =
            await authApi.handleOAuthRedirect(token, isNewUserParam === "true");

          console.log("로컬 스토리지 (토큰 처리 후):", {
            token: localStorage.getItem("token") ? "있음" : "없음",
            user: localStorage.getItem("user") ? "있음" : "없음",
          });

          // API에서 반환된 사용자 정보와 isNewUser 상태 확인
          console.log("API 응답의 isNewUser:", determinedIsNewUser);
          console.log("최종 isNewUser 결정:", determinedIsNewUser);

          if (determinedIsNewUser) {
            console.log("신규 사용자, 프로필 설정 페이지로 이동");
            // 신규 사용자인 경우, AuthContext의 login을 호출할 필요 없이
            // 이미 handleOAuthRedirect에서 토큰과 임시 사용자 정보가 저장되었으므로
            // 바로 프로필 설정 페이지로 이동시킨다.
            // ProfileEditPage에서 AuthContext를 통해 사용자 정보를 로드할 것임.
            navigate("/profile-edit", { replace: true });
          } else if (fetchedUser) {
            console.log("기존 사용자 로그인 처리 중...");
            // 기존 사용자의 경우, AuthContext의 login 함수 호출하여 앱 상태 업데이트
            const loginSuccess = await login(token, fetchedUser);

            if (loginSuccess) {
              console.log("로그인 처리 완료, 홈 화면으로 이동 준비 중");
              console.log("로컬 스토리지 (로그인 처리 후):", {
                token: localStorage.getItem("token") ? "있음" : "없음",
                user: localStorage.getItem("user") ? "있음" : "없음",
              });
              // 로그인 성공 후 홈으로 이동
              navigate("/", { replace: true });
            } else {
              // login 함수 실패 시
              console.error("AuthContext login 처리 실패");
              setError(
                "로그인 정보를 앱 상태에 반영하는데 실패했습니다. 다시 시도해주세요."
              );
              toast.error("로그인 처리 중 오류가 발생했습니다.");
              // 실패 시 로그인 페이지로 이동 또는 다른 오류 처리
              navigate("/login", { replace: true });
            }
          } else {
            // handleOAuthRedirect에서 사용자 정보를 가져오지 못한 경우 (이론상 발생 힘듦)
            console.error("handleOAuthRedirect 후 사용자 정보 없음");
            setError(
              "사용자 정보를 가져오는데 실패했습니다. 다시 시도해주세요."
            );
            toast.error("사용자 정보 로딩 중 오류가 발생했습니다.");
            navigate("/login", { replace: true });
          }
        } catch (err: any) {
          console.error("OAuth 처리 중 오류 발생:", err);
          setError(err.message || "OAuth 인증 처리 중 오류가 발생했습니다.");
          toast.error("OAuth 인증 처리 중 오류가 발생했습니다.");
          // 오류 발생 시 로그인 페이지로 이동
          navigate("/login", { replace: true });
        }
      } else {
        // URL에 토큰이 없는 경우
        console.error("URL에 토큰이 없습니다.");
        setError("인증 토큰이 URL에 포함되어 있지 않습니다.");
        toast.error("잘못된 접근입니다. 로그인 페이지로 이동합니다.");
        navigate("/login", { replace: true });
      }

      setLoading(false); // 모든 처리 완료 후 로딩 종료
    };

    handleAuth();

    // useEffect가 마운트 시 한 번만 실행되도록 빈 배열 전달
  }, []); // <-- 의존성 배열을 빈 배열로 설정!

  // 로딩 중 표시
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
        <p className="ml-4 text-lg">로그인 처리 중...</p>
      </div>
    );
  }

  // 오류 발생 시 메시지 표시
  if (error) {
    return (
      <div className="flex flex-col justify-center items-center h-screen text-red-500">
        <p>오류가 발생했습니다: {error}</p>
        <button
          onClick={() => navigate("/login")}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          로그인 페이지로 이동
        </button>
      </div>
    );
  }

  // 로딩과 오류가 없으면 null 반환 (이미 navigate로 이동했어야 함)
  return null;
};

export default OAuth2RedirectHandler;
