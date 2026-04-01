/**
 * UploadModal.jsx — enhanced to use ML pipeline (/upload-bill),
 * with automatic fallback to mock (/upload) if ML service is unavailable.
 * Props interface is UNCHANGED: { onClose, onUploaded }
 */
import { useState, useRef } from 'react';
import api from '../api/api';
import ReceiptResult from './ReceiptResult';

export default function UploadModal({ onClose, onUploaded }) {
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState(null);
    const inputRef = useRef();

    const handleFileChange = (f) => {
        if (!f) return;
        setFile(f);
        setError('');
        const reader = new FileReader();
        reader.onload = (e) => setPreview(e.target.result);
        reader.readAsDataURL(f);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        const f = e.dataTransfer.files[0];
        if (f && f.type.startsWith('image/')) handleFileChange(f);
    };

    const handleUpload = async () => {
        if (!file) { setError('Please select an image'); return; }
        setLoading(true);
        setError('');

        const formData = new FormData();
        formData.append('image', file);

        try {
            // Try ML pipeline first
            const { data } = await api.post('/bills/upload-bill', formData);
            setResult(data);
            onUploaded(data);
        } catch (mlErr) {
            const status = mlErr.response?.status;
            // 503/502 = ML service unavailable → fall back to mock
            if (status === 503 || status === 502) {
                try {
                    const { data } = await api.post('/bills/upload', formData);
                    setResult(data);
                    onUploaded(data);
                } catch (fallbackErr) {
                    setError(fallbackErr.response?.data?.message || 'Upload failed');
                }
            } else {
                setError(mlErr.response?.data?.message || 'Upload failed');
            }
        } finally {
            setLoading(false);
        }
    };

    // Show extracted receipt data after success
    if (result) {
        return <ReceiptResult bill={result} onClose={onClose} />;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4">
                    <h2 className="text-lg font-semibold text-white">Upload Grocery Bill</h2>
                    <p className="text-emerald-100 text-sm">Select a receipt image to analyse with AI</p>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4">
                    <div
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={handleDrop}
                        onClick={() => inputRef.current?.click()}
                        className={`flex flex-col items-center justify-center h-44 border-2 border-dashed rounded-xl cursor-pointer transition-colors overflow-hidden
              ${file ? 'border-emerald-400 bg-emerald-50' : 'border-gray-300 hover:border-emerald-400 hover:bg-gray-50'}`}
                    >
                        <input
                            ref={inputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleFileChange(e.target.files[0])}
                        />
                        {preview ? (
                            <img src={preview} alt="Receipt preview" className="h-full w-full object-contain p-1" />
                        ) : (
                            <div className="text-center px-4">
                                <span className="text-3xl">📷</span>
                                <p className="mt-1 text-sm text-gray-500">Click or drag & drop image here</p>
                                <p className="text-xs text-gray-400">JPG, PNG up to 20 MB</p>
                            </div>
                        )}
                    </div>

                    {file && <p className="text-xs text-center text-gray-500 truncate">{file.name}</p>}
                    {error && <p className="text-red-500 text-sm text-center">{error}</p>}
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
                                Analysing…
                            </span>
                        ) : 'Upload & Analyse'}
                    </button>
                </div>
            </div>
        </div>
    );
}
