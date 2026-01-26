import { useState } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabaseClient'

function Auth({ onBack, onSkipLogin, onAuthSuccess, showSkipOption = false }) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(null)

  const handleGoogleLogin = async () => {
    if (!supabase) {
      setError('登录功能未配置，请设置 VITE_SUPABASE_URL 与 VITE_SUPABASE_ANON_KEY')
      return
    }
    try {
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      })
      if (err) throw err
      // Google登录会跳转，如果成功返回会触发onAuthStateChange
      if (onAuthSuccess) {
        // 延迟执行，等待登录状态更新
        setTimeout(() => {
          onAuthSuccess()
        }, 500)
      }
    } catch (err) {
      setError(err?.message || 'Google 登录失败，请重试')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    if (!supabase) {
      setError('登录功能未配置，请设置 VITE_SUPABASE_URL 与 VITE_SUPABASE_ANON_KEY')
      return
    }
    setLoading(true)
    try {
      const { error: err } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: `${window.location.origin}/` },
      })
      if (err) throw err
      setSent(true)
    } catch (err) {
      setError(err?.message || '发送失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <motion.div
        className="max-w-md mx-auto glass-effect rounded-3xl p-8 shadow-2xl text-center"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="text-5xl mb-4">✉️</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">请查收邮件</h2>
        <p className="text-gray-600 mb-6">
          我们已向 <span className="font-semibold text-purple-600">{email}</span> 发送登录链接，点击链接即可完成登录。
        </p>
        <div className="space-y-3">
          <motion.button
            type="button"
            onClick={onBack}
            className="btn-secondary w-full"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {showSkipOption ? '返回主页' : '返回'}
          </motion.button>
          {showSkipOption && onSkipLogin && (
            <>
              <motion.button
                type="button"
                onClick={onSkipLogin}
                className="btn-secondary w-full"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                不登录直接测试
              </motion.button>
              <p className="text-xs text-gray-500 mt-3">
                登录后可保存测试记录
              </p>
            </>
          )}
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      className="max-w-md mx-auto glass-effect rounded-3xl p-8 shadow-2xl"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center">邮箱登录</h2>
      <p className="text-gray-600 text-center mb-6 text-sm">
        输入邮箱，我们将发送登录链接至您的邮箱
      </p>
      
      <motion.button
        type="button"
        onClick={handleGoogleLogin}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-gray-300 hover:border-gray-400 bg-white hover:bg-gray-50 transition mb-4"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        <span className="font-semibold text-gray-700">使用 Google 登录</span>
      </motion.button>

      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 h-px bg-gray-300"></div>
        <span className="text-xs text-gray-500">或</span>
        <div className="flex-1 h-px bg-gray-300"></div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="auth-email" className="block text-sm font-medium text-gray-700 mb-1">
            邮箱
          </label>
          <input
            id="auth-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-200 outline-none transition"
            disabled={loading}
          />
        </div>
        {error && (
          <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
        )}
        <div className="flex flex-col sm:flex-row gap-3">
          <motion.button
            type="submit"
            disabled={loading}
            className="btn-primary flex-1 disabled:opacity-60 disabled:cursor-not-allowed"
            whileHover={!loading ? { scale: 1.02 } : {}}
            whileTap={!loading ? { scale: 0.98 } : {}}
          >
            {loading ? '发送中…' : '发送登录链接'}
          </motion.button>
          <motion.button
            type="button"
            onClick={onBack}
            className="btn-secondary"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {showSkipOption ? '返回主页' : '返回'}
          </motion.button>
        </div>
      </form>

      {showSkipOption && (
        <>
          <div className="mt-6 pt-6 border-t border-gray-200">
            <motion.button
              type="button"
              onClick={onSkipLogin}
              className="w-full btn-secondary"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              不登录直接测试
            </motion.button>
            <p className="text-xs text-gray-500 text-center mt-3">
              登录后可保存测试记录
            </p>
          </div>
        </>
      )}
    </motion.div>
  )
}

export default Auth
