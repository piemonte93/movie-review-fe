import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

/**
 * 페이지 이동 시 스크롤을 맨 위로 이동시키는 컴포넌트
 * App.tsx의 Router 안에 배치
 */
const ScrollToTop = () => {
  const location = useLocation();
  const prevPathnameRef = useRef(location.pathname);

  useEffect(() => {
    // 경로가 실제로 변경된 경우에만 로그 출력 및 스크롤 처리
    if (prevPathnameRef.current !== location.pathname) {
      // 디버깅을 위한 로그는 필요 시에만 출력
      // console.log("ScrollToTop - pathname changed:", location.pathname);

      // 스크롤을 맨 위로 이동
      window.scrollTo(0, 0);
      prevPathnameRef.current = location.pathname;
    }
  }, [location.pathname]);

  return null;
};

export default ScrollToTop;
