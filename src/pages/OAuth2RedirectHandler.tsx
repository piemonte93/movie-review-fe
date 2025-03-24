import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { authApi } from "../api/authApi";
import { useAuth } from "../context/AuthContext";
import UsernameModal from "../components/UsernameModal";

// OAuth2RedirectHandler 컴포넌트
const OAuth2RedirectHandler: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  const [processing, setProcessing] = useState(true);

  // 닉네임 모달 상태
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [tempUser, setTempUser] = useState<any>(null);

  useEffect(() => {
    // URL에서 token 파라미터 추출
    const params = new URLSearchParams(location.search);
    const token = params.get("token");
    const error = params.get("error");
    const isNewUserParam = params.get("isNewUser"); // URL에서 isNewUser 파라미터 추출

    // 모든 쿼리 파라미터 출력
    console.log(
      "OAuth2Redirect 쿼리 파라미터:",
      Object.fromEntries([...params])
    );
    console.log("isNewUser 파라미터:", isNewUserParam); // 디버깅용 로그 추가
    setDebugInfo(JSON.stringify(Object.fromEntries([...params])));

    const handleAuth = async () => {
      // 일반 회원가입으로 가입된 이메일 계정으로 구글 로그인 시도 시 오류 처리
      if (error === "email_exists_regular_account") {
        setError(
          "이 이메일은 일반 회원가입으로 이미 가입된 계정입니다. 일반 로그인을 이용해주세요."
        );
        setProcessing(false);
        setTimeout(
          () =>
            navigate("/login", {
              state: {
                message:
                  "이 이메일은 일반 회원가입으로 이미 가입된 계정입니다. 일반 로그인을 이용해주세요.",
              },
            }),
          3000
        );
        return;
      }

      if (error) {
        console.error("OAuth 인증 오류:", error);
        setError(`인증 과정에서 오류가 발생했습니다: ${error}`);
        setProcessing(false);
        setTimeout(() => navigate("/login"), 5000);
        return;
      }

      if (token) {
        try {
          console.log("토큰 발견: ", token.substring(0, 10) + "...");
          console.log("토큰 처리 시작...");

          // 처리 전 로컬 스토리지 상태 확인
          console.log("로컬 스토리지 (토큰 처리 전):", {
            token: localStorage.getItem("token"),
            user: localStorage.getItem("user"),
          });

          // 토큰으로 사용자 정보 가져오기
          const authResponse = await authApi.handleOAuthRedirect(token);

          // 토큰 처리 후 로컬 스토리지 상태 확인
          console.log("로컬 스토리지 (토큰 처리 후):", {
            token: localStorage.getItem("token"),
            user: localStorage.getItem("user"),
          });

          // URL 파라미터 isNewUser 값과 API 응답의 isNewUser 값 둘 다 확인
          // "true" 문자열 또는 true 값이면 새 사용자로 처리
          const isNewUserFromURL = isNewUserParam === "true";
          const isNewUser = authResponse.isNewUser || isNewUserFromURL;

          console.log("URL의 isNewUser:", isNewUserFromURL);
          console.log("API 응답의 isNewUser:", authResponse.isNewUser);
          console.log("최종 isNewUser 결정:", isNewUser);

          // 새 사용자인 경우 닉네임 입력 모달 표시
          if (isNewUser) {
            console.log("신규 사용자 회원가입 - 닉네임 입력 모달 표시");
            setTempToken(token);
            setTempUser(authResponse.user);
            setShowUsernameModal(true);
            setProcessing(false);
            return;
          }

          // 인증 컨텍스트 업데이트 (기존 사용자)
          if (authResponse && authResponse.token && authResponse.user) {
            console.log("기존 사용자 로그인 처리 중...");

            // 로그인 처리
            login(authResponse.token, authResponse.user);
            console.log("로그인 처리 완료, 홈 화면으로 이동 준비 중");

            // 로그인 처리 후 로컬 스토리지 상태 확인
            console.log("로컬 스토리지 (로그인 처리 후):", {
              token: localStorage.getItem("token"),
              user: localStorage.getItem("user"),
            });

            // React 상태 업데이트가 완료되도록 충분한 지연 시간 제공
            setProcessing(false);

            // 페이지 이동 전에 토큰 상태 다시 확인
            setTimeout(() => {
              // 이동 직전 토큰 다시 확인
              const finalToken = localStorage.getItem("token");
              const finalUser = localStorage.getItem("user");

              console.log("홈 화면으로 이동 직전 토큰 상태:", {
                token: finalToken ? "있음" : "없음",
                user: finalUser ? "있음" : "없음",
              });

              if (!finalToken || !finalUser) {
                console.error("홈 화면 이동 직전 인증 정보가 사라짐!");
                // 토큰이 사라졌다면 다시 저장 시도
                localStorage.setItem("token", authResponse.token);
                localStorage.setItem("user", JSON.stringify(authResponse.user));
                console.log("토큰 재저장 완료");
              }

              console.log("홈 화면으로 이동 중...");
              navigate("/", { replace: true }); // replace: true로 히스토리 대체
            }, 500); // 500ms 지연
          } else {
            throw new Error("유효하지 않은 인증 응답");
          }
        } catch (err: any) {
          console.error("OAuth 리다이렉트 처리 오류:", err);
          console.error("오류 세부 정보:", {
            message: err.message,
            status: err.response?.status,
            data: err.response?.data,
          });

          // 현재 로컬 스토리지 상태 확인
          console.log("오류 발생 시 로컬 스토리지:", {
            token: localStorage.getItem("token"),
            user: localStorage.getItem("user"),
          });

          setError(
            `인증 정보를 처리하는 중 오류가 발생했습니다: ${err.message}`
          );
          setProcessing(false);
          setTimeout(() => navigate("/login"), 5000);
        }
      } else {
        setError(
          "인증 토큰을 찾을 수 없습니다. URL 쿼리 파라미터를 확인하세요."
        );
        setProcessing(false);
        setTimeout(() => navigate("/login"), 5000);
      }
    };

    handleAuth();
  }, [location, navigate, login]);

  // 닉네임 저장 처리
  const handleSaveUsername = async (username: string) => {
    try {
      console.log("닉네임 저장 처리 시작:", username);

      // 닉네임 업데이트 API 호출
      await authApi.updateUsername(username);
      console.log("닉네임 업데이트 API 호출 성공");

      // 저장된 사용자 정보 업데이트
      if (tempToken && tempUser) {
        console.log("임시 토큰과 사용자 정보가 있음, 로그인 처리 중...");

        // 닉네임 업데이트된 사용자 정보로 로그인 처리
        const updatedUser = {
          ...tempUser,
          username: username,
        };

        // 로그인 처리
        login(tempToken, updatedUser);
        console.log("로그인 처리 완료");

        // 로컬 스토리지 확인
        console.log("닉네임 저장 후 로컬 스토리지:", {
          token: localStorage.getItem("token"),
          user: localStorage.getItem("user"),
        });

        // 홈으로 이동
        console.log("홈 화면으로 이동 중...");
        navigate("/");
      } else {
        console.error("임시 토큰 또는 사용자 정보가 없음");
        setError("사용자 정보가 없어 로그인을 완료할 수 없습니다.");
      }
    } catch (error: any) {
      console.error("닉네임 저장 오류:", error);
      console.error("오류 세부 정보:", {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
      setError(`닉네임을 저장하는 중 오류가 발생했습니다: ${error.message}`);
    }
  };

  return (
    <>
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-8 shadow-md">
          {processing ? (
            <div className="text-center">
              <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600 mx-auto"></div>
              <p className="text-lg font-medium text-gray-700">
                로그인 처리 중...
              </p>
              <p className="mt-2 text-sm text-gray-500">잠시만 기다려주세요.</p>
              {debugInfo && (
                <div className="mt-4 p-2 bg-gray-100 rounded text-xs text-left overflow-auto">
                  <p className="font-semibold">디버그 정보:</p>
                  <pre>{debugInfo}</pre>
                </div>
              )}
            </div>
          ) : error ? (
            <div className="text-center">
              <div className="mb-4 flex justify-center">
                <svg
                  className="h-12 w-12 text-red-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  ></path>
                </svg>
              </div>
              <p className="text-lg font-medium text-red-600">{error}</p>
              <p className="mt-2 text-sm text-gray-500">
                5초 후 로그인 페이지로 이동합니다.
              </p>
              {debugInfo && (
                <div className="mt-4 p-2 bg-gray-100 rounded text-xs text-left overflow-auto">
                  <p className="font-semibold">디버그 정보:</p>
                  <pre>{debugInfo}</pre>
                </div>
              )}
            </div>
          ) : !showUsernameModal ? (
            <div className="text-center">
              <div className="mb-4 flex justify-center">
                <svg
                  className="h-12 w-12 text-blue-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  ></path>
                </svg>
              </div>
              <p className="text-lg font-medium text-gray-700">로그인 성공!</p>
              <p className="mt-2 text-sm text-gray-500">
                메인 페이지로 이동합니다.
              </p>
            </div>
          ) : null}
        </div>
      </div>

      {/* 닉네임 설정 모달 */}
      <UsernameModal
        isOpen={showUsernameModal}
        onClose={() => {
          // 모달 닫기 시 회원가입 취소 및 계정 삭제 처리
          setShowUsernameModal(false);

          // 닉네임 설정 취소 시 계정 삭제 API 호출
          setProcessing(true);
          setError(null);

          authApi
            .cancelOAuthSignup()
            .then(() => {
              console.log("구글 OAuth 회원가입이 취소되었습니다.");
              // 로그인 페이지로 이동
              navigate("/login");
            })
            .catch((err) => {
              console.error("회원가입 취소 중 오류 발생:", err);
              setError("회원가입 취소 중 오류가 발생했습니다.");
              setTimeout(() => navigate("/login"), 3000);
            })
            .finally(() => {
              setProcessing(false);
            });
        }}
        onSave={handleSaveUsername}
        initialUsername={tempUser?.name || ""}
        email={tempUser?.email || ""}
      />
    </>
  );
};

export default OAuth2RedirectHandler;
