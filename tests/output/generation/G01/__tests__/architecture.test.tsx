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

const mockData = {
  sections: [
    {
      id: 'modern-approach',
      title: 'Modern Architecture Approach',
      description: 'Our cutting-edge design principles',
      features: ['Scalability', 'Modularity', 'Performance'],
      image: '/modern-arch.jpg',
    },
    {
      id: 'tech-stack',
      title: 'Technology Stack',
      description: 'Technologies we use to build robust solutions',
      technologies: ['React', 'Node.js', 'GraphQL', 'Kubernetes'],
    },
  ],
  cta: {
    text: 'Get Started with Our Architecture',
    link: '/contact',
  },
};

const mockError = new Error('Failed to load architecture data');

describe('DesignArchitecture Component', () => {
  beforeEach(() => {
    mockUseAnalytics.mockReturnValue({
      trackEvent: jest.fn(),
    });
    mockUseToast.mockReturnValue({
      showToast: jest.fn(),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Render and Loading States', () => {
    it('should render loading skeleton when data is being fetched', () => {
      mockUseArchitectureData.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
      });

      render(<DesignArchitecture />);

      expect(screen.getByTestId('section-skeleton')).toBeInTheDocument();
      expect(screen.getByTestId('cta-skeleton')).toBeInTheDocument();
      expect(screen.queryByText(/Modern Architecture Approach/i)).not.toBeInTheDocument();
    });

    it('should render error message when data fetch fails', () => {
      mockUseArchitectureData.mockReturnValue({
        data: null,
        isLoading: false,
        error: mockError,
      });

      render(<DesignArchitecture />);

      expect(screen.getByText(/Failed to load architecture data/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });
  });

  describe('Successful Data Render', () => {
    beforeEach(() => {
      mockUseArchitectureData.mockReturnValue({
        data: mockData,
        isLoading: false,
        error: null,
      });
    });

    it('should render all architecture sections with proper content', () => {
      render(<DesignArchitecture />);

      expect(screen.getByText(/Modern Architecture Approach/i)).toBeInTheDocument();
      expect(screen.getByText(/Scalability/i)).toBeInTheDocument();
      expect(screen.getByText(/Modularity/i)).toBeInTheDocument();
      expect(screen.getByText(/Technology Stack/i)).toBeInTheDocument();
      expect(screen.getByText(/React/i)).toBeInTheDocument();
      expect(screen.getByText(/Node\.js/i)).toBeInTheDocument();
    });

    it('should render the call-to-action button with correct text and link', () => {
      render(<DesignArchitecture />);

      const ctaButton = screen.getByRole('link', { name: /Get Started with Our Architecture/i });
      expect(ctaButton).toBeInTheDocument();
      expect(ctaButton).toHaveAttribute('href', '/contact');
    });

    it('should have proper aria labels for accessibility', () => {
      render(<DesignArchitecture />);

      expect(screen.getByLabelText(/Modern Architecture Approach section/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Technology Stack section/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Architecture features list/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Technology stack list/i)).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    beforeEach(() => {
      mockUseArchitectureData.mockReturnValue({
        data: mockData,
        isLoading: false,
        error: null,
      });
    });

    it('should track analytics event when CTA button is clicked', () => {
      const mockTrackEvent = jest.fn();
      mockUseAnalytics.mockReturnValue({
        trackEvent: mockTrackEvent,
      });

      render(<DesignArchitecture />);

      const ctaButton = screen.getByRole('link', { name: /Get Started with Our Architecture/i });
      fireEvent.click(ctaButton);

      expect(mockTrackEvent).toHaveBeenCalledWith('cta_click', {
        component: 'DesignArchitecture',
        action: 'get_started_click',
      });
    });

    it('should show toast when feature item is clicked', async () => {
      const mockShowToast = jest.fn();
      mockUseToast.mockReturnValue({
        showToast: mockShowToast,
      });

      render(<DesignArchitecture />);

      const featureItem = screen.getByText(/Scalability/i);
      await userEvent.click(featureItem);

      expect(mockShowToast).toHaveBeenCalledWith({
        message: 'Scalability: Our architecture scales with your business needs',
        type: 'info',
      });
    });

    it('should handle retry button click when error occurs', async () => {
      const mockRetryFn = jest.fn();
      mockUseArchitectureData.mockReturnValue({
        data: null,
        isLoading: false,
        error: mockError,
        retry: mockRetryFn,
      });

      render(<DesignArchitecture />);

      const retryButton = screen.getByRole('button', { name: /retry/i });
      await userEvent.click(retryButton);

      expect(mockRetryFn).toHaveBeenCalled();
    });
  });

  describe('Responsive Behavior', () => {
    it('should render mobile-friendly layout on small screens', () => {
      global.innerWidth = 500;
      global.dispatchEvent(new Event('resize'));

      mockUseArchitectureData.mockReturnValue({
        data: mockData,
        isLoading: false,
        error: null,
      });

      render(<DesignArchitecture />);

      const section = screen.getByLabelText(/Modern Architecture Approach section/i);
      expect(section).toHaveClass('mobile-layout');
    });

    it('should render desktop layout on larger screens', () => {
      global.innerWidth = 1200;
      global.dispatchEvent(new Event('resize'));

      mockUseArchitectureData.mockReturnValue({
        data: mockData,
        isLoading: false,
        error: null,
      });

      render(<DesignArchitecture />);

      const section = screen.getByLabelText(/Modern Architecture Approach section/i);
      expect(section).toHaveClass('desktop-layout');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty sections gracefully', () => {
      mockUseArchitectureData.mockReturnValue({
        data: { sections: [], cta: mockData.cta },
        isLoading: false,
        error: null,
      });

      render(<DesignArchitecture />);

      expect(screen.queryByText(/Modern Architecture Approach/i)).not.toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Get Started with Our Architecture/i })).toBeInTheDocument();
    });

    it('should handle missing CTA data', () => {
      mockUseArchitectureData.mockReturnValue({
        data: { sections: mockData.sections, cta: null },
        isLoading: false,
        error: null,
      });

      render(<DesignArchitecture />);

      expect(screen.queryByRole('link', { name: /Get Started with Our Architecture/i })).not.toBeInTheDocument();
      expect(screen.getByText(/Modern Architecture Approach/i)).toBeInTheDocument();
    });

    it('should show fallback image when image fails to load', () => {
      mockUseArchitectureData.mockReturnValue({
        data: mockData,
        isLoading: false,
        error: null,
      });

      render(<DesignArchitecture />);

      const image = screen.getByAltText(/Modern Architecture Illustration/i);
      fireEvent.error(image);

      expect(image).toHaveAttribute('src', 'fallback-architecture.jpg');
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      mockUseArchitectureData.mockReturnValue({
        data: mockData,
        isLoading: false,
        error: null,
      });

      render(<DesignArchitecture />);

      const headings = screen.getAllByRole('heading');
      expect(headings[0]).toHaveTextContent(/Design Architecture/i);
      expect(headings[1]).toHaveTextContent(/Modern Architecture Approach/i);
      expect(headings[2]).toHaveTextContent(/Technology Stack/i);
    });

    it('should have proper contrast ratios for text', () => {
      mockUseArchitectureData.mockReturnValue({
        data: mockData,
        isLoading: false,
        error: null,
      });

      render(<DesignArchitecture />);

      const textElements = screen.getAllByText(/Our cutting-edge design principles/i);
      textElements.forEach(element => {
        const style = window.getComputedStyle(element);
        const color = style.color;
        const backgroundColor = style.backgroundColor;
        // This is a simplified check - in real tests you'd use a proper contrast checking library
        expect(color).not.toBe(backgroundColor);
      });
    });

    it('should be navigable via keyboard', async () => {
      mockUseArchitectureData.mockReturnValue({
        data: mockData,
        isLoading: false,
        error: null,
      });

      render(<DesignArchitecture />);

      const ctaButton = screen.getByRole('link', { name: /Get Started with Our Architecture/i });
      await userEvent.tab();
      expect(ctaButton).toHaveFocus();

      await userEvent.keyboard('{Enter}');
      expect(mockUseAnalytics().trackEvent).toHaveBeenCalled();
    });
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

const mockData = {
  sections: [
    {
      id: 'modern-approach',
      title: 'Modern Architecture Approach',
      description: 'Our cutting-edge design principles',
      features: ['Scalability', 'Modularity', 'Performance'],
      image: '/modern-arch.jpg',
    },
    {
      id: 'tech-stack',
      title: 'Technology Stack',
      description: 'Technologies we use to build robust solutions',
      technologies: ['React', 'Node.js', 'GraphQL', 'Kubernetes'],
    },
  ],
  cta: {
    text: 'Get Started with Our Architecture',
    link: '/contact',
  },
};

const mockError = new Error('Failed to load architecture data');

describe('DesignArchitecture Component', () => {
  beforeEach(() => {
    mockUseAnalytics.mockReturnValue({
      trackEvent: jest.fn(),
    });
    mockUseToast.mockReturnValue({
      showToast: jest.fn(),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Render and Loading States', () => {
    it('should render loading skeleton when data is being fetched', () => {
      mockUseArchitectureData.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
      });

      render(<DesignArchitecture />);

      expect(screen.getByTestId('section-skeleton')).toBeInTheDocument();
      expect(screen.getByTestId('cta-skeleton')).toBeInTheDocument();
      expect(screen.queryByText(/Modern Architecture Approach/i)).not.toBeInTheDocument();
    });

    it('should render error message when data fetch fails', () => {
      mockUseArchitectureData.mockReturnValue({
        data: null,
        isLoading: false,
        error: mockError,
      });

      render(<DesignArchitecture />);

      expect(screen.getByText(/Failed to load architecture data/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });
  });

  describe('Successful Data Render', () => {
    beforeEach(() => {
      mockUseArchitectureData.mockReturnValue({
        data: mockData,
        isLoading: false,
        error: null,
      });
    });

    it('should render all architecture sections with proper content', () => {
      render(<DesignArchitecture />);

      expect(screen.getByText(/Modern Architecture Approach/i)).toBeInTheDocument();
      expect(screen.getByText(/Scalability/i)).toBeInTheDocument();
      expect(screen.getByText(/Modularity/i)).toBeInTheDocument();
      expect(screen.getByText(/Technology Stack/i)).toBeInTheDocument();
      expect(screen.getByText(/React/i)).toBeInTheDocument();
      expect(screen.getByText(/Node\.js/i)).toBeInTheDocument();
    });

    it('should render the call-to-action button with correct text and link', () => {
      render(<DesignArchitecture />);

      const ctaButton = screen.getByRole('link', { name: /Get Started with Our Architecture/i });
      expect(ctaButton).toBeInTheDocument();
      expect(ctaButton).toHaveAttribute('href', '/contact');
    });

    it('should have proper aria labels for accessibility', () => {
      render(<DesignArchitecture />);

      expect(screen.getByLabelText(/Modern Architecture Approach section/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Technology Stack section/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Architecture features list/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Technology stack list/i)).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    beforeEach(() => {
      mockUseArchitectureData.mockReturnValue({
        data: mockData,
        isLoading: false,
        error: null,
      });
    });

    it('should track analytics event when CTA button is clicked', () => {
      const mockTrackEvent = jest.fn();
      mockUseAnalytics.mockReturnValue({
        trackEvent: mockTrackEvent,
      });

      render(<DesignArchitecture />);

      const ctaButton = screen.getByRole('link', { name: /Get Started with Our Architecture/i });
      fireEvent.click(ctaButton);

      expect(mockTrackEvent).toHaveBeenCalledWith('cta_click', {
        component: 'DesignArchitecture',
        action: 'get_started_click',
      });
    });

    it('should show toast when feature item is clicked', async () => {
      const mockShowToast = jest.fn();
      mockUseToast.mockReturnValue({
        showToast: mockShowToast,
      });

      render(<DesignArchitecture />);

      const featureItem = screen.getByText(/Scalability/i);
      await userEvent.click(featureItem);

      expect(mockShowToast).toHaveBeenCalledWith({
        message: 'Scalability: Our architecture scales with your business needs',
        type: 'info',
      });
    });

    it('should handle retry button click when error occurs', async () => {
      const mockRetryFn = jest.fn();
      mockUseArchitectureData.mockReturnValue({
        data: null,
        isLoading: false,
        error: mockError,
        retry: mockRetryFn,
      });

      render(<DesignArchitecture />);

      const retryButton = screen.getByRole('button', { name: /retry/i });
      await userEvent.click(retryButton);

      expect(mockRetryFn).toHaveBeenCalled();
    });
  });

  describe('Responsive Behavior', () => {
    it('should render mobile-friendly layout on small screens', () => {
      global.innerWidth = 500;
      global.dispatchEvent(new Event('resize'));

      mockUseArchitectureData.mockReturnValue({
        data: mockData,
        isLoading: false,
        error: null,
      });

      render(<DesignArchitecture />);

      const section = screen.getByLabelText(/Modern Architecture Approach section/i);
      expect(section).toHaveClass('mobile-layout');
    });

    it('should render desktop layout on larger screens', () => {
      global.innerWidth = 1200;
      global.dispatchEvent(new Event('resize'));

      mockUseArchitectureData.mockReturnValue({
        data: mockData,
        isLoading: false,
        error: null,
      });

      render(<DesignArchitecture />);

      const section = screen.getByLabelText(/Modern Architecture Approach section/i);
      expect(section).toHaveClass('desktop-layout');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty sections gracefully', () => {
      mockUseArchitectureData.mockReturnValue({
        data: { sections: [], cta: mockData.cta },
        isLoading: false,
        error: null,
      });

      render(<DesignArchitecture />);

      expect(screen.queryByText(/Modern Architecture Approach/i)).not.toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Get Started with Our Architecture/i })).toBeInTheDocument();
    });

    it('should handle missing CTA data', () => {
      mockUseArchitectureData.mockReturnValue({
        data: { sections: mockData.sections, cta: null },
        isLoading: false,
        error: null,
      });

      render(<DesignArchitecture />);

      expect(screen.queryByRole('link', { name: /Get Started with Our Architecture/i })).not.toBeInTheDocument();
      expect(screen.getByText(/Modern Architecture Approach/i)).toBeInTheDocument();
    });

    it('should show fallback image when image fails to load', () => {
      mockUseArchitectureData.mockReturnValue({
        data: mockData,
        isLoading: false,
        error: null,
      });

      render(<DesignArchitecture />);

      const image = screen.getByAltText(/Modern Architecture Illustration/i);
      fireEvent.error(image);

      expect(image).toHaveAttribute('src', 'fallback-architecture.jpg');
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      mockUseArchitectureData.mockReturnValue({
        data: mockData,
        isLoading: false,
        error: null,
      });

      render(<DesignArchitecture />);

      const headings = screen.getAllByRole('heading');
      expect(headings[0]).toHaveTextContent(/Design Architecture/i);
      expect(headings[1]).toHaveTextContent(/Modern Architecture Approach/i);
      expect(headings[2]).toHaveTextContent(/Technology Stack/i);
    });

    it('should have proper contrast ratios for text', () => {
      mockUseArchitectureData.mockReturnValue({
        data: mockData,
        isLoading: false,
        error: null,
      });

      render(<DesignArchitecture />);

      const textElements = screen.getAllByText(/Our cutting-edge design principles/i);
      textElements.forEach(element => {
        const style = window.getComputedStyle(element);
        const color = style.color;
        const backgroundColor = style.backgroundColor;
        // This is a simplified check - in real tests you'd use a proper contrast checking library
        expect(color).not.toBe(backgroundColor);
      });
    });

    it('should be navigable via keyboard', async () => {
      mockUseArchitectureData.mockReturnValue({
        data: mockData,
        isLoading: false,
        error: null,
      });

      render(<DesignArchitecture />);

      const ctaButton = screen.getByRole('link', { name: /Get Started with Our Architecture/i });
      await userEvent.tab();
      expect(ctaButton).toHaveFocus();

      await userEvent.keyboard('{Enter}');
      expect(mockUseAnalytics().trackEvent).toHaveBeenCalled();
    });
  });
});