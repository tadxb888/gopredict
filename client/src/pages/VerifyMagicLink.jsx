import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function VerifyMagicLink() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [status, setStatus] = useState('verifying');
  const hasVerified = useRef(false);

  useEffect(() => {
    // Prevent double verification
    if (hasVerified.current) return;
    
    const token = searchParams.get('token');

    if (!token) {
      setStatus('error');
      toast.error('Invalid magic link');
      return;
    }

    hasVerified.current = true;

    authAPI.verifyMagicLink(token)
      .then((res) => {
        console.log('✓ Verification successful');
        login(res.data.token, res.data.user);
        setStatus('success');
        toast.success('Login successful!');
        setTimeout(() => navigate('/dashboard'), 1000);
      })
      .catch((error) => {
        console.error('✗ Verification failed:', error.response?.data);
        setStatus('error');
        toast.error(error.response?.data?.message || 'Invalid or expired magic link');
      });
  }, [searchParams, login, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="card max-w-md w-full text-center">
        {status === 'verifying' && (
          <>
            <div className="animate-spin h-12 w-12 border-4 border-success border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-text">Verifying your magic link...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="text-success text-5xl mb-4">✓</div>
            <p className="text-success text-xl">Login Successful!</p>
            <p className="text-text-muted mt-2">Redirecting...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="text-red-500 text-5xl mb-4">✗</div>
            <p className="text-red-500 text-xl mb-4">Verification Failed</p>
            <button
              onClick={() => navigate('/login')}
              className="btn-primary"
            >
              Back to Login
            </button>
          </>
        )}
      </div>
    </div>
  );
}
