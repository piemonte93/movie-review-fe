import React from "react";
import { FaStar, FaStarHalfAlt } from "react-icons/fa";

interface StarRatingProps {
  rating: number;
  size?: number;
  color?: string;
}

export const StarRating: React.FC<StarRatingProps> = ({
  rating,
  size = 16,
  color = "#FFD700",
}) => {
  const stars = [];

  // 별점 계산 (1-5 사이의 값으로 정규화)
  const normalizedRating = Math.max(0, Math.min(5, rating));

  // 별 아이콘 생성
  for (let i = 1; i <= 5; i++) {
    if (i <= normalizedRating) {
      // 꽉 찬 별
      stars.push(
        <FaStar key={i} size={size} color={color} className="mr-0.5" />
      );
    } else if (i - 0.5 <= normalizedRating) {
      // 반쪽 별
      stars.push(
        <FaStarHalfAlt key={i} size={size} color={color} className="mr-0.5" />
      );
    } else {
      // 빈 별
      stars.push(
        <FaStar key={i} size={size} color="#e4e5e9" className="mr-0.5" />
      );
    }
  }

  return <div className="flex items-center">{stars}</div>;
};

export default StarRating;
