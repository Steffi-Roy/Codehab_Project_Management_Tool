'use client'

import { getInitials } from '@/lib/utils'

interface AvatarChipProps {
  name: string
  color: string
  size?: 'sm' | 'md' | 'lg'
  showName?: boolean
}

const sizeClasses = {
  sm: 'w-6 h-6 text-xs',
  md: 'w-8 h-8 text-sm',
  lg: 'w-12 h-12 text-lg',
}

export default function AvatarChip({ name, color, size = 'md', showName = false }: AvatarChipProps) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0`}
        style={{ backgroundColor: color }}
      >
        {getInitials(name)}
      </div>
      {showName && <span className="text-sm text-gray-700 font-medium">{name}</span>}
    </div>
  )
}
