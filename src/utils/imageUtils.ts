import { apiClient } from '../api/backendApi';

/**
 * 이미지 URL을 받아 Blob URL로 변환하는 함수
 * @param imageUrl 이미지 URL (일반적으로 백엔드에서 제공하는 경로)
 * @returns Blob URL 또는 이미지가 없을 경우 null
 */
export const fetchImageAsBlobUrl = async (imageUrl: string | null | undefined): Promise<string | null> => {
  if (!imageUrl) return null;
  
  try {
    // 이미지 URL 완성 (상대 경로인 경우 백엔드 기본 URL 추가)
    const fullImageUrl = imageUrl.startsWith('http') 
      ? imageUrl 
      : `${apiClient.defaults.baseURL}${imageUrl}`;
    
    // 이미지 데이터 가져오기
    const response = await fetch(fullImageUrl);
    const arrayBuffer = await response.arrayBuffer();
    const blob = new Blob([arrayBuffer]);
    
    // Blob URL 생성
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error('이미지 로딩 실패:', error);
    return null;
  }
}; 