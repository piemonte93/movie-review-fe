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
  // undefined이거나 null, 빈 문자열인 경우 현재 시간 사용
  if (!dateValue) {
    console.warn("날짜 값이 없어 현재 시간으로 대체합니다.");
    return getPostDateByPattern(new Date());
  }

  // 문자열인 경우 날짜 포맷 확인 및 변환
  if (typeof dateValue === "string") {
    // 빈 문자열인 경우 현재 시간 사용
    if (dateValue.trim() === "") {
      console.warn("날짜 문자열이 비어있어 현재 시간으로 대체합니다.");
      return getPostDateByPattern(new Date());
    }

    // ISO 8601 형식이 아닌 경우, 변환 시도
    if (!dateValue.includes("T") && !dateValue.includes("Z")) {
      // YYYY-MM-DD 형식인지 확인
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (dateRegex.test(dateValue)) {
        dateValue = `${dateValue}T00:00:00Z`;
      }
    }

    console.log(`변환할 날짜 문자열: "${dateValue}"`);
  }

  // 문자열 또는 Date 객체를 Date 객체로 변환
  let date: Date;
  try {
    if (typeof dateValue === "string") {
      // 서버로부터 온 LocalDateTime 문자열 처리 (2023-04-03T15:30:45)
      const localDateTimeRegex =
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/;
      if (localDateTimeRegex.test(dateValue)) {
        console.log(`LocalDateTime 형식 감지: ${dateValue}`);
        // 서버에서 보낸 시간은 이미 KST(한국시간)이지만 타임존 정보가 없음
        // 타임존 정보를 명시적으로 추가 (KST = UTC+9)
        date = new Date(`${dateValue}+09:00`);
        console.log(`KST 타임존 정보 추가: ${date.toISOString()}`);
      } else {
        date = new Date(dateValue);
      }

      // 유효하지 않은 날짜인 경우 파싱 시도
      if (isNaN(date.getTime())) {
        // 날짜 형식이 다를 수 있으므로 다른 방식으로 파싱 시도
        const dateParts = dateValue.split(/[- :T.]/);
        if (dateParts.length >= 3) {
          // YYYY-MM-DD 형식으로 가정
          date = new Date(
            parseInt(dateParts[0]),
            parseInt(dateParts[1]) - 1,
            parseInt(dateParts[2])
          );
        }
      }
    } else {
      date = dateValue;
    }
  } catch (error) {
    console.error("날짜 파싱 오류:", error);
    return "날짜 오류";
  }

  // 여전히 유효하지 않은 날짜인 경우 현재 시간 사용
  if (isNaN(date.getTime())) {
    console.error("유효하지 않은 날짜 형식:", dateValue);
    return getPostDateByPattern(new Date());
  }

  // 현재 시간과 주어진 날짜의 시간차 계산
  const now = new Date();

  // 디버깅용: 서버와 클라이언트의 시간 비교
  if (date.getTime() > now.getTime()) {
    console.log(
      "미래 날짜 감지:",
      date.toISOString(),
      "현재:",
      now.toISOString()
    );
    // 미래 날짜도 그대로 표시 (수정됨)
  }

  // 시간 차이를 밀리초 단위로 계산
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  console.log(
    `날짜 시간 차이(초): ${diffInSeconds}, 원본 날짜: ${date.toISOString()}, 현재 시간: ${now.toISOString()}`
  );

  // 시간 차이에 따라 다른 형식 적용 - 방금 전 표시 기준을 더 엄격하게 변경
  if (diffInSeconds < 10) {
    // 10초 미만인 경우에만 '방금 전' 표시 (기존 30초에서 변경)
    return "방금 전";
  } else if (diffInSeconds < 60) {
    // 10초~60초 사이는 'n초 전' (기존 30초에서 변경)
    return `${diffInSeconds}초 전`;
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
 * 날짜 문자열을 특정 형식으로 포맷팅합니다.
 * @param dateString - 포맷팅할 날짜 문자열 또는 Date 객체, 혹은 null/undefined
 * @returns 포맷팅된 날짜 문자열 (예: "2023.04.10. 09:06")
 */
export const formatDate = (dateString: string | Date | null | undefined): string => {
  if (!dateString) return ""; // 빈 문자열, null, undefined 처리

  try {
    const date =
      typeof dateString === "string" ? new Date(dateString) : dateString;

    // 유효하지 않은 날짜 확인
    if (isNaN(date.getTime())) {
      console.error("Invalid date value provided to formatDate:", dateString);
      return typeof dateString === 'string' ? dateString : "유효하지 않은 날짜";
    }

    // 24시간 표기법 및 형식 정리 (YYYY.MM.DD. HH:MM)
    const formatted = date.toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    return formatted.replace(/\.\s/g, '.').replace(/\.$/, '');

  } catch (error) {
    console.error("Error formatting date:", error, "Input:", dateString);
    return "날짜 변환 오류";
  }
};

/**
 * 날짜 문자열을 상대적 시간으로 변환합니다 (예: "3일 전", "방금 전").
 * @param dateString - 변환할 날짜 문자열
 * @returns 상대적 시간 문자열
 */
export const getRelativeTimeFromNow = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    const diffSeconds = Math.floor(diffTime / 1000);

    if (diffDays > 30) {
      // 30일 이상이면 날짜 표시 (formatDate 함수 수정에 맞춰 인자 1개만 전달)
      return formatDate(dateString);
    } else if (diffDays > 0) {
      return `${diffDays}일 전`;
    } else if (diffHours > 0) {
      return `${diffHours}시간 전`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes}분 전`;
    } else {
      return "방금 전";
    }
  } catch (error) {
    console.error("Relative time calculation error:", error);
    return "";
  }
};

export default {
  formatDate,
  getRelativeTimeFromNow,
};
