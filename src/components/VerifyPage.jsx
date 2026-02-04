import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'

function parseVerifyParams() {
  const url = new URL(window.location.href)
  return {
    data: url.searchParams.get('data') || '',
    picc_data: url.searchParams.get('picc_data') || '',
    cmac: url.searchParams.get('cmac') || '',
  }
}

// Mock：预留后端解密 API 接口
async function verifyWithBackendAPI({ data, picc_data, cmac }) {
  // TODO: 替换为真实后端接口（示例）
  // const res = await fetch('/api/verify', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ data, picc_data, cmac }),
  // })
  // if (!res.ok) throw new Error('verify api failed')
  // return await res.json()

  // Mock 返回：假 UID
  return {
    ok: true,
    uid: '04A1B2C3D4E5F6', // mock
    message: 'mock ok',
  }
}

export default function VerifyPage() {
  const params = useMemo(() => parseVerifyParams(), [])
  const [status, setStatus] = useState('loading') // loading | success | failed
  const [uid, setUid] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    setError('')

    const t = setTimeout(async () => {
      try {
        const res = await verifyWithBackendAPI(params)
        if (cancelled) return
        if (res?.ok) {
          setUid(res.uid || '')
          setStatus('success')
        } else {
          setError(res?.message || '验证失败')
          setStatus('failed')
        }
      } catch (e) {
        if (cancelled) return
        setError(e?.message || '验证失败')
        setStatus('failed')
      }
    }, 1500)

    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [params])

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="glass-effect rounded-3xl p-6 md:p-8 shadow-2xl">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
            {status === 'loading' ? '正在通过 NTAG 424 DNA 协议进行安全校验...' : status === 'success' ? '正品验证成功' : '验证失败'}
          </h2>

          <p className="text-sm md:text-base text-gray-600 mb-6">
            {status === 'loading'
              ? '请稍候，正在解析并校验芯片安全数据。'
              : status === 'success'
                ? '已完成安全校验，芯片 UID 已上链存证。'
                : '未能通过校验，请检查链接参数或稍后重试。'}
          </p>

          {status !== 'loading' && (
            <div className="rounded-2xl bg-white/70 border border-gray-200/60 p-4 md:p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-gray-500 mb-1">UID</div>
                  <div className="font-mono text-sm text-gray-800 break-all">
                    {status === 'success' ? uid : '—'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">参数摘要</div>
                  <div className="font-mono text-xs text-gray-700 break-all">
                    {`data=${(params.data || '').slice(0, 24)}${(params.data || '').length > 24 ? '...' : ''}`}
                  </div>
                  <div className="font-mono text-xs text-gray-700 break-all">
                    {`picc_data=${(params.picc_data || '').slice(0, 24)}${(params.picc_data || '').length > 24 ? '...' : ''}`}
                  </div>
                  <div className="font-mono text-xs text-gray-700 break-all">
                    {`cmac=${(params.cmac || '').slice(0, 24)}${(params.cmac || '').length > 24 ? '...' : ''}`}
                  </div>
                </div>
              </div>

              {status === 'failed' && (
                <div className="mt-4 text-sm text-red-600">
                  {error || '验证失败'}
                </div>
              )}
            </div>
          )}

          <div className="mt-6 flex gap-3 flex-wrap">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => (window.location.href = '/')}
            >
              返回首页
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={() => window.location.reload()}
            >
              重新验证
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

