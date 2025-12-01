import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { useRouter } from 'next/router';
import LandingPage from '../components/LandingPage';
import { AnalyticsProvider } from '../context/AnalyticsContext';

jest.mock('axios');
jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));

const mockPush = jest.fn();
(useRouter as jest.Mock).mockImplementation(() => ({
  push: mockPush,
  query: {},
}));

const mockAnalytics = {
  trackEvent: jest.fn(),
  trackPageView: jest.fn(),
};

const renderComponent = () => {
  return render(
    <AnalyticsProvider value={mockAnalytics}>
      <LandingPage />
    </AnalyticsProvider>
  );
};

describe('LandingPage - Core Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Render', () => {
    it('should render the main heading and primary CTA button', () => {
      renderComponent();
      expect(screen.getByRole('heading', { name: /welcome to our platform/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /get started now/i })).toBeInTheDocument();
    });

    it('should render the hero section with proper accessibility attributes', () => {
      renderComponent();
      const heroSection = screen.getByRole('region', { name: /hero section/i });
      expect(heroSection).toBeInTheDocument();
      expect(heroSection).toHaveAttribute('aria-labelledby', 'hero-heading');
    });

    it('should track page view on initial load', () => {
      renderComponent();
      expect(mockAnalytics.trackPageView).toHaveBeenCalledWith('Landing Page');
    });
  });

  describe('Primary CTA Interaction', () => {
    it('should navigate to signup page when primary CTA is clicked', async () => {
      renderComponent();
      const ctaButton = screen.getByRole('button', { name: /get started now/i });
      await userEvent.click(ctaButton);
      expect(mockPush).toHaveBeenCalledWith('/signup');
      expect(mockAnalytics.trackEvent).toHaveBeenCalledWith('CTA Click', { button: 'Primary' });
    });

    it('should show loading state during navigation', async () => {
      renderComponent();
      const ctaButton = screen.getByRole('button', { name: /get started now/i });

      // Mock delayed navigation
      mockPush.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      await userEvent.click(ctaButton);

      expect(screen.getByRole('button', { name: /loading/i })).toBeInTheDocument();
      expect(ctaButton).toBeDisabled();

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /loading/i })).not.toBeInTheDocument();
      });
    });
  });

  describe('Feature Cards Section', () => {
    it('should render all feature cards with proper content', () => {
      renderComponent();
      const featureCards = screen.getAllByRole('article');
      expect(featureCards).toHaveLength(3);

      const features = [
        /real-time analytics/i,
        /customizable dashboard/i,
        /seamless integration/i
      ];

      features.forEach((feature, index) => {
        expect(within(featureCards[index]).getByRole('heading')).toHaveTextContent(feature);
      });
    });

    it('should show feature details when "Learn More" is clicked', async () => {
      renderComponent();
      const learnMoreButtons = screen.getAllByRole('button', { name: /learn more/i });
      const firstFeatureCard = screen.getAllByRole('article')[0];

      expect(within(firstFeatureCard).queryByText(/detailed description/i)).not.toBeInTheDocument();

      await userEvent.click(learnMoreButtons[0]);

      expect(within(firstFeatureCard).getByText(/detailed description/i)).toBeInTheDocument();
      expect(mockAnalytics.trackEvent).toHaveBeenCalledWith('Feature Expand', { feature: 'Real-time Analytics' });
    });

    it('should collapse feature details when clicked again', async () => {
      renderComponent();
      const learnMoreButtons = screen.getAllByRole('button', { name: /learn more/i });
      const firstFeatureCard = screen.getAllByRole('article')[0];

      await userEvent.click(learnMoreButtons[0]);
      expect(within(firstFeatureCard).getByText(/detailed description/i)).toBeInTheDocument();

      await userEvent.click(learnMoreButtons[0]);
      expect(within(firstFeatureCard).queryByText(/detailed description/i)).not.toBeInTheDocument();
    });
  });

  describe('Testimonials Section', () => {
    it('should render testimonials with proper accessibility', () => {
      renderComponent();
      const testimonials = screen.getAllByRole('article', { name: /testimonial/i });
      expect(testimonials).toHaveLength(3);

      testimonials.forEach(testimonial => {
        expect(testimonial).toHaveAttribute('aria-labelledby');
        expect(within(testimonial).getByRole('heading')).toBeInTheDocument();
        expect(within(testimonial).getByText(/★★★★★/i)).toBeInTheDocument();
      });
    });

    it('should cycle through testimonials automatically', async () => {
      jest.useFakeTimers();
      renderComponent();

      const firstTestimonial = screen.getByText(/john doe/i);
      expect(firstTestimonial).toBeVisible();

      // Advance timers by 5 seconds (assuming 5s interval)
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(screen.queryByText(/john doe/i)).not.toBeVisible();
        expect(screen.getByText(/jane smith/i)).toBeVisible();
      });

      jest.useRealTimers();
    });

    it('should allow manual navigation between testimonials', async () => {
      renderComponent();
      const nextButton = screen.getByRole('button', { name: /next testimonial/i });

      expect(screen.getByText(/john doe/i)).toBeVisible();

      await userEvent.click(nextButton);
      expect(screen.getByText(/jane smith/i)).toBeVisible();

      await userEvent.click(nextButton);
      expect(screen.getByText(/michael johnson/i)).toBeVisible();

      // Test wrap-around
      await userEvent.click(nextButton);
      expect(screen.getByText(/john doe/i)).toBeVisible();
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

      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/thank you for subscribing!/i)).toBeInTheDocument();
      });
      expect(axios.post).toHaveBeenCalledWith('/api/newsletter', { email: 'test@example.com' });
      expect(mockAnalytics.trackEvent).toHaveBeenCalledWith('Newsletter Signup', { status: 'Success' });
    });

    it('should handle submission errors gracefully', async () => {
      (axios.post as jest.Mock).mockRejectedValue(new Error('Network Error'));
      renderComponent();

      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /subscribe/i });

      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/there was an error processing your request/i)).toBeInTheDocument();
      });
      expect(mockAnalytics.trackEvent).toHaveBeenCalledWith('Newsletter Signup', { status: 'Error' });
    });

    it('should show loading state during submission', async () => {
      (axios.post as jest.Mock).mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ data: { success: true } }), 100)));
      renderComponent();

      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /subscribe/i });

      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.click(submitButton);

      expect(screen.getByRole('button', { name: /submitting/i })).toBeInTheDocument();
      expect(submitButton).toBeDisabled();

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /submitting/i })).not.toBeInTheDocument();
      });
    });
  });

  describe('Accessibility Features', () => {
    it('should have proper ARIA labels for interactive elements', () => {
      renderComponent();
      expect(screen.getByRole('button', { name: /get started now/i })).toHaveAttribute('aria-label', 'Get started with our platform');
      expect(screen.getByRole('button', { name: /next testimonial/i })).toHaveAttribute('aria-label', 'Next testimonial');
      expect(screen.getByRole('button', { name: /previous testimonial/i })).toHaveAttribute('aria-label', 'Previous testimonial');
    });

    it('should have proper contrast ratios for text elements', () => {
      renderComponent();
      const heading = screen.getByRole('heading', { name: /welcome to our platform/i });
      const button = screen.getByRole('button', { name: /get started now/i });

      // These are visual tests that would typically be handled by axe or similar tools
      // In a real implementation, you might use jest-axe here
      expect(heading).toHaveStyle('color: #2D3748'); // Example - would need actual color values
      expect(button).toHaveStyle('background-color: #4299E1'); // Example - would need actual color values
    });

    it('should be navigable via keyboard', async () => {
      renderComponent();
      const ctaButton = screen.getByRole('button', { name: /get started now/i });
      const emailInput = screen.getByLabelText(/email address/i);

      // Tab to CTA button
      await userEvent.tab();
      expect(ctaButton).toHaveFocus();

      // Activate with Enter
      await userEvent.type(ctaButton, '{enter}');
      expect(mockPush).toHaveBeenCalledWith('/signup');

      // Tab to email input
      await userEvent.tab();
      expect(emailInput).toHaveFocus();

      // Type in email input
      await userEvent.keyboard('test@example.com');
      expect(emailInput).toHaveValue('test@example.com');
    });

    it('should have proper landmark roles for main sections', () => {
      renderComponent();
      expect(screen.getByRole('banner')).toBeInTheDocument();
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByRole('region', { name: /features/i })).toBeInTheDocument();
      expect(screen.getByRole('region', { name: /testimonials/i })).toBeInTheDocument();
      expect(screen.getByRole('region', { name: /newsletter/i })).toBeInTheDocument();
    });
  });

  describe('Error Boundary Testing', () => {
    it('should show error message when component fails to render', () => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
      const OriginalComponent = LandingPage;

      // Create a version that throws
      const FailingComponent = () => {
        throw new Error('Test error');
        return <OriginalComponent />;
      };

      // This would typically be handled by an ErrorBoundary in your app
      // For testing purposes, we're simulating the error state
      const { container } = render(
        <AnalyticsProvider value={mockAnalytics}>
          <FailingComponent />
        </AnalyticsProvider>
      );

      expect(container).toHaveTextContent(/something went wrong/i);
      expect(mockAnalytics.trackEvent).toHaveBeenCalledWith('Render Error', { component: 'LandingPage' });
      (console.error as jest.Mock).mockRestore();
    });
  });

  describe('Responsive Behavior', () => {
    it('should render mobile menu button on small screens', () => {
      // Mock small viewport
      window.innerWidth = 500;
      fireEvent(window, new Event('resize'));

      renderComponent();
      expect(screen.getByRole('button', { name: /menu/i })).toBeInTheDocument();
    });

    it('should show mobile navigation when menu button is clicked', async () => {
      window.innerWidth = 500;
      fireEvent(window, new Event('resize'));

      renderComponent();
      const menuButton = screen.getByRole('button', { name: /menu/i });

      expect(screen.queryByRole('navigation')).not.toBeVisible();

      await userEvent.click(menuButton);
      expect(screen.getByRole('navigation')).toBeVisible();
      expect(screen.getByRole('link', { name: /features/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /pricing/i })).toBeInTheDocument();
    });
  });

  describe('Analytics Tracking', () => {
    it('should track feature card interactions', async () => {
      renderComponent();
      const learnMoreButtons = screen.getAllByRole('button', { name: /learn more/i });

      await userEvent.click(learnMoreButtons[0]);
      expect(mockAnalytics.trackEvent).toHaveBeenCalledWith('Feature Expand', { feature: 'Real-time Analytics' });

      await userEvent.click(learnMoreButtons[1]);
      expect(mockAnalytics.trackEvent).toHaveBeenCalledWith('Feature Expand', { feature: 'Customizable Dashboard' });
    });

    it('should track testimonial navigation', async () => {
      renderComponent();
      const nextButton = screen.getByRole('button', { name: /next testimonial/i });

      await userEvent.click(nextButton);
      expect(mockAnalytics.trackEvent).toHaveBeenCalledWith('Testimonial Navigation', { direction: 'next' });

      const prevButton = screen.getByRole('button', { name: /previous testimonial/i });
      await userEvent.click(prevButton);
      expect(mockAnalytics.trackEvent).toHaveBeenCalledWith('Testimonial Navigation', { direction: 'previous' });
    });

    it('should track newsletter interaction', async () => {
      renderComponent();
      const emailInput = screen.getByLabelText(/email address/i);

      await userEvent.click(emailInput);
      expect(mockAnalytics.trackEvent).toHaveBeenCalledWith('Newsletter Focus', {});

      await userEvent.type(emailInput, 'test@example.com');
      expect(mockAnalytics.trackEvent).toHaveBeenCalledWith('Newsletter Input', { length: 15 });
    });
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { useRouter } from 'next/router';
import LandingPage from '../components/LandingPage';
import { AnalyticsProvider } from '../context/AnalyticsContext';

jest.mock('axios');
jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));

const mockPush = jest.fn();
(useRouter as jest.Mock).mockImplementation(() => ({
  push: mockPush,
  query: {},
}));

const mockAnalytics = {
  trackEvent: jest.fn(),
  trackPageView: jest.fn(),
};

const renderComponent = () => {
  return render(
    <AnalyticsProvider value={mockAnalytics}>
      <LandingPage />
    </AnalyticsProvider>
  );
};

describe('LandingPage - Core Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Render', () => {
    it('should render the main heading and primary CTA button', () => {
      renderComponent();
      expect(screen.getByRole('heading', { name: /welcome to our platform/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /get started now/i })).toBeInTheDocument();
    });

    it('should render the hero section with proper accessibility attributes', () => {
      renderComponent();
      const heroSection = screen.getByRole('region', { name: /hero section/i });
      expect(heroSection).toBeInTheDocument();
      expect(heroSection).toHaveAttribute('aria-labelledby', 'hero-heading');
    });

    it('should track page view on initial load', () => {
      renderComponent();
      expect(mockAnalytics.trackPageView).toHaveBeenCalledWith('Landing Page');
    });
  });

  describe('Primary CTA Interaction', () => {
    it('should navigate to signup page when primary CTA is clicked', async () => {
      renderComponent();
      const ctaButton = screen.getByRole('button', { name: /get started now/i });
      await userEvent.click(ctaButton);
      expect(mockPush).toHaveBeenCalledWith('/signup');
      expect(mockAnalytics.trackEvent).toHaveBeenCalledWith('CTA Click', { button: 'Primary' });
    });

    it('should show loading state during navigation', async () => {
      renderComponent();
      const ctaButton = screen.getByRole('button', { name: /get started now/i });

      // Mock delayed navigation
      mockPush.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      await userEvent.click(ctaButton);

      expect(screen.getByRole('button', { name: /loading/i })).toBeInTheDocument();
      expect(ctaButton).toBeDisabled();

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /loading/i })).not.toBeInTheDocument();
      });
    });
  });

  describe('Feature Cards Section', () => {
    it('should render all feature cards with proper content', () => {
      renderComponent();
      const featureCards = screen.getAllByRole('article');
      expect(featureCards).toHaveLength(3);

      const features = [
        /real-time analytics/i,
        /customizable dashboard/i,
        /seamless integration/i
      ];

      features.forEach((feature, index) => {
        expect(within(featureCards[index]).getByRole('heading')).toHaveTextContent(feature);
      });
    });

    it('should show feature details when "Learn More" is clicked', async () => {
      renderComponent();
      const learnMoreButtons = screen.getAllByRole('button', { name: /learn more/i });
      const firstFeatureCard = screen.getAllByRole('article')[0];

      expect(within(firstFeatureCard).queryByText(/detailed description/i)).not.toBeInTheDocument();

      await userEvent.click(learnMoreButtons[0]);

      expect(within(firstFeatureCard).getByText(/detailed description/i)).toBeInTheDocument();
      expect(mockAnalytics.trackEvent).toHaveBeenCalledWith('Feature Expand', { feature: 'Real-time Analytics' });
    });

    it('should collapse feature details when clicked again', async () => {
      renderComponent();
      const learnMoreButtons = screen.getAllByRole('button', { name: /learn more/i });
      const firstFeatureCard = screen.getAllByRole('article')[0];

      await userEvent.click(learnMoreButtons[0]);
      expect(within(firstFeatureCard).getByText(/detailed description/i)).toBeInTheDocument();

      await userEvent.click(learnMoreButtons[0]);
      expect(within(firstFeatureCard).queryByText(/detailed description/i)).not.toBeInTheDocument();
    });
  });

  describe('Testimonials Section', () => {
    it('should render testimonials with proper accessibility', () => {
      renderComponent();
      const testimonials = screen.getAllByRole('article', { name: /testimonial/i });
      expect(testimonials).toHaveLength(3);

      testimonials.forEach(testimonial => {
        expect(testimonial).toHaveAttribute('aria-labelledby');
        expect(within(testimonial).getByRole('heading')).toBeInTheDocument();
        expect(within(testimonial).getByText(/★★★★★/i)).toBeInTheDocument();
      });
    });

    it('should cycle through testimonials automatically', async () => {
      jest.useFakeTimers();
      renderComponent();

      const firstTestimonial = screen.getByText(/john doe/i);
      expect(firstTestimonial).toBeVisible();

      // Advance timers by 5 seconds (assuming 5s interval)
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(screen.queryByText(/john doe/i)).not.toBeVisible();
        expect(screen.getByText(/jane smith/i)).toBeVisible();
      });

      jest.useRealTimers();
    });

    it('should allow manual navigation between testimonials', async () => {
      renderComponent();
      const nextButton = screen.getByRole('button', { name: /next testimonial/i });

      expect(screen.getByText(/john doe/i)).toBeVisible();

      await userEvent.click(nextButton);
      expect(screen.getByText(/jane smith/i)).toBeVisible();

      await userEvent.click(nextButton);
      expect(screen.getByText(/michael johnson/i)).toBeVisible();

      // Test wrap-around
      await userEvent.click(nextButton);
      expect(screen.getByText(/john doe/i)).toBeVisible();
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

      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/thank you for subscribing!/i)).toBeInTheDocument();
      });
      expect(axios.post).toHaveBeenCalledWith('/api/newsletter', { email: 'test@example.com' });
      expect(mockAnalytics.trackEvent).toHaveBeenCalledWith('Newsletter Signup', { status: 'Success' });
    });

    it('should handle submission errors gracefully', async () => {
      (axios.post as jest.Mock).mockRejectedValue(new Error('Network Error'));
      renderComponent();

      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /subscribe/i });

      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/there was an error processing your request/i)).toBeInTheDocument();
      });
      expect(mockAnalytics.trackEvent).toHaveBeenCalledWith('Newsletter Signup', { status: 'Error' });
    });

    it('should show loading state during submission', async () => {
      (axios.post as jest.Mock).mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ data: { success: true } }), 100)));
      renderComponent();

      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /subscribe/i });

      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.click(submitButton);

      expect(screen.getByRole('button', { name: /submitting/i })).toBeInTheDocument();
      expect(submitButton).toBeDisabled();

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /submitting/i })).not.toBeInTheDocument();
      });
    });
  });

  describe('Accessibility Features', () => {
    it('should have proper ARIA labels for interactive elements', () => {
      renderComponent();
      expect(screen.getByRole('button', { name: /get started now/i })).toHaveAttribute('aria-label', 'Get started with our platform');
      expect(screen.getByRole('button', { name: /next testimonial/i })).toHaveAttribute('aria-label', 'Next testimonial');
      expect(screen.getByRole('button', { name: /previous testimonial/i })).toHaveAttribute('aria-label', 'Previous testimonial');
    });

    it('should have proper contrast ratios for text elements', () => {
      renderComponent();
      const heading = screen.getByRole('heading', { name: /welcome to our platform/i });
      const button = screen.getByRole('button', { name: /get started now/i });

      // These are visual tests that would typically be handled by axe or similar tools
      // In a real implementation, you might use jest-axe here
      expect(heading).toHaveStyle('color: #2D3748'); // Example - would need actual color values
      expect(button).toHaveStyle('background-color: #4299E1'); // Example - would need actual color values
    });

    it('should be navigable via keyboard', async () => {
      renderComponent();
      const ctaButton = screen.getByRole('button', { name: /get started now/i });
      const emailInput = screen.getByLabelText(/email address/i);

      // Tab to CTA button
      await userEvent.tab();
      expect(ctaButton).toHaveFocus();

      // Activate with Enter
      await userEvent.type(ctaButton, '{enter}');
      expect(mockPush).toHaveBeenCalledWith('/signup');

      // Tab to email input
      await userEvent.tab();
      expect(emailInput).toHaveFocus();

      // Type in email input
      await userEvent.keyboard('test@example.com');
      expect(emailInput).toHaveValue('test@example.com');
    });

    it('should have proper landmark roles for main sections', () => {
      renderComponent();
      expect(screen.getByRole('banner')).toBeInTheDocument();
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByRole('region', { name: /features/i })).toBeInTheDocument();
      expect(screen.getByRole('region', { name: /testimonials/i })).toBeInTheDocument();
      expect(screen.getByRole('region', { name: /newsletter/i })).toBeInTheDocument();
    });
  });

  describe('Error Boundary Testing', () => {
    it('should show error message when component fails to render', () => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
      const OriginalComponent = LandingPage;

      // Create a version that throws
      const FailingComponent = () => {
        throw new Error('Test error');
        return <OriginalComponent />;
      };

      // This would typically be handled by an ErrorBoundary in your app
      // For testing purposes, we're simulating the error state
      const { container } = render(
        <AnalyticsProvider value={mockAnalytics}>
          <FailingComponent />
        </AnalyticsProvider>
      );

      expect(container).toHaveTextContent(/something went wrong/i);
      expect(mockAnalytics.trackEvent).toHaveBeenCalledWith('Render Error', { component: 'LandingPage' });
      (console.error as jest.Mock).mockRestore();
    });
  });

  describe('Responsive Behavior', () => {
    it('should render mobile menu button on small screens', () => {
      // Mock small viewport
      window.innerWidth = 500;
      fireEvent(window, new Event('resize'));

      renderComponent();
      expect(screen.getByRole('button', { name: /menu/i })).toBeInTheDocument();
    });

    it('should show mobile navigation when menu button is clicked', async () => {
      window.innerWidth = 500;
      fireEvent(window, new Event('resize'));

      renderComponent();
      const menuButton = screen.getByRole('button', { name: /menu/i });

      expect(screen.queryByRole('navigation')).not.toBeVisible();

      await userEvent.click(menuButton);
      expect(screen.getByRole('navigation')).toBeVisible();
      expect(screen.getByRole('link', { name: /features/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /pricing/i })).toBeInTheDocument();
    });
  });

  describe('Analytics Tracking', () => {
    it('should track feature card interactions', async () => {
      renderComponent();
      const learnMoreButtons = screen.getAllByRole('button', { name: /learn more/i });

      await userEvent.click(learnMoreButtons[0]);
      expect(mockAnalytics.trackEvent).toHaveBeenCalledWith('Feature Expand', { feature: 'Real-time Analytics' });

      await userEvent.click(learnMoreButtons[1]);
      expect(mockAnalytics.trackEvent).toHaveBeenCalledWith('Feature Expand', { feature: 'Customizable Dashboard' });
    });

    it('should track testimonial navigation', async () => {
      renderComponent();
      const nextButton = screen.getByRole('button', { name: /next testimonial/i });

      await userEvent.click(nextButton);
      expect(mockAnalytics.trackEvent).toHaveBeenCalledWith('Testimonial Navigation', { direction: 'next' });

      const prevButton = screen.getByRole('button', { name: /previous testimonial/i });
      await userEvent.click(prevButton);
      expect(mockAnalytics.trackEvent).toHaveBeenCalledWith('Testimonial Navigation', { direction: 'previous' });
    });

    it('should track newsletter interaction', async () => {
      renderComponent();
      const emailInput = screen.getByLabelText(/email address/i);

      await userEvent.click(emailInput);
      expect(mockAnalytics.trackEvent).toHaveBeenCalledWith('Newsletter Focus', {});

      await userEvent.type(emailInput, 'test@example.com');
      expect(mockAnalytics.trackEvent).toHaveBeenCalledWith('Newsletter Input', { length: 15 });
    });
  });
});