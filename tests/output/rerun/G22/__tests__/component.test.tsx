import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CartContext } from '../../contexts/CartContext';
import { Product } from '../../types/Product';
import CoreFunctionality from '../../components/CoreFunctionality';
import { getProductDetails } from '../../api/productService'; // Assuming an API call

jest.mock('../../api/productService', () => ({
  getProductDetails: jest.fn(),
}));

const mockProduct: Product = {
  id: '1',
  name: 'Test Product',
  description: 'Test Description',
  price: 10,
  imageUrl: 'test.jpg',
  stock: 10,
};

const renderWithCartContext = (ui: React.ReactElement, cartItems: any[] = []) => {
  return render(
    <CartContext.Provider value={{ cartItems, setCartItems: jest.fn() }}>
      {ui}
    </CartContext.Provider>
  );
};

describe('CoreFunctionality Component', () => {
  beforeEach(() => {
    (getProductDetails as jest.Mock).mockResolvedValue(mockProduct);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders product details correctly', async () => {
    renderWithCartContext(<CoreFunctionality productId="1" />);

    await waitFor(() => {
      expect(screen.getByText('Test Product')).toBeInTheDocument();
      expect(screen.getByText('Test Description')).toBeInTheDocument();
      expect(screen.getByText('$10')).toBeInTheDocument();
    });
  });

  it('displays loading state initially', () => {
    (getProductDetails as jest.Mock).mockImplementation(() => new Promise(() => {})); // Simulate loading
    renderWithCartContext(<CoreFunctionality productId="1" />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('displays error message when product details fail to load', async () => {
    (getProductDetails as jest.Mock).mockRejectedValue(new Error('Failed to fetch'));
    renderWithCartContext(<CoreFunctionality productId="1" />);

    await waitFor(() => {
      expect(screen.getByText('Error: Failed to fetch product details.')).toBeInTheDocument();
    });
  });

  it('increments quantity correctly', async () => {
    renderWithCartContext(<CoreFunctionality productId="1" />);

    await waitFor(() => {
      const incrementButton = screen.getByRole('button', { name: 'Increment' });
      fireEvent.click(incrementButton);
      expect(screen.getByText('Quantity: 2')).toBeInTheDocument();
    });
  });

  it('decrements quantity correctly', async () => {
    renderWithCartContext(<CoreFunctionality productId="1" />);

    await waitFor(() => {
      const incrementButton = screen.getByRole('button', { name: 'Increment' });
      fireEvent.click(incrementButton);
      fireEvent.click(incrementButton);

      const decrementButton = screen.getByRole('button', { name: 'Decrement' });
      fireEvent.click(decrementButton);
      expect(screen.getByText('Quantity: 2')).toBeInTheDocument();
    });
  });

  it('does not decrement quantity below 1', async () => {
    renderWithCartContext(<CoreFunctionality productId="1" />);

    await waitFor(() => {
      const decrementButton = screen.getByRole('button', { name: 'Decrement' });
      fireEvent.click(decrementButton);
      expect(screen.getByText('Quantity: 1')).toBeInTheDocument();
    });
  });

  it('adds product to cart correctly', async () => {
    const setCartItemsMock = jest.fn();
    render(
      <CartContext.Provider value={{ cartItems: [], setCartItems: setCartItemsMock }}>
        <CoreFunctionality productId="1" />
      </CartContext.Provider>
    );

    await waitFor(() => {
      const addToCartButton = screen.getByRole('button', { name: 'Add to Cart' });
      fireEvent.click(addToCartButton);
      expect(setCartItemsMock).toHaveBeenCalledWith([
        {
          id: '1',
          name: 'Test Product',
          description: 'Test Description',
          price: 10,
          imageUrl: 'test.jpg',
          stock: 10,
          quantity: 1,
        },
      ]);
    });
  });

  it('updates quantity in cart if product already exists', async () => {
    const setCartItemsMock = jest.fn();
    const initialCartItems = [{ ...mockProduct, quantity: 2 }];
    render(
      <CartContext.Provider value={{ cartItems: initialCartItems, setCartItems: setCartItemsMock }}>
        <CoreFunctionality productId="1" />
      </CartContext.Provider>
    );

    await waitFor(() => {
      const addToCartButton = screen.getByRole('button', { name: 'Add to Cart' });
      fireEvent.click(addToCartButton);
      expect(setCartItemsMock).toHaveBeenCalledWith([
        {
          id: '1',
          name: 'Test Product',
          description: 'Test Description',
          price: 10,
          imageUrl: 'test.jpg',
          stock: 10,
          quantity: 3,
        },
      ]);
    });
  });

  it('disables add to cart button when out of stock', async () => {
    (getProductDetails as jest.Mock).mockResolvedValue({ ...mockProduct, stock: 0 });
    renderWithCartContext(<CoreFunctionality productId="1" />);

    await waitFor(() => {
      const addToCartButton = screen.getByRole('button', { name: 'Add to Cart' });
      expect(addToCartButton).toBeDisabled();
    });
  });

  it('displays "Out of Stock" message when product is out of stock', async () => {
    (getProductDetails as jest.Mock).mockResolvedValue({ ...mockProduct, stock: 0 });
    renderWithCartContext(<CoreFunctionality productId="1" />);

    await waitFor(() => {
      expect(screen.getByText('Out of Stock')).toBeInTheDocument();
    });
  });

  it('updates quantity correctly using input field', async () => {
    renderWithCartContext(<CoreFunctionality productId="1" />);

    await waitFor(() => {
      const quantityInput = screen.getByRole('spinbutton', { name: 'Quantity' });
      userEvent.clear(quantityInput);
      userEvent.type(quantityInput, '5');
      expect(quantityInput).toHaveValue(5);
    });
  });

  it('updates quantity correctly using input field and add to cart', async () => {
    const setCartItemsMock = jest.fn();
    render(
      <CartContext.Provider value={{ cartItems: [], setCartItems: setCartItemsMock }}>
        <CoreFunctionality productId="1" />
      </CartContext.Provider>
    );

    await waitFor(async () => {
      const quantityInput = screen.getByRole('spinbutton', { name: 'Quantity' });
      userEvent.clear(quantityInput);
      userEvent.type(quantityInput, '5');

      const addToCartButton = screen.getByRole('button', { name: 'Add to Cart' });
      fireEvent.click(addToCartButton);

      expect(setCartItemsMock).toHaveBeenCalledWith([
        {
          id: '1',
          name: 'Test Product',
          description: 'Test Description',
          price: 10,
          imageUrl: 'test.jpg',
          stock: 10,
          quantity: 5,
        },
      ]);
    });
  });

  it('quantity input field does not allow values less than 1', async () => {
    renderWithCartContext(<CoreFunctionality productId="1" />);

    await waitFor(() => {
      const quantityInput = screen.getByRole('spinbutton', { name: 'Quantity' });
      userEvent.clear(quantityInput);
      userEvent.type(quantityInput, '0');
      expect(quantityInput).toHaveValue(1);
    });
  });

  it('quantity input field does not allow non-numeric values', async () => {
    renderWithCartContext(<CoreFunctionality productId="1" />);

    await waitFor(() => {
      const quantityInput = screen.getByRole('spinbutton', { name: 'Quantity' });
      userEvent.clear(quantityInput);
      userEvent.type(quantityInput, 'abc');
      expect(quantityInput).toHaveValue(1);
    });
  });

  it('renders with accessible labels and roles', async () => {
    renderWithCartContext(<CoreFunctionality productId="1" />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Test Product', level: 1 })).toBeInTheDocument();
      expect(screen.getByRole('img', { name: 'Test Product' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Increment' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Decrement' })).toBeInTheDocument();
      expect(screen.getByRole('spinbutton', { name: 'Quantity' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Add to Cart' })).toBeInTheDocument();
    });
  });

  it('updates quantity correctly using input field with max stock', async () => {
    (getProductDetails as jest.Mock).mockResolvedValue({ ...mockProduct, stock: 5 });
    renderWithCartContext(<CoreFunctionality productId="1" />);

    await waitFor(() => {
      const quantityInput = screen.getByRole('spinbutton', { name: 'Quantity' });
      userEvent.clear(quantityInput);
      userEvent.type(quantityInput, '10');
      expect(quantityInput).toHaveValue(5);
    });
  });

  it('updates quantity correctly using increment button with max stock', async () => {
    (getProductDetails as jest.Mock).mockResolvedValue({ ...mockProduct, stock: 2 });
    renderWithCartContext(<CoreFunctionality productId="1" />);

    await waitFor(() => {
      const incrementButton = screen.getByRole('button', { name: 'Increment' });
      fireEvent.click(incrementButton);
      fireEvent.click(incrementButton);
      fireEvent.click(incrementButton);
      expect(screen.getByText('Quantity: 2')).toBeInTheDocument();
    });
  });

  it('adds product to cart with correct quantity after incrementing', async () => {
    const setCartItemsMock = jest.fn();
    (getProductDetails as jest.Mock).mockResolvedValue({ ...mockProduct, stock: 5 });
    render(
      <CartContext.Provider value={{ cartItems: [], setCartItems: setCartItemsMock }}>
        <CoreFunctionality productId="1" />
      </CartContext.Provider>
    );

    await waitFor(async () => {
      const incrementButton = screen.getByRole('button', { name: 'Increment' });
      fireEvent.click(incrementButton);
      fireEvent.click(incrementButton);

      const addToCartButton = screen.getByRole('button', { name: 'Add to Cart' });
      fireEvent.click(addToCartButton);

      expect(setCartItemsMock).toHaveBeenCalledWith([
        {
          id: '1',
          name: 'Test Product',
          description: 'Test Description',
          price: 10,
          imageUrl: 'test.jpg',
          stock: 5,
          quantity: 3,
        },
      ]);
    });
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CartContext } from '../../contexts/CartContext';
import { Product } from '../../types/Product';
import CoreFunctionality from '../../components/CoreFunctionality';
import { getProductDetails } from '../../api/productService'; // Assuming an API call

jest.mock('../../api/productService', () => ({
  getProductDetails: jest.fn(),
}));

const mockProduct: Product = {
  id: '1',
  name: 'Test Product',
  description: 'Test Description',
  price: 10,
  imageUrl: 'test.jpg',
  stock: 10,
};

const renderWithCartContext = (ui: React.ReactElement, cartItems: any[] = []) => {
  return render(
    <CartContext.Provider value={{ cartItems, setCartItems: jest.fn() }}>
      {ui}
    </CartContext.Provider>
  );
};

describe('CoreFunctionality Component', () => {
  beforeEach(() => {
    (getProductDetails as jest.Mock).mockResolvedValue(mockProduct);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders product details correctly', async () => {
    renderWithCartContext(<CoreFunctionality productId="1" />);

    await waitFor(() => {
      expect(screen.getByText('Test Product')).toBeInTheDocument();
      expect(screen.getByText('Test Description')).toBeInTheDocument();
      expect(screen.getByText('$10')).toBeInTheDocument();
    });
  });

  it('displays loading state initially', () => {
    (getProductDetails as jest.Mock).mockImplementation(() => new Promise(() => {})); // Simulate loading
    renderWithCartContext(<CoreFunctionality productId="1" />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('displays error message when product details fail to load', async () => {
    (getProductDetails as jest.Mock).mockRejectedValue(new Error('Failed to fetch'));
    renderWithCartContext(<CoreFunctionality productId="1" />);

    await waitFor(() => {
      expect(screen.getByText('Error: Failed to fetch product details.')).toBeInTheDocument();
    });
  });

  it('increments quantity correctly', async () => {
    renderWithCartContext(<CoreFunctionality productId="1" />);

    await waitFor(() => {
      const incrementButton = screen.getByRole('button', { name: 'Increment' });
      fireEvent.click(incrementButton);
      expect(screen.getByText('Quantity: 2')).toBeInTheDocument();
    });
  });

  it('decrements quantity correctly', async () => {
    renderWithCartContext(<CoreFunctionality productId="1" />);

    await waitFor(() => {
      const incrementButton = screen.getByRole('button', { name: 'Increment' });
      fireEvent.click(incrementButton);
      fireEvent.click(incrementButton);

      const decrementButton = screen.getByRole('button', { name: 'Decrement' });
      fireEvent.click(decrementButton);
      expect(screen.getByText('Quantity: 2')).toBeInTheDocument();
    });
  });

  it('does not decrement quantity below 1', async () => {
    renderWithCartContext(<CoreFunctionality productId="1" />);

    await waitFor(() => {
      const decrementButton = screen.getByRole('button', { name: 'Decrement' });
      fireEvent.click(decrementButton);
      expect(screen.getByText('Quantity: 1')).toBeInTheDocument();
    });
  });

  it('adds product to cart correctly', async () => {
    const setCartItemsMock = jest.fn();
    render(
      <CartContext.Provider value={{ cartItems: [], setCartItems: setCartItemsMock }}>
        <CoreFunctionality productId="1" />
      </CartContext.Provider>
    );

    await waitFor(() => {
      const addToCartButton = screen.getByRole('button', { name: 'Add to Cart' });
      fireEvent.click(addToCartButton);
      expect(setCartItemsMock).toHaveBeenCalledWith([
        {
          id: '1',
          name: 'Test Product',
          description: 'Test Description',
          price: 10,
          imageUrl: 'test.jpg',
          stock: 10,
          quantity: 1,
        },
      ]);
    });
  });

  it('updates quantity in cart if product already exists', async () => {
    const setCartItemsMock = jest.fn();
    const initialCartItems = [{ ...mockProduct, quantity: 2 }];
    render(
      <CartContext.Provider value={{ cartItems: initialCartItems, setCartItems: setCartItemsMock }}>
        <CoreFunctionality productId="1" />
      </CartContext.Provider>
    );

    await waitFor(() => {
      const addToCartButton = screen.getByRole('button', { name: 'Add to Cart' });
      fireEvent.click(addToCartButton);
      expect(setCartItemsMock).toHaveBeenCalledWith([
        {
          id: '1',
          name: 'Test Product',
          description: 'Test Description',
          price: 10,
          imageUrl: 'test.jpg',
          stock: 10,
          quantity: 3,
        },
      ]);
    });
  });

  it('disables add to cart button when out of stock', async () => {
    (getProductDetails as jest.Mock).mockResolvedValue({ ...mockProduct, stock: 0 });
    renderWithCartContext(<CoreFunctionality productId="1" />);

    await waitFor(() => {
      const addToCartButton = screen.getByRole('button', { name: 'Add to Cart' });
      expect(addToCartButton).toBeDisabled();
    });
  });

  it('displays "Out of Stock" message when product is out of stock', async () => {
    (getProductDetails as jest.Mock).mockResolvedValue({ ...mockProduct, stock: 0 });
    renderWithCartContext(<CoreFunctionality productId="1" />);

    await waitFor(() => {
      expect(screen.getByText('Out of Stock')).toBeInTheDocument();
    });
  });

  it('updates quantity correctly using input field', async () => {
    renderWithCartContext(<CoreFunctionality productId="1" />);

    await waitFor(() => {
      const quantityInput = screen.getByRole('spinbutton', { name: 'Quantity' });
      userEvent.clear(quantityInput);
      userEvent.type(quantityInput, '5');
      expect(quantityInput).toHaveValue(5);
    });
  });

  it('updates quantity correctly using input field and add to cart', async () => {
    const setCartItemsMock = jest.fn();
    render(
      <CartContext.Provider value={{ cartItems: [], setCartItems: setCartItemsMock }}>
        <CoreFunctionality productId="1" />
      </CartContext.Provider>
    );

    await waitFor(async () => {
      const quantityInput = screen.getByRole('spinbutton', { name: 'Quantity' });
      userEvent.clear(quantityInput);
      userEvent.type(quantityInput, '5');

      const addToCartButton = screen.getByRole('button', { name: 'Add to Cart' });
      fireEvent.click(addToCartButton);

      expect(setCartItemsMock).toHaveBeenCalledWith([
        {
          id: '1',
          name: 'Test Product',
          description: 'Test Description',
          price: 10,
          imageUrl: 'test.jpg',
          stock: 10,
          quantity: 5,
        },
      ]);
    });
  });

  it('quantity input field does not allow values less than 1', async () => {
    renderWithCartContext(<CoreFunctionality productId="1" />);

    await waitFor(() => {
      const quantityInput = screen.getByRole('spinbutton', { name: 'Quantity' });
      userEvent.clear(quantityInput);
      userEvent.type(quantityInput, '0');
      expect(quantityInput).toHaveValue(1);
    });
  });

  it('quantity input field does not allow non-numeric values', async () => {
    renderWithCartContext(<CoreFunctionality productId="1" />);

    await waitFor(() => {
      const quantityInput = screen.getByRole('spinbutton', { name: 'Quantity' });
      userEvent.clear(quantityInput);
      userEvent.type(quantityInput, 'abc');
      expect(quantityInput).toHaveValue(1);
    });
  });

  it('renders with accessible labels and roles', async () => {
    renderWithCartContext(<CoreFunctionality productId="1" />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Test Product', level: 1 })).toBeInTheDocument();
      expect(screen.getByRole('img', { name: 'Test Product' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Increment' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Decrement' })).toBeInTheDocument();
      expect(screen.getByRole('spinbutton', { name: 'Quantity' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Add to Cart' })).toBeInTheDocument();
    });
  });

  it('updates quantity correctly using input field with max stock', async () => {
    (getProductDetails as jest.Mock).mockResolvedValue({ ...mockProduct, stock: 5 });
    renderWithCartContext(<CoreFunctionality productId="1" />);

    await waitFor(() => {
      const quantityInput = screen.getByRole('spinbutton', { name: 'Quantity' });
      userEvent.clear(quantityInput);
      userEvent.type(quantityInput, '10');
      expect(quantityInput).toHaveValue(5);
    });
  });

  it('updates quantity correctly using increment button with max stock', async () => {
    (getProductDetails as jest.Mock).mockResolvedValue({ ...mockProduct, stock: 2 });
    renderWithCartContext(<CoreFunctionality productId="1" />);

    await waitFor(() => {
      const incrementButton = screen.getByRole('button', { name: 'Increment' });
      fireEvent.click(incrementButton);
      fireEvent.click(incrementButton);
      fireEvent.click(incrementButton);
      expect(screen.getByText('Quantity: 2')).toBeInTheDocument();
    });
  });

  it('adds product to cart with correct quantity after incrementing', async () => {
    const setCartItemsMock = jest.fn();
    (getProductDetails as jest.Mock).mockResolvedValue({ ...mockProduct, stock: 5 });
    render(
      <CartContext.Provider value={{ cartItems: [], setCartItems: setCartItemsMock }}>
        <CoreFunctionality productId="1" />
      </CartContext.Provider>
    );

    await waitFor(async () => {
      const incrementButton = screen.getByRole('button', { name: 'Increment' });
      fireEvent.click(incrementButton);
      fireEvent.click(incrementButton);

      const addToCartButton = screen.getByRole('button', { name: 'Add to Cart' });
      fireEvent.click(addToCartButton);

      expect(setCartItemsMock).toHaveBeenCalledWith([
        {
          id: '1',
          name: 'Test Product',
          description: 'Test Description',
          price: 10,
          imageUrl: 'test.jpg',
          stock: 5,
          quantity: 3,
        },
      ]);
    });
  });
});