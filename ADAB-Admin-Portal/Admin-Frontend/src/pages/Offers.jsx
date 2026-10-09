import { useState, useEffect } from 'react';
import apiClient from '../api/apiClient';

export default function Offers() {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOffers = async () => {
      try {
        const res = await apiClient.get('/offers');
        if (res.data.success) {
          setOffers(res.data.data);
        }
      } catch (err) {
        console.error('Failed to load offers', err);
      } finally {
        setLoading(false);
      }
    };
    fetchOffers();
  }, []);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Platform Offers</h1>
        <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">
          + Create Offer
        </button>
      </div>

      <div className="card">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading offers...</div>
        ) : offers.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No offers found.</div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="p-4 font-semibold">Offer Code</th>
                <th className="p-4 font-semibold">Discount</th>
                <th className="p-4 font-semibold">Valid Until</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {offers.map(offer => (
                <tr key={offer.id} className="hover:bg-slate-50">
                  <td className="p-4 font-medium">{offer.code}</td>
                  <td className="p-4">{offer.discount}</td>
                  <td className="p-4">{new Date(offer.validUntil).toLocaleDateString()}</td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${offer.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}`}>
                      {offer.status}
                    </span>
                  </td>
                  <td className="p-4">
                    <button className="text-indigo-600 hover:underline">Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
