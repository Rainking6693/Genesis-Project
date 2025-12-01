import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DesignArchitecture } from './DesignArchitecture';
import { useArchitectureData } from '../../hooks/useArchitectureData';
import { useAnalytics } from '../../hooks/useAnalytics';
import { useToast } from '../../hooks/useToast';

// Mock hooks
jest.mock('../../hooks/useArchitectureData');
jest.mock('../../hooks/useAnalytics');
jest.mock('../../hooks/useToast');

const mockUseArchitectureData = useArchitectureData as jest.Mock;
const mockUseAnalytics = useAnalytics as jest.Mock;
const mockUseToast = useToast as jest.Mock;

const mockData = {
  sections: [
    {
      id: 'section-1',
      title: 'Modern UI Components',
      description: 'Pre-built components for rapid development',
      imageUrl: '/modern-ui.jpg',
      features: ['Responsive', 'Accessible', 'Customizable']
    },
    {
      id: 'section-2',
      title: 'Scalable Architecture',
      description: 'Built to grow with your business needs',
      imageUrl: '/scalable-arch.jpg',
      features: ['Modular', 'Performance optimized', 'Well documented']
    }
  ],
  cta: {
    text: 'Get Started',
    link: '/get-started'
  }
};

const mockError = new Error('Failed to load architecture data');

describe('DesignArchitecture Component', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    mockUseArchitectureData.mockReturnValue({
      data: mockData,
      isLoading: false,
      error: null
    });
    mockUseAnalytics.mockReturnValue({
      trackEvent: jest.fn()
    });
    mockUseToast.mockReturnValue({
      showToast: jest.fn()
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Render', () => {
    it('should render loading state when data is being fetched', () => {
      mockUseArchitectureData.mockReturnValue({
        data: null,
        isLoading: true,
        error: null
      });

      render(<DesignArchitecture />);

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText(/loading design architecture/i)).toBeInTheDocument();
    });

    it('should render error state when data fetch fails', () => {
      mockUseArchitectureData.mockReturnValue({
        data: null,
        isLoading: false,
        error: mockError
      });

      render(<DesignArchitecture />);

      expect(screen.getByText(/error loading architecture data/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('should render all sections when data is successfully loaded', () => {
      render(<DesignArchitecture />);

      expect(screen.getByText(/modern ui components/i)).toBeInTheDocument();
      expect(screen.getByText(/scalable architecture/i)).toBeInTheDocument();
      expect(screen.getAllByRole('img').length).toBe(2);
      expect(screen.getByRole('button', { name: /get started/i })).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should track analytics when section comes into view', async () => {
      const trackEvent = jest.fn();
      mockUseAnalytics.mockReturnValue({ trackEvent });

      render(<DesignArchitecture />);

      const section = screen.getByText(/modern ui components/i);
      fireEvent.scroll(window, { target: { scrollY: section.getBoundingClientRect().top } });

      await waitFor(() => {
        expect(trackEvent).toHaveBeenCalledWith('section_view', {
          sectionId: 'section-1',
          sectionTitle: 'Modern UI Components'
        });
      });
    });

    it('should navigate to CTA link when button is clicked', async () => {
      const originalLocation = window.location;
      delete (window as any).location;
      window.location = { assign: jest.fn() } as any;

      render(<DesignArchitecture />);

      await user.click(screen.getByRole('button', { name: /get started/i }));

      expect(window.location.assign).toHaveBeenCalledWith('/get-started');

      window.location = originalLocation;
    });

    it('should show toast when feature item is clicked', async () => {
      const showToast = jest.fn();
      mockUseToast.mockReturnValue({ showToast });

      render(<DesignArchitecture />);

      const featureItems = screen.getAllByRole('listitem');
      await user.click(featureItems[0]);

      expect(showToast).toHaveBeenCalledWith({
        message: 'Responsive design ensures optimal viewing on all devices',
        type: 'info'
      });
    });

    it('should retry fetching data when retry button is clicked', async () => {
      mockUseArchitectureData.mockReturnValue({
        data: null,
        isLoading: false,
        error: mockError
      });

      const refetch = jest.fn();
      mockUseArchitectureData.mockReturnValue({
        data: null,
        isLoading: false,
        error: mockError,
        refetch
      });

      render(<DesignArchitecture />);

      await user.click(screen.getByRole('button', { name: /retry/i }));

      expect(refetch).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels for all interactive elements', () => {
      render(<DesignArchitecture />);

      expect(screen.getByRole('button', { name: /get started/i })).toHaveAccessibleName();
      expect(screen.getAllByRole('img')[0]).toHaveAccessibleName(/modern ui components/i);
      expect(screen.getByRole('heading', { name: /modern ui components/i })).toBeInTheDocument();
    });

    it('should be navigable via keyboard', async () => {
      render(<DesignArchitecture />);

      await user.tab();
      expect(screen.getByRole('button', { name: /get started/i })).toHaveFocus();

      await user.tab({ shift: true });
      const featureItems = screen.getAllByRole('listitem');
      expect(featureItems[featureItems.length - 1]).toHaveFocus();
    });

    it('should have proper contrast ratios for text elements', () => {
      render(<DesignArchitecture />);

      const headings = screen.getAllByRole('heading');
      headings.forEach(heading => {
        expect(heading).toHaveStyle('color: rgba(0, 0, 0, 0.87)');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty sections array gracefully', () => {
      mockUseArchitectureData.mockReturnValue({
        data: { sections: [], cta: mockData.cta },
        isLoading: false,
        error: null
      });

      render(<DesignArchitecture />);

      expect(screen.getByText(/no architecture sections available/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /get started/i })).toBeInTheDocument();
    });

    it('should handle missing CTA data gracefully', () => {
      mockUseArchitectureData.mockReturnValue({
        data: { sections: mockData.sections, cta: null },
        isLoading: false,
        error: null
      });

      render(<DesignArchitecture />);

      expect(screen.queryByRole('button', { name: /get started/i })).not.toBeInTheDocument();
    });

    it('should handle missing image URLs gracefully', () => {
      const dataWithMissingImages = {
        ...mockData,
        sections: mockData.sections.map(section => ({
          ...section,
          imageUrl: ''
        }))
      };

      mockUseArchitectureData.mockReturnValue({
        data: dataWithMissingImages,
        isLoading: false,
        error: null
      });

      render(<DesignArchitecture />);

      const images = screen.getAllByRole('img');
      images.forEach(img => {
        expect(img).toHaveAttribute('src', 'placeholder-image.jpg');
      });
    });

    it('should handle very long section titles without breaking layout', () => {
      const longTitleData = {
        ...mockData,
        sections: [
          {
            ...mockData.sections[0],
            title: 'Very Long Section Title That Should Not Break The Layout And Should Be Handled With Proper Text Wrapping And Overflow Handling'
          },
          ...mockData.sections.slice(1)
        ]
      };

      mockUseArchitectureData.mockReturnValue({
        data: longTitleData,
        isLoading: false,
        error: null
      });

      render(<DesignArchitecture />);

      const titleElement = screen.getByText(/very long section title/i);
      expect(titleElement).toHaveStyle('word-break: break-word');
      expect(titleElement).toHaveStyle('overflow-wrap: break-word');
    });
  });

  describe('Responsive Behavior', () => {
    it('should adjust layout for mobile viewports', () => {
      global.innerWidth = 500;
      global.dispatchEvent(new Event('resize'));

      render(<DesignArchitecture />);

      const sectionContainers = screen.getAllByTestId('section-container');
      sectionContainers.forEach(container => {
        expect(container).toHaveStyle('flex-direction: column');
      });
    });

    it('should show mobile-specific CTA on small screens', () => {
      global.innerWidth = 500;
      global.dispatchEvent(new Event('resize'));

      render(<DesignArchitecture />);

      expect(screen.getByText(/tap to get started/i)).toBeInTheDocument();
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

// Mock hooks
jest.mock('../../hooks/useArchitectureData');
jest.mock('../../hooks/useAnalytics');
jest.mock('../../hooks/useToast');

const mockUseArchitectureData = useArchitectureData as jest.Mock;
const mockUseAnalytics = useAnalytics as jest.Mock;
const mockUseToast = useToast as jest.Mock;

const mockData = {
  sections: [
    {
      id: 'section-1',
      title: 'Modern UI Components',
      description: 'Pre-built components for rapid development',
      imageUrl: '/modern-ui.jpg',
      features: ['Responsive', 'Accessible', 'Customizable']
    },
    {
      id: 'section-2',
      title: 'Scalable Architecture',
      description: 'Built to grow with your business needs',
      imageUrl: '/scalable-arch.jpg',
      features: ['Modular', 'Performance optimized', 'Well documented']
    }
  ],
  cta: {
    text: 'Get Started',
    link: '/get-started'
  }
};

const mockError = new Error('Failed to load architecture data');

describe('DesignArchitecture Component', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    mockUseArchitectureData.mockReturnValue({
      data: mockData,
      isLoading: false,
      error: null
    });
    mockUseAnalytics.mockReturnValue({
      trackEvent: jest.fn()
    });
    mockUseToast.mockReturnValue({
      showToast: jest.fn()
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Render', () => {
    it('should render loading state when data is being fetched', () => {
      mockUseArchitectureData.mockReturnValue({
        data: null,
        isLoading: true,
        error: null
      });

      render(<DesignArchitecture />);

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText(/loading design architecture/i)).toBeInTheDocument();
    });

    it('should render error state when data fetch fails', () => {
      mockUseArchitectureData.mockReturnValue({
        data: null,
        isLoading: false,
        error: mockError
      });

      render(<DesignArchitecture />);

      expect(screen.getByText(/error loading architecture data/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('should render all sections when data is successfully loaded', () => {
      render(<DesignArchitecture />);

      expect(screen.getByText(/modern ui components/i)).toBeInTheDocument();
      expect(screen.getByText(/scalable architecture/i)).toBeInTheDocument();
      expect(screen.getAllByRole('img').length).toBe(2);
      expect(screen.getByRole('button', { name: /get started/i })).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should track analytics when section comes into view', async () => {
      const trackEvent = jest.fn();
      mockUseAnalytics.mockReturnValue({ trackEvent });

      render(<DesignArchitecture />);

      const section = screen.getByText(/modern ui components/i);
      fireEvent.scroll(window, { target: { scrollY: section.getBoundingClientRect().top } });

      await waitFor(() => {
        expect(trackEvent).toHaveBeenCalledWith('section_view', {
          sectionId: 'section-1',
          sectionTitle: 'Modern UI Components'
        });
      });
    });

    it('should navigate to CTA link when button is clicked', async () => {
      const originalLocation = window.location;
      delete (window as any).location;
      window.location = { assign: jest.fn() } as any;

      render(<DesignArchitecture />);

      await user.click(screen.getByRole('button', { name: /get started/i }));

      expect(window.location.assign).toHaveBeenCalledWith('/get-started');

      window.location = originalLocation;
    });

    it('should show toast when feature item is clicked', async () => {
      const showToast = jest.fn();
      mockUseToast.mockReturnValue({ showToast });

      render(<DesignArchitecture />);

      const featureItems = screen.getAllByRole('listitem');
      await user.click(featureItems[0]);

      expect(showToast).toHaveBeenCalledWith({
        message: 'Responsive design ensures optimal viewing on all devices',
        type: 'info'
      });
    });

    it('should retry fetching data when retry button is clicked', async () => {
      mockUseArchitectureData.mockReturnValue({
        data: null,
        isLoading: false,
        error: mockError
      });

      const refetch = jest.fn();
      mockUseArchitectureData.mockReturnValue({
        data: null,
        isLoading: false,
        error: mockError,
        refetch
      });

      render(<DesignArchitecture />);

      await user.click(screen.getByRole('button', { name: /retry/i }));

      expect(refetch).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels for all interactive elements', () => {
      render(<DesignArchitecture />);

      expect(screen.getByRole('button', { name: /get started/i })).toHaveAccessibleName();
      expect(screen.getAllByRole('img')[0]).toHaveAccessibleName(/modern ui components/i);
      expect(screen.getByRole('heading', { name: /modern ui components/i })).toBeInTheDocument();
    });

    it('should be navigable via keyboard', async () => {
      render(<DesignArchitecture />);

      await user.tab();
      expect(screen.getByRole('button', { name: /get started/i })).toHaveFocus();

      await user.tab({ shift: true });
      const featureItems = screen.getAllByRole('listitem');
      expect(featureItems[featureItems.length - 1]).toHaveFocus();
    });

    it('should have proper contrast ratios for text elements', () => {
      render(<DesignArchitecture />);

      const headings = screen.getAllByRole('heading');
      headings.forEach(heading => {
        expect(heading).toHaveStyle('color: rgba(0, 0, 0, 0.87)');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty sections array gracefully', () => {
      mockUseArchitectureData.mockReturnValue({
        data: { sections: [], cta: mockData.cta },
        isLoading: false,
        error: null
      });

      render(<DesignArchitecture />);

      expect(screen.getByText(/no architecture sections available/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /get started/i })).toBeInTheDocument();
    });

    it('should handle missing CTA data gracefully', () => {
      mockUseArchitectureData.mockReturnValue({
        data: { sections: mockData.sections, cta: null },
        isLoading: false,
        error: null
      });

      render(<DesignArchitecture />);

      expect(screen.queryByRole('button', { name: /get started/i })).not.toBeInTheDocument();
    });

    it('should handle missing image URLs gracefully', () => {
      const dataWithMissingImages = {
        ...mockData,
        sections: mockData.sections.map(section => ({
          ...section,
          imageUrl: ''
        }))
      };

      mockUseArchitectureData.mockReturnValue({
        data: dataWithMissingImages,
        isLoading: false,
        error: null
      });

      render(<DesignArchitecture />);

      const images = screen.getAllByRole('img');
      images.forEach(img => {
        expect(img).toHaveAttribute('src', 'placeholder-image.jpg');
      });
    });

    it('should handle very long section titles without breaking layout', () => {
      const longTitleData = {
        ...mockData,
        sections: [
          {
            ...mockData.sections[0],
            title: 'Very Long Section Title That Should Not Break The Layout And Should Be Handled With Proper Text Wrapping And Overflow Handling'
          },
          ...mockData.sections.slice(1)
        ]
      };

      mockUseArchitectureData.mockReturnValue({
        data: longTitleData,
        isLoading: false,
        error: null
      });

      render(<DesignArchitecture />);

      const titleElement = screen.getByText(/very long section title/i);
      expect(titleElement).toHaveStyle('word-break: break-word');
      expect(titleElement).toHaveStyle('overflow-wrap: break-word');
    });
  });

  describe('Responsive Behavior', () => {
    it('should adjust layout for mobile viewports', () => {
      global.innerWidth = 500;
      global.dispatchEvent(new Event('resize'));

      render(<DesignArchitecture />);

      const sectionContainers = screen.getAllByTestId('section-container');
      sectionContainers.forEach(container => {
        expect(container).toHaveStyle('flex-direction: column');
      });
    });

    it('should show mobile-specific CTA on small screens', () => {
      global.innerWidth = 500;
      global.dispatchEvent(new Event('resize'));

      render(<DesignArchitecture />);

      expect(screen.getByText(/tap to get started/i)).toBeInTheDocument();
    });
  });
});