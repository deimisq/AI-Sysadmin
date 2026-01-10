import { useEffect, useState } from 'react';
import { api, removeAuthToken } from '../lib/api';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
    const navigate = useNavigate();
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        api.get('/auth/me')
            .then(setUser)
            .catch(() => {
                removeAuthToken();
                navigate('/login');
            });
    }, [navigate]);

    if (!user) return <div className="p-8">Loading...</div>;

    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold">Welcome, {user.email}</h1>
            <button
                onClick={() => {
                    removeAuthToken();
                    navigate('/login');
                }}
                className="mt-4 px-4 py-2 bg-red-500 text-white rounded"
            >
                Logout
            </button>
        </div>
    );
}
