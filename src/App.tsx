import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import SearchPage from "./pages/SearchPage";
import MoviesPage from "./pages/MoviesPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import VerifyCodePage from "./pages/VerifyCodePage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import ContentDetailPage from "./pages/ContentDetailPage";
import ContentVideosPage from "./pages/ContentVideosPage";
import OAuth2RedirectHandler from "./pages/OAuth2RedirectHandler";
import { AuthProvider } from "./context/AuthContext";
import { NotificationProvider } from "./context/NotificationContext";
import ScrollToTop from "./components/ScrollToTop";
import ProfilePage from "./pages/ProfilePage";
import ProfileEditPage from "./pages/ProfileEditPage";
import UserProfilePage from "./pages/UserProfilePage";
import CommunityPage from "./pages/CommunityPage";
import MovieReviewsPage from "./pages/MovieReviewsPage";
import AdminPage from "./pages/AdminPage";
import { ToastContainer } from "react-toastify";
import TvShowsPage from "./pages/TvShowsPage";
import Footer from "./components/Footer";
import TvReviewsPage from "./pages/TvReviewsPage";

function App() {
  return (
    <Router>
      <ScrollToTop />
      <AuthProvider>
        <NotificationProvider>
          <div className="flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-grow pt-20 pb-8">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route
                  path="/forgot-password"
                  element={<ForgotPasswordPage />}
                />
                <Route path="/verify-code" element={<VerifyCodePage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/movie/:id" element={<ContentDetailPage />} />
                <Route
                  path="/movie/:id/videos"
                  element={<ContentVideosPage />}
                />
                <Route path="/tv/:id" element={<ContentDetailPage />} />
                <Route path="/tv/:id/videos" element={<ContentVideosPage />} />
                <Route
                  path="/oauth2/redirect"
                  element={<OAuth2RedirectHandler />}
                />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/movies" element={<MoviesPage />} />
                <Route path="/tv" element={<TvShowsPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/profile/edit" element={<ProfileEditPage />} />
                <Route path="/profile/:userId" element={<UserProfilePage />} />
                <Route
                  path="/user-profile/:userId"
                  element={<UserProfilePage />}
                />
                <Route path="/community" element={<CommunityPage />} />
                <Route path="/movie-reviews" element={<MovieReviewsPage />} />
                <Route path="/tv-reviews" element={<TvReviewsPage />} />
                <Route path="/admin" element={<AdminPage />} />
              </Routes>
            </main>
            <Footer />
          </div>
          <ToastContainer
            position="top-right"
            autoClose={10000}
            hideProgressBar={false}
            newestOnTop={true}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="light"
            style={{ zIndex: 9999 }}
          />
        </NotificationProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
