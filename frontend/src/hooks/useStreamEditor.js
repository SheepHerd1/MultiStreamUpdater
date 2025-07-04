import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

export const useStreamEditor = (auth) => {
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState('');
    const [tags, setTags] = useState('');
    const [status, setStatus] = useState({ message: '', type: '' });
    const [isLoading, setIsLoading] = useState(false);
    const statusTimeoutRef = useRef(null);

    useEffect(() => {
        const fetchStreamInfo = async () => {
            if (auth.twitch) {
                setIsLoading(true);
                setStatus({ message: 'Fetching current stream info...', type: 'info' });
                try {
                    const response = await axios.get(`${API_BASE_URL}/api/stream/info`, {
                        params: { broadcaster_id: auth.twitch.userId, token: auth.twitch.token }
                    });
                    setTitle(response.data.title || '');
                    setCategory(response.data.game_name || '');
                    setStatus({ message: '', type: '' });
                } catch (error) {
                    console.error('Could not fetch stream info:', error);
                    setStatus({ message: 'Could not fetch current stream info.', type: 'error' });
                } finally {
                    setIsLoading(false);
                }
            } else {
                setTitle('');
                setCategory('');
                setTags('');
                setStatus({ message: '', type: '' });
            }
        };
        fetchStreamInfo();

        return () => clearTimeout(statusTimeoutRef.current);
    }, [auth.twitch]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setStatus({ message: 'Updating...', type: 'info' });
        clearTimeout(statusTimeoutRef.current);

        try {
            const response = await axios.post(`${API_BASE_URL}/api/stream/update`, {
                title,
                category,
                tags: tags ? tags.split(',').map(t => t.trim()).filter(t => t) : [],
                twitchAuth: auth.twitch,
            });
            const results = response.data;
            const statusMessage = results.twitch.success ? 'Twitch: Success!' : `Twitch: ${results.twitch.error}`;
            setStatus({ message: statusMessage, type: 'success' });
        } catch (error) {
            const errorMessage = error.response?.data?.message || 'An unexpected error occurred.';
            setStatus({ message: errorMessage, type: 'error' });
        } finally {
            setIsLoading(false);
            statusTimeoutRef.current = setTimeout(() => setStatus({ message: '', type: '' }), 5000);
        }
    };

    return { title, setTitle, category, setCategory, tags, setTags, status, isLoading, handleSubmit };
};