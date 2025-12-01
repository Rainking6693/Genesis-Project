import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DesignArchitecture } from './DesignArchitecture';
import { useArchitectureData } from '../../hooks/useArchitectureData';
import { useAnalytics } from '../../hooks/useAnalytics';
import { useToast } from '../../hooks/useToast';

// Mock hooks and dependencies
jest.mock('../../hooks/useArchitectureData');
jest.mock('../../hooks/useAnalytics');
jest.mock('../../hooks/useToast');
jest.mock('react-router-dom', () => ({
  useNavigate: jest.fn(),
}));

const mockUseArchitectureData = useArchitectureData as jest.MockedFunction<typeof useArchitectureData>;
const mockUseAnalytics = useAnalytics as jest.MockedFunction<typeof useAnalytics>;
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;
const mockNavigate = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => mockNavigate,
  }));
});

describe('DesignArchitecture - Landing Page', () => {
  const mockData = {
    sections: [
      {
        id: 'modern-approach',
        title: 'Modern Architecture',
        description: 'Cutting-edge design principles',
        features: ['Scalable', 'Modular', 'Performant'],
        imageUrl: '/modern-arch.jpg',
      },
      {
        id: 'sustainable',
        title: 'Sustainable Solutions',
        description: 'Eco-friendly design approaches',
        features: ['Energy Efficient', 'Green Materials', 'Carbon Neutral'],
        imageUrl: '/sustainable-arch.jpg',
      },
    ],
    cta: {
      text: 'Get Started',
      link: '/contact',
    },
  };

  const mockError = new Error('Failed to load architecture data');

  it('should render loading state initially', () => {
    mockUseArchitectureData.mockReturnValue({ data: null, loading: true, error: null });
    render(<DesignArchitecture />);

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    expect(screen.queryByText('Modern Architecture')).not.toBeInTheDocument();
  });

  it('should render error state when data fetch fails', () => {
    mockUseArchitectureData.mockReturnValue({ data: null, loading: false, error: mockError });
    mockUseToast.mockReturnValue({ showToast: jest.fn() });

    render(<DesignArchitecture />);

    expect(screen.getByText('Error loading architecture data')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('should render all architecture sections when data is loaded', () => {
    mockUseArchitectureData.mockReturnValue({ data: mockData, loading: false, error: null });

    render(<DesignArchitecture />);

    expect(screen.getByText('Modern Architecture')).toBeInTheDocument();
    expect(screen.getByText('Sustainable Solutions')).toBeInTheDocument();
    expect(screen.getByText('Cutting-edge design principles')).toBeInTheDocument();
    expect(screen.getByText('Eco-friendly design approaches')).toBeInTheDocument();
    expect(screen.getAllByRole('img').length).toBe(2);
  });

  it('should render all feature lists for each section', () => {
    mockUseArchitectureData.mockReturnValue({ data: mockData, loading: false, error: null });

    render(<DesignArchitecture />);

    mockData.sections.forEach(section => {
      section.features.forEach(feature => {
        expect(screen.getByText(feature)).toBeInTheDocument();
      });
    });
  });

  it('should have proper aria attributes for accessibility', () => {
    mockUseArchitectureData.mockReturnValue({ data: mockData, loading: false, error: null });

    render(<DesignArchitecture />);

    expect(screen.getByRole('heading', { name: 'Modern Architecture' })).toHaveAttribute(
      'aria-level',
      '2'
    );

    const images = screen.getAllByRole('img');
    images.forEach(img => {
      expect(img).toHaveAttribute('alt');
    });

    expect(screen.getByRole('button', { name: 'Get Started' })).toHaveAttribute(
      'aria-label',
      'Contact us to get started with your architecture project'
    );
  });

  it('should navigate to contact page when CTA button is clicked', async () => {
    mockUseArchitectureData.mockReturnValue({ data: mockData, loading: false, error: null });
    mockUseAnalytics.mockReturnValue({ trackEvent: jest.fn() });

    render(<DesignArchitecture />);

    const ctaButton = screen.getByRole('button', { name: 'Get Started' });
    await userEvent.click(ctaButton);

    expect(mockNavigate).toHaveBeenCalledWith('/contact');
    expect(mockUseAnalytics().trackEvent).toHaveBeenCalledWith(
      'cta_click',
      { button: 'get_started', page: 'design_architecture' }
    );
  });

  it('should retry data fetch when retry button is clicked in error state', async () => {
    const mockRetry = jest.fn();
    mockUseArchitectureData.mockReturnValue({ data: null, loading: false, error: mockError, retry: mockRetry });

    render(<DesignArchitecture />);

    const retryButton = screen.getByRole('button', { name: 'Retry' });
    await userEvent.click(retryButton);

    expect(mockRetry).toHaveBeenCalled();
  });

  it('should show toast when copying section link', async () => {
    mockUseArchitectureData.mockReturnValue({ data: mockData, loading: false, error: null });
    mockUseToast.mockReturnValue({ showToast: jest.fn() });
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockResolvedValue(undefined),
      },
    });

    render(<DesignArchitecture />);

    const shareButtons = screen.getAllByLabelText('Share section');
    await userEvent.click(shareButtons[0]);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      `${window.location.origin}/#modern-approach`
    );
    expect(mockUseToast().showToast).toHaveBeenCalledWith(
      'Link copied to clipboard!',
      'success'
    );
  });

  it('should handle clipboard write error gracefully', async () => {
    mockUseArchitectureData.mockReturnValue({ data: mockData, loading: false, error: null });
    mockUseToast.mockReturnValue({ showToast: jest.fn() });
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockRejectedValue(new Error('Clipboard error')),
      },
    });

    render(<DesignArchitecture />);

    const shareButtons = screen.getAllByLabelText('Share section');
    await userEvent.click(shareButtons[0]);

    expect(mockUseToast().showToast).toHaveBeenCalledWith(
      'Failed to copy link',
      'error'
    );
  });

  it('should track analytics when section is viewed', () => {
    mockUseArchitectureData.mockReturnValue({ data: mockData, loading: false, error: null });
    mockUseAnalytics.mockReturnValue({ trackEvent: jest.fn() });

    render(<DesignArchitecture />);

    const section = screen.getByText('Modern Architecture');
    fireEvent.scroll(section, { target: { scrollY: 300 } });

    expect(mockUseAnalytics().trackEvent).toHaveBeenCalledWith(
      'section_view',
      { section: 'modern-approach', page: 'design_architecture' }
    );
  });

  it('should render empty state when no sections are available', () => {
    mockUseArchitectureData.mockReturnValue({
      data: { sections: [], cta: mockData.cta },
      loading: false,
      error: null
    });

    render(<DesignArchitecture />);

    expect(screen.getByText('No architecture sections available')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('should handle image loading errors gracefully', () => {
    mockUseArchitectureData.mockReturnValue({ data: mockData, loading: false, error: null });

    render(<DesignArchitecture />);

    const images = screen.getAllByRole('img');
    fireEvent.error(images[0]);

    expect(screen.getByAltText('Modern Architecture fallback')).toBeInTheDocument();
  });

  it('should have proper focus management for keyboard navigation', async () => {
    mockUseArchitectureData.mockReturnValue({ data: mockData, loading: false, error: null });

    render(<DesignArchitecture />);

    const ctaButton = screen.getByRole('button', { name: 'Get Started' });
    await userEvent.tab();
    expect(ctaButton).toHaveFocus();

    const shareButtons = screen.getAllByLabelText('Share section');
    await userEvent.tab();
    expect(shareButtons[0]).toHaveFocus();
  });

  it('should match snapshot when data is loaded', () => {
    mockUseArchitectureData.mockReturnValue({ data: mockData, loading: false, error: null });

    const { asFragment } = render(<DesignArchitecture />);
    expect(asFragment()).toMatchSnapshot();
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DesignArchitecture } from './DesignArchitecture';
import { useArchitectureData } from '../../hooks/useArchitectureData';
import { useAnalytics } from '../../hooks/useAnalytics';
import { useToast } from '../../hooks/useToast';

// Mock hooks and dependencies
jest.mock('../../hooks/useArchitectureData');
jest.mock('../../hooks/useAnalytics');
jest.mock('../../hooks/useToast');
jest.mock('react-router-dom', () => ({
  useNavigate: jest.fn(),
}));

const mockUseArchitectureData = useArchitectureData as jest.MockedFunction<typeof useArchitectureData>;
const mockUseAnalytics = useAnalytics as jest.MockedFunction<typeof useAnalytics>;
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;
const mockNavigate = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => mockNavigate,
  }));
});

describe('DesignArchitecture - Landing Page', () => {
  const mockData = {
    sections: [
      {
        id: 'modern-approach',
        title: 'Modern Architecture',
        description: 'Cutting-edge design principles',
        features: ['Scalable', 'Modular', 'Performant'],
        imageUrl: '/modern-arch.jpg',
      },
      {
        id: 'sustainable',
        title: 'Sustainable Solutions',
        description: 'Eco-friendly design approaches',
        features: ['Energy Efficient', 'Green Materials', 'Carbon Neutral'],
        imageUrl: '/sustainable-arch.jpg',
      },
    ],
    cta: {
      text: 'Get Started',
      link: '/contact',
    },
  };

  const mockError = new Error('Failed to load architecture data');

  it('should render loading state initially', () => {
    mockUseArchitectureData.mockReturnValue({ data: null, loading: true, error: null });
    render(<DesignArchitecture />);

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    expect(screen.queryByText('Modern Architecture')).not.toBeInTheDocument();
  });

  it('should render error state when data fetch fails', () => {
    mockUseArchitectureData.mockReturnValue({ data: null, loading: false, error: mockError });
    mockUseToast.mockReturnValue({ showToast: jest.fn() });

    render(<DesignArchitecture />);

    expect(screen.getByText('Error loading architecture data')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('should render all architecture sections when data is loaded', () => {
    mockUseArchitectureData.mockReturnValue({ data: mockData, loading: false, error: null });

    render(<DesignArchitecture />);

    expect(screen.getByText('Modern Architecture')).toBeInTheDocument();
    expect(screen.getByText('Sustainable Solutions')).toBeInTheDocument();
    expect(screen.getByText('Cutting-edge design principles')).toBeInTheDocument();
    expect(screen.getByText('Eco-friendly design approaches')).toBeInTheDocument();
    expect(screen.getAllByRole('img').length).toBe(2);
  });

  it('should render all feature lists for each section', () => {
    mockUseArchitectureData.mockReturnValue({ data: mockData, loading: false, error: null });

    render(<DesignArchitecture />);

    mockData.sections.forEach(section => {
      section.features.forEach(feature => {
        expect(screen.getByText(feature)).toBeInTheDocument();
      });
    });
  });

  it('should have proper aria attributes for accessibility', () => {
    mockUseArchitectureData.mockReturnValue({ data: mockData, loading: false, error: null });

    render(<DesignArchitecture />);

    expect(screen.getByRole('heading', { name: 'Modern Architecture' })).toHaveAttribute(
      'aria-level',
      '2'
    );

    const images = screen.getAllByRole('img');
    images.forEach(img => {
      expect(img).toHaveAttribute('alt');
    });

    expect(screen.getByRole('button', { name: 'Get Started' })).toHaveAttribute(
      'aria-label',
      'Contact us to get started with your architecture project'
    );
  });

  it('should navigate to contact page when CTA button is clicked', async () => {
    mockUseArchitectureData.mockReturnValue({ data: mockData, loading: false, error: null });
    mockUseAnalytics.mockReturnValue({ trackEvent: jest.fn() });

    render(<DesignArchitecture />);

    const ctaButton = screen.getByRole('button', { name: 'Get Started' });
    await userEvent.click(ctaButton);

    expect(mockNavigate).toHaveBeenCalledWith('/contact');
    expect(mockUseAnalytics().trackEvent).toHaveBeenCalledWith(
      'cta_click',
      { button: 'get_started', page: 'design_architecture' }
    );
  });

  it('should retry data fetch when retry button is clicked in error state', async () => {
    const mockRetry = jest.fn();
    mockUseArchitectureData.mockReturnValue({ data: null, loading: false, error: mockError, retry: mockRetry });

    render(<DesignArchitecture />);

    const retryButton = screen.getByRole('button', { name: 'Retry' });
    await userEvent.click(retryButton);

    expect(mockRetry).toHaveBeenCalled();
  });

  it('should show toast when copying section link', async () => {
    mockUseArchitectureData.mockReturnValue({ data: mockData, loading: false, error: null });
    mockUseToast.mockReturnValue({ showToast: jest.fn() });
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockResolvedValue(undefined),
      },
    });

    render(<DesignArchitecture />);

    const shareButtons = screen.getAllByLabelText('Share section');
    await userEvent.click(shareButtons[0]);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      `${window.location.origin}/#modern-approach`
    );
    expect(mockUseToast().showToast).toHaveBeenCalledWith(
      'Link copied to clipboard!',
      'success'
    );
  });

  it('should handle clipboard write error gracefully', async () => {
    mockUseArchitectureData.mockReturnValue({ data: mockData, loading: false, error: null });
    mockUseToast.mockReturnValue({ showToast: jest.fn() });
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockRejectedValue(new Error('Clipboard error')),
      },
    });

    render(<DesignArchitecture />);

    const shareButtons = screen.getAllByLabelText('Share section');
    await userEvent.click(shareButtons[0]);

    expect(mockUseToast().showToast).toHaveBeenCalledWith(
      'Failed to copy link',
      'error'
    );
  });

  it('should track analytics when section is viewed', () => {
    mockUseArchitectureData.mockReturnValue({ data: mockData, loading: false, error: null });
    mockUseAnalytics.mockReturnValue({ trackEvent: jest.fn() });

    render(<DesignArchitecture />);

    const section = screen.getByText('Modern Architecture');
    fireEvent.scroll(section, { target: { scrollY: 300 } });

    expect(mockUseAnalytics().trackEvent).toHaveBeenCalledWith(
      'section_view',
      { section: 'modern-approach', page: 'design_architecture' }
    );
  });

  it('should render empty state when no sections are available', () => {
    mockUseArchitectureData.mockReturnValue({
      data: { sections: [], cta: mockData.cta },
      loading: false,
      error: null
    });

    render(<DesignArchitecture />);

    expect(screen.getByText('No architecture sections available')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('should handle image loading errors gracefully', () => {
    mockUseArchitectureData.mockReturnValue({ data: mockData, loading: false, error: null });

    render(<DesignArchitecture />);

    const images = screen.getAllByRole('img');
    fireEvent.error(images[0]);

    expect(screen.getByAltText('Modern Architecture fallback')).toBeInTheDocument();
  });

  it('should have proper focus management for keyboard navigation', async () => {
    mockUseArchitectureData.mockReturnValue({ data: mockData, loading: false, error: null });

    render(<DesignArchitecture />);

    const ctaButton = screen.getByRole('button', { name: 'Get Started' });
    await userEvent.tab();
    expect(ctaButton).toHaveFocus();

    const shareButtons = screen.getAllByLabelText('Share section');
    await userEvent.tab();
    expect(shareButtons[0]).toHaveFocus();
  });

  it('should match snapshot when data is loaded', () => {
    mockUseArchitectureData.mockReturnValue({ data: mockData, loading: false, error: null });

    const { asFragment } = render(<DesignArchitecture />);
    expect(asFragment()).toMatchSnapshot();
  });
});