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

const mockData = {
  hero: {
    title: 'Welcome to Our Platform',
    subtitle: 'Discover amazing features',
    cta: 'Get Started',
  },
  features: [
    { id: 1, title: 'Feature 1', description: 'Description 1', icon: 'icon1' },
    { id: 2, title: 'Feature 2', description: 'Description 2', icon: 'icon2' },
  ],
  testimonials: [
    { id: 1, name: 'User 1', quote: 'Great product!', role: 'Customer' },
    { id: 2, name: 'User 2', quote: 'Highly recommend', role: 'Client' },
  ],
  stats: [
    { id: 1, value: '10K+', label: 'Happy Customers' },
    { id: 2, value: '100+', label: 'Features' },
  ],
};

describe('Landing Page - Core Functionality', () => {
  beforeEach(() => {
    (axios.get as jest.Mock).mockResolvedValue({ data: mockData });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Render and Loading States', () => {
    it('should display loading skeleton while data is being fetched', async () => {
      (axios.get as jest.Mock).mockImplementation(() =>
        new Promise((resolve) => setTimeout(() => resolve({ data: mockData }), 1000))
      );

      render(<LandingPage />);

      expect(screen.getByTestId('hero-skeleton')).toBeInTheDocument();
      expect(screen.getByTestId('features-skeleton')).toBeInTheDocument();
      expect(screen.getByTestId('testimonials-skeleton')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.queryByTestId('hero-skeleton')).not.toBeInTheDocument();
      });
    });

    it('should render all sections after successful data fetch', async () => {
      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByText(mockData.hero.title)).toBeInTheDocument();
        expect(screen.getByText(mockData.hero.subtitle)).toBeInTheDocument();
        expect(screen.getByText(mockData.features[0].title)).toBeInTheDocument();
        expect(screen.getByText(mockData.testimonials[0].quote)).toBeInTheDocument();
        expect(screen.getByText(mockData.stats[0].value)).toBeInTheDocument();
      });
    });
  });

  describe('Hero Section', () => {
    it('should display hero content correctly', async () => {
      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: mockData.hero.title })).toBeInTheDocument();
        expect(screen.getByText(mockData.hero.subtitle)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: mockData.hero.cta })).toBeInTheDocument();
      });
    });

    it('should navigate to signup page when CTA button is clicked', async () => {
      render(<LandingPage />);

      await waitFor(() => {
        const ctaButton = screen.getByRole('button', { name: mockData.hero.cta });
        fireEvent.click(ctaButton);
        expect(mockPush).toHaveBeenCalledWith('/signup');
      });
    });

    it('should have proper accessibility attributes in hero section', async () => {
      render(<LandingPage />);

      await waitFor(() => {
        const heroSection = screen.getByRole('region', { name: /hero section/i });
        expect(heroSection).toHaveAttribute('aria-labelledby', expect.any(String));

        const heading = within(heroSection).getByRole('heading');
        expect(heading).toHaveAttribute('id');
      });
    });
  });

  describe('Features Section', () => {
    it('should display all features with correct content', async () => {
      render(<LandingPage />);

      await waitFor(() => {
        mockData.features.forEach((feature) => {
          expect(screen.getByText(feature.title)).toBeInTheDocument();
          expect(screen.getByText(feature.description)).toBeInTheDocument();
        });
      });
    });

    it('should have proper accessibility attributes for each feature', async () => {
      render(<LandingPage />);

      await waitFor(() => {
        const features = screen.getAllByRole('region', { name: /feature/i });
        expect(features).toHaveLength(mockData.features.length);

        features.forEach((feature, index) => {
          expect(feature).toHaveAttribute('aria-labelledby');
          const heading = within(feature).getByRole('heading');
          expect(heading).toHaveAttribute('id');
        });
      });
    });

    it('should handle empty features array gracefully', async () => {
      (axios.get as jest.Mock).mockResolvedValueOnce({
        data: { ...mockData, features: [] }
      });

      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByText(/no features available/i)).toBeInTheDocument();
      });
    });
  });

  describe('Testimonials Section', () => {
    it('should display all testimonials with proper attribution', async () => {
      render(<LandingPage />);

      await waitFor(() => {
        mockData.testimonials.forEach((testimonial) => {
          expect(screen.getByText(testimonial.quote)).toBeInTheDocument();
          expect(screen.getByText(`${testimonial.name}, ${testimonial.role}`)).toBeInTheDocument();
        });
      });
    });

    it('should have proper aria labels for testimonial navigation', async () => {
      render(<LandingPage />);

      await waitFor(() => {
        const prevButton = screen.getByLabelText(/previous testimonial/i);
        const nextButton = screen.getByLabelText(/next testimonial/i);

        expect(prevButton).toBeInTheDocument();
        expect(nextButton).toBeInTheDocument();
      });
    });

    it('should cycle through testimonials when navigation buttons are clicked', async () => {
      render(<LandingPage />);

      await waitFor(async () => {
        const user = userEvent.setup();
        const nextButton = screen.getByLabelText(/next testimonial/i);

        // Initial testimonial
        expect(screen.getByText(mockData.testimonials[0].quote)).toBeInTheDocument();

        // Click next
        await user.click(nextButton);
        expect(screen.getByText(mockData.testimonials[1].quote)).toBeInTheDocument();

        // Click next again (should wrap around)
        await user.click(nextButton);
        expect(screen.getByText(mockData.testimonials[0].quote)).toBeInTheDocument();
      });
    });
  });

  describe('Stats Section', () => {
    it('should display all statistics with proper formatting', async () => {
      render(<LandingPage />);

      await waitFor(() => {
        mockData.stats.forEach((stat) => {
          expect(screen.getByText(stat.value)).toBeInTheDocument();
          expect(screen.getByText(stat.label)).toBeInTheDocument();
        });
      });
    });

    it('should have proper aria labels for stats', async () => {
      render(<LandingPage />);

      await waitFor(() => {
        const stats = screen.getAllByRole('region', { name: /statistic/i });
        expect(stats).toHaveLength(mockData.stats.length);

        stats.forEach((stat) => {
          expect(stat).toHaveAttribute('aria-labelledby');
        });
      });
    });
  });

  describe('Newsletter Signup', () => {
    it('should validate email input and show error for invalid email', async () => {
      render(<LandingPage />);

      await waitFor(async () => {
        const user = userEvent.setup();
        const emailInput = screen.getByLabelText(/email address/i);
        const submitButton = screen.getByRole('button', { name: /subscribe/i });

        await user.type(emailInput, 'invalid-email');
        await user.click(submitButton);

        expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
      });
    });

    it('should show success message on valid submission', async () => {
      (axios.post as jest.Mock).mockResolvedValueOnce({});

      render(<LandingPage />);

      await waitFor(async () => {
        const user = userEvent.setup();
        const emailInput = screen.getByLabelText(/email address/i);
        const submitButton = screen.getByRole('button', { name: /subscribe/i });

        await user.type(emailInput, 'valid@example.com');
        await user.click(submitButton);

        expect(await screen.findByText(/thank you for subscribing/i)).toBeInTheDocument();
      });
    });

    it('should show error message when submission fails', async () => {
      (axios.post as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      render(<LandingPage />);

      await waitFor(async () => {
        const user = userEvent.setup();
        const emailInput = screen.getByLabelText(/email address/i);
        const submitButton = screen.getByRole('button', { name: /subscribe/i });

        await user.type(emailInput, 'valid@example.com');
        await user.click(submitButton);

        expect(await screen.findByText(/there was an error processing your request/i)).toBeInTheDocument();
      });
    });

    it('should have proper accessibility attributes for newsletter form', async () => {
      render(<LandingPage />);

      await waitFor(() => {
        const form = screen.getByRole('form', { name: /newsletter signup/i });
        expect(form).toHaveAttribute('aria-labelledby');

        const heading = screen.getByRole('heading', { name: /subscribe to our newsletter/i });
        expect(heading).toHaveAttribute('id');
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message when data fetch fails', async () => {
      (axios.get as jest.Mock).mockRejectedValueOnce(new Error('Failed to fetch'));

      render(<LandingPage />);

      expect(await screen.findByText(/we're having trouble loading the page/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('should retry data fetch when retry button is clicked', async () => {
      (axios.get as jest.Mock)
        .mockRejectedValueOnce(new Error('Failed to fetch'))
        .mockResolvedValueOnce({ data: mockData });

      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByText(/we're having trouble loading the page/i)).toBeInTheDocument();
      });

      const user = userEvent.setup();
      await user.click(screen.getByRole('button', { name: /retry/i }));

      await waitFor(() => {
        expect(screen.getByText(mockData.hero.title)).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Behavior', () => {
    it('should render mobile navigation menu when viewport is small', async () => {
      global.innerWidth = 500;
      global.dispatchEvent(new Event('resize'));

      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/main menu/i)).toBeInTheDocument();
        expect(screen.queryByTestId('desktop-nav')).not.toBeInTheDocument();
      });

      global.innerWidth = 1024;
      global.dispatchEvent(new Event('resize'));
    });

    it('should render desktop navigation when viewport is large', async () => {
      global.innerWidth = 1024;
      global.dispatchEvent(new Event('resize'));

      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByTestId('desktop-nav')).toBeInTheDocument();
        expect(screen.queryByLabelText(/main menu/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper document structure with landmark roles', async () => {
      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByRole('banner')).toBeInTheDocument();
        expect(screen.getByRole('main')).toBeInTheDocument();
        expect(screen.getByRole('contentinfo')).toBeInTheDocument();
      });
    });

    it('should have proper heading hierarchy', async () => {
      render(<LandingPage />);

      await waitFor(() => {
        const headings = screen.getAllByRole('heading');
        const h1 = headings.filter(h => h.tagName === 'H1');
        const h2 = headings.filter(h => h.tagName === 'H2');
        const h3 = headings.filter(h => h.tagName === 'H3');

        expect(h1).toHaveLength(1);
        expect(h2).toHaveLengthGreaterThan(0);
        expect(h3).toHaveLengthGreaterThan(0);
      });
    });

    it('should have proper aria-labels for interactive elements', async () => {
      render(<LandingPage />);

      await waitFor(() => {
        const interactiveElements = screen.getAllByRole('button');
        interactiveElements.forEach(element => {
          expect(element).toHaveAccessibleName();
        });
      });
    });

    it('should have proper focus management', async () => {
      render(<LandingPage />);

      await waitFor(() => {
        const skipLink = screen.getByRole('link', { name: /skip to main content/i });
        expect(skipLink).toHaveAttribute('href', '#main-content');

        const mainContent = screen.getByRole('main', { name: /main content/i });
        expect(mainContent).toHaveAttribute('id', 'main-content');
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

const mockData = {
  hero: {
    title: 'Welcome to Our Platform',
    subtitle: 'Discover amazing features',
    cta: 'Get Started',
  },
  features: [
    { id: 1, title: 'Feature 1', description: 'Description 1', icon: 'icon1' },
    { id: 2, title: 'Feature 2', description: 'Description 2', icon: 'icon2' },
  ],
  testimonials: [
    { id: 1, name: 'User 1', quote: 'Great product!', role: 'Customer' },
    { id: 2, name: 'User 2', quote: 'Highly recommend', role: 'Client' },
  ],
  stats: [
    { id: 1, value: '10K+', label: 'Happy Customers' },
    { id: 2, value: '100+', label: 'Features' },
  ],
};

describe('Landing Page - Core Functionality', () => {
  beforeEach(() => {
    (axios.get as jest.Mock).mockResolvedValue({ data: mockData });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Render and Loading States', () => {
    it('should display loading skeleton while data is being fetched', async () => {
      (axios.get as jest.Mock).mockImplementation(() =>
        new Promise((resolve) => setTimeout(() => resolve({ data: mockData }), 1000))
      );

      render(<LandingPage />);

      expect(screen.getByTestId('hero-skeleton')).toBeInTheDocument();
      expect(screen.getByTestId('features-skeleton')).toBeInTheDocument();
      expect(screen.getByTestId('testimonials-skeleton')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.queryByTestId('hero-skeleton')).not.toBeInTheDocument();
      });
    });

    it('should render all sections after successful data fetch', async () => {
      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByText(mockData.hero.title)).toBeInTheDocument();
        expect(screen.getByText(mockData.hero.subtitle)).toBeInTheDocument();
        expect(screen.getByText(mockData.features[0].title)).toBeInTheDocument();
        expect(screen.getByText(mockData.testimonials[0].quote)).toBeInTheDocument();
        expect(screen.getByText(mockData.stats[0].value)).toBeInTheDocument();
      });
    });
  });

  describe('Hero Section', () => {
    it('should display hero content correctly', async () => {
      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: mockData.hero.title })).toBeInTheDocument();
        expect(screen.getByText(mockData.hero.subtitle)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: mockData.hero.cta })).toBeInTheDocument();
      });
    });

    it('should navigate to signup page when CTA button is clicked', async () => {
      render(<LandingPage />);

      await waitFor(() => {
        const ctaButton = screen.getByRole('button', { name: mockData.hero.cta });
        fireEvent.click(ctaButton);
        expect(mockPush).toHaveBeenCalledWith('/signup');
      });
    });

    it('should have proper accessibility attributes in hero section', async () => {
      render(<LandingPage />);

      await waitFor(() => {
        const heroSection = screen.getByRole('region', { name: /hero section/i });
        expect(heroSection).toHaveAttribute('aria-labelledby', expect.any(String));

        const heading = within(heroSection).getByRole('heading');
        expect(heading).toHaveAttribute('id');
      });
    });
  });

  describe('Features Section', () => {
    it('should display all features with correct content', async () => {
      render(<LandingPage />);

      await waitFor(() => {
        mockData.features.forEach((feature) => {
          expect(screen.getByText(feature.title)).toBeInTheDocument();
          expect(screen.getByText(feature.description)).toBeInTheDocument();
        });
      });
    });

    it('should have proper accessibility attributes for each feature', async () => {
      render(<LandingPage />);

      await waitFor(() => {
        const features = screen.getAllByRole('region', { name: /feature/i });
        expect(features).toHaveLength(mockData.features.length);

        features.forEach((feature, index) => {
          expect(feature).toHaveAttribute('aria-labelledby');
          const heading = within(feature).getByRole('heading');
          expect(heading).toHaveAttribute('id');
        });
      });
    });

    it('should handle empty features array gracefully', async () => {
      (axios.get as jest.Mock).mockResolvedValueOnce({
        data: { ...mockData, features: [] }
      });

      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByText(/no features available/i)).toBeInTheDocument();
      });
    });
  });

  describe('Testimonials Section', () => {
    it('should display all testimonials with proper attribution', async () => {
      render(<LandingPage />);

      await waitFor(() => {
        mockData.testimonials.forEach((testimonial) => {
          expect(screen.getByText(testimonial.quote)).toBeInTheDocument();
          expect(screen.getByText(`${testimonial.name}, ${testimonial.role}`)).toBeInTheDocument();
        });
      });
    });

    it('should have proper aria labels for testimonial navigation', async () => {
      render(<LandingPage />);

      await waitFor(() => {
        const prevButton = screen.getByLabelText(/previous testimonial/i);
        const nextButton = screen.getByLabelText(/next testimonial/i);

        expect(prevButton).toBeInTheDocument();
        expect(nextButton).toBeInTheDocument();
      });
    });

    it('should cycle through testimonials when navigation buttons are clicked', async () => {
      render(<LandingPage />);

      await waitFor(async () => {
        const user = userEvent.setup();
        const nextButton = screen.getByLabelText(/next testimonial/i);

        // Initial testimonial
        expect(screen.getByText(mockData.testimonials[0].quote)).toBeInTheDocument();

        // Click next
        await user.click(nextButton);
        expect(screen.getByText(mockData.testimonials[1].quote)).toBeInTheDocument();

        // Click next again (should wrap around)
        await user.click(nextButton);
        expect(screen.getByText(mockData.testimonials[0].quote)).toBeInTheDocument();
      });
    });
  });

  describe('Stats Section', () => {
    it('should display all statistics with proper formatting', async () => {
      render(<LandingPage />);

      await waitFor(() => {
        mockData.stats.forEach((stat) => {
          expect(screen.getByText(stat.value)).toBeInTheDocument();
          expect(screen.getByText(stat.label)).toBeInTheDocument();
        });
      });
    });

    it('should have proper aria labels for stats', async () => {
      render(<LandingPage />);

      await waitFor(() => {
        const stats = screen.getAllByRole('region', { name: /statistic/i });
        expect(stats).toHaveLength(mockData.stats.length);

        stats.forEach((stat) => {
          expect(stat).toHaveAttribute('aria-labelledby');
        });
      });
    });
  });

  describe('Newsletter Signup', () => {
    it('should validate email input and show error for invalid email', async () => {
      render(<LandingPage />);

      await waitFor(async () => {
        const user = userEvent.setup();
        const emailInput = screen.getByLabelText(/email address/i);
        const submitButton = screen.getByRole('button', { name: /subscribe/i });

        await user.type(emailInput, 'invalid-email');
        await user.click(submitButton);

        expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
      });
    });

    it('should show success message on valid submission', async () => {
      (axios.post as jest.Mock).mockResolvedValueOnce({});

      render(<LandingPage />);

      await waitFor(async () => {
        const user = userEvent.setup();
        const emailInput = screen.getByLabelText(/email address/i);
        const submitButton = screen.getByRole('button', { name: /subscribe/i });

        await user.type(emailInput, 'valid@example.com');
        await user.click(submitButton);

        expect(await screen.findByText(/thank you for subscribing/i)).toBeInTheDocument();
      });
    });

    it('should show error message when submission fails', async () => {
      (axios.post as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      render(<LandingPage />);

      await waitFor(async () => {
        const user = userEvent.setup();
        const emailInput = screen.getByLabelText(/email address/i);
        const submitButton = screen.getByRole('button', { name: /subscribe/i });

        await user.type(emailInput, 'valid@example.com');
        await user.click(submitButton);

        expect(await screen.findByText(/there was an error processing your request/i)).toBeInTheDocument();
      });
    });

    it('should have proper accessibility attributes for newsletter form', async () => {
      render(<LandingPage />);

      await waitFor(() => {
        const form = screen.getByRole('form', { name: /newsletter signup/i });
        expect(form).toHaveAttribute('aria-labelledby');

        const heading = screen.getByRole('heading', { name: /subscribe to our newsletter/i });
        expect(heading).toHaveAttribute('id');
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message when data fetch fails', async () => {
      (axios.get as jest.Mock).mockRejectedValueOnce(new Error('Failed to fetch'));

      render(<LandingPage />);

      expect(await screen.findByText(/we're having trouble loading the page/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('should retry data fetch when retry button is clicked', async () => {
      (axios.get as jest.Mock)
        .mockRejectedValueOnce(new Error('Failed to fetch'))
        .mockResolvedValueOnce({ data: mockData });

      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByText(/we're having trouble loading the page/i)).toBeInTheDocument();
      });

      const user = userEvent.setup();
      await user.click(screen.getByRole('button', { name: /retry/i }));

      await waitFor(() => {
        expect(screen.getByText(mockData.hero.title)).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Behavior', () => {
    it('should render mobile navigation menu when viewport is small', async () => {
      global.innerWidth = 500;
      global.dispatchEvent(new Event('resize'));

      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/main menu/i)).toBeInTheDocument();
        expect(screen.queryByTestId('desktop-nav')).not.toBeInTheDocument();
      });

      global.innerWidth = 1024;
      global.dispatchEvent(new Event('resize'));
    });

    it('should render desktop navigation when viewport is large', async () => {
      global.innerWidth = 1024;
      global.dispatchEvent(new Event('resize'));

      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByTestId('desktop-nav')).toBeInTheDocument();
        expect(screen.queryByLabelText(/main menu/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper document structure with landmark roles', async () => {
      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByRole('banner')).toBeInTheDocument();
        expect(screen.getByRole('main')).toBeInTheDocument();
        expect(screen.getByRole('contentinfo')).toBeInTheDocument();
      });
    });

    it('should have proper heading hierarchy', async () => {
      render(<LandingPage />);

      await waitFor(() => {
        const headings = screen.getAllByRole('heading');
        const h1 = headings.filter(h => h.tagName === 'H1');
        const h2 = headings.filter(h => h.tagName === 'H2');
        const h3 = headings.filter(h => h.tagName === 'H3');

        expect(h1).toHaveLength(1);
        expect(h2).toHaveLengthGreaterThan(0);
        expect(h3).toHaveLengthGreaterThan(0);
      });
    });

    it('should have proper aria-labels for interactive elements', async () => {
      render(<LandingPage />);

      await waitFor(() => {
        const interactiveElements = screen.getAllByRole('button');
        interactiveElements.forEach(element => {
          expect(element).toHaveAccessibleName();
        });
      });
    });

    it('should have proper focus management', async () => {
      render(<LandingPage />);

      await waitFor(() => {
        const skipLink = screen.getByRole('link', { name: /skip to main content/i });
        expect(skipLink).toHaveAttribute('href', '#main-content');

        const mainContent = screen.getByRole('main', { name: /main content/i });
        expect(mainContent).toHaveAttribute('id', 'main-content');
      });
    });
  });
});