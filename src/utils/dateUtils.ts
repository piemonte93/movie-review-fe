/**
 * 날짜 형식을 처리하는 유틸리티 함수
 */

/**
 * 게시글이나 댓글의 날짜를 포맷팅합니다.
 * createdAt 또는 created_at 필드를 처리하고 적절한 형식으로 변환합니다.
 *
 * @param dateValue 날짜 문자열, Date 객체 또는 undefined
 * @returns 포맷팅된 날짜 문자열 (예: "2023년 5월 12일" 또는 "방금 전")
 */
export const getPostDateByPattern = (
  dateValue: string | Date | undefined
): string => {
  // undefined인 경우 현재 시간 설정
  if (!dateValue) {
    return "방금 전";
  }

  // 문자열 또는 Date 객체를 Date 객체로 변환
  let date: Date;

  if (typeof dateValue === "string") {
    // ISO 문자열 날짜 형식인지 확인
    if (dateValue.includes("T") || dateValue.includes("Z")) {
      date = new Date(dateValue);
    } else {
      // yyyy-MM-dd 형식일 수도 있는 경우 처리
      const parts = dateValue.split(/[-/\s:]/);
      if (parts.length >= 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        date = new Date(year, month, day);
      } else {
        date = new Date(dateValue);
      }
    }
  } else {
    date = dateValue;
  }

  // 유효하지 않은 날짜인 경우
  if (isNaN(date.getTime())) {
    return "방금 전";
  }

  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  // 시간 차이에 따라 다른 형식 적용
  if (diffInSeconds < 60) {
    return "방금 전";
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes}분 전`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours}시간 전`;
  } else if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days}일 전`;
  } else {
    // YYYY년 MM월 DD일 형식
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${year}년 ${month}월 ${day}일`;
  }
};

/**
 * 레거시 포맷 함수 - 기존 코드와의 호환성을 위해 유지
 *
 * @param dateString 날짜 문자열 또는 Date 객체
 * @returns 포맷팅된 날짜 문자열
 */
export const formatDate = (dateString: string | Date | undefined): string => {
  return getPostDateByPattern(dateString);
};
