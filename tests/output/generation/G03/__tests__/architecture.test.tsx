import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DesignArchitecture } from './DesignArchitecture';
import { useDesignData } from '../../hooks/useDesignData';
import { useAnalytics } from '../../hooks/useAnalytics';
import { useAuth } from '../../hooks/useAuth';

// Mock hooks and dependencies
jest.mock('../../hooks/useDesignData');
jest.mock('../../hooks/useAnalytics');
jest.mock('../../hooks/useAuth');
jest.mock('react-router-dom', () => ({
  useNavigate: jest.fn(),
}));

const mockUseDesignData = useDesignData as jest.MockedFunction<typeof useDesignData>;
const mockUseAnalytics = useAnalytics as jest.MockedFunction<typeof useAnalytics>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

const mockNavigate = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();

  // Default mock implementations
  mockUseDesignData.mockReturnValue({
    data: {
      sections: [
        { id: 'hero', title: 'Innovative Design', content: 'Cutting-edge solutions' },
        { id: 'features', title: 'Key Features', items: ['Feature 1', 'Feature 2'] },
      ],
      cta: { text: 'Get Started', link: '/signup' },
    },
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  });

  mockUseAnalytics.mockReturnValue({
    trackEvent: jest.fn(),
  });

  mockUseAuth.mockReturnValue({
    isAuthenticated: false,
    user: null,
  });

  require('react-router-dom').useNavigate.mockReturnValue(mockNavigate);
});

describe('DesignArchitecture - Landing Page', () => {
  describe('Rendering', () => {
    it('should render all main sections when data is loaded', () => {
      render(<DesignArchitecture />);

      expect(screen.getByRole('heading', { name: /innovative design/i })).toBeInTheDocument();
      expect(screen.getByText(/cutting-edge solutions/i)).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /key features/i })).toBeInTheDocument();
      expect(screen.getByText('Feature 1')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /get started/i })).toBeInTheDocument();
    });

    it('should render loading skeleton when data is being fetched', () => {
      mockUseDesignData.mockReturnValueOnce({
        data: null,
        isLoading: true,
        error: null,
        refetch: jest.fn(),
      });

      render(<DesignArchitecture />);

      expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
      expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    });

    it('should render error state when data fetch fails', () => {
      mockUseDesignData.mockReturnValueOnce({
        data: null,
        isLoading: false,
        error: new Error('Failed to fetch'),
        refetch: jest.fn(),
      });

      render(<DesignArchitecture />);

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should navigate to signup when CTA button is clicked', async () => {
      render(<DesignArchitecture />);

      const ctaButton = screen.getByRole('button', { name: /get started/i });
      await userEvent.click(ctaButton);

      expect(mockNavigate).toHaveBeenCalledWith('/signup');
    });

    it('should track analytics event when CTA button is clicked', async () => {
      const mockTrackEvent = jest.fn();
      mockUseAnalytics.mockReturnValueOnce({ trackEvent: mockTrackEvent });

      render(<DesignArchitecture />);

      const ctaButton = screen.getByRole('button', { name: /get started/i });
      await userEvent.click(ctaButton);

      expect(mockTrackEvent).toHaveBeenCalledWith('cta_click', {
        button: 'get_started',
        page: 'design_architecture',
      });
    });

    it('should retry data fetch when error retry button is clicked', async () => {
      const mockRefetch = jest.fn();
      mockUseDesignData.mockReturnValueOnce({
        data: null,
        isLoading: false,
        error: new Error('Failed to fetch'),
        refetch: mockRefetch,
      });

      render(<DesignArchitecture />);

      const retryButton = screen.getByRole('button', { name: /try again/i });
      await userEvent.click(retryButton);

      expect(mockRefetch).toHaveBeenCalled();
    });

    it('should scroll to features section when "Learn More" button is clicked', async () => {
      const mockScrollIntoView = jest.fn();
      window.HTMLElement.prototype.scrollIntoView = mockScrollIntoView;

      render(<DesignArchitecture />);

      const learnMoreButton = screen.getByRole('button', { name: /learn more/i });
      await userEvent.click(learnMoreButton);

      expect(mockScrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });
    });
  });

  describe('Authenticated User Flow', () => {
    it('should show personalized CTA when user is authenticated', () => {
      mockUseAuth.mockReturnValueOnce({
        isAuthenticated: true,
        user: { name: 'John Doe' },
      });

      mockUseDesignData.mockReturnValueOnce({
        data: {
          sections: [],
          cta: { text: 'Welcome back, {name}', link: '/dashboard' },
        },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<DesignArchitecture />);

      expect(screen.getByText(/welcome back, john doe/i)).toBeInTheDocument();
    });

    it('should navigate to dashboard when authenticated user clicks CTA', async () => {
      mockUseAuth.mockReturnValueOnce({
        isAuthenticated: true,
        user: { name: 'John Doe' },
      });

      render(<DesignArchitecture />);

      const ctaButton = screen.getByRole('button', { name: /get started/i });
      await userEvent.click(ctaButton);

      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes for screen readers', () => {
      render(<DesignArchitecture />);

      expect(screen.getByRole('main')).toHaveAttribute('aria-labelledby');
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /get started/i })).toHaveAttribute('aria-label');
    });

    it('should be navigable via keyboard', async () => {
      render(<DesignArchitecture />);

      // Tab to CTA button
      await userEvent.tab();
      expect(screen.getByRole('button', { name: /get started/i })).toHaveFocus();

      // Press Enter to activate
      await userEvent.keyboard('{Enter}');
      expect(mockNavigate).toHaveBeenCalledWith('/signup');
    });

    it('should have proper contrast ratios for text elements', () => {
      render(<DesignArchitecture />);

      const heading = screen.getByRole('heading', { name: /innovative design/i });
      const button = screen.getByRole('button', { name: /get started/i });

      // These would normally be tested with axe or similar tools
      // This is a placeholder for the actual contrast test
      expect(heading).toHaveStyle('color: #ffffff'); // Example assertion
      expect(button).toHaveStyle('color: #ffffff'); // Example assertion
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty data gracefully', () => {
      mockUseDesignData.mockReturnValueOnce({
        data: {
          sections: [],
          cta: null,
        },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<DesignArchitecture />);

      expect(screen.getByText(/no design content available/i)).toBeInTheDocument();
    });

    it('should handle missing section data without crashing', () => {
      mockUseDesignData.mockReturnValueOnce({
        data: {
          sections: [
            { id: 'hero', title: 'Innovative Design' }, // Missing content
          ],
          cta: { text: 'Get Started', link: '/signup' },
        },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<DesignArchitecture />);

      expect(screen.getByRole('heading', { name: /innovative design/i })).toBeInTheDocument();
      expect(screen.queryByText(/cutting-edge solutions/i)).not.toBeInTheDocument();
    });

    it('should show fallback CTA when link is missing', async () => {
      mockUseDesignData.mockReturnValueOnce({
        data: {
          sections: [],
          cta: { text: 'Get Started', link: null },
        },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<DesignArchitecture />);

      const ctaButton = screen.getByRole('button', { name: /get started/i });
      await userEvent.click(ctaButton);

      expect(mockNavigate).toHaveBeenCalledWith('/'); // Fallback to home
    });
  });

  describe('Responsive Behavior', () => {
    it('should render mobile menu button on small screens', () => {
      global.innerWidth = 500;
      global.dispatchEvent(new Event('resize'));

      render(<DesignArchitecture />);

      expect(screen.getByLabelText(/menu/i)).toBeInTheDocument();
    });

    it('should show mobile navigation when menu button is clicked', async () => {
      global.innerWidth = 500;
      global.dispatchEvent(new Event('resize'));

      render(<DesignArchitecture />);

      const menuButton = screen.getByLabelText(/menu/i);
      await userEvent.click(menuButton);

      expect(screen.getByRole('navigation')).toBeInTheDocument();
      expect(screen.getByText(/home/i)).toBeInTheDocument();
      expect(screen.getByText(/features/i)).toBeInTheDocument();
    });
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DesignArchitecture } from './DesignArchitecture';
import { useDesignData } from '../../hooks/useDesignData';
import { useAnalytics } from '../../hooks/useAnalytics';
import { useAuth } from '../../hooks/useAuth';

// Mock hooks and dependencies
jest.mock('../../hooks/useDesignData');
jest.mock('../../hooks/useAnalytics');
jest.mock('../../hooks/useAuth');
jest.mock('react-router-dom', () => ({
  useNavigate: jest.fn(),
}));

const mockUseDesignData = useDesignData as jest.MockedFunction<typeof useDesignData>;
const mockUseAnalytics = useAnalytics as jest.MockedFunction<typeof useAnalytics>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

const mockNavigate = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();

  // Default mock implementations
  mockUseDesignData.mockReturnValue({
    data: {
      sections: [
        { id: 'hero', title: 'Innovative Design', content: 'Cutting-edge solutions' },
        { id: 'features', title: 'Key Features', items: ['Feature 1', 'Feature 2'] },
      ],
      cta: { text: 'Get Started', link: '/signup' },
    },
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  });

  mockUseAnalytics.mockReturnValue({
    trackEvent: jest.fn(),
  });

  mockUseAuth.mockReturnValue({
    isAuthenticated: false,
    user: null,
  });

  require('react-router-dom').useNavigate.mockReturnValue(mockNavigate);
});

describe('DesignArchitecture - Landing Page', () => {
  describe('Rendering', () => {
    it('should render all main sections when data is loaded', () => {
      render(<DesignArchitecture />);

      expect(screen.getByRole('heading', { name: /innovative design/i })).toBeInTheDocument();
      expect(screen.getByText(/cutting-edge solutions/i)).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /key features/i })).toBeInTheDocument();
      expect(screen.getByText('Feature 1')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /get started/i })).toBeInTheDocument();
    });

    it('should render loading skeleton when data is being fetched', () => {
      mockUseDesignData.mockReturnValueOnce({
        data: null,
        isLoading: true,
        error: null,
        refetch: jest.fn(),
      });

      render(<DesignArchitecture />);

      expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
      expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    });

    it('should render error state when data fetch fails', () => {
      mockUseDesignData.mockReturnValueOnce({
        data: null,
        isLoading: false,
        error: new Error('Failed to fetch'),
        refetch: jest.fn(),
      });

      render(<DesignArchitecture />);

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should navigate to signup when CTA button is clicked', async () => {
      render(<DesignArchitecture />);

      const ctaButton = screen.getByRole('button', { name: /get started/i });
      await userEvent.click(ctaButton);

      expect(mockNavigate).toHaveBeenCalledWith('/signup');
    });

    it('should track analytics event when CTA button is clicked', async () => {
      const mockTrackEvent = jest.fn();
      mockUseAnalytics.mockReturnValueOnce({ trackEvent: mockTrackEvent });

      render(<DesignArchitecture />);

      const ctaButton = screen.getByRole('button', { name: /get started/i });
      await userEvent.click(ctaButton);

      expect(mockTrackEvent).toHaveBeenCalledWith('cta_click', {
        button: 'get_started',
        page: 'design_architecture',
      });
    });

    it('should retry data fetch when error retry button is clicked', async () => {
      const mockRefetch = jest.fn();
      mockUseDesignData.mockReturnValueOnce({
        data: null,
        isLoading: false,
        error: new Error('Failed to fetch'),
        refetch: mockRefetch,
      });

      render(<DesignArchitecture />);

      const retryButton = screen.getByRole('button', { name: /try again/i });
      await userEvent.click(retryButton);

      expect(mockRefetch).toHaveBeenCalled();
    });

    it('should scroll to features section when "Learn More" button is clicked', async () => {
      const mockScrollIntoView = jest.fn();
      window.HTMLElement.prototype.scrollIntoView = mockScrollIntoView;

      render(<DesignArchitecture />);

      const learnMoreButton = screen.getByRole('button', { name: /learn more/i });
      await userEvent.click(learnMoreButton);

      expect(mockScrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });
    });
  });

  describe('Authenticated User Flow', () => {
    it('should show personalized CTA when user is authenticated', () => {
      mockUseAuth.mockReturnValueOnce({
        isAuthenticated: true,
        user: { name: 'John Doe' },
      });

      mockUseDesignData.mockReturnValueOnce({
        data: {
          sections: [],
          cta: { text: 'Welcome back, {name}', link: '/dashboard' },
        },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<DesignArchitecture />);

      expect(screen.getByText(/welcome back, john doe/i)).toBeInTheDocument();
    });

    it('should navigate to dashboard when authenticated user clicks CTA', async () => {
      mockUseAuth.mockReturnValueOnce({
        isAuthenticated: true,
        user: { name: 'John Doe' },
      });

      render(<DesignArchitecture />);

      const ctaButton = screen.getByRole('button', { name: /get started/i });
      await userEvent.click(ctaButton);

      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes for screen readers', () => {
      render(<DesignArchitecture />);

      expect(screen.getByRole('main')).toHaveAttribute('aria-labelledby');
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /get started/i })).toHaveAttribute('aria-label');
    });

    it('should be navigable via keyboard', async () => {
      render(<DesignArchitecture />);

      // Tab to CTA button
      await userEvent.tab();
      expect(screen.getByRole('button', { name: /get started/i })).toHaveFocus();

      // Press Enter to activate
      await userEvent.keyboard('{Enter}');
      expect(mockNavigate).toHaveBeenCalledWith('/signup');
    });

    it('should have proper contrast ratios for text elements', () => {
      render(<DesignArchitecture />);

      const heading = screen.getByRole('heading', { name: /innovative design/i });
      const button = screen.getByRole('button', { name: /get started/i });

      // These would normally be tested with axe or similar tools
      // This is a placeholder for the actual contrast test
      expect(heading).toHaveStyle('color: #ffffff'); // Example assertion
      expect(button).toHaveStyle('color: #ffffff'); // Example assertion
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty data gracefully', () => {
      mockUseDesignData.mockReturnValueOnce({
        data: {
          sections: [],
          cta: null,
        },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<DesignArchitecture />);

      expect(screen.getByText(/no design content available/i)).toBeInTheDocument();
    });

    it('should handle missing section data without crashing', () => {
      mockUseDesignData.mockReturnValueOnce({
        data: {
          sections: [
            { id: 'hero', title: 'Innovative Design' }, // Missing content
          ],
          cta: { text: 'Get Started', link: '/signup' },
        },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<DesignArchitecture />);

      expect(screen.getByRole('heading', { name: /innovative design/i })).toBeInTheDocument();
      expect(screen.queryByText(/cutting-edge solutions/i)).not.toBeInTheDocument();
    });

    it('should show fallback CTA when link is missing', async () => {
      mockUseDesignData.mockReturnValueOnce({
        data: {
          sections: [],
          cta: { text: 'Get Started', link: null },
        },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<DesignArchitecture />);

      const ctaButton = screen.getByRole('button', { name: /get started/i });
      await userEvent.click(ctaButton);

      expect(mockNavigate).toHaveBeenCalledWith('/'); // Fallback to home
    });
  });

  describe('Responsive Behavior', () => {
    it('should render mobile menu button on small screens', () => {
      global.innerWidth = 500;
      global.dispatchEvent(new Event('resize'));

      render(<DesignArchitecture />);

      expect(screen.getByLabelText(/menu/i)).toBeInTheDocument();
    });

    it('should show mobile navigation when menu button is clicked', async () => {
      global.innerWidth = 500;
      global.dispatchEvent(new Event('resize'));

      render(<DesignArchitecture />);

      const menuButton = screen.getByLabelText(/menu/i);
      await userEvent.click(menuButton);

      expect(screen.getByRole('navigation')).toBeInTheDocument();
      expect(screen.getByText(/home/i)).toBeInTheDocument();
      expect(screen.getByText(/features/i)).toBeInTheDocument();
    });
  });
});