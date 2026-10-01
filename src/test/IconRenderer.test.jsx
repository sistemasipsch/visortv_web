import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import IconRenderer from '../components/IconRenderer';
import { AVAILABLE_ICONS, iconMap } from '../constants/icons';

describe('IconRenderer component', () => {
  it('renders default icon when name is not specified', () => {
    const { container } = render(<IconRenderer />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders specific icon when valid name is passed', () => {
    const { container } = render(<IconRenderer name="Tv" className="w-8 h-8 custom-test" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass('custom-test');
  });

  it('has valid icon definitions for all available icons', () => {
    expect(AVAILABLE_ICONS.length).toBe(6);
    AVAILABLE_ICONS.forEach((iconName) => {
      expect(iconMap[iconName]).toBeDefined();
    });
  });

  it('renders img element when an image URL is passed as name', () => {
    const { container } = render(<IconRenderer name="https://example.com/logo.png" className="custom-img" />);
    const img = container.querySelector('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/logo.png');
    expect(img).toHaveClass('custom-img');
  });
});
