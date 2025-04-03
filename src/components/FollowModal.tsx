import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { FaUser, FaTimes, FaExchangeAlt } from "react-icons/fa";
import { toggleFollow } from "../api/userApi";

interface FollowModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  users: any[];
  onToggleFollow: (userId: number, newStatus: boolean) => void;
  updateFollowCounts?: (isFollowing: boolean, userId: number) => void; // 팔로워/팔로우 숫자 업데이트용
}

const FollowModal: React.FC<FollowModalProps> = ({
  isOpen,
  onClose,
  title,
  users,
  onToggleFollow,
  updateFollowCounts
}) => {
  const [localUsers, setLocalUsers] = useState<any[]>([]);
  
  // users prop이 변경될 때마다 localUsers 업데이트
  useEffect(() => {
    setLocalUsers(users);
  }, [users]);

  if (!isOpen) return null;

  const handleToggleFollow = async (userId: number, currentlyFollowing: boolean) => {
    try {
      console.log(`사용자 ${userId}에 대한 팔로우 상태 토글 시작: 현재 상태=${currentlyFollowing}`);
      
      // API 호출
      const result = await toggleFollow(userId.toString());
      console.log("팔로우 토글 API 응답:", result);
      
      if (!result) {
        throw new Error("팔로우 상태 변경 실패");
      }
      
      // 로컬 상태 업데이트
      setLocalUsers(prevUsers => 
        prevUsers.map(user => {
          if (user.id === userId) {
            return { 
              ...user, 
              isFollowing: result.isFollowing,
              mutualFollow: result.isFollowing && user.followsMe
            };
          }
          return user;
        })
      );
      
      // 부모 컴포넌트에 알림
      onToggleFollow(userId, result.isFollowing);
      
      // 팔로워/팔로우 숫자 업데이트 콜백 호출
      if (updateFollowCounts) {
        updateFollowCounts(result.isFollowing, userId);
      }
      
    } catch (error) {
      console.error("팔로우 토글 실패:", error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-md max-h-[80vh] flex flex-col">
        {/* 모달 헤더 */}
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="text-xl font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <FaTimes />
          </button>
        </div>
        
        {/* 모달 내용 */}
        <div className="flex-grow overflow-y-auto p-4">
          {localUsers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {title === "팔로워" 
                ? "아직 팔로워가 없습니다." 
                : "아직 팔로우하는 사용자가 없습니다."}
            </div>
          ) : (
            <ul className="space-y-4">
              {localUsers.map((user) => (
                <li key={user.id} className="flex items-center justify-between">
                  <Link 
                    to={`/profile/${user.id}`} 
                    className="flex items-center group flex-grow"
                    onClick={onClose}
                  >
                    <div className="h-12 w-12 rounded-full overflow-hidden bg-gray-200 mr-3">
                      {user.profileImageUrl ? (
                        <img
                          src={user.profileImageUrl}
                          alt={`${user.username}의 프로필`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center bg-gray-100">
                          <FaUser className="text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-grow">
                      <div className="flex items-center">
                        <p className="font-medium group-hover:underline">{user.username}</p>
                        {user.mutualFollow && (
                          <span className="ml-2 text-xs text-gray-500 flex items-center" title="맞팔로잉">
                            <FaExchangeAlt className="text-blue-500" />
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">{user.name || user.bio || ""}</p>
                    </div>
                  </Link>
                  
                  {/* 팔로우/언팔로우 버튼 */}
                  <button
                    onClick={() => handleToggleFollow(user.id, user.isFollowing)}
                    className={`ml-2 py-1 px-3 text-sm rounded font-medium transition-colors ${
                      user.isFollowing
                        ? "border border-gray-300 text-black hover:bg-red-50 hover:text-red-600 hover:border-red-200 group"
                        : "bg-blue-500 text-white hover:bg-blue-600"
                    }`}
                  >
                    {user.isFollowing ? (
                      <>
                        <span className="group-hover:hidden">팔로잉</span>
                        <span className="hidden group-hover:inline">언팔로우</span>
                      </>
                    ) : (
                      "팔로우"
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default FollowModal; 