import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { useRouter } from 'next/router';
import LandingPage from '../pages/index';
import '@testing-library/jest-dom';

jest.mock('axios');
jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));

const mockPush = jest.fn();
(useRouter as jest.Mock).mockImplementation(() => ({
  push: mockPush,
  query: {},
}));

const mockHeroData = {
  title: 'Welcome to Our Platform',
  subtitle: 'Discover amazing features',
  ctaText: 'Get Started',
  ctaLink: '/signup',
};

const mockFeatures = [
  { id: 1, title: 'Feature 1', description: 'Description 1', icon: 'icon1' },
  { id: 2, title: 'Feature 2', description: 'Description 2', icon: 'icon2' },
  { id: 3, title: 'Feature 3', description: 'Description 3', icon: 'icon3' },
];

const mockTestimonials = [
  { id: 1, name: 'User 1', quote: 'Great product!', role: 'Customer' },
  { id: 2, name: 'User 2', quote: 'Changed my life!', role: 'Client' },
];

describe('LandingPage Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Render', () => {
    it('should render the hero section with loading state initially', () => {
      (axios.get as jest.Mock)
        .mockImplementationOnce(() => Promise.resolve({ data: mockHeroData }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockFeatures }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockTestimonials }));

      render(<LandingPage />);

      expect(screen.getByTestId('hero-loading')).toBeInTheDocument();
      expect(screen.getByTestId('features-loading')).toBeInTheDocument();
      expect(screen.getByTestId('testimonials-loading')).toBeInTheDocument();
    });

    it('should render all sections after data loads', async () => {
      (axios.get as jest.Mock)
        .mockImplementationOnce(() => Promise.resolve({ data: mockHeroData }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockFeatures }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockTestimonials }));

      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByText(mockHeroData.title)).toBeInTheDocument();
        expect(screen.getByText(mockHeroData.subtitle)).toBeInTheDocument();
        expect(screen.getByText(mockHeroData.ctaText)).toBeInTheDocument();
      });

      mockFeatures.forEach(feature => {
        expect(screen.getByText(feature.title)).toBeInTheDocument();
        expect(screen.getByText(feature.description)).toBeInTheDocument();
      });

      mockTestimonials.forEach(testimonial => {
        expect(screen.getByText(testimonial.name)).toBeInTheDocument();
        expect(screen.getByText(testimonial.quote)).toBeInTheDocument();
        expect(screen.getByText(testimonial.role)).toBeInTheDocument();
      });
    });
  });

  describe('Hero Section', () => {
    it('should navigate to CTA link when button is clicked', async () => {
      (axios.get as jest.Mock)
        .mockImplementationOnce(() => Promise.resolve({ data: mockHeroData }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockFeatures }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockTestimonials }));

      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByText(mockHeroData.ctaText)).toBeInTheDocument();
      });

      const ctaButton = screen.getByRole('button', { name: mockHeroData.ctaText });
      fireEvent.click(ctaButton);

      expect(mockPush).toHaveBeenCalledWith(mockHeroData.ctaLink);
    });

    it('should handle CTA button click error gracefully', async () => {
      (axios.get as jest.Mock)
        .mockImplementationOnce(() => Promise.resolve({ data: mockHeroData }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockFeatures }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockTestimonials }));

      mockPush.mockImplementationOnce(() => { throw new Error('Navigation error'); });

      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByText(mockHeroData.ctaText)).toBeInTheDocument();
      });

      const ctaButton = screen.getByRole('button', { name: mockHeroData.ctaText });
      fireEvent.click(ctaButton);

      await waitFor(() => {
        expect(screen.getByText(/unable to navigate/i)).toBeInTheDocument();
      });
    });
  });

  describe('Features Section', () => {
    it('should display all features with proper accessibility attributes', async () => {
      (axios.get as jest.Mock)
        .mockImplementationOnce(() => Promise.resolve({ data: mockHeroData }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockFeatures }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockTestimonials }));

      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByText(/features/i)).toBeInTheDocument();
      });

      const featuresSection = screen.getByRole('region', { name: /features/i });
      expect(featuresSection).toHaveAttribute('aria-labelledby');

      mockFeatures.forEach(feature => {
        const featureCard = screen.getByText(feature.title).closest('div');
        expect(featureCard).toHaveAttribute('role', 'article');
        expect(within(featureCard!).getByText(feature.description)).toBeInTheDocument();
      });
    });

    it('should show error message when features fail to load', async () => {
      (axios.get as jest.Mock)
        .mockImplementationOnce(() => Promise.resolve({ data: mockHeroData }))
        .mockImplementationOnce(() => Promise.reject(new Error('Failed to load features')))
        .mockImplementationOnce(() => Promise.resolve({ data: mockTestimonials }));

      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByText(/unable to load features/i)).toBeInTheDocument();
      });
    });
  });

  describe('Testimonials Section', () => {
    it('should display testimonials in a carousel format', async () => {
      (axios.get as jest.Mock)
        .mockImplementationOnce(() => Promise.resolve({ data: mockHeroData }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockFeatures }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockTestimonials }));

      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByText(/what our users say/i)).toBeInTheDocument();
      });

      const testimonialsSection = screen.getByRole('region', { name: /testimonials/i });
      expect(testimonialsSection).toBeInTheDocument();

      // Check first testimonial is visible
      expect(screen.getByText(mockTestimonials[0].quote)).toBeInTheDocument();

      // Check navigation buttons
      const nextButton = screen.getByRole('button', { name: /next testimonial/i });
      const prevButton = screen.getByRole('button', { name: /previous testimonial/i });

      expect(nextButton).toBeInTheDocument();
      expect(prevButton).toBeInTheDocument();
    });

    it('should navigate through testimonials using buttons', async () => {
      (axios.get as jest.Mock)
        .mockImplementationOnce(() => Promise.resolve({ data: mockHeroData }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockFeatures }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockTestimonials }));

      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByText(mockTestimonials[0].quote)).toBeInTheDocument();
      });

      const nextButton = screen.getByRole('button', { name: /next testimonial/i });
      userEvent.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText(mockTestimonials[1].quote)).toBeInTheDocument();
      });

      const prevButton = screen.getByRole('button', { name: /previous testimonial/i });
      userEvent.click(prevButton);

      await waitFor(() => {
        expect(screen.getByText(mockTestimonials[0].quote)).toBeInTheDocument();
      });
    });

    it('should show error message when testimonials fail to load', async () => {
      (axios.get as jest.Mock)
        .mockImplementationOnce(() => Promise.resolve({ data: mockHeroData }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockFeatures }))
        .mockImplementationOnce(() => Promise.reject(new Error('Failed to load testimonials')));

      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByText(/unable to load testimonials/i)).toBeInTheDocument();
      });
    });
  });

  describe('Newsletter Signup', () => {
    it('should allow users to submit email for newsletter', async () => {
      (axios.get as jest.Mock)
        .mockImplementationOnce(() => Promise.resolve({ data: mockHeroData }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockFeatures }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockTestimonials }));

      (axios.post as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({ data: { success: true } })
      );

      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      });

      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /subscribe/i });

      userEvent.type(emailInput, 'test@example.com');
      userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/thank you for subscribing/i)).toBeInTheDocument();
      });
    });

    it('should show validation error for invalid email', async () => {
      (axios.get as jest.Mock)
        .mockImplementationOnce(() => Promise.resolve({ data: mockHeroData }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockFeatures }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockTestimonials }));

      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      });

      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /subscribe/i });

      userEvent.type(emailInput, 'invalid-email');
      userEvent.click(submitButton);

      expect(await screen.findByText(/please enter a valid email address/i)).toBeInTheDocument();
    });

    it('should handle newsletter submission error', async () => {
      (axios.get as jest.Mock)
        .mockImplementationOnce(() => Promise.resolve({ data: mockHeroData }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockFeatures }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockTestimonials }));

      (axios.post as jest.Mock).mockImplementationOnce(() =>
        Promise.reject(new Error('Subscription failed'))
      );

      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      });

      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /subscribe/i });

      userEvent.type(emailInput, 'test@example.com');
      userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/unable to subscribe at this time/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes for screen readers', async () => {
      (axios.get as jest.Mock)
        .mockImplementationOnce(() => Promise.resolve({ data: mockHeroData }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockFeatures }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockTestimonials }));

      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByRole('main')).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: mockHeroData.title })).toBeInTheDocument();
        expect(screen.getByRole('region', { name: /features/i })).toBeInTheDocument();
        expect(screen.getByRole('region', { name: /testimonials/i })).toBeInTheDocument();
      });
    });

    it('should have proper focus management for keyboard navigation', async () => {
      (axios.get as jest.Mock)
        .mockImplementationOnce(() => Promise.resolve({ data: mockHeroData }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockFeatures }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockTestimonials }));

      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: mockHeroData.ctaText })).toBeInTheDocument();
      });

      const ctaButton = screen.getByRole('button', { name: mockHeroData.ctaText });
      const featuresSection = screen.getByRole('region', { name: /features/i });

      userEvent.tab();
      expect(ctaButton).toHaveFocus();

      userEvent.tab();
      expect(featuresSection).toHaveFocus();
    });
  });

  describe('Error Boundary', () => {
    it('should display error boundary when component crashes', () => {
      jest.spyOn(console, 'error').mockImplementation(() => {});

      const OriginalComponent = LandingPage;
      const CrashComponent = () => {
        throw new Error('Test error');
        return <OriginalComponent />;
      };

      render(<CrashComponent />);

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();

      jest.restoreAllMocks();
    });
  });

  describe('Responsive Design', () => {
    it('should adapt layout for mobile viewports', async () => {
      (axios.get as jest.Mock)
        .mockImplementationOnce(() => Promise.resolve({ data: mockHeroData }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockFeatures }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockTestimonials }));

      global.innerWidth = 500;
      global.dispatchEvent(new Event('resize'));

      render(<LandingPage />);

      await waitFor(() => {
        const mobileMenuButton = screen.queryByRole('button', { name: /menu/i });
        expect(mobileMenuButton).toBeInTheDocument();

        const featuresGrid = screen.getByTestId('features-grid');
        expect(featuresGrid).toHaveStyle('grid-template-columns: 1fr');
      });

      global.innerWidth = 1024;
      global.dispatchEvent(new Event('resize'));
    });
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { useRouter } from 'next/router';
import LandingPage from '../pages/index';
import '@testing-library/jest-dom';

jest.mock('axios');
jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));

const mockPush = jest.fn();
(useRouter as jest.Mock).mockImplementation(() => ({
  push: mockPush,
  query: {},
}));

const mockHeroData = {
  title: 'Welcome to Our Platform',
  subtitle: 'Discover amazing features',
  ctaText: 'Get Started',
  ctaLink: '/signup',
};

const mockFeatures = [
  { id: 1, title: 'Feature 1', description: 'Description 1', icon: 'icon1' },
  { id: 2, title: 'Feature 2', description: 'Description 2', icon: 'icon2' },
  { id: 3, title: 'Feature 3', description: 'Description 3', icon: 'icon3' },
];

const mockTestimonials = [
  { id: 1, name: 'User 1', quote: 'Great product!', role: 'Customer' },
  { id: 2, name: 'User 2', quote: 'Changed my life!', role: 'Client' },
];

describe('LandingPage Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Render', () => {
    it('should render the hero section with loading state initially', () => {
      (axios.get as jest.Mock)
        .mockImplementationOnce(() => Promise.resolve({ data: mockHeroData }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockFeatures }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockTestimonials }));

      render(<LandingPage />);

      expect(screen.getByTestId('hero-loading')).toBeInTheDocument();
      expect(screen.getByTestId('features-loading')).toBeInTheDocument();
      expect(screen.getByTestId('testimonials-loading')).toBeInTheDocument();
    });

    it('should render all sections after data loads', async () => {
      (axios.get as jest.Mock)
        .mockImplementationOnce(() => Promise.resolve({ data: mockHeroData }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockFeatures }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockTestimonials }));

      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByText(mockHeroData.title)).toBeInTheDocument();
        expect(screen.getByText(mockHeroData.subtitle)).toBeInTheDocument();
        expect(screen.getByText(mockHeroData.ctaText)).toBeInTheDocument();
      });

      mockFeatures.forEach(feature => {
        expect(screen.getByText(feature.title)).toBeInTheDocument();
        expect(screen.getByText(feature.description)).toBeInTheDocument();
      });

      mockTestimonials.forEach(testimonial => {
        expect(screen.getByText(testimonial.name)).toBeInTheDocument();
        expect(screen.getByText(testimonial.quote)).toBeInTheDocument();
        expect(screen.getByText(testimonial.role)).toBeInTheDocument();
      });
    });
  });

  describe('Hero Section', () => {
    it('should navigate to CTA link when button is clicked', async () => {
      (axios.get as jest.Mock)
        .mockImplementationOnce(() => Promise.resolve({ data: mockHeroData }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockFeatures }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockTestimonials }));

      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByText(mockHeroData.ctaText)).toBeInTheDocument();
      });

      const ctaButton = screen.getByRole('button', { name: mockHeroData.ctaText });
      fireEvent.click(ctaButton);

      expect(mockPush).toHaveBeenCalledWith(mockHeroData.ctaLink);
    });

    it('should handle CTA button click error gracefully', async () => {
      (axios.get as jest.Mock)
        .mockImplementationOnce(() => Promise.resolve({ data: mockHeroData }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockFeatures }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockTestimonials }));

      mockPush.mockImplementationOnce(() => { throw new Error('Navigation error'); });

      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByText(mockHeroData.ctaText)).toBeInTheDocument();
      });

      const ctaButton = screen.getByRole('button', { name: mockHeroData.ctaText });
      fireEvent.click(ctaButton);

      await waitFor(() => {
        expect(screen.getByText(/unable to navigate/i)).toBeInTheDocument();
      });
    });
  });

  describe('Features Section', () => {
    it('should display all features with proper accessibility attributes', async () => {
      (axios.get as jest.Mock)
        .mockImplementationOnce(() => Promise.resolve({ data: mockHeroData }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockFeatures }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockTestimonials }));

      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByText(/features/i)).toBeInTheDocument();
      });

      const featuresSection = screen.getByRole('region', { name: /features/i });
      expect(featuresSection).toHaveAttribute('aria-labelledby');

      mockFeatures.forEach(feature => {
        const featureCard = screen.getByText(feature.title).closest('div');
        expect(featureCard).toHaveAttribute('role', 'article');
        expect(within(featureCard!).getByText(feature.description)).toBeInTheDocument();
      });
    });

    it('should show error message when features fail to load', async () => {
      (axios.get as jest.Mock)
        .mockImplementationOnce(() => Promise.resolve({ data: mockHeroData }))
        .mockImplementationOnce(() => Promise.reject(new Error('Failed to load features')))
        .mockImplementationOnce(() => Promise.resolve({ data: mockTestimonials }));

      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByText(/unable to load features/i)).toBeInTheDocument();
      });
    });
  });

  describe('Testimonials Section', () => {
    it('should display testimonials in a carousel format', async () => {
      (axios.get as jest.Mock)
        .mockImplementationOnce(() => Promise.resolve({ data: mockHeroData }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockFeatures }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockTestimonials }));

      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByText(/what our users say/i)).toBeInTheDocument();
      });

      const testimonialsSection = screen.getByRole('region', { name: /testimonials/i });
      expect(testimonialsSection).toBeInTheDocument();

      // Check first testimonial is visible
      expect(screen.getByText(mockTestimonials[0].quote)).toBeInTheDocument();

      // Check navigation buttons
      const nextButton = screen.getByRole('button', { name: /next testimonial/i });
      const prevButton = screen.getByRole('button', { name: /previous testimonial/i });

      expect(nextButton).toBeInTheDocument();
      expect(prevButton).toBeInTheDocument();
    });

    it('should navigate through testimonials using buttons', async () => {
      (axios.get as jest.Mock)
        .mockImplementationOnce(() => Promise.resolve({ data: mockHeroData }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockFeatures }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockTestimonials }));

      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByText(mockTestimonials[0].quote)).toBeInTheDocument();
      });

      const nextButton = screen.getByRole('button', { name: /next testimonial/i });
      userEvent.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText(mockTestimonials[1].quote)).toBeInTheDocument();
      });

      const prevButton = screen.getByRole('button', { name: /previous testimonial/i });
      userEvent.click(prevButton);

      await waitFor(() => {
        expect(screen.getByText(mockTestimonials[0].quote)).toBeInTheDocument();
      });
    });

    it('should show error message when testimonials fail to load', async () => {
      (axios.get as jest.Mock)
        .mockImplementationOnce(() => Promise.resolve({ data: mockHeroData }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockFeatures }))
        .mockImplementationOnce(() => Promise.reject(new Error('Failed to load testimonials')));

      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByText(/unable to load testimonials/i)).toBeInTheDocument();
      });
    });
  });

  describe('Newsletter Signup', () => {
    it('should allow users to submit email for newsletter', async () => {
      (axios.get as jest.Mock)
        .mockImplementationOnce(() => Promise.resolve({ data: mockHeroData }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockFeatures }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockTestimonials }));

      (axios.post as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({ data: { success: true } })
      );

      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      });

      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /subscribe/i });

      userEvent.type(emailInput, 'test@example.com');
      userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/thank you for subscribing/i)).toBeInTheDocument();
      });
    });

    it('should show validation error for invalid email', async () => {
      (axios.get as jest.Mock)
        .mockImplementationOnce(() => Promise.resolve({ data: mockHeroData }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockFeatures }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockTestimonials }));

      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      });

      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /subscribe/i });

      userEvent.type(emailInput, 'invalid-email');
      userEvent.click(submitButton);

      expect(await screen.findByText(/please enter a valid email address/i)).toBeInTheDocument();
    });

    it('should handle newsletter submission error', async () => {
      (axios.get as jest.Mock)
        .mockImplementationOnce(() => Promise.resolve({ data: mockHeroData }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockFeatures }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockTestimonials }));

      (axios.post as jest.Mock).mockImplementationOnce(() =>
        Promise.reject(new Error('Subscription failed'))
      );

      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      });

      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /subscribe/i });

      userEvent.type(emailInput, 'test@example.com');
      userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/unable to subscribe at this time/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes for screen readers', async () => {
      (axios.get as jest.Mock)
        .mockImplementationOnce(() => Promise.resolve({ data: mockHeroData }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockFeatures }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockTestimonials }));

      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByRole('main')).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: mockHeroData.title })).toBeInTheDocument();
        expect(screen.getByRole('region', { name: /features/i })).toBeInTheDocument();
        expect(screen.getByRole('region', { name: /testimonials/i })).toBeInTheDocument();
      });
    });

    it('should have proper focus management for keyboard navigation', async () => {
      (axios.get as jest.Mock)
        .mockImplementationOnce(() => Promise.resolve({ data: mockHeroData }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockFeatures }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockTestimonials }));

      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: mockHeroData.ctaText })).toBeInTheDocument();
      });

      const ctaButton = screen.getByRole('button', { name: mockHeroData.ctaText });
      const featuresSection = screen.getByRole('region', { name: /features/i });

      userEvent.tab();
      expect(ctaButton).toHaveFocus();

      userEvent.tab();
      expect(featuresSection).toHaveFocus();
    });
  });

  describe('Error Boundary', () => {
    it('should display error boundary when component crashes', () => {
      jest.spyOn(console, 'error').mockImplementation(() => {});

      const OriginalComponent = LandingPage;
      const CrashComponent = () => {
        throw new Error('Test error');
        return <OriginalComponent />;
      };

      render(<CrashComponent />);

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();

      jest.restoreAllMocks();
    });
  });

  describe('Responsive Design', () => {
    it('should adapt layout for mobile viewports', async () => {
      (axios.get as jest.Mock)
        .mockImplementationOnce(() => Promise.resolve({ data: mockHeroData }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockFeatures }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockTestimonials }));

      global.innerWidth = 500;
      global.dispatchEvent(new Event('resize'));

      render(<LandingPage />);

      await waitFor(() => {
        const mobileMenuButton = screen.queryByRole('button', { name: /menu/i });
        expect(mobileMenuButton).toBeInTheDocument();

        const featuresGrid = screen.getByTestId('features-grid');
        expect(featuresGrid).toHaveStyle('grid-template-columns: 1fr');
      });

      global.innerWidth = 1024;
      global.dispatchEvent(new Event('resize'));
    });
  });
});