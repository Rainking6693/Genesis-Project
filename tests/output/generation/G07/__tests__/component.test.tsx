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
    { id: 2, name: 'User 2', quote: 'Changed my life!', role: 'Client' },
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

    it('should render all sections when data is loaded successfully', async () => {
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

  describe('Error Handling', () => {
    it('should display error message when data fetching fails', async () => {
      (axios.get as jest.Mock).mockRejectedValue(new Error('Network Error'));

      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });

    it('should retry data fetching when retry button is clicked', async () => {
      (axios.get as jest.Mock)
        .mockRejectedValueOnce(new Error('Network Error'))
        .mockResolvedValueOnce({ data: mockData });

      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /retry/i }));

      await waitFor(() => {
        expect(screen.getByText(mockData.hero.title)).toBeInTheDocument();
      });
    });
  });

  describe('User Interactions', () => {
    it('should navigate to signup page when CTA button is clicked', async () => {
      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: mockData.hero.cta })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: mockData.hero.cta }));

      expect(mockPush).toHaveBeenCalledWith('/signup');
    });

    it('should scroll to features section when "Learn More" button is clicked', async () => {
      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /learn more/i })).toBeInTheDocument();
      });

      const featuresSection = screen.getByRole('region', { name: /features/i });
      const learnMoreButton = screen.getByRole('button', { name: /learn more/i });

      Object.defineProperty(featuresSection, 'offsetTop', { value: 500 });
      Object.defineProperty(window, 'scrollTo', { value: jest.fn(), writable: true });

      fireEvent.click(learnMoreButton);

      expect(window.scrollTo).toHaveBeenCalledWith({
        top: 500,
        behavior: 'smooth',
      });
    });

    it('should open and close mobile menu when menu button is clicked', async () => {
      render(<LandingPage />);

      const menuButton = screen.getByLabelText(/open menu/i);
      expect(screen.queryByRole('navigation', { name: /mobile/i })).not.toBeInTheDocument();

      fireEvent.click(menuButton);
      expect(screen.getByRole('navigation', { name: /mobile/i })).toBeInTheDocument();

      const closeButton = screen.getByLabelText(/close menu/i);
      fireEvent.click(closeButton);
      expect(screen.queryByRole('navigation', { name: /mobile/i })).not.toBeInTheDocument();
    });

    it('should navigate to feature details when feature card is clicked', async () => {
      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getAllByRole('article', { name: /feature/i })[0]).toBeInTheDocument();
      });

      const firstFeature = screen.getAllByRole('article', { name: /feature/i })[0];
      fireEvent.click(within(firstFeature).getByRole('link'));

      expect(mockPush).toHaveBeenCalledWith(`/features/${mockData.features[0].id}`);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes for screen readers', async () => {
      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByRole('banner')).toBeInTheDocument();
        expect(screen.getByRole('main')).toBeInTheDocument();
        expect(screen.getByRole('region', { name: /hero/i })).toBeInTheDocument();
        expect(screen.getByRole('region', { name: /features/i })).toBeInTheDocument();
        expect(screen.getByRole('region', { name: /testimonials/i })).toBeInTheDocument();
        expect(screen.getByRole('region', { name: /statistics/i })).toBeInTheDocument();
      });
    });

    it('should have proper contrast ratios for text elements', async () => {
      render(<LandingPage />);

      await waitFor(() => {
        const heroTitle = screen.getByText(mockData.hero.title);
        expect(heroTitle).toHaveStyle('color: rgb(17, 24, 39)');

        const ctaButton = screen.getByRole('button', { name: mockData.hero.cta });
        expect(ctaButton).toHaveStyle('color: rgb(255, 255, 255)');
        expect(ctaButton).toHaveStyle('background-color: rgb(59, 130, 246)');
      });
    });

    it('should be navigable using keyboard only', async () => {
      render(<LandingPage />);

      await waitFor(() => {
        const ctaButton = screen.getByRole('button', { name: mockData.hero.cta });
        const learnMoreButton = screen.getByRole('button', { name: /learn more/i });

        expect(ctaButton).toHaveAttribute('tabindex', '0');
        expect(learnMoreButton).toHaveAttribute('tabindex', '0');

        userEvent.tab();
        expect(ctaButton).toHaveFocus();

        userEvent.tab();
        expect(learnMoreButton).toHaveFocus();
      });
    });

    it('should have proper alt text for images', async () => {
      render(<LandingPage />);

      await waitFor(() => {
        const featureImages = screen.getAllByRole('img', { name: /feature icon/i });
        expect(featureImages).toHaveLength(mockData.features.length);

        featureImages.forEach((img, index) => {
          expect(img).toHaveAttribute('alt', `Feature icon for ${mockData.features[index].title}`);
        });
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty features array gracefully', async () => {
      (axios.get as jest.Mock).mockResolvedValue({
        data: {
          ...mockData,
          features: [],
        },
      });

      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByText(/no features available/i)).toBeInTheDocument();
      });
    });

    it('should handle empty testimonials array gracefully', async () => {
      (axios.get as jest.Mock).mockResolvedValue({
        data: {
          ...mockData,
          testimonials: [],
        },
      });

      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByText(/no testimonials yet/i)).toBeInTheDocument();
      });
    });

    it('should truncate long feature descriptions with "read more" option', async () => {
      const longDescription = 'a'.repeat(200);
      (axios.get as jest.Mock).mockResolvedValue({
        data: {
          ...mockData,
          features: [
            {
              ...mockData.features[0],
              description: longDescription,
            },
          ],
        },
      });

      render(<LandingPage />);

      await waitFor(() => {
        const description = screen.getByText(new RegExp(`${longDescription.substring(0, 100)}.*`));
        expect(description).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /read more/i })).toBeInTheDocument();
      });
    });

    it('should handle very long hero title with proper text wrapping', async () => {
      const longTitle = 'Super Amazing Platform That Will Change Your Life Forever and Beyond'.repeat(2);
      (axios.get as jest.Mock).mockResolvedValue({
        data: {
          ...mockData,
          hero: {
            ...mockData.hero,
            title: longTitle,
          },
        },
      });

      render(<LandingPage />);

      await waitFor(() => {
        const titleElement = screen.getByText(longTitle);
        expect(titleElement).toHaveStyle('word-break: break-word');
        expect(titleElement).toHaveStyle('white-space: normal');
      });
    });
  });

  describe('Responsive Behavior', () => {
    it('should render mobile layout at small screen sizes', async () => {
      global.innerWidth = 600;
      global.dispatchEvent(new Event('resize'));

      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/mobile menu/i)).toBeInTheDocument();
        expect(screen.queryByRole('navigation', { name: /desktop/i })).not.toBeInTheDocument();

        const featureCards = screen.getAllByRole('article', { name: /feature/i });
        featureCards.forEach(card => {
          expect(card).toHaveStyle('width: 100%');
        });
      });
    });

    it('should render desktop layout at large screen sizes', async () => {
      global.innerWidth = 1200;
      global.dispatchEvent(new Event('resize'));

      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.queryByLabelText(/mobile menu/i)).not.toBeInTheDocument();
        expect(screen.getByRole('navigation', { name: /desktop/i })).toBeInTheDocument();

        const featureCards = screen.getAllByRole('article', { name: /feature/i });
        featureCards.forEach(card => {
          expect(card).toHaveStyle('width: 48%');
        });
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
    { id: 2, name: 'User 2', quote: 'Changed my life!', role: 'Client' },
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

    it('should render all sections when data is loaded successfully', async () => {
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

  describe('Error Handling', () => {
    it('should display error message when data fetching fails', async () => {
      (axios.get as jest.Mock).mockRejectedValue(new Error('Network Error'));

      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });

    it('should retry data fetching when retry button is clicked', async () => {
      (axios.get as jest.Mock)
        .mockRejectedValueOnce(new Error('Network Error'))
        .mockResolvedValueOnce({ data: mockData });

      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /retry/i }));

      await waitFor(() => {
        expect(screen.getByText(mockData.hero.title)).toBeInTheDocument();
      });
    });
  });

  describe('User Interactions', () => {
    it('should navigate to signup page when CTA button is clicked', async () => {
      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: mockData.hero.cta })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: mockData.hero.cta }));

      expect(mockPush).toHaveBeenCalledWith('/signup');
    });

    it('should scroll to features section when "Learn More" button is clicked', async () => {
      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /learn more/i })).toBeInTheDocument();
      });

      const featuresSection = screen.getByRole('region', { name: /features/i });
      const learnMoreButton = screen.getByRole('button', { name: /learn more/i });

      Object.defineProperty(featuresSection, 'offsetTop', { value: 500 });
      Object.defineProperty(window, 'scrollTo', { value: jest.fn(), writable: true });

      fireEvent.click(learnMoreButton);

      expect(window.scrollTo).toHaveBeenCalledWith({
        top: 500,
        behavior: 'smooth',
      });
    });

    it('should open and close mobile menu when menu button is clicked', async () => {
      render(<LandingPage />);

      const menuButton = screen.getByLabelText(/open menu/i);
      expect(screen.queryByRole('navigation', { name: /mobile/i })).not.toBeInTheDocument();

      fireEvent.click(menuButton);
      expect(screen.getByRole('navigation', { name: /mobile/i })).toBeInTheDocument();

      const closeButton = screen.getByLabelText(/close menu/i);
      fireEvent.click(closeButton);
      expect(screen.queryByRole('navigation', { name: /mobile/i })).not.toBeInTheDocument();
    });

    it('should navigate to feature details when feature card is clicked', async () => {
      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getAllByRole('article', { name: /feature/i })[0]).toBeInTheDocument();
      });

      const firstFeature = screen.getAllByRole('article', { name: /feature/i })[0];
      fireEvent.click(within(firstFeature).getByRole('link'));

      expect(mockPush).toHaveBeenCalledWith(`/features/${mockData.features[0].id}`);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes for screen readers', async () => {
      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByRole('banner')).toBeInTheDocument();
        expect(screen.getByRole('main')).toBeInTheDocument();
        expect(screen.getByRole('region', { name: /hero/i })).toBeInTheDocument();
        expect(screen.getByRole('region', { name: /features/i })).toBeInTheDocument();
        expect(screen.getByRole('region', { name: /testimonials/i })).toBeInTheDocument();
        expect(screen.getByRole('region', { name: /statistics/i })).toBeInTheDocument();
      });
    });

    it('should have proper contrast ratios for text elements', async () => {
      render(<LandingPage />);

      await waitFor(() => {
        const heroTitle = screen.getByText(mockData.hero.title);
        expect(heroTitle).toHaveStyle('color: rgb(17, 24, 39)');

        const ctaButton = screen.getByRole('button', { name: mockData.hero.cta });
        expect(ctaButton).toHaveStyle('color: rgb(255, 255, 255)');
        expect(ctaButton).toHaveStyle('background-color: rgb(59, 130, 246)');
      });
    });

    it('should be navigable using keyboard only', async () => {
      render(<LandingPage />);

      await waitFor(() => {
        const ctaButton = screen.getByRole('button', { name: mockData.hero.cta });
        const learnMoreButton = screen.getByRole('button', { name: /learn more/i });

        expect(ctaButton).toHaveAttribute('tabindex', '0');
        expect(learnMoreButton).toHaveAttribute('tabindex', '0');

        userEvent.tab();
        expect(ctaButton).toHaveFocus();

        userEvent.tab();
        expect(learnMoreButton).toHaveFocus();
      });
    });

    it('should have proper alt text for images', async () => {
      render(<LandingPage />);

      await waitFor(() => {
        const featureImages = screen.getAllByRole('img', { name: /feature icon/i });
        expect(featureImages).toHaveLength(mockData.features.length);

        featureImages.forEach((img, index) => {
          expect(img).toHaveAttribute('alt', `Feature icon for ${mockData.features[index].title}`);
        });
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty features array gracefully', async () => {
      (axios.get as jest.Mock).mockResolvedValue({
        data: {
          ...mockData,
          features: [],
        },
      });

      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByText(/no features available/i)).toBeInTheDocument();
      });
    });

    it('should handle empty testimonials array gracefully', async () => {
      (axios.get as jest.Mock).mockResolvedValue({
        data: {
          ...mockData,
          testimonials: [],
        },
      });

      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByText(/no testimonials yet/i)).toBeInTheDocument();
      });
    });

    it('should truncate long feature descriptions with "read more" option', async () => {
      const longDescription = 'a'.repeat(200);
      (axios.get as jest.Mock).mockResolvedValue({
        data: {
          ...mockData,
          features: [
            {
              ...mockData.features[0],
              description: longDescription,
            },
          ],
        },
      });

      render(<LandingPage />);

      await waitFor(() => {
        const description = screen.getByText(new RegExp(`${longDescription.substring(0, 100)}.*`));
        expect(description).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /read more/i })).toBeInTheDocument();
      });
    });

    it('should handle very long hero title with proper text wrapping', async () => {
      const longTitle = 'Super Amazing Platform That Will Change Your Life Forever and Beyond'.repeat(2);
      (axios.get as jest.Mock).mockResolvedValue({
        data: {
          ...mockData,
          hero: {
            ...mockData.hero,
            title: longTitle,
          },
        },
      });

      render(<LandingPage />);

      await waitFor(() => {
        const titleElement = screen.getByText(longTitle);
        expect(titleElement).toHaveStyle('word-break: break-word');
        expect(titleElement).toHaveStyle('white-space: normal');
      });
    });
  });

  describe('Responsive Behavior', () => {
    it('should render mobile layout at small screen sizes', async () => {
      global.innerWidth = 600;
      global.dispatchEvent(new Event('resize'));

      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/mobile menu/i)).toBeInTheDocument();
        expect(screen.queryByRole('navigation', { name: /desktop/i })).not.toBeInTheDocument();

        const featureCards = screen.getAllByRole('article', { name: /feature/i });
        featureCards.forEach(card => {
          expect(card).toHaveStyle('width: 100%');
        });
      });
    });

    it('should render desktop layout at large screen sizes', async () => {
      global.innerWidth = 1200;
      global.dispatchEvent(new Event('resize'));

      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.queryByLabelText(/mobile menu/i)).not.toBeInTheDocument();
        expect(screen.getByRole('navigation', { name: /desktop/i })).toBeInTheDocument();

        const featureCards = screen.getAllByRole('article', { name: /feature/i });
        featureCards.forEach(card => {
          expect(card).toHaveStyle('width: 48%');
        });
      });
    });
  });
});