import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import BackdropLoader from '../components/Layouts/BackdropLoader';

const ProtectedRoute = ({ children, isAdmin }) => {
    const { loading, isAuthenticated, user } = useSelector((state) => state.user);

    if (loading === true || loading === undefined) {
        return <BackdropLoader />;
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (isAdmin && user?.role !== "admin") {
        return <Navigate to="/login" replace />;
    }

    return children;
};

export default ProtectedRoute;
