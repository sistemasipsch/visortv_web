import React from 'react';
import { Building2 } from 'lucide-react';
import { iconMap, isImageUrl } from '../constants/icons';

export { isImageUrl };

export const IconRenderer = ({ name, className = 'w-5 h-5', ...props }) => {
  if (isImageUrl(name)) {
    return (
      <img
        src={name}
        alt="Icon"
        className={`${className} object-cover`}
        onError={(e) => {
          e.currentTarget.style.display = 'none';
        }}
        {...props}
      />
    );
  }
  const IconComponent = iconMap[name] || Building2;
  return <IconComponent className={className} {...props} />;
};

export default IconRenderer;
