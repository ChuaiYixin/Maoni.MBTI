/**
 * NFC 验证结果页：从 URL 读取 picc_data / enc / cmac，调用后端 /api/verify，展示三种状态之一。
 * 调试：页面顶部展示原始 URL、全部 query 参数、时间戳；可请求 /api/debug-sdm 查看后端中间结果。
 */
import { useEffect, useMemo, useState, useCallback } from 'react'
import { motion } from 'framer-motion'

function parseVerifyParams() {
  const url = new URL(window.location.href)
  return {
    picc_data: url.searchParams.get('picc_data') || '',
    enc: url.searchParams.get('enc') || '',
    cmac: url.searchParams.get('cmac') || '',
  }
}

/** 从当前 URL 解析出所有 query 的 key/value（包括 trial 等） */
function getAllQueryParams() {
  const url = new URL(window.location.href)
  const entries = []
  url.searchParams.forEach((value, key) => entries.push({ key, value }))
  return entries
}

async function callVerifyAPI(params) {
  const query = new URLSearchParams({
    picc_data: params.picc_data,
    enc: params.enc,
    cmac: params.cmac,
  }).toString()
  const base = typeof window !== 'undefined' ? window.location.origin : ''
  const res = await fetch(`${base}/api/verify?${query}`)
  if (!res.ok) throw new Error(`请求失败: ${res.status}`)
  return res.json()
}

async function callDebugSdmAPI() {
  const url = new URL(window.location.href)
  const base = typeof window !== 'undefined' ? window.location.origin : ''
  const res = await fetch(`${base}/api/debug-sdm?${url.searchParams.toString()}`)
  if (!res.ok) throw new Error(`调试接口请求失败: ${res.status}`)
  return res.json()
}

export default function VerifyPage() {
  const params = useMemo(() => parseVerifyParams(), [])
  const [status, setStatus] = useState('loading')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const [rawUrl, setRawUrl] = useState('')
  const [queryParams, setQueryParams] = useState([])
  const [pageTimestamp, setPageTimestamp] = useState('')
  const [debugApiResult, setDebugApiResult] = useState(null)
  const [debugLoading, setDebugLoading] = useState(false)
  const [debugError, setDebugError] = useState('')

  useEffect(() => {
    setRawUrl(window.location.href)
    setQueryParams(getAllQueryParams())
    setPageTimestamp(new Date().toISOString())
  }, [])

  const loadDebugApi = useCallback(() => {
    setDebugLoading(true)
    setDebugError('')
    callDebugSdmAPI()
      .then((data) => {
        setDebugApiResult(data)
      })
      .catch((e) => {
        setDebugError(e.message || '请求失败')
      })
      .finally(() => setDebugLoading(false))
  }, [])

  const hasNfcParams = !!(params.picc_data && params.cmac)

  useEffect(() => {
    let cancelled = false
    setError('')

    if (!hasNfcParams) {
      setStatus('incomplete')
      return
    }

    setStatus('loading')
    callVerifyAPI(params)
      .then((data) => {
        if (cancelled) return
        if (data.valid) {
          setResult(data)
          setStatus('success')
        } else {
          setError(data.message || '验证失败')
          setStatus('failed')
        }
      })
      .catch((e) => {
        if (cancelled) return
        setError(e.message || '验证异常')
        setStatus('failed')
      })

    return () => { cancelled = true }
  }, [params.picc_data, params.enc, params.cmac, hasNfcParams])

  const ui = useCallback(() => {
    switch (status) {
      case 'loading':
        return {
          title: '正在通过 NTAG 424 DNA 协议进行安全校验...',
          desc: '请稍候，正在解析并校验芯片安全数据。',
          icon: (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
              className="text-4xl text-purple-500"
            >
              ⚙️
            </motion.div>
          ),
        }
      case 'success':
        return {
          title: '验证通过（真卡）',
          desc: '已完成安全校验，芯片数据有效。',
          icon: (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 10, delay: 0.2 }}
              className="text-4xl text-green-500"
            >
              ✅
            </motion.div>
          ),
        }
      case 'failed':
        return {
          title: '验证失败（假卡/非官方）',
          desc: error || '未能通过校验，请检查链接或稍后重试。',
          icon: (
            <motion.div
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 10, delay: 0.2 }}
              className="text-4xl text-red-500"
            >
              ❌
            </motion.div>
          ),
        }
      case 'incomplete':
        return {
          title: '参数不完整 / 非 NFC 扫描',
          desc: 'URL 中缺少 picc_data 或 cmac，请确保通过 NFC 扫描打开。',
          icon: (
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 10, delay: 0.2 }}
              className="text-4xl text-yellow-500"
            >
              ⚠️
            </motion.div>
          ),
        }
      default:
        return { title: '', desc: '', icon: null }
    }
  }, [status, error])

  const { title, desc, icon } = ui()

  return (
    <div className="min-h-[calc(100vh-60px)] flex items-center justify-center p-4">
      <div className="w-full max-w-4xl mx-auto space-y-6">
        {/* ========== 调试信息（DEBUG）：原始 URL、全部 query、时间戳 ========== */}
        <motion.div
          className="glass-effect rounded-2xl p-4 md:p-5 shadow-lg text-left border-2 border-amber-200"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h3 className="text-lg font-bold text-amber-800 mb-3">🔧 调试信息（DEBUG）</h3>
          <div className="space-y-2 text-sm font-mono break-all">
            <div>
              <span className="text-gray-600 font-sans">原始 URL：</span>
              <span className="text-gray-900">{rawUrl || window.location?.href || '-'}</span>
            </div>
            <div>
              <span className="text-gray-600 font-sans">当前时间戳：</span>
              <span className="text-gray-900">{pageTimestamp || new Date().toISOString()}</span>
            </div>
            <div className="pt-2">
              <span className="text-gray-600 font-sans">Query 参数（key / value）：</span>
              <ul className="mt-1 list-disc list-inside space-y-1 text-gray-900">
                {queryParams.length === 0 ? (
                  <li>（无）</li>
                ) : (
                  queryParams.map(({ key, value }) => (
                    <li key={key}>
                      <strong>{key}</strong> = {value.length > 120 ? `${value.slice(0, 120)}…` : value}
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        </motion.div>

        {/* ========== 后端调试 API：获取 /api/debug-sdm 结果 ========== */}
        <motion.div
          className="glass-effect rounded-2xl p-4 md:p-5 shadow-lg text-left border-2 border-blue-200"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
        >
          <h3 className="text-lg font-bold text-blue-800 mb-3">🔧 后端调试 API（DEBUG ONLY）</h3>
          <p className="text-sm text-gray-600 mb-3">调用 GET /api/debug-sdm，查看服务器端中间计算结果（非最终验证逻辑）。</p>
          <button
            type="button"
            className="btn-secondary text-sm mb-3"
            onClick={loadDebugApi}
            disabled={debugLoading}
          >
            {debugLoading ? '请求中…' : '获取后端调试数据'}
          </button>
          {debugError && <p className="text-sm text-red-600 mb-2">{debugError}</p>}
          {debugApiResult && (
            <pre className="bg-gray-100 rounded-lg p-3 text-xs overflow-x-auto max-h-96 overflow-y-auto border border-gray-300">
              {JSON.stringify(debugApiResult, null, 2)}
            </pre>
          )}
        </motion.div>

        {/* ========== 验证结果状态 ========== */}
        <motion.div
          className="glass-effect rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col items-center text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="mb-6">{icon}</div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-3">{title}</h2>
          <p className="text-sm md:text-base text-gray-600 mb-6">{desc}</p>

          {status === 'success' && result?.nft && (
            <div className="rounded-2xl bg-white/70 border border-gray-200/60 p-4 md:p-5 w-full mb-6 text-left">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">NFT 信息</h3>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <img
                  src={result.nft.image}
                  alt={result.nft.name}
                  className="w-24 h-24 rounded-lg object-cover shadow-md"
                />
                <div className="flex-1">
                  <div className="text-base font-bold text-purple-600">{result.nft.name}</div>
                  <div className="text-sm text-gray-700 mt-1">{result.nft.description}</div>
                  <div className="text-xs text-gray-500 mt-2">
                    Tag ID: <span className="font-mono break-all">{result.tag_id}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="mt-auto flex gap-3 flex-wrap justify-center">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => (window.location.href = '/')}
            >
              返回首页
            </button>
            {(status === 'failed' || status === 'incomplete') && (
              <button type="button" className="btn-primary" onClick={() => window.location.reload()}>
                重新验证
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
