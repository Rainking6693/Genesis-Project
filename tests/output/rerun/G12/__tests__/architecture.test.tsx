import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DesignArchitecture from '../DesignArchitecture';
import * as api from '../../api'; // Assuming API calls are in api.ts
import { mockDesignArchitectureData } from './mocks'; // Mock data

jest.mock('../../api');

describe('DesignArchitecture Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    (api.fetchDesignArchitectureData as jest.Mock).mockResolvedValue(mockDesignArchitectureData);
    render(<DesignArchitecture />);
  });

  it('displays loading state initially', () => {
    (api.fetchDesignArchitectureData as jest.Mock).mockResolvedValue(mockDesignArchitectureData);
    render(<DesignArchitecture />);
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  it('fetches and displays design architecture data', async () => {
    (api.fetchDesignArchitectureData as jest.Mock).mockResolvedValue(mockDesignArchitectureData);
    render(<DesignArchitecture />);
    await waitFor(() => {
      expect(api.fetchDesignArchitectureData).toHaveBeenCalledTimes(1);
      expect(screen.getByText(mockDesignArchitectureData.title)).toBeInTheDocument();
    });
  });

  it('handles API error and displays error message', async () => {
    (api.fetchDesignArchitectureData as jest.Mock).mockRejectedValue(new Error('API Error'));
    render(<DesignArchitecture />);
    await waitFor(() => {
      expect(screen.getByText(/Error/i)).toBeInTheDocument();
    });
  });

  it('allows users to interact with interactive elements (e.g., buttons, links)', async () => {
    (api.fetchDesignArchitectureData as jest.Mock).mockResolvedValue(mockDesignArchitectureData);
    render(<DesignArchitecture />);
    await waitFor(() => {
      const button = screen.getByRole('button', { name: /View Details/i });
      fireEvent.click(button);
      // Add assertions based on what happens after the button click
    });
  });

  it('updates data when a refresh button is clicked', async () => {
    (api.fetchDesignArchitectureData as jest.Mock).mockResolvedValue(mockDesignArchitectureData);
    render(<DesignArchitecture />);
    await waitFor(() => {
      expect(api.fetchDesignArchitectureData).toHaveBeenCalledTimes(1);
    });

    const newMockData = { ...mockDesignArchitectureData, title: 'Updated Title' };
    (api.fetchDesignArchitectureData as jest.Mock).mockResolvedValue(newMockData);

    const refreshButton = screen.getByRole('button', { name: /Refresh/i });
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(api.fetchDesignArchitectureData).toHaveBeenCalledTimes(2);
      expect(screen.getByText(/Updated Title/i)).toBeInTheDocument();
    });
  });

  it('displays empty state when no data is available', async () => {
    (api.fetchDesignArchitectureData as jest.Mock).mockResolvedValue(null);
    render(<DesignArchitecture />);
    await waitFor(() => {
      expect(screen.getByText(/No data available/i)).toBeInTheDocument();
    });
  });

  it('handles edge cases like very long titles or descriptions', async () => {
    const longMockData = {
      ...mockDesignArchitectureData,
      title: 'A very very very very very very very very very very very long title',
      description: 'A very very very very very very very very very very very long description',
    };
    (api.fetchDesignArchitectureData as jest.Mock).mockResolvedValue(longMockData);
    render(<DesignArchitecture />);
    await waitFor(() => {
      expect(screen.getByText(/very very very very very very very very very very very long title/i)).toBeInTheDocument();
      expect(screen.getByText(/very very very very very very very very very very very long description/i)).toBeInTheDocument();
    });
  });

  it('provides accessible labels and roles', async () => {
    (api.fetchDesignArchitectureData as jest.Mock).mockResolvedValue(mockDesignArchitectureData);
    render(<DesignArchitecture />);
    await waitFor(() => {
      const heading = screen.getByRole('heading', { name: mockDesignArchitectureData.title });
      expect(heading).toBeInTheDocument();
    });
  });

  it('navigates to detail page on click', async () => {
    (api.fetchDesignArchitectureData as jest.Mock).mockResolvedValue(mockDesignArchitectureData);
    const mockNavigate = jest.fn();
    jest.mock('react-router-dom', () => ({
      ...jest.requireActual('react-router-dom'),
      useNavigate: () => mockNavigate,
    }));

    render(<DesignArchitecture />);

    await waitFor(() => {
      const viewDetailsButton = screen.getByRole('button', { name: /View Details/i });
      fireEvent.click(viewDetailsButton);
      expect(mockNavigate).toHaveBeenCalled();
    });
  });

  it('renders with a specific theme', async () => {
    (api.fetchDesignArchitectureData as jest.Mock).mockResolvedValue(mockDesignArchitectureData);
    render(<DesignArchitecture theme="dark" />);
    await waitFor(() => {
      const component = screen.getByTestId('design-architecture-container');
      expect(component).toHaveClass('dark');
    });
  });

  it('handles timeout errors from the API', async () => {
    (api.fetchDesignArchitectureData as jest.Mock).mockRejectedValue(new Error('Timeout'));
    render(<DesignArchitecture />);
    await waitFor(() => {
      expect(screen.getByText(/Timeout/i)).toBeInTheDocument();
    });
  });

  it('displays a retry button after an error', async () => {
    (api.fetchDesignArchitectureData as jest.Mock).mockRejectedValue(new Error('API Error'));
    render(<DesignArchitecture />);
    await waitFor(() => {
      const retryButton = screen.getByRole('button', { name: /Retry/i });
      expect(retryButton).toBeInTheDocument();
    });
  });

  it('retries fetching data when the retry button is clicked', async () => {
    (api.fetchDesignArchitectureData as jest.Mock)
      .mockRejectedValueOnce(new Error('API Error'))
      .mockResolvedValueOnce(mockDesignArchitectureData);

    render(<DesignArchitecture />);

    await waitFor(() => {
      const retryButton = screen.getByRole('button', { name: /Retry/i });
      expect(retryButton).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Retry/i }));

    await waitFor(() => {
      expect(api.fetchDesignArchitectureData).toHaveBeenCalledTimes(2);
      expect(screen.getByText(mockDesignArchitectureData.title)).toBeInTheDocument();
    });
  });

  it('renders correctly with RTL text direction', async () => {
    (api.fetchDesignArchitectureData as jest.Mock).mockResolvedValue(mockDesignArchitectureData);
    render(<DesignArchitecture dir="rtl" />);
    await waitFor(() => {
      const component = screen.getByTestId('design-architecture-container');
      expect(component).toHaveAttribute('dir', 'rtl');
    });
  });
});

import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DesignArchitecture from '../DesignArchitecture';
import * as api from '../../api'; // Assuming API calls are in api.ts
import { mockDesignArchitectureData } from './mocks'; // Mock data

jest.mock('../../api');

describe('DesignArchitecture Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    (api.fetchDesignArchitectureData as jest.Mock).mockResolvedValue(mockDesignArchitectureData);
    render(<DesignArchitecture />);
  });

  it('displays loading state initially', () => {
    (api.fetchDesignArchitectureData as jest.Mock).mockResolvedValue(mockDesignArchitectureData);
    render(<DesignArchitecture />);
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  it('fetches and displays design architecture data', async () => {
    (api.fetchDesignArchitectureData as jest.Mock).mockResolvedValue(mockDesignArchitectureData);
    render(<DesignArchitecture />);
    await waitFor(() => {
      expect(api.fetchDesignArchitectureData).toHaveBeenCalledTimes(1);
      expect(screen.getByText(mockDesignArchitectureData.title)).toBeInTheDocument();
    });
  });

  it('handles API error and displays error message', async () => {
    (api.fetchDesignArchitectureData as jest.Mock).mockRejectedValue(new Error('API Error'));
    render(<DesignArchitecture />);
    await waitFor(() => {
      expect(screen.getByText(/Error/i)).toBeInTheDocument();
    });
  });

  it('allows users to interact with interactive elements (e.g., buttons, links)', async () => {
    (api.fetchDesignArchitectureData as jest.Mock).mockResolvedValue(mockDesignArchitectureData);
    render(<DesignArchitecture />);
    await waitFor(() => {
      const button = screen.getByRole('button', { name: /View Details/i });
      fireEvent.click(button);
      // Add assertions based on what happens after the button click
    });
  });

  it('updates data when a refresh button is clicked', async () => {
    (api.fetchDesignArchitectureData as jest.Mock).mockResolvedValue(mockDesignArchitectureData);
    render(<DesignArchitecture />);
    await waitFor(() => {
      expect(api.fetchDesignArchitectureData).toHaveBeenCalledTimes(1);
    });

    const newMockData = { ...mockDesignArchitectureData, title: 'Updated Title' };
    (api.fetchDesignArchitectureData as jest.Mock).mockResolvedValue(newMockData);

    const refreshButton = screen.getByRole('button', { name: /Refresh/i });
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(api.fetchDesignArchitectureData).toHaveBeenCalledTimes(2);
      expect(screen.getByText(/Updated Title/i)).toBeInTheDocument();
    });
  });

  it('displays empty state when no data is available', async () => {
    (api.fetchDesignArchitectureData as jest.Mock).mockResolvedValue(null);
    render(<DesignArchitecture />);
    await waitFor(() => {
      expect(screen.getByText(/No data available/i)).toBeInTheDocument();
    });
  });

  it('handles edge cases like very long titles or descriptions', async () => {
    const longMockData = {
      ...mockDesignArchitectureData,
      title: 'A very very very very very very very very very very very long title',
      description: 'A very very very very very very very very very very very long description',
    };
    (api.fetchDesignArchitectureData as jest.Mock).mockResolvedValue(longMockData);
    render(<DesignArchitecture />);
    await waitFor(() => {
      expect(screen.getByText(/very very very very very very very very very very very long title/i)).toBeInTheDocument();
      expect(screen.getByText(/very very very very very very very very very very very long description/i)).toBeInTheDocument();
    });
  });

  it('provides accessible labels and roles', async () => {
    (api.fetchDesignArchitectureData as jest.Mock).mockResolvedValue(mockDesignArchitectureData);
    render(<DesignArchitecture />);
    await waitFor(() => {
      const heading = screen.getByRole('heading', { name: mockDesignArchitectureData.title });
      expect(heading).toBeInTheDocument();
    });
  });

  it('navigates to detail page on click', async () => {
    (api.fetchDesignArchitectureData as jest.Mock).mockResolvedValue(mockDesignArchitectureData);
    const mockNavigate = jest.fn();
    jest.mock('react-router-dom', () => ({
      ...jest.requireActual('react-router-dom'),
      useNavigate: () => mockNavigate,
    }));

    render(<DesignArchitecture />);

    await waitFor(() => {
      const viewDetailsButton = screen.getByRole('button', { name: /View Details/i });
      fireEvent.click(viewDetailsButton);
      expect(mockNavigate).toHaveBeenCalled();
    });
  });

  it('renders with a specific theme', async () => {
    (api.fetchDesignArchitectureData as jest.Mock).mockResolvedValue(mockDesignArchitectureData);
    render(<DesignArchitecture theme="dark" />);
    await waitFor(() => {
      const component = screen.getByTestId('design-architecture-container');
      expect(component).toHaveClass('dark');
    });
  });

  it('handles timeout errors from the API', async () => {
    (api.fetchDesignArchitectureData as jest.Mock).mockRejectedValue(new Error('Timeout'));
    render(<DesignArchitecture />);
    await waitFor(() => {
      expect(screen.getByText(/Timeout/i)).toBeInTheDocument();
    });
  });

  it('displays a retry button after an error', async () => {
    (api.fetchDesignArchitectureData as jest.Mock).mockRejectedValue(new Error('API Error'));
    render(<DesignArchitecture />);
    await waitFor(() => {
      const retryButton = screen.getByRole('button', { name: /Retry/i });
      expect(retryButton).toBeInTheDocument();
    });
  });

  it('retries fetching data when the retry button is clicked', async () => {
    (api.fetchDesignArchitectureData as jest.Mock)
      .mockRejectedValueOnce(new Error('API Error'))
      .mockResolvedValueOnce(mockDesignArchitectureData);

    render(<DesignArchitecture />);

    await waitFor(() => {
      const retryButton = screen.getByRole('button', { name: /Retry/i });
      expect(retryButton).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Retry/i }));

    await waitFor(() => {
      expect(api.fetchDesignArchitectureData).toHaveBeenCalledTimes(2);
      expect(screen.getByText(mockDesignArchitectureData.title)).toBeInTheDocument();
    });
  });

  it('renders correctly with RTL text direction', async () => {
    (api.fetchDesignArchitectureData as jest.Mock).mockResolvedValue(mockDesignArchitectureData);
    render(<DesignArchitecture dir="rtl" />);
    await waitFor(() => {
      const component = screen.getByTestId('design-architecture-container');
      expect(component).toHaveAttribute('dir', 'rtl');
    });
  });
});