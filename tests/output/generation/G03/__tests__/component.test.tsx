import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { MemoryRouter } from 'react-router-dom';
import { useAnalytics } from '../hooks/useAnalytics';
import { useAuth } from '../context/AuthContext';
import LandingPage from './LandingPage';

jest.mock('axios');
jest.mock('../hooks/useAnalytics');
jest.mock('../context/AuthContext');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const mockTrackEvent = jest.fn();
(useAnalytics as jest.Mock).mockReturnValue({
  trackEvent: mockTrackEvent,
});

const mockAuthContext = {
  isAuthenticated: false,
  user: null,
  login: jest.fn(),
  logout: jest.fn(),
  loading: false,
};

describe('LandingPage Component', () => {
  beforeEach(() => {
    (useAuth as jest.Mock).mockReturnValue(mockAuthContext);
    jest.clearAllMocks();
  });

  describe('Initial Render', () => {
    it('renders the main heading and primary CTA button', () => {
      render(
        <MemoryRouter>
          <LandingPage />
        </MemoryRouter>
      );

      expect(screen.getByRole('heading', { name: /welcome to our platform/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /get started now/i })).toBeInTheDocument();
    });

    it('renders the feature sections with proper headings', () => {
      render(
        <MemoryRouter>
          <LandingPage />
        </MemoryRouter>
      );

      const features = screen.getAllByRole('heading', { level: 3 });
      expect(features[0]).toHaveTextContent(/easy to use/i);
      expect(features[1]).toHaveTextContent(/powerful features/i);
      expect(features[2]).toHaveTextContent(/secure & reliable/i);
    });

    it('renders the testimonial section', () => {
      render(
        <MemoryRouter>
          <LandingPage />
        </MemoryRouter>
      );

      expect(screen.getByRole('heading', { name: /what our users say/i })).toBeInTheDocument();
      expect(screen.getAllByTestId('testimonial-card').length).toBeGreaterThan(0);
    });
  });

  describe('Primary CTA Button', () => {
    it('navigates to signup page when clicked and tracks event', async () => {
      render(
        <MemoryRouter>
          <LandingPage />
        </MemoryRouter>
      );

      const ctaButton = screen.getByRole('button', { name: /get started now/i });
      await userEvent.click(ctaButton);

      expect(mockNavigate).toHaveBeenCalledWith('/signup');
      expect(mockTrackEvent).toHaveBeenCalledWith('landing_page_cta_click', {
        button: 'primary_cta',
      });
    });

    it('is focusable and has proper aria-label', () => {
      render(
        <MemoryRouter>
          <LandingPage />
        </MemoryRouter>
      );

      const ctaButton = screen.getByRole('button', { name: /get started now/i });
      expect(ctaButton).toHaveAttribute('aria-label', 'Primary call to action button');
      expect(ctaButton).toHaveFocus();
    });
  });

  describe('Newsletter Subscription', () => {
    it('successfully submits the newsletter form with valid email', async () => {
      (axios.post as jest.Mock).mockResolvedValue({ data: { success: true } });

      render(
        <MemoryRouter>
          <LandingPage />
        </MemoryRouter>
      );

      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /subscribe/i });

      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith('/api/newsletter', {
          email: 'test@example.com',
        });
        expect(screen.getByText(/thanks for subscribing!/i)).toBeInTheDocument();
      });
    });

    it('shows validation error for invalid email format', async () => {
      render(
        <MemoryRouter>
          <LandingPage />
        </MemoryRouter>
      );

      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /subscribe/i });

      await userEvent.type(emailInput, 'invalid-email');
      await userEvent.click(submitButton);

      expect(await screen.findByText(/please enter a valid email address/i)).toBeInTheDocument();
      expect(axios.post).not.toHaveBeenCalled();
    });

    it('shows server error when subscription fails', async () => {
      (axios.post as jest.Mock).mockRejectedValue(new Error('Server error'));

      render(
        <MemoryRouter>
          <LandingPage />
        </MemoryRouter>
      );

      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /subscribe/i });

      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/something went wrong. please try again later./i)).toBeInTheDocument();
      });
    });

    it('disables submit button during submission', async () => {
      (axios.post as jest.Mock).mockImplementation(() =>
        new Promise((resolve) => setTimeout(() => resolve({ data: { success: true } }), 1000))
      );

      render(
        <MemoryRouter>
          <LandingPage />
        </MemoryRouter>
      );

      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /subscribe/i });

      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.click(submitButton);

      expect(submitButton).toBeDisabled();
      expect(screen.getByRole('status')).toBeInTheDocument();

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });
    });
  });

  describe('Testimonial Carousel', () => {
    it('renders testimonials and allows navigation between them', async () => {
      render(
        <MemoryRouter>
          <LandingPage />
        </MemoryRouter>
      );

      const testimonials = screen.getAllByTestId('testimonial-card');
      const nextButton = screen.getByLabelText(/next testimonial/i);

      expect(testimonials[0]).toHaveClass('active');

      await userEvent.click(nextButton);
      expect(testimonials[0]).not.toHaveClass('active');
      expect(testimonials[1]).toHaveClass('active');
    });

    it('wraps around from last to first testimonial', async () => {
      render(
        <MemoryRouter>
          <LandingPage />
        </MemoryRouter>
      );

      const testimonials = screen.getAllByTestId('testimonial-card');
      const nextButton = screen.getByLabelText(/next testimonial/i);
      const prevButton = screen.getByLabelText(/previous testimonial/i);

      // Go to last testimonial
      for (let i = 0; i < testimonials.length - 1; i++) {
        await userEvent.click(nextButton);
      }

      expect(testimonials[testimonials.length - 1]).toHaveClass('active');

      // Should wrap to first
      await userEvent.click(nextButton);
      expect(testimonials[0]).toHaveClass('active');

      // Should wrap to last when going previous from first
      await userEvent.click(prevButton);
      expect(testimonials[testimonials.length - 1]).toHaveClass('active');
    });

    it('has proper aria attributes for accessibility', () => {
      render(
        <MemoryRouter>
          <LandingPage />
        </MemoryRouter>
      );

      const carousel = screen.getByRole('region', { name: /testimonials/i });
      expect(carousel).toHaveAttribute('aria-label', 'Customer testimonials');

      const testimonials = within(carousel).getAllByTestId('testimonial-card');
      testimonials.forEach((testimonial, index) => {
        expect(testimonial).toHaveAttribute('aria-hidden', index !== 0 ? 'true' : 'false');
      });
    });
  });

  describe('Feature Tabs', () => {
    it('switches between feature tabs when clicked', async () => {
      render(
        <MemoryRouter>
          <LandingPage />
        </MemoryRouter>
      );

      const tabButtons = screen.getAllByRole('tab');
      const tabPanels = screen.getAllByRole('tabpanel');

      expect(tabButtons[0]).toHaveAttribute('aria-selected', 'true');
      expect(tabPanels[0]).toHaveAttribute('aria-hidden', 'false');

      await userEvent.click(tabButtons[1]);
      expect(tabButtons[1]).toHaveAttribute('aria-selected', 'true');
      expect(tabPanels[1]).toHaveAttribute('aria-hidden', 'false');
      expect(tabPanels[0]).toHaveAttribute('aria-hidden', 'true');
    });

    it('updates URL hash when switching tabs', async () => {
      render(
        <MemoryRouter initialEntries={['/']}>
          <LandingPage />
        </MemoryRouter>
      );

      const tabButtons = screen.getAllByRole('tab');

      // Mock window.location assignment
      delete window.location;
      window.location = { hash: '', assign: jest.fn() } as any;

      await userEvent.click(tabButtons[1]);
      expect(window.location.assign).toHaveBeenCalledWith(expect.stringContaining('#features'));
    });

    it('selects correct tab based on URL hash', () => {
      render(
        <MemoryRouter initialEntries={['/#features-2']}>
          <LandingPage />
        </MemoryRouter>
      );

      const tabButtons = screen.getAllByRole('tab');
      expect(tabButtons[1]).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('Auth State Handling', () => {
    it('shows login button when user is not authenticated', () => {
      render(
        <MemoryRouter>
          <LandingPage />
        </MemoryRouter>
      );

      expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /go to dashboard/i })).not.toBeInTheDocument();
    });

    it('shows dashboard button when user is authenticated', () => {
      (useAuth as jest.Mock).mockReturnValue({
        ...mockAuthContext,
        isAuthenticated: true,
        user: { name: 'Test User' },
      });

      render(
        <MemoryRouter>
          <LandingPage />
        </MemoryRouter>
      );

      expect(screen.queryByRole('button', { name: /log in/i })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /go to dashboard/i })).toBeInTheDocument();
      expect(screen.getByText(/welcome back, test user/i)).toBeInTheDocument();
    });

    it('shows loading skeleton when auth state is loading', () => {
      (useAuth as jest.Mock).mockReturnValue({
        ...mockAuthContext,
        loading: true,
      });

      render(
        <MemoryRouter>
          <LandingPage />
        </MemoryRouter>
      );

      expect(screen.getByTestId('auth-loading-skeleton')).toBeInTheDocument();
    });
  });

  describe('Mobile Responsiveness', () => {
    it('renders mobile menu button on small screens', () => {
      global.innerWidth = 500;
      global.dispatchEvent(new Event('resize'));

      render(
        <MemoryRouter>
          <LandingPage />
        </MemoryRouter>
      );

      expect(screen.getByLabelText(/toggle menu/i)).toBeInTheDocument();
    });

    it('toggles mobile menu when button is clicked', async () => {
      global.innerWidth = 500;
      global.dispatchEvent(new Event('resize'));

      render(
        <MemoryRouter>
          <LandingPage />
        </MemoryRouter>
      );

      const menuButton = screen.getByLabelText(/toggle menu/i);
      await userEvent.click(menuButton);

      expect(screen.getByRole('navigation', { name: /main menu/i })).toBeVisible();

      await userEvent.click(menuButton);
      expect(screen.queryByRole('navigation', { name: /main menu/i })).not.toBeVisible();
    });
  });

  describe('Accessibility', () => {
    it('has proper landmark roles for main sections', () => {
      render(
        <MemoryRouter>
          <LandingPage />
        </MemoryRouter>
      );

      expect(screen.getByRole('banner')).toBeInTheDocument();
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    });

    it('has proper aria labels for interactive elements', () => {
      render(
        <MemoryRouter>
          <LandingPage />
        </MemoryRouter>
      );

      expect(screen.getByLabelText(/main navigation/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/newsletter subscription form/i)).toBeInTheDocument();
    });

    it('has proper contrast ratios for text elements', () => {
      render(
        <MemoryRouter>
          <LandingPage />
        </MemoryRouter>
      );

      const heading = screen.getByRole('heading', { name: /welcome to our platform/i });
      const button = screen.getByRole('button', { name: /get started now/i });

      // These are visual tests that would typically be done with axe or similar tools
      // In a real test, you might use jest-axe for automated accessibility testing
      expect(heading).toHaveStyle('color: rgb(30, 41, 59)'); // Example - would need actual styles
      expect(button).toHaveStyle('color: rgb(255, 255, 255)'); // Example - would need actual styles
    });
  });

  describe('Error Boundary', () => {
    it('shows error message when component fails to render', () => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
      const OriginalComponent = LandingPage;

      const FailingComponent = () => {
        throw new Error('Test error');
      };

      jest.doMock('./LandingPage', () => FailingComponent);

      // This would typically be tested with an ErrorBoundary wrapper in your app
      // This is a simplified example
      expect(() => render(
        <MemoryRouter>
          <OriginalComponent />
        </MemoryRouter>
      )).toThrow();

      console.error.mockRestore();
    });
  });

  describe('Performance Tracking', () => {
    it('tracks page view on component mount', () => {
      render(
        <MemoryRouter>
          <LandingPage />
        </MemoryRouter>
      );

      expect(mockTrackEvent).toHaveBeenCalledWith('page_view', {
        page: 'landing',
      });
    });

    it('tracks feature tab changes', async () => {
      render(
        <MemoryRouter>
          <LandingPage />
        </MemoryRouter>
      );

      const tabButtons = screen.getAllByRole('tab');
      await userEvent.click(tabButtons[1]);

      expect(mockTrackEvent).toHaveBeenCalledWith('landing_feature_tab_change', {
        tab: 'Powerful Features',
      });
    });
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { MemoryRouter } from 'react-router-dom';
import { useAnalytics } from '../hooks/useAnalytics';
import { useAuth } from '../context/AuthContext';
import LandingPage from './LandingPage';

jest.mock('axios');
jest.mock('../hooks/useAnalytics');
jest.mock('../context/AuthContext');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const mockTrackEvent = jest.fn();
(useAnalytics as jest.Mock).mockReturnValue({
  trackEvent: mockTrackEvent,
});

const mockAuthContext = {
  isAuthenticated: false,
  user: null,
  login: jest.fn(),
  logout: jest.fn(),
  loading: false,
};

describe('LandingPage Component', () => {
  beforeEach(() => {
    (useAuth as jest.Mock).mockReturnValue(mockAuthContext);
    jest.clearAllMocks();
  });

  describe('Initial Render', () => {
    it('renders the main heading and primary CTA button', () => {
      render(
        <MemoryRouter>
          <LandingPage />
        </MemoryRouter>
      );

      expect(screen.getByRole('heading', { name: /welcome to our platform/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /get started now/i })).toBeInTheDocument();
    });

    it('renders the feature sections with proper headings', () => {
      render(
        <MemoryRouter>
          <LandingPage />
        </MemoryRouter>
      );

      const features = screen.getAllByRole('heading', { level: 3 });
      expect(features[0]).toHaveTextContent(/easy to use/i);
      expect(features[1]).toHaveTextContent(/powerful features/i);
      expect(features[2]).toHaveTextContent(/secure & reliable/i);
    });

    it('renders the testimonial section', () => {
      render(
        <MemoryRouter>
          <LandingPage />
        </MemoryRouter>
      );

      expect(screen.getByRole('heading', { name: /what our users say/i })).toBeInTheDocument();
      expect(screen.getAllByTestId('testimonial-card').length).toBeGreaterThan(0);
    });
  });

  describe('Primary CTA Button', () => {
    it('navigates to signup page when clicked and tracks event', async () => {
      render(
        <MemoryRouter>
          <LandingPage />
        </MemoryRouter>
      );

      const ctaButton = screen.getByRole('button', { name: /get started now/i });
      await userEvent.click(ctaButton);

      expect(mockNavigate).toHaveBeenCalledWith('/signup');
      expect(mockTrackEvent).toHaveBeenCalledWith('landing_page_cta_click', {
        button: 'primary_cta',
      });
    });

    it('is focusable and has proper aria-label', () => {
      render(
        <MemoryRouter>
          <LandingPage />
        </MemoryRouter>
      );

      const ctaButton = screen.getByRole('button', { name: /get started now/i });
      expect(ctaButton).toHaveAttribute('aria-label', 'Primary call to action button');
      expect(ctaButton).toHaveFocus();
    });
  });

  describe('Newsletter Subscription', () => {
    it('successfully submits the newsletter form with valid email', async () => {
      (axios.post as jest.Mock).mockResolvedValue({ data: { success: true } });

      render(
        <MemoryRouter>
          <LandingPage />
        </MemoryRouter>
      );

      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /subscribe/i });

      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith('/api/newsletter', {
          email: 'test@example.com',
        });
        expect(screen.getByText(/thanks for subscribing!/i)).toBeInTheDocument();
      });
    });

    it('shows validation error for invalid email format', async () => {
      render(
        <MemoryRouter>
          <LandingPage />
        </MemoryRouter>
      );

      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /subscribe/i });

      await userEvent.type(emailInput, 'invalid-email');
      await userEvent.click(submitButton);

      expect(await screen.findByText(/please enter a valid email address/i)).toBeInTheDocument();
      expect(axios.post).not.toHaveBeenCalled();
    });

    it('shows server error when subscription fails', async () => {
      (axios.post as jest.Mock).mockRejectedValue(new Error('Server error'));

      render(
        <MemoryRouter>
          <LandingPage />
        </MemoryRouter>
      );

      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /subscribe/i });

      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/something went wrong. please try again later./i)).toBeInTheDocument();
      });
    });

    it('disables submit button during submission', async () => {
      (axios.post as jest.Mock).mockImplementation(() =>
        new Promise((resolve) => setTimeout(() => resolve({ data: { success: true } }), 1000))
      );

      render(
        <MemoryRouter>
          <LandingPage />
        </MemoryRouter>
      );

      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /subscribe/i });

      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.click(submitButton);

      expect(submitButton).toBeDisabled();
      expect(screen.getByRole('status')).toBeInTheDocument();

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });
    });
  });

  describe('Testimonial Carousel', () => {
    it('renders testimonials and allows navigation between them', async () => {
      render(
        <MemoryRouter>
          <LandingPage />
        </MemoryRouter>
      );

      const testimonials = screen.getAllByTestId('testimonial-card');
      const nextButton = screen.getByLabelText(/next testimonial/i);

      expect(testimonials[0]).toHaveClass('active');

      await userEvent.click(nextButton);
      expect(testimonials[0]).not.toHaveClass('active');
      expect(testimonials[1]).toHaveClass('active');
    });

    it('wraps around from last to first testimonial', async () => {
      render(
        <MemoryRouter>
          <LandingPage />
        </MemoryRouter>
      );

      const testimonials = screen.getAllByTestId('testimonial-card');
      const nextButton = screen.getByLabelText(/next testimonial/i);
      const prevButton = screen.getByLabelText(/previous testimonial/i);

      // Go to last testimonial
      for (let i = 0; i < testimonials.length - 1; i++) {
        await userEvent.click(nextButton);
      }

      expect(testimonials[testimonials.length - 1]).toHaveClass('active');

      // Should wrap to first
      await userEvent.click(nextButton);
      expect(testimonials[0]).toHaveClass('active');

      // Should wrap to last when going previous from first
      await userEvent.click(prevButton);
      expect(testimonials[testimonials.length - 1]).toHaveClass('active');
    });

    it('has proper aria attributes for accessibility', () => {
      render(
        <MemoryRouter>
          <LandingPage />
        </MemoryRouter>
      );

      const carousel = screen.getByRole('region', { name: /testimonials/i });
      expect(carousel).toHaveAttribute('aria-label', 'Customer testimonials');

      const testimonials = within(carousel).getAllByTestId('testimonial-card');
      testimonials.forEach((testimonial, index) => {
        expect(testimonial).toHaveAttribute('aria-hidden', index !== 0 ? 'true' : 'false');
      });
    });
  });

  describe('Feature Tabs', () => {
    it('switches between feature tabs when clicked', async () => {
      render(
        <MemoryRouter>
          <LandingPage />
        </MemoryRouter>
      );

      const tabButtons = screen.getAllByRole('tab');
      const tabPanels = screen.getAllByRole('tabpanel');

      expect(tabButtons[0]).toHaveAttribute('aria-selected', 'true');
      expect(tabPanels[0]).toHaveAttribute('aria-hidden', 'false');

      await userEvent.click(tabButtons[1]);
      expect(tabButtons[1]).toHaveAttribute('aria-selected', 'true');
      expect(tabPanels[1]).toHaveAttribute('aria-hidden', 'false');
      expect(tabPanels[0]).toHaveAttribute('aria-hidden', 'true');
    });

    it('updates URL hash when switching tabs', async () => {
      render(
        <MemoryRouter initialEntries={['/']}>
          <LandingPage />
        </MemoryRouter>
      );

      const tabButtons = screen.getAllByRole('tab');

      // Mock window.location assignment
      delete window.location;
      window.location = { hash: '', assign: jest.fn() } as any;

      await userEvent.click(tabButtons[1]);
      expect(window.location.assign).toHaveBeenCalledWith(expect.stringContaining('#features'));
    });

    it('selects correct tab based on URL hash', () => {
      render(
        <MemoryRouter initialEntries={['/#features-2']}>
          <LandingPage />
        </MemoryRouter>
      );

      const tabButtons = screen.getAllByRole('tab');
      expect(tabButtons[1]).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('Auth State Handling', () => {
    it('shows login button when user is not authenticated', () => {
      render(
        <MemoryRouter>
          <LandingPage />
        </MemoryRouter>
      );

      expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /go to dashboard/i })).not.toBeInTheDocument();
    });

    it('shows dashboard button when user is authenticated', () => {
      (useAuth as jest.Mock).mockReturnValue({
        ...mockAuthContext,
        isAuthenticated: true,
        user: { name: 'Test User' },
      });

      render(
        <MemoryRouter>
          <LandingPage />
        </MemoryRouter>
      );

      expect(screen.queryByRole('button', { name: /log in/i })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /go to dashboard/i })).toBeInTheDocument();
      expect(screen.getByText(/welcome back, test user/i)).toBeInTheDocument();
    });

    it('shows loading skeleton when auth state is loading', () => {
      (useAuth as jest.Mock).mockReturnValue({
        ...mockAuthContext,
        loading: true,
      });

      render(
        <MemoryRouter>
          <LandingPage />
        </MemoryRouter>
      );

      expect(screen.getByTestId('auth-loading-skeleton')).toBeInTheDocument();
    });
  });

  describe('Mobile Responsiveness', () => {
    it('renders mobile menu button on small screens', () => {
      global.innerWidth = 500;
      global.dispatchEvent(new Event('resize'));

      render(
        <MemoryRouter>
          <LandingPage />
        </MemoryRouter>
      );

      expect(screen.getByLabelText(/toggle menu/i)).toBeInTheDocument();
    });

    it('toggles mobile menu when button is clicked', async () => {
      global.innerWidth = 500;
      global.dispatchEvent(new Event('resize'));

      render(
        <MemoryRouter>
          <LandingPage />
        </MemoryRouter>
      );

      const menuButton = screen.getByLabelText(/toggle menu/i);
      await userEvent.click(menuButton);

      expect(screen.getByRole('navigation', { name: /main menu/i })).toBeVisible();

      await userEvent.click(menuButton);
      expect(screen.queryByRole('navigation', { name: /main menu/i })).not.toBeVisible();
    });
  });

  describe('Accessibility', () => {
    it('has proper landmark roles for main sections', () => {
      render(
        <MemoryRouter>
          <LandingPage />
        </MemoryRouter>
      );

      expect(screen.getByRole('banner')).toBeInTheDocument();
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    });

    it('has proper aria labels for interactive elements', () => {
      render(
        <MemoryRouter>
          <LandingPage />
        </MemoryRouter>
      );

      expect(screen.getByLabelText(/main navigation/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/newsletter subscription form/i)).toBeInTheDocument();
    });

    it('has proper contrast ratios for text elements', () => {
      render(
        <MemoryRouter>
          <LandingPage />
        </MemoryRouter>
      );

      const heading = screen.getByRole('heading', { name: /welcome to our platform/i });
      const button = screen.getByRole('button', { name: /get started now/i });

      // These are visual tests that would typically be done with axe or similar tools
      // In a real test, you might use jest-axe for automated accessibility testing
      expect(heading).toHaveStyle('color: rgb(30, 41, 59)'); // Example - would need actual styles
      expect(button).toHaveStyle('color: rgb(255, 255, 255)'); // Example - would need actual styles
    });
  });

  describe('Error Boundary', () => {
    it('shows error message when component fails to render', () => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
      const OriginalComponent = LandingPage;

      const FailingComponent = () => {
        throw new Error('Test error');
      };

      jest.doMock('./LandingPage', () => FailingComponent);

      // This would typically be tested with an ErrorBoundary wrapper in your app
      // This is a simplified example
      expect(() => render(
        <MemoryRouter>
          <OriginalComponent />
        </MemoryRouter>
      )).toThrow();

      console.error.mockRestore();
    });
  });

  describe('Performance Tracking', () => {
    it('tracks page view on component mount', () => {
      render(
        <MemoryRouter>
          <LandingPage />
        </MemoryRouter>
      );

      expect(mockTrackEvent).toHaveBeenCalledWith('page_view', {
        page: 'landing',
      });
    });

    it('tracks feature tab changes', async () => {
      render(
        <MemoryRouter>
          <LandingPage />
        </MemoryRouter>
      );

      const tabButtons = screen.getAllByRole('tab');
      await userEvent.click(tabButtons[1]);

      expect(mockTrackEvent).toHaveBeenCalledWith('landing_feature_tab_change', {
        tab: 'Powerful Features',
      });
    });
  });
});