import React, { useState, useEffect, useCallback } from "react";
import { FaThumbsUp, FaThumbsDown } from "react-icons/fa";
import { backendApi, Comment } from "../api/backendApi";
import CommentInput from "./CommentInput";

interface ReviewCommentsProps {
  reviewId: string | number;
}

const ReviewComments = ({ reviewId }: ReviewCommentsProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);

  // useCallback으로 loadComments 함수를 메모이제이션하여 불필요한 재생성 방지
  const loadComments = useCallback(async () => {
    if (!reviewId) return;
    
    setLoading(true);
    try {
      const data = await backendApi.fetchReviewComments(String(reviewId));
      console.log("불러온 댓글 데이터:", data);
      
      if (Array.isArray(data)) {
        setComments(data);
      } else {
        console.error("댓글 데이터가 배열이 아닙니다:", data);
        setComments([]);
      }
    } catch (error) {
      console.error("댓글 불러오기 실패:", error);
      setComments([]);
    } finally {
      setLoading(false);
    }
  }, [reviewId]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  // 댓글 작성 후 처리하는 함수 수정
  const handleCommentAdded = (newComment?: Comment) => {
    if (newComment) {
      // 새 댓글이 전달된 경우 바로 목록에 추가 (옵티미스틱 UI 업데이트)
      console.log("새 댓글 직접 추가:", newComment);
      setComments(prevComments => [...prevComments, newComment]);
    } else {
      // 새 댓글이 없는 경우 전체 목록 새로고침
      console.log("전체 댓글 목록 새로고침");
      loadComments();
    }
  };

  return (
    <div className="space-y-4">
      {/* 댓글 입력 컴포넌트에 handleCommentAdded 전달 */}
      <CommentInput reviewId={reviewId} onCommentAdded={handleCommentAdded} />

      {loading ? (
        <div className="text-center py-4">댓글을 불러오는 중...</div>
      ) : comments.length === 0 ? (
        <div className="text-center py-4 text-gray-500">아직 댓글이 없습니다. 첫 댓글을 작성해보세요!</div>
      ) : (
        comments.map((comment) => (
          <div key={comment.id || `temp-${Date.now()}-${Math.random()}`} className="border rounded-lg p-4">
            <div className="flex items-start gap-3">
              <img
                src={comment.user?.profileImageUrl || "/default-avatar.png"}
                className="w-10 h-10 rounded-full"
                alt={comment.user?.username || "사용자"}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{comment.user?.username || "익명"}</span>
                  <span className="text-sm text-gray-500">
                    {comment.createdAt ? new Date(comment.createdAt).toLocaleDateString() : "방금 전"}
                  </span>
                </div>
                <p className="mt-1 text-gray-800">{comment.content}</p>
                <div className="flex gap-4 mt-2">
                  <button className="flex items-center gap-1 text-gray-500">
                    <FaThumbsUp className="w-4 h-4" />
                    {comment.likes || 0}
                  </button>
                  <button className="flex items-center gap-1 text-gray-500">
                    <FaThumbsDown className="w-4 h-4" />
                    {comment.dislikes || 0}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default ReviewComments;
