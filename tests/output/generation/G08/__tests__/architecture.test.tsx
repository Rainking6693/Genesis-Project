import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DesignArchitecture } from './DesignArchitecture';
import { useDesignData } from '../../hooks/useDesignData';
import { useAnalytics } from '../../hooks/useAnalytics';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

// Mock hooks and context
jest.mock('../../hooks/useDesignData');
jest.mock('../../hooks/useAnalytics');
jest.mock('../../context/AuthContext');
jest.mock('../../context/ToastContext');

const mockUseDesignData = useDesignData as jest.MockedFunction<typeof useDesignData>;
const mockUseAnalytics = useAnalytics as jest.MockedFunction<typeof useAnalytics>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;

const mockTrackEvent = jest.fn();
const mockShowToast = jest.fn();

const mockDesignData = {
  architectures: [
    {
      id: '1',
      title: 'Modern Web Architecture',
      description: 'Scalable and maintainable web architecture',
      imageUrl: '/modern-web.jpg',
      tags: ['React', 'Node', 'Microservices'],
      complexity: 'high',
      popularity: 85,
      lastUpdated: '2023-05-15'
    },
    {
      id: '2',
      title: 'Serverless Architecture',
      description: 'Event-driven serverless solutions',
      imageUrl: '/serverless.jpg',
      tags: ['AWS', 'Lambda', 'API Gateway'],
      complexity: 'medium',
      popularity: 78,
      lastUpdated: '2023-04-20'
    }
  ],
  isLoading: false,
  error: null,
  refetch: jest.fn()
};

const mockLoadingData = {
  architectures: [],
  isLoading: true,
  error: null,
  refetch: jest.fn()
};

const mockErrorData = {
  architectures: [],
  isLoading: false,
  error: new Error('Failed to fetch architectures'),
  refetch: jest.fn()
};

describe('DesignArchitecture Component', () => {
  beforeEach(() => {
    mockUseAnalytics.mockReturnValue({ trackEvent: mockTrackEvent });
    mockUseToast.mockReturnValue({ showToast: mockShowToast });
    mockUseAuth.mockReturnValue({ user: null, login: jest.fn(), logout: jest.fn() });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering and Initial State', () => {
    it('should render loading skeleton when data is loading', () => {
      mockUseDesignData.mockReturnValue(mockLoadingData);
      render(<DesignArchitecture />);

      expect(screen.getByTestId('architecture-skeleton')).toBeInTheDocument();
      expect(screen.queryByTestId('architecture-card')).not.toBeInTheDocument();
    });

    it('should render error state when data fetch fails', () => {
      mockUseDesignData.mockReturnValue(mockErrorData);
      render(<DesignArchitecture />);

      expect(screen.getByText(/failed to load architectures/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('should render architecture cards when data is loaded successfully', () => {
      mockUseDesignData.mockReturnValue(mockDesignData);
      render(<DesignArchitecture />);

      expect(screen.getAllByTestId('architecture-card').length).toBe(2);
      expect(screen.getByText('Modern Web Architecture')).toBeInTheDocument();
      expect(screen.getByText('Serverless Architecture')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    beforeEach(() => {
      mockUseDesignData.mockReturnValue(mockDesignData);
    });

    it('should open details modal when clicking on an architecture card', async () => {
      render(<DesignArchitecture />);
      const user = userEvent.setup();

      await user.click(screen.getByText('Modern Web Architecture'));

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/scalable and maintainable web architecture/i)).toBeInTheDocument();
    });

    it('should close details modal when clicking the close button', async () => {
      render(<DesignArchitecture />);
      const user = userEvent.setup();

      await user.click(screen.getByText('Modern Web Architecture'));
      await user.click(screen.getByLabelText(/close modal/i));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should filter architectures based on search input', async () => {
      render(<DesignArchitecture />);
      const user = userEvent.setup();

      await user.type(screen.getByPlaceholderText(/search architectures/i), 'serverless');

      expect(screen.getByText('Serverless Architecture')).toBeInTheDocument();
      expect(screen.queryByText('Modern Web Architecture')).not.toBeInTheDocument();
    });

    it('should filter architectures by complexity', async () => {
      render(<DesignArchitecture />);
      const user = userEvent.setup();

      await user.click(screen.getByLabelText(/filter by complexity/i));
      await user.click(screen.getByText(/high/i));

      expect(screen.getByText('Modern Web Architecture')).toBeInTheDocument();
      expect(screen.queryByText('Serverless Architecture')).not.toBeInTheDocument();
    });

    it('should sort architectures by popularity', async () => {
      render(<DesignArchitecture />);
      const user = userEvent.setup();

      await user.click(screen.getByLabelText(/sort by/i));
      await user.click(screen.getByText(/popularity/i));

      const cards = screen.getAllByTestId('architecture-card');
      expect(cards[0]).toHaveTextContent('Modern Web Architecture');
      expect(cards[1]).toHaveTextContent('Serverless Architecture');
    });

    it('should track analytics event when clicking on an architecture card', async () => {
      render(<DesignArchitecture />);
      const user = userEvent.setup();

      await user.click(screen.getByText('Modern Web Architecture'));

      expect(mockTrackEvent).toHaveBeenCalledWith('architecture_view', {
        architectureId: '1',
        title: 'Modern Web Architecture'
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should show toast when retry fails after error', async () => {
      const mockRefetch = jest.fn().mockRejectedValue(new Error('Retry failed'));
      mockUseDesignData.mockReturnValue({ ...mockErrorData, refetch: mockRefetch });

      render(<DesignArchitecture />);
      const user = userEvent.setup();

      await user.click(screen.getByRole('button', { name: /retry/i }));

      expect(mockShowToast).toHaveBeenCalledWith({
        message: 'Failed to load architectures. Please try again later.',
        type: 'error'
      });
    });

    it('should handle empty search results gracefully', async () => {
      mockUseDesignData.mockReturnValue(mockDesignData);
      render(<DesignArchitecture />);
      const user = userEvent.setup();

      await user.type(screen.getByPlaceholderText(/search architectures/i), 'nonexistent');

      expect(screen.getByText(/no architectures found/i)).toBeInTheDocument();
    });

    it('should handle empty architecture list', () => {
      mockUseDesignData.mockReturnValue({
        architectures: [],
        isLoading: false,
        error: null,
        refetch: jest.fn()
      });

      render(<DesignArchitecture />);

      expect(screen.getByText(/no architectures available/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility Features', () => {
    beforeEach(() => {
      mockUseDesignData.mockReturnValue(mockDesignData);
    });

    it('should have proper aria labels for interactive elements', () => {
      render(<DesignArchitecture />);

      expect(screen.getByLabelText(/search architectures/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/filter by complexity/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/sort by/i)).toBeInTheDocument();
    });

    it('should have proper heading structure', () => {
      render(<DesignArchitecture />);

      expect(screen.getByRole('heading', { name: /design architectures/i, level: 1 })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Modern Web Architecture', level: 2 })).toBeInTheDocument();
    });

    it('should be navigable via keyboard', async () => {
      render(<DesignArchitecture />);
      const user = userEvent.setup();

      await user.tab();
      expect(screen.getByPlaceholderText(/search architectures/i)).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText(/filter by complexity/i)).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText(/sort by/i)).toHaveFocus();

      await user.tab();
      expect(screen.getByText('Modern Web Architecture').closest('button')).toHaveFocus();
    });

    it('should have proper contrast ratios for text elements', () => {
      render(<DesignArchitecture />);

      const heading = screen.getByRole('heading', { name: /design architectures/i });
      expect(heading).toHaveStyle('color: rgb(17, 24, 39)'); // Assuming dark text on light background

      const cardTitle = screen.getByText('Modern Web Architecture');
      expect(cardTitle).toHaveStyle('color: rgb(17, 24, 39)');
    });
  });

  describe('Responsive Behavior', () => {
    it('should render mobile layout on small screens', () => {
      global.innerWidth = 500;
      global.dispatchEvent(new Event('resize'));

      mockUseDesignData.mockReturnValue(mockDesignData);
      render(<DesignArchitecture />);

      const grid = screen.getByTestId('architectures-grid');
      expect(grid).toHaveStyle('grid-template-columns: 1fr');
    });

    it('should render desktop layout on large screens', () => {
      global.innerWidth = 1200;
      global.dispatchEvent(new Event('resize'));

      mockUseDesignData.mockReturnValue(mockDesignData);
      render(<DesignArchitecture />);

      const grid = screen.getByTestId('architectures-grid');
      expect(grid).toHaveStyle('grid-template-columns: repeat(3, 1fr)');
    });
  });

  describe('Authenticated User Features', () => {
    it('should show favorite button when user is authenticated', () => {
      mockUseAuth.mockReturnValue({
        user: { id: '123', name: 'Test User' },
        login: jest.fn(),
        logout: jest.fn()
      });
      mockUseDesignData.mockReturnValue(mockDesignData);

      render(<DesignArchitecture />);

      expect(screen.getAllByLabelText(/add to favorites/i)[0]).toBeInTheDocument();
    });

    it('should track favorite event when clicking favorite button', async () => {
      mockUseAuth.mockReturnValue({
        user: { id: '123', name: 'Test User' },
        login: jest.fn(),
        logout: jest.fn()
      });
      mockUseDesignData.mockReturnValue(mockDesignData);

      render(<DesignArchitecture />);
      const user = userEvent.setup();

      await user.click(screen.getAllByLabelText(/add to favorites/i)[0]);

      expect(mockTrackEvent).toHaveBeenCalledWith('architecture_favorite', {
        architectureId: '1',
        userId: '123'
      });
    });

    it('should show login prompt when unauthenticated user tries to favorite', async () => {
      mockUseDesignData.mockReturnValue(mockDesignData);

      render(<DesignArchitecture />);
      const user = userEvent.setup();

      await user.click(screen.getAllByLabelText(/add to favorites/i)[0]);

      expect(screen.getByText(/please log in to save favorites/i)).toBeInTheDocument();
    });
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DesignArchitecture } from './DesignArchitecture';
import { useDesignData } from '../../hooks/useDesignData';
import { useAnalytics } from '../../hooks/useAnalytics';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

// Mock hooks and context
jest.mock('../../hooks/useDesignData');
jest.mock('../../hooks/useAnalytics');
jest.mock('../../context/AuthContext');
jest.mock('../../context/ToastContext');

const mockUseDesignData = useDesignData as jest.MockedFunction<typeof useDesignData>;
const mockUseAnalytics = useAnalytics as jest.MockedFunction<typeof useAnalytics>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;

const mockTrackEvent = jest.fn();
const mockShowToast = jest.fn();

const mockDesignData = {
  architectures: [
    {
      id: '1',
      title: 'Modern Web Architecture',
      description: 'Scalable and maintainable web architecture',
      imageUrl: '/modern-web.jpg',
      tags: ['React', 'Node', 'Microservices'],
      complexity: 'high',
      popularity: 85,
      lastUpdated: '2023-05-15'
    },
    {
      id: '2',
      title: 'Serverless Architecture',
      description: 'Event-driven serverless solutions',
      imageUrl: '/serverless.jpg',
      tags: ['AWS', 'Lambda', 'API Gateway'],
      complexity: 'medium',
      popularity: 78,
      lastUpdated: '2023-04-20'
    }
  ],
  isLoading: false,
  error: null,
  refetch: jest.fn()
};

const mockLoadingData = {
  architectures: [],
  isLoading: true,
  error: null,
  refetch: jest.fn()
};

const mockErrorData = {
  architectures: [],
  isLoading: false,
  error: new Error('Failed to fetch architectures'),
  refetch: jest.fn()
};

describe('DesignArchitecture Component', () => {
  beforeEach(() => {
    mockUseAnalytics.mockReturnValue({ trackEvent: mockTrackEvent });
    mockUseToast.mockReturnValue({ showToast: mockShowToast });
    mockUseAuth.mockReturnValue({ user: null, login: jest.fn(), logout: jest.fn() });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering and Initial State', () => {
    it('should render loading skeleton when data is loading', () => {
      mockUseDesignData.mockReturnValue(mockLoadingData);
      render(<DesignArchitecture />);

      expect(screen.getByTestId('architecture-skeleton')).toBeInTheDocument();
      expect(screen.queryByTestId('architecture-card')).not.toBeInTheDocument();
    });

    it('should render error state when data fetch fails', () => {
      mockUseDesignData.mockReturnValue(mockErrorData);
      render(<DesignArchitecture />);

      expect(screen.getByText(/failed to load architectures/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('should render architecture cards when data is loaded successfully', () => {
      mockUseDesignData.mockReturnValue(mockDesignData);
      render(<DesignArchitecture />);

      expect(screen.getAllByTestId('architecture-card').length).toBe(2);
      expect(screen.getByText('Modern Web Architecture')).toBeInTheDocument();
      expect(screen.getByText('Serverless Architecture')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    beforeEach(() => {
      mockUseDesignData.mockReturnValue(mockDesignData);
    });

    it('should open details modal when clicking on an architecture card', async () => {
      render(<DesignArchitecture />);
      const user = userEvent.setup();

      await user.click(screen.getByText('Modern Web Architecture'));

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/scalable and maintainable web architecture/i)).toBeInTheDocument();
    });

    it('should close details modal when clicking the close button', async () => {
      render(<DesignArchitecture />);
      const user = userEvent.setup();

      await user.click(screen.getByText('Modern Web Architecture'));
      await user.click(screen.getByLabelText(/close modal/i));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should filter architectures based on search input', async () => {
      render(<DesignArchitecture />);
      const user = userEvent.setup();

      await user.type(screen.getByPlaceholderText(/search architectures/i), 'serverless');

      expect(screen.getByText('Serverless Architecture')).toBeInTheDocument();
      expect(screen.queryByText('Modern Web Architecture')).not.toBeInTheDocument();
    });

    it('should filter architectures by complexity', async () => {
      render(<DesignArchitecture />);
      const user = userEvent.setup();

      await user.click(screen.getByLabelText(/filter by complexity/i));
      await user.click(screen.getByText(/high/i));

      expect(screen.getByText('Modern Web Architecture')).toBeInTheDocument();
      expect(screen.queryByText('Serverless Architecture')).not.toBeInTheDocument();
    });

    it('should sort architectures by popularity', async () => {
      render(<DesignArchitecture />);
      const user = userEvent.setup();

      await user.click(screen.getByLabelText(/sort by/i));
      await user.click(screen.getByText(/popularity/i));

      const cards = screen.getAllByTestId('architecture-card');
      expect(cards[0]).toHaveTextContent('Modern Web Architecture');
      expect(cards[1]).toHaveTextContent('Serverless Architecture');
    });

    it('should track analytics event when clicking on an architecture card', async () => {
      render(<DesignArchitecture />);
      const user = userEvent.setup();

      await user.click(screen.getByText('Modern Web Architecture'));

      expect(mockTrackEvent).toHaveBeenCalledWith('architecture_view', {
        architectureId: '1',
        title: 'Modern Web Architecture'
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should show toast when retry fails after error', async () => {
      const mockRefetch = jest.fn().mockRejectedValue(new Error('Retry failed'));
      mockUseDesignData.mockReturnValue({ ...mockErrorData, refetch: mockRefetch });

      render(<DesignArchitecture />);
      const user = userEvent.setup();

      await user.click(screen.getByRole('button', { name: /retry/i }));

      expect(mockShowToast).toHaveBeenCalledWith({
        message: 'Failed to load architectures. Please try again later.',
        type: 'error'
      });
    });

    it('should handle empty search results gracefully', async () => {
      mockUseDesignData.mockReturnValue(mockDesignData);
      render(<DesignArchitecture />);
      const user = userEvent.setup();

      await user.type(screen.getByPlaceholderText(/search architectures/i), 'nonexistent');

      expect(screen.getByText(/no architectures found/i)).toBeInTheDocument();
    });

    it('should handle empty architecture list', () => {
      mockUseDesignData.mockReturnValue({
        architectures: [],
        isLoading: false,
        error: null,
        refetch: jest.fn()
      });

      render(<DesignArchitecture />);

      expect(screen.getByText(/no architectures available/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility Features', () => {
    beforeEach(() => {
      mockUseDesignData.mockReturnValue(mockDesignData);
    });

    it('should have proper aria labels for interactive elements', () => {
      render(<DesignArchitecture />);

      expect(screen.getByLabelText(/search architectures/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/filter by complexity/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/sort by/i)).toBeInTheDocument();
    });

    it('should have proper heading structure', () => {
      render(<DesignArchitecture />);

      expect(screen.getByRole('heading', { name: /design architectures/i, level: 1 })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Modern Web Architecture', level: 2 })).toBeInTheDocument();
    });

    it('should be navigable via keyboard', async () => {
      render(<DesignArchitecture />);
      const user = userEvent.setup();

      await user.tab();
      expect(screen.getByPlaceholderText(/search architectures/i)).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText(/filter by complexity/i)).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText(/sort by/i)).toHaveFocus();

      await user.tab();
      expect(screen.getByText('Modern Web Architecture').closest('button')).toHaveFocus();
    });

    it('should have proper contrast ratios for text elements', () => {
      render(<DesignArchitecture />);

      const heading = screen.getByRole('heading', { name: /design architectures/i });
      expect(heading).toHaveStyle('color: rgb(17, 24, 39)'); // Assuming dark text on light background

      const cardTitle = screen.getByText('Modern Web Architecture');
      expect(cardTitle).toHaveStyle('color: rgb(17, 24, 39)');
    });
  });

  describe('Responsive Behavior', () => {
    it('should render mobile layout on small screens', () => {
      global.innerWidth = 500;
      global.dispatchEvent(new Event('resize'));

      mockUseDesignData.mockReturnValue(mockDesignData);
      render(<DesignArchitecture />);

      const grid = screen.getByTestId('architectures-grid');
      expect(grid).toHaveStyle('grid-template-columns: 1fr');
    });

    it('should render desktop layout on large screens', () => {
      global.innerWidth = 1200;
      global.dispatchEvent(new Event('resize'));

      mockUseDesignData.mockReturnValue(mockDesignData);
      render(<DesignArchitecture />);

      const grid = screen.getByTestId('architectures-grid');
      expect(grid).toHaveStyle('grid-template-columns: repeat(3, 1fr)');
    });
  });

  describe('Authenticated User Features', () => {
    it('should show favorite button when user is authenticated', () => {
      mockUseAuth.mockReturnValue({
        user: { id: '123', name: 'Test User' },
        login: jest.fn(),
        logout: jest.fn()
      });
      mockUseDesignData.mockReturnValue(mockDesignData);

      render(<DesignArchitecture />);

      expect(screen.getAllByLabelText(/add to favorites/i)[0]).toBeInTheDocument();
    });

    it('should track favorite event when clicking favorite button', async () => {
      mockUseAuth.mockReturnValue({
        user: { id: '123', name: 'Test User' },
        login: jest.fn(),
        logout: jest.fn()
      });
      mockUseDesignData.mockReturnValue(mockDesignData);

      render(<DesignArchitecture />);
      const user = userEvent.setup();

      await user.click(screen.getAllByLabelText(/add to favorites/i)[0]);

      expect(mockTrackEvent).toHaveBeenCalledWith('architecture_favorite', {
        architectureId: '1',
        userId: '123'
      });
    });

    it('should show login prompt when unauthenticated user tries to favorite', async () => {
      mockUseDesignData.mockReturnValue(mockDesignData);

      render(<DesignArchitecture />);
      const user = userEvent.setup();

      await user.click(screen.getAllByLabelText(/add to favorites/i)[0]);

      expect(screen.getByText(/please log in to save favorites/i)).toBeInTheDocument();
    });
  });
});