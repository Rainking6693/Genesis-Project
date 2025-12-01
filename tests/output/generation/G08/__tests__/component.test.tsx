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

describe('Landing Page - Core Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Hero Section', () => {
    it('should render hero section with correct content', async () => {
      (axios.get as jest.Mock)
        .mockImplementationOnce(() => Promise.resolve({ data: mockHeroData }));

      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: mockHeroData.title })).toBeInTheDocument();
        expect(screen.getByText(mockHeroData.subtitle)).toBeInTheDocument();
        expect(screen.getByRole('link', { name: mockHeroData.ctaText })).toHaveAttribute('href', mockHeroData.ctaLink);
      });
    });

    it('should show loading state while fetching hero data', async () => {
      (axios.get as jest.Mock)
        .mockImplementationOnce(() => new Promise(() => {}));

      render(<LandingPage />);

      expect(screen.getByTestId('hero-skeleton')).toBeInTheDocument();
    });

    it('should show error message when hero data fetch fails', async () => {
      (axios.get as jest.Mock)
        .mockImplementationOnce(() => Promise.reject(new Error('Failed to fetch')));

      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load hero content/i)).toBeInTheDocument();
      });
    });

    it('should navigate to CTA link when button is clicked', async () => {
      (axios.get as jest.Mock)
        .mockImplementationOnce(() => Promise.resolve({ data: mockHeroData }));

      render(<LandingPage />);

      await waitFor(() => {
        userEvent.click(screen.getByRole('link', { name: mockHeroData.ctaText }));
        expect(mockPush).toHaveBeenCalledWith(mockHeroData.ctaLink);
      });
    });
  });

  describe('Features Section', () => {
    it('should render all features with correct content', async () => {
      (axios.get as jest.Mock)
        .mockImplementationOnce(() => Promise.resolve({ data: mockHeroData }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockFeatures }));

      render(<LandingPage />);

      await waitFor(() => {
        mockFeatures.forEach(feature => {
          expect(screen.getByText(feature.title)).toBeInTheDocument();
          expect(screen.getByText(feature.description)).toBeInTheDocument();
          expect(screen.getByTestId(`feature-icon-${feature.id}`)).toBeInTheDocument();
        });
      });
    });

    it('should show loading state while fetching features', async () => {
      (axios.get as jest.Mock)
        .mockImplementationOnce(() => Promise.resolve({ data: mockHeroData }))
        .mockImplementationOnce(() => new Promise(() => {}));

      render(<LandingPage />);

      expect(screen.getByTestId('features-skeleton')).toBeInTheDocument();
    });

    it('should show error message when features fetch fails', async () => {
      (axios.get as jest.Mock)
        .mockImplementationOnce(() => Promise.resolve({ data: mockHeroData }))
        .mockImplementationOnce(() => Promise.reject(new Error('Failed to fetch')));

      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load features/i)).toBeInTheDocument();
      });
    });

    it('should have proper aria labels for feature cards', async () => {
      (axios.get as jest.Mock)
        .mockImplementationOnce(() => Promise.resolve({ data: mockHeroData }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockFeatures }));

      render(<LandingPage />);

      await waitFor(() => {
        mockFeatures.forEach(feature => {
          const card = screen.getByText(feature.title).closest('div');
          expect(card).toHaveAttribute('aria-labelledby', `feature-title-${feature.id}`);
          expect(card).toHaveAttribute('aria-describedby', `feature-desc-${feature.id}`);
        });
      });
    });
  });

  describe('Testimonials Section', () => {
    it('should render all testimonials with correct content', async () => {
      (axios.get as jest.Mock)
        .mockImplementationOnce(() => Promise.resolve({ data: mockHeroData }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockFeatures }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockTestimonials }));

      render(<LandingPage />);

      await waitFor(() => {
        mockTestimonials.forEach(testimonial => {
          expect(screen.getByText(testimonial.quote)).toBeInTheDocument();
          expect(screen.getByText(`${testimonial.name}, ${testimonial.role}`)).toBeInTheDocument();
        });
      });
    });

    it('should show loading state while fetching testimonials', async () => {
      (axios.get as jest.Mock)
        .mockImplementationOnce(() => Promise.resolve({ data: mockHeroData }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockFeatures }))
        .mockImplementationOnce(() => new Promise(() => {}));

      render(<LandingPage />);

      expect(screen.getByTestId('testimonials-skeleton')).toBeInTheDocument();
    });

    it('should show error message when testimonials fetch fails', async () => {
      (axios.get as jest.Mock)
        .mockImplementationOnce(() => Promise.resolve({ data: mockHeroData }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockFeatures }))
        .mockImplementationOnce(() => Promise.reject(new Error('Failed to fetch')));

      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load testimonials/i)).toBeInTheDocument();
      });
    });

    it('should have proper aria labels for testimonial cards', async () => {
      (axios.get as jest.Mock)
        .mockImplementationOnce(() => Promise.resolve({ data: mockHeroData }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockFeatures }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockTestimonials }));

      render(<LandingPage />);

      await waitFor(() => {
        mockTestimonials.forEach(testimonial => {
          const card = screen.getByText(testimonial.quote).closest('div');
          expect(card).toHaveAttribute('aria-label', `Testimonial from ${testimonial.name}`);
        });
      });
    });
  });

  describe('Newsletter Signup', () => {
    it('should successfully submit newsletter form with valid email', async () => {
      (axios.get as jest.Mock)
        .mockImplementationOnce(() => Promise.resolve({ data: mockHeroData }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockFeatures }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockTestimonials }));

      (axios.post as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({ data: { success: true } })
      );

      render(<LandingPage />);

      await waitFor(() => {
        const emailInput = screen.getByLabelText(/email address/i);
        const submitButton = screen.getByRole('button', { name: /subscribe/i });

        userEvent.type(emailInput, 'test@example.com');
        userEvent.click(submitButton);

        expect(axios.post).toHaveBeenCalledWith(
          expect.any(String),
          { email: 'test@example.com' }
        );
      });

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
        const emailInput = screen.getByLabelText(/email address/i);
        const submitButton = screen.getByRole('button', { name: /subscribe/i });

        userEvent.type(emailInput, 'invalid-email');
        userEvent.click(submitButton);

        expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
      });
    });

    it('should show error message when subscription fails', async () => {
      (axios.get as jest.Mock)
        .mockImplementationOnce(() => Promise.resolve({ data: mockHeroData }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockFeatures }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockTestimonials }));

      (axios.post as jest.Mock).mockImplementationOnce(() =>
        Promise.reject(new Error('Subscription failed'))
      );

      render(<LandingPage />);

      await waitFor(() => {
        const emailInput = screen.getByLabelText(/email address/i);
        const submitButton = screen.getByRole('button', { name: /subscribe/i });

        userEvent.type(emailInput, 'test@example.com');
        userEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/failed to subscribe/i)).toBeInTheDocument();
      });
    });

    it('should show loading state during form submission', async () => {
      (axios.get as jest.Mock)
        .mockImplementationOnce(() => Promise.resolve({ data: mockHeroData }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockFeatures }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockTestimonials }));

      (axios.post as jest.Mock).mockImplementationOnce(() =>
        new Promise(() => {})
      );

      render(<LandingPage />);

      await waitFor(() => {
        const emailInput = screen.getByLabelText(/email address/i);
        const submitButton = screen.getByRole('button', { name: /subscribe/i });

        userEvent.type(emailInput, 'test@example.com');
        userEvent.click(submitButton);

        expect(screen.getByRole('button', { name: /submitting/i })).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading structure for screen readers', async () => {
      (axios.get as jest.Mock)
        .mockImplementationOnce(() => Promise.resolve({ data: mockHeroData }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockFeatures }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockTestimonials }));

      render(<LandingPage />);

      await waitFor(() => {
        const headings = screen.getAllByRole('heading');
        expect(headings[0]).toHaveTextContent(mockHeroData.title);
        expect(headings[1]).toHaveTextContent(/features/i);
        expect(headings[2]).toHaveTextContent(/what our users say/i);
        expect(headings[3]).toHaveTextContent(/subscribe to our newsletter/i);
      });
    });

    it('should have proper aria labels for interactive elements', async () => {
      (axios.get as jest.Mock)
        .mockImplementationOnce(() => Promise.resolve({ data: mockHeroData }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockFeatures }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockTestimonials }));

      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByRole('link', { name: mockHeroData.ctaText })).toHaveAttribute('aria-label', `Get started with ${mockHeroData.title}`);
        expect(screen.getByRole('button', { name: /subscribe/i })).toHaveAttribute('aria-label', 'Subscribe to newsletter');
      });
    });

    it('should be navigable via keyboard', async () => {
      (axios.get as jest.Mock)
        .mockImplementationOnce(() => Promise.resolve({ data: mockHeroData }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockFeatures }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockTestimonials }));

      render(<LandingPage />);

      await waitFor(() => {
        const ctaButton = screen.getByRole('link', { name: mockHeroData.ctaText });
        const subscribeButton = screen.getByRole('button', { name: /subscribe/i });

        expect(ctaButton).toHaveFocus();
        fireEvent.keyDown(ctaButton, { key: 'Tab', code: 'Tab' });
        expect(subscribeButton).toHaveFocus();
      });
    });

    it('should have proper contrast ratios for text elements', async () => {
      (axios.get as jest.Mock)
        .mockImplementationOnce(() => Promise.resolve({ data: mockHeroData }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockFeatures }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockTestimonials }));

      render(<LandingPage />);

      await waitFor(() => {
        const heroTitle = screen.getByRole('heading', { name: mockHeroData.title });
        const featureTitle = screen.getByText(mockFeatures[0].title);
        const testimonialText = screen.getByText(mockTestimonials[0].quote);

        expect(heroTitle).toHaveStyle('color: rgba(0, 0, 0, 0.87)');
        expect(featureTitle).toHaveStyle('color: rgba(0, 0, 0, 0.87)');
        expect(testimonialText).toHaveStyle('color: rgba(0, 0, 0, 0.87)');
      });
    });
  });

  describe('Responsive Design', () => {
    it('should render mobile menu button on small screens', async () => {
      (axios.get as jest.Mock)
        .mockImplementationOnce(() => Promise.resolve({ data: mockHeroData }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockFeatures }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockTestimonials }));

      global.innerWidth = 500;
      global.dispatchEvent(new Event('resize'));

      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/menu/i)).toBeInTheDocument();
      });
    });

    it('should adjust layout for different screen sizes', async () => {
      (axios.get as jest.Mock)
        .mockImplementationOnce(() => Promise.resolve({ data: mockHeroData }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockFeatures }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockTestimonials }));

      // Test mobile layout
      global.innerWidth = 500;
      global.dispatchEvent(new Event('resize'));

      const { rerender } = render(<LandingPage />);

      await waitFor(() => {
        const featuresGrid = screen.getByTestId('features-grid');
        expect(featuresGrid).toHaveStyle('grid-template-columns: 1fr');
      });

      // Test desktop layout
      global.innerWidth = 1200;
      global.dispatchEvent(new Event('resize'));

      rerender(<LandingPage />);

      await waitFor(() => {
        const featuresGrid = screen.getByTestId('features-grid');
        expect(featuresGrid).toHaveStyle('grid-template-columns: repeat(3, 1fr)');
      });
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

describe('Landing Page - Core Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Hero Section', () => {
    it('should render hero section with correct content', async () => {
      (axios.get as jest.Mock)
        .mockImplementationOnce(() => Promise.resolve({ data: mockHeroData }));

      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: mockHeroData.title })).toBeInTheDocument();
        expect(screen.getByText(mockHeroData.subtitle)).toBeInTheDocument();
        expect(screen.getByRole('link', { name: mockHeroData.ctaText })).toHaveAttribute('href', mockHeroData.ctaLink);
      });
    });

    it('should show loading state while fetching hero data', async () => {
      (axios.get as jest.Mock)
        .mockImplementationOnce(() => new Promise(() => {}));

      render(<LandingPage />);

      expect(screen.getByTestId('hero-skeleton')).toBeInTheDocument();
    });

    it('should show error message when hero data fetch fails', async () => {
      (axios.get as jest.Mock)
        .mockImplementationOnce(() => Promise.reject(new Error('Failed to fetch')));

      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load hero content/i)).toBeInTheDocument();
      });
    });

    it('should navigate to CTA link when button is clicked', async () => {
      (axios.get as jest.Mock)
        .mockImplementationOnce(() => Promise.resolve({ data: mockHeroData }));

      render(<LandingPage />);

      await waitFor(() => {
        userEvent.click(screen.getByRole('link', { name: mockHeroData.ctaText }));
        expect(mockPush).toHaveBeenCalledWith(mockHeroData.ctaLink);
      });
    });
  });

  describe('Features Section', () => {
    it('should render all features with correct content', async () => {
      (axios.get as jest.Mock)
        .mockImplementationOnce(() => Promise.resolve({ data: mockHeroData }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockFeatures }));

      render(<LandingPage />);

      await waitFor(() => {
        mockFeatures.forEach(feature => {
          expect(screen.getByText(feature.title)).toBeInTheDocument();
          expect(screen.getByText(feature.description)).toBeInTheDocument();
          expect(screen.getByTestId(`feature-icon-${feature.id}`)).toBeInTheDocument();
        });
      });
    });

    it('should show loading state while fetching features', async () => {
      (axios.get as jest.Mock)
        .mockImplementationOnce(() => Promise.resolve({ data: mockHeroData }))
        .mockImplementationOnce(() => new Promise(() => {}));

      render(<LandingPage />);

      expect(screen.getByTestId('features-skeleton')).toBeInTheDocument();
    });

    it('should show error message when features fetch fails', async () => {
      (axios.get as jest.Mock)
        .mockImplementationOnce(() => Promise.resolve({ data: mockHeroData }))
        .mockImplementationOnce(() => Promise.reject(new Error('Failed to fetch')));

      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load features/i)).toBeInTheDocument();
      });
    });

    it('should have proper aria labels for feature cards', async () => {
      (axios.get as jest.Mock)
        .mockImplementationOnce(() => Promise.resolve({ data: mockHeroData }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockFeatures }));

      render(<LandingPage />);

      await waitFor(() => {
        mockFeatures.forEach(feature => {
          const card = screen.getByText(feature.title).closest('div');
          expect(card).toHaveAttribute('aria-labelledby', `feature-title-${feature.id}`);
          expect(card).toHaveAttribute('aria-describedby', `feature-desc-${feature.id}`);
        });
      });
    });
  });

  describe('Testimonials Section', () => {
    it('should render all testimonials with correct content', async () => {
      (axios.get as jest.Mock)
        .mockImplementationOnce(() => Promise.resolve({ data: mockHeroData }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockFeatures }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockTestimonials }));

      render(<LandingPage />);

      await waitFor(() => {
        mockTestimonials.forEach(testimonial => {
          expect(screen.getByText(testimonial.quote)).toBeInTheDocument();
          expect(screen.getByText(`${testimonial.name}, ${testimonial.role}`)).toBeInTheDocument();
        });
      });
    });

    it('should show loading state while fetching testimonials', async () => {
      (axios.get as jest.Mock)
        .mockImplementationOnce(() => Promise.resolve({ data: mockHeroData }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockFeatures }))
        .mockImplementationOnce(() => new Promise(() => {}));

      render(<LandingPage />);

      expect(screen.getByTestId('testimonials-skeleton')).toBeInTheDocument();
    });

    it('should show error message when testimonials fetch fails', async () => {
      (axios.get as jest.Mock)
        .mockImplementationOnce(() => Promise.resolve({ data: mockHeroData }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockFeatures }))
        .mockImplementationOnce(() => Promise.reject(new Error('Failed to fetch')));

      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load testimonials/i)).toBeInTheDocument();
      });
    });

    it('should have proper aria labels for testimonial cards', async () => {
      (axios.get as jest.Mock)
        .mockImplementationOnce(() => Promise.resolve({ data: mockHeroData }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockFeatures }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockTestimonials }));

      render(<LandingPage />);

      await waitFor(() => {
        mockTestimonials.forEach(testimonial => {
          const card = screen.getByText(testimonial.quote).closest('div');
          expect(card).toHaveAttribute('aria-label', `Testimonial from ${testimonial.name}`);
        });
      });
    });
  });

  describe('Newsletter Signup', () => {
    it('should successfully submit newsletter form with valid email', async () => {
      (axios.get as jest.Mock)
        .mockImplementationOnce(() => Promise.resolve({ data: mockHeroData }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockFeatures }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockTestimonials }));

      (axios.post as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({ data: { success: true } })
      );

      render(<LandingPage />);

      await waitFor(() => {
        const emailInput = screen.getByLabelText(/email address/i);
        const submitButton = screen.getByRole('button', { name: /subscribe/i });

        userEvent.type(emailInput, 'test@example.com');
        userEvent.click(submitButton);

        expect(axios.post).toHaveBeenCalledWith(
          expect.any(String),
          { email: 'test@example.com' }
        );
      });

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
        const emailInput = screen.getByLabelText(/email address/i);
        const submitButton = screen.getByRole('button', { name: /subscribe/i });

        userEvent.type(emailInput, 'invalid-email');
        userEvent.click(submitButton);

        expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
      });
    });

    it('should show error message when subscription fails', async () => {
      (axios.get as jest.Mock)
        .mockImplementationOnce(() => Promise.resolve({ data: mockHeroData }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockFeatures }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockTestimonials }));

      (axios.post as jest.Mock).mockImplementationOnce(() =>
        Promise.reject(new Error('Subscription failed'))
      );

      render(<LandingPage />);

      await waitFor(() => {
        const emailInput = screen.getByLabelText(/email address/i);
        const submitButton = screen.getByRole('button', { name: /subscribe/i });

        userEvent.type(emailInput, 'test@example.com');
        userEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/failed to subscribe/i)).toBeInTheDocument();
      });
    });

    it('should show loading state during form submission', async () => {
      (axios.get as jest.Mock)
        .mockImplementationOnce(() => Promise.resolve({ data: mockHeroData }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockFeatures }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockTestimonials }));

      (axios.post as jest.Mock).mockImplementationOnce(() =>
        new Promise(() => {})
      );

      render(<LandingPage />);

      await waitFor(() => {
        const emailInput = screen.getByLabelText(/email address/i);
        const submitButton = screen.getByRole('button', { name: /subscribe/i });

        userEvent.type(emailInput, 'test@example.com');
        userEvent.click(submitButton);

        expect(screen.getByRole('button', { name: /submitting/i })).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading structure for screen readers', async () => {
      (axios.get as jest.Mock)
        .mockImplementationOnce(() => Promise.resolve({ data: mockHeroData }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockFeatures }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockTestimonials }));

      render(<LandingPage />);

      await waitFor(() => {
        const headings = screen.getAllByRole('heading');
        expect(headings[0]).toHaveTextContent(mockHeroData.title);
        expect(headings[1]).toHaveTextContent(/features/i);
        expect(headings[2]).toHaveTextContent(/what our users say/i);
        expect(headings[3]).toHaveTextContent(/subscribe to our newsletter/i);
      });
    });

    it('should have proper aria labels for interactive elements', async () => {
      (axios.get as jest.Mock)
        .mockImplementationOnce(() => Promise.resolve({ data: mockHeroData }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockFeatures }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockTestimonials }));

      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByRole('link', { name: mockHeroData.ctaText })).toHaveAttribute('aria-label', `Get started with ${mockHeroData.title}`);
        expect(screen.getByRole('button', { name: /subscribe/i })).toHaveAttribute('aria-label', 'Subscribe to newsletter');
      });
    });

    it('should be navigable via keyboard', async () => {
      (axios.get as jest.Mock)
        .mockImplementationOnce(() => Promise.resolve({ data: mockHeroData }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockFeatures }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockTestimonials }));

      render(<LandingPage />);

      await waitFor(() => {
        const ctaButton = screen.getByRole('link', { name: mockHeroData.ctaText });
        const subscribeButton = screen.getByRole('button', { name: /subscribe/i });

        expect(ctaButton).toHaveFocus();
        fireEvent.keyDown(ctaButton, { key: 'Tab', code: 'Tab' });
        expect(subscribeButton).toHaveFocus();
      });
    });

    it('should have proper contrast ratios for text elements', async () => {
      (axios.get as jest.Mock)
        .mockImplementationOnce(() => Promise.resolve({ data: mockHeroData }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockFeatures }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockTestimonials }));

      render(<LandingPage />);

      await waitFor(() => {
        const heroTitle = screen.getByRole('heading', { name: mockHeroData.title });
        const featureTitle = screen.getByText(mockFeatures[0].title);
        const testimonialText = screen.getByText(mockTestimonials[0].quote);

        expect(heroTitle).toHaveStyle('color: rgba(0, 0, 0, 0.87)');
        expect(featureTitle).toHaveStyle('color: rgba(0, 0, 0, 0.87)');
        expect(testimonialText).toHaveStyle('color: rgba(0, 0, 0, 0.87)');
      });
    });
  });

  describe('Responsive Design', () => {
    it('should render mobile menu button on small screens', async () => {
      (axios.get as jest.Mock)
        .mockImplementationOnce(() => Promise.resolve({ data: mockHeroData }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockFeatures }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockTestimonials }));

      global.innerWidth = 500;
      global.dispatchEvent(new Event('resize'));

      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/menu/i)).toBeInTheDocument();
      });
    });

    it('should adjust layout for different screen sizes', async () => {
      (axios.get as jest.Mock)
        .mockImplementationOnce(() => Promise.resolve({ data: mockHeroData }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockFeatures }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockTestimonials }));

      // Test mobile layout
      global.innerWidth = 500;
      global.dispatchEvent(new Event('resize'));

      const { rerender } = render(<LandingPage />);

      await waitFor(() => {
        const featuresGrid = screen.getByTestId('features-grid');
        expect(featuresGrid).toHaveStyle('grid-template-columns: 1fr');
      });

      // Test desktop layout
      global.innerWidth = 1200;
      global.dispatchEvent(new Event('resize'));

      rerender(<LandingPage />);

      await waitFor(() => {
        const featuresGrid = screen.getByTestId('features-grid');
        expect(featuresGrid).toHaveStyle('grid-template-columns: repeat(3, 1fr)');
      });
    });
  });
});