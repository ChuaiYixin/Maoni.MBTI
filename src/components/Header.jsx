import { motion } from 'framer-motion'
import logo from '../../57f50fc94153da8d3a1c653ffcc60976.jpg'

function Header() {
  return (
    <motion.header 
      className="glass-effect sticky top-0 z-50 shadow-lg"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="container mx-auto px-3 py-1 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <motion.div
            className="w-8 h-8 rounded-full overflow-hidden border-2 border-purple-400 shadow-md"
            whileHover={{ scale: 1.1, rotate: 360 }}
            transition={{ duration: 0.5 }}
          >
            <img 
              src={logo} 
              alt="MBTI Logo" 
              className="w-full h-full object-cover"
            />
          </motion.div>
          <div>
            <h1 className="text-lg font-bold gradient-text leading-tight">Maoni MBTI人格测试</h1>
            <p className="text-xs text-gray-600 leading-tight">发现你的性格类型</p>
          </div>
        </div>
        
        <motion.div
          className="hidden md:flex items-center space-x-1.5 px-2 py-1 rounded-full bg-gradient-to-r from-purple-100 to-pink-100"
          whileHover={{ scale: 1.05 }}
        >
          <span className="text-base">✨</span>
          <span className="text-sm font-semibold text-purple-700">人格测试</span>
        </motion.div>
      </div>
    </motion.header>
  )
}

export default Header
