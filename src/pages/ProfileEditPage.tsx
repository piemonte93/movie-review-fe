import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  getUserProfile,
  updateUserProfile,
  uploadProfileImage,
} from "../api/userApi";
import {
  FaUser,
  FaCamera,
  FaCheck,
  FaExclamationTriangle,
} from "react-icons/fa";
import authApi from "../api/authApi";
import { toast } from "react-toastify";

// 프로필 정보를 캐싱하기 위한 로컬 스토리지 키 (필요 시 사용)
// const PROFILE_CACHE_KEY = "cached_profile_data";

const ProfileEditPage: React.FC = () => {
  const { user, isLoggedIn, updateUserInfo, login, authLoading } = useAuth(); // authLoading 추가
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [username, setUsername] = useState("");
  const [originalUsername, setOriginalUsername] = useState(""); // 원래 사용자 이름 저장
  const [bio, setBio] = useState("");
  const [profileImage, setProfileImage] = useState<string | undefined>(
    undefined
  );
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState(""); // 페이지 레벨 오류

  const [usernameChecked, setUsernameChecked] = useState(false); // 사용자 이름 중복 체크 여부
  const [usernameAvailable, setUsernameAvailable] = useState(true); // 사용자 이름 사용 가능 여부
  const [checkingUsername, setCheckingUsername] = useState(false); // 사용자 이름 중복 체크 중 여부

  const [pageLoading, setPageLoading] = useState(true); // 페이지 자체 로딩 상태 추가

  // 사용자 데이터 로딩
  useEffect(() => {
    // authLoading이 true이면 아직 인증 상태 확인 중이므로 대기
    if (authLoading) {
      console.log("ProfileEditPage: AuthContext 로딩 대기 중...");
      setPageLoading(true); // authLoading 중에는 페이지 로딩 상태로 표시
      return;
    }

    console.log("ProfileEditPage: AuthContext 로딩 완료, 로그인 상태 확인");

    // authLoading이 false가 된 후 로그인 상태 확인
    if (!isLoggedIn || !user) {
      console.log("ProfileEditPage: 비로그인 상태 감지, 로그인 페이지로 이동");
      toast.info("로그인이 필요합니다.");
      navigate("/login", { replace: true });
      return; // 로그인 페이지로 이동 후에는 더 이상 진행하지 않음
    }

    // 로그인된 상태이면 프로필 데이터 설정 시작
    console.log("ProfileEditPage: 로그인 상태 확인, 프로필 데이터 설정 시작");
    setPageLoading(true); // 프로필 데이터 로딩 시작 표시
    try {
      // Context의 사용자 정보로 초기화
      console.log("ProfileEditPage: AuthContext 사용자 정보로 초기화:", user);
      setUsername(user.username || "");
      setOriginalUsername(user.username || "");
      setBio(user.bio || "");
      setProfileImage(user.profileImageUrl);
      setUsernameChecked(true); // 초기 상태는 체크된 것으로 간주 (현재 이름 기준)

      // 서버에서 최신 프로필을 다시 가져올 필요는 없어 보임 (Context가 최신이라고 가정)
      setError(""); // 이전 오류 초기화
    } catch (error) {
      // 이 블록은 거의 실행될 일 없지만 안전하게 추가
      console.error("ProfileEditPage: 프로필 정보 초기화 중 오류:", error);
      setError("프로필 정보를 설정하는 중 오류가 발생했습니다.");
      toast.error("프로필 정보 설정 오류.");
    } finally {
      setPageLoading(false); // 프로필 데이터 설정 완료 (성공/실패 무관)
      console.log("ProfileEditPage: 프로필 데이터 설정 완료");
    }

    // fetchUserData 함수를 분리할 필요 없이 useEffect 내에서 직접 처리
  }, [authLoading, isLoggedIn, user, navigate]); // 의존성 배열에 authLoading, isLoggedIn, user 추가

  // 사용자 이름 변경 시 중복 체크 상태 초기화
  useEffect(() => {
    if (username === originalUsername) {
      setUsernameChecked(true); // 원래 이름과 같으면 체크된 것으로 간주
      setUsernameAvailable(true);
    } else {
      setUsernameChecked(false); // 이름이 변경되면 다시 체크 필요
    }
  }, [username, originalUsername]);

  // 사용자 이름 중복 체크 핸들러
  const handleCheckUsername = useCallback(async () => {
    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      toast.error("사용자 이름을 입력해주세요.");
      return;
    }

    if (trimmedUsername === originalUsername) {
      setUsernameChecked(true);
      setUsernameAvailable(true);
      toast.info("현재 사용 중인 이름입니다.");
      return;
    }

    try {
      setCheckingUsername(true);
      const isAvailable = await authApi.checkUsername(trimmedUsername);
      console.log(
        `사용자 이름 "${trimmedUsername}" 중복 체크 결과:`,
        isAvailable
      );
      setUsernameChecked(true);
      setUsernameAvailable(isAvailable);

      if (isAvailable) {
        toast.success(`"${trimmedUsername}"은(는) 사용 가능한 이름입니다.`);
      } else {
        toast.error(
          `"${trimmedUsername}"은(는) 이미 사용 중인 이름입니다. 다른 이름을 입력해주세요.`
        );
      }
    } catch (error) {
      console.error("사용자 이름 중복 체크 실패:", error);
      setUsernameChecked(false); // 실패 시 다시 체크 필요
      toast.error("중복 체크 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setCheckingUsername(false);
    }
  }, [username, originalUsername]); // useCallback 사용하여 최적화

  // 프로필 업데이트 제출 핸들러
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (submitting) return;

    const trimmedUsername = username.trim();
    const originalBio = user?.bio || "";
    const usernameChanged = trimmedUsername !== originalUsername;
    const bioChanged = bio !== originalBio;
    const profileImageFile = fileInputRef.current?.files?.[0]; // 파일이 실제로 있는지 확인

    // 변경사항이 있는지 확인
    if (!usernameChanged && !bioChanged && !profileImageFile) {
      toast.info("변경된 내용이 없습니다.");
      return;
    }

    // 사용자 이름 유효성 검사 및 중복 체크 확인
    if (usernameChanged) {
      if (!trimmedUsername) {
        toast.error("사용자 이름을 입력해주세요.");
        return;
      }
      if (!usernameChecked) {
        toast.warning("사용자 이름 중복 체크를 해주세요.");
        return;
      }
      if (!usernameAvailable) {
        toast.error(
          "이미 사용 중인 사용자 이름입니다. 다른 이름을 입력해주세요."
        );
        return;
      }
    }

    const toastId = toast.loading("프로필 업데이트 중...");
    setSubmitting(true);
    let usernameUpdateSuccess = true;
    let otherUpdatesSuccess = true; // bio 또는 이미지 업데이트 성공 여부
    let proceedWithOtherUpdates = true; // 이름 변경 성공 시 다른 업데이트 진행
    let finalProfileImageUrl = profileImage; // 최종 이미지 URL

    try {
      // 1. 사용자 이름 변경 처리 (변경된 경우에만)
      if (usernameChanged) {
        try {
          console.log("사용자 이름 업데이트 API 호출:", trimmedUsername);
          const response = await authApi.updateUsername(trimmedUsername);
          console.log("사용자 이름 업데이트 응답:", response);

          if (
            response &&
            response.token &&
            response.username &&
            response.username === trimmedUsername &&
            response.id &&
            response.email
          ) {
            console.log("사용자 이름 변경 성공, 새 토큰 및 정보 수신");
            const updatedUser = {
              id: response.id,
              username: response.username,
              email: response.email,
              roles: response.roles,
              status: response.status,
              bio: response.bio, // bio는 이후 단계에서 업데이트 될 수 있음
              profileImageUrl: response.profileImageUrl, // 이미지도 이후 단계에서 업데이트 될 수 있음
              provider: response.provider,
            };
            const loginSuccess = await login(response.token, updatedUser);

            if (loginSuccess) {
              console.log("AuthContext login 성공. 인증 상태 갱신 완료.");
              setOriginalUsername(trimmedUsername);
              setUsernameChecked(true);
            } else {
              console.error(
                "AuthContext login 함수 실패. 인증 상태 갱신 실패."
              );
              throw new Error(
                "인증 정보를 갱신하는 데 실패했습니다. 다시 로그인해주세요."
              );
            }
          } else {
            throw new Error(
              response?.message || "사용자 이름 변경에 실패했습니다."
            );
          }
        } catch (error: any) {
          console.error("사용자 이름 업데이트 중 오류:", error);
          usernameUpdateSuccess = false;
          proceedWithOtherUpdates = false;
          // 오류 토스트는 최종 단계에서 한 번만 표시
          throw error; // 오류를 바깥 catch로 전파
        }
      }

      // 2. 자기소개 또는 프로필 이미지 변경 처리 (이름 변경 성공 또는 시도 없었을 때, 그리고 변경사항 있을 때)
      if (proceedWithOtherUpdates && (bioChanged || profileImageFile)) {
        console.log("자기소개 또는 프로필 이미지 업데이트 시작...");
        try {
          let updateData: { bio?: string; profileImageUrl?: string } = {};
          let imageUpdated = false;

          // 프로필 이미지 업로드 (파일이 있을 경우)
          if (profileImageFile) {
            console.log("프로필 이미지 업로드 API 호출 중...");
            const uploadResponse = await uploadProfileImage(profileImageFile);
            if (uploadResponse && uploadResponse.profileImageUrl) {
              console.log(
                "프로필 이미지 업로드 성공:",
                uploadResponse.profileImageUrl
              );
              finalProfileImageUrl = uploadResponse.profileImageUrl;
              updateData.profileImageUrl = finalProfileImageUrl; // 업데이트 데이터에 추가
              imageUpdated = true;
              setProfileImage(finalProfileImageUrl);
            } else {
              throw new Error("프로필 이미지 업로드에 실패했습니다.");
            }
          }

          // 자기소개 업데이트 (bio가 변경된 경우)
          if (bioChanged) {
            updateData.bio = bio;
          }

          // Bio 또는 Image URL 업데이트 API 호출 (updateData에 내용이 있을 때만)
          if (Object.keys(updateData).length > 0) {
            console.log("자기소개/이미지 URL 업데이트 API 호출:", updateData);
            await updateUserProfile(updateData); // updateUserProfile API 호출
            console.log("자기소개/이미지 URL 업데이트 API 호출 성공");

            // Context 업데이트
            if (updateData.profileImageUrl !== undefined) {
              updateUserInfo({ profileImageUrl: finalProfileImageUrl });
            }
            if (updateData.bio !== undefined) {
              updateUserInfo({ bio: bio });
            }
          } else {
            console.log("업데이트할 자기소개/이미지 URL 데이터 없음");
          }
        } catch (error: any) {
          console.error("자기소개/이미지 업데이트 중 오류:", error);
          otherUpdatesSuccess = false;
          // 오류 토스트는 최종 단계에서 한 번만 표시
          throw error; // 오류를 바깥 catch로 전파
        }
      }

      // 모든 업데이트가 성공했거나, 시도된 업데이트가 모두 성공한 경우
      console.log("모든 업데이트 시도 완료. 최종 성공 토스트 표시.");
      toast.update(toastId, {
        render: "프로필이 성공적으로 업데이트되었습니다.",
        type: "success",
        isLoading: false,
        autoClose: 3000,
      });
      // 성공 후 프로필 페이지 이동 (선택적)
      // setTimeout(() => navigate('/profile'), 1000);
    } catch (error: any) {
      // 모든 종류의 오류 처리 (username, bio/image, 기타)
      console.error("프로필 업데이트 중 최종 오류 발생:", error);
      toast.update(toastId, {
        render: error.message || "프로필 업데이트 중 오류가 발생했습니다.",
        type: "error",
        isLoading: false,
        autoClose: 5000,
      });
    } finally {
      // 최종적으로 실행되어 제출 상태 해제
      setSubmitting(false);
      console.log("handleSubmit 완료, submitting 상태 false로 변경");
      // 파일 입력 초기화 추가 (오류 발생 시에도 초기화되도록)
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // 프로필 이미지 선택 핸들러
  const handleProfileImageClick = () => {
    if (!uploadingImage && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // 프로필 이미지 변경 핸들러
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      // 이미지 유효성 검사
      if (!file.type.startsWith("image/")) {
        toast.error("이미지 파일만 업로드 가능합니다.");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        // 5MB 제한
        toast.error("파일 크기는 5MB 이하여야 합니다.");
        return;
      }

      const toastId = toast.loading("프로필 이미지 업로드 중...");
      try {
        setUploadingImage(true);
        console.log("프로필 이미지 업로드 시작:", file.name);

        const result = await uploadProfileImage(file); // API 호출
        console.log("이미지 업로드 결과:", result);

        setProfileImage(result.profileImageUrl); // UI 업데이트
        updateUserInfo({ profileImageUrl: result.profileImageUrl }); // Context 업데이트

        toast.success("프로필 이미지가 업데이트되었습니다.", { id: toastId });
      } catch (error) {
        console.error("프로필 이미지 업로드 실패:", error);
        toast.error("이미지 업로드에 실패했습니다. 다시 시도해주세요.", {
          id: toastId,
        });
      } finally {
        setUploadingImage(false);
        // 파일 입력 초기화 (다시 같은 파일 선택 가능하도록)
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    }
  };

  // 로딩 중 표시 (authLoading 또는 페이지 자체 로딩)
  if (pageLoading) {
    // pageLoading 상태 사용
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center">
        <div
          className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"
          role="status"
          aria-label="로딩 중..."
        ></div>
      </div>
    );
  }

  // 페이지 레벨 오류 표시
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 text-center text-red-600">
        <p>{error}</p>
        <button
          onClick={() => navigate("/profile")}
          className="mt-4 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
        >
          프로필로 돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-2xl">
      <h1 className="text-3xl font-bold mb-8 text-center">프로필 편집</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 프로필 이미지 섹션 */}
        <div className="flex flex-col items-center space-y-4">
          <div
            className="relative h-32 w-32 rounded-full overflow-hidden bg-gray-200 cursor-pointer group border border-gray-300"
            onClick={handleProfileImageClick}
          >
            {profileImage ? (
              <img
                src={profileImage}
                alt="프로필 이미지"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center bg-gray-100">
                <FaUser className="text-gray-400 text-5xl" />
              </div>
            )}
            <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <FaCamera className="text-white text-3xl" />
            </div>
            {/* 이미지 업로드 중 스피너 */}
            {uploadingImage && (
              <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-70 rounded-full">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageChange}
            accept="image/*"
            className="hidden"
            disabled={uploadingImage}
          />
          <button
            type="button"
            onClick={handleProfileImageClick}
            className="text-sm text-blue-600 hover:underline disabled:text-gray-400"
            disabled={uploadingImage}
          >
            {uploadingImage ? "업로드 중..." : "프로필 사진 변경"}
          </button>
        </div>

        {/* 사용자 이름 섹션 */}
        <div>
          <label
            htmlFor="username"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            사용자 이름
          </label>
          <div className="flex items-center space-x-2">
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="flex-grow block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              maxLength={50} // 예시: 길이 제한
              required
            />
            <button
              type="button"
              onClick={handleCheckUsername}
              className={`px-3 py-1.5 text-sm rounded-md whitespace-nowrap ${
                username === originalUsername
                  ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                  : usernameChecked && usernameAvailable
                    ? "bg-green-100 text-green-700 border border-green-300"
                    : usernameChecked && !usernameAvailable
                      ? "bg-red-100 text-red-700 border border-red-300"
                      : "bg-blue-500 text-white hover:bg-blue-600"
              }`}
              disabled={checkingUsername || username === originalUsername}
            >
              {checkingUsername ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mx-auto"></div>
              ) : username === originalUsername ? (
                "현재 이름"
              ) : usernameChecked && usernameAvailable ? (
                <FaCheck className="inline-block mr-1" /> + "사용 가능"
              ) : usernameChecked && !usernameAvailable ? (
                <FaExclamationTriangle className="inline-block mr-1" /> +
                "사용 불가"
              ) : (
                "중복 확인"
              )}
            </button>
          </div>
          {username !== originalUsername &&
            usernameChecked &&
            !usernameAvailable && (
              <p className="text-xs text-red-600 mt-1">
                다른 사용자 이름을 입력해주세요.
              </p>
            )}
        </div>

        {/* 자기소개 섹션 */}
        <div>
          <label
            htmlFor="bio"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            자기소개
          </label>
          <textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            maxLength={300} // 예시: 길이 제한
          />
          <p className="text-xs text-gray-500 mt-1 text-right">
            {bio.length}/300
          </p>
        </div>

        {/* 제출 버튼 섹션 */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => navigate("/profile")} // 취소 시 프로필 페이지로 이동
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            disabled={submitting}
          >
            취소
          </button>
          <button
            type="submit"
            className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            disabled={
              submitting ||
              (username !== originalUsername &&
                (!usernameChecked || !usernameAvailable)) || // 이름 변경 시 체크 및 사용 가능 여부 확인
              pageLoading || // 페이지 로딩 중 제출 방지
              authLoading // 추가: 혹시 모를 authLoading 중 제출 방지
            }
          >
            {submitting ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
            ) : null}
            {submitting ? "저장 중..." : "변경사항 저장"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProfileEditPage;
