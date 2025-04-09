import { apiClient } from "../api/backendApi";

/**
 * 백엔드에서 이미지 URL을 받아 실제 이미지 Blob URL을 생성하는 함수
 * @param imageUrl 백엔드에서 제공하는 이미지 URL (예: /api/uploads/uuid.jpg)
 * @returns 브라우저에서 사용할 수 있는 Blob URL
 */
export const fetchImageAsBlobUrl = async (
  imageUrl: string | null | undefined
): Promise<string | null> => {
  if (!imageUrl) {
    return null;
  }

  try {
    // 서버 주소를 포함한 전체 URL 생성
    const fullImageUrl = `http://localhost:8080${imageUrl}`;
    // console.log("이미지 Blob URL 요청:", fullImageUrl); // 디버깅 로그 (필요시 활성화)

    // apiClient를 사용하여 이미지 데이터를 ArrayBuffer 형태로 요청
    const response = await apiClient.get(fullImageUrl, {
      responseType: "arraybuffer", // 바이너리 데이터를 받기 위해 설정
    });

    // console.log("이미지 Blob 데이터 수신 상태:", response.status); // 디버깅 로그

    // 응답 데이터(ArrayBuffer)를 Blob 객체로 변환
    const blob = new Blob([response.data], {
      type: response.headers["content-type"], // 백엔드에서 설정한 Content-Type 사용
    });

    // Blob 객체를 사용하여 Blob URL 생성
    const blobUrl = URL.createObjectURL(blob);
    // console.log("생성된 Blob URL:", blobUrl); // 디버깅 로그

    return blobUrl;
  } catch (error) {
    console.error(`이미지 Blob URL 생성 실패 (${imageUrl}):`, error);
    return null; // 오류 발생 시 null 반환
  }
}; 