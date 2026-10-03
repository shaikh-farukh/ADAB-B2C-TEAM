import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

interface RevenueTrend {
  date: string;
  amount: number;
  isPredicted: boolean;
}

interface PredictiveAreaChartProps {
  data: RevenueTrend[];
  title?: string;
}

const PredictiveAreaChart: React.FC<PredictiveAreaChartProps> = ({ data, title }) => {
  const chartData = data.map(item => ({
    ...item,
    Actual: !item.isPredicted ? item.amount : null,
    Predicted: item.isPredicted ? item.amount : null,
  }));

  const lastActualIndex = data.findIndex(d => d.isPredicted) - 1;
  if (lastActualIndex >= 0 && lastActualIndex + 1 < data.length) {
    chartData[lastActualIndex].Predicted = chartData[lastActualIndex].Actual;
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const isPredicted = payload[0].dataKey === 'Predicted' || (payload[1] && payload[1].dataKey === 'Predicted' && payload[1].value);
      const val = payload[0].value || (payload[1] ? payload[1].value : 0);
      return (
        <div className="bg-white dark:bg-dark-app-secondary p-3 rounded-lg shadow-xl border border-gray-100 dark:border-dark-border-primary">
          <p className="text-sm text-gray-500 dark:text-dark-text-muted mb-1">{label} {isPredicted ? '(Forecast)' : ''}</p>
          <p className={'text-lg font-bold ' + (isPredicted ? 'text-purple-600 dark:text-purple-400' : 'text-blue-600 dark:text-blue-400')}>
            {'$' + (val ? val.toFixed(2) : '0.00')}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white dark:bg-dark-app-secondary rounded-xl shadow-sm border border-gray-100 dark:border-dark-border-primary p-6 h-[400px]">
      {title !== undefined ? (
        title && <h3 className="text-lg font-semibold text-gray-800 dark:text-dark-text-secondary mb-4">{title}</h3>
      ) : (
        <h3 className="text-lg font-semibold text-gray-800 dark:text-dark-text-secondary mb-4">Revenue Forecast</h3>
      )}
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorPredicted" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" strokeOpacity={0.2} />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#9ca3af', fontSize: 12 }}
              dy={10}
              tickFormatter={(val) => {
                try {
                  const d = new Date(val);
                  return isNaN(d.getTime()) ? val : new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(d);
                } catch(e) {
                  return val;
                }
              }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#9ca3af', fontSize: 12 }}
              tickFormatter={(val) => '$' + val}
            />
            <Tooltip content={<CustomTooltip />} />

            <Area
              type="monotone"
              dataKey="Actual"
              stroke="#3b82f6"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorActual)"
            />

            <Area
              type="monotone"
              dataKey="Predicted"
              stroke="#a855f7"
              strokeWidth={2}
              strokeDasharray="5 5"
              fillOpacity={1}
              fill="url(#colorPredicted)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default PredictiveAreaChart;
