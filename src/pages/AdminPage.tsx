import React, { useState } from "react";
import { FaChevronRight, FaChevronDown } from "react-icons/fa";
import { Link } from "react-router-dom";

interface AdminSectionProps {
  title: string;
  children: React.ReactNode;
}

const AdminSection: React.FC<AdminSectionProps> = ({ title, children }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border border-gray-200 rounded-md mb-4">
      <div 
        className="flex justify-between items-center p-4 bg-gray-50 cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <h3 className="font-medium text-lg">{title}</h3>
        {isOpen ? <FaChevronDown /> : <FaChevronRight />}
      </div>
      {isOpen && (
        <div className="p-4 border-t border-gray-200">
          {children}
        </div>
      )}
    </div>
  );
};

const AdminPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100">
      <main className="pt-16 pb-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h1 className="text-2xl font-bold mb-6">관리 서비스</h1>
            
            <AdminSection title="신고 접수 목록">
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="py-2 px-4 border-b text-left">ID</th>
                      <th className="py-2 px-4 border-b text-left">신고 내용</th>
                      <th className="py-2 px-4 border-b text-left">신고자</th>
                      <th className="py-2 px-4 border-b text-left">신고 대상</th>
                      <th className="py-2 px-4 border-b text-left">상태</th>
                      <th className="py-2 px-4 border-b text-left">조치</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="py-2 px-4 border-b">1</td>
                      <td className="py-2 px-4 border-b">불건전한 내용 게시</td>
                      <td className="py-2 px-4 border-b">
                        <Link to="/profile/123" className="text-blue-600 hover:underline">
                          user123
                        </Link>
                      </td>
                      <td className="py-2 px-4 border-b">
                        <Link to="/profile/456" className="text-blue-600 hover:underline">
                          spam_user
                        </Link>
                      </td>
                      <td className="py-2 px-4 border-b">처리중</td>
                      <td className="py-2 px-4 border-b">
                        <button className="bg-blue-500 text-white px-3 py-1 rounded-md text-sm mr-2">
                          처리
                        </button>
                        <button className="bg-red-500 text-white px-3 py-1 rounded-md text-sm">
                          거부
                        </button>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-4 border-b">2</td>
                      <td className="py-2 px-4 border-b">욕설과 비방</td>
                      <td className="py-2 px-4 border-b">
                        <Link to="/profile/789" className="text-blue-600 hover:underline">
                          user456
                        </Link>
                      </td>
                      <td className="py-2 px-4 border-b">
                        <Link to="/profile/101" className="text-blue-600 hover:underline">
                          toxic_user
                        </Link>
                      </td>
                      <td className="py-2 px-4 border-b">대기중</td>
                      <td className="py-2 px-4 border-b">
                        <button className="bg-blue-500 text-white px-3 py-1 rounded-md text-sm mr-2">
                          처리
                        </button>
                        <button className="bg-red-500 text-white px-3 py-1 rounded-md text-sm">
                          거부
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </AdminSection>
            
            <AdminSection title="차단 유저 리스트">
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="py-2 px-4 border-b text-left">ID</th>
                      <th className="py-2 px-4 border-b text-left">사용자명</th>
                      <th className="py-2 px-4 border-b text-left">이메일</th>
                      <th className="py-2 px-4 border-b text-left">차단 사유</th>
                      <th className="py-2 px-4 border-b text-left">차단 일자</th>
                      <th className="py-2 px-4 border-b text-left">조치</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="py-2 px-4 border-b">1</td>
                      <td className="py-2 px-4 border-b">
                        <Link to="/profile/222" className="text-blue-600 hover:underline">
                          blocked_user1
                        </Link>
                      </td>
                      <td className="py-2 px-4 border-b">user1@example.com</td>
                      <td className="py-2 px-4 border-b">스팸 리뷰 작성</td>
                      <td className="py-2 px-4 border-b">2023-04-01</td>
                      <td className="py-2 px-4 border-b">
                        <button className="bg-green-500 text-white px-3 py-1 rounded-md text-sm">
                          차단 해제
                        </button>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-4 border-b">2</td>
                      <td className="py-2 px-4 border-b">
                        <Link to="/profile/333" className="text-blue-600 hover:underline">
                          blocked_user2
                        </Link>
                      </td>
                      <td className="py-2 px-4 border-b">user2@example.com</td>
                      <td className="py-2 px-4 border-b">욕설 사용</td>
                      <td className="py-2 px-4 border-b">2023-03-28</td>
                      <td className="py-2 px-4 border-b">
                        <button className="bg-green-500 text-white px-3 py-1 rounded-md text-sm">
                          차단 해제
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </AdminSection>
            
            <AdminSection title="회원 관리">
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="py-2 px-4 border-b text-left">ID</th>
                      <th className="py-2 px-4 border-b text-left">사용자명</th>
                      <th className="py-2 px-4 border-b text-left">이메일</th>
                      <th className="py-2 px-4 border-b text-left">가입일</th>
                      <th className="py-2 px-4 border-b text-left">상태</th>
                      <th className="py-2 px-4 border-b text-left">조치</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="py-2 px-4 border-b">1</td>
                      <td className="py-2 px-4 border-b">
                        <Link to="/profile/444" className="text-blue-600 hover:underline">
                          user123
                        </Link>
                      </td>
                      <td className="py-2 px-4 border-b">user123@example.com</td>
                      <td className="py-2 px-4 border-b">2023-02-15</td>
                      <td className="py-2 px-4 border-b">활성</td>
                      <td className="py-2 px-4 border-b">
                        <button className="bg-yellow-500 text-white px-3 py-1 rounded-md text-sm mr-2">
                          수정
                        </button>
                        <button className="bg-red-500 text-white px-3 py-1 rounded-md text-sm">
                          차단
                        </button>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-4 border-b">2</td>
                      <td className="py-2 px-4 border-b">
                        <Link to="/profile/555" className="text-blue-600 hover:underline">
                          user456
                        </Link>
                      </td>
                      <td className="py-2 px-4 border-b">user456@example.com</td>
                      <td className="py-2 px-4 border-b">2023-01-20</td>
                      <td className="py-2 px-4 border-b">활성</td>
                      <td className="py-2 px-4 border-b">
                        <button className="bg-yellow-500 text-white px-3 py-1 rounded-md text-sm mr-2">
                          수정
                        </button>
                        <button className="bg-red-500 text-white px-3 py-1 rounded-md text-sm">
                          차단
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </AdminSection>
            
            <AdminSection title="블라인드 처리된 게시글 목록">
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="py-2 px-4 border-b text-left">ID</th>
                      <th className="py-2 px-4 border-b text-left">게시글 제목</th>
                      <th className="py-2 px-4 border-b text-left">작성자</th>
                      <th className="py-2 px-4 border-b text-left">블라인드 사유</th>
                      <th className="py-2 px-4 border-b text-left">블라인드 일자</th>
                      <th className="py-2 px-4 border-b text-left">조치</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="py-2 px-4 border-b">1</td>
                      <td className="py-2 px-4 border-b">영화 리뷰 제목</td>
                      <td className="py-2 px-4 border-b">
                        <Link to="/profile/666" className="text-blue-600 hover:underline">
                          user789
                        </Link>
                      </td>
                      <td className="py-2 px-4 border-b">부적절한 내용</td>
                      <td className="py-2 px-4 border-b">2023-03-15</td>
                      <td className="py-2 px-4 border-b">
                        <button className="bg-blue-500 text-white px-3 py-1 rounded-md text-sm mr-2">
                          조회
                        </button>
                        <button className="bg-green-500 text-white px-3 py-1 rounded-md text-sm">
                          복구
                        </button>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-4 border-b">2</td>
                      <td className="py-2 px-4 border-b">영화 리뷰 제목 2</td>
                      <td className="py-2 px-4 border-b">
                        <Link to="/profile/777" className="text-blue-600 hover:underline">
                          user987
                        </Link>
                      </td>
                      <td className="py-2 px-4 border-b">스포일러 내용</td>
                      <td className="py-2 px-4 border-b">2023-03-10</td>
                      <td className="py-2 px-4 border-b">
                        <button className="bg-blue-500 text-white px-3 py-1 rounded-md text-sm mr-2">
                          조회
                        </button>
                        <button className="bg-green-500 text-white px-3 py-1 rounded-md text-sm">
                          복구
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </AdminSection>
          </div>
        </div>
      </main>
      
      {/* 푸터 영역 */}
      <footer className="bg-gray-800 text-white py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between">
            <div className="mb-4 md:mb-0">
              <h3 className="font-medium mb-2">Site name</h3>
            </div>

            <div className="grid grid-cols-3 gap-8">
              <div>
                <h4 className="font-medium mb-2">Topic</h4>
                <ul className="space-y-1">
                  <li>
                    <a href="#" className="text-gray-300 hover:text-white">
                      Page
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-gray-300 hover:text-white">
                      Page
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-gray-300 hover:text-white">
                      Page
                    </a>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium mb-2">Topic</h4>
                <ul className="space-y-1">
                  <li>
                    <a href="#" className="text-gray-300 hover:text-white">
                      Page
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-gray-300 hover:text-white">
                      Page
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-gray-300 hover:text-white">
                      Page
                    </a>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium mb-2">Topic</h4>
                <ul className="space-y-1">
                  <li>
                    <a href="#" className="text-gray-300 hover:text-white">
                      Page
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-gray-300 hover:text-white">
                      Page
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-gray-300 hover:text-white">
                      Page
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AdminPage; 