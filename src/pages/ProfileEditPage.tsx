import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { updateMyProfileApi } from "../api/userApi";
import {
  FaUser,
  FaCamera,
  FaCheck,
  FaExclamationTriangle,
} from "react-icons/fa";
import authApi from "../api/authApi";
import { toast } from "react-toastify";
import { UserProfile } from "../types/user";
import { BASE_URL } from "../api/backendApi";
import defaultAvatar from "../assets/default-profile.png";

// 프로필 정보를 캐싱하기 위한 로컬 스토리지 키 (필요 시 사용)
// const PROFILE_CACHE_KEY = "cached_profile_data";

const ProfileEditPage: React.FC = () => {
  const { user, isLoggedIn, updateUserInfo, login, authLoading } = useAuth(); // authLoading 추가
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [username, setUsername] = useState("");
  const [originalUsername, setOriginalUsername] = useState(""); // 원래 사용자 이름 저장
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState(""); // 페이지 레벨 오류

  const [usernameChecked, setUsernameChecked] = useState(false); // 사용자 이름 중복 체크 여부
  const [usernameAvailable, setUsernameAvailable] = useState(true); // 사용자 이름 사용 가능 여부
  const [checkingUsername, setCheckingUsername] = useState(false); // 사용자 이름 중복 체크 중 여부

  const [pageLoading, setPageLoading] = useState(true); // 페이지 자체 로딩 상태 추가

  const [imagePreview, setImagePreview] = useState<string | null>(null); // 이미지 미리보기 URL 상태
  const [imageFileToUpload, setImageFileToUpload] = useState<File | null>(null); // 업로드할 파일 상태

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

  // 프로필 이미지 변경 핸들러 (파일 선택 및 미리보기만 처리)
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      // 이미지 유효성 검사
      if (!file.type.startsWith("image/")) {
        toast.error("이미지 파일만 업로드 가능합니다.");
        setImageFileToUpload(null);
        setImagePreview(null); // 원래 이미지로 복원
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        // 5MB 제한
        toast.error("파일 크기는 5MB 이하여야 합니다.");
        setImageFileToUpload(null);
        setImagePreview(null); // 원래 이미지로 복원
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      // 파일 상태 저장
      setImageFileToUpload(file);

      // 미리보기 생성
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      console.log("프로필 이미지 파일 선택됨:", file.name);
    }
  };

  // 프로필 업데이트 제출 핸들러 (모든 변경사항 일괄 처리)
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (submitting || pageLoading || checkingUsername) return; // Prevent multiple submissions

    const trimmedUsername = username.trim();
    const originalBio = user?.bio || "";
    const usernameChanged = trimmedUsername !== originalUsername;
    const bioChanged = bio !== originalBio;
    const imageChanged = imageFileToUpload !== null;

    // 1. Check if there are any changes
    if (!usernameChanged && !bioChanged && !imageChanged) {
      toast.info("변경된 내용이 없습니다.");
      return;
    }

    // 2. Validate username if changed
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

    try {
      // 3. Prepare FormData
      const formData = new FormData();

      // Append profile data as JSON string under the key "profileData"
      const profileData = {
        username: trimmedUsername, // Use trimmed username
        bio: bio,
      };
      formData.append(
        "profileData",
        new Blob([JSON.stringify(profileData)], { type: "application/json" })
      );

      // Append image file if changed
      if (imageChanged && imageFileToUpload) {
        formData.append("imageFile", imageFileToUpload);
      }

      console.log("Calling updateMyProfileApi...");
      // 4. Call the new API function
      const updatedProfileData: UserProfile =
        await updateMyProfileApi(formData);
      console.log("API call successful, response:", updatedProfileData);

      // 5. Update AuthContext
      // Map the received UserProfile data to the structure expected by updateUserInfo
      // Assuming updateUserInfo expects an object with user properties directly
      const userInfoForContext = {
        id: updatedProfileData.id,
        username: updatedProfileData.username,
        email: updatedProfileData.email,
        roles: updatedProfileData.roles,
        bio: updatedProfileData.bio, // Use the updated bio from response
        profileImageUrl: updatedProfileData.profileImageUrl, // Use the updated image URL from response
        // Add any other fields AuthContext/updateUserInfo might expect
      };
      console.log("Updating AuthContext with:", userInfoForContext);
      updateUserInfo(userInfoForContext);

      // 6. Reset state and show success
      setOriginalUsername(trimmedUsername); // Update original username
      setImageFileToUpload(null);
      setImagePreview(null);

      toast.update(toastId, {
        render: "프로필이 성공적으로 업데이트되었습니다.",
        type: "success",
        isLoading: false,
        autoClose: 3000,
        closeButton: true,
      });

      // Optionally navigate back or elsewhere
      // navigate("/profile");
    } catch (error: any) {
      console.error("프로필 업데이트 실패:", error);
      const errorMessage =
        error.response?.data?.message || // Check for Spring Boot error response
        error.message ||
        "프로필 업데이트 중 오류가 발생했습니다.";
      toast.update(toastId, {
        render: errorMessage,
        type: "error",
        isLoading: false,
        autoClose: 5000,
        closeButton: true,
      });
      setError(errorMessage); // Set page level error if needed
    } finally {
      setSubmitting(false);
    }
  };

  // 프로필 이미지 선택 핸들러
  const handleProfileImageClick = () => {
    if (!uploadingImage && fileInputRef.current) {
      fileInputRef.current.click();
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

  // Use user from context for the current profile image URL
  const currentProfileImageUrl = user?.profileImageUrl;

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
            {imagePreview || currentProfileImageUrl ? (
              <img
                src={
                  imagePreview
                    ? imagePreview
                    : currentProfileImageUrl
                      ? `${BASE_URL}${currentProfileImageUrl}`
                      : defaultAvatar
                }
                alt="프로필 이미지"
                className="h-full w-full object-cover bg-gray-100"
                onError={(e) => {
                  if (e.currentTarget.src !== defaultAvatar) {
                    e.currentTarget.src = defaultAvatar;
                  }
                }}
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center bg-gray-100">
                <img
                  src={defaultAvatar}
                  alt="기본 프로필 이미지"
                  className="h-full w-full object-cover"
                />
              </div>
            )}
            <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <FaCamera className="text-white text-3xl" />
            </div>
            {/* 이미지 업로드 중 스피너 - 이 스피너는 handleSubmit 중 사용되므로 유지 */}
            {submitting &&
              imageFileToUpload && ( // submitting 상태이고 업로드할 파일이 있을 때만 표시
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
            disabled={submitting} // submitting 중에는 파일 선택 비활성화
          />
          <button
            type="button"
            onClick={handleProfileImageClick}
            className="text-sm text-blue-600 hover:underline disabled:text-gray-400"
            disabled={submitting} // submitting 중에는 버튼 비활성화
          >
            {submitting && imageFileToUpload
              ? "업로드 중..."
              : "프로필 사진 변경"}
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
