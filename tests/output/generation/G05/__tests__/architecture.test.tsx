import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
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
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
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
      imageUrl: '/modern-arch.jpg',
      ctaText: 'Learn More',
    },
    {
      id: 'tech-stack',
      title: 'Technology Stack',
      description: 'Tools and technologies we use',
      features: ['React', 'Node.js', 'GraphQL'],
      imageUrl: '/tech-stack.jpg',
      ctaText: 'Explore Stack',
    },
  ],
  loading: false,
  error: null,
};

const mockError = {
  sections: [],
  loading: false,
  error: new Error('Failed to fetch architecture data'),
};

describe('DesignArchitecture Component', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    mockUseArchitectureData.mockReturnValue(mockData);
    mockUseAnalytics.mockReturnValue({ trackEvent: jest.fn() });
    mockUseToast.mockReturnValue({ showToast: jest.fn() });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering and Initial State', () => {
    it('should render the component with all sections when data is loaded', () => {
      render(<DesignArchitecture />);

      expect(screen.getByRole('heading', { name: /modern architecture approach/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /technology stack/i })).toBeInTheDocument();
      expect(screen.getByText(/our cutting-edge design principles/i)).toBeInTheDocument();
      expect(screen.getByText(/tools and technologies we use/i)).toBeInTheDocument();
    });

    it('should display loading skeleton when data is loading', () => {
      mockUseArchitectureData.mockReturnValue({ ...mockData, loading: true, sections: [] });
      render(<DesignArchitecture />);

      expect(screen.getByTestId('section-skeleton')).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: /modern architecture approach/i })).not.toBeInTheDocument();
    });

    it('should display error message when data fetch fails', () => {
      mockUseArchitectureData.mockReturnValue(mockError);
      render(<DesignArchitecture />);

      expect(screen.getByText(/failed to load architecture data/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should expand/collapse section when header is clicked', async () => {
      render(<DesignArchitecture />);

      const sectionHeader = screen.getByRole('heading', { name: /modern architecture approach/i });
      const sectionContent = screen.getByTestId('modern-approach-content');

      // Initially collapsed
      expect(sectionContent).toHaveClass('collapsed');

      await user.click(sectionHeader);
      expect(sectionContent).not.toHaveClass('collapsed');

      await user.click(sectionHeader);
      expect(sectionContent).toHaveClass('collapsed');
    });

    it('should navigate to details page when CTA button is clicked', async () => {
      const mockNavigate = jest.fn();
      jest.mock('react-router-dom', () => ({
        ...jest.requireActual('react-router-dom'),
        useNavigate: () => mockNavigate,
      }));

      render(<DesignArchitecture />);

      const ctaButton = screen.getAllByRole('button', { name: /learn more/i })[0];
      await user.click(ctaButton);

      expect(mockNavigate).toHaveBeenCalledWith('/architecture/modern-approach');
    });

    it('should show toast when copying architecture diagram', async () => {
      render(<DesignArchitecture />);

      const copyButton = screen.getAllByRole('button', { name: /copy diagram/i })[0];
      await user.click(copyButton);

      expect(mockUseToast().showToast).toHaveBeenCalledWith({
        message: 'Architecture diagram copied to clipboard',
        type: 'success',
      });
    });

    it('should retry fetching data when retry button is clicked after error', async () => {
      mockUseArchitectureData.mockReturnValue(mockError);
      render(<DesignArchitecture />);

      const retryButton = screen.getByRole('button', { name: /retry/i });
      await user.click(retryButton);

      expect(mockUseArchitectureData).toHaveBeenCalledTimes(2);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes for expandable sections', () => {
      render(<DesignArchitecture />);

      const sectionHeaders = screen.getAllByRole('heading', { level: 2 });
      sectionHeaders.forEach(header => {
        expect(header).toHaveAttribute('aria-expanded', 'false');
        expect(header).toHaveAttribute('tabindex', '0');
      });
    });

    it('should toggle aria-expanded attribute when section is expanded/collapsed', async () => {
      render(<DesignArchitecture />);

      const sectionHeader = screen.getByRole('heading', { name: /modern architecture approach/i });

      // Initially collapsed
      expect(sectionHeader).toHaveAttribute('aria-expanded', 'false');

      await user.click(sectionHeader);
      expect(sectionHeader).toHaveAttribute('aria-expanded', 'true');

      await user.click(sectionHeader);
      expect(sectionHeader).toHaveAttribute('aria-expanded', 'false');
    });

    it('should be navigable via keyboard', async () => {
      render(<DesignArchitecture />);

      const sectionHeader = screen.getByRole('heading', { name: /modern architecture approach/i });

      // Focus the header
      sectionHeader.focus();
      expect(sectionHeader).toHaveFocus();

      // Expand with Enter key
      await user.keyboard('{Enter}');
      expect(sectionHeader).toHaveAttribute('aria-expanded', 'true');

      // Collapse with Space key
      await user.keyboard('{Space}');
      expect(sectionHeader).toHaveAttribute('aria-expanded', 'false');
    });

    it('should have proper contrast ratios for text elements', () => {
      render(<DesignArchitecture />);

      const headings = screen.getAllByRole('heading');
      headings.forEach(heading => {
        const style = window.getComputedStyle(heading);
        const color = style.color;
        const backgroundColor = style.backgroundColor;
        // This is a simplified check - in real tests you'd use a proper contrast checking library
        expect(color).not.toBe(backgroundColor);
      });
    });
  });

  describe('Analytics Tracking', () => {
    it('should track section expansion events', async () => {
      render(<DesignArchitecture />);

      const sectionHeader = screen.getByRole('heading', { name: /modern architecture approach/i });
      await user.click(sectionHeader);

      expect(mockUseAnalytics().trackEvent).toHaveBeenCalledWith(
        'architecture_section_expanded',
        { sectionId: 'modern-approach' }
      );
    });

    it('should track CTA button clicks', async () => {
      render(<DesignArchitecture />);

      const ctaButton = screen.getAllByRole('button', { name: /learn more/i })[0];
      await user.click(ctaButton);

      expect(mockUseAnalytics().trackEvent).toHaveBeenCalledWith(
        'architecture_cta_clicked',
        { sectionId: 'modern-approach' }
      );
    });

    it('should track diagram copy events', async () => {
      render(<DesignArchitecture />);

      const copyButton = screen.getAllByRole('button', { name: /copy diagram/i })[0];
      await user.click(copyButton);

      expect(mockUseAnalytics().trackEvent).toHaveBeenCalledWith(
        'architecture_diagram_copied',
        { sectionId: 'modern-approach' }
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty sections array gracefully', () => {
      mockUseArchitectureData.mockReturnValue({ ...mockData, sections: [] });
      render(<DesignArchitecture />);

      expect(screen.getByText(/no architecture sections available/i)).toBeInTheDocument();
    });

    it('should handle missing optional fields in section data', () => {
      const incompleteData = {
        ...mockData,
        sections: [
          {
            id: 'incomplete-section',
            title: 'Incomplete Section',
            // Missing description, features, imageUrl
          },
        ],
      };
      mockUseArchitectureData.mockReturnValue(incompleteData);
      render(<DesignArchitecture />);

      expect(screen.getByRole('heading', { name: /incomplete section/i })).toBeInTheDocument();
      expect(screen.queryByTestId('incomplete-section-features')).not.toBeInTheDocument();
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });

    it('should not break when image fails to load', () => {
      render(<DesignArchitecture />);

      const images = screen.getAllByRole('img');
      images.forEach(img => {
        fireEvent.error(img);
      });

      // Should fall back to placeholder or alternative text
      expect(screen.getAllByAltText(/architecture diagram/i)).toHaveLength(2);
    });
  });

  describe('Responsive Behavior', () => {
    it('should adjust layout for mobile viewports', () => {
      // Mock mobile viewport
      window.innerWidth = 500;
      fireEvent(window, new Event('resize'));

      render(<DesignArchitecture />);

      const section = screen.getByTestId('modern-approach');
      expect(section).toHaveClass('mobile-layout');
    });

    it('should maintain functionality in mobile view', async () => {
      window.innerWidth = 500;
      fireEvent(window, new Event('resize'));

      render(<DesignArchitecture />);

      const sectionHeader = screen.getByRole('heading', { name: /modern architecture approach/i });
      await user.click(sectionHeader);

      const sectionContent = screen.getByTestId('modern-approach-content');
      expect(sectionContent).not.toHaveClass('collapsed');
    });
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
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
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
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
      imageUrl: '/modern-arch.jpg',
      ctaText: 'Learn More',
    },
    {
      id: 'tech-stack',
      title: 'Technology Stack',
      description: 'Tools and technologies we use',
      features: ['React', 'Node.js', 'GraphQL'],
      imageUrl: '/tech-stack.jpg',
      ctaText: 'Explore Stack',
    },
  ],
  loading: false,
  error: null,
};

const mockError = {
  sections: [],
  loading: false,
  error: new Error('Failed to fetch architecture data'),
};

describe('DesignArchitecture Component', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    mockUseArchitectureData.mockReturnValue(mockData);
    mockUseAnalytics.mockReturnValue({ trackEvent: jest.fn() });
    mockUseToast.mockReturnValue({ showToast: jest.fn() });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering and Initial State', () => {
    it('should render the component with all sections when data is loaded', () => {
      render(<DesignArchitecture />);

      expect(screen.getByRole('heading', { name: /modern architecture approach/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /technology stack/i })).toBeInTheDocument();
      expect(screen.getByText(/our cutting-edge design principles/i)).toBeInTheDocument();
      expect(screen.getByText(/tools and technologies we use/i)).toBeInTheDocument();
    });

    it('should display loading skeleton when data is loading', () => {
      mockUseArchitectureData.mockReturnValue({ ...mockData, loading: true, sections: [] });
      render(<DesignArchitecture />);

      expect(screen.getByTestId('section-skeleton')).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: /modern architecture approach/i })).not.toBeInTheDocument();
    });

    it('should display error message when data fetch fails', () => {
      mockUseArchitectureData.mockReturnValue(mockError);
      render(<DesignArchitecture />);

      expect(screen.getByText(/failed to load architecture data/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should expand/collapse section when header is clicked', async () => {
      render(<DesignArchitecture />);

      const sectionHeader = screen.getByRole('heading', { name: /modern architecture approach/i });
      const sectionContent = screen.getByTestId('modern-approach-content');

      // Initially collapsed
      expect(sectionContent).toHaveClass('collapsed');

      await user.click(sectionHeader);
      expect(sectionContent).not.toHaveClass('collapsed');

      await user.click(sectionHeader);
      expect(sectionContent).toHaveClass('collapsed');
    });

    it('should navigate to details page when CTA button is clicked', async () => {
      const mockNavigate = jest.fn();
      jest.mock('react-router-dom', () => ({
        ...jest.requireActual('react-router-dom'),
        useNavigate: () => mockNavigate,
      }));

      render(<DesignArchitecture />);

      const ctaButton = screen.getAllByRole('button', { name: /learn more/i })[0];
      await user.click(ctaButton);

      expect(mockNavigate).toHaveBeenCalledWith('/architecture/modern-approach');
    });

    it('should show toast when copying architecture diagram', async () => {
      render(<DesignArchitecture />);

      const copyButton = screen.getAllByRole('button', { name: /copy diagram/i })[0];
      await user.click(copyButton);

      expect(mockUseToast().showToast).toHaveBeenCalledWith({
        message: 'Architecture diagram copied to clipboard',
        type: 'success',
      });
    });

    it('should retry fetching data when retry button is clicked after error', async () => {
      mockUseArchitectureData.mockReturnValue(mockError);
      render(<DesignArchitecture />);

      const retryButton = screen.getByRole('button', { name: /retry/i });
      await user.click(retryButton);

      expect(mockUseArchitectureData).toHaveBeenCalledTimes(2);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes for expandable sections', () => {
      render(<DesignArchitecture />);

      const sectionHeaders = screen.getAllByRole('heading', { level: 2 });
      sectionHeaders.forEach(header => {
        expect(header).toHaveAttribute('aria-expanded', 'false');
        expect(header).toHaveAttribute('tabindex', '0');
      });
    });

    it('should toggle aria-expanded attribute when section is expanded/collapsed', async () => {
      render(<DesignArchitecture />);

      const sectionHeader = screen.getByRole('heading', { name: /modern architecture approach/i });

      // Initially collapsed
      expect(sectionHeader).toHaveAttribute('aria-expanded', 'false');

      await user.click(sectionHeader);
      expect(sectionHeader).toHaveAttribute('aria-expanded', 'true');

      await user.click(sectionHeader);
      expect(sectionHeader).toHaveAttribute('aria-expanded', 'false');
    });

    it('should be navigable via keyboard', async () => {
      render(<DesignArchitecture />);

      const sectionHeader = screen.getByRole('heading', { name: /modern architecture approach/i });

      // Focus the header
      sectionHeader.focus();
      expect(sectionHeader).toHaveFocus();

      // Expand with Enter key
      await user.keyboard('{Enter}');
      expect(sectionHeader).toHaveAttribute('aria-expanded', 'true');

      // Collapse with Space key
      await user.keyboard('{Space}');
      expect(sectionHeader).toHaveAttribute('aria-expanded', 'false');
    });

    it('should have proper contrast ratios for text elements', () => {
      render(<DesignArchitecture />);

      const headings = screen.getAllByRole('heading');
      headings.forEach(heading => {
        const style = window.getComputedStyle(heading);
        const color = style.color;
        const backgroundColor = style.backgroundColor;
        // This is a simplified check - in real tests you'd use a proper contrast checking library
        expect(color).not.toBe(backgroundColor);
      });
    });
  });

  describe('Analytics Tracking', () => {
    it('should track section expansion events', async () => {
      render(<DesignArchitecture />);

      const sectionHeader = screen.getByRole('heading', { name: /modern architecture approach/i });
      await user.click(sectionHeader);

      expect(mockUseAnalytics().trackEvent).toHaveBeenCalledWith(
        'architecture_section_expanded',
        { sectionId: 'modern-approach' }
      );
    });

    it('should track CTA button clicks', async () => {
      render(<DesignArchitecture />);

      const ctaButton = screen.getAllByRole('button', { name: /learn more/i })[0];
      await user.click(ctaButton);

      expect(mockUseAnalytics().trackEvent).toHaveBeenCalledWith(
        'architecture_cta_clicked',
        { sectionId: 'modern-approach' }
      );
    });

    it('should track diagram copy events', async () => {
      render(<DesignArchitecture />);

      const copyButton = screen.getAllByRole('button', { name: /copy diagram/i })[0];
      await user.click(copyButton);

      expect(mockUseAnalytics().trackEvent).toHaveBeenCalledWith(
        'architecture_diagram_copied',
        { sectionId: 'modern-approach' }
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty sections array gracefully', () => {
      mockUseArchitectureData.mockReturnValue({ ...mockData, sections: [] });
      render(<DesignArchitecture />);

      expect(screen.getByText(/no architecture sections available/i)).toBeInTheDocument();
    });

    it('should handle missing optional fields in section data', () => {
      const incompleteData = {
        ...mockData,
        sections: [
          {
            id: 'incomplete-section',
            title: 'Incomplete Section',
            // Missing description, features, imageUrl
          },
        ],
      };
      mockUseArchitectureData.mockReturnValue(incompleteData);
      render(<DesignArchitecture />);

      expect(screen.getByRole('heading', { name: /incomplete section/i })).toBeInTheDocument();
      expect(screen.queryByTestId('incomplete-section-features')).not.toBeInTheDocument();
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });

    it('should not break when image fails to load', () => {
      render(<DesignArchitecture />);

      const images = screen.getAllByRole('img');
      images.forEach(img => {
        fireEvent.error(img);
      });

      // Should fall back to placeholder or alternative text
      expect(screen.getAllByAltText(/architecture diagram/i)).toHaveLength(2);
    });
  });

  describe('Responsive Behavior', () => {
    it('should adjust layout for mobile viewports', () => {
      // Mock mobile viewport
      window.innerWidth = 500;
      fireEvent(window, new Event('resize'));

      render(<DesignArchitecture />);

      const section = screen.getByTestId('modern-approach');
      expect(section).toHaveClass('mobile-layout');
    });

    it('should maintain functionality in mobile view', async () => {
      window.innerWidth = 500;
      fireEvent(window, new Event('resize'));

      render(<DesignArchitecture />);

      const sectionHeader = screen.getByRole('heading', { name: /modern architecture approach/i });
      await user.click(sectionHeader);

      const sectionContent = screen.getByTestId('modern-approach-content');
      expect(sectionContent).not.toHaveClass('collapsed');
    });
  });
});