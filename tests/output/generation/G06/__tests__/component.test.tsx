import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { MemoryRouter } from 'react-router-dom';
import { LandingPage } from './LandingPage';
import { useAnalytics } from '../hooks/useAnalytics';
import { useAuth } from '../context/AuthContext';

jest.mock('axios');
jest.mock('../hooks/useAnalytics');
jest.mock('../context/AuthContext');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
}));

const mockAnalytics = useAnalytics as jest.MockedFunction<typeof useAnalytics>;
const mockAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockNavigate = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  mockAnalytics.mockReturnValue({
    trackEvent: jest.fn(),
    trackPageView: jest.fn(),
  });
  mockAuth.mockReturnValue({
    user: null,
    login: jest.fn(),
    logout: jest.fn(),
    isLoading: false,
  });
  require('react-router-dom').useNavigate.mockReturnValue(mockNavigate);
});

describe('LandingPage - Core Functionality', () => {
  const renderComponent = () => render(
    <MemoryRouter>
      <LandingPage />
    </MemoryRouter>
  );

  describe('Initial Render', () => {
    it('should render the main heading and primary CTA button', () => {
      renderComponent();
      expect(screen.getByRole('heading', { name: /welcome to our platform/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /get started now/i })).toBeInTheDocument();
    });

    it('should render the hero section with proper accessibility attributes', () => {
      renderComponent();
      const heroSection = screen.getByRole('region', { name: /hero section/i });
      expect(heroSection).toHaveAttribute('aria-labelledby', 'hero-heading');
      expect(within(heroSection).getByRole('heading')).toBeInTheDocument();
    });

    it('should track page view on initial render', () => {
      renderComponent();
      expect(mockAnalytics().trackPageView).toHaveBeenCalledWith('Landing Page');
    });
  });

  describe('Primary CTA Interaction', () => {
    it('should navigate to signup page when CTA button is clicked', async () => {
      renderComponent();
      const ctaButton = screen.getByRole('button', { name: /get started now/i });
      await userEvent.click(ctaButton);
      expect(mockNavigate).toHaveBeenCalledWith('/signup');
    });

    it('should track CTA click event', async () => {
      renderComponent();
      const ctaButton = screen.getByRole('button', { name: /get started now/i });
      await userEvent.click(ctaButton);
      expect(mockAnalytics().trackEvent).toHaveBeenCalledWith(
        'CTA Click',
        { button: 'Primary', location: 'Hero' }
      );
    });

    it('should show loading state during navigation', async () => {
      mockNavigate.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      renderComponent();

      const ctaButton = screen.getByRole('button', { name: /get started now/i });
      userEvent.click(ctaButton);

      expect(screen.getByRole('button', { name: /get started now/i })).toBeDisabled();
      expect(screen.getByRole('status')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
      });
    });
  });

  describe('Feature Cards Section', () => {
    it('should render all feature cards with proper accessibility', () => {
      renderComponent();
      const featureCards = screen.getAllByRole('article');
      expect(featureCards).toHaveLength(3);

      featureCards.forEach(card => {
        expect(within(card).getByRole('heading')).toBeInTheDocument();
        expect(within(card).getByText(/learn more/i)).toBeInTheDocument();
      });
    });

    it('should expand feature card when "Learn More" is clicked', async () => {
      renderComponent();
      const learnMoreButtons = screen.getAllByRole('button', { name: /learn more/i });
      const firstButton = learnMoreButtons[0];

      expect(screen.queryByTestId('feature-details-0')).not.toBeInTheDocument();
      await userEvent.click(firstButton);
      expect(screen.getByTestId('feature-details-0')).toBeInTheDocument();
    });

    it('should collapse expanded feature card when clicked again', async () => {
      renderComponent();
      const learnMoreButtons = screen.getAllByRole('button', { name: /learn more/i });
      const firstButton = learnMoreButtons[0];

      await userEvent.click(firstButton);
      expect(screen.getByTestId('feature-details-0')).toBeInTheDocument();

      await userEvent.click(firstButton);
      expect(screen.queryByTestId('feature-details-0')).not.toBeInTheDocument();
    });

    it('should track feature card expansion events', async () => {
      renderComponent();
      const learnMoreButtons = screen.getAllByRole('button', { name: /learn more/i });

      await userEvent.click(learnMoreButtons[0]);
      expect(mockAnalytics().trackEvent).toHaveBeenCalledWith(
        'Feature Expand',
        { feature: 'Feature 1' }
      );

      await userEvent.click(learnMoreButtons[1]);
      expect(mockAnalytics().trackEvent).toHaveBeenCalledWith(
        'Feature Expand',
        { feature: 'Feature 2' }
      );
    });
  });

  describe('Testimonials Section', () => {
    it('should render testimonials carousel with proper accessibility', () => {
      renderComponent();
      const carousel = screen.getByRole('region', { name: /customer testimonials/i });
      expect(carousel).toBeInTheDocument();
      expect(within(carousel).getAllByRole('article')).toHaveLength(3);
    });

    it('should navigate through testimonials using next/prev buttons', async () => {
      renderComponent();
      const prevButton = screen.getByRole('button', { name: /previous testimonial/i });
      const nextButton = screen.getByRole('button', { name: /next testimonial/i });

      // Initial state
      expect(screen.getByText(/testimonial 1/i)).toBeVisible();

      // Next button
      await userEvent.click(nextButton);
      expect(screen.getByText(/testimonial 2/i)).toBeVisible();

      // Prev button
      await userEvent.click(prevButton);
      expect(screen.getByText(/testimonial 1/i)).toBeVisible();
    });

    it('should wrap around when reaching the end of testimonials', async () => {
      renderComponent();
      const nextButton = screen.getByRole('button', { name: /next testimonial/i });

      // Go to last testimonial
      await userEvent.click(nextButton);
      await userEvent.click(nextButton);
      expect(screen.getByText(/testimonial 3/i)).toBeVisible();

      // Should wrap to first
      await userEvent.click(nextButton);
      expect(screen.getByText(/testimonial 1/i)).toBeVisible();
    });

    it('should pause auto-rotation on hover', async () => {
      jest.useFakeTimers();
      renderComponent();

      const carousel = screen.getByRole('region', { name: /customer testimonials/i });
      fireEvent.mouseEnter(carousel);
      jest.advanceTimersByTime(5000);
      expect(screen.getByText(/testimonial 1/i)).toBeVisible();

      fireEvent.mouseLeave(carousel);
      jest.advanceTimersByTime(5000);
      expect(screen.getByText(/testimonial 2/i)).toBeVisible();

      jest.useRealTimers();
    });
  });

  describe('Newsletter Signup', () => {
    it('should validate email format before submission', async () => {
      renderComponent();
      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /subscribe/i });

      await userEvent.type(emailInput, 'invalid-email');
      await userEvent.click(submitButton);

      expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
      expect(axios.post).not.toHaveBeenCalled();
    });

    it('should show success message on valid submission', async () => {
      (axios.post as jest.Mock).mockResolvedValue({ data: { success: true } });
      renderComponent();

      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /subscribe/i });

      await userEvent.type(emailInput, 'valid@example.com');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/thank you for subscribing!/i)).toBeInTheDocument();
      });
    });

    it('should show error message when submission fails', async () => {
      (axios.post as jest.Mock).mockRejectedValue(new Error('Network error'));
      renderComponent();

      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /subscribe/i });

      await userEvent.type(emailInput, 'valid@example.com');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/there was an error processing your request/i)).toBeInTheDocument();
      });
    });

    it('should disable submit button during submission', async () => {
      (axios.post as jest.Mock).mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      renderComponent();

      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /subscribe/i });

      await userEvent.type(emailInput, 'valid@example.com');
      await userEvent.click(submitButton);

      expect(submitButton).toBeDisabled();
      expect(screen.getByRole('status')).toBeInTheDocument();

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });
    });
  });

  describe('Authentication States', () => {
    it('should show login button when user is not authenticated', () => {
      mockAuth.mockReturnValue({
        user: null,
        login: jest.fn(),
        logout: jest.fn(),
        isLoading: false,
      });
      renderComponent();
      expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument();
    });

    it('should show user profile when authenticated', () => {
      mockAuth.mockReturnValue({
        user: { name: 'Test User', email: 'test@example.com' },
        login: jest.fn(),
        logout: jest.fn(),
        isLoading: false,
      });
      renderComponent();
      expect(screen.getByText(/welcome, test user/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /log out/i })).toBeInTheDocument();
    });

    it('should show loading skeleton during auth state check', () => {
      mockAuth.mockReturnValue({
        user: null,
        login: jest.fn(),
        logout: jest.fn(),
        isLoading: true,
      });
      renderComponent();
      expect(screen.getByTestId('auth-loading-skeleton')).toBeInTheDocument();
    });
  });

  describe('Accessibility Features', () => {
    it('should have proper ARIA labels for all interactive elements', () => {
      renderComponent();
      expect(screen.getByRole('button', { name: /get started now/i })).toHaveAttribute('aria-label', 'Primary call to action');
      expect(screen.getByRole('button', { name: /learn more/i })).toHaveAttribute('aria-label', 'Expand feature details');
      expect(screen.getByRole('button', { name: /subscribe/i })).toHaveAttribute('aria-label', 'Subscribe to newsletter');
    });

    it('should have proper contrast ratios for text elements', () => {
      renderComponent();
      const heading = screen.getByRole('heading', { name: /welcome to our platform/i });
      expect(heading).toHaveStyle('color: rgb(17, 24, 39)'); // Assuming dark text on light background
    });

    it('should be navigable via keyboard', async () => {
      renderComponent();
      const ctaButton = screen.getByRole('button', { name: /get started now/i });
      const featureButton = screen.getAllByRole('button', { name: /learn more/i })[0];

      // Tab to CTA button
      await userEvent.tab();
      expect(ctaButton).toHaveFocus();

      // Tab to first feature button
      await userEvent.tab();
      expect(featureButton).toHaveFocus();

      // Activate with Enter key
      await userEvent.keyboard('{Enter}');
      expect(screen.getByTestId('feature-details-0')).toBeInTheDocument();
    });

    it('should have proper landmark roles for screen readers', () => {
      renderComponent();
      expect(screen.getByRole('banner')).toBeInTheDocument(); // Header
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByRole('contentinfo')).toBeInTheDocument(); // Footer
      expect(screen.getAllByRole('region')).toHaveLength(3); // Hero, Features, Testimonials
    });
  });

  describe('Error Boundaries', () => {
    it('should show error boundary when component fails to render', () => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
      const OriginalComponent = LandingPage;

      const FailingComponent = () => {
        throw new Error('Test error');
      };

      // Temporarily replace the component
      jest.doMock('./LandingPage', () => ({
        __esModule: true,
        default: FailingComponent,
      }));

      const { rerender } = render(
        <MemoryRouter>
          <FailingComponent />
        </MemoryRouter>
      );

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

      // Restore original component
      jest.doMock('./LandingPage', () => ({
        __esModule: true,
        default: OriginalComponent,
      }));

      rerender(
        <MemoryRouter>
          <OriginalComponent />
        </MemoryRouter>
      );

      jest.restoreAllMocks();
    });
  });

  describe('Responsive Behavior', () => {
    it('should render mobile menu button on small screens', () => {
      global.innerWidth = 600;
      global.dispatchEvent(new Event('resize'));
      renderComponent();
      expect(screen.getByRole('button', { name: /menu/i })).toBeInTheDocument();
    });

    it('should show mobile navigation when menu button is clicked', async () => {
      global.innerWidth = 600;
      global.dispatchEvent(new Event('resize'));
      renderComponent();

      const menuButton = screen.getByRole('button', { name: /menu/i });
      await userEvent.click(menuButton);

      expect(screen.getByRole('navigation')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /home/i })).toBeInTheDocument();
    });
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { MemoryRouter } from 'react-router-dom';
import { LandingPage } from './LandingPage';
import { useAnalytics } from '../hooks/useAnalytics';
import { useAuth } from '../context/AuthContext';

jest.mock('axios');
jest.mock('../hooks/useAnalytics');
jest.mock('../context/AuthContext');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
}));

const mockAnalytics = useAnalytics as jest.MockedFunction<typeof useAnalytics>;
const mockAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockNavigate = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  mockAnalytics.mockReturnValue({
    trackEvent: jest.fn(),
    trackPageView: jest.fn(),
  });
  mockAuth.mockReturnValue({
    user: null,
    login: jest.fn(),
    logout: jest.fn(),
    isLoading: false,
  });
  require('react-router-dom').useNavigate.mockReturnValue(mockNavigate);
});

describe('LandingPage - Core Functionality', () => {
  const renderComponent = () => render(
    <MemoryRouter>
      <LandingPage />
    </MemoryRouter>
  );

  describe('Initial Render', () => {
    it('should render the main heading and primary CTA button', () => {
      renderComponent();
      expect(screen.getByRole('heading', { name: /welcome to our platform/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /get started now/i })).toBeInTheDocument();
    });

    it('should render the hero section with proper accessibility attributes', () => {
      renderComponent();
      const heroSection = screen.getByRole('region', { name: /hero section/i });
      expect(heroSection).toHaveAttribute('aria-labelledby', 'hero-heading');
      expect(within(heroSection).getByRole('heading')).toBeInTheDocument();
    });

    it('should track page view on initial render', () => {
      renderComponent();
      expect(mockAnalytics().trackPageView).toHaveBeenCalledWith('Landing Page');
    });
  });

  describe('Primary CTA Interaction', () => {
    it('should navigate to signup page when CTA button is clicked', async () => {
      renderComponent();
      const ctaButton = screen.getByRole('button', { name: /get started now/i });
      await userEvent.click(ctaButton);
      expect(mockNavigate).toHaveBeenCalledWith('/signup');
    });

    it('should track CTA click event', async () => {
      renderComponent();
      const ctaButton = screen.getByRole('button', { name: /get started now/i });
      await userEvent.click(ctaButton);
      expect(mockAnalytics().trackEvent).toHaveBeenCalledWith(
        'CTA Click',
        { button: 'Primary', location: 'Hero' }
      );
    });

    it('should show loading state during navigation', async () => {
      mockNavigate.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      renderComponent();

      const ctaButton = screen.getByRole('button', { name: /get started now/i });
      userEvent.click(ctaButton);

      expect(screen.getByRole('button', { name: /get started now/i })).toBeDisabled();
      expect(screen.getByRole('status')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
      });
    });
  });

  describe('Feature Cards Section', () => {
    it('should render all feature cards with proper accessibility', () => {
      renderComponent();
      const featureCards = screen.getAllByRole('article');
      expect(featureCards).toHaveLength(3);

      featureCards.forEach(card => {
        expect(within(card).getByRole('heading')).toBeInTheDocument();
        expect(within(card).getByText(/learn more/i)).toBeInTheDocument();
      });
    });

    it('should expand feature card when "Learn More" is clicked', async () => {
      renderComponent();
      const learnMoreButtons = screen.getAllByRole('button', { name: /learn more/i });
      const firstButton = learnMoreButtons[0];

      expect(screen.queryByTestId('feature-details-0')).not.toBeInTheDocument();
      await userEvent.click(firstButton);
      expect(screen.getByTestId('feature-details-0')).toBeInTheDocument();
    });

    it('should collapse expanded feature card when clicked again', async () => {
      renderComponent();
      const learnMoreButtons = screen.getAllByRole('button', { name: /learn more/i });
      const firstButton = learnMoreButtons[0];

      await userEvent.click(firstButton);
      expect(screen.getByTestId('feature-details-0')).toBeInTheDocument();

      await userEvent.click(firstButton);
      expect(screen.queryByTestId('feature-details-0')).not.toBeInTheDocument();
    });

    it('should track feature card expansion events', async () => {
      renderComponent();
      const learnMoreButtons = screen.getAllByRole('button', { name: /learn more/i });

      await userEvent.click(learnMoreButtons[0]);
      expect(mockAnalytics().trackEvent).toHaveBeenCalledWith(
        'Feature Expand',
        { feature: 'Feature 1' }
      );

      await userEvent.click(learnMoreButtons[1]);
      expect(mockAnalytics().trackEvent).toHaveBeenCalledWith(
        'Feature Expand',
        { feature: 'Feature 2' }
      );
    });
  });

  describe('Testimonials Section', () => {
    it('should render testimonials carousel with proper accessibility', () => {
      renderComponent();
      const carousel = screen.getByRole('region', { name: /customer testimonials/i });
      expect(carousel).toBeInTheDocument();
      expect(within(carousel).getAllByRole('article')).toHaveLength(3);
    });

    it('should navigate through testimonials using next/prev buttons', async () => {
      renderComponent();
      const prevButton = screen.getByRole('button', { name: /previous testimonial/i });
      const nextButton = screen.getByRole('button', { name: /next testimonial/i });

      // Initial state
      expect(screen.getByText(/testimonial 1/i)).toBeVisible();

      // Next button
      await userEvent.click(nextButton);
      expect(screen.getByText(/testimonial 2/i)).toBeVisible();

      // Prev button
      await userEvent.click(prevButton);
      expect(screen.getByText(/testimonial 1/i)).toBeVisible();
    });

    it('should wrap around when reaching the end of testimonials', async () => {
      renderComponent();
      const nextButton = screen.getByRole('button', { name: /next testimonial/i });

      // Go to last testimonial
      await userEvent.click(nextButton);
      await userEvent.click(nextButton);
      expect(screen.getByText(/testimonial 3/i)).toBeVisible();

      // Should wrap to first
      await userEvent.click(nextButton);
      expect(screen.getByText(/testimonial 1/i)).toBeVisible();
    });

    it('should pause auto-rotation on hover', async () => {
      jest.useFakeTimers();
      renderComponent();

      const carousel = screen.getByRole('region', { name: /customer testimonials/i });
      fireEvent.mouseEnter(carousel);
      jest.advanceTimersByTime(5000);
      expect(screen.getByText(/testimonial 1/i)).toBeVisible();

      fireEvent.mouseLeave(carousel);
      jest.advanceTimersByTime(5000);
      expect(screen.getByText(/testimonial 2/i)).toBeVisible();

      jest.useRealTimers();
    });
  });

  describe('Newsletter Signup', () => {
    it('should validate email format before submission', async () => {
      renderComponent();
      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /subscribe/i });

      await userEvent.type(emailInput, 'invalid-email');
      await userEvent.click(submitButton);

      expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
      expect(axios.post).not.toHaveBeenCalled();
    });

    it('should show success message on valid submission', async () => {
      (axios.post as jest.Mock).mockResolvedValue({ data: { success: true } });
      renderComponent();

      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /subscribe/i });

      await userEvent.type(emailInput, 'valid@example.com');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/thank you for subscribing!/i)).toBeInTheDocument();
      });
    });

    it('should show error message when submission fails', async () => {
      (axios.post as jest.Mock).mockRejectedValue(new Error('Network error'));
      renderComponent();

      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /subscribe/i });

      await userEvent.type(emailInput, 'valid@example.com');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/there was an error processing your request/i)).toBeInTheDocument();
      });
    });

    it('should disable submit button during submission', async () => {
      (axios.post as jest.Mock).mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      renderComponent();

      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /subscribe/i });

      await userEvent.type(emailInput, 'valid@example.com');
      await userEvent.click(submitButton);

      expect(submitButton).toBeDisabled();
      expect(screen.getByRole('status')).toBeInTheDocument();

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });
    });
  });

  describe('Authentication States', () => {
    it('should show login button when user is not authenticated', () => {
      mockAuth.mockReturnValue({
        user: null,
        login: jest.fn(),
        logout: jest.fn(),
        isLoading: false,
      });
      renderComponent();
      expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument();
    });

    it('should show user profile when authenticated', () => {
      mockAuth.mockReturnValue({
        user: { name: 'Test User', email: 'test@example.com' },
        login: jest.fn(),
        logout: jest.fn(),
        isLoading: false,
      });
      renderComponent();
      expect(screen.getByText(/welcome, test user/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /log out/i })).toBeInTheDocument();
    });

    it('should show loading skeleton during auth state check', () => {
      mockAuth.mockReturnValue({
        user: null,
        login: jest.fn(),
        logout: jest.fn(),
        isLoading: true,
      });
      renderComponent();
      expect(screen.getByTestId('auth-loading-skeleton')).toBeInTheDocument();
    });
  });

  describe('Accessibility Features', () => {
    it('should have proper ARIA labels for all interactive elements', () => {
      renderComponent();
      expect(screen.getByRole('button', { name: /get started now/i })).toHaveAttribute('aria-label', 'Primary call to action');
      expect(screen.getByRole('button', { name: /learn more/i })).toHaveAttribute('aria-label', 'Expand feature details');
      expect(screen.getByRole('button', { name: /subscribe/i })).toHaveAttribute('aria-label', 'Subscribe to newsletter');
    });

    it('should have proper contrast ratios for text elements', () => {
      renderComponent();
      const heading = screen.getByRole('heading', { name: /welcome to our platform/i });
      expect(heading).toHaveStyle('color: rgb(17, 24, 39)'); // Assuming dark text on light background
    });

    it('should be navigable via keyboard', async () => {
      renderComponent();
      const ctaButton = screen.getByRole('button', { name: /get started now/i });
      const featureButton = screen.getAllByRole('button', { name: /learn more/i })[0];

      // Tab to CTA button
      await userEvent.tab();
      expect(ctaButton).toHaveFocus();

      // Tab to first feature button
      await userEvent.tab();
      expect(featureButton).toHaveFocus();

      // Activate with Enter key
      await userEvent.keyboard('{Enter}');
      expect(screen.getByTestId('feature-details-0')).toBeInTheDocument();
    });

    it('should have proper landmark roles for screen readers', () => {
      renderComponent();
      expect(screen.getByRole('banner')).toBeInTheDocument(); // Header
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByRole('contentinfo')).toBeInTheDocument(); // Footer
      expect(screen.getAllByRole('region')).toHaveLength(3); // Hero, Features, Testimonials
    });
  });

  describe('Error Boundaries', () => {
    it('should show error boundary when component fails to render', () => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
      const OriginalComponent = LandingPage;

      const FailingComponent = () => {
        throw new Error('Test error');
      };

      // Temporarily replace the component
      jest.doMock('./LandingPage', () => ({
        __esModule: true,
        default: FailingComponent,
      }));

      const { rerender } = render(
        <MemoryRouter>
          <FailingComponent />
        </MemoryRouter>
      );

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

      // Restore original component
      jest.doMock('./LandingPage', () => ({
        __esModule: true,
        default: OriginalComponent,
      }));

      rerender(
        <MemoryRouter>
          <OriginalComponent />
        </MemoryRouter>
      );

      jest.restoreAllMocks();
    });
  });

  describe('Responsive Behavior', () => {
    it('should render mobile menu button on small screens', () => {
      global.innerWidth = 600;
      global.dispatchEvent(new Event('resize'));
      renderComponent();
      expect(screen.getByRole('button', { name: /menu/i })).toBeInTheDocument();
    });

    it('should show mobile navigation when menu button is clicked', async () => {
      global.innerWidth = 600;
      global.dispatchEvent(new Event('resize'));
      renderComponent();

      const menuButton = screen.getByRole('button', { name: /menu/i });
      await userEvent.click(menuButton);

      expect(screen.getByRole('navigation')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /home/i })).toBeInTheDocument();
    });
  });
});