import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabaseClient'

function Profile({ user, onBack, onOpenAuth }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!user || !supabase) {
      setLoading(false)
      return
    }
    const fetchHistory = async () => {
      try {
        const { data, error: err } = await supabase
          .from('mbti_attempts')
          .select('id, created_at, type, result_hash, test_version')
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

  const copyHash = async (hash) => {
    try {
      await navigator.clipboard.writeText(hash)
      alert('已复制到剪贴板')
    } catch (err) {
      alert('复制失败')
    }
  }

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
          {history.map((item, index) => (
            <motion.div
              key={item.id}
              className="glass-effect rounded-xl p-4 md:p-5 border border-gray-200/50 hover:border-purple-300 transition"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl font-bold text-purple-600">{item.type}</span>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      {item.test_version}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    {formatDate(item.created_at)}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Hash:</span>
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono text-gray-700 truncate max-w-[200px] sm:max-w-none">
                      {item.result_hash}
                    </code>
                    <motion.button
                      onClick={() => copyHash(item.result_hash)}
                      className="text-xs text-purple-600 hover:text-purple-700 px-2 py-1 rounded hover:bg-purple-50 transition"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      title="复制"
                    >
                      📋
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  )
}

export default Profile
