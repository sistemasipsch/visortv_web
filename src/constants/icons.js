import {
  Building2,
  Compass,
  Landmark,
  Store,
  Radio,
  Crown,
  Tv,
  Monitor,
  Video,
  Image,
  MapPin,
  Sparkles,
  Layers,
  Hospital,
  ShoppingBag,
  School,
  Coffee,
  Globe,
  Film,
} from 'lucide-react';

export const iconMap = {
  Building2,
  Compass,
  Landmark,
  Store,
  Radio,
  Crown,
  Tv,
  Monitor,
  Video,
  Image,
  MapPin,
  Sparkles,
  Layers,
  Hospital,
  ShoppingBag,
  School,
  Coffee,
  Globe,
  Film,
};

export const AVAILABLE_ICONS = [
  'Tv',
  'Building2',
  'Film',
  'Store',
  'Sparkles',
  'MapPin',
];

export const isImageUrl = (val) => {
  return (
    typeof val === 'string' &&
    (val.startsWith('http://') ||
      val.startsWith('https://') ||
      val.startsWith('data:') ||
      val.startsWith('/') ||
      val.startsWith('blob:'))
  );
};
