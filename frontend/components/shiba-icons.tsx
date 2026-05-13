// 柴犬モチーフのカスタムアイコン

interface IconProps {
  className?: string
}

// 柴犬の顔（三角耳＋まろ眉）
export function ShibaFace({ className }: IconProps) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="currentColor">
      {/* 左耳 */}
      <path d="M20 45 L10 15 L40 35 Z" />
      {/* 右耳 */}
      <path d="M80 45 L90 15 L60 35 Z" />
      {/* 顔 */}
      <ellipse cx="50" cy="58" rx="35" ry="32" />
      {/* 左まろ眉 */}
      <ellipse cx="32" cy="48" rx="8" ry="4" fill="#FEF3C7" />
      {/* 右まろ眉 */}
      <ellipse cx="68" cy="48" rx="8" ry="4" fill="#FEF3C7" />
      {/* 左目 */}
      <circle cx="35" cy="58" r="5" fill="#1F1F1F" />
      {/* 右目 */}
      <circle cx="65" cy="58" r="5" fill="#1F1F1F" />
      {/* 鼻 */}
      <ellipse cx="50" cy="72" rx="6" ry="5" fill="#1F1F1F" />
      {/* 口 */}
      <path d="M50 77 Q42 84 38 80" stroke="#1F1F1F" strokeWidth="2" fill="none" />
      <path d="M50 77 Q58 84 62 80" stroke="#1F1F1F" strokeWidth="2" fill="none" />
    </svg>
  )
}

// 肉球アイコン
export function PawPrint({ className }: IconProps) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="currentColor">
      {/* メインパッド */}
      <ellipse cx="50" cy="65" rx="25" ry="22" />
      {/* 上の指パッド */}
      <ellipse cx="28" cy="32" rx="12" ry="14" />
      <ellipse cx="50" cy="22" rx="11" ry="13" />
      <ellipse cx="72" cy="32" rx="12" ry="14" />
    </svg>
  )
}

// 巻き尻尾アイコン（アニメーション対応）
export function CurlyTail({ className, animated = false }: IconProps & { animated?: boolean }) {
  return (
    <svg 
      viewBox="0 0 100 100" 
      className={`${className} ${animated ? 'origin-bottom-left' : ''}`}
      fill="none" 
      stroke="currentColor" 
      strokeWidth="12" 
      strokeLinecap="round"
      style={animated ? {
        animation: 'wag 0.4s ease-in-out infinite alternate'
      } : undefined}
    >
      <path d="M25 85 Q25 50 45 35 Q65 20 75 35 Q90 55 70 55 Q55 55 55 40" />
    </svg>
  )
}

// 三角耳アイコン
export function TriangleEar({ className }: IconProps) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="currentColor">
      <path d="M50 10 L90 90 L10 90 Z" />
      {/* 内側のピンク */}
      <path d="M50 35 L72 78 L28 78 Z" fill="#FEC5BB" />
    </svg>
  )
}

// 小さい肉球（ドット代わりに使用）
export function PawDot({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <ellipse cx="12" cy="15" rx="6" ry="5" />
      <circle cx="6" cy="8" r="3" />
      <circle cx="12" cy="5" r="2.5" />
      <circle cx="18" cy="8" r="3" />
    </svg>
  )
}
