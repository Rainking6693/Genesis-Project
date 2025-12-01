import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DesignArchitecture } from './DesignArchitecture';
import { useArchitectureData } from '../../hooks/useArchitectureData';
import { useAnalytics } from '../../hooks/useAnalytics';
import { useViewport } from '../../hooks/useViewport';

// Mock hooks
jest.mock('../../hooks/useArchitectureData');
jest.mock('../../hooks/useAnalytics');
jest.mock('../../hooks/useViewport');

const mockUseArchitectureData = useArchitectureData as jest.MockedFunction<typeof useArchitectureData>;
const mockUseAnalytics = useAnalytics as jest.MockedFunction<typeof useAnalytics>;
const mockUseViewport = useViewport as jest.MockedFunction<typeof useViewport>;

const mockData = {
  sections: [
    {
      id: 'modern-approach',
      title: 'Modern Architecture Approach',
      description: 'Our cutting-edge design principles',
      features: ['Scalable', 'Modular', 'Performance-focused'],
      image: '/modern-arch.jpg',
      cta: { text: 'Learn More', link: '/approach' }
    },
    {
      id: 'tech-stack',
      title: 'Technology Stack',
      description: 'Tools we use to build amazing products',
      features: ['React', 'Node.js', 'GraphQL'],
      image: '/tech-stack.jpg',
      cta: { text: 'Explore Stack', link: '/tech' }
    }
  ],
  testimonials: [
    {
      id: 'testimonial-1',
      quote: 'Amazing architecture that scaled with our needs',
      author: 'Jane Doe',
      title: 'CTO, TechCorp'
    }
  ]
};

const mockError = new Error('Failed to load architecture data');

describe('DesignArchitecture Component', () => {
  beforeEach(() => {
    mockUseAnalytics.mockReturnValue({
      trackEvent: jest.fn(),
      trackPageView: jest.fn()
    });

    mockUseViewport.mockReturnValue({
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      width: 1200,
      height: 800
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Loading States', () => {
    it('should render loading skeleton when data is being fetched', () => {
      mockUseArchitectureData.mockReturnValue({
        data: null,
        isLoading: true,
        error: null
      });

      render(<DesignArchitecture />);

      expect(screen.getByTestId('section-skeleton')).toBeInTheDocument();
      expect(screen.getByTestId('testimonials-skeleton')).toBeInTheDocument();
      expect(screen.queryByText(/Modern Architecture Approach/i)).not.toBeInTheDocument();
    });

    it('should render error state when data fetch fails', () => {
      mockUseArchitectureData.mockReturnValue({
        data: null,
        isLoading: false,
        error: mockError
      });

      render(<DesignArchitecture />);

      expect(screen.getByText(/Failed to load architecture data/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });
  });

  describe('Success States', () => {
    beforeEach(() => {
      mockUseArchitectureData.mockReturnValue({
        data: mockData,
        isLoading: false,
        error: null
      });
    });

    it('should render all architecture sections with proper content', () => {
      render(<DesignArchitecture />);

      expect(screen.getByText(/Modern Architecture Approach/i)).toBeInTheDocument();
      expect(screen.getByText(/Tools we use to build amazing products/i)).toBeInTheDocument();
      expect(screen.getByText(/Scalable/i)).toBeInTheDocument();
      expect(screen.getByText(/React/i)).toBeInTheDocument();
    });

    it('should render testimonials section with proper content', () => {
      render(<DesignArchitecture />);

      expect(screen.getByText(/Amazing architecture that scaled with our needs/i)).toBeInTheDocument();
      expect(screen.getByText(/Jane Doe/i)).toBeInTheDocument();
      expect(screen.getByText(/CTO, TechCorp/i)).toBeInTheDocument();
    });

    it('should render CTA buttons with correct links', () => {
      render(<DesignArchitecture />);

      const learnMoreButton = screen.getByRole('link', { name: /Learn More/i });
      const exploreStackButton = screen.getByRole('link', { name: /Explore Stack/i });

      expect(learnMoreButton).toHaveAttribute('href', '/approach');
      expect(exploreStackButton).toHaveAttribute('href', '/tech');
    });
  });

  describe('User Interactions', () => {
    beforeEach(() => {
      mockUseArchitectureData.mockReturnValue({
        data: mockData,
        isLoading: false,
        error: null
      });
    });

    it('should call analytics when CTA buttons are clicked', () => {
      const mockTrackEvent = jest.fn();
      mockUseAnalytics.mockReturnValue({
        trackEvent: mockTrackEvent,
        trackPageView: jest.fn()
      });

      render(<DesignArchitecture />);

      userEvent.click(screen.getByRole('link', { name: /Learn More/i }));
      expect(mockTrackEvent).toHaveBeenCalledWith('cta_click', {
        cta_name: 'Learn More',
        section: 'modern-approach'
      });

      userEvent.click(screen.getByRole('link', { name: /Explore Stack/i }));
      expect(mockTrackEvent).toHaveBeenCalledWith('cta_click', {
        cta_name: 'Explore Stack',
        section: 'tech-stack'
      });
    });

    it('should retry fetching data when retry button is clicked after error', () => {
      const mockRetry = jest.fn();
      mockUseArchitectureData.mockReturnValue({
        data: null,
        isLoading: false,
        error: mockError,
        retry: mockRetry
      });

      render(<DesignArchitecture />);

      userEvent.click(screen.getByRole('button', { name: /retry/i }));
      expect(mockRetry).toHaveBeenCalled();
    });

    it('should handle feature card hover effects on desktop', () => {
      render(<DesignArchitecture />);

      const featureCards = screen.getAllByTestId('feature-card');
      fireEvent.mouseEnter(featureCards[0]);
      expect(featureCards[0]).toHaveClass('hover:scale-105');

      fireEvent.mouseLeave(featureCards[0]);
      expect(featureCards[0]).not.toHaveClass('scale-105');
    });
  });

  describe('Responsive Behavior', () => {
    it('should render mobile layout when viewport is mobile', () => {
      mockUseViewport.mockReturnValue({
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        width: 400,
        height: 800
      });

      render(<DesignArchitecture />);

      const sectionContainers = screen.getAllByTestId('section-container');
      sectionContainers.forEach(container => {
        expect(container).toHaveClass('flex-col');
      });
    });

    it('should render tablet layout when viewport is tablet', () => {
      mockUseViewport.mockReturnValue({
        isMobile: false,
        isTablet: true,
        isDesktop: false,
        width: 800,
        height: 1200
      });

      render(<DesignArchitecture />);

      const sectionContainers = screen.getAllByTestId('section-container');
      sectionContainers.forEach(container => {
        expect(container).toHaveClass('flex-col md:flex-row');
      });
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      mockUseArchitectureData.mockReturnValue({
        data: mockData,
        isLoading: false,
        error: null
      });
    });

    it('should have proper aria labels for interactive elements', () => {
      render(<DesignArchitecture />);

      expect(screen.getByRole('link', { name: /Learn More/i })).toHaveAttribute('aria-label', 'Learn more about modern architecture approach');
      expect(screen.getByRole('link', { name: /Explore Stack/i })).toHaveAttribute('aria-label', 'Explore our technology stack');
    });

    it('should have proper heading hierarchy', () => {
      render(<DesignArchitecture />);

      expect(screen.getByRole('heading', { name: /Modern Architecture Approach/i, level: 2 })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /Technology Stack/i, level: 2 })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /What Our Clients Say/i, level: 2 })).toBeInTheDocument();
    });

    it('should have proper contrast ratios for text elements', () => {
      render(<DesignArchitecture />);

      const headings = screen.getAllByRole('heading');
      headings.forEach(heading => {
        expect(heading).toHaveStyle('color: rgba(0, 0, 0, 0.87)');
      });
    });

    it('should be navigable via keyboard', async () => {
      render(<DesignArchitecture />);

      // Tab through interactive elements
      await userEvent.tab();
      expect(screen.getByRole('link', { name: /Learn More/i })).toHaveFocus();

      await userEvent.tab();
      expect(screen.getByRole('link', { name: /Explore Stack/i })).toHaveFocus();

      await userEvent.tab();
      expect(screen.getByRole('link', { name: /Contact Us/i })).toHaveFocus();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty sections gracefully', () => {
      mockUseArchitectureData.mockReturnValue({
        data: { sections: [], testimonials: [] },
        isLoading: false,
        error: null
      });

      render(<DesignArchitecture />);

      expect(screen.getByText(/No architecture sections available/i)).toBeInTheDocument();
      expect(screen.getByText(/No testimonials yet/i)).toBeInTheDocument();
    });

    it('should handle missing images in sections', () => {
      const dataWithMissingImages = {
        sections: [
          {
            id: 'modern-approach',
            title: 'Modern Architecture Approach',
            description: 'Our cutting-edge design principles',
            features: ['Scalable', 'Modular'],
            image: null,
            cta: { text: 'Learn More', link: '/approach' }
          }
        ],
        testimonials: []
      };

      mockUseArchitectureData.mockReturnValue({
        data: dataWithMissingImages,
        isLoading: false,
        error: null
      });

      render(<DesignArchitecture />);

      expect(screen.queryByRole('img')).not.toBeInTheDocument();
      expect(screen.getByText(/Modern Architecture Approach/i)).toBeInTheDocument();
    });

    it('should handle very long feature lists with proper overflow', () => {
      const dataWithManyFeatures = {
        sections: [
          {
            id: 'modern-approach',
            title: 'Modern Architecture Approach',
            description: 'Our cutting-edge design principles',
            features: Array(20).fill('').map((_, i) => `Feature ${i + 1}`),
            image: '/modern-arch.jpg',
            cta: { text: 'Learn More', link: '/approach' }
          }
        ],
        testimonials: []
      };

      mockUseArchitectureData.mockReturnValue({
        data: dataWithManyFeatures,
        isLoading: false,
        error: null
      });

      render(<DesignArchitecture />);

      const featureList = screen.getByTestId('feature-list');
      expect(featureList).toHaveClass('grid-cols-2 md:grid-cols-3 lg:grid-cols-4');
      expect(featureList.children).toHaveLength(20);
    });
  });

  describe('Animation and Transitions', () => {
    it('should animate sections when they come into view', async () => {
      mockUseArchitectureData.mockReturnValue({
        data: mockData,
        isLoading: false,
        error: null
      });

      render(<DesignArchitecture />);

      const sections = screen.getAllByTestId('section-container');
      sections.forEach(section => {
        expect(section).toHaveClass('opacity-0');
      });

      // Simulate intersection observer callback
      const observeMock = jest.fn();
      const unobserveMock = jest.fn();
      window.IntersectionObserver = jest.fn().mockImplementation(() => ({
        observe: observeMock,
        unobserve: unobserveMock,
        disconnect: jest.fn()
      }));

      // Trigger intersection
      const intersectionCallback = (window.IntersectionObserver as jest.Mock).mock.calls[0][0];
      intersectionCallback([{ isIntersecting: true, target: sections[0] }]);

      await waitFor(() => {
        expect(sections[0]).toHaveClass('opacity-100');
        expect(sections[0]).toHaveClass('translate-y-0');
      });
    });
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DesignArchitecture } from './DesignArchitecture';
import { useArchitectureData } from '../../hooks/useArchitectureData';
import { useAnalytics } from '../../hooks/useAnalytics';
import { useViewport } from '../../hooks/useViewport';

// Mock hooks
jest.mock('../../hooks/useArchitectureData');
jest.mock('../../hooks/useAnalytics');
jest.mock('../../hooks/useViewport');

const mockUseArchitectureData = useArchitectureData as jest.MockedFunction<typeof useArchitectureData>;
const mockUseAnalytics = useAnalytics as jest.MockedFunction<typeof useAnalytics>;
const mockUseViewport = useViewport as jest.MockedFunction<typeof useViewport>;

const mockData = {
  sections: [
    {
      id: 'modern-approach',
      title: 'Modern Architecture Approach',
      description: 'Our cutting-edge design principles',
      features: ['Scalable', 'Modular', 'Performance-focused'],
      image: '/modern-arch.jpg',
      cta: { text: 'Learn More', link: '/approach' }
    },
    {
      id: 'tech-stack',
      title: 'Technology Stack',
      description: 'Tools we use to build amazing products',
      features: ['React', 'Node.js', 'GraphQL'],
      image: '/tech-stack.jpg',
      cta: { text: 'Explore Stack', link: '/tech' }
    }
  ],
  testimonials: [
    {
      id: 'testimonial-1',
      quote: 'Amazing architecture that scaled with our needs',
      author: 'Jane Doe',
      title: 'CTO, TechCorp'
    }
  ]
};

const mockError = new Error('Failed to load architecture data');

describe('DesignArchitecture Component', () => {
  beforeEach(() => {
    mockUseAnalytics.mockReturnValue({
      trackEvent: jest.fn(),
      trackPageView: jest.fn()
    });

    mockUseViewport.mockReturnValue({
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      width: 1200,
      height: 800
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Loading States', () => {
    it('should render loading skeleton when data is being fetched', () => {
      mockUseArchitectureData.mockReturnValue({
        data: null,
        isLoading: true,
        error: null
      });

      render(<DesignArchitecture />);

      expect(screen.getByTestId('section-skeleton')).toBeInTheDocument();
      expect(screen.getByTestId('testimonials-skeleton')).toBeInTheDocument();
      expect(screen.queryByText(/Modern Architecture Approach/i)).not.toBeInTheDocument();
    });

    it('should render error state when data fetch fails', () => {
      mockUseArchitectureData.mockReturnValue({
        data: null,
        isLoading: false,
        error: mockError
      });

      render(<DesignArchitecture />);

      expect(screen.getByText(/Failed to load architecture data/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });
  });

  describe('Success States', () => {
    beforeEach(() => {
      mockUseArchitectureData.mockReturnValue({
        data: mockData,
        isLoading: false,
        error: null
      });
    });

    it('should render all architecture sections with proper content', () => {
      render(<DesignArchitecture />);

      expect(screen.getByText(/Modern Architecture Approach/i)).toBeInTheDocument();
      expect(screen.getByText(/Tools we use to build amazing products/i)).toBeInTheDocument();
      expect(screen.getByText(/Scalable/i)).toBeInTheDocument();
      expect(screen.getByText(/React/i)).toBeInTheDocument();
    });

    it('should render testimonials section with proper content', () => {
      render(<DesignArchitecture />);

      expect(screen.getByText(/Amazing architecture that scaled with our needs/i)).toBeInTheDocument();
      expect(screen.getByText(/Jane Doe/i)).toBeInTheDocument();
      expect(screen.getByText(/CTO, TechCorp/i)).toBeInTheDocument();
    });

    it('should render CTA buttons with correct links', () => {
      render(<DesignArchitecture />);

      const learnMoreButton = screen.getByRole('link', { name: /Learn More/i });
      const exploreStackButton = screen.getByRole('link', { name: /Explore Stack/i });

      expect(learnMoreButton).toHaveAttribute('href', '/approach');
      expect(exploreStackButton).toHaveAttribute('href', '/tech');
    });
  });

  describe('User Interactions', () => {
    beforeEach(() => {
      mockUseArchitectureData.mockReturnValue({
        data: mockData,
        isLoading: false,
        error: null
      });
    });

    it('should call analytics when CTA buttons are clicked', () => {
      const mockTrackEvent = jest.fn();
      mockUseAnalytics.mockReturnValue({
        trackEvent: mockTrackEvent,
        trackPageView: jest.fn()
      });

      render(<DesignArchitecture />);

      userEvent.click(screen.getByRole('link', { name: /Learn More/i }));
      expect(mockTrackEvent).toHaveBeenCalledWith('cta_click', {
        cta_name: 'Learn More',
        section: 'modern-approach'
      });

      userEvent.click(screen.getByRole('link', { name: /Explore Stack/i }));
      expect(mockTrackEvent).toHaveBeenCalledWith('cta_click', {
        cta_name: 'Explore Stack',
        section: 'tech-stack'
      });
    });

    it('should retry fetching data when retry button is clicked after error', () => {
      const mockRetry = jest.fn();
      mockUseArchitectureData.mockReturnValue({
        data: null,
        isLoading: false,
        error: mockError,
        retry: mockRetry
      });

      render(<DesignArchitecture />);

      userEvent.click(screen.getByRole('button', { name: /retry/i }));
      expect(mockRetry).toHaveBeenCalled();
    });

    it('should handle feature card hover effects on desktop', () => {
      render(<DesignArchitecture />);

      const featureCards = screen.getAllByTestId('feature-card');
      fireEvent.mouseEnter(featureCards[0]);
      expect(featureCards[0]).toHaveClass('hover:scale-105');

      fireEvent.mouseLeave(featureCards[0]);
      expect(featureCards[0]).not.toHaveClass('scale-105');
    });
  });

  describe('Responsive Behavior', () => {
    it('should render mobile layout when viewport is mobile', () => {
      mockUseViewport.mockReturnValue({
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        width: 400,
        height: 800
      });

      render(<DesignArchitecture />);

      const sectionContainers = screen.getAllByTestId('section-container');
      sectionContainers.forEach(container => {
        expect(container).toHaveClass('flex-col');
      });
    });

    it('should render tablet layout when viewport is tablet', () => {
      mockUseViewport.mockReturnValue({
        isMobile: false,
        isTablet: true,
        isDesktop: false,
        width: 800,
        height: 1200
      });

      render(<DesignArchitecture />);

      const sectionContainers = screen.getAllByTestId('section-container');
      sectionContainers.forEach(container => {
        expect(container).toHaveClass('flex-col md:flex-row');
      });
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      mockUseArchitectureData.mockReturnValue({
        data: mockData,
        isLoading: false,
        error: null
      });
    });

    it('should have proper aria labels for interactive elements', () => {
      render(<DesignArchitecture />);

      expect(screen.getByRole('link', { name: /Learn More/i })).toHaveAttribute('aria-label', 'Learn more about modern architecture approach');
      expect(screen.getByRole('link', { name: /Explore Stack/i })).toHaveAttribute('aria-label', 'Explore our technology stack');
    });

    it('should have proper heading hierarchy', () => {
      render(<DesignArchitecture />);

      expect(screen.getByRole('heading', { name: /Modern Architecture Approach/i, level: 2 })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /Technology Stack/i, level: 2 })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /What Our Clients Say/i, level: 2 })).toBeInTheDocument();
    });

    it('should have proper contrast ratios for text elements', () => {
      render(<DesignArchitecture />);

      const headings = screen.getAllByRole('heading');
      headings.forEach(heading => {
        expect(heading).toHaveStyle('color: rgba(0, 0, 0, 0.87)');
      });
    });

    it('should be navigable via keyboard', async () => {
      render(<DesignArchitecture />);

      // Tab through interactive elements
      await userEvent.tab();
      expect(screen.getByRole('link', { name: /Learn More/i })).toHaveFocus();

      await userEvent.tab();
      expect(screen.getByRole('link', { name: /Explore Stack/i })).toHaveFocus();

      await userEvent.tab();
      expect(screen.getByRole('link', { name: /Contact Us/i })).toHaveFocus();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty sections gracefully', () => {
      mockUseArchitectureData.mockReturnValue({
        data: { sections: [], testimonials: [] },
        isLoading: false,
        error: null
      });

      render(<DesignArchitecture />);

      expect(screen.getByText(/No architecture sections available/i)).toBeInTheDocument();
      expect(screen.getByText(/No testimonials yet/i)).toBeInTheDocument();
    });

    it('should handle missing images in sections', () => {
      const dataWithMissingImages = {
        sections: [
          {
            id: 'modern-approach',
            title: 'Modern Architecture Approach',
            description: 'Our cutting-edge design principles',
            features: ['Scalable', 'Modular'],
            image: null,
            cta: { text: 'Learn More', link: '/approach' }
          }
        ],
        testimonials: []
      };

      mockUseArchitectureData.mockReturnValue({
        data: dataWithMissingImages,
        isLoading: false,
        error: null
      });

      render(<DesignArchitecture />);

      expect(screen.queryByRole('img')).not.toBeInTheDocument();
      expect(screen.getByText(/Modern Architecture Approach/i)).toBeInTheDocument();
    });

    it('should handle very long feature lists with proper overflow', () => {
      const dataWithManyFeatures = {
        sections: [
          {
            id: 'modern-approach',
            title: 'Modern Architecture Approach',
            description: 'Our cutting-edge design principles',
            features: Array(20).fill('').map((_, i) => `Feature ${i + 1}`),
            image: '/modern-arch.jpg',
            cta: { text: 'Learn More', link: '/approach' }
          }
        ],
        testimonials: []
      };

      mockUseArchitectureData.mockReturnValue({
        data: dataWithManyFeatures,
        isLoading: false,
        error: null
      });

      render(<DesignArchitecture />);

      const featureList = screen.getByTestId('feature-list');
      expect(featureList).toHaveClass('grid-cols-2 md:grid-cols-3 lg:grid-cols-4');
      expect(featureList.children).toHaveLength(20);
    });
  });

  describe('Animation and Transitions', () => {
    it('should animate sections when they come into view', async () => {
      mockUseArchitectureData.mockReturnValue({
        data: mockData,
        isLoading: false,
        error: null
      });

      render(<DesignArchitecture />);

      const sections = screen.getAllByTestId('section-container');
      sections.forEach(section => {
        expect(section).toHaveClass('opacity-0');
      });

      // Simulate intersection observer callback
      const observeMock = jest.fn();
      const unobserveMock = jest.fn();
      window.IntersectionObserver = jest.fn().mockImplementation(() => ({
        observe: observeMock,
        unobserve: unobserveMock,
        disconnect: jest.fn()
      }));

      // Trigger intersection
      const intersectionCallback = (window.IntersectionObserver as jest.Mock).mock.calls[0][0];
      intersectionCallback([{ isIntersecting: true, target: sections[0] }]);

      await waitFor(() => {
        expect(sections[0]).toHaveClass('opacity-100');
        expect(sections[0]).toHaveClass('translate-y-0');
      });
    });
  });
});