import React, { useState, useEffect, useCallback } from "react";
import { FaThumbsUp, FaThumbsDown, FaUserCircle } from "react-icons/fa";
import { backendApi, Comment, BASE_URL } from "../api/backendApi";
import CommentInput from "./CommentInput";
import { formatDate } from "../utils/dateUtils";
import defaultAvatar from "../assets/default-profile.png";

interface ReviewCommentsProps {
  reviewId: string | number;
}

const ReviewComments = ({ reviewId }: ReviewCommentsProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);

  // 프로필 이미지 URL 처리 함수
  const getProfileImageUrl = (imageUrl: string | null | undefined): string => {
    console.log("프로필 이미지 URL 처리:", imageUrl);

    if (!imageUrl) {
      console.log("프로필 이미지 URL이 없음, 기본 이미지 사용");
      return defaultAvatar; // null, undefined 또는 빈 문자열인 경우 기본 이미지 반환
    }

    // 절대 URL이면 그대로 사용
    if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
      console.log("절대 URL 사용:", imageUrl);
      return imageUrl;
    }

    // 상대 URL이면 BASE_URL 추가
    const fullUrl = `${BASE_URL}${imageUrl}`;
    console.log("상대 URL 처리:", imageUrl, "->", fullUrl);
    return fullUrl;
  };

  // useCallback으로 loadComments 함수를 메모이제이션하여 불필요한 재생성 방지
  const loadComments = useCallback(async () => {
    if (!reviewId) return;

    setLoading(true);
    try {
      const data = await backendApi.getReviewComments(Number(reviewId));
      console.log("불러온 댓글 데이터:", data);

      if (data.content && Array.isArray(data.content)) {
        // 응답 데이터 구조에 맞게 매핑
        const commentList = data.content.map((comment: any) => ({
          id: comment.id,
          content: comment.content,
          createdAt: comment.created_at || new Date().toISOString(),
          username: comment.username,
          profileImageUrl: comment.user_profile_image_url,
          likeCount: comment.likeCount || 0,
          dislikeCount: comment.dislikeCount || 0,
          userId: comment.user_id,
          liked: comment.liked || false,
          disliked: comment.disliked || false,
          user: {
            id: comment.user_id,
            username: comment.username,
            profileImageUrl: comment.user_profile_image_url,
          },
        }));
        setComments(commentList);
      } else {
        console.error("댓글 데이터가 예상한 형식이 아닙니다:", data);
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
      setComments((prevComments) => [...prevComments, newComment]);
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
        <div className="text-center py-4 text-gray-500">
          아직 댓글이 없습니다. 첫 댓글을 작성해보세요!
        </div>
      ) : (
        comments.map((comment) => (
          <div
            key={comment.id || `temp-${Date.now()}-${Math.random()}`}
            className="border rounded-lg p-4"
          >
            <div className="flex items-start gap-3">
              <div className="flex items-start w-full mb-2">
                <div className="mr-2 flex-shrink-0">
                  {comment.user && (
                    <div className="w-8 h-8 relative">
                      {comment.user.profileImageUrl ? (
                        <img
                          src={getProfileImageUrl(comment.user.profileImageUrl)}
                          alt={`${comment.user?.username || "사용자"} 프로필`}
                          className="w-8 h-8 rounded-full object-cover"
                          onError={(e) => {
                            console.error(
                              "이미지 로딩 오류 발생: 기본 아바타로 대체합니다."
                            );
                            e.currentTarget.src = defaultAvatar;
                          }}
                        />
                      ) : (
                        <FaUserCircle className="w-8 h-8 text-gray-400" />
                      )}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {comment.user?.username || "익명"}
                    </span>
                    <span className="text-sm text-gray-500">
                      {comment.createdAt
                        ? formatDate(comment.createdAt)
                        : "방금 전"}
                    </span>
                  </div>
                  <p className="mt-1 text-gray-800">{comment.content}</p>
                  <div className="flex gap-4 mt-2">
                    <button className="flex items-center gap-1 text-gray-500">
                      <FaThumbsUp className="w-4 h-4" />
                      {comment.likeCount || 0}
                    </button>
                    <button className="flex items-center gap-1 text-gray-500">
                      <FaThumbsDown className="w-4 h-4" />
                      {comment.dislikeCount || 0}
                    </button>
                  </div>
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
