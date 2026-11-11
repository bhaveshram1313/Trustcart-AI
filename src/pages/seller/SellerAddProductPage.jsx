import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTrustCart } from '../../context/TrustCartContext';
import { createSellerProduct } from '../../services/sellerProductService';
import SellerProductForm from '../../components/seller/SellerProductForm';

export default function SellerAddProductPage() {
  const { user } = useAuth();
  const { showToast, refreshCatalog } = useTrustCart();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async (payload) => {
    setSubmitting(true);
    try {
      const created = await createSellerProduct(payload);
      refreshCatalog();
      showToast(`"${created.name}" published to your inventory!`, 'success');
      navigate('/seller/products');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 space-y-8">
      <div>
        <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#635BFF]">
          <PlusCircle className="w-4 h-4" />
          New Listing
        </span>
        <h1 className="mt-1 font-display text-3xl font-extrabold text-[#1E293B]">
          Add Product
        </h1>
        <p className="mt-1 text-sm text-[#64748B]">
          Create a new product listing with specifications, pricing, and stock quantity.
        </p>
      </div>

      <SellerProductForm
        sellerUser={user}
        onSubmit={handleCreate}
        submitLabel="Publish Product"
        submitting={submitting}
      />
    </div>
  );
}
