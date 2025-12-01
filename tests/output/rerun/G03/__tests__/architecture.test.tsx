import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import DesignArchitecture from '../components/DesignArchitecture';

// Mock any external dependencies, e.g., API calls, custom hooks
jest.mock('../utils/api', () => ({
  fetchDesignArchitectureData: jest.fn(() => Promise.resolve({
    title: 'Mock Title',
    description: 'Mock Description',
    imageUrl: 'mock-image.jpg',
    features: ['Feature 1', 'Feature 2'],
  })),
}));

describe('DesignArchitecture Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the component with loading state', () => {
    render(<DesignArchitecture />);
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  it('renders the component with data after loading', async () => {
    const { fetchDesignArchitectureData } = require('../utils/api');
    fetchDesignArchitectureData.mockResolvedValueOnce({
      title: 'Test Title',
      description: 'Test Description',
      imageUrl: 'test-image.jpg',
      features: ['Feature A', 'Feature B'],
    });

    render(<DesignArchitecture />);
    await waitFor(() => expect(screen.getByText(/Test Title/i)).toBeInTheDocument());
    expect(screen.getByText(/Test Description/i)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Test Title/i })).toBeInTheDocument();
    expect(screen.getByText(/Feature A/i)).toBeInTheDocument();
    expect(screen.getByText(/Feature B/i)).toBeInTheDocument();
  });

  it('handles error state when data fetching fails', async () => {
    const { fetchDesignArchitectureData } = require('../utils/api');
    fetchDesignArchitectureData.mockRejectedValueOnce(new Error('Failed to fetch data'));

    render(<DesignArchitecture />);
    await waitFor(() => expect(screen.getByText(/Error/i)).toBeInTheDocument());
  });

  it('renders a default image when imageUrl is missing', async () => {
    const { fetchDesignArchitectureData } = require('../utils/api');
    fetchDesignArchitectureData.mockResolvedValueOnce({
      title: 'Test Title',
      description: 'Test Description',
      imageUrl: '',
      features: ['Feature A', 'Feature B'],
    });

    render(<DesignArchitecture />);
    await waitFor(() => expect(screen.getByText(/Test Title/i)).toBeInTheDocument());
    const image = screen.getByRole('img', { name: /Test Title/i });
    expect(image).toHaveAttribute('src', 'default-image.jpg'); // Replace with your actual default image path
  });

  it('renders an empty features list when features are not provided', async () => {
    const { fetchDesignArchitectureData } = require('../utils/api');
    fetchDesignArchitectureData.mockResolvedValueOnce({
      title: 'Test Title',
      description: 'Test Description',
      imageUrl: 'test-image.jpg',
      features: [],
    });

    render(<DesignArchitecture />);
    await waitFor(() => expect(screen.getByText(/Test Title/i)).toBeInTheDocument());
    const list = screen.queryByRole('list');
    expect(list).not.toBeInTheDocument();
  });

  it('renders null when data is null', async () => {
    const { fetchDesignArchitectureData } = require('../utils/api');
    fetchDesignArchitectureData.mockResolvedValueOnce(null);

    const { container } = render(<DesignArchitecture />);
    await waitFor(() => expect(container.firstChild).toBeNull());
  });

  it('renders accessibility attributes correctly', async () => {
    const { fetchDesignArchitectureData } = require('../utils/api');
    fetchDesignArchitectureData.mockResolvedValueOnce({
      title: 'Accessible Title',
      description: 'Accessible Description',
      imageUrl: 'accessible-image.jpg',
      features: ['Feature X', 'Feature Y'],
    });

    render(<DesignArchitecture />);
    await waitFor(() => expect(screen.getByText(/Accessible Title/i)).toBeInTheDocument());

    const image = screen.getByRole('img', { name: /Accessible Title/i });
    expect(image).toHaveAttribute('alt', 'Accessible Title');
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import DesignArchitecture from '../components/DesignArchitecture';

// Mock any external dependencies, e.g., API calls, custom hooks
jest.mock('../utils/api', () => ({
  fetchDesignArchitectureData: jest.fn(() => Promise.resolve({
    title: 'Mock Title',
    description: 'Mock Description',
    imageUrl: 'mock-image.jpg',
    features: ['Feature 1', 'Feature 2'],
  })),
}));

describe('DesignArchitecture Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the component with loading state', () => {
    render(<DesignArchitecture />);
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  it('renders the component with data after loading', async () => {
    const { fetchDesignArchitectureData } = require('../utils/api');
    fetchDesignArchitectureData.mockResolvedValueOnce({
      title: 'Test Title',
      description: 'Test Description',
      imageUrl: 'test-image.jpg',
      features: ['Feature A', 'Feature B'],
    });

    render(<DesignArchitecture />);
    await waitFor(() => expect(screen.getByText(/Test Title/i)).toBeInTheDocument());
    expect(screen.getByText(/Test Description/i)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Test Title/i })).toBeInTheDocument();
    expect(screen.getByText(/Feature A/i)).toBeInTheDocument();
    expect(screen.getByText(/Feature B/i)).toBeInTheDocument();
  });

  it('handles error state when data fetching fails', async () => {
    const { fetchDesignArchitectureData } = require('../utils/api');
    fetchDesignArchitectureData.mockRejectedValueOnce(new Error('Failed to fetch data'));

    render(<DesignArchitecture />);
    await waitFor(() => expect(screen.getByText(/Error/i)).toBeInTheDocument());
  });

  it('renders a default image when imageUrl is missing', async () => {
    const { fetchDesignArchitectureData } = require('../utils/api');
    fetchDesignArchitectureData.mockResolvedValueOnce({
      title: 'Test Title',
      description: 'Test Description',
      imageUrl: '',
      features: ['Feature A', 'Feature B'],
    });

    render(<DesignArchitecture />);
    await waitFor(() => expect(screen.getByText(/Test Title/i)).toBeInTheDocument());
    const image = screen.getByRole('img', { name: /Test Title/i });
    expect(image).toHaveAttribute('src', 'default-image.jpg'); // Replace with your actual default image path
  });

  it('renders an empty features list when features are not provided', async () => {
    const { fetchDesignArchitectureData } = require('../utils/api');
    fetchDesignArchitectureData.mockResolvedValueOnce({
      title: 'Test Title',
      description: 'Test Description',
      imageUrl: 'test-image.jpg',
      features: [],
    });

    render(<DesignArchitecture />);
    await waitFor(() => expect(screen.getByText(/Test Title/i)).toBeInTheDocument());
    const list = screen.queryByRole('list');
    expect(list).not.toBeInTheDocument();
  });

  it('renders null when data is null', async () => {
    const { fetchDesignArchitectureData } = require('../utils/api');
    fetchDesignArchitectureData.mockResolvedValueOnce(null);

    const { container } = render(<DesignArchitecture />);
    await waitFor(() => expect(container.firstChild).toBeNull());
  });

  it('renders accessibility attributes correctly', async () => {
    const { fetchDesignArchitectureData } = require('../utils/api');
    fetchDesignArchitectureData.mockResolvedValueOnce({
      title: 'Accessible Title',
      description: 'Accessible Description',
      imageUrl: 'accessible-image.jpg',
      features: ['Feature X', 'Feature Y'],
    });

    render(<DesignArchitecture />);
    await waitFor(() => expect(screen.getByText(/Accessible Title/i)).toBeInTheDocument());

    const image = screen.getByRole('img', { name: /Accessible Title/i });
    expect(image).toHaveAttribute('alt', 'Accessible Title');
  });
});