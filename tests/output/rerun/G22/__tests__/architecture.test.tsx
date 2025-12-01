import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DesignArchitecture } from '../components/DesignArchitecture'; // Adjust the import path as needed
import * as api from '../api/designArchitectureApi'; // Mock API
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

jest.mock('../api/designArchitectureApi');

describe('DesignArchitecture Component', () => {
  const mockDesignData = {
    id: '1',
    name: 'Modern Ecommerce Design',
    description: 'A sleek and modern design for your ecommerce platform.',
    features: ['Responsive Layout', 'Easy Navigation', 'Product Filtering'],
    price: 99.99,
    imageUrl: 'https://example.com/design.jpg',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    (api.fetchDesigns as jest.Mock).mockResolvedValue([]);
    render(<DesignArchitecture />);
  });

  it('displays loading state initially', () => {
    (api.fetchDesigns as jest.Mock).mockResolvedValue([]);
    render(<DesignArchitecture />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('fetches and displays design data on mount', async () => {
    (api.fetchDesigns as jest.Mock).mockResolvedValue([mockDesignData]);
    render(<DesignArchitecture />);
    await waitFor(() => expect(screen.getByText(mockDesignData.name)).toBeInTheDocument());
    expect(screen.getByText(mockDesignData.description)).toBeInTheDocument();
  });

  it('displays an error message if fetching designs fails', async () => {
    (api.fetchDesigns as jest.Mock).mockRejectedValue(new Error('Failed to fetch designs'));
    render(<DesignArchitecture />);
    await waitFor(() => expect(screen.getByText(/error/i)).toBeInTheDocument());
  });

  it('handles empty design list', async () => {
    (api.fetchDesigns as jest.Mock).mockResolvedValue([]);
    render(<DesignArchitecture />);
    await waitFor(() => expect(screen.getByText(/no designs found/i)).toBeInTheDocument());
  });

  it('filters designs based on search input', async () => {
    (api.fetchDesigns as jest.Mock).mockResolvedValue([mockDesignData, { ...mockDesignData, name: 'Old Design' }]);
    render(<DesignArchitecture />);
    await waitFor(() => expect(screen.getByText(mockDesignData.name)).toBeInTheDocument());

    const searchInput = screen.getByPlaceholderText(/search/i);
    userEvent.type(searchInput, 'Modern');

    await waitFor(() => expect(screen.getByText(mockDesignData.name)).toBeInTheDocument());
    expect(screen.queryByText('Old Design')).not.toBeInTheDocument();
  });

  it('clears the search input and displays all designs', async () => {
    (api.fetchDesigns as jest.Mock).mockResolvedValue([mockDesignData, { ...mockDesignData, name: 'Old Design' }]);
    render(<DesignArchitecture />);
    await waitFor(() => expect(screen.getByText(mockDesignData.name)).toBeInTheDocument());

    const searchInput = screen.getByPlaceholderText(/search/i);
    userEvent.type(searchInput, 'Modern');
    await waitFor(() => expect(screen.getByText(mockDesignData.name)).toBeInTheDocument());
    expect(screen.queryByText('Old Design')).not.toBeInTheDocument();

    const clearButton = screen.getByRole('button', { name: /clear/i });
    userEvent.click(clearButton);

    await waitFor(() => expect(screen.getByText('Old Design')).toBeInTheDocument());
  });

  it('sorts designs by price ascending', async () => {
    const design1 = { ...mockDesignData, price: 199.99, name: 'Expensive Design' };
    const design2 = { ...mockDesignData, price: 99.99, name: 'Cheap Design' };
    (api.fetchDesigns as jest.Mock).mockResolvedValue([design1, design2]);
    render(<DesignArchitecture />);
    await waitFor(() => expect(screen.getByText(design1.name)).toBeInTheDocument());

    const sortSelect = screen.getByLabelText(/sort by/i);
    userEvent.selectOptions(sortSelect, 'price-asc');

    const designElements = await screen.findAllByText(/design/i);
    expect(designElements[0]).toHaveTextContent('Cheap Design');
    expect(designElements[1]).toHaveTextContent('Expensive Design');
  });

  it('sorts designs by price descending', async () => {
    const design1 = { ...mockDesignData, price: 99.99, name: 'Cheap Design' };
    const design2 = { ...mockDesignData, price: 199.99, name: 'Expensive Design' };
    (api.fetchDesigns as jest.Mock).mockResolvedValue([design1, design2]);
    render(<DesignArchitecture />);
    await waitFor(() => expect(screen.getByText(design1.name)).toBeInTheDocument());

    const sortSelect = screen.getByLabelText(/sort by/i);
    userEvent.selectOptions(sortSelect, 'price-desc');

    const designElements = await screen.findAllByText(/design/i);
    expect(designElements[0]).toHaveTextContent('Expensive Design');
    expect(designElements[1]).toHaveTextContent('Cheap Design');
  });

  it('calls onAddToCart when add to cart button is clicked', async () => {
    const onAddToCart = jest.fn();
    (api.fetchDesigns as jest.Mock).mockResolvedValue([mockDesignData]);
    render(<DesignArchitecture onAddToCart={onAddToCart} />);
    await waitFor(() => expect(screen.getByText(mockDesignData.name)).toBeInTheDocument());

    const addToCartButton = screen.getByRole('button', { name: /add to cart/i });
    userEvent.click(addToCartButton);

    expect(onAddToCart).toHaveBeenCalledWith(mockDesignData);
  });

  it('renders accessibility features', async () => {
    (api.fetchDesigns as jest.Mock).mockResolvedValue([mockDesignData]);
    const { container } = render(<DesignArchitecture />);
    await waitFor(() => expect(screen.getByText(mockDesignData.name)).toBeInTheDocument());

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('updates the design list when new designs are added', async () => {
    (api.fetchDesigns as jest.Mock).mockResolvedValue([mockDesignData]);
    render(<DesignArchitecture />);
    await waitFor(() => expect(screen.getByText(mockDesignData.name)).toBeInTheDocument());

    const newDesign = { ...mockDesignData, id: '2', name: 'New Design' };
    (api.fetchDesigns as jest.Mock).mockResolvedValue([mockDesignData, newDesign]);

    // Simulate a re-render or update of the component.  This might involve updating props
    // or triggering a state change in the parent component that causes DesignArchitecture to re-render.
    // For this example, we'll simulate a prop update.
    render(<DesignArchitecture />);
    await waitFor(() => expect(screen.getByText(newDesign.name)).toBeInTheDocument());
  });

  it('handles multiple filters and sorts correctly', async () => {
    const design1 = { ...mockDesignData, price: 199.99, name: 'Expensive Modern Design' };
    const design2 = { ...mockDesignData, price: 99.99, name: 'Cheap Old Design' };
    const design3 = { ...mockDesignData, price: 149.99, name: 'Medium Modern Design' };

    (api.fetchDesigns as jest.Mock).mockResolvedValue([design1, design2, design3]);
    render(<DesignArchitecture />);
    await waitFor(() => expect(screen.getByText(design1.name)).toBeInTheDocument());

    // Filter by "Modern"
    const searchInput = screen.getByPlaceholderText(/search/i);
    userEvent.type(searchInput, 'Modern');
    await waitFor(() => expect(screen.getByText(design1.name)).toBeInTheDocument());
    expect(screen.queryByText(design2.name)).not.toBeInTheDocument();

    // Sort by price ascending
    const sortSelect = screen.getByLabelText(/sort by/i);
    userEvent.selectOptions(sortSelect, 'price-asc');

    const designElements = await screen.findAllByText(/design/i);
    expect(designElements[0]).toHaveTextContent('Medium Modern Design');
    expect(designElements[1]).toHaveTextContent('Expensive Modern Design');
  });

  it('displays a message when no designs match the search criteria', async () => {
    (api.fetchDesigns as jest.Mock).mockResolvedValue([mockDesignData]);
    render(<DesignArchitecture />);
    await waitFor(() => expect(screen.getByText(mockDesignData.name)).toBeInTheDocument());

    const searchInput = screen.getByPlaceholderText(/search/i);
    userEvent.type(searchInput, 'NonExistentDesign');

    await waitFor(() => expect(screen.getByText(/no designs found/i)).toBeInTheDocument());
  });

  it('handles design names with special characters', async () => {
    const designWithSpecialChars = { ...mockDesignData, name: 'Design with !@#$%^&*()_+=-`~[]\{}|;\':",./<>?' };
    (api.fetchDesigns as jest.Mock).mockResolvedValue([designWithSpecialChars]);
    render(<DesignArchitecture />);
    await waitFor(() => expect(screen.getByText(designWithSpecialChars.name)).toBeInTheDocument());
  });

  it('handles design descriptions with special characters', async () => {
    const designWithSpecialChars = { ...mockDesignData, description: 'Description with !@#$%^&*()_+=-`~[]\{}|;\':",./<>?' };
    (api.fetchDesigns as jest.Mock).mockResolvedValue([mockDesignData, designWithSpecialChars]);
    render(<DesignArchitecture />);
    await waitFor(() => expect(screen.getByText(designWithSpecialChars.description)).toBeInTheDocument());
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DesignArchitecture } from '../components/DesignArchitecture'; // Adjust the import path as needed
import * as api from '../api/designArchitectureApi'; // Mock API
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

jest.mock('../api/designArchitectureApi');

describe('DesignArchitecture Component', () => {
  const mockDesignData = {
    id: '1',
    name: 'Modern Ecommerce Design',
    description: 'A sleek and modern design for your ecommerce platform.',
    features: ['Responsive Layout', 'Easy Navigation', 'Product Filtering'],
    price: 99.99,
    imageUrl: 'https://example.com/design.jpg',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    (api.fetchDesigns as jest.Mock).mockResolvedValue([]);
    render(<DesignArchitecture />);
  });

  it('displays loading state initially', () => {
    (api.fetchDesigns as jest.Mock).mockResolvedValue([]);
    render(<DesignArchitecture />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('fetches and displays design data on mount', async () => {
    (api.fetchDesigns as jest.Mock).mockResolvedValue([mockDesignData]);
    render(<DesignArchitecture />);
    await waitFor(() => expect(screen.getByText(mockDesignData.name)).toBeInTheDocument());
    expect(screen.getByText(mockDesignData.description)).toBeInTheDocument();
  });

  it('displays an error message if fetching designs fails', async () => {
    (api.fetchDesigns as jest.Mock).mockRejectedValue(new Error('Failed to fetch designs'));
    render(<DesignArchitecture />);
    await waitFor(() => expect(screen.getByText(/error/i)).toBeInTheDocument());
  });

  it('handles empty design list', async () => {
    (api.fetchDesigns as jest.Mock).mockResolvedValue([]);
    render(<DesignArchitecture />);
    await waitFor(() => expect(screen.getByText(/no designs found/i)).toBeInTheDocument());
  });

  it('filters designs based on search input', async () => {
    (api.fetchDesigns as jest.Mock).mockResolvedValue([mockDesignData, { ...mockDesignData, name: 'Old Design' }]);
    render(<DesignArchitecture />);
    await waitFor(() => expect(screen.getByText(mockDesignData.name)).toBeInTheDocument());

    const searchInput = screen.getByPlaceholderText(/search/i);
    userEvent.type(searchInput, 'Modern');

    await waitFor(() => expect(screen.getByText(mockDesignData.name)).toBeInTheDocument());
    expect(screen.queryByText('Old Design')).not.toBeInTheDocument();
  });

  it('clears the search input and displays all designs', async () => {
    (api.fetchDesigns as jest.Mock).mockResolvedValue([mockDesignData, { ...mockDesignData, name: 'Old Design' }]);
    render(<DesignArchitecture />);
    await waitFor(() => expect(screen.getByText(mockDesignData.name)).toBeInTheDocument());

    const searchInput = screen.getByPlaceholderText(/search/i);
    userEvent.type(searchInput, 'Modern');
    await waitFor(() => expect(screen.getByText(mockDesignData.name)).toBeInTheDocument());
    expect(screen.queryByText('Old Design')).not.toBeInTheDocument();

    const clearButton = screen.getByRole('button', { name: /clear/i });
    userEvent.click(clearButton);

    await waitFor(() => expect(screen.getByText('Old Design')).toBeInTheDocument());
  });

  it('sorts designs by price ascending', async () => {
    const design1 = { ...mockDesignData, price: 199.99, name: 'Expensive Design' };
    const design2 = { ...mockDesignData, price: 99.99, name: 'Cheap Design' };
    (api.fetchDesigns as jest.Mock).mockResolvedValue([design1, design2]);
    render(<DesignArchitecture />);
    await waitFor(() => expect(screen.getByText(design1.name)).toBeInTheDocument());

    const sortSelect = screen.getByLabelText(/sort by/i);
    userEvent.selectOptions(sortSelect, 'price-asc');

    const designElements = await screen.findAllByText(/design/i);
    expect(designElements[0]).toHaveTextContent('Cheap Design');
    expect(designElements[1]).toHaveTextContent('Expensive Design');
  });

  it('sorts designs by price descending', async () => {
    const design1 = { ...mockDesignData, price: 99.99, name: 'Cheap Design' };
    const design2 = { ...mockDesignData, price: 199.99, name: 'Expensive Design' };
    (api.fetchDesigns as jest.Mock).mockResolvedValue([design1, design2]);
    render(<DesignArchitecture />);
    await waitFor(() => expect(screen.getByText(design1.name)).toBeInTheDocument());

    const sortSelect = screen.getByLabelText(/sort by/i);
    userEvent.selectOptions(sortSelect, 'price-desc');

    const designElements = await screen.findAllByText(/design/i);
    expect(designElements[0]).toHaveTextContent('Expensive Design');
    expect(designElements[1]).toHaveTextContent('Cheap Design');
  });

  it('calls onAddToCart when add to cart button is clicked', async () => {
    const onAddToCart = jest.fn();
    (api.fetchDesigns as jest.Mock).mockResolvedValue([mockDesignData]);
    render(<DesignArchitecture onAddToCart={onAddToCart} />);
    await waitFor(() => expect(screen.getByText(mockDesignData.name)).toBeInTheDocument());

    const addToCartButton = screen.getByRole('button', { name: /add to cart/i });
    userEvent.click(addToCartButton);

    expect(onAddToCart).toHaveBeenCalledWith(mockDesignData);
  });

  it('renders accessibility features', async () => {
    (api.fetchDesigns as jest.Mock).mockResolvedValue([mockDesignData]);
    const { container } = render(<DesignArchitecture />);
    await waitFor(() => expect(screen.getByText(mockDesignData.name)).toBeInTheDocument());

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('updates the design list when new designs are added', async () => {
    (api.fetchDesigns as jest.Mock).mockResolvedValue([mockDesignData]);
    render(<DesignArchitecture />);
    await waitFor(() => expect(screen.getByText(mockDesignData.name)).toBeInTheDocument());

    const newDesign = { ...mockDesignData, id: '2', name: 'New Design' };
    (api.fetchDesigns as jest.Mock).mockResolvedValue([mockDesignData, newDesign]);

    // Simulate a re-render or update of the component.  This might involve updating props
    // or triggering a state change in the parent component that causes DesignArchitecture to re-render.
    // For this example, we'll simulate a prop update.
    render(<DesignArchitecture />);
    await waitFor(() => expect(screen.getByText(newDesign.name)).toBeInTheDocument());
  });

  it('handles multiple filters and sorts correctly', async () => {
    const design1 = { ...mockDesignData, price: 199.99, name: 'Expensive Modern Design' };
    const design2 = { ...mockDesignData, price: 99.99, name: 'Cheap Old Design' };
    const design3 = { ...mockDesignData, price: 149.99, name: 'Medium Modern Design' };

    (api.fetchDesigns as jest.Mock).mockResolvedValue([design1, design2, design3]);
    render(<DesignArchitecture />);
    await waitFor(() => expect(screen.getByText(design1.name)).toBeInTheDocument());

    // Filter by "Modern"
    const searchInput = screen.getByPlaceholderText(/search/i);
    userEvent.type(searchInput, 'Modern');
    await waitFor(() => expect(screen.getByText(design1.name)).toBeInTheDocument());
    expect(screen.queryByText(design2.name)).not.toBeInTheDocument();

    // Sort by price ascending
    const sortSelect = screen.getByLabelText(/sort by/i);
    userEvent.selectOptions(sortSelect, 'price-asc');

    const designElements = await screen.findAllByText(/design/i);
    expect(designElements[0]).toHaveTextContent('Medium Modern Design');
    expect(designElements[1]).toHaveTextContent('Expensive Modern Design');
  });

  it('displays a message when no designs match the search criteria', async () => {
    (api.fetchDesigns as jest.Mock).mockResolvedValue([mockDesignData]);
    render(<DesignArchitecture />);
    await waitFor(() => expect(screen.getByText(mockDesignData.name)).toBeInTheDocument());

    const searchInput = screen.getByPlaceholderText(/search/i);
    userEvent.type(searchInput, 'NonExistentDesign');

    await waitFor(() => expect(screen.getByText(/no designs found/i)).toBeInTheDocument());
  });

  it('handles design names with special characters', async () => {
    const designWithSpecialChars = { ...mockDesignData, name: 'Design with !@#$%^&*()_+=-`~[]\{}|;\':",./<>?' };
    (api.fetchDesigns as jest.Mock).mockResolvedValue([designWithSpecialChars]);
    render(<DesignArchitecture />);
    await waitFor(() => expect(screen.getByText(designWithSpecialChars.name)).toBeInTheDocument());
  });

  it('handles design descriptions with special characters', async () => {
    const designWithSpecialChars = { ...mockDesignData, description: 'Description with !@#$%^&*()_+=-`~[]\{}|;\':",./<>?' };
    (api.fetchDesigns as jest.Mock).mockResolvedValue([mockDesignData, designWithSpecialChars]);
    render(<DesignArchitecture />);
    await waitFor(() => expect(screen.getByText(designWithSpecialChars.description)).toBeInTheDocument());
  });
});