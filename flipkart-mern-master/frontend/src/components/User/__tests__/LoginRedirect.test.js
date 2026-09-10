import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import * as reactRedux from 'react-redux';
import Login from '../Login';
import ProtectedRoute from '../../../Routes/ProtectedRoute';

const mockNavigate = jest.fn();
let mockLocation = { pathname: '/login', search: '' };

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useLocation: () => mockLocation,
  Link: ({ children, to, className }) => <a href={to} className={className}>{children}</a>,
  Navigate: ({ to, replace }) => <div data-testid="navigate" data-to={to} data-replace={String(replace)} />,
}));

jest.mock('notistack', () => ({
  useSnackbar: () => ({
    enqueueSnackbar: jest.fn(),
  }),
}));

jest.mock('../../Layouts/MetaData', () => () => <div data-testid="meta" />);
jest.mock('../../Layouts/BackdropLoader', () => () => <div data-testid="loader">Loading...</div>);

describe('Role-based Login and Access Redirection', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockLocation = { pathname: '/login', search: '' };
    jest.spyOn(reactRedux, 'useDispatch').mockReturnValue(jest.fn());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('Normal user login redirects to "/" instead of "/account"', () => {
    mockLocation = { pathname: '/login', search: '' };
    jest.spyOn(reactRedux, 'useSelector').mockImplementation((selector) =>
      selector({
        user: {
          loading: false,
          isAuthenticated: true,
          user: { role: 'user', name: 'John' },
          error: null,
        },
      })
    );

    render(<Login />);

    expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    expect(mockNavigate).not.toHaveBeenCalledWith('/account', expect.anything());
  });

  test('Admin user login redirects directly to "/admin/dashboard"', () => {
    mockLocation = { pathname: '/login', search: '' };
    jest.spyOn(reactRedux, 'useSelector').mockImplementation((selector) =>
      selector({
        user: {
          loading: false,
          isAuthenticated: true,
          user: { role: 'admin', name: 'Admin' },
          error: null,
        },
      })
    );

    render(<Login />);

    expect(mockNavigate).toHaveBeenCalledWith('/admin/dashboard', { replace: true });
    expect(mockNavigate).not.toHaveBeenCalledWith('/account', expect.anything());
  });

  test('Normal user with an admin redirect param is safely redirected to "/"', () => {
    mockLocation = { pathname: '/login', search: '?redirect=%2Fadmin%2Fdashboard' };
    jest.spyOn(reactRedux, 'useSelector').mockImplementation((selector) =>
      selector({
        user: {
          loading: false,
          isAuthenticated: true,
          user: { role: 'user', name: 'Normal User' },
          error: null,
        },
      })
    );

    render(<Login />);

    expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
  });

  test('Normal user with legitimate user redirect param redirects to the target', () => {
    mockLocation = { pathname: '/login', search: '?redirect=shipping' };
    jest.spyOn(reactRedux, 'useSelector').mockImplementation((selector) =>
      selector({
        user: {
          loading: false,
          isAuthenticated: true,
          user: { role: 'user', name: 'Normal User' },
          error: null,
        },
      })
    );

    render(<Login />);

    expect(mockNavigate).toHaveBeenCalledWith('/shipping', { replace: true });
  });

  test('Admin user with admin redirect param redirects to specified admin page', () => {
    mockLocation = { pathname: '/login', search: '?redirect=%2Fadmin%2Fproducts' };
    jest.spyOn(reactRedux, 'useSelector').mockImplementation((selector) =>
      selector({
        user: {
          loading: false,
          isAuthenticated: true,
          user: { role: 'admin', name: 'Admin User' },
          error: null,
        },
      })
    );

    render(<Login />);

    expect(mockNavigate).toHaveBeenCalledWith('/admin/products', { replace: true });
  });

  test('ProtectedRoute denies non-admin user access to admin route and redirects to "/"', () => {
    mockLocation = { pathname: '/admin/dashboard', search: '' };
    jest.spyOn(reactRedux, 'useSelector').mockImplementation((selector) =>
      selector({
        user: {
          loading: false,
          isAuthenticated: true,
          user: { role: 'user' },
        },
      })
    );

    const { getByTestId, queryByText } = render(
      <ProtectedRoute isAdmin={true}>
        <div>Admin Content</div>
      </ProtectedRoute>
    );

    expect(queryByText('Admin Content')).toBeNull();
    const nav = getByTestId('navigate');
    expect(nav.getAttribute('data-to')).toBe('/');
  });

  test('ProtectedRoute allows admin user access to admin route', () => {
    mockLocation = { pathname: '/admin/dashboard', search: '' };
    jest.spyOn(reactRedux, 'useSelector').mockImplementation((selector) =>
      selector({
        user: {
          loading: false,
          isAuthenticated: true,
          user: { role: 'admin' },
        },
      })
    );

    const { getByText } = render(
      <ProtectedRoute isAdmin={true}>
        <div>Admin Content</div>
      </ProtectedRoute>
    );

    expect(getByText('Admin Content')).toBeInTheDocument();
  });
});
