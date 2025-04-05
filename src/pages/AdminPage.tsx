import React, { useState, useEffect } from "react";
import { FaChevronRight, FaChevronDown, FaExclamationTriangle, FaCheck, FaTimes, FaBan, FaUnlock } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { backendApi, Report, User } from "../api/backendApi";
import { toast } from "react-toastify";

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

// 차단 사유 입력 모달 컴포넌트
interface BlockUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  title: string;
}

const BlockUserModal: React.FC<BlockUserModalProps> = ({ isOpen, onClose, onConfirm, title }) => {
  const [reason, setReason] = useState("");

  if (!isOpen) return null;

  const handleSubmit = () => {
    onConfirm(reason);
    setReason("");
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full border border-gray-300 rounded p-2 mb-4 h-32"
          placeholder="차단 사유를 입력해주세요."
        />
        <div className="flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
};

const AdminPage: React.FC = () => {
  const { isLoggedIn, user } = useAuth();
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLoading, setUserLoading] = useState(true);
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [targetUser, setTargetUser] = useState<User | null>(null);

  useEffect(() => {
    // 로그인하지 않았거나 ROLE_ADMIN 권한이 없는 경우 홈으로 리디렉션
    if (!isLoggedIn || !user?.roles?.includes("ROLE_ADMIN")) {
      navigate("/");
    } else {
      fetchReports();
      fetchUsers();
    }
  }, [isLoggedIn, user, navigate]);

  // 신고 목록 가져오기
  const fetchReports = async () => {
    try {
      setLoading(true);
      const data = await backendApi.getReports();
      setReports(data);
    } catch (error) {
      console.error("신고 목록 조회 실패:", error);
      toast.error("신고 목록을 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 사용자 목록 가져오기
  const fetchUsers = async () => {
    try {
      setUserLoading(true);
      const data = await backendApi.getAllUsers();
      setUsers(data.content || []);
    } catch (error) {
      console.error("사용자 목록 조회 실패:", error);
      toast.error("사용자 목록을 불러오는데 실패했습니다.");
    } finally {
      setUserLoading(false);
    }
  };

  // 신고 처리 함수
  const handleProcessReport = async (reportId: number, status: "PROCESSED" | "REJECTED") => {
    try {
      await backendApi.updateReportStatus(reportId, status);
      
      // 상태 업데이트 후 목록 다시 불러오기
      toast.success(status === "PROCESSED" ? "신고가 처리되었습니다." : "신고가 거부되었습니다.");
      fetchReports();
    } catch (error) {
      console.error("신고 처리 실패:", error);
      toast.error("신고 처리에 실패했습니다.");
    }
  };

  // 사용자 차단 함수
  const handleBlockUser = (user: User) => {
    // 관리자 권한이 있는 사용자는 차단할 수 없음
    if (user.roles.includes("ROLE_ADMIN")) {
      toast.error("관리자는 차단할 수 없습니다.");
      return;
    }
    
    setTargetUser(user);
    setBlockModalOpen(true);
  };

  // 차단 확인 함수
  const confirmBlockUser = async (reason: string) => {
    if (!targetUser) return;
    
    try {
      await backendApi.updateUserStatus(targetUser.id, "BLOCKED", reason);
      toast.success(`${targetUser.username} 사용자가 차단되었습니다.`);
      fetchUsers(); // 목록 다시 불러오기
    } catch (error) {
      console.error("사용자 차단 실패:", error);
      toast.error("사용자 차단에 실패했습니다.");
    } finally {
      setBlockModalOpen(false);
      setTargetUser(null);
    }
  };

  // 차단 해제 함수
  const handleUnblockUser = async (userId: number) => {
    try {
      await backendApi.updateUserStatus(userId, "ACTIVE");
      toast.success("사용자 차단이 해제되었습니다.");
      fetchUsers(); // 목록 다시 불러오기
    } catch (error) {
      console.error("사용자 차단 해제 실패:", error);
      toast.error("사용자 차단 해제에 실패했습니다.");
    }
  };

  // 권한이 없는 경우 내용을 렌더링하지 않음
  if (!isLoggedIn || !user?.roles?.includes("ROLE_ADMIN")) {
    return null;
  }

  // 신고 타입에 따른 텍스트 변환
  const getReportTypeText = (type: string) => {
    switch (type) {
      case "comment": return "댓글";
      case "post": return "게시글";
      case "review": return "리뷰";
      default: return type;
    }
  };

  // 신고 상태에 따른 텍스트 변환
  const getStatusText = (status: string) => {
    switch (status) {
      case "PENDING": return "대기중";
      case "PROCESSED": return "처리됨";
      case "REJECTED": return "거부됨";
      default: return status;
    }
  };

  // 사용자 상태에 따른 텍스트 변환
  const getUserStatusText = (status?: string) => {
    switch (status) {
      case "BLOCKED": return "차단됨";
      case "DELETED": return "삭제됨";
      default: return "활성";
    }
  };

  // 사용자 상태에 따른 클래스 변환
  const getUserStatusClass = (status?: string) => {
    switch (status) {
      case "BLOCKED": return "bg-red-100 text-red-800";
      case "DELETED": return "bg-gray-100 text-gray-800";
      default: return "bg-green-100 text-green-800";
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <main className="pt-16 pb-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h1 className="text-2xl font-bold mb-6">관리 서비스</h1>
            
            <AdminSection title="신고 접수 목록">
              {loading ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin h-8 w-8 border-4 border-gray-900 border-t-transparent rounded-full"></div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="py-2 px-4 border-b text-left">ID</th>
                        <th className="py-2 px-4 border-b text-left">신고 내용</th>
                        <th className="py-2 px-4 border-b text-left">신고자</th>
                        <th className="py-2 px-4 border-b text-left">신고 대상</th>
                        <th className="py-2 px-4 border-b text-left">대상 타입</th>
                        <th className="py-2 px-4 border-b text-left">상태</th>
                        <th className="py-2 px-4 border-b text-left">조치</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reports.length > 0 ? (
                        reports.map((report) => (
                          <tr key={report.id} className={report.status !== "PENDING" ? "bg-gray-50" : ""}>
                            <td className="py-2 px-4 border-b">{report.id}</td>
                            <td className="py-2 px-4 border-b">{report.content}</td>
                            <td className="py-2 px-4 border-b">
                              {report.reporter ? (
                                <Link to={`/user-profile/${report.reporter.id}`} className="text-blue-600 hover:underline">
                                  {report.reporter.username}
                                </Link>
                              ) : (
                                <span>알 수 없는 사용자</span>
                              )}
                            </td>
                            <td className="py-2 px-4 border-b">
                              {report.targetUser ? (
                                <Link to={`/user-profile/${report.targetUser.id}`} className="text-blue-600 hover:underline">
                                  {report.targetUser.username}
                                </Link>
                              ) : report.target ? (
                                <Link to={`/user-profile/${report.target.id}`} className="text-blue-600 hover:underline">
                                  {report.target.username}
                                </Link>
                              ) : (
                                <span>알 수 없는 사용자</span>
                              )}
                            </td>
                            <td className="py-2 px-4 border-b">
                              {getReportTypeText(report.reportType)}
                            </td>
                            <td className="py-2 px-4 border-b">
                              <span 
                                className={`px-2 py-1 rounded-full text-xs ${
                                  report.status === "PENDING" 
                                    ? "bg-yellow-100 text-yellow-800" 
                                    : report.status === "PROCESSED" 
                                      ? "bg-green-100 text-green-800" 
                                      : "bg-red-100 text-red-800"
                                }`}
                              >
                                {getStatusText(report.status)}
                              </span>
                            </td>
                            <td className="py-2 px-4 border-b">
                              {report.status === "PENDING" && (
                                <>
                                  <button 
                                    onClick={() => handleProcessReport(report.id, "PROCESSED")}
                                    className="bg-blue-500 text-white px-3 py-1 rounded-md text-sm mr-2 flex items-center"
                                  >
                                    <FaCheck className="mr-1" /> 처리
                                  </button>
                                  <button 
                                    onClick={() => handleProcessReport(report.id, "REJECTED")}
                                    className="bg-red-500 text-white px-3 py-1 rounded-md text-sm flex items-center mt-1"
                                  >
                                    <FaTimes className="mr-1" /> 거부
                                  </button>
                                </>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="py-4 text-center text-gray-500">
                            접수된 신고가 없습니다.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </AdminSection>
            
            <AdminSection title="회원 관리">
              {userLoading ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin h-8 w-8 border-4 border-gray-900 border-t-transparent rounded-full"></div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="py-2 px-4 border-b text-left">ID</th>
                        <th className="py-2 px-4 border-b text-left">사용자명</th>
                        <th className="py-2 px-4 border-b text-left">이메일</th>
                        <th className="py-2 px-4 border-b text-left">소셜로그인</th>
                        <th className="py-2 px-4 border-b text-left">상태</th>
                        <th className="py-2 px-4 border-b text-left">차단 사유</th>
                        <th className="py-2 px-4 border-b text-left">차단 일자</th>
                        <th className="py-2 px-4 border-b text-left">조치</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.length > 0 ? (
                        users.map((user) => (
                          <tr key={user.id} className={user.status === "BLOCKED" ? "bg-red-50" : ""}>
                            <td className="py-2 px-4 border-b">{user.id}</td>
                            <td className="py-2 px-4 border-b">
                              <Link to={`/user-profile/${user.id}`} className="text-blue-600 hover:underline">
                                {user.username}
                              </Link>
                            </td>
                            <td className="py-2 px-4 border-b">{user.email}</td>
                            <td className="py-2 px-4 border-b">{user.socialLogin ? "Yes" : "No"}</td>
                            <td className="py-2 px-4 border-b">
                              <span
                                className={`px-2 py-1 rounded-full text-xs ${getUserStatusClass(user.status)}`}
                              >
                                {getUserStatusText(user.status)}
                              </span>
                            </td>
                            <td className="py-2 px-4 border-b">{user.blockReason || "-"}</td>
                            <td className="py-2 px-4 border-b">
                              {user.blockDate ? new Date(user.blockDate).toLocaleDateString() : "-"}
                            </td>
                            <td className="py-2 px-4 border-b">
                              {user.status === "BLOCKED" ? (
                                <button
                                  onClick={() => handleUnblockUser(user.id)}
                                  className="bg-green-500 text-white px-3 py-1 rounded-md text-sm flex items-center"
                                >
                                  <FaUnlock className="mr-1" /> 차단 해제
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleBlockUser(user)}
                                  className={`px-3 py-1 rounded-md text-sm flex items-center 
                                    ${user.roles.includes("ROLE_ADMIN") 
                                      ? "bg-gray-400 cursor-not-allowed text-white" 
                                      : "bg-red-500 text-white hover:bg-red-600"}`}
                                  disabled={user.roles.includes("ROLE_ADMIN")}
                                  title={user.roles.includes("ROLE_ADMIN") ? "관리자는 차단할 수 없습니다" : ""}
                                >
                                  <FaBan className="mr-1" /> 차단
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={8} className="py-4 text-center text-gray-500">
                            사용자 정보가 없습니다.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </AdminSection>
            
            {/* 차단 사유 입력 모달 */}
            <BlockUserModal
              isOpen={blockModalOpen}
              onClose={() => {
                setBlockModalOpen(false);
                setTargetUser(null);
              }}
              onConfirm={confirmBlockUser}
              title={`${targetUser?.username || '사용자'} 차단하기`}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminPage; 