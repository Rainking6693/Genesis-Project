import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { CartContext } from '../../context/CartContext'; // Adjust path as needed
import ProductDetails from '../../components/ProductDetails'; // Adjust path as needed

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
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const mockAddToCart = jest.fn();

const renderWithCartContext = (ui: React.ReactElement) => {
  return render(
    <CartContext.Provider value={{ cart: [], addToCart: mockAddToCart }}>
      {ui}
    </CartContext.Provider>
  );
};

describe('ProductDetails Component', () => {
  it('renders loading state initially', () => {
    renderWithCartContext(<ProductDetails productId="1" />);
    expect(screen.getByText(/Loading product details.../i)).toBeInTheDocument();
  });

  it('fetches and displays product details correctly', async () => {
    renderWithCartContext(<ProductDetails productId="1" />);
    await waitFor(() => {
      expect(screen.getByText(/Test Product/i)).toBeInTheDocument();
      expect(screen.getByText(/Test Description/i)).toBeInTheDocument();
      expect(screen.getByText(/\$25/i)).toBeInTheDocument();
    });
  });

  it('displays error message when product fetch fails', async () => {
    server.use(
      rest.get('/api/products/1', (req, res, ctx) => {
        return res(ctx.status(500));
      })
    );

    renderWithCartContext(<ProductDetails productId="1" />);
    await waitFor(() => {
      expect(screen.getByText(/Failed to load product details./i)).toBeInTheDocument();
    });
  });

  it('increments quantity correctly', async () => {
    renderWithCartContext(<ProductDetails productId="1" />);
    await waitFor(() => {
      expect(screen.getByText(/Test Product/i)).toBeInTheDocument();
    });

    const incrementButton = screen.getByRole('button', { name: /increment/i });
    fireEvent.click(incrementButton);

    const quantityInput = screen.getByRole('spinbutton', { name: /quantity/i });
    expect(quantityInput).toHaveValue(2);
  });

  it('decrements quantity correctly', async () => {
    renderWithCartContext(<ProductDetails productId="1" />);
    await waitFor(() => {
      expect(screen.getByText(/Test Product/i)).toBeInTheDocument();
    });

    const incrementButton = screen.getByRole('button', { name: /increment/i });
    fireEvent.click(incrementButton);
    const decrementButton = screen.getByRole('button', { name: /decrement/i });
    fireEvent.click(decrementButton);

    const quantityInput = screen.getByRole('spinbutton', { name: /quantity/i });
    expect(quantityInput).toHaveValue(1);
  });

  it('does not decrement quantity below 1', async () => {
    renderWithCartContext(<ProductDetails productId="1" />);
    await waitFor(() => {
      expect(screen.getByText(/Test Product/i)).toBeInTheDocument();
    });

    const decrementButton = screen.getByRole('button', { name: /decrement/i });
    fireEvent.click(decrementButton);

    const quantityInput = screen.getByRole('spinbutton', { name: /quantity/i });
    expect(quantityInput).toHaveValue(1);
  });

  it('updates quantity via input field', async () => {
    renderWithCartContext(<ProductDetails productId="1" />);
    await waitFor(() => {
      expect(screen.getByText(/Test Product/i)).toBeInTheDocument();
    });

    const quantityInput = screen.getByRole('spinbutton', { name: /quantity/i });
    await act(async () => {
      userEvent.clear(quantityInput);
      userEvent.type(quantityInput, '5');
    });

    expect(quantityInput).toHaveValue(5);
  });

  it('displays error message when quantity exceeds inventory', async () => {
    renderWithCartContext(<ProductDetails productId="1" />);
    await waitFor(() => {
      expect(screen.getByText(/Test Product/i)).toBeInTheDocument();
    });

    const quantityInput = screen.getByRole('spinbutton', { name: /quantity/i });
    await act(async () => {
      userEvent.clear(quantityInput);
      userEvent.type(quantityInput, '11');
    });

    await waitFor(() => {
      expect(screen.getByText(/Not enough items in stock./i)).toBeInTheDocument();
    });
  });

  it('calls addToCart with correct product and quantity when "Add to Cart" button is clicked', async () => {
    renderWithCartContext(<ProductDetails productId="1" />);
    await waitFor(() => {
      expect(screen.getByText(/Test Product/i)).toBeInTheDocument();
    });

    const quantityInput = screen.getByRole('spinbutton', { name: /quantity/i });
    await act(async () => {
      userEvent.clear(quantityInput);
      userEvent.type(quantityInput, '3');
    });

    const addToCartButton = screen.getByRole('button', { name: /add to cart/i });
    fireEvent.click(addToCartButton);

    expect(mockAddToCart).toHaveBeenCalledTimes(1);
    expect(mockAddToCart).toHaveBeenCalledWith(mockProduct, 3);
  });

  it('renders with accessible labels and roles', async () => {
    renderWithCartContext(<ProductDetails productId="1" />);
    await waitFor(() => {
      expect(screen.getByText(/Test Product/i)).toBeInTheDocument();
    });

    expect(screen.getByRole('spinbutton', { name: /quantity/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /increment/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /decrement/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add to cart/i })).toBeInTheDocument();
  });

  it('displays "Out of Stock" message when inventory is 0', async () => {
    server.use(
      rest.get('/api/products/1', (req, res, ctx) => {
        return res(ctx.status(200), ctx.json({ ...mockProduct, inventory: 0 }));
      })
    );

    renderWithCartContext(<ProductDetails productId="1" />);
    await waitFor(() => {
      expect(screen.getByText(/Out of Stock/i)).toBeInTheDocument();
    });

    const addToCartButton = screen.queryByRole('button', { name: /add to cart/i });
    expect(addToCartButton).toBeNull();
  });

  it('disables increment button when quantity is at maximum inventory', async () => {
    renderWithCartContext(<ProductDetails productId="1" />);
    await waitFor(() => {
      expect(screen.getByText(/Test Product/i)).toBeInTheDocument();
    });

    const quantityInput = screen.getByRole('spinbutton', { name: /quantity/i });
    await act(async () => {
      userEvent.clear(quantityInput);
      userEvent.type(quantityInput, '10');
    });

    const incrementButton = screen.getByRole('button', { name: /increment/i });
    expect(incrementButton).toBeDisabled();
  });

  it('does not allow quantity input to be negative', async () => {
    renderWithCartContext(<ProductDetails productId="1" />);
    await waitFor(() => {
      expect(screen.getByText(/Test Product/i)).toBeInTheDocument();
    });

    const quantityInput = screen.getByRole('spinbutton', { name: /quantity/i });
    await act(async () => {
      userEvent.clear(quantityInput);
      userEvent.type(quantityInput, '-1');
    });

    expect(quantityInput).toHaveValue(1);
  });

  it('does not allow quantity input to be zero', async () => {
    renderWithCartContext(<ProductDetails productId="1" />);
    await waitFor(() => {
      expect(screen.getByText(/Test Product/i)).toBeInTheDocument();
    });

    const quantityInput = screen.getByRole('spinbutton', { name: /quantity/i });
    await act(async () => {
      userEvent.clear(quantityInput);
      userEvent.type(quantityInput, '0');
    });

    expect(quantityInput).toHaveValue(1);
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { CartContext } from '../../context/CartContext'; // Adjust path as needed
import ProductDetails from '../../components/ProductDetails'; // Adjust path as needed

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
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const mockAddToCart = jest.fn();

const renderWithCartContext = (ui: React.ReactElement) => {
  return render(
    <CartContext.Provider value={{ cart: [], addToCart: mockAddToCart }}>
      {ui}
    </CartContext.Provider>
  );
};

describe('ProductDetails Component', () => {
  it('renders loading state initially', () => {
    renderWithCartContext(<ProductDetails productId="1" />);
    expect(screen.getByText(/Loading product details.../i)).toBeInTheDocument();
  });

  it('fetches and displays product details correctly', async () => {
    renderWithCartContext(<ProductDetails productId="1" />);
    await waitFor(() => {
      expect(screen.getByText(/Test Product/i)).toBeInTheDocument();
      expect(screen.getByText(/Test Description/i)).toBeInTheDocument();
      expect(screen.getByText(/\$25/i)).toBeInTheDocument();
    });
  });

  it('displays error message when product fetch fails', async () => {
    server.use(
      rest.get('/api/products/1', (req, res, ctx) => {
        return res(ctx.status(500));
      })
    );

    renderWithCartContext(<ProductDetails productId="1" />);
    await waitFor(() => {
      expect(screen.getByText(/Failed to load product details./i)).toBeInTheDocument();
    });
  });

  it('increments quantity correctly', async () => {
    renderWithCartContext(<ProductDetails productId="1" />);
    await waitFor(() => {
      expect(screen.getByText(/Test Product/i)).toBeInTheDocument();
    });

    const incrementButton = screen.getByRole('button', { name: /increment/i });
    fireEvent.click(incrementButton);

    const quantityInput = screen.getByRole('spinbutton', { name: /quantity/i });
    expect(quantityInput).toHaveValue(2);
  });

  it('decrements quantity correctly', async () => {
    renderWithCartContext(<ProductDetails productId="1" />);
    await waitFor(() => {
      expect(screen.getByText(/Test Product/i)).toBeInTheDocument();
    });

    const incrementButton = screen.getByRole('button', { name: /increment/i });
    fireEvent.click(incrementButton);
    const decrementButton = screen.getByRole('button', { name: /decrement/i });
    fireEvent.click(decrementButton);

    const quantityInput = screen.getByRole('spinbutton', { name: /quantity/i });
    expect(quantityInput).toHaveValue(1);
  });

  it('does not decrement quantity below 1', async () => {
    renderWithCartContext(<ProductDetails productId="1" />);
    await waitFor(() => {
      expect(screen.getByText(/Test Product/i)).toBeInTheDocument();
    });

    const decrementButton = screen.getByRole('button', { name: /decrement/i });
    fireEvent.click(decrementButton);

    const quantityInput = screen.getByRole('spinbutton', { name: /quantity/i });
    expect(quantityInput).toHaveValue(1);
  });

  it('updates quantity via input field', async () => {
    renderWithCartContext(<ProductDetails productId="1" />);
    await waitFor(() => {
      expect(screen.getByText(/Test Product/i)).toBeInTheDocument();
    });

    const quantityInput = screen.getByRole('spinbutton', { name: /quantity/i });
    await act(async () => {
      userEvent.clear(quantityInput);
      userEvent.type(quantityInput, '5');
    });

    expect(quantityInput).toHaveValue(5);
  });

  it('displays error message when quantity exceeds inventory', async () => {
    renderWithCartContext(<ProductDetails productId="1" />);
    await waitFor(() => {
      expect(screen.getByText(/Test Product/i)).toBeInTheDocument();
    });

    const quantityInput = screen.getByRole('spinbutton', { name: /quantity/i });
    await act(async () => {
      userEvent.clear(quantityInput);
      userEvent.type(quantityInput, '11');
    });

    await waitFor(() => {
      expect(screen.getByText(/Not enough items in stock./i)).toBeInTheDocument();
    });
  });

  it('calls addToCart with correct product and quantity when "Add to Cart" button is clicked', async () => {
    renderWithCartContext(<ProductDetails productId="1" />);
    await waitFor(() => {
      expect(screen.getByText(/Test Product/i)).toBeInTheDocument();
    });

    const quantityInput = screen.getByRole('spinbutton', { name: /quantity/i });
    await act(async () => {
      userEvent.clear(quantityInput);
      userEvent.type(quantityInput, '3');
    });

    const addToCartButton = screen.getByRole('button', { name: /add to cart/i });
    fireEvent.click(addToCartButton);

    expect(mockAddToCart).toHaveBeenCalledTimes(1);
    expect(mockAddToCart).toHaveBeenCalledWith(mockProduct, 3);
  });

  it('renders with accessible labels and roles', async () => {
    renderWithCartContext(<ProductDetails productId="1" />);
    await waitFor(() => {
      expect(screen.getByText(/Test Product/i)).toBeInTheDocument();
    });

    expect(screen.getByRole('spinbutton', { name: /quantity/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /increment/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /decrement/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add to cart/i })).toBeInTheDocument();
  });

  it('displays "Out of Stock" message when inventory is 0', async () => {
    server.use(
      rest.get('/api/products/1', (req, res, ctx) => {
        return res(ctx.status(200), ctx.json({ ...mockProduct, inventory: 0 }));
      })
    );

    renderWithCartContext(<ProductDetails productId="1" />);
    await waitFor(() => {
      expect(screen.getByText(/Out of Stock/i)).toBeInTheDocument();
    });

    const addToCartButton = screen.queryByRole('button', { name: /add to cart/i });
    expect(addToCartButton).toBeNull();
  });

  it('disables increment button when quantity is at maximum inventory', async () => {
    renderWithCartContext(<ProductDetails productId="1" />);
    await waitFor(() => {
      expect(screen.getByText(/Test Product/i)).toBeInTheDocument();
    });

    const quantityInput = screen.getByRole('spinbutton', { name: /quantity/i });
    await act(async () => {
      userEvent.clear(quantityInput);
      userEvent.type(quantityInput, '10');
    });

    const incrementButton = screen.getByRole('button', { name: /increment/i });
    expect(incrementButton).toBeDisabled();
  });

  it('does not allow quantity input to be negative', async () => {
    renderWithCartContext(<ProductDetails productId="1" />);
    await waitFor(() => {
      expect(screen.getByText(/Test Product/i)).toBeInTheDocument();
    });

    const quantityInput = screen.getByRole('spinbutton', { name: /quantity/i });
    await act(async () => {
      userEvent.clear(quantityInput);
      userEvent.type(quantityInput, '-1');
    });

    expect(quantityInput).toHaveValue(1);
  });

  it('does not allow quantity input to be zero', async () => {
    renderWithCartContext(<ProductDetails productId="1" />);
    await waitFor(() => {
      expect(screen.getByText(/Test Product/i)).toBeInTheDocument();
    });

    const quantityInput = screen.getByRole('spinbutton', { name: /quantity/i });
    await act(async () => {
      userEvent.clear(quantityInput);
      userEvent.type(quantityInput, '0');
    });

    expect(quantityInput).toHaveValue(1);
  });
});