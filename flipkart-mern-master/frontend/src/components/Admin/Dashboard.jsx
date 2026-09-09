import { useState } from 'react';
import Sidebar from './Sidebar/Sidebar';
import MenuIcon from '@mui/icons-material/Menu';

const Dashboard = ({ activeTab, children }) => {
    const [toggleSidebar, setToggleSidebar] = useState(false);

    return (
        <div className="flex min-h-screen bg-gray-100 mt-14">
            {/* Desktop persistent sidebar */}
            <div className="hidden sm:block w-64 flex-shrink-0">
                <Sidebar activeTab={activeTab} />
            </div>

            {/* Mobile backdrop overlay */}
            {toggleSidebar && (
                <div
                    onClick={() => setToggleSidebar(false)}
                    className="fixed inset-0 bg-black/60 z-40 sm:hidden transition-opacity"
                />
            )}

            {/* Mobile drawer sidebar */}
            <div className={`fixed inset-y-0 left-0 z-50 transform ${toggleSidebar ? 'translate-x-0' : '-translate-x-full'} sm:hidden transition-transform duration-300 ease-in-out`}>
                <Sidebar activeTab={activeTab} setToggleSidebar={setToggleSidebar} />
            </div>

            {/* Main content container with matching margin */}
            <main className="flex-1 w-full min-w-0 sm:ml-64 flex flex-col min-h-[calc(100vh-3.5rem)]">
                <div className="p-3 sm:p-6 lg:p-8 w-full max-w-7xl mx-auto flex flex-col gap-6">
                    <button
                        onClick={() => setToggleSidebar(true)}
                        className="sm:hidden self-start bg-gray-800 text-white px-3 py-2 rounded shadow flex items-center gap-2 hover:bg-gray-700"
                    >
                        <MenuIcon fontSize="small" />
                        <span className="text-sm font-medium">Sidebar Menu</span>
                    </button>
                    {children}
                </div>
            </main>
        </div>
    );
};

export default Dashboard;
