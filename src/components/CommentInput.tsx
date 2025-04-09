import React, { useState } from "react";
import { BiSend } from "react-icons/bi";
import { backendApi } from "../services/backendApi";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-toastify";

interface CommentInputProps {
  reviewId: string | number;
  onCommentAdded: (newComment: any) => void;
}

const CommentInput: React.FC<CommentInputProps> = ({
  reviewId,
  onCommentAdded,
}) => {
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!content.trim()) {
      setError("댓글 내용을 입력해주세요.");
      return;
    }

    if (isSubmitting) return;

    setIsSubmitting(true);

    try {
      // 현재 인증된 사용자 정보 확인 로깅
      console.log("댓글 작성 시 현재 사용자 정보:", user);

      const response = await backendApi.addComment(reviewId, { content });

      // 백엔드 응답 로깅
      console.log("댓글 추가 응답:", response);

      // 옵티미스틱 UI 업데이트를 위해 새 댓글 객체 생성
      const newComment = {
        ...response,
        user: {
          // 백엔드가 사용자 정보를 포함하지 않는 경우를 대비해 현재 사용자 정보 사용
          ...response.user,
          id: response.user?.id || user?.id,
          username: response.user?.username || user?.username,
          profileImageUrl:
            response.user?.profileImageUrl || user?.profileImageUrl,
        },
        createdAt: response.createdAt || new Date().toISOString(),
      };

      console.log("UI에 추가될 새 댓글:", newComment);

      onCommentAdded(newComment);
      setContent("");
      toast.success("댓글이 추가되었습니다.");
    } catch (err) {
      console.error("댓글 추가 오류:", err);
      setError(
        "댓글을 추가하는 중 오류가 발생했습니다. 나중에 다시 시도해주세요."
      );
      toast.error("댓글 추가 실패");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4">
      <div className="flex flex-col space-y-2">
        <div className="flex items-center space-x-2">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="댓글을 작성해주세요..."
            className="flex-grow p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={2}
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-blue-300 flex items-center justify-center"
          >
            {isSubmitting ? (
              "게시 중..."
            ) : (
              <>
                <BiSend className="mr-1" />
                게시
              </>
            )}
          </button>
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
      </div>
    </form>
  );
};

export default CommentInput;
