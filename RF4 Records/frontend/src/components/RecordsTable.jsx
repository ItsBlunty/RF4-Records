import React from 'react';

const RecordsTable = ({ records }) => {
  if (!records || records.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8 text-center">
        <p className="text-gray-500 text-lg">No records found matching your criteria.</p>
        <p className="text-gray-400 text-sm mt-2">Try adjusting your filters to see more results.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Fish</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Bait</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-blue-700 uppercase tracking-wider">Weight</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Location</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Date</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Player</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Region</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {records.map((record, idx) => (
              <tr
                key={idx}
                className={
                  `transition hover:bg-blue-50 ${idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`
                }
              >
                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{record.fish || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-700">{record.bait_display || record.bait || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap font-semibold text-blue-800">
                  {record.weight ? (
                    record.weight < 1000 
                      ? `${record.weight}g`
                      : `${(record.weight / 1000).toFixed(3)} kg`
                  ) : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-700">{record.waterbody || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-700">{record.date || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-700">{record.player || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-700">{record.region || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RecordsTable; 