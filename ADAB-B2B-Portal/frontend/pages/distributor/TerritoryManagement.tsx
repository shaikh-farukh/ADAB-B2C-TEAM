import React, { useState, useEffect } from 'react';
import apiClient from '../../services/apiClient';

const TerritoryManagement = () => {
    const [pincodes, setPincodes] = useState<string[]>([]);
    const [newPincode, setNewPincode] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchPincodes = async () => {
            try {
                const response = await apiClient.get('/distributor/territory');
                if (response.data.success) {
                    setPincodes(response.data.data || []);
                }
            } catch (error) {
                console.error("Failed to fetch territory", error);
            } finally {
                setLoading(false);
            }
        };
        fetchPincodes();
    }, []);

    const handleAddPincode = () => {
        if (newPincode && !pincodes.includes(newPincode)) {
            setPincodes([...pincodes, newPincode]);
            setNewPincode('');
        }
    };

    const handleRemovePincode = (code: string) => {
        setPincodes(pincodes.filter(p => p !== code));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await apiClient.put('/distributor/territory', { pincodes });
            alert("Territory updated successfully!");
        } catch (error) {
            console.error("Failed to update territory", error);
            alert("Failed to update territory");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-4">Loading...</div>;

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">Serviceable Territory</h1>
            <p className="text-gray-600 mb-6">Manage the pincodes where you deliver products.</p>
            
            <div className="flex gap-4 mb-6">
                <input 
                    type="text" 
                    value={newPincode}
                    onChange={(e) => setNewPincode(e.target.value)}
                    placeholder="Enter Pincode (e.g. 400001)"
                    className="border p-2 rounded w-64"
                />
                <button 
                    onClick={handleAddPincode}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                    Add
                </button>
            </div>

            <div className="bg-white p-4 rounded shadow">
                <h3 className="font-semibold mb-4">Current Serviceable Pincodes</h3>
                {pincodes.length === 0 ? (
                    <p className="text-gray-500">No pincodes added yet.</p>
                ) : (
                    <div className="flex flex-wrap gap-2 mb-4">
                        {pincodes.map(p => (
                            <span key={p} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full flex items-center gap-2">
                                {p}
                                <button onClick={() => handleRemovePincode(p)} className="text-red-500 font-bold">&times;</button>
                            </span>
                        ))}
                    </div>
                )}
                
                <button 
                    onClick={handleSave}
                    disabled={saving}
                    className="mt-4 bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:opacity-50"
                >
                    {saving ? "Saving..." : "Save Territory"}
                </button>
            </div>
        </div>
    );
};

export default TerritoryManagement;
