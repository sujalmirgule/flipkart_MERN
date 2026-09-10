import { useSelector } from 'react-redux';
import { Navigate, useLocation } from 'react-router-dom';
import BackdropLoader from '../components/Layouts/BackdropLoader';

const ProtectedRoute = ({ children, isAdmin }) => {
    const location = useLocation();
    const { loading, isAuthenticated, user } = useSelector((state) => state.user);

    if (loading === true || loading === undefined) {
        return <BackdropLoader />;
    }

    if (!isAuthenticated) {
        const redirectPath = encodeURIComponent(location.pathname + location.search);
        return <Navigate to={`/login?redirect=${redirectPath}`} replace />;
    }

    if (isAdmin && user?.role !== "admin") {
        return <Navigate to="/login" replace />;
    }

    return children;
};

export default ProtectedRoute;
