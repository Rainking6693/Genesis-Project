import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { CartContext } from '../../contexts/CartContext'; // Adjust path as needed
import ProductDetails from '../../components/ProductDetails'; // Adjust path as needed
import { MemoryRouter, Route, Routes } from 'react-router-dom';

// Mock the CartContext
const mockAddToCart = jest.fn();
const mockCartContextValue = {
  addToCart: mockAddToCart,
  cartItems: [],
};

// Mock API responses
const mockProduct = {
  id: 1,
  name: 'Test Product',
  description: 'Test Description',
  price: 25,
  imageUrl: 'test.jpg',
  inventory: 10,
};

const server = setupServer(
  rest.get('/api/products/1', (req, res, ctx) => {
    return res(ctx.status(200), ctx.json(mockProduct));
  }),
  rest.post('/api/cart/add', (req, res, ctx) => {
    return res(ctx.status(200), ctx.json({ message: 'Product added to cart' }));
  }),
  rest.get('/api/products/error', (req, res, ctx) => {
    return res(ctx.status(500));
  })
);

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  mockAddToCart.mockClear();
});
afterAll(() => server.close());

describe('ProductDetails Component', () => {
  const renderWithRouterAndContext = (ui, { route = '/' } = {}) => {
    window.history.pushState({}, 'Test page', route);

    return render(
      <MemoryRouter initialEntries={[route]}>
        <CartContext.Provider value={mockCartContextValue}>
          <Routes>
            <Route path="/products/:productId" element={ui} />
          </Routes>
        </CartContext.Provider>
      </MemoryRouter>
    );
  };

  it('renders product details correctly when data is fetched successfully', async () => {
    renderWithRouterAndContext(<ProductDetails />, { route: '/products/1' });
    await waitFor(() => screen.getByText('Test Product'));
    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
    expect(screen.getByText('$25')).toBeInTheDocument();
    expect(screen.getByText('In Stock (10)')).toBeInTheDocument();
  });

  it('displays an error message when fetching product data fails', async () => {
    server.use(
      rest.get('/api/products/1', (req, res, ctx) => {
        return res(ctx.status(500));
      })
    );

    renderWithRouterAndContext(<ProductDetails />, { route: '/products/1' });

    await waitFor(() => screen.getByText('Error loading product details.'));
    expect(screen.getByText('Error loading product details.')).toBeInTheDocument();
  });

  it('displays a loading state while fetching product data', () => {
    renderWithRouterAndContext(<ProductDetails />, { route: '/products/1' });
    expect(screen.getByText('Loading product details...')).toBeInTheDocument();
  });

  it('adds the product to the cart when the "Add to Cart" button is clicked', async () => {
    renderWithRouterAndContext(<ProductDetails />, { route: '/products/1' });
    await waitFor(() => screen.getByText('Test Product'));

    const addToCartButton = screen.getByRole('button', { name: /add to cart/i });
    fireEvent.click(addToCartButton);

    await waitFor(() => expect(mockAddToCart).toHaveBeenCalledTimes(1));
    expect(mockAddToCart).toHaveBeenCalledWith(mockProduct.id, 1);
  });

  it('updates the quantity when the quantity input changes', async () => {
    renderWithRouterAndContext(<ProductDetails />, { route: '/products/1' });
    await waitFor(() => screen.getByText('Test Product'));

    const quantityInput = screen.getByRole('spinbutton', { name: /quantity/i });
    fireEvent.change(quantityInput, { target: { value: '3' } });
    expect(quantityInput).toHaveValue(3);

    const addToCartButton = screen.getByRole('button', { name: /add to cart/i });
    fireEvent.click(addToCartButton);

    await waitFor(() => expect(mockAddToCart).toHaveBeenCalledTimes(1));
    expect(mockAddToCart).toHaveBeenCalledWith(mockProduct.id, 3);
  });

  it('disables the "Add to Cart" button when the product is out of stock', async () => {
    const outOfStockProduct = { ...mockProduct, inventory: 0 };
    server.use(
      rest.get('/api/products/1', (req, res, ctx) => {
        return res(ctx.status(200), ctx.json(outOfStockProduct));
      })
    );

    renderWithRouterAndContext(<ProductDetails />, { route: '/products/1' });
    await waitFor(() => screen.getByText('Test Product'));

    const addToCartButton = screen.getByRole('button', { name: /add to cart/i });
    expect(addToCartButton).toBeDisabled();
    expect(screen.getByText('Out of Stock')).toBeInTheDocument();
  });

  it('displays an error message when adding to cart fails', async () => {
    server.use(
      rest.post('/api/cart/add', (req, res, ctx) => {
        return res(ctx.status(500));
      })
    );

    renderWithRouterAndContext(<ProductDetails />, { route: '/products/1' });
    await waitFor(() => screen.getByText('Test Product'));

    const addToCartButton = screen.getByRole('button', { name: /add to cart/i });
    fireEvent.click(addToCartButton);

    await waitFor(() => screen.getByText('Error adding product to cart.'));
    expect(screen.getByText('Error adding product to cart.')).toBeInTheDocument();
  });

  it('updates quantity input with valid values only', async () => {
    renderWithRouterAndContext(<ProductDetails />, { route: '/products/1' });
    await waitFor(() => screen.getByText('Test Product'));

    const quantityInput = screen.getByRole('spinbutton', { name: /quantity/i });

    // Test with negative value
    fireEvent.change(quantityInput, { target: { value: '-1' } });
    expect(quantityInput).toHaveValue(1);

    // Test with value greater than inventory
    fireEvent.change(quantityInput, { target: { value: '11' } });
    expect(quantityInput).toHaveValue(10);

    // Test with valid value
    fireEvent.change(quantityInput, { target: { value: '5' } });
    expect(quantityInput).toHaveValue(5);

    // Test with non-numeric value
    fireEvent.change(quantityInput, { target: { value: 'abc' } });
    expect(quantityInput).toHaveValue(1);
  });

  it('should have accessible labels and roles', async () => {
    renderWithRouterAndContext(<ProductDetails />, { route: '/products/1' });
    await waitFor(() => screen.getByText('Test Product'));

    const quantityInput = screen.getByRole('spinbutton', { name: /quantity/i });
    expect(quantityInput).toBeInTheDocument();

    const addToCartButton = screen.getByRole('button', { name: /add to cart/i });
    expect(addToCartButton).toBeInTheDocument();

    expect(addToCartButton).toHaveAccessibleName('Add to Cart');
    expect(quantityInput).toHaveAccessibleName('Quantity');
  });

  it('navigates back to product listing page on clicking back button', async () => {
    const mockNavigate = jest.fn();
    jest.mock('react-router-dom', () => ({
      ...jest.requireActual('react-router-dom'),
      useNavigate: () => mockNavigate,
    }));

    const { unmount } = renderWithRouterAndContext(<ProductDetails />, { route: '/products/1' });
    await waitFor(() => screen.getByText('Test Product'));

    const backButton = screen.getByRole('button', { name: /back to products/i });
    fireEvent.click(backButton);

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('/');

    unmount();
    jest.restoreAllMocks();
  });

  it('handles quantity input blur event correctly', async () => {
    renderWithRouterAndContext(<ProductDetails />, { route: '/products/1' });
    await waitFor(() => screen.getByText('Test Product'));

    const quantityInput = screen.getByRole('spinbutton', { name: /quantity/i });

    // Simulate blur event
    fireEvent.focus(quantityInput);
    fireEvent.blur(quantityInput);

    expect(quantityInput).toHaveValue(1);
  });

  it('renders the product image with alt text', async () => {
    renderWithRouterAndContext(<ProductDetails />, { route: '/products/1' });
    await waitFor(() => screen.getByText('Test Product'));

    const productImage = screen.getByRole('img', { name: 'Test Product' });
    expect(productImage).toBeInTheDocument();
    expect(productImage).toHaveAttribute('src', 'test.jpg');
    expect(productImage).toHaveAttribute('alt', 'Test Product');
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { CartContext } from '../../contexts/CartContext'; // Adjust path as needed
import ProductDetails from '../../components/ProductDetails'; // Adjust path as needed
import { MemoryRouter, Route, Routes } from 'react-router-dom';

// Mock the CartContext
const mockAddToCart = jest.fn();
const mockCartContextValue = {
  addToCart: mockAddToCart,
  cartItems: [],
};

// Mock API responses
const mockProduct = {
  id: 1,
  name: 'Test Product',
  description: 'Test Description',
  price: 25,
  imageUrl: 'test.jpg',
  inventory: 10,
};

const server = setupServer(
  rest.get('/api/products/1', (req, res, ctx) => {
    return res(ctx.status(200), ctx.json(mockProduct));
  }),
  rest.post('/api/cart/add', (req, res, ctx) => {
    return res(ctx.status(200), ctx.json({ message: 'Product added to cart' }));
  }),
  rest.get('/api/products/error', (req, res, ctx) => {
    return res(ctx.status(500));
  })
);

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  mockAddToCart.mockClear();
});
afterAll(() => server.close());

describe('ProductDetails Component', () => {
  const renderWithRouterAndContext = (ui, { route = '/' } = {}) => {
    window.history.pushState({}, 'Test page', route);

    return render(
      <MemoryRouter initialEntries={[route]}>
        <CartContext.Provider value={mockCartContextValue}>
          <Routes>
            <Route path="/products/:productId" element={ui} />
          </Routes>
        </CartContext.Provider>
      </MemoryRouter>
    );
  };

  it('renders product details correctly when data is fetched successfully', async () => {
    renderWithRouterAndContext(<ProductDetails />, { route: '/products/1' });
    await waitFor(() => screen.getByText('Test Product'));
    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
    expect(screen.getByText('$25')).toBeInTheDocument();
    expect(screen.getByText('In Stock (10)')).toBeInTheDocument();
  });

  it('displays an error message when fetching product data fails', async () => {
    server.use(
      rest.get('/api/products/1', (req, res, ctx) => {
        return res(ctx.status(500));
      })
    );

    renderWithRouterAndContext(<ProductDetails />, { route: '/products/1' });

    await waitFor(() => screen.getByText('Error loading product details.'));
    expect(screen.getByText('Error loading product details.')).toBeInTheDocument();
  });

  it('displays a loading state while fetching product data', () => {
    renderWithRouterAndContext(<ProductDetails />, { route: '/products/1' });
    expect(screen.getByText('Loading product details...')).toBeInTheDocument();
  });

  it('adds the product to the cart when the "Add to Cart" button is clicked', async () => {
    renderWithRouterAndContext(<ProductDetails />, { route: '/products/1' });
    await waitFor(() => screen.getByText('Test Product'));

    const addToCartButton = screen.getByRole('button', { name: /add to cart/i });
    fireEvent.click(addToCartButton);

    await waitFor(() => expect(mockAddToCart).toHaveBeenCalledTimes(1));
    expect(mockAddToCart).toHaveBeenCalledWith(mockProduct.id, 1);
  });

  it('updates the quantity when the quantity input changes', async () => {
    renderWithRouterAndContext(<ProductDetails />, { route: '/products/1' });
    await waitFor(() => screen.getByText('Test Product'));

    const quantityInput = screen.getByRole('spinbutton', { name: /quantity/i });
    fireEvent.change(quantityInput, { target: { value: '3' } });
    expect(quantityInput).toHaveValue(3);

    const addToCartButton = screen.getByRole('button', { name: /add to cart/i });
    fireEvent.click(addToCartButton);

    await waitFor(() => expect(mockAddToCart).toHaveBeenCalledTimes(1));
    expect(mockAddToCart).toHaveBeenCalledWith(mockProduct.id, 3);
  });

  it('disables the "Add to Cart" button when the product is out of stock', async () => {
    const outOfStockProduct = { ...mockProduct, inventory: 0 };
    server.use(
      rest.get('/api/products/1', (req, res, ctx) => {
        return res(ctx.status(200), ctx.json(outOfStockProduct));
      })
    );

    renderWithRouterAndContext(<ProductDetails />, { route: '/products/1' });
    await waitFor(() => screen.getByText('Test Product'));

    const addToCartButton = screen.getByRole('button', { name: /add to cart/i });
    expect(addToCartButton).toBeDisabled();
    expect(screen.getByText('Out of Stock')).toBeInTheDocument();
  });

  it('displays an error message when adding to cart fails', async () => {
    server.use(
      rest.post('/api/cart/add', (req, res, ctx) => {
        return res(ctx.status(500));
      })
    );

    renderWithRouterAndContext(<ProductDetails />, { route: '/products/1' });
    await waitFor(() => screen.getByText('Test Product'));

    const addToCartButton = screen.getByRole('button', { name: /add to cart/i });
    fireEvent.click(addToCartButton);

    await waitFor(() => screen.getByText('Error adding product to cart.'));
    expect(screen.getByText('Error adding product to cart.')).toBeInTheDocument();
  });

  it('updates quantity input with valid values only', async () => {
    renderWithRouterAndContext(<ProductDetails />, { route: '/products/1' });
    await waitFor(() => screen.getByText('Test Product'));

    const quantityInput = screen.getByRole('spinbutton', { name: /quantity/i });

    // Test with negative value
    fireEvent.change(quantityInput, { target: { value: '-1' } });
    expect(quantityInput).toHaveValue(1);

    // Test with value greater than inventory
    fireEvent.change(quantityInput, { target: { value: '11' } });
    expect(quantityInput).toHaveValue(10);

    // Test with valid value
    fireEvent.change(quantityInput, { target: { value: '5' } });
    expect(quantityInput).toHaveValue(5);

    // Test with non-numeric value
    fireEvent.change(quantityInput, { target: { value: 'abc' } });
    expect(quantityInput).toHaveValue(1);
  });

  it('should have accessible labels and roles', async () => {
    renderWithRouterAndContext(<ProductDetails />, { route: '/products/1' });
    await waitFor(() => screen.getByText('Test Product'));

    const quantityInput = screen.getByRole('spinbutton', { name: /quantity/i });
    expect(quantityInput).toBeInTheDocument();

    const addToCartButton = screen.getByRole('button', { name: /add to cart/i });
    expect(addToCartButton).toBeInTheDocument();

    expect(addToCartButton).toHaveAccessibleName('Add to Cart');
    expect(quantityInput).toHaveAccessibleName('Quantity');
  });

  it('navigates back to product listing page on clicking back button', async () => {
    const mockNavigate = jest.fn();
    jest.mock('react-router-dom', () => ({
      ...jest.requireActual('react-router-dom'),
      useNavigate: () => mockNavigate,
    }));

    const { unmount } = renderWithRouterAndContext(<ProductDetails />, { route: '/products/1' });
    await waitFor(() => screen.getByText('Test Product'));

    const backButton = screen.getByRole('button', { name: /back to products/i });
    fireEvent.click(backButton);

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('/');

    unmount();
    jest.restoreAllMocks();
  });

  it('handles quantity input blur event correctly', async () => {
    renderWithRouterAndContext(<ProductDetails />, { route: '/products/1' });
    await waitFor(() => screen.getByText('Test Product'));

    const quantityInput = screen.getByRole('spinbutton', { name: /quantity/i });

    // Simulate blur event
    fireEvent.focus(quantityInput);
    fireEvent.blur(quantityInput);

    expect(quantityInput).toHaveValue(1);
  });

  it('renders the product image with alt text', async () => {
    renderWithRouterAndContext(<ProductDetails />, { route: '/products/1' });
    await waitFor(() => screen.getByText('Test Product'));

    const productImage = screen.getByRole('img', { name: 'Test Product' });
    expect(productImage).toBeInTheDocument();
    expect(productImage).toHaveAttribute('src', 'test.jpg');
    expect(productImage).toHaveAttribute('alt', 'Test Product');
  });
});