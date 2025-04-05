import React, { useState, FormEvent } from "react";
import { backendApi, Comment } from "../api/backendApi";

interface CommentInputProps {
  reviewId: string | number;
  onCommentAdded: (newComment?: Comment) => void;
}

const CommentInput = ({ reviewId, onCommentAdded }: CommentInputProps) => {
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    // content가 비어있으면 API 호출하지 않음
    if (!content.trim() || isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await backendApi.addReviewComment(
        Number(reviewId),
        content
      );
      console.log("댓글 작성 성공:", response);
      setContent("");

      // 응답에서 받은 새 댓글 데이터를 바로 전달
      if (response) {
        // 전달받은 콜백에 새 댓글 데이터 전달
        onCommentAdded(response);

        // 그 후에도 서버에서 전체 목록을 다시 가져오기
        setTimeout(() => {
          onCommentAdded();
        }, 500);
      } else {
        // 응답이 없는 경우 일반적인 목록 새로고침
        setTimeout(() => {
          onCommentAdded();
        }, 1000);
      }
    } catch (error) {
      console.error("댓글 작성 실패:", error);
      setError("댓글 작성에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mb-6">
      {error && <div className="text-red-500 mb-2">{error}</div>}
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="w-full p-3 border rounded-lg"
        placeholder="댓글을 입력하세요..."
        disabled={isSubmitting}
      />
      <button
        type="submit"
        className={`mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 ${
          isSubmitting ? "opacity-50 cursor-not-allowed" : ""
        }`}
        disabled={isSubmitting}
      >
        {isSubmitting ? "처리 중..." : "댓글 작성"}
      </button>
    </form>
  );
};

export default CommentInput;
