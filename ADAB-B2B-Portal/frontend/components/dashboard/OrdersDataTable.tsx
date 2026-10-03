import React, { useState, useEffect, useRef } from 'react';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  getExpandedRowModel,
} from '@tanstack/react-table';

import { ChevronDown, ChevronRight, Search, FileText } from 'lucide-react';
import distributorService from '../../services/distributorService';
import { useNavigate } from 'react-router-dom';

interface Order {
  id: number;
  order_number: string;
  manufacturer_name: string;
  order_date: string;
  total_amount: number;
  status: string;
  delivery_mode: string;
  items_count: number;
  created_at: string;
}

interface OrdersDataTableProps {
  categoryFilter?: string;
  refreshTrigger?: number;
}

const OrdersDataTable: React.FC<OrdersDataTableProps> = ({ categoryFilter, refreshTrigger }) => {
  const navigate = useNavigate();
  const [data, setData] = useState<Order[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortDesc, setSortDesc] = useState(true);

  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPageIndex(0);
    }, 500);
    return () => clearTimeout(handler);
  }, [search]);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const response = await (distributorService.getOrders as any)({
          page: pageIndex + 1,
          limit: pageSize,
          search: debouncedSearch,
          sortBy,
          sortDesc,
          category: categoryFilter,
        });
        if (response.success) {
          setData(response.data);
          setTotalCount(response.total_count || response.count || response.data.length);
        }
      } catch (error) {
        console.error('Failed to fetch orders for data table:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [pageIndex, pageSize, debouncedSearch, sortBy, sortDesc, categoryFilter, refreshTrigger]);

  const columns = React.useMemo(
    () => [
      {
        id: 'expander',
        header: () => null,
        cell: ({ row }: any) => (
          <button
            onClick={row.getToggleExpandedHandler()}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            {row.getIsExpanded() ? (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-500" />
            )}
          </button>
        ),
      },
      {
        accessorKey: 'order_number',
        header: 'Order #',
        cell: (info: any) => (
          <span className="font-medium text-gray-900">{info.getValue()}</span>
        ),
      },
      {
        accessorKey: 'manufacturer_name',
        header: 'Manufacturer',
      },
      {
        accessorKey: 'order_date',
        header: 'Date',
        cell: (info: any) => new Date(info.getValue()).toLocaleDateString(),
      },
      {
        accessorKey: 'total_amount',
        header: 'Total',
        cell: (info: any) => {
          const val = Number(info.getValue());
          return '$' + (isNaN(val) ? '0.00' : val.toFixed(2));
        },
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: (info: any) => {
          const status = info.getValue();
          const statusUpper = status ? status.toUpperCase() : '';
          const colors: Record<string, string> = {
            PENDING: 'bg-yellow-100 text-yellow-800',
            PROCESSING: 'bg-blue-100 text-blue-800',
            SHIPPED: 'bg-purple-100 text-purple-800',
            DELIVERED: 'bg-green-100 text-green-800',
            REJECTED: 'bg-red-100 text-red-800',
          };
          const cls = 'px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ' + (colors[statusUpper] || 'bg-gray-100 text-gray-800');
          return (
            <span className={cls}>
              {status}
            </span>
          );
        },
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }: any) => (
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate('/distributor/orders/view/' + row.original.id);
            }}
            className="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-md transition-colors text-sm font-medium flex items-center gap-1"
          >
            <FileText className="w-4 h-4" />
            View
          </button>
        ),
      },
    ],
    [navigate]
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowCanExpand: () => true,
    manualPagination: true,
    pageCount: Math.ceil(totalCount / pageSize),
  });

  const tableContainerRef = useRef<HTMLDivElement>(null);

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortDesc(!sortDesc);
    } else {
      setSortBy(column);
      setSortDesc(true);
    }
    setPageIndex(0);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[600px]">
      <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
        <h2 className="text-lg font-semibold text-gray-800">Order Data Grid</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search orders..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
          />
        </div>
      </div>

      <div ref={tableContainerRef} className="flex-1 overflow-auto relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-[1px] z-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-adab-green"></div>
          </div>
        )}
        
        {data.length === 0 && !loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-gray-500 text-sm font-medium">No orders found</div>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const isSortable = ['order_number', 'manufacturer_name', 'order_date', 'total_amount', 'status'].includes(
                      header.column.id
                    );
                    const thClass = 'p-4 text-xs font-medium text-gray-500 uppercase tracking-wider ' + (isSortable ? 'cursor-pointer hover:bg-gray-100' : '');
                    return (
                      <th
                        key={header.id}
                        className={thClass}
                        onClick={() => isSortable && handleSort(header.column.id)}
                      >
                        <div className="flex items-center gap-1">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {isSortable && sortBy === header.column.id && (
                            <span className="text-blue-600">
                              {sortDesc ? '↓' : '↑'}
                            </span>
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <React.Fragment key={row.id}>
                  <tr className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="p-4">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                  {row.getIsExpanded() && (
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <td colSpan={columns.length} className="p-4">
                        <div className="pl-12">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h4 className="text-sm font-semibold text-gray-700">Order Summary</h4>
                              <p className="text-xs text-gray-500">Items: {row.original.items_count} | Mode: {row.original.delivery_mode}</p>
                            </div>
                          </div>

                          <ExpandedOrderDetails orderId={row.original.id} />
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="p-4 border-t border-gray-100 bg-white flex items-center justify-between">
        <div className="text-sm text-gray-500">
          Showing {pageIndex * pageSize + 1} to {Math.min((pageIndex + 1) * pageSize, totalCount)} of {totalCount} results
        </div>
        <div className="flex items-center gap-2">
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPageIndex(0);
            }}
            className="border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {[10, 20, 50, 100].map((size) => (
              <option key={size} value={size}>
                Show {size}
              </option>
            ))}
          </select>

          <div className="flex gap-1">
            <button
              onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
              disabled={pageIndex === 0}
              className="px-3 py-1 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setPageIndex((p) => p + 1)}
              disabled={(pageIndex + 1) * pageSize >= totalCount}
              className="px-3 py-1 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrdersDataTable;

const ExpandedOrderDetails = ({ orderId }: { orderId: string | number }) => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    distributorService.getOrderById(orderId)
      .then((res) => {
        if (mounted && res.success) {
          setItems(res.data.items || []);
        }
      })
      .catch((err) => console.error("Failed to load items", err))
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, [orderId]);

  if (loading) {
    return <div className="text-sm text-gray-500 py-2">Loading items...</div>;
  }

  if (items.length === 0) {
    return <div className="text-sm text-gray-500 py-2">No items found for this order.</div>;
  }

  return (
    <div className="bg-white rounded border border-gray-100 overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 tracking-wider">Product</th>
            <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 tracking-wider">SKU</th>
            <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-gray-500 tracking-wider">Qty</th>
            <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-gray-500 tracking-wider">Price</th>
            <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-gray-500 tracking-wider">Subtotal</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {items.map((item) => (
            <tr key={item.id}>
              <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                {item.product_name}
              </td>
              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                {item.product_sku}
              </td>
              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 text-right">
                {item.quantity}
              </td>
              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 text-right">
                ₹{parseFloat(item.unit_price).toFixed(2)}
              </td>
              <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                ₹{(item.quantity * parseFloat(item.unit_price)).toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
