import { motion } from 'framer-motion'
import logo from '../../57f50fc94153da8d3a1c653ffcc60976.jpg'

function Header({ user, authLoading, onOpenAuth, onSignOut, onOpenProfile, onGoHome }) {
  return (
    <motion.header 
      className="glass-effect sticky top-0 z-50 shadow-lg"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="w-full px-3 py-1 flex items-center justify-between">
        <motion.div 
          className="flex items-center space-x-2 cursor-pointer"
          onClick={onGoHome}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <motion.div
            className="w-8 h-8 rounded-full overflow-hidden border-2 border-purple-400 shadow-md"
            whileHover={{ scale: 1.1, rotate: 360 }}
            transition={{ duration: 0.5 }}
          >
            <img 
              src={logo} 
              alt="Personality Logo" 
              className="w-full h-full object-cover"
            />
          </motion.div>
          <div>
            <h1 className="text-lg font-bold gradient-text leading-tight">Maoni Personality</h1>
            <p className="text-xs text-gray-600 leading-tight">发现你的人格类型</p>
          </div>
        </motion.div>
        
        <div className="flex items-center gap-2 ml-auto">
          {!authLoading && (
            user ? (
              <div className="flex items-center gap-2">
                <motion.button
                  type="button"
                  onClick={onOpenProfile}
                  className="text-xs font-medium text-purple-600 hover:text-purple-700 px-2 py-1.5 rounded-lg hover:bg-purple-50 transition"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  个人中心
                </motion.button>
                <span className="hidden sm:inline text-xs text-gray-600 truncate max-w-[120px] md:max-w-[180px]" title={user.email}>
                  {user.email}
                </span>
                <motion.button
                  type="button"
                  onClick={onSignOut}
                  className="text-xs font-medium text-purple-600 hover:text-purple-700 px-2 py-1.5 rounded-lg hover:bg-purple-50 transition"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  退出登录
                </motion.button>
              </div>
            ) : (
              <motion.button
                type="button"
                onClick={onOpenAuth}
                className="text-xs font-semibold text-purple-600 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-full transition"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                登录
              </motion.button>
            )
          )}
        </div>
      </div>
    </motion.header>
  )
}

export default Header
