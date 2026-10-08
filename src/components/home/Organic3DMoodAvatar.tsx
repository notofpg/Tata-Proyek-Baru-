import React from 'react';
import moodGreatImg from '../../assets/images/mood_great_3d_1787735754524.jpg';
import moodGoodImg from '../../assets/images/mood_good_3d_1787735768816.jpg';
import moodNeutralImg from '../../assets/images/mood_neutral_3d_1787735784899.jpg';
import moodBadImg from '../../assets/images/mood_bad_3d_1787735798804.jpg';
import moodTiredImg from '../../assets/images/mood_tired_3d_1787735815147.jpg';

export type OrganicMoodType = 'great' | 'good' | 'neutral' | 'bad' | 'terrible';

interface Organic3DMoodAvatarProps {
  mood: OrganicMoodType;
  size?: number;
  isSelected?: boolean;
  className?: string;
}

const MOOD_ASSETS: Record<
  OrganicMoodType,
  {
    src: string;
    alt: string;
    glowColor: string;
    selectedRing: string;
  }
> = {
  great: {
    src: moodGreatImg,
    alt: 'Bahagia 3D Mascot',
    glowColor: 'rgba(235, 130, 40, 0.45)',
    selectedRing: 'ring-amber-500',
  },
  good: {
    src: moodGoodImg,
    alt: 'Senang 3D Mascot',
    glowColor: 'rgba(72, 168, 85, 0.45)',
    selectedRing: 'ring-emerald-500',
  },
  neutral: {
    src: moodNeutralImg,
    alt: 'Biasa 3D Mascot',
    glowColor: 'rgba(180, 140, 90, 0.4)',
    selectedRing: 'ring-stone-400',
  },
  bad: {
    src: moodBadImg,
    alt: 'Sedih 3D Mascot',
    glowColor: 'rgba(85, 120, 200, 0.45)',
    selectedRing: 'ring-sky-500',
  },
  terrible: {
    src: moodTiredImg,
    alt: 'Buruk 3D Mascot',
    glowColor: 'rgba(220, 90, 70, 0.45)',
    selectedRing: 'ring-rose-500',
  },
};

/**
 * 3D character mascots for Organic Mode mood tracking.
 * Rendered with high-detail claymorphic 3D styling and smooth interactive feedback.
 */
export function Organic3DMoodAvatar({
  mood,
  size = 54,
  isSelected = false,
  className = '',
}: Organic3DMoodAvatarProps) {
  const asset = MOOD_ASSETS[mood] || MOOD_ASSETS.neutral;

  return (
    <div
      style={{ width: size, height: size }}
      className={`relative rounded-full overflow-hidden shrink-0 transition-all duration-300 ${
        isSelected
          ? 'scale-115 shadow-lg ring-2'
          : 'hover:scale-105 shadow-sm'
      } ${isSelected ? asset.selectedRing : 'ring-1 ring-black/5 dark:ring-white/10'} ${className}`}
    >
      <img
        src={asset.src}
        alt={asset.alt}
        referrerPolicy="no-referrer"
        className="w-full h-full object-cover select-none pointer-events-none transition-transform duration-300"
      />
    </div>
  );
}

