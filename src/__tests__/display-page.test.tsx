import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DisplayView } from '@/components/display/DisplayView';

describe('Display View (/ route)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders timer container and initial digits', () => {
    render(<DisplayView />);
    expect(screen.getByText('05:00')).toBeInTheDocument();
    expect(screen.getByText('READY')).toBeInTheDocument();
  });

  it('has hidden settings button in the top right corner', () => {
    const { container } = render(<DisplayView />);
    const settingsButton = container.querySelector('.cursor-pointer');
    expect(settingsButton).toBeInTheDocument();
  });
});
