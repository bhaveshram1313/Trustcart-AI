import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Edit3, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTrustCart } from '../../context/TrustCartContext';
import {
  getMySellerProductById,
  updateSellerProduct,
} from '../../services/sellerProductService';
import SellerProductForm from '../../components/seller/SellerProductForm';

export default function SellerEditProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast, refreshCatalog } = useTrustCart();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadProduct() {
      setLoading(true);
      setLoadError('');
      try {
        const found = await getMySellerProductById(id);
        if (active) {
          setProduct(found);
        }
      } catch (err) {
        if (active) {
          setLoadError(err.message || 'Unable to load product for editing.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadProduct();
    return () => {
      active = false;
    };
  }, [id]);

  const handleUpdate = async (payload) => {
    setSubmitting(true);
    try {
      const updated = await updateSellerProduct(id, payload);
      refreshCatalog();
      showToast(`Updated "${updated.name}"`, 'success');
      navigate('/seller/products');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 flex flex-col items-center justify-center gap-3 text-[#64748B]">
        <Loader2 className="w-7 h-7 animate-spin text-[#635BFF]" />
        <p className="text-sm font-medium">Verifying ownership and loading product...</p>
      </div>
    );
  }

  if (loadError || !product) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="card-surface rounded-3xl p-8 text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#DC2626]/10 text-[#DC2626]">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h1 className="font-display text-2xl font-extrabold text-[#1E293B]">
            Cannot Edit Product
          </h1>
          <p className="text-sm text-[#64748B] max-w-md mx-auto">
            {loadError || 'This product could not be found in your seller inventory.'}
          </p>
          <div className="pt-2">
            <Link
              to="/seller/products"
              className="inline-flex items-center gap-2 rounded-xl gradient-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-95 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to My Products
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#635BFF]">
            <Edit3 className="w-4 h-4" />
            Edit Seller Listing
          </span>
          <h1 className="mt-1 font-display text-3xl font-extrabold text-[#1E293B]">
            {product.name}
          </h1>
          <p className="mt-1 text-sm text-[#64748B]">
            Update pricing, stock quantity, description, images, or specifications.
          </p>
        </div>

        <Link
          to="/seller/products"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#1E293B] hover:border-[#635BFF]/40 hover:text-[#635BFF] transition self-start"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to My Products
        </Link>
      </div>

      <SellerProductForm
        initialValues={product}
        sellerUser={user}
        onSubmit={handleUpdate}
        submitLabel="Save Changes"
        submitting={submitting}
      />
    </div>
  );
}
