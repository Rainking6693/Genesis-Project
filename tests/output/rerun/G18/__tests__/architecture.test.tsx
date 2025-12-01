import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DesignArchitecture from '../DesignArchitecture'; // Adjust the import path as needed
import * as api from '../../api'; // Mock API calls
import { mockDesignArchitectureData, mockError } from './mocks'; // Mock data and errors
import '@testing-library/jest-dom';

jest.mock('../../api');

describe('DesignArchitecture Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    (api.fetchDesignArchitecture as jest.Mock).mockResolvedValue(mockDesignArchitectureData);
    render(<DesignArchitecture />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('fetches and displays design architecture data', async () => {
    (api.fetchDesignArchitecture as jest.Mock).mockResolvedValue(mockDesignArchitectureData);
    render(<DesignArchitecture />);
    await waitFor(() => expect(api.fetchDesignArchitecture).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByText(mockDesignArchitectureData.title)).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText(mockDesignArchitectureData.description)).toBeInTheDocument());
  });

  it('handles API error and displays error message', async () => {
    (api.fetchDesignArchitecture as jest.Mock).mockRejectedValue(mockError);
    render(<DesignArchitecture />);
    await waitFor(() => expect(api.fetchDesignArchitecture).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByText(/error/i)).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText(mockError.message)).toBeInTheDocument());
  });

  it('allows users to interact with interactive elements (e.g., buttons, links)', async () => {
    (api.fetchDesignArchitecture as jest.Mock).mockResolvedValue(mockDesignArchitectureData);
    render(<DesignArchitecture />);
    await waitFor(() => expect(api.fetchDesignArchitecture).toHaveBeenCalledTimes(1));
    await waitFor(() => screen.getByText(mockDesignArchitectureData.title));

    const button = screen.getByRole('button', { name: /view details/i }); // Adjust based on actual button text
    userEvent.click(button);
    // Add assertions based on what happens after the button click
  });

  it('updates data when a refresh button is clicked', async () => {
    (api.fetchDesignArchitecture as jest.Mock).mockResolvedValue(mockDesignArchitectureData);
    render(<DesignArchitecture />);
    await waitFor(() => expect(api.fetchDesignArchitecture).toHaveBeenCalledTimes(1));
    await waitFor(() => screen.getByText(mockDesignArchitectureData.title));

    const refreshButton = screen.getByRole('button', { name: /refresh/i }); // Adjust based on actual button text
    (api.fetchDesignArchitecture as jest.Mock).mockResolvedValueOnce({ ...mockDesignArchitectureData, title: 'Updated Title' });

    act(() => {
      fireEvent.click(refreshButton);
    });

    await waitFor(() => expect(api.fetchDesignArchitecture).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByText(/updated title/i)).toBeInTheDocument());
  });

  it('handles empty data gracefully', async () => {
    (api.fetchDesignArchitecture as jest.Mock).mockResolvedValue({ title: '', description: '' });
    render(<DesignArchitecture />);
    await waitFor(() => expect(api.fetchDesignArchitecture).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByText(/no data available/i)).toBeInTheDocument());
  });

  it('renders accessibility features (e.g., ARIA attributes, semantic HTML)', async () => {
    (api.fetchDesignArchitecture as jest.Mock).mockResolvedValue(mockDesignArchitectureData);
    render(<DesignArchitecture />);
    await waitFor(() => expect(api.fetchDesignArchitecture).toHaveBeenCalledTimes(1));
    await waitFor(() => screen.getByText(mockDesignArchitectureData.title));

    const heading = screen.getByRole('heading', { name: mockDesignArchitectureData.title });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveAttribute('aria-level', '1'); // Or appropriate level
  });

  it('displays a specific message when data is not found', async () => {
    (api.fetchDesignArchitecture as jest.Mock).mockResolvedValue(null);
    render(<DesignArchitecture />);
    await waitFor(() => expect(api.fetchDesignArchitecture).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByText(/data not found/i)).toBeInTheDocument());
  });

  it('retries fetching data after a failed attempt', async () => {
    (api.fetchDesignArchitecture as jest.Mock)
      .mockRejectedValueOnce(mockError)
      .mockResolvedValueOnce(mockDesignArchitectureData);

    render(<DesignArchitecture />);

    await waitFor(() => expect(api.fetchDesignArchitecture).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByText(/error/i)).toBeInTheDocument());

    const retryButton = screen.getByRole('button', { name: /retry/i }); // Adjust based on actual button text
    if (retryButton) {
      act(() => {
        fireEvent.click(retryButton);
      });
      await waitFor(() => expect(api.fetchDesignArchitecture).toHaveBeenCalledTimes(2));
      await waitFor(() => expect(screen.getByText(mockDesignArchitectureData.title)).toBeInTheDocument());
    }
  });

  it('navigates to a different page when a link is clicked', async () => {
    (api.fetchDesignArchitecture as jest.Mock).mockResolvedValue(mockDesignArchitectureData);
    render(<DesignArchitecture />);
    await waitFor(() => expect(api.fetchDesignArchitecture).toHaveBeenCalledTimes(1));
    await waitFor(() => screen.getByText(mockDesignArchitectureData.title));

    const link = screen.getByRole('link', { name: /learn more/i }); // Adjust based on actual link text
    userEvent.click(link);

    // Mock the window.location.assign function
    const assignMock = jest.fn();
    delete window.location;
    window.location = { assign: assignMock } as any;

    // Simulate the click event
    userEvent.click(link);

    // Assert that the window.location.assign function was called with the correct URL
    expect(assignMock).toHaveBeenCalledWith(link.href);
  });

  it('displays a fallback UI when the component fails to render', async () => {
    const originalConsoleError = console.error;
    console.error = jest.fn();

    const BrokenComponent = () => {
      throw new Error('Component failed to render');
    };

    const FallbackComponent = () => <div>Fallback UI</div>;

    const WrapperComponent = () => {
      try {
        return <BrokenComponent />;
      } catch (error) {
        return <FallbackComponent />;
      }
    };

    render(<WrapperComponent />);

    await waitFor(() => expect(screen.getByText(/fallback ui/i)).toBeInTheDocument());

    console.error = originalConsoleError;
  });
});

import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DesignArchitecture from '../DesignArchitecture'; // Adjust the import path as needed
import * as api from '../../api'; // Mock API calls
import { mockDesignArchitectureData, mockError } from './mocks'; // Mock data and errors
import '@testing-library/jest-dom';

jest.mock('../../api');

describe('DesignArchitecture Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    (api.fetchDesignArchitecture as jest.Mock).mockResolvedValue(mockDesignArchitectureData);
    render(<DesignArchitecture />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('fetches and displays design architecture data', async () => {
    (api.fetchDesignArchitecture as jest.Mock).mockResolvedValue(mockDesignArchitectureData);
    render(<DesignArchitecture />);
    await waitFor(() => expect(api.fetchDesignArchitecture).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByText(mockDesignArchitectureData.title)).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText(mockDesignArchitectureData.description)).toBeInTheDocument());
  });

  it('handles API error and displays error message', async () => {
    (api.fetchDesignArchitecture as jest.Mock).mockRejectedValue(mockError);
    render(<DesignArchitecture />);
    await waitFor(() => expect(api.fetchDesignArchitecture).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByText(/error/i)).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText(mockError.message)).toBeInTheDocument());
  });

  it('allows users to interact with interactive elements (e.g., buttons, links)', async () => {
    (api.fetchDesignArchitecture as jest.Mock).mockResolvedValue(mockDesignArchitectureData);
    render(<DesignArchitecture />);
    await waitFor(() => expect(api.fetchDesignArchitecture).toHaveBeenCalledTimes(1));
    await waitFor(() => screen.getByText(mockDesignArchitectureData.title));

    const button = screen.getByRole('button', { name: /view details/i }); // Adjust based on actual button text
    userEvent.click(button);
    // Add assertions based on what happens after the button click
  });

  it('updates data when a refresh button is clicked', async () => {
    (api.fetchDesignArchitecture as jest.Mock).mockResolvedValue(mockDesignArchitectureData);
    render(<DesignArchitecture />);
    await waitFor(() => expect(api.fetchDesignArchitecture).toHaveBeenCalledTimes(1));
    await waitFor(() => screen.getByText(mockDesignArchitectureData.title));

    const refreshButton = screen.getByRole('button', { name: /refresh/i }); // Adjust based on actual button text
    (api.fetchDesignArchitecture as jest.Mock).mockResolvedValueOnce({ ...mockDesignArchitectureData, title: 'Updated Title' });

    act(() => {
      fireEvent.click(refreshButton);
    });

    await waitFor(() => expect(api.fetchDesignArchitecture).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByText(/updated title/i)).toBeInTheDocument());
  });

  it('handles empty data gracefully', async () => {
    (api.fetchDesignArchitecture as jest.Mock).mockResolvedValue({ title: '', description: '' });
    render(<DesignArchitecture />);
    await waitFor(() => expect(api.fetchDesignArchitecture).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByText(/no data available/i)).toBeInTheDocument());
  });

  it('renders accessibility features (e.g., ARIA attributes, semantic HTML)', async () => {
    (api.fetchDesignArchitecture as jest.Mock).mockResolvedValue(mockDesignArchitectureData);
    render(<DesignArchitecture />);
    await waitFor(() => expect(api.fetchDesignArchitecture).toHaveBeenCalledTimes(1));
    await waitFor(() => screen.getByText(mockDesignArchitectureData.title));

    const heading = screen.getByRole('heading', { name: mockDesignArchitectureData.title });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveAttribute('aria-level', '1'); // Or appropriate level
  });

  it('displays a specific message when data is not found', async () => {
    (api.fetchDesignArchitecture as jest.Mock).mockResolvedValue(null);
    render(<DesignArchitecture />);
    await waitFor(() => expect(api.fetchDesignArchitecture).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByText(/data not found/i)).toBeInTheDocument());
  });

  it('retries fetching data after a failed attempt', async () => {
    (api.fetchDesignArchitecture as jest.Mock)
      .mockRejectedValueOnce(mockError)
      .mockResolvedValueOnce(mockDesignArchitectureData);

    render(<DesignArchitecture />);

    await waitFor(() => expect(api.fetchDesignArchitecture).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByText(/error/i)).toBeInTheDocument());

    const retryButton = screen.getByRole('button', { name: /retry/i }); // Adjust based on actual button text
    if (retryButton) {
      act(() => {
        fireEvent.click(retryButton);
      });
      await waitFor(() => expect(api.fetchDesignArchitecture).toHaveBeenCalledTimes(2));
      await waitFor(() => expect(screen.getByText(mockDesignArchitectureData.title)).toBeInTheDocument());
    }
  });

  it('navigates to a different page when a link is clicked', async () => {
    (api.fetchDesignArchitecture as jest.Mock).mockResolvedValue(mockDesignArchitectureData);
    render(<DesignArchitecture />);
    await waitFor(() => expect(api.fetchDesignArchitecture).toHaveBeenCalledTimes(1));
    await waitFor(() => screen.getByText(mockDesignArchitectureData.title));

    const link = screen.getByRole('link', { name: /learn more/i }); // Adjust based on actual link text
    userEvent.click(link);

    // Mock the window.location.assign function
    const assignMock = jest.fn();
    delete window.location;
    window.location = { assign: assignMock } as any;

    // Simulate the click event
    userEvent.click(link);

    // Assert that the window.location.assign function was called with the correct URL
    expect(assignMock).toHaveBeenCalledWith(link.href);
  });

  it('displays a fallback UI when the component fails to render', async () => {
    const originalConsoleError = console.error;
    console.error = jest.fn();

    const BrokenComponent = () => {
      throw new Error('Component failed to render');
    };

    const FallbackComponent = () => <div>Fallback UI</div>;

    const WrapperComponent = () => {
      try {
        return <BrokenComponent />;
      } catch (error) {
        return <FallbackComponent />;
      }
    };

    render(<WrapperComponent />);

    await waitFor(() => expect(screen.getByText(/fallback ui/i)).toBeInTheDocument());

    console.error = originalConsoleError;
  });
});