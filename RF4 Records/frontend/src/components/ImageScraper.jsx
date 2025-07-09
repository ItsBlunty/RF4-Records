import React, { useState } from 'react';
import { Upload, FileImage, Fish, AlertCircle, CheckCircle, Loader2, Edit2, Save, X } from 'lucide-react';

const ImageScraper = () => {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [editingResults, setEditingResults] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileSelect = (selectedFile) => {
    if (selectedFile && selectedFile.type.startsWith('image/')) {
      setFile(selectedFile);
      setError(null);
      setResults(null);
    } else {
      setError('Please select a valid image file');
    }
  };

  const handleFileInput = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  const uploadImage = async () => {
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/scrape-image', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to process image');
      }

      const data = await response.json();
      setResults(data);
      // Set editing results for confirmation
      if (data.requires_confirmation) {
        setEditingResults(JSON.parse(JSON.stringify(data.fish_data)));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFieldChange = (index, field, value) => {
    const updated = [...editingResults];
    updated[index][field] = value;
    setEditingResults(updated);
  };

  const confirmAndSave = async () => {
    if (!editingResults || editingResults.length === 0) return;

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/cafe-orders/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editingResults)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to save cafe orders');
      }

      const data = await response.json();
      
      // Clear form and show success
      setResults({
        ...results,
        saved: true,
        message: data.message
      });
      setEditingResults(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const cancelEdit = () => {
    setEditingResults(null);
    setResults(null);
  };

  const formatMass = (mass) => {
    if (!mass) return 'N/A';
    return mass;
  };

  const formatPrice = (price) => {
    if (!price) return 'N/A';
    return price;
  };

  const resetForm = () => {
    setFile(null);
    setResults(null);
    setError(null);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
          <Fish className="text-blue-600" />
          Fish Image Scraper
        </h1>
        <p className="text-gray-600">
          Upload an image of fish records to automatically extract the data
        </p>
      </div>

      {/* File Upload Area */}
      <div className="mb-6">
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept="image/*"
            onChange={handleFileInput}
            className="hidden"
            id="file-upload"
          />
          
          {file ? (
            <div className="flex items-center justify-center gap-3">
              <FileImage className="text-green-600 w-8 h-8" />
              <div>
                <p className="text-lg font-medium text-gray-900">{file.name}</p>
                <p className="text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            </div>
          ) : (
            <div>
              <Upload className="mx-auto w-12 h-12 text-gray-400 mb-4" />
              <p className="text-lg text-gray-600 mb-2">
                Drop an image here or{' '}
                <label htmlFor="file-upload" className="text-blue-600 hover:text-blue-500 cursor-pointer">
                  browse
                </label>
              </p>
              <p className="text-sm text-gray-500">
                Supports PNG, JPG, and other image formats
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={uploadImage}
          disabled={!file || isUploading}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Fish className="w-5 h-5" />
              Extract Fish Data
            </>
          )}
        </button>
        
        {(file || results || error) && (
          <button
            onClick={resetForm}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Reset
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="text-red-700 font-medium">Error</span>
          </div>
          <p className="text-red-600 mt-1">{error}</p>
        </div>
      )}

      {/* Success Results */}
      {results && (
        <div className="mb-6">
          {results.saved ? (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-green-700 font-medium">Saved!</span>
              </div>
              <p className="text-green-600 mt-1">{results.message}</p>
            </div>
          ) : (
            <>
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                <div className="flex items-center gap-2">
                  <Edit2 className="w-5 h-5 text-blue-600" />
                  <span className="text-blue-700 font-medium">Please Confirm Cafe Orders</span>
                </div>
                <p className="text-blue-600 mt-1">
                  Review and edit the extracted data before saving to the database
                </p>
              </div>

              {/* Fish Data Table with Editing */}
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">Cafe Orders Data</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={confirmAndSave}
                      disabled={isSaving || !editingResults}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Confirm & Save
                        </>
                      )}
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Fish Name
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Location
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Quantity
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Mass
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Silver Price
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {editingResults && editingResults.map((fish, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-4">
                            <input
                              type="text"
                              value={fish.name || ''}
                              onChange={(e) => handleFieldChange(index, 'name', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-4 py-4">
                            <input
                              type="text"
                              value={fish.location || ''}
                              onChange={(e) => handleFieldChange(index, 'location', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-4 py-4">
                            <input
                              type="text"
                              value={fish.quantity || ''}
                              onChange={(e) => handleFieldChange(index, 'quantity', e.target.value)}
                              className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-4 py-4">
                            <input
                              type="text"
                              value={fish.mass || ''}
                              onChange={(e) => handleFieldChange(index, 'mass', e.target.value)}
                              className="w-24 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-1">
                              <span className="text-gray-500">💰</span>
                              <input
                                type="number"
                                step="0.01"
                                value={fish.price || ''}
                                onChange={(e) => handleFieldChange(index, 'price', e.target.value)}
                                className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ImageScraper;