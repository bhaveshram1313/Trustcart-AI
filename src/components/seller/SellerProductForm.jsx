import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  DollarSign,
  Image as ImageIcon,
  Layers,
  Plus,
  Trash2,
  Store,
  Loader2,
  AlertCircle,
  Save,
  Upload,
  CheckCircle2,
  FileCheck,
  Tag,
} from 'lucide-react';

const CATEGORY_OPTIONS = [
  'Audio',
  'Laptops',
  'Monitors',
  'Peripherals',
  'Wearables',
  'Cameras',
  'Storage',
  'Home Tech',
  'Accessories',
];

const CONDITION_OPTIONS = [
  'New',
  'Used',
  'Refurbished',
];

const PRESET_IMAGES = [
  { label: 'Headphones', url: '/images/products/headphones.svg' },
  { label: 'Laptop', url: '/images/products/laptop.svg' },
  { label: 'Smartwatch', url: '/images/products/smartwatch.svg' },
  { label: 'Monitor', url: '/images/products/monitor.svg' },
  { label: 'Keyboard', url: '/images/products/keyboard.svg' },
  { label: 'Camera', url: '/images/products/camera.svg' },
];

function toSpecRows(specsObj) {
  if (!specsObj || typeof specsObj !== 'object') {
    return [{ key: 'Warranty', value: '1 Year Manufacturer' }];
  }
  const entries = Object.entries(specsObj).map(([key, value]) => ({ key, value }));
  return entries.length > 0 ? entries : [{ key: 'Warranty', value: '1 Year Manufacturer' }];
}

export default function SellerProductForm({
  initialValues = null,
  sellerUser,
  onSubmit,
  submitLabel = 'Publish Product',
  submitting = false,
}) {
  const [name, setName] = useState(initialValues?.name || '');
  const [category, setCategory] = useState(initialValues?.category || 'Audio');
  const [condition, setCondition] = useState(initialValues?.condition || 'New');
  const [description, setDescription] = useState(initialValues?.description || '');
  const [price, setPrice] = useState(
    initialValues?.price !== undefined ? String(initialValues.price) : ''
  );
  const [stock, setStock] = useState(
    initialValues?.stock !== undefined ? String(initialValues.stock) : '10'
  );
  const [imageUrl, setImageUrl] = useState(
    initialValues?.imageUrl || initialValues?.image || '/images/products/headphones.svg'
  );
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [specRows, setSpecRows] = useState(() => toSpecRows(initialValues?.specs));
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleDeviceFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file format (PNG, JPG, SVG, WebP, etc.).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Selected image is too large (maximum allowable size is 5MB).');
      return;
    }

    setError('');
    setUploadedFileName(file.name);

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const dataUrl = loadEvent.target?.result;
      if (typeof dataUrl === 'string') {
        setImageUrl(dataUrl);
      }
    };
    reader.onerror = () => {
      setError('Failed to read image file from your device. Please try another image.');
    };
    reader.readAsDataURL(file);
  };

  const addSpecRow = () => {
    setSpecRows((prev) => [...prev, { key: '', value: '' }]);
  };

  const updateSpecRow = (index, field, value) => {
    setSpecRows((prev) =>
      prev.map((row, idx) => (idx === index ? { ...row, [field]: value } : row))
    );
  };

  const removeSpecRow = (index) => {
    setSpecRows((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanName = name.trim();
    if (cleanName.length < 3) {
      setError('Product name must be at least 3 characters.');
      return;
    }

    if (!category) {
      setError('Please select a product category.');
      return;
    }

    if (!condition) {
      setError('Please select a product condition (New or Used).');
      return;
    }

    const cleanDesc = description.trim();
    if (cleanDesc.length < 10) {
      setError('Product description must be at least 10 characters.');
      return;
    }

    const numPrice = Number(price);
    if (!Number.isFinite(numPrice) || numPrice <= 0) {
      setError('Invalid price: Please enter a positive price greater than $0.00.');
      return;
    }

    const numStock = Number(stock);
    if (!Number.isInteger(numStock) || numStock < 0) {
      setError('Invalid stock: Quantity must be a whole non-negative number (0 or greater).');
      return;
    }

    if (!imageUrl || imageUrl.startsWith('C:\\fakepath')) {
      setError('Please select a photo from your device or provide a valid image URL.');
      return;
    }

    const specs = {};
    specRows.forEach((row) => {
      const k = row.key.trim();
      const v = row.value.trim();
      if (k && v) specs[k] = v;
    });

    try {
      await onSubmit({
        name: cleanName,
        category,
        condition,
        description: cleanDesc,
        price: numPrice,
        stock: numStock,
        imageUrl,
        specs,
      });
    } catch (err) {
      setError(err.message || 'Unable to save product.');
    }
  };

  const profile = sellerUser?.sellerProfile || {};

  return (
    <form onSubmit={handleFormSubmit} className="grid gap-6 lg:grid-cols-12 items-start">
      {/* Main Form Card */}
      <div className="lg:col-span-8 card-surface rounded-3xl p-6 sm:p-8 space-y-6">
        {error && (
          <div className="flex items-start gap-2.5 rounded-xl border border-[#DC2626]/30 bg-[#DC2626]/6 p-3.5 text-xs font-medium text-[#DC2626] animate-fade-up">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          {/* Product Name */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-[#1E293B] mb-1.5">
              Product Name *
            </label>
            <div className="relative">
              <Package className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Studio Pro Wireless ANC Headphones"
                className="w-full rounded-xl border border-slate-200 bg-[#F8FAFC] pl-10 pr-4 py-2.5 text-sm text-[#1E293B] focus:bg-white focus:border-[#635BFF] focus:outline-none focus:ring-2 focus:ring-[#635BFF]/15"
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-semibold text-[#1E293B] mb-1.5">
              Category *
            </label>
            <div className="relative">
              <Layers className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-[#F8FAFC] pl-10 pr-4 py-2.5 text-sm font-medium text-[#1E293B] focus:bg-white focus:border-[#635BFF] focus:outline-none cursor-pointer"
              >
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Condition (New / Used) */}
          <div>
            <label className="block text-xs font-semibold text-[#1E293B] mb-1.5">
              Condition *
            </label>
            <div className="relative">
              <Tag className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-[#F8FAFC] pl-10 pr-4 py-2.5 text-sm font-medium text-[#1E293B] focus:bg-white focus:border-[#635BFF] focus:outline-none cursor-pointer"
              >
                {CONDITION_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Price & Stock */}
          <div className="grid grid-cols-2 gap-3 sm:col-span-2">
            <div>
              <label className="block text-xs font-semibold text-[#1E293B] mb-1.5">
                Price (USD) *
              </label>
              <div className="relative">
                <DollarSign className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="199.99"
                  className="w-full rounded-xl border border-slate-200 bg-[#F8FAFC] pl-9 pr-3 py-2.5 text-sm text-[#1E293B] focus:bg-white focus:border-[#635BFF] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1E293B] mb-1.5">
                Stock / Quantity *
              </label>
              <input
                type="number"
                min="0"
                step="1"
                required
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                placeholder="25"
                className="w-full rounded-xl border border-slate-200 bg-[#F8FAFC] px-3.5 py-2.5 text-sm text-[#1E293B] focus:bg-white focus:border-[#635BFF] focus:outline-none"
              />
            </div>
          </div>

          {/* Description */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-[#1E293B] mb-1.5">
              Description *
            </label>
            <textarea
              rows={3}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe product condition, build quality, key capabilities, and what's included in the box..."
              className="w-full rounded-xl border border-slate-200 bg-[#F8FAFC] px-3.5 py-2.5 text-sm text-[#1E293B] focus:bg-white focus:border-[#635BFF] focus:outline-none focus:ring-2 focus:ring-[#635BFF]/15"
            />
          </div>

          {/* Device Photo / Image Upload */}
          <div className="sm:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-[#1E293B]">
                Product Image / Photo *
              </label>
              <span className="text-[11px] text-[#64748B]">
                Select photo from your device
              </span>
            </div>

            {/* Hidden native file input */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleDeviceFileUpload}
              className="hidden"
            />

            {/* Device Upload Dropzone / Button */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 hover:border-[#635BFF] bg-[#F8FAFC] hover:bg-[#635BFF]/5 rounded-2xl p-4 sm:p-5 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 group"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-slate-200 shadow-xs group-hover:border-[#635BFF]/40 text-[#635BFF]">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-[#1E293B] group-hover:text-[#635BFF]">
                  {uploadedFileName
                    ? `Selected: ${uploadedFileName}`
                    : 'Click to select photo from device'}
                </p>
                <p className="text-[11px] text-[#64748B] mt-0.5">
                  PNG, JPG, SVG, WebP up to 5MB (stored securely as self-contained data)
                </p>
              </div>
              {uploadedFileName && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#16A34A] bg-[#16A34A]/10 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Ready to preview & submit
                </span>
              )}
            </div>

            {/* Alternative Direct URL / Preset Option */}
            <details className="text-xs text-[#64748B]">
              <summary className="cursor-pointer font-medium hover:text-[#1E293B] select-none py-1">
                Advanced: Or enter an image URL / quick preset
              </summary>
              <div className="pt-2 space-y-2">
                <div className="relative">
                  <ImageIcon className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={imageUrl.startsWith('data:') ? '' : imageUrl}
                    onChange={(e) => {
                      setImageUrl(e.target.value);
                      setUploadedFileName('');
                    }}
                    placeholder="https://... or /images/products/headphones.svg"
                    className="w-full rounded-xl border border-slate-200 bg-[#F8FAFC] pl-10 pr-4 py-2 text-xs text-[#1E293B] focus:bg-white focus:border-[#635BFF] focus:outline-none"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] font-medium text-[#64748B] mr-1">
                    Presets:
                  </span>
                  {PRESET_IMAGES.map((preset) => (
                    <button
                      key={preset.url}
                      type="button"
                      onClick={() => {
                        setImageUrl(preset.url);
                        setUploadedFileName('');
                      }}
                      className={`rounded-lg border px-2 py-0.5 text-[11px] font-medium transition cursor-pointer ${
                        imageUrl === preset.url
                          ? 'border-[#635BFF] bg-[#635BFF]/10 text-[#635BFF]'
                          : 'border-slate-200 bg-white text-[#64748B] hover:text-[#1E293B]'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </details>
          </div>
        </div>

        {/* Specifications Editor */}
        <div className="space-y-3 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
              Specifications
            </label>
            <button
              type="button"
              onClick={addSpecRow}
              className="inline-flex items-center gap-1 rounded-lg border border-[#635BFF]/30 bg-[#635BFF]/8 px-2.5 py-1 text-xs font-semibold text-[#635BFF] hover:bg-[#635BFF]/15 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Specification
            </button>
          </div>

          <div className="space-y-2.5">
            {specRows.map((row, index) => (
              <div key={index} className="flex items-center gap-2.5">
                <input
                  type="text"
                  value={row.key}
                  onChange={(e) => updateSpecRow(index, 'key', e.target.value)}
                  placeholder="Spec name (e.g., Battery Life)"
                  className="flex-1 rounded-xl border border-slate-200 bg-[#F8FAFC] px-3 py-2 text-xs text-[#1E293B] focus:bg-white focus:border-[#635BFF] focus:outline-none"
                />
                <input
                  type="text"
                  value={row.value}
                  onChange={(e) => updateSpecRow(index, 'value', e.target.value)}
                  placeholder="Value (e.g., 30 Hours)"
                  className="flex-1 rounded-xl border border-slate-200 bg-[#F8FAFC] px-3 py-2 text-xs text-[#1E293B] focus:bg-white focus:border-[#635BFF] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => removeSpecRow(index)}
                  disabled={specRows.length === 1}
                  className="rounded-lg p-2 text-[#64748B] hover:bg-[#DC2626]/10 hover:text-[#DC2626] transition disabled:opacity-40 cursor-pointer"
                  aria-label="Remove specification row"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-2 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center gap-2 rounded-xl gradient-primary px-6 py-3 text-sm font-semibold text-white shadow-md shadow-[#635BFF]/20 hover:opacity-95 transition cursor-pointer disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving Product...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{submitLabel}</span>
              </>
            )}
          </button>
          <Link
            to="/seller/products"
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#64748B] hover:text-[#1E293B] transition"
          >
            Cancel
          </Link>
        </div>
      </div>

      {/* Right Preview + Authenticated Seller Info */}
      <div className="lg:col-span-4 space-y-5">
        {/* Real-time Image Preview */}
        <div className="card-surface rounded-3xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
              Photo Preview
            </p>
            <span className="inline-flex items-center gap-1 rounded-full bg-[#635BFF]/10 px-2 py-0.5 text-[10px] font-bold text-[#635BFF]">
              {condition}
            </span>
          </div>
          <div className="aspect-[4/3] w-full overflow-hidden rounded-2xl bg-[#F8FAFC] border border-slate-100 flex items-center justify-center relative">
            <img
              src={imageUrl || '/images/products/dock.svg'}
              alt={name || 'Product photo preview'}
              onError={(e) => {
                e.currentTarget.src = '/images/products/dock.svg';
              }}
              className="w-full h-full object-cover"
            />
            {uploadedFileName && (
              <div className="absolute bottom-2 left-2 right-2 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-lg text-[11px] font-medium text-[#1E293B] truncate border border-slate-200 shadow-xs">
                {uploadedFileName}
              </div>
            )}
          </div>
          <div className="space-y-1 text-xs">
            <p className="font-bold text-[#1E293B] truncate">
              {name || 'Product Title'}
            </p>
            <div className="flex items-center justify-between text-[#64748B]">
              <span>Category: {category}</span>
              <span className="font-bold text-[#1E293B]">
                {price ? `$${Number(price).toFixed(2)}` : '$0.00'}
              </span>
            </div>
            <p className="text-[11px] text-[#64748B]">
              Stock: {stock ? `${stock} units` : '0 units'}
            </p>
          </div>
        </div>

        {/* Bound Seller Information */}
        <div className="card-surface rounded-3xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#635BFF]">
              <Store className="w-4 h-4" />
              <span>Seller Information</span>
            </div>
            <Link
              to="/seller/profile"
              className="text-xs font-semibold text-[#635BFF] hover:underline"
            >
              Edit Profile
            </Link>
          </div>

          <div className="rounded-2xl bg-[#F8FAFC] border border-slate-100 p-3.5 space-y-1.5 text-xs">
            <p className="font-bold text-sm text-[#1E293B]">
              {profile.shopName || `${sellerUser?.fullName || 'Your'}'s Shop`}
            </p>
            <p className="text-[#64748B]">Owner: {sellerUser?.fullName}</p>
            <p className="text-[#64748B]">Email: {sellerUser?.email}</p>
            {profile.phone && <p className="text-[#64748B]">Phone: {profile.phone}</p>}
            {profile.businessAddress && (
              <p className="text-[#64748B]">Address: {profile.businessAddress}</p>
            )}
          </div>
          <p className="text-[11px] text-[#64748B] leading-relaxed">
            Product ownership is assigned automatically from your authenticated Seller ID on the
            server.
          </p>
        </div>
      </div>
    </form>
  );
}
