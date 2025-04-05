import React from "react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  className = "",
}) => {
  // 현재 페이지 주변에 표시할 페이지 수
  const maxPageButtons = 5;

  // 페이지네이션 버튼 생성 함수
  const renderPageButtons = () => {
    // 총 페이지가 최대 버튼 수보다 적은 경우
    if (totalPages <= maxPageButtons) {
      return Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
        <button
          key={page}
          onClick={() => onPageChange(page)}
          className={`px-3 py-2 ${
            currentPage === page
              ? "bg-blue-600 text-white"
              : "bg-white text-gray-700 hover:bg-gray-100"
          } border border-gray-300 rounded-md mx-1`}
        >
          {page}
        </button>
      ));
    }

    // 표시할 페이지 범위 계산
    let startPage = Math.max(currentPage - Math.floor(maxPageButtons / 2), 1);
    const endPage = Math.min(startPage + maxPageButtons - 1, totalPages);

    // endPage에 따라 startPage 조정
    if (endPage - startPage + 1 < maxPageButtons) {
      startPage = Math.max(endPage - maxPageButtons + 1, 1);
    }

    const pages = [];

    // 첫 페이지 버튼
    if (startPage > 1) {
      pages.push(
        <button
          key="first"
          onClick={() => onPageChange(1)}
          className="px-3 py-2 bg-white text-gray-700 hover:bg-gray-100 border border-gray-300 rounded-md mx-1"
        >
          1
        </button>
      );

      // 건너뛰기 표시
      if (startPage > 2) {
        pages.push(
          <span key="ellipsis1" className="px-3 py-2 text-gray-600">
            ...
          </span>
        );
      }
    }

    // 페이지 버튼
    for (let page = startPage; page <= endPage; page++) {
      pages.push(
        <button
          key={page}
          onClick={() => onPageChange(page)}
          className={`px-3 py-2 ${
            currentPage === page
              ? "bg-blue-600 text-white"
              : "bg-white text-gray-700 hover:bg-gray-100"
          } border border-gray-300 rounded-md mx-1`}
        >
          {page}
        </button>
      );
    }

    // 마지막 페이지 버튼
    if (endPage < totalPages) {
      // 건너뛰기 표시
      if (endPage < totalPages - 1) {
        pages.push(
          <span key="ellipsis2" className="px-3 py-2 text-gray-600">
            ...
          </span>
        );
      }

      pages.push(
        <button
          key="last"
          onClick={() => onPageChange(totalPages)}
          className="px-3 py-2 bg-white text-gray-700 hover:bg-gray-100 border border-gray-300 rounded-md mx-1"
        >
          {totalPages}
        </button>
      );
    }

    return pages;
  };

  return (
    <div className={`flex justify-center items-center ${className}`}>
      {/* 이전 페이지 버튼 */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        className={`px-3 py-2 mr-1 border border-gray-300 rounded-md ${
          currentPage <= 1
            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
            : "bg-white text-gray-700 hover:bg-gray-100"
        }`}
      >
        이전
      </button>

      {/* 페이지 버튼 */}
      {renderPageButtons()}

      {/* 다음 페이지 버튼 */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className={`px-3 py-2 ml-1 border border-gray-300 rounded-md ${
          currentPage >= totalPages
            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
            : "bg-white text-gray-700 hover:bg-gray-100"
        }`}
      >
        다음
      </button>
    </div>
  );
};

export default Pagination;
