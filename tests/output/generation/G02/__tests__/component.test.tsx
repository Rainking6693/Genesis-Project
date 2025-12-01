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

describe('Landing Page - Core Functionality', () => {
  const mockSuccessResponse = {
    data: {
      features: [
        { id: 1, title: 'Feature 1', description: 'Description 1', icon: 'icon1' },
        { id: 2, title: 'Feature 2', description: 'Description 2', icon: 'icon2' },
      ],
      testimonials: [
        { id: 1, name: 'User 1', quote: 'Great product!', role: 'Customer' },
        { id: 2, name: 'User 2', quote: 'Highly recommend', role: 'Client' },
      ],
      cta: {
        primary: 'Get Started',
        secondary: 'Learn More',
      },
    },
  };

  const mockErrorResponse = {
    response: {
      status: 500,
      data: { message: 'Server error' },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Render and Loading States', () => {
    it('should display loading skeleton while fetching data', () => {
      (axios.get as jest.Mock).mockImplementation(() => new Promise(() => {}));
      render(<LandingPage />);

      expect(screen.getByTestId('features-loading')).toBeInTheDocument();
      expect(screen.getByTestId('testimonials-loading')).toBeInTheDocument();
      expect(screen.getByTestId('hero-loading')).toBeInTheDocument();
    });

    it('should render error message when data fetch fails', async () => {
      (axios.get as jest.Mock).mockRejectedValue(mockErrorResponse);
      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load content/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });
  });

  describe('Hero Section', () => {
    it('should render hero section with proper content after successful load', async () => {
      (axios.get as jest.Mock).mockResolvedValue(mockSuccessResponse);
      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /welcome to our platform/i })).toBeInTheDocument();
        expect(screen.getByText(/discover amazing features/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: mockSuccessResponse.data.cta.primary })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: mockSuccessResponse.data.cta.secondary })).toBeInTheDocument();
      });
    });

    it('should navigate to signup page when primary CTA is clicked', async () => {
      (axios.get as jest.Mock).mockResolvedValue(mockSuccessResponse);
      render(<LandingPage />);

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: mockSuccessResponse.data.cta.primary }));
        expect(mockPush).toHaveBeenCalledWith('/signup');
      });
    });

    it('should scroll to features section when secondary CTA is clicked', async () => {
      (axios.get as jest.Mock).mockResolvedValue(mockSuccessResponse);
      render(<LandingPage />);

      const featuresSection = screen.getByTestId('features-section');
      const scrollIntoViewMock = jest.fn();
      featuresSection.scrollIntoView = scrollIntoViewMock;

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: mockSuccessResponse.data.cta.secondary }));
        expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: 'smooth' });
      });
    });
  });

  describe('Features Section', () => {
    it('should display all features with proper content', async () => {
      (axios.get as jest.Mock).mockResolvedValue(mockSuccessResponse);
      render(<LandingPage />);

      await waitFor(() => {
        mockSuccessResponse.data.features.forEach(feature => {
          expect(screen.getByText(feature.title)).toBeInTheDocument();
          expect(screen.getByText(feature.description)).toBeInTheDocument();
          expect(screen.getByTestId(`feature-icon-${feature.id}`)).toBeInTheDocument();
        });
      });
    });

    it('should have proper aria attributes for accessibility', async () => {
      (axios.get as jest.Mock).mockResolvedValue(mockSuccessResponse);
      render(<LandingPage />);

      await waitFor(() => {
        const featuresSection = screen.getByTestId('features-section');
        expect(featuresSection).toHaveAttribute('aria-labelledby', 'features-heading');

        mockSuccessResponse.data.features.forEach((_, index) => {
          const featureCard = screen.getByTestId(`feature-card-${index + 1}`);
          expect(featureCard).toHaveAttribute('role', 'article');
        });
      });
    });
  });

  describe('Testimonials Section', () => {
    it('should display all testimonials with proper content', async () => {
      (axios.get as jest.Mock).mockResolvedValue(mockSuccessResponse);
      render(<LandingPage />);

      await waitFor(() => {
        mockSuccessResponse.data.testimonials.forEach(testimonial => {
          expect(screen.getByText(testimonial.quote)).toBeInTheDocument();
          expect(screen.getByText(new RegExp(`${testimonial.name}, ${testimonial.role}`))).toBeInTheDocument();
        });
      });
    });

    it('should handle empty testimonials array gracefully', async () => {
      const emptyTestimonialsResponse = {
        ...mockSuccessResponse,
        data: {
          ...mockSuccessResponse.data,
          testimonials: [],
        },
      };
      (axios.get as jest.Mock).mockResolvedValue(emptyTestimonialsResponse);
      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByText(/no testimonials available/i)).toBeInTheDocument();
      });
    });

    it('should have proper keyboard navigation for testimonial carousel', async () => {
      (axios.get as jest.Mock).mockResolvedValue(mockSuccessResponse);
      render(<LandingPage />);

      await waitFor(() => {
        const carousel = screen.getByTestId('testimonials-carousel');
        const firstTestimonial = within(carousel).getByText(mockSuccessResponse.data.testimonials[0].quote);

        // Initial focus
        firstTestimonial.focus();
        expect(firstTestimonial).toHaveFocus();

        // Right arrow key should move focus to next testimonial
        fireEvent.keyDown(carousel, { key: 'ArrowRight', code: 'ArrowRight' });
        expect(within(carousel).getByText(mockSuccessResponse.data.testimonials[1].quote)).toHaveFocus();

        // Left arrow key should move focus back to first testimonial
        fireEvent.keyDown(carousel, { key: 'ArrowLeft', code: 'ArrowLeft' });
        expect(firstTestimonial).toHaveFocus();
      });
    });
  });

  describe('Newsletter Subscription', () => {
    it('should successfully submit valid email', async () => {
      (axios.get as jest.Mock).mockResolvedValue(mockSuccessResponse);
      (axios.post as jest.Mock).mockResolvedValue({ data: { success: true } });
      render(<LandingPage />);

      await waitFor(() => {
        const emailInput = screen.getByLabelText(/email address/i);
        const submitButton = screen.getByRole('button', { name: /subscribe/i });

        userEvent.type(emailInput, 'test@example.com');
        fireEvent.click(submitButton);

        expect(axios.post).toHaveBeenCalledWith(
          expect.any(String),
          { email: 'test@example.com' },
          expect.any(Object)
        );
        expect(screen.getByText(/subscription successful/i)).toBeInTheDocument();
      });
    });

    it('should display validation error for invalid email', async () => {
      (axios.get as jest.Mock).mockResolvedValue(mockSuccessResponse);
      render(<LandingPage />);

      await waitFor(() => {
        const emailInput = screen.getByLabelText(/email address/i);
        const submitButton = screen.getByRole('button', { name: /subscribe/i });

        userEvent.type(emailInput, 'invalid-email');
        fireEvent.click(submitButton);

        expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
        expect(axios.post).not.toHaveBeenCalled();
      });
    });

    it('should display server error when subscription fails', async () => {
      (axios.get as jest.Mock).mockResolvedValue(mockSuccessResponse);
      (axios.post as jest.Mock).mockRejectedValue({
        response: {
          data: { message: 'Subscription failed' },
        },
      });
      render(<LandingPage />);

      await waitFor(() => {
        const emailInput = screen.getByLabelText(/email address/i);
        const submitButton = screen.getByRole('button', { name: /subscribe/i });

        userEvent.type(emailInput, 'test@example.com');
        fireEvent.click(submitButton);

        expect(screen.getByText(/subscription failed/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility Features', () => {
    it('should have proper aria labels for all interactive elements', async () => {
      (axios.get as jest.Mock).mockResolvedValue(mockSuccessResponse);
      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: mockSuccessResponse.data.cta.primary })).toHaveAttribute(
          'aria-label',
          expect.stringContaining('Get started with our platform')
        );

        expect(screen.getByRole('button', { name: mockSuccessResponse.data.cta.secondary })).toHaveAttribute(
          'aria-label',
          expect.stringContaining('Learn more about our features')
        );

        expect(screen.getByLabelText(/email address/i)).toHaveAttribute('aria-required', 'true');
      });
    });

    it('should have proper heading hierarchy', async () => {
      (axios.get as jest.Mock).mockResolvedValue(mockSuccessResponse);
      render(<LandingPage />);

      await waitFor(() => {
        const headings = screen.getAllByRole('heading');
        expect(headings[0]).toHaveTextContent(/welcome to our platform/i);
        expect(headings[0]).toHaveAttribute('aria-level', '1');

        expect(screen.getByRole('heading', { name: /our features/i })).toHaveAttribute('aria-level', '2');
        expect(screen.getByRole('heading', { name: /what our users say/i })).toHaveAttribute('aria-level', '2');
      });
    });

    it('should have proper focus management', async () => {
      (axios.get as jest.Mock).mockResolvedValue(mockSuccessResponse);
      render(<LandingPage />);

      await waitFor(() => {
        const primaryCTA = screen.getByRole('button', { name: mockSuccessResponse.data.cta.primary });
        primaryCTA.focus();
        expect(primaryCTA).toHaveFocus();

        // Tab should move focus to next element
        userEvent.tab();
        expect(screen.getByRole('button', { name: mockSuccessResponse.data.cta.secondary })).toHaveFocus();
      });
    });
  });

  describe('Error Boundary and Recovery', () => {
    it('should recover from error when retry button is clicked', async () => {
      (axios.get as jest.Mock)
        .mockRejectedValueOnce(mockErrorResponse)
        .mockResolvedValueOnce(mockSuccessResponse);

      render(<LandingPage />);

      // First render should show error
      await waitFor(() => {
        expect(screen.getByText(/failed to load content/i)).toBeInTheDocument();
      });

      // Click retry and verify success
      fireEvent.click(screen.getByRole('button', { name: /retry/i }));

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /welcome to our platform/i })).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Behavior', () => {
    it('should render mobile menu button on small screens', async () => {
      (axios.get as jest.Mock).mockResolvedValue(mockSuccessResponse);
      global.innerWidth = 500;
      global.dispatchEvent(new Event('resize'));

      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/menu/i)).toBeInTheDocument();
      });

      // Reset window size
      global.innerWidth = 1024;
      global.dispatchEvent(new Event('resize'));
    });

    it('should toggle mobile menu when menu button is clicked', async () => {
      (axios.get as jest.Mock).mockResolvedValue(mockSuccessResponse);
      global.innerWidth = 500;
      global.dispatchEvent(new Event('resize'));

      render(<LandingPage />);

      await waitFor(() => {
        const menuButton = screen.getByLabelText(/menu/i);
        fireEvent.click(menuButton);

        expect(screen.getByTestId('mobile-menu')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /features/i })).toBeInTheDocument();

        // Click again to close
        fireEvent.click(menuButton);
        expect(screen.queryByTestId('mobile-menu')).not.toBeInTheDocument();
      });

      // Reset window size
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

describe('Landing Page - Core Functionality', () => {
  const mockSuccessResponse = {
    data: {
      features: [
        { id: 1, title: 'Feature 1', description: 'Description 1', icon: 'icon1' },
        { id: 2, title: 'Feature 2', description: 'Description 2', icon: 'icon2' },
      ],
      testimonials: [
        { id: 1, name: 'User 1', quote: 'Great product!', role: 'Customer' },
        { id: 2, name: 'User 2', quote: 'Highly recommend', role: 'Client' },
      ],
      cta: {
        primary: 'Get Started',
        secondary: 'Learn More',
      },
    },
  };

  const mockErrorResponse = {
    response: {
      status: 500,
      data: { message: 'Server error' },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Render and Loading States', () => {
    it('should display loading skeleton while fetching data', () => {
      (axios.get as jest.Mock).mockImplementation(() => new Promise(() => {}));
      render(<LandingPage />);

      expect(screen.getByTestId('features-loading')).toBeInTheDocument();
      expect(screen.getByTestId('testimonials-loading')).toBeInTheDocument();
      expect(screen.getByTestId('hero-loading')).toBeInTheDocument();
    });

    it('should render error message when data fetch fails', async () => {
      (axios.get as jest.Mock).mockRejectedValue(mockErrorResponse);
      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load content/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });
  });

  describe('Hero Section', () => {
    it('should render hero section with proper content after successful load', async () => {
      (axios.get as jest.Mock).mockResolvedValue(mockSuccessResponse);
      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /welcome to our platform/i })).toBeInTheDocument();
        expect(screen.getByText(/discover amazing features/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: mockSuccessResponse.data.cta.primary })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: mockSuccessResponse.data.cta.secondary })).toBeInTheDocument();
      });
    });

    it('should navigate to signup page when primary CTA is clicked', async () => {
      (axios.get as jest.Mock).mockResolvedValue(mockSuccessResponse);
      render(<LandingPage />);

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: mockSuccessResponse.data.cta.primary }));
        expect(mockPush).toHaveBeenCalledWith('/signup');
      });
    });

    it('should scroll to features section when secondary CTA is clicked', async () => {
      (axios.get as jest.Mock).mockResolvedValue(mockSuccessResponse);
      render(<LandingPage />);

      const featuresSection = screen.getByTestId('features-section');
      const scrollIntoViewMock = jest.fn();
      featuresSection.scrollIntoView = scrollIntoViewMock;

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: mockSuccessResponse.data.cta.secondary }));
        expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: 'smooth' });
      });
    });
  });

  describe('Features Section', () => {
    it('should display all features with proper content', async () => {
      (axios.get as jest.Mock).mockResolvedValue(mockSuccessResponse);
      render(<LandingPage />);

      await waitFor(() => {
        mockSuccessResponse.data.features.forEach(feature => {
          expect(screen.getByText(feature.title)).toBeInTheDocument();
          expect(screen.getByText(feature.description)).toBeInTheDocument();
          expect(screen.getByTestId(`feature-icon-${feature.id}`)).toBeInTheDocument();
        });
      });
    });

    it('should have proper aria attributes for accessibility', async () => {
      (axios.get as jest.Mock).mockResolvedValue(mockSuccessResponse);
      render(<LandingPage />);

      await waitFor(() => {
        const featuresSection = screen.getByTestId('features-section');
        expect(featuresSection).toHaveAttribute('aria-labelledby', 'features-heading');

        mockSuccessResponse.data.features.forEach((_, index) => {
          const featureCard = screen.getByTestId(`feature-card-${index + 1}`);
          expect(featureCard).toHaveAttribute('role', 'article');
        });
      });
    });
  });

  describe('Testimonials Section', () => {
    it('should display all testimonials with proper content', async () => {
      (axios.get as jest.Mock).mockResolvedValue(mockSuccessResponse);
      render(<LandingPage />);

      await waitFor(() => {
        mockSuccessResponse.data.testimonials.forEach(testimonial => {
          expect(screen.getByText(testimonial.quote)).toBeInTheDocument();
          expect(screen.getByText(new RegExp(`${testimonial.name}, ${testimonial.role}`))).toBeInTheDocument();
        });
      });
    });

    it('should handle empty testimonials array gracefully', async () => {
      const emptyTestimonialsResponse = {
        ...mockSuccessResponse,
        data: {
          ...mockSuccessResponse.data,
          testimonials: [],
        },
      };
      (axios.get as jest.Mock).mockResolvedValue(emptyTestimonialsResponse);
      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByText(/no testimonials available/i)).toBeInTheDocument();
      });
    });

    it('should have proper keyboard navigation for testimonial carousel', async () => {
      (axios.get as jest.Mock).mockResolvedValue(mockSuccessResponse);
      render(<LandingPage />);

      await waitFor(() => {
        const carousel = screen.getByTestId('testimonials-carousel');
        const firstTestimonial = within(carousel).getByText(mockSuccessResponse.data.testimonials[0].quote);

        // Initial focus
        firstTestimonial.focus();
        expect(firstTestimonial).toHaveFocus();

        // Right arrow key should move focus to next testimonial
        fireEvent.keyDown(carousel, { key: 'ArrowRight', code: 'ArrowRight' });
        expect(within(carousel).getByText(mockSuccessResponse.data.testimonials[1].quote)).toHaveFocus();

        // Left arrow key should move focus back to first testimonial
        fireEvent.keyDown(carousel, { key: 'ArrowLeft', code: 'ArrowLeft' });
        expect(firstTestimonial).toHaveFocus();
      });
    });
  });

  describe('Newsletter Subscription', () => {
    it('should successfully submit valid email', async () => {
      (axios.get as jest.Mock).mockResolvedValue(mockSuccessResponse);
      (axios.post as jest.Mock).mockResolvedValue({ data: { success: true } });
      render(<LandingPage />);

      await waitFor(() => {
        const emailInput = screen.getByLabelText(/email address/i);
        const submitButton = screen.getByRole('button', { name: /subscribe/i });

        userEvent.type(emailInput, 'test@example.com');
        fireEvent.click(submitButton);

        expect(axios.post).toHaveBeenCalledWith(
          expect.any(String),
          { email: 'test@example.com' },
          expect.any(Object)
        );
        expect(screen.getByText(/subscription successful/i)).toBeInTheDocument();
      });
    });

    it('should display validation error for invalid email', async () => {
      (axios.get as jest.Mock).mockResolvedValue(mockSuccessResponse);
      render(<LandingPage />);

      await waitFor(() => {
        const emailInput = screen.getByLabelText(/email address/i);
        const submitButton = screen.getByRole('button', { name: /subscribe/i });

        userEvent.type(emailInput, 'invalid-email');
        fireEvent.click(submitButton);

        expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
        expect(axios.post).not.toHaveBeenCalled();
      });
    });

    it('should display server error when subscription fails', async () => {
      (axios.get as jest.Mock).mockResolvedValue(mockSuccessResponse);
      (axios.post as jest.Mock).mockRejectedValue({
        response: {
          data: { message: 'Subscription failed' },
        },
      });
      render(<LandingPage />);

      await waitFor(() => {
        const emailInput = screen.getByLabelText(/email address/i);
        const submitButton = screen.getByRole('button', { name: /subscribe/i });

        userEvent.type(emailInput, 'test@example.com');
        fireEvent.click(submitButton);

        expect(screen.getByText(/subscription failed/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility Features', () => {
    it('should have proper aria labels for all interactive elements', async () => {
      (axios.get as jest.Mock).mockResolvedValue(mockSuccessResponse);
      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: mockSuccessResponse.data.cta.primary })).toHaveAttribute(
          'aria-label',
          expect.stringContaining('Get started with our platform')
        );

        expect(screen.getByRole('button', { name: mockSuccessResponse.data.cta.secondary })).toHaveAttribute(
          'aria-label',
          expect.stringContaining('Learn more about our features')
        );

        expect(screen.getByLabelText(/email address/i)).toHaveAttribute('aria-required', 'true');
      });
    });

    it('should have proper heading hierarchy', async () => {
      (axios.get as jest.Mock).mockResolvedValue(mockSuccessResponse);
      render(<LandingPage />);

      await waitFor(() => {
        const headings = screen.getAllByRole('heading');
        expect(headings[0]).toHaveTextContent(/welcome to our platform/i);
        expect(headings[0]).toHaveAttribute('aria-level', '1');

        expect(screen.getByRole('heading', { name: /our features/i })).toHaveAttribute('aria-level', '2');
        expect(screen.getByRole('heading', { name: /what our users say/i })).toHaveAttribute('aria-level', '2');
      });
    });

    it('should have proper focus management', async () => {
      (axios.get as jest.Mock).mockResolvedValue(mockSuccessResponse);
      render(<LandingPage />);

      await waitFor(() => {
        const primaryCTA = screen.getByRole('button', { name: mockSuccessResponse.data.cta.primary });
        primaryCTA.focus();
        expect(primaryCTA).toHaveFocus();

        // Tab should move focus to next element
        userEvent.tab();
        expect(screen.getByRole('button', { name: mockSuccessResponse.data.cta.secondary })).toHaveFocus();
      });
    });
  });

  describe('Error Boundary and Recovery', () => {
    it('should recover from error when retry button is clicked', async () => {
      (axios.get as jest.Mock)
        .mockRejectedValueOnce(mockErrorResponse)
        .mockResolvedValueOnce(mockSuccessResponse);

      render(<LandingPage />);

      // First render should show error
      await waitFor(() => {
        expect(screen.getByText(/failed to load content/i)).toBeInTheDocument();
      });

      // Click retry and verify success
      fireEvent.click(screen.getByRole('button', { name: /retry/i }));

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /welcome to our platform/i })).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Behavior', () => {
    it('should render mobile menu button on small screens', async () => {
      (axios.get as jest.Mock).mockResolvedValue(mockSuccessResponse);
      global.innerWidth = 500;
      global.dispatchEvent(new Event('resize'));

      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/menu/i)).toBeInTheDocument();
      });

      // Reset window size
      global.innerWidth = 1024;
      global.dispatchEvent(new Event('resize'));
    });

    it('should toggle mobile menu when menu button is clicked', async () => {
      (axios.get as jest.Mock).mockResolvedValue(mockSuccessResponse);
      global.innerWidth = 500;
      global.dispatchEvent(new Event('resize'));

      render(<LandingPage />);

      await waitFor(() => {
        const menuButton = screen.getByLabelText(/menu/i);
        fireEvent.click(menuButton);

        expect(screen.getByTestId('mobile-menu')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /features/i })).toBeInTheDocument();

        // Click again to close
        fireEvent.click(menuButton);
        expect(screen.queryByTestId('mobile-menu')).not.toBeInTheDocument();
      });

      // Reset window size
      global.innerWidth = 1024;
      global.dispatchEvent(new Event('resize'));
    });
  });
});