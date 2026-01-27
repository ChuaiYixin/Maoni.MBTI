import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabaseClient'

function Profile({ user, onBack, onOpenAuth }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expandedId, setExpandedId] = useState(null)

  useEffect(() => {
    if (!user || !supabase) {
      setLoading(false)
      return
    }
    const fetchHistory = async () => {
      try {
        const { data, error: err } = await supabase
          .from('mbti_attempts')
          .select('id, created_at, result_type, answers, type_probs')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50)
        if (err) throw err
        setHistory(data || [])
      } catch (err) {
        setError(err?.message || '加载失败')
      } finally {
        setLoading(false)
      }
    }
    fetchHistory()
  }, [user])

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (!user) {
    return (
      <motion.div
        className="max-w-2xl mx-auto glass-effect rounded-3xl p-8 md:p-12 shadow-2xl text-center"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="text-6xl mb-4">🔐</div>
        <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">请先登录</h2>
        <p className="text-gray-600 mb-6">登录后可查看您的测试历史记录</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <motion.button
            onClick={onOpenAuth}
            className="btn-primary"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            去登录
          </motion.button>
          {onBack && (
            <motion.button
              onClick={onBack}
              className="btn-secondary"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              返回
            </motion.button>
          )}
        </div>
      </motion.div>
    )
  }

  if (loading) {
    return (
      <motion.div
        className="max-w-4xl mx-auto glass-effect rounded-3xl p-8 md:p-12 shadow-2xl text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="text-4xl mb-4">⏳</div>
        <p className="text-gray-600">加载中...</p>
      </motion.div>
    )
  }

  if (error) {
    return (
      <motion.div
        className="max-w-4xl mx-auto glass-effect rounded-3xl p-8 md:p-12 shadow-2xl text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="text-4xl mb-4">❌</div>
        <p className="text-red-600 mb-4">{error}</p>
        {onBack && (
          <motion.button
            onClick={onBack}
            className="btn-secondary"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            返回
          </motion.button>
        )}
      </motion.div>
    )
  }

  return (
    <motion.div
      className="max-w-4xl mx-auto glass-effect rounded-3xl p-6 md:p-8 lg:p-12 shadow-2xl"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-800">测试历史</h2>
        {onBack && (
          <motion.button
            onClick={onBack}
            className="btn-secondary text-sm"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            返回
          </motion.button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📝</div>
          <p className="text-gray-600 text-lg">暂无测试记录</p>
          <p className="text-gray-500 text-sm mt-2">完成测试后，记录将显示在这里</p>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((item, index) => {
            const expanded = expandedId === item.id
            const top5 = (item.type_probs || []).slice(0, 5)
            return (
              <motion.div
                key={item.id}
                className="glass-effect rounded-xl p-4 md:p-5 border border-gray-200/50 hover:border-purple-300 transition"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <button
                  type="button"
                  onClick={() => setExpandedId(expanded ? null : item.id)}
                  className="w-full text-left flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                >
                  <span className="text-2xl font-bold text-purple-600">{item.result_type || '—'}</span>
                  <span className="text-sm text-gray-600">{formatDate(item.created_at)}</span>
                  <span className="text-gray-400">{expanded ? '▼' : '▶'}</span>
                </button>
                {expanded && (
                  <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                    <div>
                      <div className="text-xs font-semibold text-gray-500 mb-1">type_probs (top 5)</div>
                      <div className="text-sm text-gray-700">
                        {top5.length ? top5.map(({ type: t, p }) => (
                          <span key={t} className="mr-3">
                            {t} {(p * 100).toFixed(1)}%
                          </span>
                        )) : '—'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-gray-500 mb-1">answers</div>
                      <pre className="text-xs bg-gray-100 p-2 rounded font-mono text-gray-700 overflow-x-auto">
                        {Object.keys(item.answers || {}).length
                          ? JSON.stringify(item.answers, null, 2)
                          : '{}'}
                      </pre>
                    </div>
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>
      )}
    </motion.div>
  )
}

export default Profile
