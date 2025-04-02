import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getUserProfile, updateUserProfile, uploadProfileImage } from "../api/userApi";
import { FaUser, FaCamera, FaCheck } from "react-icons/fa";

// 프로필 정보를 캐싱하기 위한 로컬 스토리지 키
const PROFILE_CACHE_KEY = 'cached_profile_data';

const ProfileEditPage: React.FC = () => {
  const { user, isLoggedIn, updateUserInfo } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 컴포넌트 마운트 시 사용자 정보로 초기화
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [profileImage, setProfileImage] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  
  // 사용자 데이터 로딩
  useEffect(() => {
    const fetchUserData = async () => {
      console.log("====== 프로필 편집 페이지: 사용자 데이터 로딩 시작 ======");
      // 로컬 스토리지에서 직접 토큰 확인
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      
      // 토큰이 없으면 로그인 페이지로 리디렉션
      if (!token || !userStr) {
        console.log("토큰 또는 사용자 정보가 없습니다. 로그인 페이지로 이동합니다.");
        window.location.href = '/login';
        return;
      }
      
      try {
        setLoading(true);
        console.log("인증된 사용자:", JSON.parse(userStr));
        
        // 로컬 스토리지에서 기본 사용자 정보 설정 (최우선 폴백)
        if (userStr) {
          try {
            const localUser = JSON.parse(userStr);
            console.log("로컬 스토리지에서 가져온 기본 사용자 정보:", localUser);
            // 기본값 설정
            setUsername(localUser.username || "");
            setBio(localUser.bio || "");
            setProfileImage(localUser.profileImageUrl);
          } catch (e) {
            console.error("로컬 스토리지 사용자 정보 파싱 오류:", e);
          }
        }
        
        // 1. 캐시된 프로필 데이터 체크
        const cachedProfileStr = localStorage.getItem(PROFILE_CACHE_KEY);
        if (cachedProfileStr) {
          try {
            const cachedProfile = JSON.parse(cachedProfileStr);
            console.log("캐시된 프로필 데이터 사용:", cachedProfile);
            // 캐시된 데이터가 있으면 덮어씌움
            if (cachedProfile.username) setUsername(cachedProfile.username);
            if (cachedProfile.bio !== undefined) setBio(cachedProfile.bio);
            if (cachedProfile.profileImageUrl) setProfileImage(cachedProfile.profileImageUrl);
          } catch (cacheError) {
            console.error("캐시된 프로필 데이터 파싱 오류:", cacheError);
          }
        }
        
        // 2. 서버에서 프로필 데이터 가져오기 (최신 데이터)
        try {
          console.log("서버에서 프로필 데이터 요청 중...");
          const profile = await getUserProfile();
          console.log("서버에서 받은 프로필 데이터:", profile);
          
          if (profile && profile.user) {
            console.log("서버에서 가져온 프로필 데이터 상세:", profile.user);
            
            // 프로필 데이터 캐싱
            try {
              localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile.user));
            } catch (cacheError) {
              console.error("프로필 데이터 캐싱 오류:", cacheError);
            }
            
            // 사용자 이름과 소개 설정 (서버 데이터 우선)
            setUsername(profile.user.username || "");
            setBio(profile.user.bio || "");
            setProfileImage(profile.user.profileImageUrl);
            
            // local storage에 저장된 사용자 정보에도 bio 필드 업데이트
            try {
              const localUser = JSON.parse(userStr);
              // bio가 undefined나 null이 아닌 경우에만 업데이트
              const updatedUser = { 
                ...localUser, 
                username: profile.user.username || localUser.username || "",
                bio: profile.user.bio !== undefined ? profile.user.bio : (localUser.bio || ""),
                profileImageUrl: profile.user.profileImageUrl || localUser.profileImageUrl
              };
              localStorage.setItem('user', JSON.stringify(updatedUser));
              console.log("로컬 스토리지 사용자 정보 업데이트 후:", updatedUser);
            } catch (e) {
              console.error("로컬 사용자 정보 업데이트 실패:", e);
            }
          } else {
            console.warn("서버에서 받은 프로필 데이터가 없거나 불완전합니다:", profile);
          }
        } catch (apiError) {
          console.error("API에서 프로필 정보 가져오기 실패:", apiError);
        }
        
        console.log("====== 프로필 편집 페이지: 최종 상태 ======");
        console.log("username:", username);
        console.log("bio:", bio);
        console.log("profileImage:", profileImage ? "있음" : "없음");
        
      } catch (error) {
        console.error("사용자 프로필 정보 로딩 실패:", error);
        setError("프로필 정보를 불러오는데 실패했습니다.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserData();
  }, [user]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (submitting) return;
    
    try {
      setSubmitting(true);
      setError("");
      
      console.log("프로필 업데이트 시작:", { username, bio });
      
      // 프로필 정보를 미리 업데이트 (실제 API 호출 전)
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const localUser = JSON.parse(userStr);
          const updatedUser = {
            ...localUser,
            username: username,
            bio: bio
          };
          
          // 즉시 로컬 스토리지 업데이트 (API 호출 결과와 상관없이)
          localStorage.setItem('user', JSON.stringify(updatedUser));
          console.log("로컬 스토리지 사용자 정보 사전 업데이트:", updatedUser);
          
          // 프로필 캐시도 즉시 업데이트
          localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify({
            ...localUser,
            username: username,
            bio: bio,
            profileImageUrl: profileImage
          }));
          
          // Context 업데이트도 즉시 수행
          updateUserInfo({
            username: username,
            bio: bio,
          });
        } catch (e) {
          console.error("사용자 정보 사전 업데이트 오류:", e);
        }
      }
      
      // 백엔드 API 호출
      const result = await updateUserProfile({
        username: username,
        bio: bio,
      });
      
      console.log("프로필 업데이트 결과:", result);
      
      // 백엔드 응답이 성공이면 성공 메시지 표시
      setSuccess(true);
      
      // 프로필 페이지로 리디렉션 (약간 지연)
      setTimeout(() => {
        console.log("프로필 페이지로 리디렉션 중...");
        window.location.href = '/profile';
      }, 1000); // 사용자가 성공 메시지를 볼 수 있도록 짧은 지연
      
    } catch (error) {
      console.error("프로필 정보 업데이트 실패:", error);
      setError("프로필 정보를 업데이트하는데 실패했습니다. 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  };
  
  // 프로필 이미지 선택 처리
  const handleProfileImageClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // 프로필 이미지 변경 처리
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try {
        setUploadingImage(true);
        const file = e.target.files[0];

        // 이미지 파일 타입 확인
        if (!file.type.startsWith("image/")) {
          alert("이미지 파일만 업로드 가능합니다.");
          return;
        }

        // 파일 크기 제한 (5MB)
        if (file.size > 5 * 1024 * 1024) {
          alert("파일 크기는 5MB 이하여야 합니다.");
          return;
        }

        console.log("프로필 이미지 업로드 시작:", file.name);
        
        // 이미지 업로드 API 호출
        const result = await uploadProfileImage(file);
        console.log("이미지 업로드 결과:", result);
        
        // 프로필 이미지 URL 업데이트
        setProfileImage(result.profileImageUrl);
        
        // 로컬 스토리지 사용자 정보 업데이트
        const userStr = localStorage.getItem('user');
        if (userStr) {
          try {
            const localUser = JSON.parse(userStr);
            const updatedUser = {
              ...localUser,
              profileImageUrl: result.profileImageUrl
            };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            console.log("로컬 스토리지 사용자 정보에 이미지 업데이트:", updatedUser);
            
            // 프로필 캐시 업데이트
            try {
              const cachedProfileStr = localStorage.getItem(PROFILE_CACHE_KEY);
              if (cachedProfileStr) {
                const cachedProfile = JSON.parse(cachedProfileStr);
                localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify({
                  ...cachedProfile,
                  profileImageUrl: result.profileImageUrl
                }));
                console.log("캐시된 프로필 데이터에 이미지 업데이트");
              }
            } catch (cacheError) {
              console.error("캐시 업데이트 오류:", cacheError);
            }
          } catch (e) {
            console.error("사용자 정보 업데이트 오류:", e);
          }
        }
        
        // Context 업데이트
        updateUserInfo({
          profileImageUrl: result.profileImageUrl
        });

        // 성공 메시지
        alert("프로필 이미지가 업데이트되었습니다.");
      } catch (error) {
        console.error("프로필 이미지 업로드 실패:", error);
        alert("이미지 업로드에 실패했습니다. 다시 시도해주세요.");
      } finally {
        setUploadingImage(false);
        // 파일 입력 초기화
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    }
  };
  
  if (loading) {
    return (
      <div className="container mx-auto p-4 max-w-3xl mt-8">
        <div className="text-center py-8">
          <p>프로필 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-4 max-w-3xl mt-4">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="border-b border-gray-200 pb-4 mb-6">
          <h1 className="text-xl font-semibold text-center">프로필 수정</h1>
        </div>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            프로필이 성공적으로 업데이트되었습니다. 잠시 후 프로필 페이지로 이동합니다.
          </div>
        )}
        
        <div className="flex flex-col md:flex-row">
          {/* 프로필 이미지 섹션 */}
          <div className="flex flex-col items-center mb-6 md:mb-0 md:mr-10 md:w-1/3">
            <div className="relative">
              <div 
                className="w-32 h-32 rounded-full border border-gray-300 overflow-hidden bg-gray-100 flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity"
                onClick={handleProfileImageClick}
              >
                {profileImage ? (
                  <img 
                    src={profileImage} 
                    alt="프로필 이미지" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <FaUser className="text-gray-400 text-4xl" />
                )}
                
                <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <div className="bg-black bg-opacity-50 rounded-full p-2">
                    <FaCamera className="text-white text-xl" />
                  </div>
                </div>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageChange}
                className="hidden"
                accept="image/*"
              />
            </div>
            
            <p className="text-sm text-center mt-2 text-gray-600">
              {uploadingImage ? "업로드 중..." : "프로필 사진 변경"}
            </p>
          </div>
          
          {/* 프로필 정보 폼 */}
          <div className="md:w-2/3">
            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <div className="flex items-center mb-2">
                  <span className="font-medium text-gray-700 mr-4 w-24">사용자 이름</span>
                  <input
                    type="text"
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>
                <p className="text-xs text-gray-500 ml-28">
                  다른 사용자가 회원님을 쉽게 찾을 수 있는 이름을 사용하세요.
                </p>
              </div>
              
              <div className="mb-6">
                <div className="flex items-start mb-2">
                  <span className="font-medium text-gray-700 mr-4 w-24 mt-2">소개</span>
                  <textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 h-32 resize-none"
                    placeholder="자기소개를 입력하세요"
                  />
                </div>
                <p className="text-xs text-gray-500 ml-28">
                  자신에 대해 소개해주세요. 좋아하는 영화나 관심사를 적어보세요.
                </p>
              </div>
              
              <div className="flex justify-end mt-8 border-t border-gray-200 pt-6">
                <button
                  type="button"
                  onClick={() => window.location.href = "/profile"}
                  className="bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 mr-3"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center ${
                    submitting ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  {submitting ? (
                    <>저장 중...</>
                  ) : (
                    <>
                      <FaCheck className="mr-1" /> 저장
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileEditPage; 