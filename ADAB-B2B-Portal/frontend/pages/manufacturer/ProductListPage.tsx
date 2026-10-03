import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  Package,
  Plus,
  ShoppingBag,
  DatabaseZap,
  AlertTriangle,
  ChevronRight,
  LayoutGrid,
  Layers,
  ArrowLeft,
  X,
  PlusCircle,
  FolderPlus,
  PackageSearch,
  RefreshCw,
  Upload,
  Download
} from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useNotification } from '../../context/NotificationContext';
import productService from '../../services/productService';
import categoryService from '../../services/categoryService';
import ProductGrid from '../../components/manufacturer/ProductGrid';

import WarehouseStockModal from '../../components/manufacturer/WarehouseStockModal';
import { BulkImportModal } from '../../components/manufacturer/BulkImportModal';

type ViewLevel = 'categories' | 'subcategories' | 'products';

const ProductListPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { showSuccess, showError, showWarning } = useNotification();
  const queryParams = new URLSearchParams(location.search);
  const filterParam = queryParams.get('filter');

  const [hierarchy, setHierarchy] = useState<Record<string, string[]>>({});
  const [categoryIds, setCategoryIds] = useState<Record<string, number>>({});
  const [categoryDescriptions, setCategoryDescriptions] = useState<Record<string, string>>({});
  const [subCategoryDescriptions, setSubCategoryDescriptions] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);

  // Navigation State
  const [viewLevel, setViewLevel] = useState<ViewLevel>(filterParam === 'low_stock' ? 'products' : 'categories');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null);

  // Creation Modals State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isSubCategoryModalOpen, setIsSubCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDescription, setNewCategoryDescription] = useState('');
  const [newSubCategoryName, setNewSubCategoryName] = useState('');
  const [newSubCategoryDescription, setNewSubCategoryDescription] = useState('');

  // Warehouse Stock Modal State
  const [isWarehouseModalOpen, setIsWarehouseModalOpen] = useState(false);
  const [selectedWarehouseProduct, setSelectedWarehouseProduct] = useState<any | null>(null);

  const [isExporting, setIsExporting] = useState(false);

  const handleBulkExport = async () => {
    try {
      setIsExporting(true);
      const data = await productService.bulkExportProducts();

      const url = window.URL.createObjectURL(new Blob([data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'products_export.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      showSuccess('Export downloaded successfully');
    } catch (error) {
      console.error('Export error:', error);
      showError('Failed to export products');
    } finally {
      setIsExporting(false);
    }
  };

  const handleOpenWarehouseModal = (product: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedWarehouseProduct(product);
    setIsWarehouseModalOpen(true);
  };

  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [paginationInfo, setPaginationInfo] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

  const {
    data: productsResponse,
    isLoading,
    error: queryError,
    refetch: fetchProducts,
  } = useQuery({
    queryKey: ['products', page, limit],
    queryFn: async () => {
      const response = await productService.getProducts({ page, limit });
      if (!response.success) {
        throw new Error(response.message || 'Failed to retrieve product catalog');
      }
      return response;
    }
  });

  const products = productsResponse?.data || [];

  useEffect(() => {
    if (productsResponse?.pagination) {
      setPaginationInfo({
        page: productsResponse.pagination.page || productsResponse.pagination.currentPage || page,
        limit: productsResponse.pagination.limit || limit,
        total: productsResponse.pagination.total || productsResponse.pagination.totalItems || products.length,
        totalPages: productsResponse.pagination.totalPages || 1
      });
    }
  }, [productsResponse, page, limit, products.length]);

  const fetchHierarchy = useCallback(async () => {
    try {
      const categoriesResponse = await categoryService.getCategories();
      const categories = categoriesResponse?.data || [];
      const ids: Record<string, number> = {};
      const descs: Record<string, string> = {};
      const subDescs: Record<string, string> = {};

      const entries = await Promise.all(
        categories.map(async (cat: any) => {
          ids[cat.category_name] = Number(cat.id);
          if (cat.description) {
            descs[cat.category_name] = cat.description;
          }
          const subRes = await categoryService.getSubcategories(cat.id);
          const subData = subRes?.data || [];

          subData.forEach((s: any) => {
            if (s.description) {
              subDescs[s.subcategory_name] = s.description;
            }
          });

          return [
            cat.category_name,
            subData.map((s: any) => s.subcategory_name)
          ] as const;
        })
      );

      setCategoryIds(ids);
      setCategoryDescriptions(descs);
      setSubCategoryDescriptions(subDescs);
      setHierarchy(Object.fromEntries(entries));
    } catch (err: any) {
      showError(err.response?.data?.message || "Failed to load categories");
    }
  }, [showError]);

  useEffect(() => {
    if (queryError) {
      showError(queryError.message || 'Error fetching products');
    }
  }, [queryError, showError]);

  useEffect(() => {
    // fetchProducts is now handled by useQuery on mount,
    // only fetchHierarchy needs explicit manual fetching.
    fetchHierarchy();
  }, [fetchHierarchy]);

  // Derived Data
  const categoriesList = useMemo(() => Object.keys(hierarchy), [hierarchy]);

  const getProductCount = (cat: string, sub?: string) => {
    return products.filter((p: any) => {
      const catMatch = p.category === cat;
      const subMatch = sub ? p.sub_category === sub : true;
      return catMatch && subMatch;
    }).length;
  };

  const filteredProducts = useMemo(() => {
    return products.filter((product: any) => {
      const stock = product.stock !== undefined && product.stock !== null ? Number(product.stock) : 0;
      
      if (filterParam === 'low_stock' && stock > 10) {
        return false;
      }
      
      const productName = product.product_name || '';
      const productId = String(product.id || '');
      const matchesSearch = productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            productId.toLowerCase().includes(searchQuery.toLowerCase());

      if (filterParam === 'low_stock') {
        return matchesSearch;
      }
      
      const matchesCategory = selectedCategory ? product.category === selectedCategory : true;
      const matchesSubCategory = selectedSubCategory ? product.sub_category === selectedSubCategory : true;
      
      return matchesCategory && matchesSubCategory && matchesSearch;
    });
  }, [searchQuery, products, selectedCategory, selectedSubCategory, filterParam]);

  // Handlers
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) {
      showError("Category name is required");
      return;
    }
    if (hierarchy[newCategoryName.trim()]) {
      showError("Category already exists");
      return;
    }

    try {
      const response = await categoryService.createCategory({
        category_name: newCategoryName.trim(),
        description: newCategoryDescription.trim() || undefined
      });
      if (response?.success === false) {
        showError(response?.message || "Failed to create category");
        return;
      }
      await fetchHierarchy();
      showSuccess(response?.message || `Category "${newCategoryName}" created successfully`);
      setNewCategoryName('');
      setNewCategoryDescription('');
      setIsCategoryModalOpen(false);
    } catch (err: any) {
      showError(err.response?.data?.message || "Failed to create category");
    }
  };

  const handleAddSubCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory) return;
    if (!newSubCategoryName.trim()) {
      showError("Sub-category name is required");
      return;
    }
    if ((hierarchy[selectedCategory] || []).includes(newSubCategoryName.trim())) {
      showError("Sub-category already exists in this section");
      return;
    }

    const categoryId = categoryIds[selectedCategory];
    if (!categoryId) {
      showError("Invalid category selected");
      return;
    }

    try {
      const response = await categoryService.createSubcategory(categoryId, {
        subcategory_name: newSubCategoryName.trim(),
        description: newSubCategoryDescription.trim() || undefined
      });
      if (response?.success === false) {
        showError(response?.message || "Failed to create sub-category");
        return;
      }
      await fetchHierarchy();
      showSuccess(response?.message || `Sub-category "${newSubCategoryName}" created`);
      setNewSubCategoryName('');
      setNewSubCategoryDescription('');
      setIsSubCategoryModalOpen(false);
    } catch (err: any) {
      showError(err.response?.data?.message || "Failed to create sub-category");
    }
  };

  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      const response = await productService.deleteProduct(deleteId);
      if (response.success) {
        // Invalidate and refetch via React Query
        fetchProducts();
        showWarning("Product removed from catalog");
      } else {
        showError(response.message || "Deletion failed");
      }
    } catch (err: any) {
      showError(err.response?.data?.message || "An error occurred during deletion");
    } finally {
      setDeleteId(null);
    }
  };



  const handleProductCardClick = (id: string) => {
    navigate(`/manufacturer/products/view/${id}`);
  };

  const goBack = () => {
    if (viewLevel === 'products') {
      setViewLevel('subcategories');
      setSelectedSubCategory(null);
    } else if (viewLevel === 'subcategories') {
      setViewLevel('categories');
      setSelectedCategory(null);
    }
  };

  // UI Components
  const Breadcrumbs = () => (
    <nav className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-dark-text-muted">
      {filterParam === 'low_stock' ? (
        <span className="text-adab-orange underline underline-offset-4">
          Low Stock Warnings
        </span>
      ) : (
        <button 
          onClick={() => { setViewLevel('categories'); setSelectedCategory(null); setSelectedSubCategory(null); }}
          className={`hover:text-adab-green transition-colors ${viewLevel === 'categories' ? 'text-adab-green underline underline-offset-4' : ''}`}
        >
          Catalog
        </button>
      )}
      {selectedCategory && (
        <>
          <ChevronRight className="w-3 h-3 text-gray-400 dark:text-gray-600" />
          <button
            onClick={() => { setViewLevel('subcategories'); setSelectedSubCategory(null); }}
            className={`hover:text-adab-green transition-colors ${viewLevel === 'subcategories' ? 'text-adab-green underline underline-offset-4' : ''}`}
          >
            {selectedCategory}
          </button>
        </>
      )}
      {selectedSubCategory && (
        <>
          <ChevronRight className="w-3 h-3 text-gray-400 dark:text-gray-600" />
          <span className="text-adab-green">{selectedSubCategory}</span>
        </>
      )}
    </nav>
  );

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 border-b border-gray-200 dark:border-dark-border-primary pb-8">
        <div>
          <div className="flex items-center gap-2 text-adab-green mb-1.5">
            <ShoppingBag className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Inventory Management</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-dark-text-primary tracking-tight">Product Catalog</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-dark-text-muted font-medium">Monitor and manage your active production hierarchy.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setIsBulkImportOpen(true)}
            className="inline-flex items-center justify-center px-4 py-2.5 bg-white dark:bg-dark-app-secondary border border-gray-200 dark:border-dark-border-secondary text-adab-green dark:text-adab-green rounded-xl text-xs md:text-sm font-bold uppercase tracking-wider hover:bg-gray-50 dark:hover:bg-dark-surface-hover transition-all shadow-sm active:scale-[0.98]"
          >
            <Upload className="w-4 h-4 mr-2" />
            Bulk Import
          </button>
          <button
            onClick={handleBulkExport}
            disabled={isExporting}
            className={`inline-flex items-center justify-center px-4 py-2.5 bg-white dark:bg-dark-app-secondary border border-gray-200 dark:border-dark-border-secondary text-adab-green dark:text-adab-green rounded-xl text-xs md:text-sm font-bold uppercase tracking-wider transition-all shadow-sm ${isExporting ? 'opacity-70 cursor-not-allowed' : 'hover:bg-gray-50 dark:hover:bg-dark-surface-hover active:scale-[0.98]'}`}
          >
            {isExporting ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
            {isExporting ? 'Exporting...' : 'Bulk Export'}
          </button>
          {viewLevel === 'categories' ? (
            <button
              onClick={() => setIsCategoryModalOpen(true)}
              className="inline-flex items-center justify-center px-6 py-2.5 bg-white dark:bg-dark-app-secondary border border-gray-200 dark:border-dark-border-secondary text-adab-green dark:text-adab-green rounded-xl text-xs md:text-sm font-bold uppercase tracking-wider hover:bg-gray-50 dark:hover:bg-dark-surface-hover transition-all shadow-sm active:scale-[0.98]"
            >
              <FolderPlus className="w-4 h-4 mr-2" />
              Add Category
            </button>
          ) : viewLevel === 'subcategories' ? (
            <button
              onClick={() => setIsSubCategoryModalOpen(true)}
              className="inline-flex items-center justify-center px-6 py-2.5 bg-white dark:bg-dark-app-secondary border border-gray-200 dark:border-dark-border-secondary text-adab-green dark:text-adab-green rounded-xl text-xs md:text-sm font-bold uppercase tracking-wider hover:bg-gray-50 dark:hover:bg-dark-surface-hover transition-all shadow-sm active:scale-[0.98]"
            >
              <PlusCircle className="w-4 h-4 mr-2" />
              Add Sub-Category
            </button>
          ) : null}
          <Link to="/manufacturer/product-management" className="inline-flex items-center justify-center px-6 py-2.5 bg-adab-green text-white rounded-xl text-xs md:text-sm font-bold uppercase tracking-wider hover:bg-green-700 transition-all shadow-lg active:scale-[0.98]">
            <Plus className="w-4 h-4 mr-2" />
            New Listing
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-dark-border-primary pb-4">
          <Breadcrumbs />
          {viewLevel !== 'categories' && filterParam !== 'low_stock' && (
            <button onClick={goBack} className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-dark-text-muted hover:text-adab-green dark:hover:text-adab-green uppercase tracking-widest transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          )}
        </div>

        {/* Level 0: Category Grid */}
        {viewLevel === 'categories' && (
          categoriesList.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {categoriesList.map(cat => (
                <div key={cat} className="bg-white dark:bg-dark-app-secondary border border-gray-200 dark:border-dark-border-primary rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all group border-b-4 hover:border-b-adab-green dark:hover:border-b-adab-green">
                  <div className="w-12 h-12 bg-green-50 dark:bg-green-950/40 rounded-xl flex items-center justify-center text-adab-green mb-4 group-hover:bg-adab-green group-hover:text-white transition-colors">
                    <LayoutGrid className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text-primary mb-1">{cat}</h3>
                  {categoryDescriptions[cat] && (
                    <p className="text-sm text-gray-600 dark:text-dark-text-muted mb-3">{categoryDescriptions[cat]}</p>
                  )}
                  <p className="text-sm text-gray-500 dark:text-dark-text-muted font-medium mb-6">{getProductCount(cat)} Products listed</p>
                  <button 
                    onClick={() => { setSelectedCategory(cat); setViewLevel('subcategories'); }}
                    className="w-full py-3 bg-gray-50 dark:bg-dark-surface-card border border-gray-200 dark:border-dark-border-secondary rounded-xl text-xs font-black uppercase tracking-widest text-gray-700 dark:text-dark-text-secondary hover:bg-adab-green dark:hover:bg-adab-green hover:text-white hover:border-adab-green dark:hover:border-adab-green transition-all"
                  >
                    View Sub-Categories
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-24 bg-gray-50/50 dark:bg-gray-900/50 border-2 border-dashed border-gray-200 dark:border-dark-border-primary rounded-[2.5rem] flex flex-col items-center text-center px-6">
              <LayoutGrid className="w-16 h-16 text-gray-300 dark:text-gray-700 mb-6" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-dark-text-primary mb-2">{queryError ? "Catalog Error" : "No categories defined"}</h3>
              <p className="text-sm text-gray-500 dark:text-dark-text-muted max-w-xs mb-8 font-medium">
                {queryError ? queryError.message : "Start by creating industrial categories to organize your production line."}
              </p>
              {queryError ? (
                <button
                  onClick={() => fetchProducts()}
                  className="px-8 py-3 bg-adab-green text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-green-900/10 hover:bg-green-800 transition-all flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Retry Fetch
                </button>
              ) : (
                <button
                  onClick={() => setIsCategoryModalOpen(true)}
                  className="px-8 py-3 bg-adab-green text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-green-900/10 hover:bg-green-800 transition-all"
                >
                  Create Your First Category
                </button>
              )}
            </div>
          )
        )}

        {/* Level 1: Sub-Category Grid */}
        {viewLevel === 'subcategories' && selectedCategory && (
          hierarchy[selectedCategory]?.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {hierarchy[selectedCategory].map(sub => (
                <div key={sub} className="bg-white dark:bg-dark-app-secondary border border-gray-200 dark:border-dark-border-primary rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all group border-b-4 hover:border-b-adab-orange dark:hover:border-b-adab-orange">
                  <div className="w-12 h-12 bg-orange-50 dark:bg-orange-950/40 rounded-xl flex items-center justify-center text-adab-orange mb-4 group-hover:bg-adab-orange group-hover:text-white transition-colors">
                    <Layers className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text-primary mb-1">{sub}</h3>
                  {subCategoryDescriptions[sub] && (
                    <p className="text-sm text-gray-600 dark:text-dark-text-muted mb-3">{subCategoryDescriptions[sub]}</p>
                  )}
                  <p className="text-sm text-gray-500 dark:text-dark-text-muted font-medium mb-6">{getProductCount(selectedCategory, sub)} Products found</p>
                  <button 
                    onClick={() => { setSelectedSubCategory(sub); setViewLevel('products'); }}
                    className="w-full py-3 bg-gray-50 dark:bg-dark-surface-card border border-gray-200 dark:border-dark-border-secondary rounded-xl text-xs font-black uppercase tracking-widest text-gray-700 dark:text-dark-text-secondary hover:bg-adab-green dark:hover:bg-adab-green hover:text-white hover:border-adab-green dark:hover:border-adab-green transition-all"
                  >
                    View Products
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-24 bg-gray-50/50 dark:bg-gray-900/50 border-2 border-dashed border-gray-200 dark:border-dark-border-primary rounded-[2.5rem] flex flex-col items-center text-center px-6">
              <Layers className="w-16 h-16 text-gray-300 dark:text-gray-700 mb-6" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-dark-text-primary mb-2">No sub-categories in "{selectedCategory}"</h3>
              <p className="text-sm text-gray-500 dark:text-dark-text-muted max-w-xs mb-8 font-medium">Define granular segments for this category to list your products.</p>
              <button 
                onClick={() => setIsSubCategoryModalOpen(true)}
                className="px-8 py-3 bg-adab-orange text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-orange-900/10 hover:bg-orange-700 transition-all"
              >
                Add Sub-Category
              </button>
            </div>
          )
        )}

        {/* Level 2: Product Card Grid */}
        {viewLevel === 'products' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Search Header */}
            <div className="bg-white dark:bg-dark-app-secondary border border-gray-200 dark:border-dark-border-primary rounded-2xl p-4 shadow-sm">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-dark-text-disabled" />
                <input 
                  type="text" 
                  placeholder={filterParam === 'low_stock' ? "Search low stock products..." : `Search in ${selectedSubCategory}...`} 
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-dark-surface-card border border-transparent dark:border-dark-border-secondary rounded-xl text-sm focus:bg-white dark:focus:bg-gray-900 focus:border-adab-green/40 focus:ring-4 focus:ring-adab-green/10 outline-none transition-all font-bold text-gray-900 dark:text-dark-text-primary"
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)} 
                />
              </div>
            </div>

            {filteredProducts.length > 0 ? (
              <>
                <ProductGrid 
                  products={filteredProducts}
                  isLoading={isLoading}
                  onProductClick={handleProductCardClick}
                  onProductDelete={handleDeleteClick}
                  onManageWarehouse={handleOpenWarehouseModal}
                />
                
                {paginationInfo.totalPages > 1 && (
                  <div className="flex items-center justify-between bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm mt-6">
                    <p className="text-xs font-semibold text-gray-500">
                      Page <span className="text-gray-900 dark:text-white font-bold">{page}</span> of <span className="text-gray-900 dark:text-white font-bold">{paginationInfo.totalPages}</span> ({paginationInfo.total} items)
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="p-2 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-600 dark:text-gray-300 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        <ChevronRight className="w-4 h-4 rotate-180" />
                      </button>
                      
                      {[...Array(paginationInfo.totalPages)].map((_, idx) => (
                        <button
                          key={idx + 1}
                          onClick={() => setPage(idx + 1)}
                          className={`w-8 h-8 rounded-xl text-xs font-extrabold transition-all ${page === idx + 1 ? 'bg-emerald-600 text-white shadow-sm' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                        >
                          {idx + 1}
                        </button>
                      ))}

                      <button
                        onClick={() => setPage(p => Math.min(paginationInfo.totalPages, p + 1))}
                        disabled={page >= paginationInfo.totalPages}
                        className="p-2 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-600 dark:text-gray-300 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="py-32 bg-white dark:bg-dark-app-secondary border border-gray-200 dark:border-dark-border-primary border-dashed rounded-[3rem] flex flex-col items-center text-center px-6">
                <div className="w-24 h-24 bg-gray-50 dark:bg-dark-surface-card rounded-full flex items-center justify-center mb-8 border border-gray-100 dark:border-dark-border-secondary shadow-inner">
                  {queryError ? <AlertTriangle className="w-12 h-12 text-adab-orange" /> : <PackageSearch className="w-12 h-12 text-gray-300 dark:text-gray-600" />}
                </div>
                <h3 className="text-2xl font-black text-gray-900 dark:text-dark-text-primary tracking-tight leading-none mb-3">
                  {queryError ? "Synchronisation Error" : "Segment is empty"}
                </h3>
                <p className="text-gray-500 dark:text-dark-text-muted text-sm font-medium leading-relaxed max-w-sm mb-10">
                  {queryError ? queryError.message : "No production units match your current filter or segment. Expand your catalog by adding a new product listing."}
                </p>
                {queryError ? (
                  <button
                    onClick={() => fetchProducts()}
                    className="px-10 py-4 bg-adab-green text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-green-900/10 hover:bg-green-800 transition-all flex items-center gap-3 active:scale-95"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Retry Fetch
                  </button>
                ) : (
                  <Link
                    to="/manufacturer/product-management"
                    className="px-10 py-4 bg-adab-green text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-green-900/10 hover:bg-green-800 transition-all active:scale-95"
                  >
                    Add Your First Product
                  </Link>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      {/* ... Modal code remains identical ... */}
      {/* Add Category Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-gray-950/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setIsCategoryModalOpen(false)} />
          <form onSubmit={handleAddCategory} className="bg-white dark:bg-dark-surface-card border border-gray-200 dark:border-dark-border-primary rounded-[2.5rem] w-full max-w-md shadow-2xl relative z-10 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
            <div className="px-8 py-6 border-b border-gray-100 dark:border-dark-border-primary flex items-center justify-between bg-gray-50/50 dark:bg-dark-surface-elevated rounded-t-[2.5rem]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-adab-green text-white flex items-center justify-center">
                  <FolderPlus className="w-5 h-5" />
                </div>
                <h3 className="font-black text-gray-900 dark:text-dark-text-primary text-sm uppercase tracking-widest">New Category</h3>
              </div>
              <button type="button" onClick={() => setIsCategoryModalOpen(false)} className="text-gray-400 hover:text-gray-900 dark:hover:text-dark-text-primary transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div>
                <label className="block text-[10px] font-black text-gray-400 dark:text-dark-text-secondary uppercase tracking-[0.2em] mb-2">Category Name (Required)</label>
                <input 
                  type="text" 
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="e.g. Raw Materials"
                  className="w-full px-5 py-3 border border-gray-200 dark:border-dark-border-primary bg-white dark:bg-dark-app-primary text-gray-900 dark:text-dark-text-secondary rounded-2xl outline-none focus:ring-4 focus:ring-adab-green/10 focus:border-adab-green font-bold text-sm"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 dark:text-dark-text-secondary uppercase tracking-[0.2em] mb-2">Brief Description (Optional)</label>
                <textarea 
                  rows={3}
                  value={newCategoryDescription}
                  onChange={(e) => setNewCategoryDescription(e.target.value)}
                  placeholder="Describe the type of products in this category..."
                  className="w-full px-5 py-3 border border-gray-200 dark:border-dark-border-primary bg-white dark:bg-dark-app-primary text-gray-900 dark:text-dark-text-secondary rounded-2xl outline-none focus:ring-4 focus:ring-adab-green/10 focus:border-adab-green font-bold text-sm resize-none"
                />
              </div>
            </div>
            <div className="px-8 py-6 border-t border-gray-100 dark:border-dark-border-primary flex gap-3 bg-white dark:bg-dark-surface-card rounded-b-[2.5rem]">
               <button 
                type="button" 
                onClick={() => setIsCategoryModalOpen(false)}
                className="flex-1 py-3.5 bg-gray-50 dark:bg-dark-surface-hover border border-gray-200 dark:border-dark-border-primary text-gray-500 dark:text-dark-text-secondary rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-100 dark:hover:bg-dark-surface-active transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-3.5 bg-adab-green text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-green-900/20 hover:bg-green-800 transition-all active:scale-95"
              >
                Save Category
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add Sub-Category Modal */}
      {isSubCategoryModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-gray-950/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setIsSubCategoryModalOpen(false)} />
          <form onSubmit={handleAddSubCategory} className="bg-white dark:bg-dark-app-secondary border border-gray-200 dark:border-dark-border-primary rounded-[2.5rem] w-full max-w-md shadow-2xl relative z-10 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
            <div className="px-8 py-6 border-b border-gray-100 dark:border-dark-border-primary flex items-center justify-between bg-gray-50/50 dark:bg-dark-surface-card rounded-t-[2.5rem]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-adab-orange text-white flex items-center justify-center">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <h3 className="font-black text-gray-900 dark:text-dark-text-secondary text-sm uppercase tracking-widest">New Sub-Category</h3>
              </div>
              <button type="button" onClick={() => setIsSubCategoryModalOpen(false)} className="text-gray-400 dark:text-dark-text-muted hover:text-gray-900 dark:hover:text-dark-text-secondary transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-8 space-y-6">
               <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Parent Category</label>
                <input
                  type="text"
                  value={selectedCategory || ''}
                  disabled
                  className="w-full px-5 py-3 bg-gray-50 dark:bg-dark-surface-hover border border-gray-100 dark:border-dark-border-primary rounded-2xl font-bold text-sm text-gray-400 cursor-not-allowed opacity-70"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Sub-Category Name (Required)</label>
                <input
                  type="text"
                  value={newSubCategoryName}
                  onChange={(e) => setNewSubCategoryName(e.target.value)}
                  placeholder="e.g. Metals & Alloys"
                  className="w-full px-5 py-3 border border-gray-200 dark:border-dark-border-primary dark:bg-dark-app-primary text-gray-900 dark:text-dark-text-secondary rounded-2xl outline-none focus:ring-4 focus:ring-adab-orange/10 focus:border-adab-orange font-bold text-sm"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Segment Description (Optional)</label>
                <textarea
                  rows={3}
                  value={newSubCategoryDescription}
                  onChange={(e) => setNewSubCategoryDescription(e.target.value)}
                  placeholder="Specific focus for this sub-category..."
                  className="w-full px-5 py-3 border border-gray-200 dark:border-dark-border-primary dark:bg-dark-app-primary text-gray-900 dark:text-dark-text-secondary rounded-2xl outline-none focus:ring-4 focus:ring-adab-orange/10 focus:border-adab-orange font-bold text-sm resize-none"
                />
              </div>
            </div>
            <div className="px-8 py-6 border-t border-gray-100 dark:border-dark-border-primary flex gap-3">
               <button
                type="button"
                onClick={() => setIsSubCategoryModalOpen(false)}
                className="flex-1 py-3.5 bg-gray-50 dark:bg-dark-surface-hover border border-gray-200 dark:border-dark-border-primary text-gray-500 dark:text-dark-text-secondary rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-100 dark:hover:bg-dark-surface-active transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-3.5 bg-adab-orange text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-orange-900/20 hover:bg-orange-600 transition-all active:scale-95"
              >
                Commit Segment
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-gray-950/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setDeleteId(null)} />
          <div className="bg-white dark:bg-dark-app-secondary border border-gray-200 dark:border-dark-border-primary rounded-[2rem] w-full max-md p-10 shadow-2xl relative z-10 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
            <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-900/30 text-red-500 flex items-center justify-center mb-8 mx-auto shadow-inner">
               <AlertTriangle className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-black text-gray-900 dark:text-dark-text-secondary text-center tracking-tight leading-none mb-3 uppercase">Delete Product?</h3>
            <p className="text-gray-500 dark:text-gray-400 text-center text-sm font-medium leading-relaxed mb-10">
              Are you sure you want to delete this product from your catalog? This action cannot be undone.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={confirmDelete}
                className="w-full py-4 bg-red-600 text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-red-900/20 hover:bg-red-700 transition-all active:scale-95"
              >
                Confirm Delete
              </button>
              <button
                onClick={() => setDeleteId(null)}
                className="w-full py-4 bg-white dark:bg-dark-app-secondary border border-gray-200 dark:border-dark-border-primary text-gray-500 dark:text-dark-text-secondary rounded-2xl text-xs font-black uppercase tracking-[0.2em] hover:bg-gray-50 dark:hover:bg-dark-surface-hover transition-all active:scale-95"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Multi-Warehouse Stock Allocation Modal */}
      <WarehouseStockModal
        isOpen={isWarehouseModalOpen}
        onClose={() => setIsWarehouseModalOpen(false)}
        product={selectedWarehouseProduct}
        onStockUpdated={fetchProducts}
      />

      {/* Bulk Import Modal */}
      <BulkImportModal
        isOpen={isBulkImportOpen}
        onClose={() => setIsBulkImportOpen(false)}
        onSuccess={() => {
          fetchProducts();
          fetchHierarchy();
        }}
      />

    </div>
  );
};

export default ProductListPage;
