import React, { useState, useEffect } from "react";
import axios from "axios";
import { authApi } from "../api/authApi";

interface UsernameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (username: string) => Promise<void>;
  initialUsername: string;
  email?: string;
}

const UsernameModal: React.FC<UsernameModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialUsername,
  email,
}) => {
  const getInitialUsername = () => {
    if (initialUsername && initialUsername.trim() !== "") {
      return initialUsername;
    }

    if (email) {
      const atIndex = email.indexOf("@");
      if (atIndex > 0) {
        return email.substring(0, atIndex);
      }
    }

    return "";
  };

  const [username, setUsername] = useState(getInitialUsername());
  const [error, setError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }

    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isOpen]);

  const checkUsername = async () => {
    if (!username.trim()) {
      setError("닉네임을 입력해주세요.");
      return;
    }

    setIsChecking(true);
    setError(null);

    try {
      const available = await authApi.checkUsername(username);
      setIsAvailable(available);

      if (available) {
        setError(null);
      } else {
        setError("이미 사용 중인 닉네임입니다.");
      }
    } catch (err) {
      console.error("닉네임 중복 확인 오류:", err);
      setError("닉네임 중복 확인 중 오류가 발생했습니다.");
      setIsAvailable(false);
    } finally {
      setIsChecking(false);
    }
  };

  const handleSave = async () => {
    if (!isAvailable) {
      setError("닉네임 중복 확인을 먼저 해주세요.");
      return;
    }

    setIsSaving(true);
    try {
      await onSave(username);
      onClose();
    } catch (err) {
      console.error("닉네임 저장 오류:", err);
      setError("닉네임 저장 중 오류가 발생했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
        <div className="mb-4 text-center">
          <h2 className="text-xl font-bold text-gray-800">닉네임 설정</h2>
          <p className="mt-2 text-sm text-gray-600">
            영화 리뷰 서비스에서 사용할 닉네임을 입력해주세요.
          </p>
        </div>

        <div className="mb-4">
          <label
            htmlFor="username"
            className="mb-2 block text-sm font-medium text-gray-700"
          >
            닉네임
          </label>
          <div className="flex">
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setIsAvailable(false);
              }}
              className="mr-2 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              placeholder="닉네임을 입력하세요"
              autoFocus
            />
            <button
              type="button"
              onClick={checkUsername}
              disabled={isChecking || !username.trim()}
              className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:opacity-50 whitespace-nowrap"
            >
              {isChecking ? "확인 중..." : "중복 확인"}
            </button>
          </div>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          {isAvailable && (
            <p className="mt-2 text-sm text-green-600">
              사용 가능한 닉네임입니다.
            </p>
          )}
        </div>

        <div className="flex justify-end space-x-2">
          <button
            type="button"
            onClick={() => {
              if (
                window.confirm(
                  "회원가입을 취소하시겠습니까? 취소하면 처음부터 다시 시작해야 합니다."
                )
              ) {
                onClose();
              }
            }}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!isAvailable || isSaving}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {isSaving ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UsernameModal;
