import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSeller } from '../context/SellerContext';
import { useListings } from '../hooks/useListings';
import { useTranslation } from '../context/LanguageContext';
import listingService from '../services/listingService';
import { sellerApi } from '../api/sellerApi';
import CategoryCascader from '../components/catalog/CategoryCascader';
import PackedItemSelector from '../components/catalog/PackedItemSelector';
import BarcodeScannerInput from '../components/catalog/BarcodeScannerInput';
import DynamicAttributeForm from '../components/catalog/DynamicAttributeForm';
import VariantMatrixBuilder from '../components/catalog/VariantMatrixBuilder';

const FMCG_MASTER_CATALOG = [
  { 
    id: 'tata-salt-1kg', 
    name: 'Tata Salt Vacuum Evaporated Iodised 1kg', 
    brand: 'Tata', 
    barcode: '8901030383749', 
    mrp: 28, 
    sell_price: 25, 
    unit: 'pack', 
    category_id: 44,
    attributes: {
      dietary_type: 'Veg',
      country_of_origin: 'India',
      shelf_life_days: '720',
      storage_temperature: 'Store in a cool & dry place',
      packaging_type: 'Pouch / Packet'
    }
  },
  { 
    id: 'amul-butter-500g', 
    name: 'Amul Pasteurised Butter 500g', 
    brand: 'Amul', 
    barcode: '8901262010054', 
    mrp: 275, 
    sell_price: 265, 
    unit: 'pack', 
    category_id: 23,
    attributes: {
      dietary_type: 'Veg',
      country_of_origin: 'India',
      shelf_life_days: '180',
      storage_temperature: 'Refrigerated (2°C - 8°C)',
      packaging_type: 'Box / Carton'
    }
  },
  { 
    id: 'maggi-noodles-140g', 
    name: 'Maggi 2-Minute Masala Noodles 140g', 
    brand: 'Nestle', 
    barcode: '8901058852332', 
    mrp: 30, 
    sell_price: 28, 
    unit: 'pack', 
    category_id: 54,
    attributes: {
      dietary_type: 'Veg',
      country_of_origin: 'India',
      shelf_life_days: '270',
      storage_temperature: 'Store in a cool & dry place',
      packaging_type: 'Pouch / Packet'
    }
  },
  { 
    id: 'fortune-sunflower-1l', 
    name: 'Fortune Sunlite Refined Sunflower Oil 1L Pouch', 
    brand: 'Fortune', 
    barcode: '8906007280014', 
    mrp: 165, 
    sell_price: 145, 
    unit: 'pouch', 
    category_id: 88,
    attributes: {
      dietary_type: 'Veg',
      country_of_origin: 'India',
      shelf_life_days: '270',
      storage_temperature: 'Store in a cool & dry place',
      packaging_type: 'Pouch / Packet'
    }
  },
  { 
    id: 'parle-g-800g', 
    name: 'Parle-G Gold Glucose Biscuits 800g', 
    brand: 'Parle', 
    barcode: '8901719101234', 
    mrp: 95, 
    sell_price: 85, 
    unit: 'pack', 
    category_id: 46,
    attributes: {
      dietary_type: 'Veg',
      country_of_origin: 'India',
      shelf_life_days: '180',
      storage_temperature: 'Store in a cool & dry place',
      packaging_type: 'Pouch / Packet'
    }
  },
  { 
    id: 'coca-cola-750ml', 
    name: 'Coca-Cola Soft Drink PET Bottle 750ml', 
    brand: 'Coca-Cola', 
    barcode: '8901764012224', 
    mrp: 45, 
    sell_price: 40, 
    unit: 'bottle', 
    category_id: 63,
    attributes: {
      dietary_type: 'Veg',
      country_of_origin: 'India',
      shelf_life_days: '120',
      storage_temperature: 'Ambient / Room Temperature',
      packaging_type: 'Bottle / Jar'
    }
  },
  { 
    id: 'colgate-maxfresh-150g', 
    name: 'Colgate MaxFresh Spicy Fresh Toothpaste 150g', 
    brand: 'Colgate', 
    barcode: '8901314010202', 
    mrp: 120, 
    sell_price: 105, 
    unit: 'pack', 
    category_id: 69,
    attributes: {
      dietary_type: 'Veg',
      country_of_origin: 'India',
      shelf_life_days: '720',
      storage_temperature: 'Ambient / Room Temperature',
      packaging_type: 'Box / Carton'
    }
  },
  { 
    id: 'surf-excel-easywash-1kg', 
    name: 'Surf Excel Easy Wash Detergent Powder 1kg', 
    brand: 'Surf Excel', 
    barcode: '8901030012345', 
    mrp: 145, 
    sell_price: 130, 
    unit: 'pack', 
    category_id: 71,
    attributes: {
      dietary_type: 'Veg',
      country_of_origin: 'India',
      shelf_life_days: '720',
      storage_temperature: 'Store in a cool & dry place',
      packaging_type: 'Pouch / Packet'
    }
  }
];

const Products = () => {
  const { t } = useTranslation();
  const { 
    listings, 
    setListings,
    loading, 
    filters: { searchQuery, setSearchQuery, stockFilter, setStockFilter, typeFilter, setTypeFilter, buyerFilter, setBuyerFilter, categoryFilter, setCategoryFilter },
    pagination: { currentPage, setCurrentPage, itemsPerPage, setItemsPerPage, totalItems },
    globalStats,
    createListing,
    updateListing,
    deleteListing,
    batchDeleteListings,
    submitListing,
    publishListing,
    bulkUpload,
    checkUploadStatus,
    bulkExport,
    checkExportStatus,
    uploadImage,
    refresh
  } = useListings();

  const [showModal, setShowModal] = useState(false);
  const [editingListing, setEditingListing] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [batchDeleteConfirm, setBatchDeleteConfirm] = useState(false);
  const [isDeletingBatch, setIsDeletingBatch] = useState(false);
  const [updatingStockId, setUpdatingStockId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savingAction, setSavingAction] = useState(null);
  const [showTieredStudio, setShowTieredStudio] = useState(false);
  const [publishingId, setPublishingId] = useState(null);

  const handlePublishListing = async (listing) => {
    if (!listing || !listing.id) return;
    try {
      setPublishingId(listing.id);
      await publishListing(listing.id);
      setSuccessBanner(`"${listing.title}" is now APPROVED and live on your store catalog!`);
      if (typeof refresh === 'function') await refresh();
    } catch (err) {
      console.error('Failed to publish listing:', err);
      const errMsg = err.response?.data?.error || err.message || 'Failed to publish listing';
      alert(`Error publishing product: ${errMsg}`);
    } finally {
      setPublishingId(null);
    }
  };

  const handleAddTierSlab = () => {
    setFormData(prev => ({
      ...prev,
      tiered_pricing: [
        ...(Array.isArray(prev.tiered_pricing) ? prev.tiered_pricing : []),
        {
          id: 'tier-' + Date.now(),
          buyer_type: 'CUSTOMER',
          min_qty: prev.product_type === 'LOOSE_WEIGHT' ? 5 : 10,
          price: ''
        }
      ]
    }));
  };

  const handleUpdateTierSlab = (index, field, value) => {
    setFormData(prev => {
      const updated = [...(prev.tiered_pricing || [])];
      if (updated[index]) {
        updated[index] = { ...updated[index], [field]: value };
      }
      return { ...prev, tiered_pricing: updated };
    });
  };

  const handleRemoveTierSlab = (index) => {
    setFormData(prev => ({
      ...prev,
      tiered_pricing: (prev.tiered_pricing || []).filter((_, i) => i !== index)
    }));
  };
  const [listingIssues, setListingIssues] = useState({});
  const [categories, setCategories] = useState([]);
  const [categoryTree, setCategoryTree] = useState([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [csvCategorySearch, setCsvCategorySearch] = useState('');

  // Flatten leaf categories for CSV Guide & Quick Reference
  const flattenedLeafCategories = useMemo(() => {
    const list = [];
    function traverse(nodes, path = []) {
      if (!Array.isArray(nodes)) return;
      nodes.forEach(node => {
        if (!node) return;
        const currentPath = [...path, node.name || ''];
        if (node.is_leaf || !node.children || node.children.length === 0) {
          list.push({
            id: node.id,
            name: node.name,
            breadcrumb: currentPath.join(' › ')
          });
        }
        if (Array.isArray(node.children) && node.children.length > 0) {
          traverse(node.children, currentPath);
        }
      });
    }
    if (Array.isArray(categoryTree)) {
      traverse(categoryTree);
    }
    return list;
  }, [categoryTree]);

  const filteredLeafCategories = useMemo(() => {
    if (!csvCategorySearch.trim()) return flattenedLeafCategories;
    const q = csvCategorySearch.toLowerCase();
    return flattenedLeafCategories.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.breadcrumb.toLowerCase().includes(q) ||
      String(c.id).includes(q)
    );
  }, [csvCategorySearch, flattenedLeafCategories]);
  const fileInputRef = useRef(null);
  const { uploadJobs, setUploadJobs } = useSeller();
  const location = useLocation();
  const navigate = useNavigate();
  const [successBanner, setSuccessBanner] = useState(location.state?.message || '');

  useEffect(() => {
    if (location.state?.message) {
      setSuccessBanner(location.state.message);
      if (typeof refresh === 'function') refresh();
      const timer = setTimeout(() => setSuccessBanner(''), 7000);
      return () => clearTimeout(timer);
    }
  }, [location.state, refresh]);

  useEffect(() => {
    const fetchCats = async () => {
      try {
        const [res, treeRes] = await Promise.all([
          listingService.getCategories(),
          listingService.getCategoryTree()
        ]);
        if (treeRes?.data) setCategoryTree(treeRes.data);
        const list = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
        setCategories(list);
      } catch (err) {
        console.error('Failed to load categories', err);
      }
    };
    fetchCats();
  }, []);
  
  useEffect(() => {
    // Fetch issues for currently visible listings concurrently
    let isMounted = true;
    const fetchIssues = async () => {
      const missingListings = listings.filter(l => l && l.id && !listingIssues[l.id]);
      if (missingListings.length === 0) return;

      try {
        const results = await Promise.allSettled(
          missingListings.map(async (l) => {
            try {
              const res = await listingService.getListingIssues(l.id);
              if (res && res.success) {
                return { id: l.id, data: res.data };
              }
            } catch (_) {}
            return null;
          })
        );

        if (!isMounted) return;

        setListingIssues(prev => {
          const next = { ...prev };
          let changed = false;
          for (const item of results) {
            if (item.status === 'fulfilled' && item.value) {
              next[item.value.id] = item.value.data;
              changed = true;
            }
          }
          return changed ? next : prev;
        });
      } catch (_) {}
    };

    if (listings.length > 0) fetchIssues();

    return () => {
      isMounted = false;
    };
  }, [listings]);

  // The polling for active background jobs is now handled globally in GlobalBulkUploadWidget.jsx
  // We still use checkUploadStatus and refresh from useListings in the global widget via a side-effect or directly.
  
  const handleDownloadTemplate = () => {
    const csvHeaders = 'title,product_type,category_id,brand_tag,barcode,sku,unit,mrp,sell_price,stock_qty,min_order_qty,allowed_buyers\n';
    const sampleRows = [
      'Tata Salt Vacuum Evaporated Iodised 1kg,PACKED_ITEM,3,Tata,8901030383749,,pack,28,25,100,1,ALL',
      'Amul Pasteurised Butter 500g,PACKED_ITEM,2,Amul,8901262010054,,pack,275,265,50,1,ALL',
      'Balaji Pure Silk Kurti (Navy Blue),OWN_BRAND,8,Balaji,,BS-KURTI-NV-XL,pcs,1299,899,40,1,ALL',
      'Fresh Farm Tomatoes,LOOSE_WEIGHT,1,,,,,kg,40,32,150,0.5,ALL'
    ].join('\n');

    const csvContent = csvHeaders + sampleRows;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'adab_products_bulk_template.csv');
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleBulkUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (uploadJobs.some(j => j.state === 'active')) {
      alert('Please wait for the current file to finish processing before uploading another one.');
      e.target.value = null;
      return;
    }

    try {
      // 1. Client-Side Pre-validation: Read file content
      const fileText = await new Promise((resolve, reject) => {
        if (file.text) {
          file.text().then(resolve).catch(reject);
        } else {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsText(file);
        }
      });

      const lines = fileText.split(/\r?\n/).filter(line => line.trim() !== '');

      if (lines.length <= 1) {
        alert('Validation Failed: The selected CSV file is empty or only contains headers. Please add your product rows before uploading.');
        e.target.value = null;
        return;
      }

      // Check header row for required fields
      const headerLine = lines[0];
      const headers = headerLine.split(',').map(h => h.trim().replace(/^["']|["']$/g, '').toLowerCase());

      const hasTitle = headers.includes('title');
      const hasPrice = headers.includes('sell_price') || headers.includes('price');

      if (!hasTitle || !hasPrice) {
        alert(
          'Invalid CSV Format!\n\n' +
          'Your file is missing required columns:\n' +
          (!hasTitle ? '  ❌ Missing "title" column\n' : '') +
          (!hasPrice ? '  ❌ Missing "sell_price" column\n' : '') +
          '\nPlease click "CSV Template" to download the official format with all expected columns.'
        );
        e.target.value = null;
        return;
      }

      // 2. Check if dummy template items are still present in the file
      const lowerText = fileText.toLowerCase();
      const dummyProducts = [
        'tata salt vacuum evaporated',
        'amul pasteurised butter',
        'balaji pure silk kurti',
        'fresh farm tomatoes'
      ];
      const foundDummies = dummyProducts.filter(name => lowerText.includes(name));

      if (foundDummies.length > 0) {
        const proceed = window.confirm(
          `⚠️ Sample Template Products Detected!\n\n` +
          `Your file appears to still contain ${foundDummies.length} dummy sample product(s) from our template.\n\n` +
          `Please make sure to delete or replace the sample rows with your real inventory products.\n\n` +
          `Do you want to continue uploading anyway?`
        );
        if (!proceed) {
          e.target.value = null;
          return;
        }
      }

      // 3. Dispatch upload
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await bulkUpload(formData);
      
      if (response.jobId) {
        // BullMQ Background Job
        setUploadJobs(prev => [...prev, { id: response.jobId, filename: file.name, state: 'active', progress: 0 }]);
      } else if (response.result) {
        // Fallback synchronous direct result
        setUploadJobs(prev => [...prev, { id: Date.now(), filename: file.name, state: 'completed', progress: 100, result: response.result }]);
        refresh();
      }
      
      e.target.value = null; // reset
    } catch (err) {
      alert('Upload failed: ' + (err.response?.data?.error || err.message));
      if (e.target) e.target.value = null;
    }
  };

  const handleExportCSV = async () => {
    try {
      // Direct stream download, bypass widget
      const response = await bulkExport();
      
      const url = window.URL.createObjectURL(new Blob([response]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'listings_export.csv');
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Export failed: ' + (err.response?.data?.error || err.message));
    }
  };

  const initialFormState = {
    title: '',
    sku: '',
    barcode: '',
    brand_tag: '',
    category_id: '',
    mrp: '',
    sell_price: '',
    wholesale_price: '',
    sample_available: true,
    product_type: 'OWN_BRAND',
    unit: 'pcs',
    min_order_qty: 1,
    allowed_buyers: 'ALL',
    image_url: '',
    approval_status: 'DRAFT',
    is_active: true,
    stock_qty: 0,
    is_refundable: true,
    refund_percentage: 100,
    return_window_days: 7,
    attributes: {},
    has_variants: false,
    variants: [],
    master_catalog_id: null,
    manufacturer_product_id: null,
    tiered_pricing: []
  };

  const [formData, setFormData] = useState(initialFormState);

  const openAddModal = () => {
    setEditingListing(null);
    setFormData(initialFormState);
    setShowModal(true);
  };

  const handleQuickToggleB2B = async (listingId) => {
    const target = listings.find((x) => x.id === listingId);
    if (target?.original_listing_id) {
      alert('This is a resold product sourced from another store and can only be sold directly to retail consumers.');
      return;
    }

    const currentAllowed = target?.allowed_buyers || 'ALL';
    const nextAllowed = currentAllowed === 'ALL' || currentAllowed === 'STORES_ONLY' ? 'CUSTOMERS_ONLY' : 'ALL';

    // Optimistic UI update
    setListings((prev) =>
      prev.map((l) => (l.id === listingId ? { ...l, allowed_buyers: nextAllowed } : l))
    );

    try {
      const res = await sellerApi.toggleListingB2B(listingId);
      const updatedListing = res?.data || res;
      if (updatedListing?.allowed_buyers) {
        setListings((prev) =>
          prev.map((l) => (l.id === listingId ? { ...l, allowed_buyers: updatedListing.allowed_buyers } : l))
        );
      }
      refresh();
    } catch (err) {
      console.error('Failed to toggle B2B status', err);
      alert('Failed to update B2B availability: ' + (err.response?.data?.error || err.message));
      refresh();
    }
  };

  const handleQuickToggleActive = async (listingId) => {
    const target = listings.find((x) => x.id === listingId);
    if (!target) return;

    if (target.approval_status === 'DRAFT' || target.approval_status === 'SUBMITTED' || target.approval_status === 'UNDER_REVIEW') {
      alert(`This product is currently in "${target.approval_status}" status. Only approved products can be toggled active on your store.`);
      return;
    }

    const currentActive = target.is_active !== false;
    const nextActive = !currentActive;

    // Optimistic UI update
    setListings((prev) =>
      prev.map((l) => (l.id === listingId ? { 
        ...l, 
        is_active: nextActive,
        approval_status: 'APPROVED'
      } : l))
    );

    try {
      await updateListing(listingId, { 
        is_active: nextActive,
        approval_status: 'APPROVED'
      });
      if (typeof refresh === 'function') refresh();
    } catch (err) {
      console.error('Failed to toggle active status', err);
      alert('Failed to update product active status: ' + (err.response?.data?.error || err.message));
      if (typeof refresh === 'function') refresh();
    }
  };


  const handleQuickStock = async (listingId, delta) => {
    const target = listings.find((x) => x.id === listingId);
    if (!target) return;
    const currentStock = parseFloat(target.stock_qty || 0);
    const nextStock = Math.max(0, currentStock + delta);

    setUpdatingStockId(listingId);

    // Optimistic UI update
    setListings((prev) =>
      prev.map((l) => (l.id === listingId ? { ...l, stock_qty: nextStock } : l))
    );

    try {
      await updateListing(listingId, { stock_qty: nextStock });
      refresh();
    } catch (err) {
      console.error('Failed to update stock', err);
      // Rollback on failure
      setListings((prev) =>
        prev.map((l) => (l.id === listingId ? { ...l, stock_qty: currentStock } : l))
      );
      alert('Failed to update stock: ' + (err.response?.data?.error || err.message));
    } finally {
      setUpdatingStockId(null);
    }
  };

  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const handleFormChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCatalogProductSelect = (item) => {
    setFormData(prev => ({
      ...prev,
      title: item.title,
      brand_tag: item.brand_tag,
      mrp: item.mrp,
      sell_price: item.sell_price || item.mrp,
      unit: item.unit || prev.unit,
      barcode: item.barcode || prev.barcode,
      image_url: item.image_url || prev.image_url,
      category_id: item.category_id || prev.category_id,
      attributes: { ...(typeof prev.attributes === 'object' && prev.attributes !== null && !Array.isArray(prev.attributes) ? prev.attributes : {}), ...(item.attributes || {}) },
      master_catalog_id: item.master_catalog_id || null,
      manufacturer_product_id: item.manufacturer_product_id || null,
      product_type: 'PACKED_ITEM'
    }));
  };

  const handleCatalogSelect = (e) => {
    const selectedId = e.target.value;
    if (!selectedId) return;
    const item = FMCG_MASTER_CATALOG.find(i => i.id === selectedId);
    if (item) {
      setFormData(prev => ({
        ...prev,
        title: item.name,
        brand_tag: item.brand,
        barcode: item.barcode,
        mrp: item.mrp,
        sell_price: item.sell_price,
        unit: item.unit,
        category_id: item.category_id || prev.category_id,
        attributes: {
          ...(typeof prev.attributes === 'object' && prev.attributes !== null && !Array.isArray(prev.attributes) ? prev.attributes : {}),
          ...(item.attributes || {})
        }
      }));
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploadingImage(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const response = await uploadImage(fd);
      if (response.url) {
        setFormData({ ...formData, image_url: response.url });
      }
    } catch (err) {
      alert('Failed to upload image: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsUploadingImage(false);
    }
  };

  const openEdit = (listing) => {
    let parsedAttrs = {};
    if (typeof listing.attributes === 'string') {
      try {
        parsedAttrs = JSON.parse(listing.attributes);
      } catch (e) {
        parsedAttrs = {};
      }
    } else if (typeof listing.attributes === 'object' && listing.attributes !== null && !Array.isArray(listing.attributes)) {
      parsedAttrs = { ...listing.attributes };
    }

    let parsedTiers = [];
    if (typeof listing.tiered_pricing === 'string') {
      try {
        parsedTiers = JSON.parse(listing.tiered_pricing);
      } catch (e) {
        parsedTiers = [];
      }
    } else if (Array.isArray(listing.tiered_pricing)) {
      parsedTiers = [...listing.tiered_pricing];
    }

    setEditingListing(listing);
    setFormData({
      title: listing.title || '',
      sku: listing.sku || '',
      barcode: listing.barcode || '',
      brand_tag: listing.brand_tag || '',
      category_id: listing.category_id || '',
      mrp: listing.mrp,
      sell_price: listing.sell_price,
      wholesale_price: listing.wholesale_price || '',
      sample_available: listing.sample_available !== false,
      product_type: listing.product_type || 'OWN_BRAND',
      allowed_buyers: listing.allowed_buyers || 'ALL',
      image_url: listing.image_url || '',
      stock_qty: listing.stock_qty || 0,
      min_order_qty: listing.min_order_qty || 1,
      unit: listing.unit || (listing.product_type === 'LOOSE_WEIGHT' ? 'kg' : listing.product_type === 'PACKED_ITEM' ? 'pack' : 'pcs'),
      approval_status: listing.approval_status || 'DRAFT',
      is_active: listing.is_active !== undefined ? listing.is_active : true,
      is_refundable: listing.is_refundable !== false,
      refund_percentage: listing.refund_percentage !== undefined && listing.refund_percentage !== null ? listing.refund_percentage : 100,
      return_window_days: listing.return_window_days !== undefined && listing.return_window_days !== null ? listing.return_window_days : 7,
      attributes: parsedAttrs,
      has_variants: Boolean(listing.has_variants),
      variants: listing.variants || [],
      master_catalog_id: listing.master_catalog_id || null,
      manufacturer_product_id: listing.manufacturer_product_id || null,
      tiered_pricing: parsedTiers
    });
    setShowModal(true);
  };

  const handleProductTypeChange = (newType) => {
    setFormData(prev => {
      const updated = { 
        ...prev, 
        product_type: newType,
        master_catalog_id: newType === 'PACKED_ITEM' ? prev.master_catalog_id : null,
        manufacturer_product_id: newType === 'PACKED_ITEM' ? prev.manufacturer_product_id : null
      };
      if (newType === 'LOOSE_WEIGHT') {
        // Loose products do not have brand tag, barcode, or SKU
        updated.brand_tag = '';
        updated.barcode = '';
        updated.sku = '';
        updated.unit = ['kg', 'g', 'litre'].includes(prev.unit) ? prev.unit : 'kg';
      } else if (newType === 'PACKED_ITEM') {
        // Packed products identify by barcode & brand, SKU is not used, no wholesale/tiered
        updated.sku = '';
        updated.wholesale_price = '';
        updated.tiered_pricing = [];
        updated.unit = ['pack', 'pcs', 'bottle', 'box', 'can', 'pouch'].includes(prev.unit) ? prev.unit : 'pack';
      } else if (newType === 'OWN_BRAND') {
        // Own brand uses style SKU & brand, barcode is not used
        updated.barcode = '';
        updated.unit = ['pcs', 'pair', 'set', 'meter'].includes(prev.unit) ? prev.unit : 'pcs';
      }
      return updated;
    });
  };

  const saveListing = async (e, submitForReview = false) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (isSaving) return; // Immediate double-click guard

    setIsSaving(true);
    setSavingAction(submitForReview ? 'submit' : 'draft');

    try {
      const defaultUnit = formData.product_type === 'LOOSE_WEIGHT' ? 'kg' : formData.product_type === 'PACKED_ITEM' ? 'pack' : 'pcs';
      
      const sellPriceValue = parseFloat(formData.sell_price);
      if (isNaN(sellPriceValue) || sellPriceValue <= 0) {
        alert('Please enter a valid Selling Price greater than 0.');
        setIsSaving(false);
        setSavingAction(null);
        return;
      }

      const mrpValue = parseFloat(formData.mrp);
      const effectiveMrp = (!isNaN(mrpValue) && mrpValue > 0) ? mrpValue : sellPriceValue;

      // UUID check helper
      const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      const validMasterId = (formData.master_catalog_id && UUID_REGEX.test(formData.master_catalog_id)) 
        ? formData.master_catalog_id 
        : null;

      const dataToSave = { 
        ...formData, 
        unit: formData.unit || defaultUnit,
        category_id: formData.category_id ? parseInt(formData.category_id, 10) : null,
        mrp: effectiveMrp, 
        sell_price: sellPriceValue,
        stock_qty: formData.has_variants && Array.isArray(formData.variants) && formData.variants.length > 0
          ? formData.variants.reduce((acc, v) => acc + (parseFloat(v.stock_qty) || 0), 0)
          : Math.max(0, parseFloat(formData.stock_qty || 0)),
        min_order_qty: parseFloat(formData.min_order_qty) > 0 ? parseFloat(formData.min_order_qty) : 1,
        attributes: (formData.attributes && typeof formData.attributes === 'object' && !Array.isArray(formData.attributes)) ? formData.attributes : {},
        has_variants: Boolean(formData.has_variants),
        variants: formData.variants || [],
        master_catalog_id: validMasterId,
        manufacturer_product_id: formData.manufacturer_product_id ? String(formData.manufacturer_product_id) : null,
        wholesale_price: (formData.product_type !== 'PACKED_ITEM' && formData.wholesale_price && parseFloat(formData.wholesale_price) > 0)
          ? parseFloat(formData.wholesale_price)
          : null,
        tiered_pricing: (formData.product_type !== 'PACKED_ITEM' && Array.isArray(formData.tiered_pricing))
          ? formData.tiered_pricing.filter(t => parseFloat(t.min_qty) > 0 && parseFloat(t.price) > 0)
          : [],
        sample_available: formData.sample_available !== false,
        is_refundable: formData.is_refundable !== false,
        refund_percentage: formData.refund_percentage !== '' && formData.refund_percentage !== undefined ? parseFloat(formData.refund_percentage) : 100,
        return_window_days: formData.return_window_days !== '' && formData.return_window_days !== undefined ? parseInt(formData.return_window_days, 10) : 7
      };
      
      // Category & Leaf Guard Validation
      if (!formData.category_id) {
        alert('Please select a complete Category down to the 3rd level (Leaf Category) before saving.');
        setIsSaving(false);
        setSavingAction(null);
        return;
      }

      // Ensure the selected category is actually a leaf node (not an intermediate department/subcategory)
      const findCategoryNode = (nodes, id) => {
        if (!Array.isArray(nodes)) return null;
        for (const n of nodes) {
          if (String(n.id) === String(id)) return n;
          if (Array.isArray(n.children) && n.children.length > 0) {
            const found = findCategoryNode(n.children, id);
            if (found) return found;
          }
        }
        return null;
      };
      const selectedNode = findCategoryNode(categoryTree, formData.category_id);
      if (selectedNode && Array.isArray(selectedNode.children) && selectedNode.children.length > 0) {
        alert(`"${selectedNode.name}" is a parent category. Please select a specific leaf item under it.`);
        setIsSaving(false);
        setSavingAction(null);
        return;
      }

      // Mandatory FSSAI Validation if entered
      if (formData.attributes?.fssai_license_number) {
        const fssai = String(formData.attributes.fssai_license_number).trim();
        if (fssai && !/^[0-9]{14}$/.test(fssai)) {
          alert('FSSAI License Number must be a valid 14-digit numeric registration number.');
          setIsSaving(false);
          setSavingAction(null);
          return;
        }
      }

      // Legal MRP Ceiling Validation
      if (dataToSave.sell_price > dataToSave.mrp) {
        alert(`Sell price (₹${dataToSave.sell_price}) cannot be greater than Printed MRP (₹${dataToSave.mrp}).`);
        setIsSaving(false);
        setSavingAction(null);
        return;
      }

      if (dataToSave.has_variants && Array.isArray(dataToSave.variants)) {
        for (const v of dataToSave.variants) {
          const varMrp = v.mrp > 0 ? v.mrp : dataToSave.mrp;
          if (v.sell_price > varMrp) {
            alert(`Variant "${v.sku}" sell price (₹${v.sell_price}) cannot be greater than Printed MRP (₹${varMrp}).`);
            setIsSaving(false);
            setSavingAction(null);
            return;
          }
        }
      }

      // Strict field sanitization per product type
      if (dataToSave.product_type === 'PACKED_ITEM') {
        dataToSave.sku = null;
        dataToSave.brand_tag = dataToSave.brand_tag ? dataToSave.brand_tag.trim() : null;
        dataToSave.barcode = dataToSave.barcode ? dataToSave.barcode.trim() : null;
        dataToSave.wholesale_price = null;
        dataToSave.tiered_pricing = [];
      } else if (dataToSave.product_type === 'LOOSE_WEIGHT') {
        dataToSave.brand_tag = null;
        dataToSave.sku = null;
        dataToSave.barcode = null;
        dataToSave.master_catalog_id = null;
        dataToSave.manufacturer_product_id = null;
      } else if (dataToSave.product_type === 'OWN_BRAND') {
        dataToSave.barcode = null;
        dataToSave.brand_tag = dataToSave.brand_tag ? dataToSave.brand_tag.trim() : null;
        dataToSave.sku = dataToSave.sku ? dataToSave.sku.trim() : null;
        dataToSave.master_catalog_id = null;
        dataToSave.manufacturer_product_id = null;
      }

      if (!dataToSave.image_url) dataToSave.image_url = null;
      if (dataToSave.min_order_qty === '' || dataToSave.min_order_qty === undefined) dataToSave.min_order_qty = 1;
      
      let savedListing;
      if (editingListing) {
        if (editingListing.approval_status === 'APPROVED') {
          dataToSave.approval_status = 'SUBMITTED';
        } else if (editingListing.approval_status === 'REJECTED') {
          if (!submitForReview) {
            dataToSave.approval_status = 'DRAFT';
            dataToSave.rejection_reason = null;
          }
        }
        savedListing = await updateListing(editingListing.id, dataToSave);
      } else {
        savedListing = await createListing(dataToSave);
      }
      
      if (submitForReview && savedListing?.id && editingListing?.approval_status !== 'APPROVED') {
        await submitListing(savedListing.id);
      }
      
      setShowModal(false);
      refresh();
    } catch (err) {
      console.error('Failed to save listing', err);
      let rawErr = err.response?.data?.error || err.response?.data?.message;
      if (!rawErr) {
        if (typeof err.response?.data === 'string' && err.response.data.trim()) {
          rawErr = err.response.data;
        } else if (typeof err.response?.data === 'object' && err.response?.data !== null) {
          rawErr = JSON.stringify(err.response.data);
        } else {
          rawErr = err.message || 'An error occurred while saving.';
        }
      }
      if (typeof rawErr === 'string' && rawErr.trim().startsWith('[')) {
        try {
          const parsed = JSON.parse(rawErr);
          if (Array.isArray(parsed)) {
            rawErr = parsed.map(p => `${p.path?.join('.') || 'Field'}: ${p.message}`).join(', ');
          }
        } catch (e) {}
      }
      alert('Failed to save: ' + rawErr);
    } finally {
      setIsSaving(false);
      setSavingAction(null);
    }
  };

  const handleDeleteListing = async () => {
    if (deleteConfirm) {
      try {
        await deleteListing(deleteConfirm);
        setDeleteConfirm(null);
        refresh();
      } catch (err) {
        console.error('Failed to delete listing', err);
        alert('Failed to delete: ' + (err.response?.data?.error || err.message));
        setDeleteConfirm(null);
      }
    }
  };

  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const paginatedListings = listings || [];

  const allCurrentPageSelected = paginatedListings.length > 0 && paginatedListings.every(l => selectedIds.includes(l.id));

  const toggleSelectAll = () => {
    if (allCurrentPageSelected) {
      const pageIds = paginatedListings.map(l => l.id);
      setSelectedIds(prev => prev.filter(id => !pageIds.includes(id)));
    } else {
      const pageIds = paginatedListings.map(l => l.id);
      setSelectedIds(prev => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const toggleSelectOne = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    setIsDeletingBatch(true);
    try {
      if (batchDeleteListings) {
        await batchDeleteListings(selectedIds);
      } else {
        for (const id of selectedIds) {
          await deleteListing(id);
        }
      }
      setSelectedIds([]);
      setBatchDeleteConfirm(false);
      refresh();
    } catch (err) {
      console.error('Failed to batch delete', err);
      alert('Failed to delete selected listings: ' + (err.response?.data?.error || err.message));
      refresh();
    } finally {
      setIsDeletingBatch(false);
    }
  };

  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 4) {
        pages.push(1, 2, 3, 4, 5, '...', totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  const formatIssueDetails = (issue) => {
    if (!issue.details) return null;
    if (issue.issue_type === 'LISTING') {
      const reason = issue.details.rejection_reason;
      return (
        <span className="text-gray-600 font-medium ml-1">
          {reason ? `— Reason: ${reason}` : '— (Pending admin feedback)'}
        </span>
      );
    }
    if (issue.issue_type === 'INVENTORY') {
      if (issue.details.low_stock_threshold !== undefined) {
        return (
          <span className="text-gray-500 ml-1">
            (Current: {issue.details.stock}, Alert threshold: {issue.details.low_stock_threshold})
          </span>
        );
      }
      return (
        <span className="text-gray-500 ml-1">
          (Current stock: {issue.details.stock ?? 0})
        </span>
      );
    }
    if (issue.issue_type === 'PRICE') {
      return (
        <span className="text-gray-500 ml-1">
          (Sell Price ₹{issue.details.sell_price} vs MRP ₹{issue.details.mrp})
        </span>
      );
    }
    const filtered = Object.entries(issue.details)
      .filter(([_, v]) => v !== null && v !== undefined)
      .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`)
      .join(', ');
    return filtered ? <span className="text-gray-500 ml-1">({filtered})</span> : null;
  };

  return (
    <div className="fade-in w-full p-2 sm:p-4">
      {/* Newly Published Product Success Banner */}
      {successBanner && (
        <div className="mb-5 p-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-lg flex items-center justify-between gap-3 animate-fade-in border border-emerald-500">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
              <i className="fa-solid fa-circle-check text-white text-xl"></i>
            </div>
            <div>
              <h3 className="font-black text-sm tracking-wide">Product Approved & Live!</h3>
              <p className="text-xs text-emerald-100 font-medium">{successBanner}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSuccessBanner('')}
            className="text-white/80 hover:text-white text-sm font-black p-1 hover:bg-white/10 rounded-lg transition"
            title="Dismiss"
          >
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>
      )}

      {/* Header and Actions */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 mb-1">{t('productsMyProducts', 'My Products')}</h1>
          <p className="text-gray-500 text-sm">{t('productsItemsMatching', '{total} items matching criteria', { total: totalItems })}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:gap-3">
          <button onClick={handleExportCSV} className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-sm font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-2 shadow-sm">
            <i className="fa-solid fa-download"></i> {t('productsExportCsv', 'Export CSV')}
          </button>
          <button 
            type="button" 
            onClick={() => setShowTemplateModal(true)} 
            className="px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-sm font-bold text-emerald-800 hover:bg-emerald-100 flex items-center gap-2 shadow-sm transition"
            title="Download CSV format template and column guidelines"
          >
            <i className="fa-solid fa-file-csv text-emerald-600"></i> {t('productsCsvTemplate', 'CSV Template')}
          </button>
          <input type="file" ref={fileInputRef} onChange={handleBulkUpload} accept=".csv" className="hidden" />
          <button onClick={() => fileInputRef.current.click()} className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-sm font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-2 shadow-sm">
            <i className="fa-solid fa-upload"></i> {t('productsBulkUpload', 'Bulk Upload')}
          </button>
          <button onClick={() => navigate('/pricing')} className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-sm font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-2 shadow-sm transition">
            <i className="fa-solid fa-tag text-purple-600"></i> {t('productsMassPrice', 'Mass Price')}
          </button>
          <button onClick={() => { openAddModal(); handleProductTypeChange('PACKED_ITEM'); }} className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-sm font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-2 shadow-sm transition" title="Scan or search barcode">
            <i className="fa-solid fa-barcode text-blue-600"></i> {t('productsScan', 'Scan')}
          </button>
          <button onClick={openAddModal} className="px-4 py-2 rounded-xl bg-brand-dark hover:bg-green-800 text-white text-sm font-bold flex items-center gap-2 shadow-sm transition">
            <i className="fa-solid fa-plus"></i> {t('productsAddProduct', 'Add Product')}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center">
          <div className="text-xs text-gray-400 font-bold mb-1">{t('productsTotalSkus', 'Total SKUs')}</div>
          <div className="text-2xl font-extrabold text-gray-900">{globalStats.total}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center">
          <div className="text-xs text-gray-400 font-bold mb-1">{t('productsOwnBrand', 'Own Brand')}</div>
          <div className="text-2xl font-extrabold text-purple-700">{globalStats.ownBrand}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center">
          <div className="text-xs text-gray-400 font-bold mb-1">{t('lowStock', 'Low Stock')}</div>
          <div className="text-2xl font-extrabold text-orange-600">{globalStats.lowStock}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center">
          <div className="text-xs text-gray-400 font-bold mb-1">{t('outOfStock', 'Out of Stock')}</div>
          <div className="text-2xl font-extrabold text-gray-400">{globalStats.outOfStock}</div>
        </div>
      </div>

      {/* Main Container Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-8">
        
        {/* Filters Top Row */}
        <div className="flex flex-wrap items-center gap-3 mb-4 text-sm">
          <span className="font-bold text-gray-500 text-xs">{t('productsSellingTo', 'Selling to:')}</span>
          <button onClick={() => setBuyerFilter('ALL')} className={`px-3 py-1 rounded-full font-bold text-xs ${buyerFilter === 'ALL' ? 'bg-brand-dark text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{t('productsAllBuyers', 'All buyers')}</button>
          <button onClick={() => setBuyerFilter('CUSTOMERS')} className={`px-3 py-1 rounded-full font-bold text-xs ${buyerFilter === 'CUSTOMERS' ? 'bg-brand-dark text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{t('productsCustomers', 'Customers')}</button>
          <button onClick={() => setBuyerFilter('STORES')} className={`px-3 py-1 rounded-full font-bold text-xs ${buyerFilter === 'STORES' ? 'bg-brand-dark text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{t('productsOtherStores', 'Other stores')}</button>
          <button onClick={() => setBuyerFilter('BOTH')} className={`px-3 py-1 rounded-full font-bold text-xs ${buyerFilter === 'BOTH' ? 'bg-brand-dark text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{t('productsBoth', 'Both')}</button>
        </div>

        {/* Search Bar */}
        <div className="flex gap-2 mb-4">
          <div className="flex-1 relative">
            <i className="fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={t('productsSearchPlaceholder', 'Search product name or barcode...')} className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl outline-none focus:border-green-500 text-sm bg-gray-50/50" />
          </div>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="px-3 py-3 border border-gray-200 rounded-xl outline-none focus:border-green-500 text-xs font-semibold bg-gray-50/50">
            <option value="ALL">All Categories</option>
            {categoryTree.map(dept => (
              <option key={dept.id} value={String(dept.id)}>
                {dept.name}
              </option>
            ))}
          </select>
          <select value={stockFilter} onChange={(e) => setStockFilter(e.target.value)} className="px-3 py-3 border border-gray-200 rounded-xl outline-none focus:border-green-500 text-xs font-semibold bg-gray-50/50">
            <option>{t('productsAllStock', 'All stock')}</option>
            <option>{t('productsInStockFilter', 'In stock')}</option>
            <option>{t('productsOutOfStockFilter', 'Out of stock')}</option>
          </select>
          {(searchQuery || stockFilter !== 'All stock' || typeFilter !== 'ALL' || buyerFilter !== 'ALL' || categoryFilter !== 'ALL') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setStockFilter('All stock');
                setTypeFilter('ALL');
                setBuyerFilter('ALL');
                setCategoryFilter('ALL');
              }}
              className="px-3 py-2 text-xs font-bold text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100/70 border border-red-200 rounded-xl transition flex items-center gap-1.5 shrink-0"
              title="Reset all filters"
            >
              <i className="fa-solid fa-xmark"></i>
              <span>Clear</span>
            </button>
          )}
        </div>

        {/* Pills Row */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button onClick={() => setTypeFilter('ALL')} className={`px-3 py-1.5 rounded-full text-xs font-bold ${typeFilter === 'ALL' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-600 border border-gray-200'}`}>{t('all', 'All')} ({globalStats.total})</button>
          <button onClick={() => setTypeFilter('PACKED_ITEM')} className={`px-3 py-1.5 rounded-full text-xs font-bold ${typeFilter === 'PACKED_ITEM' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-600 border border-gray-200'}`}>Packaged / FMCG ({globalStats.packed})</button>
          <button onClick={() => setTypeFilter('OWN_BRAND')} className={`px-3 py-1.5 rounded-full text-xs font-bold ${typeFilter === 'OWN_BRAND' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-600 border border-gray-200'}`}>{t('typeOwnBrand', 'Own Brand')} ({globalStats.ownBrand})</button>
          <button onClick={() => setTypeFilter('LOOSE_WEIGHT')} className={`px-3 py-1.5 rounded-full text-xs font-bold ${typeFilter === 'LOOSE_WEIGHT' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-600 border border-gray-200'}`}>{t('typeLoose', 'Loose / Weight')} ({globalStats.loose})</button>
          <button onClick={() => setTypeFilter('NATIONAL_PACK')} className={`px-3 py-1.5 rounded-full text-xs font-bold ${typeFilter === 'NATIONAL_PACK' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-600 border border-gray-200'}`}>National Pack (0)</button>
          <button onClick={() => setTypeFilter('PARTNER_PACK')} className={`px-3 py-1.5 rounded-full text-xs font-bold ${typeFilter === 'PARTNER_PACK' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-600 border border-gray-200'}`}>Partner Pack (0)</button>
          <button onClick={() => setTypeFilter('FOOD')} className={`px-3 py-1.5 rounded-full text-xs font-bold ${typeFilter === 'FOOD' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-600 border border-gray-200'}`}>{t('typeFood', 'Food')} ({globalStats.food})</button>
        </div>

        {/* Batch Selection Action Bar */}
        {selectedIds.length > 0 && (
          <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between flex-wrap gap-3 shadow-sm animate-fade-in">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-xl bg-brand-dark text-white flex items-center justify-center font-extrabold text-xs shadow-sm">
                {selectedIds.length}
              </span>
              <span className="text-sm font-extrabold text-emerald-950">
                {t('productsSelectedCount', '{count} products selected', { count: selectedIds.length })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button 
                type="button" 
                onClick={clearSelection} 
                className="px-3.5 py-2 rounded-xl bg-white border border-emerald-200 text-xs font-bold text-gray-700 hover:bg-emerald-100/50 transition"
              >
                {t('productsDeselectAll', 'Deselect All')}
              </button>
              <button 
                type="button" 
                onClick={() => setBatchDeleteConfirm(true)} 
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold shadow-sm flex items-center gap-2 transition"
              >
                <i className="fa-solid fa-trash-can"></i> {t('productsDeleteSelected', 'Delete Selected ({count})', { count: selectedIds.length })}
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto rounded-2xl border border-gray-200/80 bg-white shadow-xs">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-slate-50 text-slate-500 text-[11px] uppercase font-bold tracking-wider border-b border-gray-200">
              <tr>
                <th className="px-3.5 py-3 w-10 text-center">
                  <input 
                    type="checkbox" 
                    checked={allCurrentPageSelected} 
                    onChange={toggleSelectAll} 
                    className="rounded text-brand-dark focus:ring-brand-dark cursor-pointer" 
                  />
                </th>
                <th className="px-3.5 py-3 min-w-[200px]">{t('colProduct', 'Product')}</th>
                <th className="px-3 py-3 w-36">{t('colCategory', 'Category')}</th>
                <th className="px-3 py-3 w-28">{t('colBrandLabel', 'Brand / Label')}</th>
                <th className="px-3 py-3 w-28">{t('colBarcodeSku', 'Barcode / SKU')}</th>
                <th className="px-3 py-3 w-24">{t('colType', 'Type')}</th>
                <th className="px-3 py-3 w-24">{t('priceCol', 'Price')}</th>
                <th className="px-3 py-3 w-28">{t('stockCol', 'Stock')}</th>
                <th className="px-3 py-3 w-32">{t('colWhoCanBuy', 'Who can buy?')}</th>
                <th className="px-3 py-3 w-28 text-center">{t('colStatus', 'Status')}</th>
                <th className="px-3.5 py-3 w-24 text-right sticky right-0 bg-slate-50 shadow-[-6px_0_10px_-4px_rgba(0,0,0,0.06)]">{t('actions', 'Action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan="11" className="text-center py-10 text-gray-400 font-semibold">{t('loadingCatalog', 'Loading your catalog...')}</td></tr>
              ) : paginatedListings.length === 0 ? (
                <tr><td colSpan="11" className="text-center py-10 text-gray-400 font-semibold">{t('noProductsMatchFilters', 'No products match your filters.')}</td></tr>
              ) : (
                paginatedListings.map(l => {
                  const issues = listingIssues[l.id] || [];
                  const hasIssues = issues.length > 0;
                  return (
                    <React.Fragment key={l.id}>
                      <tr className={`group hover:bg-slate-50/70 transition-colors ${selectedIds.includes(l.id) ? 'bg-emerald-50/30' : ''} ${hasIssues ? 'border-l-4 border-l-red-500 bg-red-50/10' : ''}`}>
                        <td className="px-3.5 py-3 text-center">
                          <input 
                            type="checkbox" 
                            checked={selectedIds.includes(l.id)} 
                            onChange={() => toggleSelectOne(l.id)} 
                            className="rounded text-brand-dark border-gray-300 focus:ring-brand-dark cursor-pointer" 
                          />
                        </td>
                        <td className="px-3.5 py-3">
                          <div className="flex items-center gap-3">
                            {/* Product Thumbnail with safe error fallback */}
                            <div className="relative w-10 h-10 shrink-0 rounded-xl overflow-hidden border border-gray-200 bg-slate-50 flex items-center justify-center shadow-2xs">
                              {l.image_url ? (
                                <img
                                  src={l.image_url}
                                  alt={l.title}
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    const fb = e.currentTarget.parentElement?.querySelector('.img-fallback-icon');
                                    if (fb) fb.classList.remove('hidden');
                                  }}
                                  className="w-full h-full object-cover"
                                />
                              ) : null}
                              <div className={`img-fallback-icon w-full h-full bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center text-brand-dark ${l.image_url ? 'hidden' : 'flex'}`}>
                                <i className="fa-solid fa-cube text-base opacity-70"></i>
                              </div>
                            </div>

                            {/* Title & Status Badge Line */}
                            <div className="min-w-0 max-w-[240px]">
                              <div className="font-bold text-gray-900 text-sm leading-snug flex items-center gap-1.5">
                                <span className="truncate max-w-[150px] hover:text-brand-dark transition" title={l.title}>
                                  {l.title}
                                </span>
                                {(l.approval_status === 'APPROVED' || l.approval_status === 'PUBLISHED') && (
                                  <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider border border-emerald-200 shrink-0">
                                    {t('badgeApproved', 'APPROVED')}
                                  </span>
                                )}
                                {l.approval_status === 'SUBMITTED' && (
                                  <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider border border-blue-200 shrink-0">
                                    {t('badgeSubmitted', 'SUBMITTED')}
                                  </span>
                                )}
                                {l.approval_status === 'UNDER_REVIEW' && (
                                  <span className="bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider border border-yellow-200 shrink-0">
                                    {t('badgeUnderReview', 'UNDER REVIEW')}
                                  </span>
                                )}
                                {l.approval_status === 'DRAFT' && (
                                  <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider border border-gray-200 shrink-0">
                                    {t('badgeDraft', 'DRAFT')}
                                  </span>
                                )}
                                {l.approval_status === 'CHANGES_REQUIRED' && (
                                  <span className="bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider border border-orange-200 shrink-0">
                                    {t('badgeChangesRequired', 'CHANGES REQUIRED')}
                                  </span>
                                )}
                                {l.approval_status === 'REJECTED' && (
                                  <span className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider border border-red-200 shrink-0">
                                    {t('badgeRejected', 'REJECTED')}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                {l.sku ? (
                                  <span className="text-[10px] text-gray-400 font-mono tracking-tight">
                                    SKU: {l.sku}
                                  </span>
                                ) : l.barcode ? (
                                  <span className="text-[10px] text-gray-400 font-mono tracking-tight">
                                    {l.barcode}
                                  </span>
                                ) : null}

                                {l.master_catalog_id && (
                                  <span className="bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded text-[9px] font-bold border border-blue-200" title="Master Catalog Item">
                                    <i className="fa-solid fa-certificate mr-0.5 text-[8px]"></i>Master
                                  </span>
                                )}

                                {l.has_variants && (
                                  <span className="bg-purple-50 text-purple-700 px-1.5 py-0.2 rounded text-[9px] font-bold border border-purple-200">
                                    {l.variant_count || l.variants?.length || 'Multi'} Vars
                                  </span>
                                )}

                                {l.is_refundable === false ? (
                                  <span className="text-[9px] text-rose-500 font-medium" title="Non-Returnable">
                                    <i className="fa-solid fa-ban text-[8px] mr-0.5"></i>No return
                                  </span>
                                ) : (
                                  <span className="text-[9px] text-emerald-600 font-medium" title={`${l.refund_percentage ?? 100}% refund within ${l.return_window_days ?? 7} days`}>
                                    <i className="fa-solid fa-rotate-left text-[8px] mr-0.5"></i>{l.return_window_days ?? 7}d
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          {l.category_name ? (
                            <div>
                              <div className="font-semibold text-gray-800 text-xs">
                                {l.category_name}
                              </div>
                              {l.parent_category_name && (
                                <div className="text-[10px] text-gray-400 truncate max-w-[130px]" title={l.parent_category_name}>
                                  {l.parent_category_name}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-300 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          {l.brand_tag ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 text-xs font-bold border border-purple-100">
                              {l.brand_tag}
                            </span>
                          ) : (
                            <span className="text-gray-300 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          {l.barcode ? (
                            <div className="text-xs text-gray-900 font-mono font-bold tracking-tight" title="Barcode">{l.barcode}</div>
                          ) : l.sku ? (
                            <div className="text-xs text-gray-500 font-mono" title="SKU">{l.sku}</div>
                          ) : (
                            <span className="text-gray-300 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          {l.product_type === 'PACKED_ITEM' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-extrabold border border-blue-200">
                              <i className="fa-solid fa-box-archive text-[9px]"></i> Packed
                            </span>
                          )}
                          {l.product_type === 'LOOSE_WEIGHT' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 text-[10px] font-extrabold border border-amber-200">
                              <i className="fa-solid fa-scale-balanced text-[9px]"></i> Loose
                            </span>
                          )}
                          {l.product_type === 'OWN_BRAND' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-800 text-[10px] font-extrabold border border-purple-200">
                              <i className="fa-solid fa-tag text-[9px]"></i> Own Brand
                            </span>
                          )}
                          {l.product_type === 'FOOD' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 text-rose-800 text-[10px] font-extrabold border border-rose-200">
                              <i className="fa-solid fa-utensils text-[9px]"></i> Food
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <div>
                            <span className="font-extrabold text-gray-900 text-sm">
                              ₹{parseFloat(l.sell_price || 0).toFixed(2)}
                            </span>
                            {parseFloat(l.mrp || 0) > parseFloat(l.sell_price || 0) && (
                              <div className="text-[10px] text-gray-400 line-through">
                                ₹{parseFloat(l.mrp).toFixed(2)}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div>
                              <span className={`font-bold text-sm ${parseFloat(l.stock_qty || 0) <= 0 ? 'text-red-600' : parseFloat(l.stock_qty || 0) <= 5 ? 'text-amber-600' : 'text-gray-900'}`}>
                                {l.product_type === 'LOOSE_WEIGHT'
                                  ? parseFloat(l.stock_qty || 0).toFixed(3)
                                  : Math.floor(parseFloat(l.stock_qty || 0)).toLocaleString()}
                              </span>
                              <span className="text-[11px] text-gray-400 ml-1">
                                {l.unit || (l.product_type === 'LOOSE_WEIGHT' ? 'kg' : 'packs')}
                              </span>
                            </div>

                            {!l.has_variants && (
                              updatingStockId === l.id ? (
                                <i className="fa-solid fa-circle-notch fa-spin text-xs text-emerald-600"></i>
                              ) : (
                                <div className="inline-flex items-center gap-0.5">
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); handleQuickStock(l.id, 1); }}
                                    className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold bg-gray-100 hover:bg-emerald-100 text-gray-700 hover:text-emerald-800 transition"
                                    title="Add +1 Stock"
                                  >
                                    +1
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); handleQuickStock(l.id, 5); }}
                                    className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 transition"
                                    title="Add +5 Stock"
                                  >
                                    +5
                                  </button>
                                </div>
                              )
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleQuickToggleB2B(l.id)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition border ${
                              l.allowed_buyers === 'ALL'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                                : l.allowed_buyers === 'STORES_ONLY'
                                ? 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100'
                                : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
                            }`}
                            title={
                              l.allowed_buyers === 'ALL'
                                ? 'Selling to Customers + Stores. Click to toggle.'
                                : l.allowed_buyers === 'STORES_ONLY'
                                ? 'Selling to Stores only. Click to toggle.'
                                : 'Selling to Customers only. Click to toggle.'
                            }
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                l.allowed_buyers === 'ALL' ? 'bg-emerald-500' : l.allowed_buyers === 'STORES_ONLY' ? 'bg-blue-500' : 'bg-amber-500'
                              }`}
                            ></span>
                            <span>
                              {l.allowed_buyers === 'ALL'
                                ? 'All Buyers'
                                : l.allowed_buyers === 'STORES_ONLY'
                                ? 'Stores only'
                                : 'Customers'}
                            </span>
                          </button>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-center">
                          {l.approval_status === 'PUBLISHED' || l.approval_status === 'APPROVED' ? (
                            <button
                              type="button"
                              onClick={() => handleQuickToggleActive(l.id)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition border cursor-pointer ${
                                l.is_active !== false
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                                  : 'bg-gray-100 text-gray-500 border-gray-300 hover:bg-gray-200'
                              }`}
                              title={
                                l.is_active !== false
                                  ? 'Product is Active on your store. Click to Deactivate.'
                                  : 'Product is Deactivated (hidden from buyers). Click to Activate.'
                              }
                            >
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  l.is_active !== false ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'
                                }`}
                              ></span>
                              <span>{l.is_active !== false ? 'Active' : 'Deactivated'}</span>
                            </button>
                          ) : l.approval_status === 'DRAFT' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200" title="Draft product — not yet submitted for review">
                              <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                              <span>Draft</span>
                            </span>
                          ) : l.approval_status === 'SUBMITTED' || l.approval_status === 'UNDER_REVIEW' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200" title="Awaiting Admin approval">
                              <i className="fa-solid fa-clock text-[9px] text-blue-500 animate-pulse"></i>
                              <span>In Review</span>
                            </span>
                          ) : l.approval_status === 'REJECTED' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200" title="Rejected by Admin — click Edit to revise">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                              <span>Rejected</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200" title="Admin requested changes">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                              <span>Needs Edits</span>
                            </span>
                          )}
                        </td>
                        <td className="px-3.5 py-3 text-right whitespace-nowrap sticky right-0 bg-white/95 group-hover:bg-slate-50/95 transition shadow-[-6px_0_10px_-4px_rgba(0,0,0,0.06)]">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEdit(l)}
                              className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-brand-dark hover:text-white text-gray-600 flex items-center justify-center transition shadow-2xs"
                              title={t('edit', 'Edit Product')}
                            >
                              <i className="fa-solid fa-pen text-xs"></i>
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirm(l.id)}
                              className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-red-600 hover:text-white text-gray-600 flex items-center justify-center transition shadow-2xs"
                              title={t('delete', 'Delete Product')}
                            >
                              <i className="fa-solid fa-trash text-xs"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                      {hasIssues && (
                        <tr>
                          <td colSpan="11" className="px-4 py-2 bg-red-50/50 border-b border-gray-100">
                            <div className="flex flex-col gap-1 pl-8">
                              {issues.map((issue, idx) => (
                                <div key={idx} className="flex items-start gap-2 text-xs">
                                  <i className={`fa-solid mt-0.5 ${issue.severity === 'high' ? 'fa-circle-xmark text-red-500' : 'fa-triangle-exclamation text-amber-500'}`}></i>
                                  <div>
                                    <span className="font-bold text-gray-900">{issue.issue_type} ISSUE:</span> <span className="text-gray-700">{issue.message}</span>
                                    {formatIssueDetails(issue)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalItems > 0 && (
          <div className="flex flex-col md:flex-row justify-between items-center mt-4 px-2 py-4 gap-4">
            <div className="flex items-center text-sm text-gray-500 font-medium">
              <span>
                {t('showingItemsPagination', 'Showing {start} to {end} of {total} items', {
                  start: (currentPage - 1) * itemsPerPage + 1,
                  end: Math.min(currentPage * itemsPerPage, totalItems),
                  total: totalItems
                })}
              </span>
              <span className="mx-4 text-gray-300">|</span>
              <div className="flex items-center gap-2">
                <span>{t('rowsPerPage', 'Rows per page:')}</span>
                <select 
                  value={itemsPerPage} 
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  className="border border-gray-200 rounded-lg px-2 py-1 text-gray-700 outline-none focus:border-brand-dark cursor-pointer font-semibold"
                >
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded border border-gray-200 bg-white text-gray-500 text-sm font-semibold hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1"
              >
                <i className="fa-solid fa-chevron-left text-[10px]"></i> {t('btnPrev', 'Prev')}
              </button>
              
              {getPageNumbers().map((num, i) => (
                <button
                  key={i}
                  onClick={() => typeof num === 'number' && setCurrentPage(num)}
                  disabled={num === '...'}
                  className={`min-w-[32px] h-[32px] flex items-center justify-center rounded text-sm font-semibold transition ${
                    num === currentPage 
                      ? 'bg-brand-dark text-white border-brand-dark shadow-md' 
                      : num === '...' 
                        ? 'text-gray-400 cursor-default' 
                        : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {num}
                </button>
              ))}

              <button 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} 
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded border border-gray-200 bg-white text-gray-500 text-sm font-semibold hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1"
              >
                {t('btnNext', 'Next')} <i className="fa-solid fa-chevron-right text-[10px]"></i>
              </button>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto fade-in">
            <div className="px-6 pt-6 pb-4 flex justify-between items-start">
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-full bg-green-50 text-brand-dark flex items-center justify-center text-xl shrink-0"><i className="fa-solid fa-plus"></i></div>
                <div>
                  <h2 className="text-xl font-extrabold text-gray-900">{editingListing ? t('editProductTitle', 'Edit Product') : t('addProductTitle', 'Add a Product')}</h2>
                  <p className="text-xs font-bold text-gray-400">{t('fastListingSubtitle', 'Fast listing for your shop catalog')}</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition"><i className="fa-solid fa-xmark"></i></button>
            </div>
            
            <form onSubmit={e => saveListing(e, true)} className="px-6 pb-6 space-y-5">
              
              {/* Product Type Selector */}
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">{t('whatTypeOfProduct', 'What type of product?')}</label>
                <div className="grid grid-cols-3 gap-2">
                  <button type="button" onClick={() => handleProductTypeChange('OWN_BRAND')} className={`p-3 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition ${formData.product_type === 'OWN_BRAND' ? 'border-brand-dark bg-green-50/50' : 'border-gray-100 bg-white hover:border-green-200'}`}>
                    <i className={`fa-solid fa-tag text-lg ${formData.product_type === 'OWN_BRAND' ? 'text-brand-dark' : 'text-purple-500'}`}></i>
                    <span className={`text-xs font-bold ${formData.product_type === 'OWN_BRAND' ? 'text-brand-dark' : 'text-gray-700'}`}>{t('typeOwnBrand', 'Own Brand')}</span>
                  </button>
                  <button type="button" onClick={() => handleProductTypeChange('LOOSE_WEIGHT')} className={`p-3 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition ${formData.product_type === 'LOOSE_WEIGHT' ? 'border-brand-dark bg-green-50/50' : 'border-gray-100 bg-white hover:border-green-200'}`}>
                    <i className={`fa-solid fa-scale-balanced text-lg ${formData.product_type === 'LOOSE_WEIGHT' ? 'text-brand-dark' : 'text-amber-500'}`}></i>
                    <span className={`text-xs font-bold ${formData.product_type === 'LOOSE_WEIGHT' ? 'text-brand-dark' : 'text-gray-700'}`}>{t('typeLoose', 'Loose / Weight')}</span>
                  </button>
                  <button type="button" onClick={() => handleProductTypeChange('PACKED_ITEM')} className={`p-3 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition ${formData.product_type === 'PACKED_ITEM' ? 'border-brand-dark bg-green-50/50' : 'border-gray-100 bg-white hover:border-green-200'}`}>
                    <i className={`fa-solid fa-box text-lg ${formData.product_type === 'PACKED_ITEM' ? 'text-brand-dark' : 'text-blue-500'}`}></i>
                    <span className={`text-xs font-bold ${formData.product_type === 'PACKED_ITEM' ? 'text-brand-dark' : 'text-gray-700'}`}>{t('typePacked', 'Packed Item')}</span>
                  </button>
                </div>
              </div>

              {formData.product_type === 'OWN_BRAND' && (
                <div className="p-4 bg-purple-50 rounded-2xl border border-purple-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <i className="fa-solid fa-tag text-purple-600 text-sm"></i>
                      <span className="font-extrabold text-sm text-purple-900">Own Brand Setup & B2B Distribution</span>
                    </div>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-purple-200/60 text-purple-900">
                      Private Label
                    </span>
                  </div>
                  <p className="text-xs text-purple-700 leading-relaxed">
                    Set up your manufacturer label, unit, and configure store-to-store wholesale rates for partner kiranas across the ADAB network.
                  </p>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-purple-900 mb-1">Brand / Label Name *</label>
                      <input 
                        type="text" 
                        name="brand_tag" 
                        value={formData.brand_tag || ''} 
                        onChange={handleFormChange} 
                        placeholder="Brand (e.g. Balaji, Homemade)" 
                        className="w-full px-3 py-2 rounded-xl border border-purple-200 bg-white text-sm outline-none focus:border-purple-500 font-semibold text-purple-900" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-purple-900 mb-1">SKU / Style Code</label>
                      <input 
                        type="text" 
                        name="sku" 
                        value={formData.sku || ''} 
                        onChange={handleFormChange} 
                        placeholder="e.g. BAL-001 or HM-05" 
                        className="w-full px-3 py-2 rounded-xl border border-purple-200 bg-white text-sm outline-none focus:border-purple-500 font-mono text-purple-900" 
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-purple-900 shrink-0">Selling Unit:</span>
                    <select 
                      name="unit" 
                      value={formData.unit || 'pcs'} 
                      onChange={handleFormChange} 
                      className="flex-1 px-3 py-1.5 rounded-xl border border-purple-200 bg-white text-xs font-semibold text-purple-900 outline-none"
                    >
                      <option value="pcs">Pieces (pcs) [Default]</option>
                      <option value="pair">Pair (pair)</option>
                      <option value="set">Set (set)</option>
                      <option value="pack">Pack (pack)</option>
                      <option value="box">Box (box)</option>
                      <option value="meter">Meter (m)</option>
                      <option value="kg">Kilogram (kg)</option>
                    </select>
                  </div>

                  
                </div>
              )}

              {formData.product_type === 'LOOSE_WEIGHT' && (
                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200">
                  <div className="flex items-center gap-2 mb-1">
                    <i className="fa-solid fa-scale-balanced text-amber-600 text-xs"></i>
                    <span className="font-extrabold text-sm text-amber-900">Loose / Weight Setup</span>
                  </div>
                  <p className="text-xs text-amber-700 mb-3 leading-relaxed">For grains, pulses, sugar, fresh produce, oils, spices sold by kg/litre or fractional weight.</p>
                  <div className="flex gap-2">
                    <select 
                      name="unit" 
                      value={formData.unit || 'kg'} 
                      onChange={handleFormChange} 
                      className="flex-1 px-3 py-2 rounded-xl border border-amber-200 bg-white text-sm outline-none focus:border-amber-500 font-semibold text-amber-900"
                    >
                      <option value="kg">Unit: Kilogram (kg) [Default]</option>
                      <option value="g">Unit: Gram (g)</option>
                      <option value="litre">Unit: Litre (L)</option>
                    </select>
                    <input 
                      type="number" 
                      step="0.01" 
                      name="min_order_qty" 
                      value={formData.min_order_qty || ''} 
                      onChange={handleFormChange} 
                      placeholder="Min Order (e.g. 0.5 kg)" 
                      className="flex-1 px-3 py-2 rounded-xl border border-amber-200 bg-white text-sm outline-none focus:border-amber-500" 
                    />
                  </div>
                </div>
              )}

              {formData.product_type === 'PACKED_ITEM' && (
                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-200">
                  <div className="flex items-center gap-2 mb-1">
                    <i className="fa-solid fa-box text-blue-600 text-xs"></i>
                    <span className="font-extrabold text-sm text-blue-900">Packaged FMCG / Catalog Selection</span>
                  </div>
                  <p className="text-xs text-blue-700 mb-3 leading-relaxed">
                    Select from standard FMCG master catalog to auto-fill title, brand, barcode, and MRP, or enter manually below.
                  </p>
                  
                  {/* Catalog Sourcing & Auto-Fill */}
                  <div className="space-y-3 mb-3">
                    <PackedItemSelector
                      onSelect={handleCatalogProductSelect}
                      selectedItem={formData}
                      onClear={() => setFormData(prev => ({
                        ...prev,
                        master_catalog_id: null,
                        manufacturer_product_id: null
                      }))}
                    />

                    <BarcodeScannerInput
                      value={formData.barcode}
                      onChange={(code) => setFormData(prev => ({ ...prev, barcode: code }))}
                      onBarcodeMatch={handleCatalogProductSelect}
                    />
                  </div>

                  {/* Manual Brand, Barcode & Pack Unit fields */}
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div>
                      <label className="block text-xs font-bold text-blue-900 mb-1">Brand Name</label>
                      <input 
                        type="text" 
                        name="brand_tag" 
                        value={formData.brand_tag || ''} 
                        onChange={handleFormChange} 
                        placeholder="Brand (e.g. Amul, Tata)" 
                        className="w-full px-3 py-2 rounded-xl border border-blue-200 bg-white text-sm outline-none focus:border-blue-500 font-semibold text-blue-900" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-blue-900 mb-1">Barcode / EAN</label>
                      <input 
                        type="text" 
                        name="barcode" 
                        value={formData.barcode || ''} 
                        onChange={handleFormChange} 
                        placeholder="8901234567890" 
                        className="w-full px-3 py-2 rounded-xl border border-blue-200 bg-white text-sm outline-none focus:border-blue-500 font-mono font-bold text-blue-900" 
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-blue-900 shrink-0">Pack Unit:</span>
                    <select 
                      name="unit" 
                      value={formData.unit || 'pack'} 
                      onChange={handleFormChange} 
                      className="flex-1 px-3 py-1.5 rounded-xl border border-blue-200 bg-white text-xs font-semibold text-blue-900 outline-none"
                    >
                      <option value="pack">Pack / Packet [Default]</option>
                      <option value="pcs">Pieces (pcs)</option>
                      <option value="bottle">Bottle</option>
                      <option value="box">Box</option>
                      <option value="can">Can</option>
                      <option value="pouch">Pouch</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Standard Inputs */}
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">{t('productNameLabel', 'Product Name')}</label>
                <input type="text" name="title" required value={formData.title} onChange={handleFormChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-brand-dark" placeholder="e.g. Balaji Silk Kurti or Handcrafted Shirt" />
              </div>

              {/* Multi-Level Hierarchical Category Selector */}
              <div>
                <CategoryCascader
                  value={formData.category_id}
                  onChange={(catId) => setFormData(prev => ({ ...prev, category_id: catId }))}
                  categoryTree={categoryTree}
                />
              </div>

              {/* Dynamic Category Specifications Form */}
              <DynamicAttributeForm
                categoryId={formData.category_id}
                values={formData.attributes || {}}
                onChange={(newAttrs, possibleVal) => {
                  if (typeof newAttrs === 'object' && newAttrs !== null && !Array.isArray(newAttrs)) {
                    setFormData(prev => ({ ...prev, attributes: newAttrs }));
                  } else if (typeof newAttrs === 'string') {
                    setFormData(prev => ({
                      ...prev,
                      attributes: {
                        ...(typeof prev.attributes === 'object' && prev.attributes !== null && !Array.isArray(prev.attributes) ? prev.attributes : {}),
                        [newAttrs]: possibleVal
                      }
                    }));
                  }
                }}
              />

              {/* Multi-SKU Variant Matrix Builder */}
              <VariantMatrixBuilder
                hasVariants={formData.has_variants}
                onToggleVariants={(enabled) => setFormData(prev => ({ ...prev, has_variants: enabled }))}
                variants={formData.variants || []}
                onChangeVariants={(newVariants) => setFormData(prev => ({ ...prev, variants: newVariants }))}
                basePrice={parseFloat(formData.sell_price) || 0}
                baseMrp={parseFloat(formData.mrp) || 0}
                baseSku={formData.sku || 'SKU'}
              />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">{t('printedMrpLabel', 'Printed MRP (₹)')}</label>
                  <input
                    type="number"
                    name="mrp"
                    required
                    min="0"
                    step="0.01"
                    value={formData.mrp || ''}
                    onChange={handleFormChange}
                    readOnly={Boolean(formData.master_catalog_id || formData.manufacturer_product_id)}
                    className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition ${
                      (formData.master_catalog_id || formData.manufacturer_product_id)
                        ? 'bg-gray-100 text-gray-700 border-gray-300 cursor-not-allowed font-semibold'
                        : 'border-gray-200 text-gray-900 focus:border-brand-dark'
                    }`}
                    placeholder="999"
                  />
                  {(formData.master_catalog_id || formData.manufacturer_product_id) && (
                    <p className="text-[11px] text-gray-500 mt-1">
                      🔒 Printed MRP is fixed by manufacturer. Only Sell Price can be customized.
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">{t('sellPriceLabel', 'Sell Price (₹)')}</label>
                  <input
                    type="number"
                    name="sell_price"
                    required
                    min="0"
                    step="0.01"
                    value={formData.sell_price}
                    onChange={handleFormChange}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-brand-dark font-semibold text-emerald-800"
                    placeholder="899"
                  />
                  {parseFloat(formData.mrp) > 0 && parseFloat(formData.sell_price) > 0 && (
                    <p className="text-[11px] text-emerald-600 mt-1 font-medium">
                      {parseFloat(formData.sell_price) < parseFloat(formData.mrp)
                        ? `Save ₹${(parseFloat(formData.mrp) - parseFloat(formData.sell_price)).toFixed(2)} (${Math.round(((parseFloat(formData.mrp) - parseFloat(formData.sell_price)) / parseFloat(formData.mrp)) * 100)}% discount)`
                        : 'Selling at maximum retail price (MRP)'}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">{t('productImageLabel', 'Product Image')}</label>
                  <div className="flex items-center gap-3">
                    {formData.image_url && (
                      <img src={formData.image_url} alt="Product" className="w-12 h-12 rounded-lg object-cover border border-gray-200" />
                    )}
                    <label className={`flex-1 py-3 px-4 text-center rounded-xl border border-dashed border-brand-dark/50 bg-green-50 text-brand-dark font-bold text-sm cursor-pointer hover:bg-green-100 transition ${isUploadingImage ? 'opacity-50 cursor-wait' : ''}`}>
                      {isUploadingImage ? 'Uploading to MinIO...' : formData.image_url ? 'Change Image' : 'Upload Image'}
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isUploadingImage} />
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    {formData.has_variants
                      ? 'Total Stock (Roll-up)'
                      : formData.product_type === 'LOOSE_WEIGHT'
                      ? 'Stock Available (e.g. 100.5 kg)'
                      : formData.product_type === 'PACKED_ITEM' ? 'Stock Qty (Packs)' : 'Stock Qty (Pieces)'}
                  </label>
                  {formData.has_variants ? (
                    <div className="w-full px-4 py-3 rounded-xl border border-purple-200 bg-purple-50/50 text-sm font-extrabold text-purple-950 flex items-center justify-between">
                      <span>{formData.variants?.reduce((sum, v) => sum + (parseFloat(v.stock_qty) || 0), 0) || 0} units</span>
                      <span className="text-xs font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded">Matrix Aggregate</span>
                    </div>
                  ) : (
                    <input
                      type="number"
                      step={formData.product_type === 'LOOSE_WEIGHT' ? "0.001" : "1"}
                      name="stock_qty"
                      value={formData.stock_qty || ''}
                      onChange={handleFormChange}
                      placeholder={formData.product_type === 'LOOSE_WEIGHT' ? "150.5" : "50"}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-brand-dark"
                    />
                  )}
                </div>
              </div>

              {/* B2B Wholesale Pricing & Volume Slabs (Strictly for Own Brand & Loose / Weight) */}
              {(formData.product_type === 'OWN_BRAND' || formData.product_type === 'LOOSE_WEIGHT') && (
                <div id="volume-tiered-pricing-section" className="p-4 bg-gradient-to-br from-purple-50/70 via-indigo-50/50 to-purple-50/60 rounded-2xl border border-purple-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <i className="fa-solid fa-store text-emerald-600 text-sm"></i>
                      <span className="font-extrabold text-sm text-purple-950">Store-to-Store Wholesale Pricing (B2B)</span>
                    </div>
                    {formData.wholesale_price && formData.sell_price && Number(formData.sell_price) > Number(formData.wholesale_price) && (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                        Reseller Margin: {Math.round(((Number(formData.sell_price) - Number(formData.wholesale_price)) / Number(formData.sell_price)) * 100)}%
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-purple-700 leading-relaxed">
                    Set a discounted trader rate to allow partner Kirana stores to order bulk sacks or wholesale units. Hidden from public shoppers.
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">
                        Wholesale Price to Other Stores (₹)
                      </label>
                      <input 
                        type="number" 
                        step="0.01"
                        name="wholesale_price" 
                        value={formData.wholesale_price || ''} 
                        onChange={handleFormChange} 
                        placeholder={formData.product_type === 'LOOSE_WEIGHT' ? "e.g. 35.00 / kg" : "e.g. 250.00 / pc"} 
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-bold text-emerald-800 outline-none focus:border-purple-500 shadow-sm" 
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">
                        Wholesale Min Order Qty (MOQ)
                      </label>
                      <input 
                        type="number" 
                        min="1"
                        name="min_order_qty" 
                        value={formData.min_order_qty || ''} 
                        onChange={handleFormChange} 
                        placeholder={formData.product_type === 'LOOSE_WEIGHT' ? "Min kg (e.g. 20)" : "Min units (e.g. 10)"} 
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-bold text-gray-800 outline-none focus:border-purple-500 shadow-sm" 
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-purple-100 space-y-2">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={formData.allowed_buyers === 'ALL' || formData.allowed_buyers === 'STORES_ONLY'} 
                        onChange={(e) => setFormData({
                          ...formData, 
                          allowed_buyers: e.target.checked ? 'ALL' : 'CUSTOMERS_ONLY'
                        })}
                        className="w-4 h-4 text-emerald-600 rounded mt-0.5 focus:ring-emerald-500" 
                      />
                      <div>
                        <div className="text-xs font-bold text-gray-900">
                          Distribute on B2B Partner Network
                        </div>
                        <div className="text-[11px] text-gray-500">
                          Allow neighboring kiranas and stores to order wholesale stock and resell in their shops
                        </div>
                      </div>
                    </label>

                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={formData.sample_available !== false} 
                        onChange={(e) => setFormData({
                          ...formData, 
                          sample_available: e.target.checked
                        })}
                        className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500" 
                      />
                      <span className="text-xs font-semibold text-gray-700">
                        Allow 1-unit sample orders so partner stores can inspect quality before bulk restock
                      </span>
                    </label>
                  </div>

                  {/* Volume Tiered Discount Slabs Studio */}
                  <div className="mt-3 pt-3 border-t border-purple-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <i className="fa-solid fa-layer-group text-purple-700 text-xs"></i>
                        <span className="text-xs font-extrabold text-purple-950">Volume Tiered Discount Slabs</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.2 bg-purple-100 text-purple-800 rounded-full">
                          {(formData.tiered_pricing || []).length} slabs
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddTierSlab}
                        className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1 shadow-sm transition"
                      >
                        <i className="fa-solid fa-plus text-[10px]"></i> Add Volume Slab
                      </button>
                    </div>

                    <p className="text-[11px] text-gray-600 mb-3">
                      Configure quantity-based discount tiers. <strong>Retail slabs</strong> apply to general customers on the app. <strong>Wholesale slabs</strong> apply exclusively to verified stores.
                    </p>

                    {(formData.tiered_pricing || []).length === 0 ? (
                      <div className="p-3 rounded-xl border border-dashed border-purple-300 bg-white text-center">
                        <p className="text-xs text-gray-500">No volume slabs added yet.</p>
                        <button
                          type="button"
                          onClick={handleAddTierSlab}
                          className="mt-1 text-xs font-bold text-purple-700 hover:underline"
                        >
                          + Click here to add your first bulk discount slab
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {formData.tiered_pricing.map((slab, idx) => {
                          const isWholesale = slab.buyer_type === 'WHOLESALE';
                          const basePrice = isWholesale ? parseFloat(formData.wholesale_price || 0) : parseFloat(formData.sell_price || 0);
                          const slabPrice = parseFloat(slab.price || 0);
                          const savings = basePrice > 0 && slabPrice > 0 && slabPrice < basePrice ? (basePrice - slabPrice) : 0;
                          const savingsPct = basePrice > 0 && savings > 0 ? Math.round((savings / basePrice) * 100) : 0;

                          return (
                            <div key={slab.id || idx} className="p-2.5 bg-white rounded-xl border border-purple-200 flex flex-wrap sm:flex-nowrap items-center gap-2 shadow-sm">
                              <div className="w-full sm:w-40">
                                <label className="block text-[10px] font-bold text-gray-500 uppercase">Buyer Type</label>
                                <select
                                  value={slab.buyer_type || 'CUSTOMER'}
                                  onChange={(e) => handleUpdateTierSlab(idx, 'buyer_type', e.target.value)}
                                  className={`w-full px-2 py-1.5 rounded-lg border text-xs font-bold outline-none ${
                                    isWholesale ? 'border-indigo-300 bg-indigo-50 text-indigo-900' : 'border-emerald-300 bg-emerald-50 text-emerald-900'
                                  }`}
                                >
                                  <option value="CUSTOMER">Retail Customers</option>
                                  <option value="WHOLESALE">Other Stores (B2B)</option>
                                </select>
                              </div>

                              <div className="w-1/2 sm:w-28">
                                <label className="block text-[10px] font-bold text-gray-500 uppercase">Min Qty ({formData.unit || 'units'})</label>
                                <input
                                  type="number"
                                  min="1"
                                  step="any"
                                  value={slab.min_qty || ''}
                                  onChange={(e) => handleUpdateTierSlab(idx, 'min_qty', e.target.value)}
                                  placeholder="e.g. 5"
                                  className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-xs font-bold outline-none focus:border-purple-500"
                                />
                              </div>

                              <div className="w-1/2 sm:w-32">
                                <label className="block text-[10px] font-bold text-gray-500 uppercase">Slab Price (₹)</label>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={slab.price || ''}
                                  onChange={(e) => handleUpdateTierSlab(idx, 'price', e.target.value)}
                                  placeholder="e.g. 42.00"
                                  className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-xs font-bold text-emerald-800 outline-none focus:border-purple-500"
                                />
                              </div>

                              <div className="flex-1 flex items-center justify-between text-xs">
                                <div>
                                  {savings > 0 ? (
                                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                      Save ₹{savings.toFixed(2)} ({savingsPct}%)
                                    </span>
                                  ) : slabPrice >= basePrice && basePrice > 0 ? (
                                    <span className="text-[11px] font-bold text-amber-600">
                                      Must be &lt; {isWholesale ? 'wholesale' : 'retail'} ₹{basePrice}
                                    </span>
                                  ) : (
                                    <span className="text-[11px] text-gray-400">
                                      {isWholesale && !formData.wholesale_price ? 'Set wholesale price above' : 'Enter slab price'}
                                    </span>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveTierSlab(idx)}
                                  className="w-7 h-7 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition"
                                  title="Delete Slab"
                                >
                                  <i className="fa-solid fa-trash-can text-xs"></i>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Checkboxes Group */}
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">{t('whoCanBuyThis', 'Who can buy this?')}</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer transition">
                    <input type="checkbox" checked={formData.allowed_buyers === 'ALL' || formData.allowed_buyers === 'CUSTOMERS_ONLY'} onChange={(e) => setFormData({...formData, allowed_buyers: e.target.checked ? 'ALL' : 'STORES_ONLY'})} className="w-4 h-4 text-brand-dark rounded focus:ring-brand-dark" />
                    <span className="text-sm font-semibold text-gray-700">Customers (retail people browsing the app)</span>
                  </label>
                  <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer transition">
                    <input type="checkbox" checked={formData.allowed_buyers === 'ALL' || formData.allowed_buyers === 'STORES_ONLY'} onChange={(e) => setFormData({...formData, allowed_buyers: e.target.checked ? 'ALL' : 'CUSTOMERS_ONLY'})} className="w-4 h-4 text-brand-dark rounded focus:ring-brand-dark" />
                    <span className="text-sm font-semibold text-gray-700">Other stores (B2B wholesale / bulk buying)</span>
                  </label>
                  <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer transition">
                    <input type="checkbox" checked={formData.allowed_buyers === 'STORES_ONLY'} onChange={(e) => setFormData({...formData, allowed_buyers: e.target.checked ? 'STORES_ONLY' : 'ALL'})} className="w-4 h-4 text-brand-dark rounded focus:ring-brand-dark" />
                    <span className="text-sm font-semibold text-gray-700">Stores only — hide from public customers</span>
                  </label>
                </div>
              </div>

              {/* Listing Active Status Toggle */}
              <div className="p-3.5 rounded-xl border border-gray-200 bg-gray-50/70 flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${formData.is_active !== false ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`}></span>
                    <span>{formData.is_active !== false ? 'Listing Active (Live on Store)' : 'Listing Deactivated (Hidden from Buyers)'}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {formData.is_active !== false
                      ? 'Customers and store buyers can view and order this product'
                      : 'Product is paused and hidden from public search and store shelves'}
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_active !== false}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {/* Return & Refund Policy Section */}
              <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                      <i className="fa-solid fa-rotate-left text-emerald-600"></i>
                      <span>{t('productReturnPolicyTitle', 'Return & Refund Policy')}</span>
                    </label>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {t('productReturnPolicySubtitle', 'Can customers return this item after delivery?')}
                    </p>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      name="is_refundable"
                      checked={formData.is_refundable !== false} 
                      onChange={(e) => setFormData({ ...formData, is_refundable: e.target.checked })} 
                      className="w-4 h-4 text-brand-dark rounded focus:ring-brand-dark cursor-pointer" 
                    />
                    <span className="text-xs font-bold text-gray-800">
                      {formData.is_refundable !== false ? t('productRefundableYes', 'Refundable') : t('productRefundableNo', 'Non-Returnable')}
                    </span>
                  </label>
                </div>

                {formData.is_refundable !== false ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-gray-200">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        {t('returnWindowDays', 'Return Window (Days)')}
                      </label>
                      <div className="flex items-center gap-2">
                        <input 
                          type="number" 
                          name="return_window_days" 
                          min="1" 
                          max="90" 
                          value={formData.return_window_days ?? 7} 
                          onChange={handleFormChange} 
                          placeholder="7" 
                          className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:border-brand-dark font-medium" 
                        />
                        <span className="text-xs font-semibold text-gray-500 whitespace-nowrap">days</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        {t('refundPercentageLabel', 'Max Refund Percentage (%)')}
                      </label>
                      <div className="flex items-center gap-2">
                        <input 
                          type="number" 
                          name="refund_percentage" 
                          min="0" 
                          max="100" 
                          step="1"
                          value={formData.refund_percentage ?? 100} 
                          onChange={handleFormChange} 
                          placeholder="100" 
                          className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:border-brand-dark font-medium" 
                        />
                        <span className="text-xs font-semibold text-gray-500 whitespace-nowrap">%</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
                    <i className="fa-solid fa-ban text-amber-600 shrink-0"></i>
                    <span>{t('nonReturnableNotice', 'Non-Returnable / Final Sale — customer app will mark this product as non-refundable.')}</span>
                  </div>
                )}
              </div>

              <div className="pt-2">
                {editingListing?.approval_status === 'APPROVED' && (
                  <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
                    <i className="fa-solid fa-circle-info text-amber-600 text-sm shrink-0"></i>
                    <span>Editing an approved product will re-submit it for admin verification. It cannot be saved as an unreviewed draft.</span>
                  </div>
                )}
                {editingListing?.approval_status === 'REJECTED' && (
                  <div className="mb-3 p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-start gap-2.5">
                    <i className="fa-solid fa-triangle-exclamation text-red-500 text-sm shrink-0 mt-0.5"></i>
                    <div>
                      <span className="font-extrabold text-red-950 block mb-0.5">Product Previously Rejected by Admin</span>
                      {editingListing.rejection_reason && (
                        <span className="text-red-700 block mb-1">Reason: "{editingListing.rejection_reason}"</span>
                      )}
                      <span className="text-red-600">Correct the fields below, then click <strong>"Save as Draft"</strong> to edit later or <strong>"Re-Submit for Review"</strong> to send back to Admin.</span>
                    </div>
                  </div>
                )}
                <div className="flex gap-3">
                  {editingListing?.approval_status === 'APPROVED' ? (
                    <button 
                      type="button" 
                      disabled={isSaving}
                      onClick={(e) => saveListing(e, true)} 
                      className="w-full py-3.5 rounded-xl bg-brand-dark hover:bg-green-800 disabled:opacity-60 disabled:cursor-not-allowed text-white font-extrabold text-sm shadow-md transition flex justify-center items-center gap-2 cursor-pointer"
                    >
                      {isSaving && savingAction === 'submit' ? (
                        <>
                          <i className="fa-solid fa-spinner fa-spin"></i> Submitting...
                        </>
                      ) : (
                        <>
                          <i className="fa-solid fa-paper-plane"></i> Submit Edits for Re-Review
                        </>
                      )}
                    </button>
                  ) : (
                    <>
                      <button 
                        type="button" 
                        disabled={isSaving}
                        onClick={(e) => saveListing(e, false)} 
                        className="flex-1 py-3.5 rounded-xl bg-white border-2 border-gray-200 hover:border-gray-300 disabled:opacity-60 disabled:cursor-not-allowed text-gray-700 font-extrabold text-sm transition flex justify-center items-center gap-2 cursor-pointer"
                      >
                        {isSaving && savingAction === 'draft' ? (
                          <>
                            <i className="fa-solid fa-spinner fa-spin text-brand-dark"></i> Saving Draft...
                          </>
                        ) : (
                          <>
                            <i className="fa-solid fa-save"></i> {t('saveAsDraftBtn', 'Save as Draft')}
                          </>
                        )}
                      </button>
                      <button 
                        type="button" 
                        disabled={isSaving}
                        onClick={(e) => saveListing(e, true)} 
                        className="flex-1 py-3.5 rounded-xl bg-brand-dark hover:bg-green-800 disabled:opacity-60 disabled:cursor-not-allowed text-white font-extrabold text-sm shadow-md transition flex justify-center items-center gap-2 cursor-pointer"
                      >
                        {isSaving && savingAction === 'submit' ? (
                          <>
                            <i className="fa-solid fa-spinner fa-spin"></i> {editingListing?.approval_status === 'REJECTED' ? 'Re-Submitting...' : 'Submitting...'}
                          </>
                        ) : (
                          <>
                            <i className="fa-solid fa-paper-plane"></i> {editingListing?.approval_status === 'REJECTED' ? t('reSubmitForReviewBtn', 'Re-Submit for Review') : t('submitForReviewBtn', 'Submit for Review')}
                          </>
                        )}
                      </button>
                    </>
                  )}
                </div>
                <div className="text-center mt-4">
                  {formData.product_type === 'PACKED_ITEM' ? (
                    <button 
                      type="button" 
                      onClick={() => navigate('/pricing')} 
                      className="text-xs font-bold text-brand-dark hover:underline flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
                    >
                      <i className="fa-solid fa-chart-line text-[11px]"></i> Manage Store-Wide Pricing & Discounts in Pricing Studio →
                    </button>
                  ) : (
                    <button 
                      type="button" 
                      onClick={() => {
                        const el = document.getElementById('volume-tiered-pricing-section');
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                      }} 
                      className="text-xs font-bold text-brand-dark hover:underline flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
                    >
                      <i className="fa-solid fa-layer-group text-[11px]"></i> Configure Tiered Bulk Pricing & Wholesale Slabs ↑
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Premium Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)}></div>
          <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6 animate-slide-in text-center">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fa-solid fa-triangle-exclamation text-red-500 text-2xl"></i>
            </div>
            <h3 className="text-lg font-extrabold text-gray-900 mb-2">{t('deleteProductModalTitle', 'Delete Product')}</h3>
            <p className="text-sm text-gray-500 mb-6 leading-relaxed">{t('deleteProductModalDesc', 'Are you sure you want to permanently delete this product? This action cannot be undone.')}</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-700 font-bold text-sm hover:bg-gray-50 transition">
                {t('cancel', 'Cancel')}
              </button>
              <button onClick={handleDeleteListing} className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 shadow-md shadow-red-500/20 transition">
                {t('delete', 'Delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Delete Confirmation Modal */}
      {batchDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => !isDeletingBatch && setBatchDeleteConfirm(false)}></div>
          <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6 animate-slide-in text-center">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fa-solid fa-trash-can text-red-500 text-2xl"></i>
            </div>
            <h3 className="text-lg font-extrabold text-gray-900 mb-2">{t('productsDeleteSelected', 'Delete Selected ({count})', { count: selectedIds.length })}</h3>
            <p className="text-sm text-gray-500 mb-6 leading-relaxed">
              Are you sure you want to permanently delete these <strong>{selectedIds.length}</strong> selected products? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button 
                type="button" 
                onClick={() => setBatchDeleteConfirm(false)} 
                disabled={isDeletingBatch} 
                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-700 font-bold text-sm hover:bg-gray-50 transition"
              >
                {t('cancel', 'Cancel')}
              </button>
              <button 
                type="button" 
                onClick={handleBatchDelete} 
                disabled={isDeletingBatch} 
                className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold text-sm hover:bg-red-700 shadow-md shadow-red-500/20 transition flex items-center justify-center gap-2"
              >
                {isDeletingBatch ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin"></i> {t('loading', 'Deleting...')}
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-trash"></i> {t('delete', 'Delete')} ({selectedIds.length})
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Upload CSV Template & Instructions Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={() => setShowTemplateModal(false)}></div>
          <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white rounded-3xl shadow-2xl p-6 sm:p-8 animate-slide-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-xl">
                  <i className="fa-solid fa-file-csv"></i>
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-gray-900">{t('productsCsvTemplate', 'Bulk Product CSV Template')}</h3>
                  <p className="text-xs text-gray-500">Download formatted template & instructions for inventory upload</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setShowTemplateModal(false)}
                className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 flex items-center justify-center transition"
              >
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>

            {/* Warning Callout: Remove Dummy Data First */}
            <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3">
              <i className="fa-solid fa-triangle-exclamation text-amber-600 text-lg mt-0.5 shrink-0"></i>
              <div className="text-xs sm:text-sm">
                <div className="font-extrabold mb-1">Important: Remove Sample Products Before Uploading!</div>
                <p className="text-amber-800 leading-relaxed">
                  The downloaded template contains 4 sample dummy items (e.g. <em>Tata Salt</em>, <em>Amul Butter</em>, <em>Balaji Silk Kurti</em>, <em>Fresh Farm Tomatoes</em>) to demonstrate how each product type is formatted. <strong>Please delete or replace these dummy rows before uploading your inventory!</strong> Our upload engine checks for sample rows and missing columns.
                </p>
              </div>
            </div>

            {/* Action Bar: Download Button */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl mb-6">
              <div>
                <div className="text-sm font-extrabold text-emerald-950">Official ADAB Catalog Format</div>
                <div className="text-xs text-emerald-700">Pre-populated with all required headers and format guides</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="px-5 py-2.5 rounded-xl bg-brand-dark hover:bg-green-800 text-white font-extrabold text-sm shadow-md transition flex items-center gap-2"
                >
                  <i className="fa-solid fa-download"></i> {t('download', 'Download')} {t('productsCsvTemplate', 'Template (.csv)')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowTemplateModal(false);
                    fileInputRef.current.click();
                  }}
                  className="px-4 py-2.5 rounded-xl bg-white border border-emerald-300 hover:bg-emerald-100/50 text-emerald-900 font-bold text-sm transition flex items-center gap-2"
                >
                  <i className="fa-solid fa-upload"></i> {t('productsBulkUpload', 'Upload CSV Now')}
                </button>
              </div>
            </div>

            {/* Product Types Specification */}
            <div className="mb-6">
              <h4 className="text-sm font-extrabold text-gray-900 mb-3 flex items-center gap-2">
                <i className="fa-solid fa-cubes text-gray-500"></i> Supported Product Types (<span className="font-mono text-emerald-700">product_type</span> column)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl border border-blue-100 bg-blue-50/40">
                  <div className="text-xs font-black text-blue-900 mb-1 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    PACKED_ITEM
                  </div>
                  <p className="text-[11px] text-gray-600 leading-snug mb-2">Standard packaged goods & national FMCG brands.</p>
                  <div className="text-[10px] space-y-1 font-mono text-blue-800">
                    <div>• <strong>barcode:</strong> Required (EAN/UPC)</div>
                    <div>• <strong>brand_tag:</strong> Required (e.g. Tata, Amul)</div>
                    <div>• <strong>sku:</strong> Leave empty</div>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl border border-purple-100 bg-purple-50/40">
                  <div className="text-xs font-black text-purple-900 mb-1 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                    OWN_BRAND
                  </div>
                  <p className="text-[11px] text-gray-600 leading-snug mb-2">Private label, handcrafted, or boutique catalog.</p>
                  <div className="text-[10px] space-y-1 font-mono text-purple-800">
                    <div>• <strong>sku:</strong> Unique SKU ID</div>
                    <div>• <strong>brand_tag:</strong> Your store/brand name</div>
                    <div>• <strong>barcode:</strong> Optional / Leave empty</div>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl border border-amber-100 bg-amber-50/40">
                  <div className="text-xs font-black text-amber-900 mb-1 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    LOOSE_WEIGHT
                  </div>
                  <p className="text-[11px] text-gray-600 leading-snug mb-2">Vegetables, fruits, and staples sold by weight.</p>
                  <div className="text-[10px] space-y-1 font-mono text-amber-800">
                    <div>• <strong>unit:</strong> kg or g</div>
                    <div>• <strong>barcode:</strong> Leave empty</div>
                    <div>• <strong>sku & brand_tag:</strong> Leave empty</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Category ID Reference */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-extrabold text-gray-900 flex items-center gap-2">
                  <i className="fa-solid fa-layer-group text-emerald-600"></i> Category Reference (<span className="font-mono text-emerald-700">category_id</span> column)
                </h4>
                <span className="text-[11px] font-bold text-gray-500">
                  {flattenedLeafCategories.length} Leaf Categories Available
                </span>
              </div>
              <input
                type="text"
                value={csvCategorySearch}
                onChange={(e) => setCsvCategorySearch(e.target.value)}
                placeholder="🔍 Search leaf category IDs for CSV (e.g. Atta, Rice, Milk, Soap, Tea)..."
                className="w-full mb-2.5 px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-xs outline-none focus:border-brand-dark focus:bg-white transition"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs max-h-52 overflow-y-auto p-1 border border-gray-100 rounded-xl bg-gray-50/50">
                {(filteredLeafCategories.length > 0 ? filteredLeafCategories.slice(0, 30) : categories).map(cat => (
                  <div key={cat.id} className="p-2 rounded-xl border border-gray-100 bg-white shadow-2xs flex items-center gap-2">
                    <span className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-800 font-extrabold text-[10px] flex items-center justify-center shrink-0">
                      {cat.id}
                    </span>
                    <div className="truncate min-w-0">
                      <div className="font-bold text-gray-800 truncate text-[11px]" title={cat.name}>{cat.name}</div>
                      {cat.breadcrumb && <div className="text-[9px] text-gray-400 truncate" title={cat.breadcrumb}>{cat.breadcrumb}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Column Reference Table */}
            <div className="border border-gray-100 rounded-2xl overflow-hidden mb-6 text-xs">
              <div className="bg-gray-50 px-4 py-2.5 font-bold text-gray-700 border-b border-gray-100">
                CSV Column Specifications
              </div>
              <div className="divide-y divide-gray-100 text-gray-600 max-h-48 overflow-y-auto">
                <div className="px-4 py-2 flex justify-between"><span className="font-mono font-bold text-gray-900">title *</span><span>Product name (Required)</span></div>
                <div className="px-4 py-2 flex justify-between"><span className="font-mono font-bold text-gray-900">sell_price *</span><span>Your selling price in ₹ (Required)</span></div>
                <div className="px-4 py-2 flex justify-between"><span className="font-mono text-gray-800">mrp</span><span>Printed Maximum Retail Price (defaults to sell_price)</span></div>
                <div className="px-4 py-2 flex justify-between"><span className="font-mono text-gray-800">category_id</span><span>Numeric ID from category table above</span></div>
                <div className="px-4 py-2 flex justify-between"><span className="font-mono text-gray-800">product_type</span><span>PACKED_ITEM, OWN_BRAND, or LOOSE_WEIGHT</span></div>
                <div className="px-4 py-2 flex justify-between"><span className="font-mono text-gray-800">brand_tag</span><span>Brand or label name</span></div>
                <div className="px-4 py-2 flex justify-between"><span className="font-mono text-gray-800">barcode</span><span>8, 12, or 13-digit EAN/UPC code</span></div>
                <div className="px-4 py-2 flex justify-between"><span className="font-mono text-gray-800">sku</span><span>Seller SKU identifier</span></div>
                <div className="px-4 py-2 flex justify-between"><span className="font-mono text-gray-800">unit</span><span>pcs, pack, kg, g, bottle, pouch (default based on type)</span></div>
                <div className="px-4 py-2 flex justify-between"><span className="font-mono text-gray-800">stock_qty</span><span>Available stock count (number, default: 0)</span></div>
                <div className="px-4 py-2 flex justify-between"><span className="font-mono text-gray-800">min_order_qty</span><span>Minimum purchase quantity (number, default: 1)</span></div>
                <div className="px-4 py-2 flex justify-between"><span className="font-mono text-gray-800">allowed_buyers</span><span>ALL, CUSTOMERS, or STORES (default: ALL)</span></div>
              </div>
            </div>

            <div className="text-right">
              <button 
                type="button" 
                onClick={() => setShowTemplateModal(false)}
                className="px-5 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm transition"
              >
                {t('close', 'Close Guide')}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Products;
