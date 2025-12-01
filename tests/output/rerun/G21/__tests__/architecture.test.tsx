import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DesignArchitecture } from '../components/DesignArchitecture'; // Replace with the actual path
import { mockDesignArchitectureData } from './mocks/designArchitectureData'; // Create a mock data file
import * as api from '../api/designArchitectureApi'; // Replace with the actual path to your API
import '@testing-library/jest-dom';

jest.mock('../api/designArchitectureApi');

describe('DesignArchitecture Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    (api.fetchDesignArchitectureData as jest.Mock).mockResolvedValue(null);
    render(<DesignArchitecture />);
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  it('renders design architecture data after loading', async () => {
    (api.fetchDesignArchitectureData as jest.Mock).mockResolvedValue(mockDesignArchitectureData);
    render(<DesignArchitecture />);
    await waitFor(() => expect(screen.getByText(mockDesignArchitectureData.title)).toBeInTheDocument());
    expect(screen.getByText(mockDesignArchitectureData.description)).toBeInTheDocument();
    expect(screen.getByAltText(mockDesignArchitectureData.imageAlt)).toBeInTheDocument();
  });

  it('displays an error message when data fetching fails', async () => {
    (api.fetchDesignArchitectureData as jest.Mock).mockRejectedValue(new Error('Failed to fetch data'));
    render(<DesignArchitecture />);
    await waitFor(() => expect(screen.getByText(/Error/i)).toBeInTheDocument());
  });

  it('handles empty data gracefully', async () => {
    (api.fetchDesignArchitectureData as jest.Mock).mockResolvedValue({ title: '', description: '', imageUrl: '', imageAlt: '' });
    render(<DesignArchitecture />);
    await waitFor(() => expect(screen.getByText(/No data available/i)).toBeInTheDocument());
  });

  it('renders a fallback image when the image fails to load', async () => {
    (api.fetchDesignArchitectureData as jest.Mock).mockResolvedValue(mockDesignArchitectureData);
    render(<DesignArchitecture />);
    await waitFor(() => expect(screen.getByAltText(mockDesignArchitectureData.imageAlt)).toBeInTheDocument());

    const image = screen.getByAltText(mockDesignArchitectureData.imageAlt) as HTMLImageElement;
    fireEvent.error(image);

    await waitFor(() => expect(screen.getByAltText(/Fallback Image/i)).toBeInTheDocument());
  });

  it('renders the component with correct accessibility attributes', async () => {
    (api.fetchDesignArchitectureData as jest.Mock).mockResolvedValue(mockDesignArchitectureData);
    render(<DesignArchitecture />);
    await waitFor(() => expect(screen.getByText(mockDesignArchitectureData.title)).toBeInTheDocument());

    const heading = screen.getByText(mockDesignArchitectureData.title);
    expect(heading).toHaveAttribute('aria-level', '1'); // Assuming title is rendered as h1
  });

  it('renders the component with correct image attributes', async () => {
    (api.fetchDesignArchitectureData as jest.Mock).mockResolvedValue(mockDesignArchitectureData);
    render(<DesignArchitecture />);
    await waitFor(() => expect(screen.getByAltText(mockDesignArchitectureData.imageAlt)).toBeInTheDocument());

    const image = screen.getByAltText(mockDesignArchitectureData.imageAlt);
    expect(image).toHaveAttribute('src', mockDesignArchitectureData.imageUrl);
    expect(image).toHaveAttribute('alt', mockDesignArchitectureData.imageAlt);
  });

  it('renders the description with correct styling', async () => {
    (api.fetchDesignArchitectureData as jest.Mock).mockResolvedValue(mockDesignArchitectureData);
    render(<DesignArchitecture />);
    await waitFor(() => expect(screen.getByText(mockDesignArchitectureData.description)).toBeInTheDocument());

    const description = screen.getByText(mockDesignArchitectureData.description);
    expect(description).toBeVisible(); // Basic check for visibility
  });

  it('handles a very long description without breaking the layout', async () => {
    const longDescription = 'This is a very long description '.repeat(50);
    (api.fetchDesignArchitectureData as jest.Mock).mockResolvedValue({ ...mockDesignArchitectureData, description: longDescription });
    render(<DesignArchitecture />);
    await waitFor(() => expect(screen.getByText(longDescription)).toBeInTheDocument());

    const descriptionElement = screen.getByText(longDescription);
    expect(descriptionElement).toBeVisible();
  });

  it('renders different data when props change', async () => {
    const mockData1 = { title: 'Title 1', description: 'Description 1', imageUrl: 'url1', imageAlt: 'Alt 1' };
    const mockData2 = { title: 'Title 2', description: 'Description 2', imageUrl: 'url2', imageAlt: 'Alt 2' };

    (api.fetchDesignArchitectureData as jest.Mock).mockResolvedValue(mockData1);
    const { rerender } = render(<DesignArchitecture />);
    await waitFor(() => expect(screen.getByText(mockData1.title)).toBeInTheDocument());

    (api.fetchDesignArchitectureData as jest.Mock).mockResolvedValue(mockData2);
    rerender(<DesignArchitecture />);
    await waitFor(() => expect(screen.getByText(mockData2.title)).toBeInTheDocument());
    expect(screen.queryByText(mockData1.title)).toBeNull();
  });

  it('does not attempt to render if data is null', async () => {
    (api.fetchDesignArchitectureData as jest.Mock).mockResolvedValue(null);
    render(<DesignArchitecture />);
    await waitFor(() => expect(screen.getByText(/Loading/i)).toBeInTheDocument());
  });

  it('renders the component with a specific className', async () => {
    (api.fetchDesignArchitectureData as jest.Mock).mockResolvedValue(mockDesignArchitectureData);
    const className = 'custom-class';
    const { container } = render(<DesignArchitecture className={className} />);
    await waitFor(() => expect(screen.getByText(mockDesignArchitectureData.title)).toBeInTheDocument());
    expect(container.firstChild).toHaveClass(className);
  });

  it('handles special characters in the title and description', async () => {
    const mockDataWithSpecialChars = {
      title: 'Title with & < > " \' special characters',
      description: 'Description with & < > " \' special characters',
      imageUrl: 'url',
      imageAlt: 'Alt',
    };
    (api.fetchDesignArchitectureData as jest.Mock).mockResolvedValue(mockDataWithSpecialChars);
    render(<DesignArchitecture />);
    await waitFor(() => expect(screen.getByText(/Title with & < > " ' special characters/i)).toBeInTheDocument());
    expect(screen.getByText(/Description with & < > " ' special characters/i)).toBeInTheDocument();
  });

  it('renders the component with a custom data-testid', async () => {
    (api.fetchDesignArchitectureData as jest.Mock).mockResolvedValue(mockDesignArchitectureData);
    const testId = 'custom-test-id';
    render(<DesignArchitecture data-testid={testId} />);
    await waitFor(() => expect(screen.getByText(mockDesignArchitectureData.title)).toBeInTheDocument());
    expect(screen.getByTestId(testId)).toBeInTheDocument();
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DesignArchitecture } from '../components/DesignArchitecture'; // Replace with the actual path
import { mockDesignArchitectureData } from './mocks/designArchitectureData'; // Create a mock data file
import * as api from '../api/designArchitectureApi'; // Replace with the actual path to your API
import '@testing-library/jest-dom';

jest.mock('../api/designArchitectureApi');

describe('DesignArchitecture Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    (api.fetchDesignArchitectureData as jest.Mock).mockResolvedValue(null);
    render(<DesignArchitecture />);
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  it('renders design architecture data after loading', async () => {
    (api.fetchDesignArchitectureData as jest.Mock).mockResolvedValue(mockDesignArchitectureData);
    render(<DesignArchitecture />);
    await waitFor(() => expect(screen.getByText(mockDesignArchitectureData.title)).toBeInTheDocument());
    expect(screen.getByText(mockDesignArchitectureData.description)).toBeInTheDocument();
    expect(screen.getByAltText(mockDesignArchitectureData.imageAlt)).toBeInTheDocument();
  });

  it('displays an error message when data fetching fails', async () => {
    (api.fetchDesignArchitectureData as jest.Mock).mockRejectedValue(new Error('Failed to fetch data'));
    render(<DesignArchitecture />);
    await waitFor(() => expect(screen.getByText(/Error/i)).toBeInTheDocument());
  });

  it('handles empty data gracefully', async () => {
    (api.fetchDesignArchitectureData as jest.Mock).mockResolvedValue({ title: '', description: '', imageUrl: '', imageAlt: '' });
    render(<DesignArchitecture />);
    await waitFor(() => expect(screen.getByText(/No data available/i)).toBeInTheDocument());
  });

  it('renders a fallback image when the image fails to load', async () => {
    (api.fetchDesignArchitectureData as jest.Mock).mockResolvedValue(mockDesignArchitectureData);
    render(<DesignArchitecture />);
    await waitFor(() => expect(screen.getByAltText(mockDesignArchitectureData.imageAlt)).toBeInTheDocument());

    const image = screen.getByAltText(mockDesignArchitectureData.imageAlt) as HTMLImageElement;
    fireEvent.error(image);

    await waitFor(() => expect(screen.getByAltText(/Fallback Image/i)).toBeInTheDocument());
  });

  it('renders the component with correct accessibility attributes', async () => {
    (api.fetchDesignArchitectureData as jest.Mock).mockResolvedValue(mockDesignArchitectureData);
    render(<DesignArchitecture />);
    await waitFor(() => expect(screen.getByText(mockDesignArchitectureData.title)).toBeInTheDocument());

    const heading = screen.getByText(mockDesignArchitectureData.title);
    expect(heading).toHaveAttribute('aria-level', '1'); // Assuming title is rendered as h1
  });

  it('renders the component with correct image attributes', async () => {
    (api.fetchDesignArchitectureData as jest.Mock).mockResolvedValue(mockDesignArchitectureData);
    render(<DesignArchitecture />);
    await waitFor(() => expect(screen.getByAltText(mockDesignArchitectureData.imageAlt)).toBeInTheDocument());

    const image = screen.getByAltText(mockDesignArchitectureData.imageAlt);
    expect(image).toHaveAttribute('src', mockDesignArchitectureData.imageUrl);
    expect(image).toHaveAttribute('alt', mockDesignArchitectureData.imageAlt);
  });

  it('renders the description with correct styling', async () => {
    (api.fetchDesignArchitectureData as jest.Mock).mockResolvedValue(mockDesignArchitectureData);
    render(<DesignArchitecture />);
    await waitFor(() => expect(screen.getByText(mockDesignArchitectureData.description)).toBeInTheDocument());

    const description = screen.getByText(mockDesignArchitectureData.description);
    expect(description).toBeVisible(); // Basic check for visibility
  });

  it('handles a very long description without breaking the layout', async () => {
    const longDescription = 'This is a very long description '.repeat(50);
    (api.fetchDesignArchitectureData as jest.Mock).mockResolvedValue({ ...mockDesignArchitectureData, description: longDescription });
    render(<DesignArchitecture />);
    await waitFor(() => expect(screen.getByText(longDescription)).toBeInTheDocument());

    const descriptionElement = screen.getByText(longDescription);
    expect(descriptionElement).toBeVisible();
  });

  it('renders different data when props change', async () => {
    const mockData1 = { title: 'Title 1', description: 'Description 1', imageUrl: 'url1', imageAlt: 'Alt 1' };
    const mockData2 = { title: 'Title 2', description: 'Description 2', imageUrl: 'url2', imageAlt: 'Alt 2' };

    (api.fetchDesignArchitectureData as jest.Mock).mockResolvedValue(mockData1);
    const { rerender } = render(<DesignArchitecture />);
    await waitFor(() => expect(screen.getByText(mockData1.title)).toBeInTheDocument());

    (api.fetchDesignArchitectureData as jest.Mock).mockResolvedValue(mockData2);
    rerender(<DesignArchitecture />);
    await waitFor(() => expect(screen.getByText(mockData2.title)).toBeInTheDocument());
    expect(screen.queryByText(mockData1.title)).toBeNull();
  });

  it('does not attempt to render if data is null', async () => {
    (api.fetchDesignArchitectureData as jest.Mock).mockResolvedValue(null);
    render(<DesignArchitecture />);
    await waitFor(() => expect(screen.getByText(/Loading/i)).toBeInTheDocument());
  });

  it('renders the component with a specific className', async () => {
    (api.fetchDesignArchitectureData as jest.Mock).mockResolvedValue(mockDesignArchitectureData);
    const className = 'custom-class';
    const { container } = render(<DesignArchitecture className={className} />);
    await waitFor(() => expect(screen.getByText(mockDesignArchitectureData.title)).toBeInTheDocument());
    expect(container.firstChild).toHaveClass(className);
  });

  it('handles special characters in the title and description', async () => {
    const mockDataWithSpecialChars = {
      title: 'Title with & < > " \' special characters',
      description: 'Description with & < > " \' special characters',
      imageUrl: 'url',
      imageAlt: 'Alt',
    };
    (api.fetchDesignArchitectureData as jest.Mock).mockResolvedValue(mockDataWithSpecialChars);
    render(<DesignArchitecture />);
    await waitFor(() => expect(screen.getByText(/Title with & < > " ' special characters/i)).toBeInTheDocument());
    expect(screen.getByText(/Description with & < > " ' special characters/i)).toBeInTheDocument();
  });

  it('renders the component with a custom data-testid', async () => {
    (api.fetchDesignArchitectureData as jest.Mock).mockResolvedValue(mockDesignArchitectureData);
    const testId = 'custom-test-id';
    render(<DesignArchitecture data-testid={testId} />);
    await waitFor(() => expect(screen.getByText(mockDesignArchitectureData.title)).toBeInTheDocument());
    expect(screen.getByTestId(testId)).toBeInTheDocument();
  });
});