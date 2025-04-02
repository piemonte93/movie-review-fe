import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const OAuth2RedirectHandler = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { login } = useAuth();

    useEffect(() => {
        const handleOAuth2Redirect = async () => {
            try {
                const code = searchParams.get('code');
                const state = searchParams.get('state');
                const isNewUser = searchParams.get('isNewUser');

                console.log('OAuth2Redirect 쿼리 파라미터:', {
                    state,
                    code,
                    scope: searchParams.get('scope'),
                    authuser: searchParams.get('authuser'),
                    prompt: searchParams.get('prompt')
                });
                console.log('isNewUser 파라미터:', isNewUser);

                if (code && state) {
                    const response = await fetch('http://localhost:8080/api/auth/oauth2/callback', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            code,
                            state,
                            redirectUri: 'http://localhost:5173/oauth2/redirect'
                        }),
                    });

                    if (response.ok) {
                        const data = await response.json();
                        await login(data.token, data.user);
                        navigate('/');
                    } else {
                        console.error('OAuth2 콜백 처리 실패');
                        navigate('/login');
                    }
                } else {
                    console.error('필수 파라미터 누락');
                    navigate('/login');
                }
            } catch (error) {
                console.error('OAuth2 리다이렉트 처리 중 오류:', error);
                navigate('/login');
            }
        };

        handleOAuth2Redirect();
    }, [searchParams, navigate, login]);

    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
                <h2 className="text-2xl font-semibold mb-4">로그인 처리 중...</h2>
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            </div>
        </div>
    );
};

export default OAuth2RedirectHandler; 