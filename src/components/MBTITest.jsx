import { useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import questionsData from '../../mbti-questions.json'

function shuffleQuestions(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const OPTIONS = [
  { label: '完全符合', scoreA: 7, scoreB: 0, progressScore: 2 },
  { label: '比较符合', scoreA: 3, scoreB: 0, progressScore: 1 },
  { label: '不太清楚', scoreA: 1, scoreB: 1, progressScore: 0.5 },
  { label: '不太符合', scoreA: 0, scoreB: 3, progressScore: 1 },
  { label: '完全不符合', scoreA: 0, scoreB: 7, progressScore: 2 },
]

// 每个维度进度分数线，达到即该维度做完
const THRESHOLD_PER_DIM = 10
const TOTAL_PROGRESS_MAX = 4 * THRESHOLD_PER_DIM // 40
const DIMENSION_ORDER = ['EI', 'SN', 'TF', 'JP']

const mbtiTypes = {
  'INTJ': { name: '建筑师', emoji: '🧠', color: 'from-blue-500 to-indigo-600' },
  'INTP': { name: '逻辑学家', emoji: '🔬', color: 'from-indigo-500 to-purple-600' },
  'ENTJ': { name: '指挥官', emoji: '👑', color: 'from-yellow-500 to-orange-600' },
  'ENTP': { name: '辩论家', emoji: '💡', color: 'from-green-500 to-teal-600' },
  'INFJ': { name: '提倡者', emoji: '🌟', color: 'from-purple-500 to-pink-600' },
  'INFP': { name: '调停者', emoji: '🦋', color: 'from-pink-500 to-rose-600' },
  'ENFJ': { name: '主人公', emoji: '🎭', color: 'from-rose-500 to-red-600' },
  'ENFP': { name: '竞选者', emoji: '🎨', color: 'from-cyan-500 to-blue-600' },
  'ISTJ': { name: '物流师', emoji: '📋', color: 'from-gray-500 to-slate-600' },
  'ISFJ': { name: '守卫者', emoji: '🛡️', color: 'from-teal-500 to-cyan-600' },
  'ESTJ': { name: '总经理', emoji: '💼', color: 'from-blue-500 to-cyan-600' },
  'ESFJ': { name: '执政官', emoji: '🤝', color: 'from-yellow-500 to-amber-600' },
  'ISTP': { name: '鉴赏家', emoji: '🔧', color: 'from-orange-500 to-red-600' },
  'ISFP': { name: '探险家', emoji: '🎪', color: 'from-pink-500 to-fuchsia-600' },
  'ESTP': { name: '企业家', emoji: '🚀', color: 'from-red-500 to-pink-600' },
  'ESFP': { name: '表演者', emoji: '🎉', color: 'from-yellow-500 to-lime-600' },
}

function getDimension(q) {
  const a = q.typeA
  const b = q.typeB
  if ((a === 'E' && b === 'I') || (a === 'I' && b === 'E')) return 'EI'
  if ((a === 'S' && b === 'N') || (a === 'N' && b === 'S')) return 'SN'
  if ((a === 'T' && b === 'F') || (a === 'F' && b === 'T')) return 'TF'
  if ((a === 'J' && b === 'P') || (a === 'P' && b === 'J')) return 'JP'
  return 'EI'
}

function buildShuffledQuestions() {
  return shuffleQuestions(questionsData)
}

// 根据某维度的进度分合计是否达到分数线
function isDimensionDone(progressSum) {
  return progressSum >= THRESHOLD_PER_DIM
}

function MBTITest({ onBackToHome }) {
  const [shuffledQuestions, setShuffledQuestions] = useState(buildShuffledQuestions)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answersByDim, setAnswersByDim] = useState({ EI: [], SN: [], TF: [], JP: [] })
  const [usedQuestionIndices, setUsedQuestionIndices] = useState(new Set())
  const [showResult, setShowResult] = useState(false)
  const [resultProbabilities, setResultProbabilities] = useState(null)
  const [selectedIndex, setSelectedIndex] = useState(null)

  // 各维度当前进度分合计（只累加 progressScore，用于进度条与动态题量）
  const progressByDim = useMemo(() => {
    const out = { EI: 0, SN: 0, TF: 0, JP: 0 }
    DIMENSION_ORDER.forEach((dim) => {
      answersByDim[dim].forEach((a) => {
        out[dim] += a.progressScore
      })
    })
    return out
  }, [answersByDim])

  // 总进度分（四维度之和）
  const totalProgress = useMemo(
    () => DIMENSION_ORDER.reduce((s, d) => s + progressByDim[d], 0),
    [progressByDim]
  )

  // 获取已完成的维度（进度分达到分数线）
  const getCompletedDims = useCallback(() => {
    const completedDims = new Set()
    DIMENSION_ORDER.forEach((dim) => {
      if (isDimensionDone(progressByDim[dim])) completedDims.add(dim)
    })
    return completedDims
  }, [progressByDim])

  // 获取下一个可用题目（跳过已完成的维度）
  const getNextQuestion = useCallback(() => {
    const completedDims = getCompletedDims()
    
    // 从当前索引开始循环查找
    for (let offset = 0; offset < shuffledQuestions.length; offset++) {
      const i = (currentQuestionIndex + offset) % shuffledQuestions.length
      if (usedQuestionIndices.has(i)) continue
      const q = shuffledQuestions[i]
      const dim = getDimension(q)
      if (!completedDims.has(dim)) {
        return { question: q, index: i }
      }
    }
    return null
  }, [currentQuestionIndex, shuffledQuestions, usedQuestionIndices, getCompletedDims])

  const nextQ = getNextQuestion()
  const currentQ = nextQ?.question

  const answeredTotal = useMemo(() => {
    return DIMENSION_ORDER.reduce((s, d) => s + answersByDim[d].length, 0)
  }, [answersByDim])

  // 进度 = 总进度分 / 40，最大 100%
  const progress = useMemo(() => {
    return Math.min(100, (totalProgress / TOTAL_PROGRESS_MAX) * 100)
  }, [totalProgress])

  // 从 answersByDim 拉平为 { typeA, typeB, scoreA, scoreB } 列表（仅维度分，用于结果计算）
  const flattenDimensionScores = useCallback((source) => {
    const out = []
    DIMENSION_ORDER.forEach((d) => {
      (source[d] || []).forEach(({ typeA, typeB, scoreA, scoreB }) => {
        out.push({ typeA, typeB, scoreA, scoreB })
      })
    })
    return out
  }, [])

  // 用维度分计算 16 型概率，不依赖 state，避免漏算最后一题
  const calculateResultFromAnswers = useCallback((answersByDimSource) => {
    const all = flattenDimensionScores(answersByDimSource)
    const scores = { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 }
    all.forEach(({ typeA, typeB, scoreA, scoreB }) => {
      scores[typeA] = (scores[typeA] || 0) + scoreA
      scores[typeB] = (scores[typeB] || 0) + scoreB
    })

    const eiRatio = scores.E + scores.I > 0 ? (scores.E / (scores.E + scores.I)) * 100 : 50
    const snRatio = scores.S + scores.N > 0 ? (scores.S / (scores.S + scores.N)) * 100 : 50
    const tfRatio = scores.T + scores.F > 0 ? (scores.T / (scores.T + scores.F)) * 100 : 50
    const jpRatio = scores.J + scores.P > 0 ? (scores.J / (scores.J + scores.P)) * 100 : 50

    const probabilities = {}
    const types = ['E', 'I']
    const senses = ['S', 'N']
    const thinkings = ['T', 'F']
    const judgings = ['J', 'P']
    types.forEach((ei) => {
      senses.forEach((sn) => {
        thinkings.forEach((tf) => {
          judgings.forEach((jp) => {
            const type = ei + sn + tf + jp
            const eiProb = ei === 'E' ? eiRatio / 100 : (100 - eiRatio) / 100
            const snProb = sn === 'S' ? snRatio / 100 : (100 - snRatio) / 100
            const tfProb = tf === 'T' ? tfRatio / 100 : (100 - tfRatio) / 100
            const jpProb = jp === 'J' ? jpRatio / 100 : (100 - jpRatio) / 100
            probabilities[type] = eiProb * snProb * tfProb * jpProb * 100
          })
        })
      })
    })

    const sorted = Object.entries(probabilities).sort((a, b) => b[1] - a[1])
    const mostLikely = sorted[0][0]
    setResultProbabilities({ mostLikely, all: sorted })
    setShowResult(true)
  }, [flattenDimensionScores])

  const handleAnswer = (scoreA, scoreB, optionIndex, q, questionIndex) => {
    const dim = getDimension(q)
    const progressScore = OPTIONS[optionIndex].progressScore
    const entry = {
      typeA: q.typeA,
      typeB: q.typeB,
      scoreA,
      scoreB,
      optionIndex,
      progressScore,
    }
    const next = { ...answersByDim, [dim]: [...(answersByDim[dim] || []), entry] }
    setAnswersByDim(next)
    setUsedQuestionIndices((prev) => new Set([...prev, questionIndex]))
    setSelectedIndex(null)

    // 更新后的各维度进度分（仅用 progressScore，与维度分无关）
    const nextProgress = { ...progressByDim }
    nextProgress[dim] = (nextProgress[dim] || 0) + progressScore

    // 检查所有维度是否都达到分数线
    const allDimsDone = DIMENSION_ORDER.every((d) => isDimensionDone(nextProgress[d] || 0))

    if (allDimsDone) {
      setTimeout(() => calculateResultFromAnswers(next), 500)
      return
    }

    // 找到下一个可用题目（从当前索引的下一个开始，跳过已完成的维度）
    const usedPlusCurrent = new Set([...usedQuestionIndices, questionIndex])
    setTimeout(() => {
      const completedDims = new Set()
      DIMENSION_ORDER.forEach((d) => {
        if (isDimensionDone(nextProgress[d] || 0)) completedDims.add(d)
      })

      let found = false
      const startIndex = (questionIndex + 1) % shuffledQuestions.length
      for (let offset = 0; offset < shuffledQuestions.length; offset++) {
        const i = (startIndex + offset) % shuffledQuestions.length
        if (usedPlusCurrent.has(i)) continue
        const nextQu = shuffledQuestions[i]
        const nextDim = getDimension(nextQu)
        if (!completedDims.has(nextDim)) {
          setCurrentQuestionIndex(i)
          found = true
          break
        }
      }
      if (!found) {
        setTimeout(() => calculateResultFromAnswers(next), 500)
      }
    }, 300)
  }

  const resetTest = useCallback(() => {
    setShuffledQuestions(buildShuffledQuestions())
    setCurrentQuestionIndex(0)
    setAnswersByDim({ EI: [], SN: [], TF: [], JP: [] })
    setUsedQuestionIndices(new Set())
    setShowResult(false)
    setResultProbabilities(null)
  }, [])

  const handleOptionClick = (optIndex, scoreA, scoreB, q, questionIndex) => {
    setSelectedIndex(optIndex)
    setTimeout(() => {
      handleAnswer(scoreA, scoreB, optIndex, q, questionIndex)
      setSelectedIndex(null)
    }, 300)
  }

  if (showResult && resultProbabilities) {
    const { mostLikely, all } = resultProbabilities
    const typeInfo = mbtiTypes[mostLikely] || { name: '未知', emoji: '❓', color: 'from-gray-500 to-gray-600' }

    return (
      <motion.div
        className="max-w-4xl mx-auto"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="glass-effect rounded-3xl p-8 md:p-12 shadow-2xl">
          <div className="text-center mb-8">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.2 }}>
              <div className="text-8xl mb-4">{typeInfo.emoji}</div>
            </motion.div>
            <motion.h2
              className={`text-6xl md:text-7xl font-bold mb-4 bg-gradient-to-r ${typeInfo.color} bg-clip-text text-transparent`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              {mostLikely}
            </motion.h2>
            <motion.p className="text-3xl font-semibold text-gray-700 mb-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
              {typeInfo.name}
            </motion.p>
            <motion.p className="text-xl text-purple-600 font-bold" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
              概率：{all[0][1].toFixed(1)}%
            </motion.p>
          </div>

          <motion.div className="mt-8 space-y-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
            <h3 className="text-2xl font-bold text-gray-800 mb-4 text-center">所有类型概率</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {all.map(([type, prob], index) => {
                const info = mbtiTypes[type] || { name: '未知', emoji: '❓', color: 'from-gray-500 to-gray-600' }
                const isMostLikely = type === mostLikely
                return (
                  <motion.div
                    key={type}
                    className={`p-4 rounded-xl glass-effect ${isMostLikely ? 'ring-2 ring-purple-400' : ''}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 + index * 0.02 }}
                  >
                    <div className="text-center">
                      <div className="text-3xl mb-1">{info.emoji}</div>
                      <div className={`text-lg font-bold ${isMostLikely ? 'text-purple-600' : 'text-gray-700'}`}>{type}</div>
                      <div className="text-sm text-gray-600 mb-2">{info.name}</div>
                      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                        <motion.div
                          className={`h-full ${isMostLikely ? 'bg-gradient-to-r from-purple-500 to-pink-500' : 'bg-gray-400'}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${prob}%` }}
                          transition={{ delay: 0.8 + index * 0.02, duration: 0.5 }}
                        />
                      </div>
                      <div className="text-xs text-gray-500 mt-1">{prob.toFixed(1)}%</div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>

          <motion.div className="text-center mt-8 space-y-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}>
            <p className="text-lg text-gray-600">🎉 测试完成！共答 {answeredTotal} 题</p>
            <div className="flex flex-wrap justify-center gap-3">
              <motion.button onClick={resetTest} className="btn-secondary" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                再测一次
              </motion.button>
              {onBackToHome && (
                <motion.button onClick={onBackToHome} className="btn-secondary" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  返回首页
                </motion.button>
              )}
            </div>
          </motion.div>
        </div>
      </motion.div>
    )
  }

  if (!currentQ) {
    return null
  }

  return (
    <div className="w-full max-w-[95vw] mx-auto px-2 md:px-4">
      <AnimatePresence mode="wait">
        <motion.div
          key={nextQ.index}
          className="glass-effect rounded-3xl p-6 md:p-8 lg:p-12 shadow-2xl w-full"
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -30, scale: 0.95 }}
          transition={{ 
            duration: 0.4,
            ease: [0.4, 0, 0.2, 1]
          }}
        >
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-semibold text-gray-600">
                已答 {answeredTotal} 题 · 进度 {totalProgress.toFixed(1)} / {TOTAL_PROGRESS_MAX}
              </span>
              <span className="text-sm font-semibold text-purple-600">{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-accent-500"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              />
            </div>
          </div>

          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-800 mb-4 text-center">{currentQ.stem}</h2>
          <p className="text-sm md:text-base lg:text-lg text-gray-500 text-center mb-8">
            完全符合「{currentQ.positive}」↔ 完全不符合「{currentQ.negative}」
          </p>

          <div className="flex flex-nowrap justify-center items-center gap-3 md:gap-4 lg:gap-6 overflow-x-auto pb-2">
            {OPTIONS.map((opt, index) => (
              <motion.button
                key={index}
                onClick={() => handleOptionClick(index, opt.scoreA, opt.scoreB, currentQ, nextQ.index)}
                className="flex flex-col items-center p-3 md:p-4 lg:p-6 rounded-2xl glass-effect hover:bg-white/90 transition-all duration-300 border-2 border-transparent flex-shrink-0 min-w-[100px] md:min-w-[120px] lg:min-w-[140px]"
                whileHover={{ scale: 1.1, y: -5 }}
                whileTap={{ scale: 0.95, y: 0 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08 }}
              >
                <motion.div
                  className="relative w-12 h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 mb-3 flex items-center justify-center"
                  whileHover={{ scale: 1.3 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                >
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 md:border-[3px] lg:border-4 border-purple-400"
                    animate={
                      selectedIndex === index
                        ? { scale: [1, 1.3, 1], opacity: [1, 0, 0] }
                        : { scale: 1, opacity: 1 }
                    }
                    transition={{ duration: 0.3, type: 'spring', stiffness: 200 }}
                  />
                  <motion.div
                    className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-400 to-pink-400"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={
                      selectedIndex === index
                        ? { scale: [0, 1.3, 1], opacity: [0, 1, 1] }
                        : { scale: 0, opacity: 0 }
                    }
                    transition={{ duration: 0.3, type: 'spring', stiffness: 200, damping: 15 }}
                  />
                </motion.div>
                <span className="text-sm md:text-base lg:text-lg font-semibold text-gray-700 text-center">{opt.label}</span>
              </motion.button>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

export default MBTITest

/*
 * 每道题记录两类分数，互不混用：
 * 1. 进度分 progressScore：完全符合 2、比较符合 1、不太清楚 0.5、不太符合 1、完全不符合 2。
 *    用于动态题量（每维度达 10 分即做完）与进度条（总进度/40）。
 * 2. 维度分 scoreA / scoreB（及 typeA / typeB）：用于计算 16 型概率，即每道题对该维度的贡献。
 */
