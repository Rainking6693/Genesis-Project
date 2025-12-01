import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { Landing } from '../Landing'; // Replace with the actual path to your component

// Mock any external dependencies, e.g., API calls, context providers, etc.
jest.mock('../api/landingService', () => ({
  fetchLandingData: jest.fn(() => Promise.resolve({
    title: 'Test Title',
    description: 'Test Description',
    features: ['Feature 1', 'Feature 2'],
  })),
}));

describe('Landing Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<Landing />);
  });

  it('displays loading state initially', () => {
    render(<Landing />);
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  it('fetches and displays landing data on successful API call', async () => {
    const { fetchLandingData } = require('../api/landingService');
    (fetchLandingData as jest.Mock).mockResolvedValueOnce({
      title: 'Fetched Title',
      description: 'Fetched Description',
      features: ['Fetched Feature 1', 'Fetched Feature 2'],
    });

    render(<Landing />);

    await waitFor(() => {
      expect(screen.getByText(/Fetched Title/i)).toBeInTheDocument();
      expect(screen.getByText(/Fetched Description/i)).toBeInTheDocument();
      expect(screen.getByText(/Fetched Feature 1/i)).toBeInTheDocument();
      expect(screen.getByText(/Fetched Feature 2/i)).toBeInTheDocument();
    });
  });

  it('displays an error message when API call fails', async () => {
    const { fetchLandingData } = require('../api/landingService');
    (fetchLandingData as jest.Mock).mockRejectedValueOnce(new Error('API Error'));

    render(<Landing />);

    await waitFor(() => {
      expect(screen.getByText(/Error fetching data/i)).toBeInTheDocument();
    });
  });

  it('retries fetching data when retry button is clicked after an error', async () => {
    const { fetchLandingData } = require('../api/landingService');
    (fetchLandingData as jest.Mock)
      .mockRejectedValueOnce(new Error('API Error'))
      .mockResolvedValueOnce({
        title: 'Retried Title',
        description: 'Retried Description',
        features: ['Retried Feature 1', 'Retried Feature 2'],
      });

    render(<Landing />);

    await waitFor(() => {
      expect(screen.getByText(/Error fetching data/i)).toBeInTheDocument();
    });

    const retryButton = screen.getByRole('button', { name: /Retry/i });
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(screen.getByText(/Retried Title/i)).toBeInTheDocument();
      expect(screen.getByText(/Retried Description/i)).toBeInTheDocument();
      expect(screen.getByText(/Retried Feature 1/i)).toBeInTheDocument();
      expect(screen.getByText(/Retried Feature 2/i)).toBeInTheDocument();
    });

    expect(fetchLandingData).toHaveBeenCalledTimes(2);
  });

  it('renders with accessibility features (e.g., proper ARIA attributes)', async () => {
    const { fetchLandingData } = require('../api/landingService');
    (fetchLandingData as jest.Mock).mockResolvedValueOnce({
      title: 'Accessible Title',
      description: 'Accessible Description',
      features: ['Accessible Feature 1', 'Accessible Feature 2'],
    });

    render(<Landing />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Accessible Title/i, level: 1 })).toBeInTheDocument();
    });
  });

  it('handles empty features array gracefully', async () => {
    const { fetchLandingData } = require('../api/landingService');
    (fetchLandingData as jest.Mock).mockResolvedValueOnce({
      title: 'Title with No Features',
      description: 'Description with No Features',
      features: [],
    });

    render(<Landing />);

    await waitFor(() => {
      expect(screen.getByText(/Title with No Features/i)).toBeInTheDocument();
      expect(screen.getByText(/Description with No Features/i)).toBeInTheDocument();
    });

    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('displays a default message when description is empty', async () => {
    const { fetchLandingData } = require('../api/landingService');
    (fetchLandingData as jest.Mock).mockResolvedValueOnce({
      title: 'Title with Empty Description',
      description: '',
      features: ['Feature 1'],
    });

    render(<Landing />);

    await waitFor(() => {
      expect(screen.getByText(/Title with Empty Description/i)).toBeInTheDocument();
      expect(screen.getByText(/No description available./i)).toBeInTheDocument();
    });
  });

  it('truncates long descriptions', async () => {
    const longDescription = 'This is a very long description that should be truncated. It has more than 200 characters to ensure the truncation logic is working correctly.  We need to add even more text to make sure it really gets truncated. And even more!';
    const { fetchLandingData } = require('../api/landingService');
    (fetchLandingData as jest.Mock).mockResolvedValueOnce({
      title: 'Title with Long Description',
      description: longDescription,
      features: ['Feature 1'],
    });

    render(<Landing />);

    await waitFor(() => {
      expect(screen.getByText(/Title with Long Description/i)).toBeInTheDocument();
      expect(screen.getByText(longDescription.substring(0, 200) + '...')).toBeInTheDocument();
    });
  });

  it('renders features as a list', async () => {
    const { fetchLandingData } = require('../api/landingService');
    (fetchLandingData as jest.Mock).mockResolvedValueOnce({
      title: 'Title with Features',
      description: 'Description with Features',
      features: ['Feature 1', 'Feature 2', 'Feature 3'],
    });

    render(<Landing />);

    await waitFor(() => {
      expect(screen.getByRole('list')).toBeInTheDocument();
      expect(screen.getAllByRole('listitem').length).toBe(3);
      expect(screen.getByText(/Feature 1/i)).toBeInTheDocument();
      expect(screen.getByText(/Feature 2/i)).toBeInTheDocument();
      expect(screen.getByText(/Feature 3/i)).toBeInTheDocument();
    });
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { Landing } from '../Landing'; // Replace with the actual path to your component

// Mock any external dependencies, e.g., API calls, context providers, etc.
jest.mock('../api/landingService', () => ({
  fetchLandingData: jest.fn(() => Promise.resolve({
    title: 'Test Title',
    description: 'Test Description',
    features: ['Feature 1', 'Feature 2'],
  })),
}));

describe('Landing Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<Landing />);
  });

  it('displays loading state initially', () => {
    render(<Landing />);
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  it('fetches and displays landing data on successful API call', async () => {
    const { fetchLandingData } = require('../api/landingService');
    (fetchLandingData as jest.Mock).mockResolvedValueOnce({
      title: 'Fetched Title',
      description: 'Fetched Description',
      features: ['Fetched Feature 1', 'Fetched Feature 2'],
    });

    render(<Landing />);

    await waitFor(() => {
      expect(screen.getByText(/Fetched Title/i)).toBeInTheDocument();
      expect(screen.getByText(/Fetched Description/i)).toBeInTheDocument();
      expect(screen.getByText(/Fetched Feature 1/i)).toBeInTheDocument();
      expect(screen.getByText(/Fetched Feature 2/i)).toBeInTheDocument();
    });
  });

  it('displays an error message when API call fails', async () => {
    const { fetchLandingData } = require('../api/landingService');
    (fetchLandingData as jest.Mock).mockRejectedValueOnce(new Error('API Error'));

    render(<Landing />);

    await waitFor(() => {
      expect(screen.getByText(/Error fetching data/i)).toBeInTheDocument();
    });
  });

  it('retries fetching data when retry button is clicked after an error', async () => {
    const { fetchLandingData } = require('../api/landingService');
    (fetchLandingData as jest.Mock)
      .mockRejectedValueOnce(new Error('API Error'))
      .mockResolvedValueOnce({
        title: 'Retried Title',
        description: 'Retried Description',
        features: ['Retried Feature 1', 'Retried Feature 2'],
      });

    render(<Landing />);

    await waitFor(() => {
      expect(screen.getByText(/Error fetching data/i)).toBeInTheDocument();
    });

    const retryButton = screen.getByRole('button', { name: /Retry/i });
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(screen.getByText(/Retried Title/i)).toBeInTheDocument();
      expect(screen.getByText(/Retried Description/i)).toBeInTheDocument();
      expect(screen.getByText(/Retried Feature 1/i)).toBeInTheDocument();
      expect(screen.getByText(/Retried Feature 2/i)).toBeInTheDocument();
    });

    expect(fetchLandingData).toHaveBeenCalledTimes(2);
  });

  it('renders with accessibility features (e.g., proper ARIA attributes)', async () => {
    const { fetchLandingData } = require('../api/landingService');
    (fetchLandingData as jest.Mock).mockResolvedValueOnce({
      title: 'Accessible Title',
      description: 'Accessible Description',
      features: ['Accessible Feature 1', 'Accessible Feature 2'],
    });

    render(<Landing />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Accessible Title/i, level: 1 })).toBeInTheDocument();
    });
  });

  it('handles empty features array gracefully', async () => {
    const { fetchLandingData } = require('../api/landingService');
    (fetchLandingData as jest.Mock).mockResolvedValueOnce({
      title: 'Title with No Features',
      description: 'Description with No Features',
      features: [],
    });

    render(<Landing />);

    await waitFor(() => {
      expect(screen.getByText(/Title with No Features/i)).toBeInTheDocument();
      expect(screen.getByText(/Description with No Features/i)).toBeInTheDocument();
    });

    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('displays a default message when description is empty', async () => {
    const { fetchLandingData } = require('../api/landingService');
    (fetchLandingData as jest.Mock).mockResolvedValueOnce({
      title: 'Title with Empty Description',
      description: '',
      features: ['Feature 1'],
    });

    render(<Landing />);

    await waitFor(() => {
      expect(screen.getByText(/Title with Empty Description/i)).toBeInTheDocument();
      expect(screen.getByText(/No description available./i)).toBeInTheDocument();
    });
  });

  it('truncates long descriptions', async () => {
    const longDescription = 'This is a very long description that should be truncated. It has more than 200 characters to ensure the truncation logic is working correctly.  We need to add even more text to make sure it really gets truncated. And even more!';
    const { fetchLandingData } = require('../api/landingService');
    (fetchLandingData as jest.Mock).mockResolvedValueOnce({
      title: 'Title with Long Description',
      description: longDescription,
      features: ['Feature 1'],
    });

    render(<Landing />);

    await waitFor(() => {
      expect(screen.getByText(/Title with Long Description/i)).toBeInTheDocument();
      expect(screen.getByText(longDescription.substring(0, 200) + '...')).toBeInTheDocument();
    });
  });

  it('renders features as a list', async () => {
    const { fetchLandingData } = require('../api/landingService');
    (fetchLandingData as jest.Mock).mockResolvedValueOnce({
      title: 'Title with Features',
      description: 'Description with Features',
      features: ['Feature 1', 'Feature 2', 'Feature 3'],
    });

    render(<Landing />);

    await waitFor(() => {
      expect(screen.getByRole('list')).toBeInTheDocument();
      expect(screen.getAllByRole('listitem').length).toBe(3);
      expect(screen.getByText(/Feature 1/i)).toBeInTheDocument();
      expect(screen.getByText(/Feature 2/i)).toBeInTheDocument();
      expect(screen.getByText(/Feature 3/i)).toBeInTheDocument();
    });
  });
});