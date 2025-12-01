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

describe('LandingPage - Core Functionality', () => {
  beforeEach(() => {
    (axios.get as jest.Mock).mockResolvedValue({ data: mockData });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Render', () => {
    it('should render loading state initially', async () => {
      (axios.get as jest.Mock).mockImplementation(() =>
        new Promise((resolve) => setTimeout(() => resolve({ data: mockData }), 1000))
      );

      render(<LandingPage />);

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      expect(screen.queryByText(mockData.hero.title)).not.toBeInTheDocument();

      await waitFor(() => {
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
        expect(screen.getByText(mockData.hero.title)).toBeInTheDocument();
      });
    });

    it('should render all main sections after data loads', async () => {
      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByText(mockData.hero.title)).toBeInTheDocument();
        expect(screen.getByText(mockData.hero.subtitle)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: mockData.hero.cta })).toBeInTheDocument();

        mockData.features.forEach(feature => {
          expect(screen.getByText(feature.title)).toBeInTheDocument();
          expect(screen.getByText(feature.description)).toBeInTheDocument();
        });

        mockData.testimonials.forEach(testimonial => {
          expect(screen.getByText(testimonial.quote)).toBeInTheDocument();
          expect(screen.getByText(`${testimonial.name}, ${testimonial.role}`)).toBeInTheDocument();
        });

        mockData.stats.forEach(stat => {
          expect(screen.getByText(stat.value)).toBeInTheDocument();
          expect(screen.getByText(stat.label)).toBeInTheDocument();
        });
      });
    });
  });

  describe('Hero Section', () => {
    it('should have proper accessibility attributes', async () => {
      render(<LandingPage />);

      await waitFor(() => {
        const heroSection = screen.getByRole('banner');
        expect(heroSection).toBeInTheDocument();
        expect(heroSection).toHaveAttribute('aria-labelledby', 'hero-title');

        const ctaButton = screen.getByRole('button', { name: mockData.hero.cta });
        expect(ctaButton).toHaveAttribute('aria-label', `Start your journey with ${mockData.hero.cta}`);
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

    it('should handle CTA button click with keyboard', async () => {
      render(<LandingPage />);

      await waitFor(async () => {
        const ctaButton = screen.getByRole('button', { name: mockData.hero.cta });
        ctaButton.focus();
        await userEvent.keyboard('{Enter}');
        expect(mockPush).toHaveBeenCalledWith('/signup');
      });
    });
  });

  describe('Features Section', () => {
    it('should display all features with proper structure', async () => {
      render(<LandingPage />);

      await waitFor(() => {
        const featuresSection = screen.getByRole('region', { name: /features/i });
        expect(featuresSection).toBeInTheDocument();

        const featureItems = within(featuresSection).getAllByRole('article');
        expect(featureItems).toHaveLength(mockData.features.length);

        mockData.features.forEach((feature, index) => {
          const featureItem = featureItems[index];
          expect(within(featureItem).getByText(feature.title)).toBeInTheDocument();
          expect(within(featureItem).getByText(feature.description)).toBeInTheDocument();
          expect(within(featureItem).getByTestId(`feature-icon-${feature.id}`)).toBeInTheDocument();
        });
      });
    });

    it('should have accessible feature cards', async () => {
      render(<LandingPage />);

      await waitFor(() => {
        const featureCards = screen.getAllByRole('article');
        featureCards.forEach((card, index) => {
          expect(card).toHaveAttribute('aria-labelledby', `feature-title-${mockData.features[index].id}`);
          expect(card).toHaveAccessibleName(mockData.features[index].title);
        });
      });
    });
  });

  describe('Testimonials Section', () => {
    it('should render testimonials with proper attribution', async () => {
      render(<LandingPage />);

      await waitFor(() => {
        const testimonialsSection = screen.getByRole('region', { name: /testimonials/i });
        expect(testimonialsSection).toBeInTheDocument();

        mockData.testimonials.forEach(testimonial => {
          const quote = screen.getByText(testimonial.quote);
          expect(quote).toBeInTheDocument();
          expect(quote).toHaveAttribute('cite', `${testimonial.name}-${testimonial.role}`);

          expect(screen.getByText(`${testimonial.name}, ${testimonial.role}`)).toBeInTheDocument();
        });
      });
    });

    it('should have proper semantic HTML for testimonials', async () => {
      render(<LandingPage />);

      await waitFor(() => {
        const testimonialItems = screen.getAllByRole('article');
        expect(testimonialItems).toHaveLength(mockData.testimonials.length);

        testimonialItems.forEach((item, index) => {
          expect(within(item).getByRole('heading')).toBeInTheDocument();
          expect(within(item).getByRole('paragraph')).toBeInTheDocument();
          expect(within(item).getByText(mockData.testimonials[index].quote)).toBeInTheDocument();
        });
      });
    });
  });

  describe('Stats Section', () => {
    it('should display all statistics with proper formatting', async () => {
      render(<LandingPage />);

      await waitFor(() => {
        const statsSection = screen.getByRole('region', { name: /statistics/i });
        expect(statsSection).toBeInTheDocument();

        mockData.stats.forEach(stat => {
          const statItem = screen.getByText(stat.value);
          expect(statItem).toBeInTheDocument();
          expect(statItem).toHaveClass('stat-value');

          expect(screen.getByText(stat.label)).toBeInTheDocument();
        });
      });
    });

    it('should have proper ARIA attributes for stats', async () => {
      render(<LandingPage />);

      await waitFor(() => {
        const statItems = screen.getAllByRole('group');
        expect(statItems).toHaveLength(mockData.stats.length);

        statItems.forEach((item, index) => {
          expect(item).toHaveAttribute('aria-labelledby', `stat-label-${mockData.stats[index].id}`);
          expect(within(item).getByText(mockData.stats[index].value)).toHaveAttribute(
            'aria-describedby',
            `stat-label-${mockData.stats[index].id}`
          );
        });
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message when data fetch fails', async () => {
      (axios.get as jest.Mock).mockRejectedValue(new Error('Network Error'));

      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument();
        expect(screen.getByText(/unable to load content/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });

    it('should retry data fetch when retry button is clicked', async () => {
      (axios.get as jest.Mock)
        .mockRejectedValueOnce(new Error('Network Error'))
        .mockResolvedValueOnce({ data: mockData });

      render(<LandingPage />);

      await waitFor(() => {
        const retryButton = screen.getByRole('button', { name: /retry/i });
        fireEvent.click(retryButton);
      });

      await waitFor(() => {
        expect(screen.getByText(mockData.hero.title)).toBeInTheDocument();
      });
    });

    it('should handle empty data response gracefully', async () => {
      (axios.get as jest.Mock).mockResolvedValue({ data: {} });

      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByText(/no content available/i)).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: mockData.hero.cta })).not.toBeInTheDocument();
      });
    });
  });

  describe('Responsive Behavior', () => {
    it('should adjust layout for mobile view', async () => {
      global.innerWidth = 500;
      global.dispatchEvent(new Event('resize'));

      render(<LandingPage />);

      await waitFor(() => {
        const featuresSection = screen.getByRole('region', { name: /features/i });
        expect(featuresSection).toHaveClass('mobile-layout');

        const featureCards = within(featuresSection).getAllByRole('article');
        featureCards.forEach(card => {
          expect(card).toHaveClass('mobile-card');
        });
      });
    });

    it('should maintain accessibility in mobile view', async () => {
      global.innerWidth = 500;
      global.dispatchEvent(new Event('resize'));

      render(<LandingPage />);

      await waitFor(() => {
        const mobileMenuButton = screen.getByLabelText(/menu/i);
        expect(mobileMenuButton).toBeInTheDocument();
        expect(mobileMenuButton).toHaveAttribute('aria-expanded', 'false');
      });
    });
  });

  describe('Navigation', () => {
    it('should scroll to features section when nav link is clicked', async () => {
      render(<LandingPage />);

      await waitFor(async () => {
        const featuresLink = screen.getByRole('link', { name: /features/i });
        featuresLink.click();

        await waitFor(() => {
          const featuresSection = screen.getByRole('region', { name: /features/i });
          expect(featuresSection).toHaveAttribute('data-active', 'true');
        });
      });
    });

    it('should highlight active navigation item', async () => {
      render(<LandingPage />);

      await waitFor(async () => {
        const featuresLink = screen.getByRole('link', { name: /features/i });
        expect(featuresLink).not.toHaveClass('active');

        featuresLink.click();
        expect(featuresLink).toHaveClass('active');
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper document structure with landmarks', async () => {
      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByRole('banner')).toBeInTheDocument();
        expect(screen.getByRole('main')).toBeInTheDocument();
        expect(screen.getByRole('contentinfo')).toBeInTheDocument();

        expect(screen.getAllByRole('region')).toHaveLength(3); // features, testimonials, stats
      });
    });

    it('should have proper heading hierarchy', async () => {
      render(<LandingPage />);

      await waitFor(() => {
        const headings = screen.getAllByRole('heading');
        expect(headings).toHaveLength(5); // h1, h2 for each section

        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(mockData.hero.title);
        expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(4); // 3 sections + hero subtitle
      });
    });

    it('should have proper ARIA labels for interactive elements', async () => {
      render(<LandingPage />);

      await waitFor(() => {
        const ctaButton = screen.getByRole('button', { name: mockData.hero.cta });
        expect(ctaButton).toHaveAttribute('aria-label');

        const navLinks = screen.getAllByRole('link');
        navLinks.forEach(link => {
          expect(link).toHaveAccessibleName();
        });
      });
    });

    it('should be navigable with keyboard only', async () => {
      render(<LandingPage />);

      await waitFor(async () => {
        // Tab through all focusable elements
        const focusableElements = [
          screen.getByRole('button', { name: mockData.hero.cta }),
          ...screen.getAllByRole('link'),
        ];

        for (const element of focusableElements) {
          await userEvent.tab();
          expect(element).toHaveFocus();
        }
      });
    });
  });

  describe('Performance', () => {
    it('should lazy load non-critical sections', async () => {
      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.queryByTestId('lazy-testimonials')).not.toBeInTheDocument();
      });

      // Simulate scrolling to trigger lazy loading
      global.dispatchEvent(new Event('scroll'));

      await waitFor(() => {
        expect(screen.getByTestId('lazy-testimonials')).toBeInTheDocument();
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

describe('LandingPage - Core Functionality', () => {
  beforeEach(() => {
    (axios.get as jest.Mock).mockResolvedValue({ data: mockData });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Render', () => {
    it('should render loading state initially', async () => {
      (axios.get as jest.Mock).mockImplementation(() =>
        new Promise((resolve) => setTimeout(() => resolve({ data: mockData }), 1000))
      );

      render(<LandingPage />);

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      expect(screen.queryByText(mockData.hero.title)).not.toBeInTheDocument();

      await waitFor(() => {
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
        expect(screen.getByText(mockData.hero.title)).toBeInTheDocument();
      });
    });

    it('should render all main sections after data loads', async () => {
      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByText(mockData.hero.title)).toBeInTheDocument();
        expect(screen.getByText(mockData.hero.subtitle)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: mockData.hero.cta })).toBeInTheDocument();

        mockData.features.forEach(feature => {
          expect(screen.getByText(feature.title)).toBeInTheDocument();
          expect(screen.getByText(feature.description)).toBeInTheDocument();
        });

        mockData.testimonials.forEach(testimonial => {
          expect(screen.getByText(testimonial.quote)).toBeInTheDocument();
          expect(screen.getByText(`${testimonial.name}, ${testimonial.role}`)).toBeInTheDocument();
        });

        mockData.stats.forEach(stat => {
          expect(screen.getByText(stat.value)).toBeInTheDocument();
          expect(screen.getByText(stat.label)).toBeInTheDocument();
        });
      });
    });
  });

  describe('Hero Section', () => {
    it('should have proper accessibility attributes', async () => {
      render(<LandingPage />);

      await waitFor(() => {
        const heroSection = screen.getByRole('banner');
        expect(heroSection).toBeInTheDocument();
        expect(heroSection).toHaveAttribute('aria-labelledby', 'hero-title');

        const ctaButton = screen.getByRole('button', { name: mockData.hero.cta });
        expect(ctaButton).toHaveAttribute('aria-label', `Start your journey with ${mockData.hero.cta}`);
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

    it('should handle CTA button click with keyboard', async () => {
      render(<LandingPage />);

      await waitFor(async () => {
        const ctaButton = screen.getByRole('button', { name: mockData.hero.cta });
        ctaButton.focus();
        await userEvent.keyboard('{Enter}');
        expect(mockPush).toHaveBeenCalledWith('/signup');
      });
    });
  });

  describe('Features Section', () => {
    it('should display all features with proper structure', async () => {
      render(<LandingPage />);

      await waitFor(() => {
        const featuresSection = screen.getByRole('region', { name: /features/i });
        expect(featuresSection).toBeInTheDocument();

        const featureItems = within(featuresSection).getAllByRole('article');
        expect(featureItems).toHaveLength(mockData.features.length);

        mockData.features.forEach((feature, index) => {
          const featureItem = featureItems[index];
          expect(within(featureItem).getByText(feature.title)).toBeInTheDocument();
          expect(within(featureItem).getByText(feature.description)).toBeInTheDocument();
          expect(within(featureItem).getByTestId(`feature-icon-${feature.id}`)).toBeInTheDocument();
        });
      });
    });

    it('should have accessible feature cards', async () => {
      render(<LandingPage />);

      await waitFor(() => {
        const featureCards = screen.getAllByRole('article');
        featureCards.forEach((card, index) => {
          expect(card).toHaveAttribute('aria-labelledby', `feature-title-${mockData.features[index].id}`);
          expect(card).toHaveAccessibleName(mockData.features[index].title);
        });
      });
    });
  });

  describe('Testimonials Section', () => {
    it('should render testimonials with proper attribution', async () => {
      render(<LandingPage />);

      await waitFor(() => {
        const testimonialsSection = screen.getByRole('region', { name: /testimonials/i });
        expect(testimonialsSection).toBeInTheDocument();

        mockData.testimonials.forEach(testimonial => {
          const quote = screen.getByText(testimonial.quote);
          expect(quote).toBeInTheDocument();
          expect(quote).toHaveAttribute('cite', `${testimonial.name}-${testimonial.role}`);

          expect(screen.getByText(`${testimonial.name}, ${testimonial.role}`)).toBeInTheDocument();
        });
      });
    });

    it('should have proper semantic HTML for testimonials', async () => {
      render(<LandingPage />);

      await waitFor(() => {
        const testimonialItems = screen.getAllByRole('article');
        expect(testimonialItems).toHaveLength(mockData.testimonials.length);

        testimonialItems.forEach((item, index) => {
          expect(within(item).getByRole('heading')).toBeInTheDocument();
          expect(within(item).getByRole('paragraph')).toBeInTheDocument();
          expect(within(item).getByText(mockData.testimonials[index].quote)).toBeInTheDocument();
        });
      });
    });
  });

  describe('Stats Section', () => {
    it('should display all statistics with proper formatting', async () => {
      render(<LandingPage />);

      await waitFor(() => {
        const statsSection = screen.getByRole('region', { name: /statistics/i });
        expect(statsSection).toBeInTheDocument();

        mockData.stats.forEach(stat => {
          const statItem = screen.getByText(stat.value);
          expect(statItem).toBeInTheDocument();
          expect(statItem).toHaveClass('stat-value');

          expect(screen.getByText(stat.label)).toBeInTheDocument();
        });
      });
    });

    it('should have proper ARIA attributes for stats', async () => {
      render(<LandingPage />);

      await waitFor(() => {
        const statItems = screen.getAllByRole('group');
        expect(statItems).toHaveLength(mockData.stats.length);

        statItems.forEach((item, index) => {
          expect(item).toHaveAttribute('aria-labelledby', `stat-label-${mockData.stats[index].id}`);
          expect(within(item).getByText(mockData.stats[index].value)).toHaveAttribute(
            'aria-describedby',
            `stat-label-${mockData.stats[index].id}`
          );
        });
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message when data fetch fails', async () => {
      (axios.get as jest.Mock).mockRejectedValue(new Error('Network Error'));

      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument();
        expect(screen.getByText(/unable to load content/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });

    it('should retry data fetch when retry button is clicked', async () => {
      (axios.get as jest.Mock)
        .mockRejectedValueOnce(new Error('Network Error'))
        .mockResolvedValueOnce({ data: mockData });

      render(<LandingPage />);

      await waitFor(() => {
        const retryButton = screen.getByRole('button', { name: /retry/i });
        fireEvent.click(retryButton);
      });

      await waitFor(() => {
        expect(screen.getByText(mockData.hero.title)).toBeInTheDocument();
      });
    });

    it('should handle empty data response gracefully', async () => {
      (axios.get as jest.Mock).mockResolvedValue({ data: {} });

      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByText(/no content available/i)).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: mockData.hero.cta })).not.toBeInTheDocument();
      });
    });
  });

  describe('Responsive Behavior', () => {
    it('should adjust layout for mobile view', async () => {
      global.innerWidth = 500;
      global.dispatchEvent(new Event('resize'));

      render(<LandingPage />);

      await waitFor(() => {
        const featuresSection = screen.getByRole('region', { name: /features/i });
        expect(featuresSection).toHaveClass('mobile-layout');

        const featureCards = within(featuresSection).getAllByRole('article');
        featureCards.forEach(card => {
          expect(card).toHaveClass('mobile-card');
        });
      });
    });

    it('should maintain accessibility in mobile view', async () => {
      global.innerWidth = 500;
      global.dispatchEvent(new Event('resize'));

      render(<LandingPage />);

      await waitFor(() => {
        const mobileMenuButton = screen.getByLabelText(/menu/i);
        expect(mobileMenuButton).toBeInTheDocument();
        expect(mobileMenuButton).toHaveAttribute('aria-expanded', 'false');
      });
    });
  });

  describe('Navigation', () => {
    it('should scroll to features section when nav link is clicked', async () => {
      render(<LandingPage />);

      await waitFor(async () => {
        const featuresLink = screen.getByRole('link', { name: /features/i });
        featuresLink.click();

        await waitFor(() => {
          const featuresSection = screen.getByRole('region', { name: /features/i });
          expect(featuresSection).toHaveAttribute('data-active', 'true');
        });
      });
    });

    it('should highlight active navigation item', async () => {
      render(<LandingPage />);

      await waitFor(async () => {
        const featuresLink = screen.getByRole('link', { name: /features/i });
        expect(featuresLink).not.toHaveClass('active');

        featuresLink.click();
        expect(featuresLink).toHaveClass('active');
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper document structure with landmarks', async () => {
      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByRole('banner')).toBeInTheDocument();
        expect(screen.getByRole('main')).toBeInTheDocument();
        expect(screen.getByRole('contentinfo')).toBeInTheDocument();

        expect(screen.getAllByRole('region')).toHaveLength(3); // features, testimonials, stats
      });
    });

    it('should have proper heading hierarchy', async () => {
      render(<LandingPage />);

      await waitFor(() => {
        const headings = screen.getAllByRole('heading');
        expect(headings).toHaveLength(5); // h1, h2 for each section

        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(mockData.hero.title);
        expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(4); // 3 sections + hero subtitle
      });
    });

    it('should have proper ARIA labels for interactive elements', async () => {
      render(<LandingPage />);

      await waitFor(() => {
        const ctaButton = screen.getByRole('button', { name: mockData.hero.cta });
        expect(ctaButton).toHaveAttribute('aria-label');

        const navLinks = screen.getAllByRole('link');
        navLinks.forEach(link => {
          expect(link).toHaveAccessibleName();
        });
      });
    });

    it('should be navigable with keyboard only', async () => {
      render(<LandingPage />);

      await waitFor(async () => {
        // Tab through all focusable elements
        const focusableElements = [
          screen.getByRole('button', { name: mockData.hero.cta }),
          ...screen.getAllByRole('link'),
        ];

        for (const element of focusableElements) {
          await userEvent.tab();
          expect(element).toHaveFocus();
        }
      });
    });
  });

  describe('Performance', () => {
    it('should lazy load non-critical sections', async () => {
      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.queryByTestId('lazy-testimonials')).not.toBeInTheDocument();
      });

      // Simulate scrolling to trigger lazy loading
      global.dispatchEvent(new Event('scroll'));

      await waitFor(() => {
        expect(screen.getByTestId('lazy-testimonials')).toBeInTheDocument();
      });
    });
  });
});