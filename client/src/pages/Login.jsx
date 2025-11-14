import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await authAPI.requestMagicLink(email);
      setSent(true);
      toast.success('Magic link sent! Check your email.');
    } catch (error) {
      toast.error('Failed to send magic link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: '#1a2332' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-6">
            <div className="w-8 h-8 bg-primary rounded"></div>
            <span className="text-2xl font-bold">
              <span style={{ color: '#68FF8E' }}>Go</span>
              <span style={{ color: '#FFFFFF' }}>Predict</span>
            </span>
          </div>
          <h3 className="text-2xl font-semibold text-white mb-3">
            Probably the most accurate market predictions.
          </h3>
          <p className="text-gray-400">
            Access to the most powerful tool in the entire design and web industry.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-xl p-8">
          {!sent ? (
            <>
              <h4 className="text-xl font-semibold mb-6 text-center text-black">Login</h4>
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-black"
                    placeholder="E-mail Address"
                    required
                    disabled={loading}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? 'Sending...' : 'Login'}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center py-4">
              <div className="text-5xl mb-4">✓</div>
              <h4 className="text-xl font-semibold mb-2 text-black">Magic Link Sent!</h4>
              <p className="text-gray-600 mb-4">Check your email and click the link to log in.</p>
              <button
                onClick={() => setSent(false)}
                className="text-primary hover:underline"
              >
                Send another link
              </button>
            </div>
          )}
        </div>

        <div className="text-center mt-6">
          <button
            onClick={() => navigate('/terms')}
            className="text-gray-400 hover:text-white transition-colors text-sm"
          >
            Terms & Conditions
          </button>
          <span className="text-gray-600 mx-2">|</span>
          <button
            onClick={() => navigate('/privacy')}
            className="text-gray-400 hover:text-white transition-colors text-sm"
          >
            Privacy Statement
          </button>
        </div>
      </div>
    </div>
  );
}
