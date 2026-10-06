import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

interface CategoryData {
  name: string;
  value: number;
}

interface CategoryPieChartProps {
  data: CategoryData[];
  onCategorySelect?: (category: string | undefined) => void;
  selectedCategory?: string;
}

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

const CategoryPieChart: React.FC<CategoryPieChartProps> = ({ data, onCategorySelect, selectedCategory }) => {
  
  const handleClick = (data: any) => {
    if (onCategorySelect) {
      if (selectedCategory === data.name) {
        onCategorySelect(undefined);
      } else {
        onCategorySelect(data.name);
      }
    }
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-900 p-2.5 rounded-lg shadow-xl border border-gray-100 dark:border-gray-800">
          <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{payload[0].name}</p>
          <p className="text-sm font-bold text-blue-600 dark:text-blue-400">₹{payload[0].value.toFixed(2)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 flex flex-col h-[420px]">
      <div className="flex justify-end items-center mb-2">
        {selectedCategory && (
          <button 
            onClick={() => onCategorySelect?.(undefined)}
            className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 font-medium"
          >
            Clear Filter
          </button>
        )}
      </div>
      <div className="w-full h-[320px]">
        {data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">
            No category data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={5}
                dataKey="value"
                onClick={handleClick}
                className="cursor-pointer outline-none"
              >
                {data.map((_entry, index) => (
                  <Cell 
                    key={"cell-" + index} 
                    fill={COLORS[index % COLORS.length]} 
                    opacity={selectedCategory && selectedCategory !== _entry.name ? 0.3 : 1}
                    className="transition-opacity duration-200 outline-none"
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                verticalAlign="bottom" 
                height={36} 
                iconType="circle"
                onClick={(entry: any) => {
                  const categoryName = entry.value;
                  if (categoryName) {
                    handleClick({ name: categoryName });
                  }
                }}
                formatter={(value) => <span className="text-sm text-gray-600 dark:text-gray-300 cursor-pointer hover:text-blue-500">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default CategoryPieChart;
