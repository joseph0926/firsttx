import { motion } from 'motion/react';
import { useState } from 'react';

interface ProductCardProps {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  rating: number;
  reviewCount: number;
  stock: number;
  createdAt: number;
  onAddToCart?: () => void;
  cartDisabled?: boolean;
}

export function ProductCard({
  name,
  price,
  imageUrl,
  rating,
  reviewCount,
  stock,
  createdAt,
  onAddToCart,
  cartDisabled = false,
}: ProductCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [ageInMinutes] = useState(() => Math.floor((Date.now() - createdAt) / (60 * 1000)));
  const isNew = ageInMinutes < 5;

  return (
    <motion.div
      initial={isNew ? { scale: 0.95, opacity: 0 } : false}
      animate={isNew ? { scale: 1, opacity: 1 } : {}}
      transition={{ duration: 0.5, type: 'spring' }}
      whileHover={{ y: -4 }}
      className={`border rounded-lg p-4 hover:shadow-xl transition-all bg-white dark:bg-gray-800 ${
        isNew
          ? 'ring-2 ring-green-500 border-green-500 dark:border-green-400'
          : 'border-gray-200 dark:border-gray-700'
      }`}
    >
      <div className="relative w-full h-48 bg-gray-100 dark:bg-gray-700 rounded mb-4 overflow-hidden">
        {isNew && (
          <motion.div
            initial={{ scale: 0, rotate: -12 }}
            animate={{ scale: 1, rotate: -12 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
            className="absolute top-2 right-2 z-10 bg-gradient-to-r from-red-500 to-pink-500 text-white px-3 py-1 text-xs font-bold rounded-full shadow-lg"
          >
            🆕 NEW
          </motion.div>
        )}
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-8 h-8 border-2 border-gray-300 dark:border-gray-600 border-t-gray-600 dark:border-t-gray-300 rounded-full"
            />
          </div>
        )}
        {imageError ? (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400 dark:text-gray-500">
            <div className="text-center">
              <div className="text-4xl mb-2">📦</div>
              <div className="text-sm">Image unavailable</div>
            </div>
          </div>
        ) : (
          <motion.img
            src={imageUrl}
            alt={name}
            className="w-full h-full object-cover"
            initial={{ opacity: 0 }}
            animate={{ opacity: imageLoaded ? 1 : 0 }}
            transition={{ duration: 0.3 }}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
          />
        )}
      </div>
      <h3 className="font-semibold mb-2 truncate text-gray-900 dark:text-white">{name}</h3>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-yellow-500">★</span>
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {rating.toFixed(1)} ({reviewCount})
        </span>
      </div>
      <p className="text-lg font-bold text-blue-600 dark:text-blue-400 mb-2">
        ${price.toLocaleString()}
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Stock: {stock}</p>
      {isNew && (
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-xs text-green-600 dark:text-green-400 font-medium mb-2"
        >
          ✨ Added {ageInMinutes === 0 ? 'just now' : `${ageInMinutes}m ago`}
        </motion.p>
      )}
      <motion.button
        whileHover={cartDisabled ? {} : { scale: 1.02 }}
        whileTap={cartDisabled ? {} : { scale: 0.98 }}
        onClick={onAddToCart}
        disabled={cartDisabled}
        className={`w-full py-2 rounded font-medium transition-colors ${
          cartDisabled
            ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
      >
        {cartDisabled ? 'View Only' : 'Add to Cart'}
      </motion.button>
    </motion.div>
  );
}
