import React, { useState, useEffect, useRef } from 'react';
import { ReviewAPI } from '../services/api';

/**
 * Verified Customer Reviews View (sec-reviews)
 * Features:
 * 1. Delivered Order Review Prompt: "Rate order #..." cards prompting reviews for delivered items.
 * 2. Review Submission Form Modal:
 *    - Interactive 1–5 star rating selector with descriptive feedback
 *    - Review headline/title input
 *    - Review text/comment textarea with character count
 *    - Photo/media attachment input with real-time thumbnail preview before submission
 * 3. My Reviews View:
 *    - Dual-tab layout: "Pending Reviews" queue & "My Submitted Reviews"
 *    - Verified purchase badge & star rating display
 *    - Attached media gallery with image lightbox preview
 *    - Nested Seller/Store Replies block
 *    - In-place Edit Review modal
 */
export default function ReviewsView({
  onBack,
  onNavigate,
  showToast = () => {},
  preselectedPendingItem = null,
  initialTab = 'pending',
  initialPending = [],
  initialReviews = []
}) {
  const [activeTab, setActiveTab] = useState(initialTab); // 'pending' | 'submitted'
  const [pendingItems, setPendingItems] = useState(initialPending);
  const [myReviews, setMyReviews] = useState(initialReviews);
  const [loading, setLoading] = useState(false);

  // Review modal state
  const [isModalOpen, setIsModalOpen] = useState(Boolean(preselectedPendingItem));
  const [editingReview, setEditingReview] = useState(null); // null when creating, review object when editing
  const [targetItem, setTargetItem] = useState(preselectedPendingItem);

  // Form fields
  const [formRating, setFormRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [formTitle, setFormTitle] = useState('');
  const [formComment, setFormComment] = useState('');
  const [mediaUrlInput, setMediaUrlInput] = useState('');
  const [attachedMedia, setAttachedMedia] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Native file input ref for device / camera photo selection
  const fileInputRef = useRef(null);

  // Media lightbox modal
  const [lightboxImage, setLightboxImage] = useState(null);

  // Rating labels
  const ratingLabels = {
    1: '★☆☆☆☆ Terrible - Very dissatisfied',
    2: '★★☆☆☆ Poor - Not what I expected',
    3: '★★★☆☆ Average - It was okay',
    4: '★★★★☆ Good - Satisfied with purchase',
    5: '★★★★★ Excellent - Highly recommended!'
  };

  // Fetch pending and customer reviews from API
  const refreshData = async () => {
    try {
      setLoading(true);
      const [pendingRes, reviewsRes] = await Promise.allSettled([
        ReviewAPI.getPendingReviews(),
        ReviewAPI.getMyReviews()
      ]);

      if (pendingRes.status === 'fulfilled' && pendingRes.value?.data) {
        setPendingItems(pendingRes.value.data);
      }
      if (reviewsRes.status === 'fulfilled' && reviewsRes.value?.data) {
        setMyReviews(reviewsRes.value.data);
      }
    } catch (err) {
      console.warn('Failed to load reviews data:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  // If preselectedPendingItem is passed from parent, initialize modal
  useEffect(() => {
    if (preselectedPendingItem) {
      openCreateModal(preselectedPendingItem);
    }
  }, [preselectedPendingItem]);

  // Open creation modal for a pending delivered item
  const openCreateModal = (item, initialRating = 5) => {
    setEditingReview(null);
    setTargetItem(item);
    setFormRating(initialRating);
    setHoverRating(0);
    setFormTitle('');
    setFormComment('');
    setAttachedMedia([]);
    setMediaUrlInput('');
    setErrorMessage('');
    setIsModalOpen(true);
  };

  // Open edit modal for an existing submitted review
  const openEditModal = (review) => {
    setEditingReview(review);
    setTargetItem({
      listing_id: review.listing_id,
      product_name: review.product_name,
      order_number: review.order_number,
      store_name: review.store_name
    });
    setFormRating(review.rating || 5);
    setHoverRating(0);
    setFormTitle(review.title || '');
    setFormComment(review.comment || '');
    setAttachedMedia((review.media || []).map((m) => m.media_url || m));
    setMediaUrlInput('');
    setErrorMessage('');
    setIsModalOpen(true);
  };

  // Close modal
  const closeModal = () => {
    setIsModalOpen(false);
    setEditingReview(null);
    setTargetItem(null);
    setErrorMessage('');
  };

  // Handle device / camera file upload
  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files || files.length === 0) return;

    setIsProcessingFile(true);
    setErrorMessage('');

    let processedCount = 0;
    const totalFiles = files.length;

    files.forEach((file) => {
      if (!file.type || !file.type.startsWith('image/')) {
        setErrorMessage('Only image files (JPEG, PNG, WebP) are allowed.');
        processedCount++;
        if (processedCount === totalFiles) setIsProcessingFile(false);
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        setErrorMessage('File size exceeds 10MB limit.');
        processedCount++;
        if (processedCount === totalFiles) setIsProcessingFile(false);
        return;
      }

      const reader = new FileReader();
      reader.onerror = () => {
        setErrorMessage('Could not read image file.');
        processedCount++;
        if (processedCount === totalFiles) setIsProcessingFile(false);
      };

      reader.onload = (event) => {
        const rawDataUrl = event.target.result;
        // Attempt lightweight canvas resize so that base64 payload stays compact & snappy
        try {
          const img = new Image();
          img.onload = () => {
            const maxDim = 1200;
            let { width, height } = img;
            if (width > maxDim || height > maxDim) {
              if (width > height) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
              } else {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
              }
              const canvas = document.createElement('canvas');
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0, width, height);
              const compressed = canvas.toDataURL('image/jpeg', 0.85);
              setAttachedMedia((prev) => (prev.includes(compressed) ? prev : [...prev, compressed]));
            } else {
              setAttachedMedia((prev) => (prev.includes(rawDataUrl) ? prev : [...prev, rawDataUrl]));
            }
            processedCount++;
            if (processedCount === totalFiles) setIsProcessingFile(false);
          };
          img.onerror = () => {
            setAttachedMedia((prev) => (prev.includes(rawDataUrl) ? prev : [...prev, rawDataUrl]));
            processedCount++;
            if (processedCount === totalFiles) setIsProcessingFile(false);
          };
          img.src = rawDataUrl;
        } catch {
          setAttachedMedia((prev) => (prev.includes(rawDataUrl) ? prev : [...prev, rawDataUrl]));
          processedCount++;
          if (processedCount === totalFiles) setIsProcessingFile(false);
        }
      };

      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  // Handle media attachment (from URL or opens device file chooser if empty)
  const handleAddMediaUrl = () => {
    const url = mediaUrlInput.trim();
    if (!url) {
      // If URL box is empty, clicking "+ Add Photo" opens the file chooser!
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
      return;
    }
    if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('data:image/')) {
      setErrorMessage('Please enter a valid image URL (e.g. https://...) or upload from your device.');
      return;
    }
    if (attachedMedia.includes(url)) {
      setErrorMessage('This image has already been attached.');
      return;
    }
    setAttachedMedia([...attachedMedia, url]);
    setMediaUrlInput('');
    setErrorMessage('');
  };

  const handleRemoveMedia = (indexToRemove) => {
    setAttachedMedia(attachedMedia.filter((_, idx) => idx !== indexToRemove));
  };

  // Submit review form (Create or Update)
  const handleSubmitReview = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    if (!formRating || formRating < 1 || formRating > 5) {
      setErrorMessage('Please select a star rating between 1 and 5.');
      return;
    }

    if (!formComment.trim()) {
      setErrorMessage('Please write a short review sharing your experience.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage('');

      if (editingReview) {
        // Update existing review
        await ReviewAPI.updateReview(editingReview.id, {
          rating: formRating,
          title: formTitle.trim(),
          comment: formComment.trim()
        });

        // If new media added
        const existingUrls = (editingReview.media || []).map((m) => m.media_url || m);
        const newUrls = attachedMedia.filter((url) => !existingUrls.includes(url));
        for (const url of newUrls) {
          try {
            await ReviewAPI.uploadMedia(editingReview.id, {
              media_url: url,
              media_type: 'IMAGE'
            });
          } catch (mErr) {
            console.warn('Failed to upload extra media:', mErr.message);
          }
        }

        showToast('✓ Review updated successfully!');
      } else {
        // Create new verified review
        const productIdOrListingId = targetItem.listing_id || targetItem.id;
        const orderId = targetItem.order_id;

        if (!orderId) {
          throw new Error('Associated order ID is required for verified reviews.');
        }

        await ReviewAPI.createReview(productIdOrListingId, {
          order_id: orderId,
          rating: formRating,
          title: formTitle.trim(),
          comment: formComment.trim(),
          media_urls: attachedMedia
        });

        showToast('⭐ Thank you! Your verified review has been submitted.');
      }

      closeModal();
      await refreshData();
      setActiveTab('submitted');
    } catch (err) {
      console.error('Review submission error:', err);
      setErrorMessage(err.message || 'Failed to submit review. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper format date
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return String(dateStr);
    }
  };

  return (
    <section id="sec-reviews" className="pt-2 pb-8 max-w-4xl mx-auto space-y-4">
      {/* 1. Header & Navigation */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack || (() => onNavigate && onNavigate('account'))}
            className="w-9 h-9 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 flex items-center justify-center transition cursor-pointer border border-gray-200"
            title="Back to Account"
          >
            <i className="fa-solid fa-arrow-left text-xs"></i>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-gray-900 tracking-tight">
                Verified Customer Reviews
              </h2>
              <span className="bg-emerald-50 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                <i className="fa-solid fa-circle-check text-[9px] text-emerald-600"></i>
                Verified Purchases
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Rate delivered orders, share feedback, and view store replies.
            </p>
          </div>
        </div>

        {/* Tab Switcher Pills */}
        <div className="flex items-center bg-gray-100 p-1 rounded-xl self-start md:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('pending')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'pending'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <i className="fa-solid fa-clock-rotate-left text-amber-500 text-[11px]"></i>
            <span>Pending Reviews</span>
            {pendingItems.length > 0 && (
              <span className="bg-amber-100 text-amber-900 text-[10px] font-extrabold px-1.5 py-0.2 rounded-full">
                {pendingItems.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('submitted')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'submitted'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <i className="fa-solid fa-star text-amber-400 text-[11px]"></i>
            <span>My Reviews</span>
            {myReviews.length > 0 && (
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-1.5 py-0.2 rounded-full">
                {myReviews.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 2. Loading State */}
      {loading && (
        <div className="bg-white rounded-2xl p-8 border border-gray-100 text-center space-y-2">
          <i className="fa-solid fa-spinner fa-spin text-2xl text-emerald-600"></i>
          <p className="text-xs text-gray-500">Loading your verified reviews...</p>
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. TAB 1: PENDING REVIEWS QUEUE & ORDER PROMPT CARDS          */}
      {/* ============================================================== */}
      {!loading && activeTab === 'pending' && (
        <div className="space-y-3">
          {pendingItems.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 border border-gray-100 text-center space-y-3">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center text-2xl mx-auto">
                <i className="fa-solid fa-circle-check"></i>
              </div>
              <h3 className="font-extrabold text-sm text-gray-900">All Caught Up!</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                You have reviewed all your delivered purchases. Delivered orders awaiting feedback will appear here.
              </p>
              <div className="pt-2 flex justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('submitted')}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  View My Reviews ({myReviews.length})
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate && onNavigate('orders')}
                  className="px-4 py-2 bg-[#18753C] hover:bg-[#156030] text-white text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  View Orders
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center text-sm">
                    <i className="fa-solid fa-comment-dots"></i>
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-amber-950">
                      Delivered Items Awaiting Feedback
                    </h4>
                    <p className="text-[11px] text-amber-800 mt-0.5">
                      Your reviews help other customers and verified neighborhood stores.
                    </p>
                  </div>
                </div>
                <span className="text-xs font-extrabold text-amber-900 bg-amber-200/60 px-2 py-0.5 rounded-full">
                  {pendingItems.length} Pending
                </span>
              </div>

              {/* Pending Items Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {pendingItems.map((item, idx) => {
                  const orderNum = item.order_number || item.order_id?.slice(0, 8);
                  const storeName = item.store_name || 'Neighborhood Store';

                  return (
                    <div
                      key={item.order_item_id || item.listing_id || idx}
                      className="bg-white border border-gray-100 hover:border-gray-200 rounded-2xl p-4 shadow-xs space-y-3 transition flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        {/* Order Prompt Header */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                              Delivered Order
                            </span>
                            <div className="font-bold text-sm text-gray-900 mt-1">
                              {`Rate order #${orderNum}`}
                            </div>
                            <div className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-1.5">
                              <span>{storeName}</span>
                              {item.order_date && (
                                <>
                                  <span>•</span>
                                  <span>{formatDate(item.order_date)}</span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-xs font-bold text-gray-900 font-mono">
                              ₹{parseFloat(item.unit_price || 0).toFixed(2)}
                            </span>
                            <div className="text-[10px] text-gray-400">Qty: {item.quantity || 1}</div>
                          </div>
                        </div>

                        {/* Product Title */}
                        <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100 flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-lg bg-emerald-100/60 text-emerald-800 flex items-center justify-center text-sm font-bold shrink-0">
                            <i className="fa-solid fa-box-open"></i>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h5 className="font-bold text-xs text-gray-900 truncate">
                              {item.product_name || item.listing_title || 'Purchased Item'}
                            </h5>
                            <span className="text-[10px] text-emerald-700 font-medium">
                              Verified Purchase Eligible
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Interactive Star Prompt Directly on Card */}
                      <div className="pt-2 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-1">
                          <span className="text-[11px] text-gray-500 font-medium mr-1">Rate:</span>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => openCreateModal(item, star)}
                              className="text-gray-300 hover:text-amber-400 text-lg transition-colors p-0.5 cursor-pointer"
                              title={`Rate ${star} star${star > 1 ? 's' : ''}`}
                            >
                              <i className="fa-solid fa-star"></i>
                            </button>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={() => openCreateModal(item, 5)}
                          className="px-3.5 py-1.5 rounded-xl bg-[#18753C] hover:bg-[#156030] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs self-stretch sm:self-auto"
                        >
                          <i className="fa-solid fa-pen text-[10px]"></i>
                          <span>Write Review</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* 4. TAB 2: MY SUBMITTED REVIEWS LIST                           */}
      {/* ============================================================== */}
      {!loading && activeTab === 'submitted' && (
        <div className="space-y-3">
          {myReviews.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 border border-gray-100 text-center space-y-3">
              <div className="w-14 h-14 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center text-2xl mx-auto">
                <i className="fa-regular fa-star"></i>
              </div>
              <h3 className="font-extrabold text-sm text-gray-900">No Reviews Submitted Yet</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                You haven't written any reviews yet. Check your pending items to rate your recent deliveries!
              </p>
              {pendingItems.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab('pending')}
                  className="px-4 py-2 bg-[#18753C] hover:bg-[#156030] text-white text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Review Pending Purchases ({pendingItems.length})
                </button>
              )}
            </div>
          ) : (
            myReviews.map((rev) => {
              const rating = rev.rating || 5;
              const hasSellerReply =
                (rev.replies && rev.replies.length > 0) ||
                (rev.seller_reply && String(rev.seller_reply).trim().length > 0);

              return (
                <div
                  key={rev.id}
                  className="bg-white border border-gray-100 rounded-2xl p-4 shadow-xs space-y-3"
                >
                  {/* Top: Product & Date & Edit Action */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 pb-2 border-b border-gray-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-extrabold text-sm text-gray-900">
                          {rev.product_name || 'Product Review'}
                        </h4>
                        <span className="bg-emerald-50 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-100">
                          ✓ Verified Purchase
                        </span>
                      </div>
                      <div className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-2">
                        <span>{rev.store_name || 'Store'}</span>
                        {rev.order_number && (
                          <>
                            <span>•</span>
                            <span className="font-mono">{`Order #${rev.order_number}`}</span>
                          </>
                        )}
                        <span>•</span>
                        <span>{formatDate(rev.created_at)}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => openEditModal(rev)}
                      className="self-start px-3 py-1 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <i className="fa-solid fa-pen-to-square text-[10px]"></i>
                      <span>Edit Review</span>
                    </button>
                  </div>

                  {/* Rating Stars & Title */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center text-amber-400 text-sm">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <i
                            key={star}
                            className={`fa-solid fa-star ${
                              star <= rating ? 'text-amber-400' : 'text-gray-200'
                            }`}
                          ></i>
                        ))}
                      </div>
                      <span className="text-xs font-extrabold text-gray-900">{`${rating}.0 / 5.0`}</span>
                    </div>

                    {rev.title && (
                      <h5 className="font-bold text-xs text-gray-900">{rev.title}</h5>
                    )}
                  </div>

                  {/* Comment Text */}
                  <p className="text-xs text-gray-700 leading-relaxed bg-gray-50/50 p-3 rounded-xl border border-gray-100">
                    {rev.comment || 'No written comment provided.'}
                  </p>

                  {/* Attached Media Gallery */}
                  {rev.media && rev.media.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[11px] font-bold text-gray-600 flex items-center gap-1">
                        <i className="fa-solid fa-camera text-gray-400 text-xs"></i>
                        Attached Photos &amp; Evidence ({rev.media.length})
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {rev.media.map((med, mIdx) => {
                          const url = med.media_url || med;
                          return (
                            <button
                              key={med.id || mIdx}
                              type="button"
                              onClick={() => setLightboxImage(url)}
                              className="w-16 h-16 rounded-xl border border-gray-200 overflow-hidden relative group cursor-pointer hover:opacity-90 transition"
                            >
                              <img
                                src={url}
                                alt="Review evidence"
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                }}
                              />
                              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs transition">
                                <i className="fa-solid fa-magnifying-glass-plus"></i>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Nested Seller / Store Replies */}
                  {hasSellerReply && (
                    <div className="mt-2 bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3 space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-bold text-emerald-950">
                        <div className="flex items-center gap-1.5">
                          <i className="fa-solid fa-reply text-emerald-700 text-xs"></i>
                          <span>
                            {`Store Response from ${
                              rev.replies?.[0]?.store_name || rev.store_name || 'Seller'
                            }`}
                          </span>
                        </div>
                        {rev.replies?.[0]?.created_at && (
                          <span className="text-[10px] text-emerald-700 font-normal">
                            {formatDate(rev.replies[0].created_at)}
                          </span>
                        )}
                        {!rev.replies?.[0]?.created_at && rev.seller_replied_at && (
                          <span className="text-[10px] text-emerald-700 font-normal">
                            {formatDate(rev.seller_replied_at)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-emerald-900 leading-normal pl-4 italic border-l-2 border-emerald-300">
                        {rev.replies?.[0]?.reply_text || rev.seller_reply}
                      </p>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* 5. REVIEW SUBMISSION / EDIT MODAL                              */}
      {/* ============================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-5 shadow-2xl border border-gray-100 space-y-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#18753C] flex items-center justify-center text-sm font-bold">
                  <i className="fa-solid fa-star"></i>
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-gray-900">
                    {editingReview ? 'Edit Your Review' : 'Write a Verified Review'}
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Only verified purchasers can submit reviews
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 flex items-center justify-center transition cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>

            {/* Target Item Summary */}
            {targetItem && (
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex items-center justify-between">
                <div>
                  <div className="font-bold text-xs text-gray-900">
                    {targetItem.product_name || targetItem.listing_title || 'Item'}
                  </div>
                  <div className="text-[11px] text-gray-500">
                    {targetItem.store_name || 'Local Store'}
                    {targetItem.order_number && ` • Order #${targetItem.order_number}`}
                  </div>
                </div>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Verified Purchase
                </span>
              </div>
            )}

            {/* Error Message Alert */}
            {errorMessage && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-xl flex items-center gap-2">
                <i className="fa-solid fa-triangle-exclamation text-red-500"></i>
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Form Fields */}
            <form onSubmit={handleSubmitReview} className="space-y-4">
              {/* Star Rating Selector */}
              <div className="space-y-1.5 text-center bg-amber-50/40 p-4 rounded-xl border border-amber-100">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Overall Rating
                </label>
                <div className="flex justify-center items-center gap-2 pt-1">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const isFilled = (hoverRating || formRating) >= star;
                    return (
                      <button
                        key={star}
                        type="button"
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        onClick={() => setFormRating(star)}
                        className="text-2xl transition-transform hover:scale-110 p-1 cursor-pointer focus:outline-none"
                      >
                        <i
                          className={`fa-solid fa-star ${
                            isFilled ? 'text-amber-400' : 'text-gray-300'
                          }`}
                        ></i>
                      </button>
                    );
                  })}
                </div>
                <div className="text-xs font-semibold text-amber-900 mt-1">
                  {ratingLabels[hoverRating || formRating] || 'Select rating'}
                </div>
              </div>

              {/* Title / Headline */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-700">
                  Headline / Summary
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Fresh quality and arrived quickly!"
                  maxLength={100}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs outline-none focus:border-brand-green bg-white transition"
                />
              </div>

              {/* Comment / Review Text */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-bold text-gray-700">
                    Detailed Review <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[10px] text-gray-400">
                    {formComment.length} / 500
                  </span>
                </div>
                <textarea
                  rows={4}
                  value={formComment}
                  onChange={(e) => setFormComment(e.target.value)}
                  placeholder="What did you like or dislike? Was the item fresh and well-packaged?"
                  maxLength={500}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs outline-none focus:border-brand-green bg-white transition resize-none"
                />
              </div>

              {/* Photo Evidence & Media Attachments */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-700">
                  Add Photos &amp; Unboxing Evidence (Optional)
                </label>

                {/* Hidden native file input for device/camera photo upload */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                  id="review-photo-file-input"
                />

                <div className="flex flex-col sm:flex-row gap-2">
                  {/* Dedicated device photo picker button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isProcessingFile}
                    className="flex items-center justify-center gap-2 px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-[#18753C] border border-emerald-300 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 shadow-xs"
                    title="Upload image from computer, phone gallery, or camera"
                    id="btn-upload-device-photo"
                  >
                    {isProcessingFile ? (
                      <>
                        <i className="fa-solid fa-spinner fa-spin text-xs"></i>
                        <span>Loading photo...</span>
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-camera text-xs"></i>
                        <span>Upload Photo from Device</span>
                      </>
                    )}
                  </button>

                  {/* URL input field + Add Photo button */}
                  <div className="flex-1 flex gap-1.5">
                    <input
                      type="text"
                      value={mediaUrlInput}
                      onChange={(e) => setMediaUrlInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddMediaUrl();
                        }
                      }}
                      placeholder="Or enter image URL (https://...)"
                      className="flex-1 px-3.5 py-2 rounded-xl border border-gray-200 text-xs outline-none focus:border-brand-green bg-white transition"
                    />
                    <button
                      type="button"
                      onClick={handleAddMediaUrl}
                      className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-xl transition cursor-pointer shrink-0"
                      title={mediaUrlInput.trim() ? "Attach image URL" : "Browse photo from device"}
                    >
                      + Add Photo
                    </button>
                  </div>
                </div>

                {/* Quick Sample Links */}
                <div className="flex items-center gap-1.5 flex-wrap text-[10px] text-gray-500">
                  <span>Quick demo photos:</span>
                  <button
                    type="button"
                    onClick={() => {
                      const sample = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500';
                      if (!attachedMedia.includes(sample)) setAttachedMedia([...attachedMedia, sample]);
                    }}
                    className="underline text-emerald-700 hover:text-emerald-900 cursor-pointer"
                  >
                    Fresh Produce
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() => {
                      const sample = 'https://images.unsplash.com/photo-1588964895597-cfccd6e2dbf9?w=500';
                      if (!attachedMedia.includes(sample)) setAttachedMedia([...attachedMedia, sample]);
                    }}
                    className="underline text-emerald-700 hover:text-emerald-900 cursor-pointer"
                  >
                    Grocery Box
                  </button>
                </div>

                {/* Pre-submission Photo Previews */}
                {attachedMedia.length > 0 && (
                  <div className="pt-2">
                    <span className="text-[11px] font-bold text-gray-600 block mb-1.5">
                      Attached Photos ({attachedMedia.length}):
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {attachedMedia.map((url, idx) => (
                        <div
                          key={idx}
                          className="w-16 h-16 rounded-xl border border-gray-200 overflow-hidden relative group"
                        >
                          <img
                            src={url}
                            alt="Preview"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveMedia(idx)}
                            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center text-[10px] shadow-sm hover:bg-red-700 cursor-pointer"
                            title="Remove photo"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2 border-t border-gray-100">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-[#18753C] hover:bg-[#156030] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin text-xs"></i>
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-check text-xs"></i>
                      <span>{editingReview ? 'Save Changes' : 'Submit Verified Review'}</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-bold text-xs hover:bg-gray-50 transition cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 6. LIGHTBOX MEDIA VIEWER                                       */}
      {/* ============================================================== */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm cursor-zoom-out animate-in fade-in"
        >
          <div className="relative max-w-2xl max-h-[85vh] bg-black rounded-2xl overflow-hidden border border-white/20 shadow-2xl">
            <button
              type="button"
              onClick={() => setLightboxImage(null)}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center text-sm hover:bg-black/80 transition cursor-pointer z-10"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
            <img
              src={lightboxImage}
              alt="Full size review evidence"
              className="w-full h-auto max-h-[80vh] object-contain"
            />
          </div>
        </div>
      )}
    </section>
  );
}
