import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { CartContext } from '../../contexts/CartContext'; // Adjust path as needed
import ProductDetails from '../../components/ProductDetails'; // Adjust path as needed
import { IProduct } from '../../types/Product'; // Adjust path as needed

const mockProduct: IProduct = {
  id: 1,
  title: 'Test Product',
  description: 'Test Description',
  price: 25.99,
  imageUrl: 'test-image.jpg',
  inventory: 10,
  category: 'Test Category',
};

const server = setupServer(
  rest.get(`/api/products/${mockProduct.id}`, (req, res, ctx) => {
    return res(ctx.json(mockProduct));
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const renderWithCartContext = (ui: React.ReactElement, cart: any) => {
  return render(
    <CartContext.Provider value={cart}>
      {ui}
    </CartContext.Provider>
  );
};

describe('ProductDetails Component', () => {
  it('renders product details correctly', async () => {
    renderWithCartContext(<ProductDetails productId={mockProduct.id} />, { cartItems: [], addToCart: jest.fn() });

    await waitFor(() => {
      expect(screen.getByText('Test Product')).toBeInTheDocument();
      expect(screen.getByText('Test Description')).toBeInTheDocument();
      expect(screen.getByText('$25.99')).toBeInTheDocument();
    });
  });

  it('displays loading state initially', () => {
    renderWithCartContext(<ProductDetails productId={mockProduct.id} />, { cartItems: [], addToCart: jest.fn() });
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('handles product not found', async () => {
    server.use(
      rest.get(`/api/products/${mockProduct.id}`, (req, res, ctx) => {
        return res(ctx.status(404));
      })
    );

    renderWithCartContext(<ProductDetails productId={mockProduct.id} />, { cartItems: [], addToCart: jest.fn() });

    await waitFor(() => {
      expect(screen.getByText('Product not found')).toBeInTheDocument();
    });
  });

  it('calls addToCart when "Add to Cart" button is clicked', async () => {
    const addToCartMock = jest.fn();
    renderWithCartContext(<ProductDetails productId={mockProduct.id} />, { cartItems: [], addToCart: addToCartMock });

    await waitFor(() => {
      expect(screen.getByText('Test Product')).toBeInTheDocument();
    });

    const addToCartButton = screen.getByRole('button', { name: /add to cart/i });
    fireEvent.click(addToCartButton);

    expect(addToCartMock).toHaveBeenCalledWith(mockProduct);
  });

  it('disables "Add to Cart" button when inventory is zero', async () => {
    server.use(
      rest.get(`/api/products/${mockProduct.id}`, (req, res, ctx) => {
        return res(ctx.json({ ...mockProduct, inventory: 0 }));
      })
    );

    renderWithCartContext(<ProductDetails productId={mockProduct.id} />, { cartItems: [], addToCart: jest.fn() });

    await waitFor(() => {
      expect(screen.getByText('Test Product')).toBeInTheDocument();
    });

    const addToCartButton = screen.getByRole('button', { name: /add to cart/i });
    expect(addToCartButton).toBeDisabled();
  });

  it('displays "Out of Stock" message when inventory is zero', async () => {
    server.use(
      rest.get(`/api/products/${mockProduct.id}`, (req, res, ctx) => {
        return res(ctx.json({ ...mockProduct, inventory: 0 }));
      })
    );

    renderWithCartContext(<ProductDetails productId={mockProduct.id} />, { cartItems: [], addToCart: jest.fn() });

    await waitFor(() => {
      expect(screen.getByText('Out of Stock')).toBeInTheDocument();
    });
  });

  it('renders image with alt text', async () => {
    renderWithCartContext(<ProductDetails productId={mockProduct.id} />, { cartItems: [], addToCart: jest.fn() });

    await waitFor(() => {
      expect(screen.getByAltText('Test Product')).toBeInTheDocument();
    });
  });

  it('handles server error', async () => {
    server.use(
      rest.get(`/api/products/${mockProduct.id}`, (req, res, ctx) => {
        return res(ctx.status(500));
      })
    );

    renderWithCartContext(<ProductDetails productId={mockProduct.id} />, { cartItems: [], addToCart: jest.fn() });

    await waitFor(() => {
      expect(screen.getByText('Error fetching product details')).toBeInTheDocument();
    });
  });

  it('updates quantity correctly', async () => {
    const addToCartMock = jest.fn();
    renderWithCartContext(<ProductDetails productId={mockProduct.id} />, { cartItems: [], addToCart: addToCartMock });

    await waitFor(() => {
      expect(screen.getByText('Test Product')).toBeInTheDocument();
    });

    const quantityInput = screen.getByRole('spinbutton', { name: /quantity/i }) as HTMLInputElement;
    await act(async () => {
      userEvent.clear(quantityInput);
      userEvent.type(quantityInput, '3');
    });

    const addToCartButton = screen.getByRole('button', { name: /add to cart/i });
    fireEvent.click(addToCartButton);

    expect(addToCartMock).toHaveBeenCalledWith({ ...mockProduct, quantity: 3 });
  });

  it('displays error message for invalid quantity', async () => {
    renderWithCartContext(<ProductDetails productId={mockProduct.id} />, { cartItems: [], addToCart: jest.fn() });

    await waitFor(() => {
      expect(screen.getByText('Test Product')).toBeInTheDocument();
    });

    const quantityInput = screen.getByRole('spinbutton', { name: /quantity/i }) as HTMLInputElement;
    await act(async () => {
      userEvent.clear(quantityInput);
      userEvent.type(quantityInput, '-1');
    });

    expect(screen.getByText('Quantity must be between 1 and 10')).toBeInTheDocument();

    await act(async () => {
      userEvent.clear(quantityInput);
      userEvent.type(quantityInput, '11');
    });

    expect(screen.getByText('Quantity must be between 1 and 10')).toBeInTheDocument();
  });

  it('defaults quantity to 1', async () => {
    const addToCartMock = jest.fn();
    renderWithCartContext(<ProductDetails productId={mockProduct.id} />, { cartItems: [], addToCart: addToCartMock });

    await waitFor(() => {
      expect(screen.getByText('Test Product')).toBeInTheDocument();
    });

    const quantityInput = screen.getByRole('spinbutton', { name: /quantity/i }) as HTMLInputElement;
    await act(async () => {
      userEvent.clear(quantityInput);
    });

    const addToCartButton = screen.getByRole('button', { name: /add to cart/i });
    fireEvent.click(addToCartButton);

    expect(addToCartMock).toHaveBeenCalledWith({ ...mockProduct, quantity: 1 });
  });

  it('respects max inventory when setting quantity', async () => {
    const addToCartMock = jest.fn();
    renderWithCartContext(<ProductDetails productId={mockProduct.id} />, { cartItems: [], addToCart: addToCartMock });

    await waitFor(() => {
      expect(screen.getByText('Test Product')).toBeInTheDocument();
    });

    const quantityInput = screen.getByRole('spinbutton', { name: /quantity/i }) as HTMLInputElement;
    await act(async () => {
      userEvent.clear(quantityInput);
      userEvent.type(quantityInput, '15');
    });

    const addToCartButton = screen.getByRole('button', { name: /add to cart/i });
    fireEvent.click(addToCartButton);

    expect(addToCartMock).toHaveBeenCalledWith({ ...mockProduct, quantity: 10 });
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { CartContext } from '../../contexts/CartContext'; // Adjust path as needed
import ProductDetails from '../../components/ProductDetails'; // Adjust path as needed
import { IProduct } from '../../types/Product'; // Adjust path as needed

const mockProduct: IProduct = {
  id: 1,
  title: 'Test Product',
  description: 'Test Description',
  price: 25.99,
  imageUrl: 'test-image.jpg',
  inventory: 10,
  category: 'Test Category',
};

const server = setupServer(
  rest.get(`/api/products/${mockProduct.id}`, (req, res, ctx) => {
    return res(ctx.json(mockProduct));
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const renderWithCartContext = (ui: React.ReactElement, cart: any) => {
  return render(
    <CartContext.Provider value={cart}>
      {ui}
    </CartContext.Provider>
  );
};

describe('ProductDetails Component', () => {
  it('renders product details correctly', async () => {
    renderWithCartContext(<ProductDetails productId={mockProduct.id} />, { cartItems: [], addToCart: jest.fn() });

    await waitFor(() => {
      expect(screen.getByText('Test Product')).toBeInTheDocument();
      expect(screen.getByText('Test Description')).toBeInTheDocument();
      expect(screen.getByText('$25.99')).toBeInTheDocument();
    });
  });

  it('displays loading state initially', () => {
    renderWithCartContext(<ProductDetails productId={mockProduct.id} />, { cartItems: [], addToCart: jest.fn() });
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('handles product not found', async () => {
    server.use(
      rest.get(`/api/products/${mockProduct.id}`, (req, res, ctx) => {
        return res(ctx.status(404));
      })
    );

    renderWithCartContext(<ProductDetails productId={mockProduct.id} />, { cartItems: [], addToCart: jest.fn() });

    await waitFor(() => {
      expect(screen.getByText('Product not found')).toBeInTheDocument();
    });
  });

  it('calls addToCart when "Add to Cart" button is clicked', async () => {
    const addToCartMock = jest.fn();
    renderWithCartContext(<ProductDetails productId={mockProduct.id} />, { cartItems: [], addToCart: addToCartMock });

    await waitFor(() => {
      expect(screen.getByText('Test Product')).toBeInTheDocument();
    });

    const addToCartButton = screen.getByRole('button', { name: /add to cart/i });
    fireEvent.click(addToCartButton);

    expect(addToCartMock).toHaveBeenCalledWith(mockProduct);
  });

  it('disables "Add to Cart" button when inventory is zero', async () => {
    server.use(
      rest.get(`/api/products/${mockProduct.id}`, (req, res, ctx) => {
        return res(ctx.json({ ...mockProduct, inventory: 0 }));
      })
    );

    renderWithCartContext(<ProductDetails productId={mockProduct.id} />, { cartItems: [], addToCart: jest.fn() });

    await waitFor(() => {
      expect(screen.getByText('Test Product')).toBeInTheDocument();
    });

    const addToCartButton = screen.getByRole('button', { name: /add to cart/i });
    expect(addToCartButton).toBeDisabled();
  });

  it('displays "Out of Stock" message when inventory is zero', async () => {
    server.use(
      rest.get(`/api/products/${mockProduct.id}`, (req, res, ctx) => {
        return res(ctx.json({ ...mockProduct, inventory: 0 }));
      })
    );

    renderWithCartContext(<ProductDetails productId={mockProduct.id} />, { cartItems: [], addToCart: jest.fn() });

    await waitFor(() => {
      expect(screen.getByText('Out of Stock')).toBeInTheDocument();
    });
  });

  it('renders image with alt text', async () => {
    renderWithCartContext(<ProductDetails productId={mockProduct.id} />, { cartItems: [], addToCart: jest.fn() });

    await waitFor(() => {
      expect(screen.getByAltText('Test Product')).toBeInTheDocument();
    });
  });

  it('handles server error', async () => {
    server.use(
      rest.get(`/api/products/${mockProduct.id}`, (req, res, ctx) => {
        return res(ctx.status(500));
      })
    );

    renderWithCartContext(<ProductDetails productId={mockProduct.id} />, { cartItems: [], addToCart: jest.fn() });

    await waitFor(() => {
      expect(screen.getByText('Error fetching product details')).toBeInTheDocument();
    });
  });

  it('updates quantity correctly', async () => {
    const addToCartMock = jest.fn();
    renderWithCartContext(<ProductDetails productId={mockProduct.id} />, { cartItems: [], addToCart: addToCartMock });

    await waitFor(() => {
      expect(screen.getByText('Test Product')).toBeInTheDocument();
    });

    const quantityInput = screen.getByRole('spinbutton', { name: /quantity/i }) as HTMLInputElement;
    await act(async () => {
      userEvent.clear(quantityInput);
      userEvent.type(quantityInput, '3');
    });

    const addToCartButton = screen.getByRole('button', { name: /add to cart/i });
    fireEvent.click(addToCartButton);

    expect(addToCartMock).toHaveBeenCalledWith({ ...mockProduct, quantity: 3 });
  });

  it('displays error message for invalid quantity', async () => {
    renderWithCartContext(<ProductDetails productId={mockProduct.id} />, { cartItems: [], addToCart: jest.fn() });

    await waitFor(() => {
      expect(screen.getByText('Test Product')).toBeInTheDocument();
    });

    const quantityInput = screen.getByRole('spinbutton', { name: /quantity/i }) as HTMLInputElement;
    await act(async () => {
      userEvent.clear(quantityInput);
      userEvent.type(quantityInput, '-1');
    });

    expect(screen.getByText('Quantity must be between 1 and 10')).toBeInTheDocument();

    await act(async () => {
      userEvent.clear(quantityInput);
      userEvent.type(quantityInput, '11');
    });

    expect(screen.getByText('Quantity must be between 1 and 10')).toBeInTheDocument();
  });

  it('defaults quantity to 1', async () => {
    const addToCartMock = jest.fn();
    renderWithCartContext(<ProductDetails productId={mockProduct.id} />, { cartItems: [], addToCart: addToCartMock });

    await waitFor(() => {
      expect(screen.getByText('Test Product')).toBeInTheDocument();
    });

    const quantityInput = screen.getByRole('spinbutton', { name: /quantity/i }) as HTMLInputElement;
    await act(async () => {
      userEvent.clear(quantityInput);
    });

    const addToCartButton = screen.getByRole('button', { name: /add to cart/i });
    fireEvent.click(addToCartButton);

    expect(addToCartMock).toHaveBeenCalledWith({ ...mockProduct, quantity: 1 });
  });

  it('respects max inventory when setting quantity', async () => {
    const addToCartMock = jest.fn();
    renderWithCartContext(<ProductDetails productId={mockProduct.id} />, { cartItems: [], addToCart: addToCartMock });

    await waitFor(() => {
      expect(screen.getByText('Test Product')).toBeInTheDocument();
    });

    const quantityInput = screen.getByRole('spinbutton', { name: /quantity/i }) as HTMLInputElement;
    await act(async () => {
      userEvent.clear(quantityInput);
      userEvent.type(quantityInput, '15');
    });

    const addToCartButton = screen.getByRole('button', { name: /add to cart/i });
    fireEvent.click(addToCartButton);

    expect(addToCartMock).toHaveBeenCalledWith({ ...mockProduct, quantity: 10 });
  });
});