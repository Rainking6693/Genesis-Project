import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { useRouter } from 'next/router';
import DesignArchitecture from '@/components/DesignArchitecture';
import { DesignArchitectureProps } from '@/types/designArchitecture';

jest.mock('axios');
jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));

const mockPush = jest.fn();
(useRouter as jest.Mock).mockImplementation(() => ({
  push: mockPush,
}));

const mockData = {
  id: '1',
  title: 'Modern Architecture',
  description: 'Cutting-edge design solutions',
  features: [
    { id: '1', name: 'Responsive Design', description: 'Works on all devices' },
    { id: '2', name: 'Accessibility', description: 'WCAG 2.1 AA compliant' },
  ],
  imageUrl: '/architecture.jpg',
  ctaText: 'Get Started',
  loading: false,
  error: null,
};

const mockError = new Error('Failed to load architecture data');

describe('DesignArchitecture Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderComponent = (props: Partial<DesignArchitectureProps> = {}) => {
    const defaultProps: DesignArchitectureProps = {
      data: mockData,
      onFeatureSelect: jest.fn(),
      onCtaClick: jest.fn(),
      ...props,
    };
    return render(<DesignArchitecture {...defaultProps} />);
  };

  describe('Rendering', () => {
    it('should render the component with all main elements', () => {
      renderComponent();

      expect(screen.getByRole('heading', { name: /modern architecture/i })).toBeInTheDocument();
      expect(screen.getByText(/cutting-edge design solutions/i)).toBeInTheDocument();
      expect(screen.getByRole('img', { name: /architecture visualization/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /get started/i })).toBeInTheDocument();
      expect(screen.getByRole('list')).toBeInTheDocument();
      expect(screen.getAllByRole('listitem').length).toBe(2);
    });

    it('should render loading state when data is loading', () => {
      renderComponent({ data: { ...mockData, loading: true } });

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    });

    it('should render error state when there is an error', () => {
      renderComponent({ data: { ...mockData, error: mockError, loading: false } });

      expect(screen.getByText(/failed to load architecture data/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should call onFeatureSelect when a feature is clicked', async () => {
      const onFeatureSelect = jest.fn();
      renderComponent({ onFeatureSelect });

      const featureItems = screen.getAllByRole('listitem');
      await userEvent.click(featureItems[0]);

      expect(onFeatureSelect).toHaveBeenCalledWith(mockData.features[0]);
    });

    it('should call onCtaClick when CTA button is clicked', async () => {
      const onCtaClick = jest.fn();
      renderComponent({ onCtaClick });

      await userEvent.click(screen.getByRole('button', { name: /get started/i }));
      expect(onCtaClick).toHaveBeenCalledTimes(1);
    });

    it('should navigate to contact page when contact link is clicked', async () => {
      renderComponent();

      await userEvent.click(screen.getByRole('link', { name: /contact us/i }));
      expect(mockPush).toHaveBeenCalledWith('/contact');
    });

    it('should retry loading data when retry button is clicked in error state', async () => {
      const onRetry = jest.fn();
      renderComponent({
        data: { ...mockData, error: mockError, loading: false },
        onRetry,
      });

      await userEvent.click(screen.getByRole('button', { name: /retry/i }));
      expect(onRetry).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels for interactive elements', () => {
      renderComponent();

      expect(screen.getByRole('button', { name: /get started/i })).toHaveAttribute('aria-label', 'Get started with our architecture services');
      expect(screen.getByRole('img', { name: /architecture visualization/i })).toHaveAttribute('alt', 'Modern architecture visualization');
    });

    it('should have proper contrast ratios for text elements', () => {
      renderComponent();

      const heading = screen.getByRole('heading', { name: /modern architecture/i });
      const description = screen.getByText(/cutting-edge design solutions/i);

      expect(heading).toHaveStyle('color: rgba(0, 0, 0, 0.87)');
      expect(description).toHaveStyle('color: rgba(0, 0, 0, 0.6)');
    });

    it('should be navigable via keyboard', async () => {
      renderComponent();

      await userEvent.tab();
      expect(screen.getByRole('button', { name: /get started/i })).toHaveFocus();

      await userEvent.tab();
      expect(screen.getByRole('link', { name: /contact us/i })).toHaveFocus();

      await userEvent.tab();
      expect(screen.getAllByRole('listitem')[0]).toHaveFocus();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty features list gracefully', () => {
      renderComponent({ data: { ...mockData, features: [] } });

      expect(screen.getByText(/no features available/i)).toBeInTheDocument();
      expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
    });

    it('should handle missing image gracefully', () => {
      renderComponent({ data: { ...mockData, imageUrl: '' } });

      const img = screen.getByRole('img', { name: /architecture visualization/i });
      expect(img).toHaveAttribute('src', 'placeholder.jpg');
    });

    it('should truncate long feature descriptions', () => {
      const longDescription = 'A'.repeat(200);
      renderComponent({
        data: {
          ...mockData,
          features: [{ ...mockData.features[0], description: longDescription }],
        },
      });

      const descriptionElement = screen.getByText(/a+/i);
      expect(descriptionElement).toHaveStyle('white-space: nowrap');
      expect(descriptionElement).toHaveStyle('overflow: hidden');
      expect(descriptionElement).toHaveStyle('text-overflow: ellipsis');
    });
  });

  describe('API Integration', () => {
    it('should fetch data on component mount', async () => {
      (axios.get as jest.Mock).mockResolvedValue({ data: mockData });
      const fetchData = jest.fn().mockResolvedValue(mockData);

      renderComponent({ fetchData });

      await waitFor(() => {
        expect(fetchData).toHaveBeenCalledTimes(1);
      });
    });

    it('should handle API error gracefully', async () => {
      (axios.get as jest.Mock).mockRejectedValue(mockError);
      const fetchData = jest.fn().mockRejectedValue(mockError);

      renderComponent({ fetchData });

      await waitFor(() => {
        expect(screen.getByText(/failed to load architecture data/i)).toBeInTheDocument();
      });
    });

    it('should display loading state while fetching data', async () => {
      const fetchData = jest.fn(() => new Promise(() => {}));
      renderComponent({ fetchData });

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  describe('Responsive Behavior', () => {
    it('should adjust layout for mobile viewports', () => {
      global.innerWidth = 500;
      global.dispatchEvent(new Event('resize'));

      renderComponent();

      const container = screen.getByTestId('design-architecture-container');
      expect(container).toHaveStyle('flex-direction: column');

      const image = screen.getByRole('img');
      expect(image).toHaveStyle('width: 100%');
    });

    it('should maintain aspect ratio for architecture image', () => {
      renderComponent();

      const image = screen.getByRole('img');
      expect(image).toHaveStyle('aspect-ratio: 16/9');
    });
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { useRouter } from 'next/router';
import DesignArchitecture from '@/components/DesignArchitecture';
import { DesignArchitectureProps } from '@/types/designArchitecture';

jest.mock('axios');
jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));

const mockPush = jest.fn();
(useRouter as jest.Mock).mockImplementation(() => ({
  push: mockPush,
}));

const mockData = {
  id: '1',
  title: 'Modern Architecture',
  description: 'Cutting-edge design solutions',
  features: [
    { id: '1', name: 'Responsive Design', description: 'Works on all devices' },
    { id: '2', name: 'Accessibility', description: 'WCAG 2.1 AA compliant' },
  ],
  imageUrl: '/architecture.jpg',
  ctaText: 'Get Started',
  loading: false,
  error: null,
};

const mockError = new Error('Failed to load architecture data');

describe('DesignArchitecture Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderComponent = (props: Partial<DesignArchitectureProps> = {}) => {
    const defaultProps: DesignArchitectureProps = {
      data: mockData,
      onFeatureSelect: jest.fn(),
      onCtaClick: jest.fn(),
      ...props,
    };
    return render(<DesignArchitecture {...defaultProps} />);
  };

  describe('Rendering', () => {
    it('should render the component with all main elements', () => {
      renderComponent();

      expect(screen.getByRole('heading', { name: /modern architecture/i })).toBeInTheDocument();
      expect(screen.getByText(/cutting-edge design solutions/i)).toBeInTheDocument();
      expect(screen.getByRole('img', { name: /architecture visualization/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /get started/i })).toBeInTheDocument();
      expect(screen.getByRole('list')).toBeInTheDocument();
      expect(screen.getAllByRole('listitem').length).toBe(2);
    });

    it('should render loading state when data is loading', () => {
      renderComponent({ data: { ...mockData, loading: true } });

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    });

    it('should render error state when there is an error', () => {
      renderComponent({ data: { ...mockData, error: mockError, loading: false } });

      expect(screen.getByText(/failed to load architecture data/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should call onFeatureSelect when a feature is clicked', async () => {
      const onFeatureSelect = jest.fn();
      renderComponent({ onFeatureSelect });

      const featureItems = screen.getAllByRole('listitem');
      await userEvent.click(featureItems[0]);

      expect(onFeatureSelect).toHaveBeenCalledWith(mockData.features[0]);
    });

    it('should call onCtaClick when CTA button is clicked', async () => {
      const onCtaClick = jest.fn();
      renderComponent({ onCtaClick });

      await userEvent.click(screen.getByRole('button', { name: /get started/i }));
      expect(onCtaClick).toHaveBeenCalledTimes(1);
    });

    it('should navigate to contact page when contact link is clicked', async () => {
      renderComponent();

      await userEvent.click(screen.getByRole('link', { name: /contact us/i }));
      expect(mockPush).toHaveBeenCalledWith('/contact');
    });

    it('should retry loading data when retry button is clicked in error state', async () => {
      const onRetry = jest.fn();
      renderComponent({
        data: { ...mockData, error: mockError, loading: false },
        onRetry,
      });

      await userEvent.click(screen.getByRole('button', { name: /retry/i }));
      expect(onRetry).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels for interactive elements', () => {
      renderComponent();

      expect(screen.getByRole('button', { name: /get started/i })).toHaveAttribute('aria-label', 'Get started with our architecture services');
      expect(screen.getByRole('img', { name: /architecture visualization/i })).toHaveAttribute('alt', 'Modern architecture visualization');
    });

    it('should have proper contrast ratios for text elements', () => {
      renderComponent();

      const heading = screen.getByRole('heading', { name: /modern architecture/i });
      const description = screen.getByText(/cutting-edge design solutions/i);

      expect(heading).toHaveStyle('color: rgba(0, 0, 0, 0.87)');
      expect(description).toHaveStyle('color: rgba(0, 0, 0, 0.6)');
    });

    it('should be navigable via keyboard', async () => {
      renderComponent();

      await userEvent.tab();
      expect(screen.getByRole('button', { name: /get started/i })).toHaveFocus();

      await userEvent.tab();
      expect(screen.getByRole('link', { name: /contact us/i })).toHaveFocus();

      await userEvent.tab();
      expect(screen.getAllByRole('listitem')[0]).toHaveFocus();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty features list gracefully', () => {
      renderComponent({ data: { ...mockData, features: [] } });

      expect(screen.getByText(/no features available/i)).toBeInTheDocument();
      expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
    });

    it('should handle missing image gracefully', () => {
      renderComponent({ data: { ...mockData, imageUrl: '' } });

      const img = screen.getByRole('img', { name: /architecture visualization/i });
      expect(img).toHaveAttribute('src', 'placeholder.jpg');
    });

    it('should truncate long feature descriptions', () => {
      const longDescription = 'A'.repeat(200);
      renderComponent({
        data: {
          ...mockData,
          features: [{ ...mockData.features[0], description: longDescription }],
        },
      });

      const descriptionElement = screen.getByText(/a+/i);
      expect(descriptionElement).toHaveStyle('white-space: nowrap');
      expect(descriptionElement).toHaveStyle('overflow: hidden');
      expect(descriptionElement).toHaveStyle('text-overflow: ellipsis');
    });
  });

  describe('API Integration', () => {
    it('should fetch data on component mount', async () => {
      (axios.get as jest.Mock).mockResolvedValue({ data: mockData });
      const fetchData = jest.fn().mockResolvedValue(mockData);

      renderComponent({ fetchData });

      await waitFor(() => {
        expect(fetchData).toHaveBeenCalledTimes(1);
      });
    });

    it('should handle API error gracefully', async () => {
      (axios.get as jest.Mock).mockRejectedValue(mockError);
      const fetchData = jest.fn().mockRejectedValue(mockError);

      renderComponent({ fetchData });

      await waitFor(() => {
        expect(screen.getByText(/failed to load architecture data/i)).toBeInTheDocument();
      });
    });

    it('should display loading state while fetching data', async () => {
      const fetchData = jest.fn(() => new Promise(() => {}));
      renderComponent({ fetchData });

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  describe('Responsive Behavior', () => {
    it('should adjust layout for mobile viewports', () => {
      global.innerWidth = 500;
      global.dispatchEvent(new Event('resize'));

      renderComponent();

      const container = screen.getByTestId('design-architecture-container');
      expect(container).toHaveStyle('flex-direction: column');

      const image = screen.getByRole('img');
      expect(image).toHaveStyle('width: 100%');
    });

    it('should maintain aspect ratio for architecture image', () => {
      renderComponent();

      const image = screen.getByRole('img');
      expect(image).toHaveStyle('aspect-ratio: 16/9');
    });
  });
});