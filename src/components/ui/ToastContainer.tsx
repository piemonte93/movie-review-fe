import React from "react";
import { ToastContainer as ReactToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

/**
 * 전역 토스트 알림을 위한 컨테이너 컴포넌트
 * 애플리케이션 전체에서 사용되는 토스트 메시지의 표시 방식을 설정합니다.
 */
const ToastContainer: React.FC = () => {
  return (
    <ReactToastContainer
      position="top-center"
      autoClose={5000} // 5초 (기본값 보다 길게 설정)
      hideProgressBar={false}
      newestOnTop
      closeOnClick
      rtl={false}
      pauseOnFocusLoss
      draggable
      pauseOnHover
      theme="light"
      limit={3} // 최대 3개의 토스트 동시 표시
    />
  );
};

export default ToastContainer;
