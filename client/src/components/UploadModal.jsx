import { useState } from 'react';
import api from '../api/api';

export default function UploadModal({ onClose, onUploaded }) {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleUpload = async () => {
        if (!file) {
            setError('Please select an image');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const formData = new FormData();
            formData.append('image', file);
            const { data } = await api.post('/bills/upload', formData);
            onUploaded(data);
            onClose();
        } catch (err) {
            setError(err.response?.data?.message || 'Upload failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4">
                    <h2 className="text-lg font-semibold text-white">Upload Grocery Bill</h2>
                    <p className="text-emerald-100 text-sm">Select a bill image to analyze</p>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4">
                    <label
                        className={`flex flex-col items-center justify-center h-36 border-2 border-dashed rounded-xl cursor-pointer transition-colors
              ${file ? 'border-emerald-400 bg-emerald-50' : 'border-gray-300 hover:border-emerald-400 hover:bg-gray-50'}`}
                    >
                        <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => { setFile(e.target.files[0]); setError(''); }}
                        />
                        {file ? (
                            <div className="text-center">
                                <span className="text-3xl">✅</span>
                                <p className="mt-1 text-sm text-gray-600 truncate max-w-[200px]">{file.name}</p>
                            </div>
                        ) : (
                            <div className="text-center">
                                <span className="text-3xl">📷</span>
                                <p className="mt-1 text-sm text-gray-500">Click to select image</p>
                                <p className="text-xs text-gray-400">JPG, PNG</p>
                            </div>
                        )}
                    </label>

                    {error && (
                        <p className="text-red-500 text-sm text-center">{error}</p>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 pb-6 flex gap-3">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="flex-1 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleUpload}
                        disabled={loading}
                        className="flex-1 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all disabled:opacity-60 cursor-pointer"
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                Analyzing…
                            </span>
                        ) : 'Upload & Analyze'}
                    </button>
                </div>
            </div>
        </div>
    );
}
