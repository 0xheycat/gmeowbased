/**
 * Quest Analytics Dashboard - Phase 5.2
 * 
 * @component
 * Template: trezoadmin-41/Analytics (50% adaptation)
 * Features: Metric cards, completion charts, difficulty breakdown, top quests
 * 
 * Adaptation:
 * - ApexCharts → Recharts (better TypeScript support)
 * - MUI → Tailwind CSS
 * - Removed complex gradients for performance
 * - Simplified chart configurations
 * 
 * Usage:
 * <QuestAnalyticsDashboard questData={quests} />
 */

'use client';

import { useMemo } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import PeopleIcon from '@mui/icons-material/People';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils/utils';
import { AnalyticsDashboardSkeleton } from './skeletons';
import { AnalyticsDashboardEmptyState, ErrorState } from './empty-states';

interface QuestAnalyticsData {
  totalQuests: number;
  completedQuests: number;
  activeParticipants: number;
  avgCompletionTime: number; // in minutes
  completionTrend: number; // percentage change
  participantTrend: number; // percentage change
}

interface QuestAnalyticsDashboardProps {
  data?: QuestAnalyticsData;
  isLoading?: boolean;
  error?: string;
  onRetry?: () => void;
  className?: string;
}

// Sample data for demo
const defaultData: QuestAnalyticsData = {
  totalQuests: 6,
  completedQuests: 234,
  activeParticipants: 1567,
  avgCompletionTime: 15,
  completionTrend: 12.5,
  participantTrend: 8.3,
};

// Completion data over time (last 7 days)
const completionData = [
  { day: 'Mon', completions: 25 },
  { day: 'Tue', completions: 32 },
  { day: 'Wed', completions: 28 },
  { day: 'Thu', completions: 38 },
  { day: 'Fri', completions: 42 },
  { day: 'Sat', completions: 35 },
  { day: 'Sun', completions: 34 },
];

// Difficulty distribution
const difficultyData = [
  { name: 'Beginner', value: 3, color: '#10b981' },
  { name: 'Intermediate', value: 2, color: '#f59e0b' },
  { name: 'Advanced', value: 1, color: '#ef4444' },
];

export default function QuestAnalyticsDashboard({
  data = defaultData,
  isLoading = false,
  error,
  onRetry,
  className,
}: QuestAnalyticsDashboardProps) {
  const completionRate = useMemo(() => {
    return ((data.completedQuests / (data.totalQuests * data.activeParticipants)) * 100).toFixed(1);
  }, [data]);

  // Show loading skeleton
  if (isLoading) {
    return <AnalyticsDashboardSkeleton />;
  }

  // Show error state
  const prefersReducedMotion = useReducedMotion();

  if (error) {
    return (
      <ErrorState
        message={error}
        onRetry={onRetry}
      />
    );
  }

  // Show empty state if no data
  if (data.totalQuests === 0) {
    return <AnalyticsDashboardEmptyState />;
  }

  const metrics = [
    {
      title: 'Total Quests',
      value: data.totalQuests.toString(),
      icon: <EmojiEventsIcon className="w-5 h-5" />,
      iconBgColor: 'bg-primary-100 dark:bg-primary-900/30',
      iconColor: 'text-primary-600 dark:text-primary-400',
    },
    {
      title: 'Quest Completions',
      value: data.completedQuests.toString(),
      trend: data.completionTrend,
      icon: <CheckCircleIcon className="w-5 h-5" />,
      iconBgColor: 'bg-green-100 dark:bg-green-900/30',
      iconColor: 'text-green-600 dark:text-green-400',
    },
    {
      title: 'Active Participants',
      value: data.activeParticipants.toLocaleString(),
      trend: data.participantTrend,
      icon: <PeopleIcon className="w-5 h-5" />,
      iconBgColor: 'bg-blue-100 dark:bg-blue-900/30',
      iconColor: 'text-blue-600 dark:text-blue-400',
    },
    {
      title: 'Avg Completion Time',
      value: `${data.avgCompletionTime}m`,
      icon: <AccessTimeIcon className="w-5 h-5" />,
      iconBgColor: 'bg-purple-100 dark:bg-purple-900/30',
      iconColor: 'text-purple-600 dark:text-purple-400',
    },
  ];

  return (
    <>
      {/* Skip to content link for screen readers */}
      <a
        href="#analytics-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary-600 focus:text-white focus:rounded-lg"
      >
        Skip to analytics content
      </a>
      
      <div id="analytics-content" className={cn('space-y-6', className)} role="region" aria-label="Quest analytics dashboard">
        {/* Metric Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" role="group" aria-label="Quest metrics">
        {metrics.map((metric, index) => (
          <motion.div
            key={metric.title}
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={prefersReducedMotion ? { duration: 0 } : {
              delay: index * 0.1,
              duration: 0.3,
              ease: 'easeOut',
            }}
          >
            <MetricCard {...metric} index={index} />
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Completion Chart */}
        <motion.div
          initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={prefersReducedMotion ? { duration: 0 } : {
            delay: 0.5,
            duration: 0.4,
            ease: 'easeOut',
          }}
          className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6"
          role="img"
          aria-label="Line chart showing quest completions over the last 7 days"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4" id="completion-chart-title">
            Quest Completions (Last 7 Days)
          </h3>
          <ResponsiveContainer width="100%" height={250} aria-labelledby="completion-chart-title">
            <LineChart data={completionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="day" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
              />
              <Line
                type="monotone"
                dataKey="completions"
                stroke="#6366f1"
                strokeWidth={2}
                dot={{ fill: '#6366f1', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Difficulty Distribution */}
        <motion.div
          initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={prefersReducedMotion ? { duration: 0 } : {
            delay: 0.6,
            duration: 0.4,
            ease: 'easeOut',
          }}
          className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6"
          role="img"
          aria-label="Pie chart showing distribution of quests by difficulty level"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4" id="difficulty-chart-title">
            Quest Difficulty Distribution
          </h3>
          <ResponsiveContainer width="100%" height={250} aria-labelledby="difficulty-chart-title">
            <PieChart>
              <Pie
                data={difficultyData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={5}
                dataKey="value"
              >
                {difficultyData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend
                verticalAlign="bottom"
                height={36}
                formatter={(value, entry: any) => `${value} (${entry.payload.value})`}
              />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Completion Rate Card */}
      <motion.div
        initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={prefersReducedMotion ? { duration: 0 } : {
          delay: 0.7,
          duration: 0.4,
          ease: 'easeOut',
        }}
        className="bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl p-6 text-white"
        role="article"
        aria-label={`Overall quest completion rate: ${completionRate} percent`}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-primary-100 text-sm mb-1" id="completion-rate-label">Overall Completion Rate</p>
            <h2 className="text-4xl font-bold" aria-labelledby="completion-rate-label">{completionRate}%</h2>
            <p className="text-primary-100 text-sm mt-2">
              Based on {data.completedQuests} completions from {data.activeParticipants.toLocaleString()} participants
            </p>
          </div>
          <div className="hidden sm:block">
            <CheckCircleIcon className="w-16 h-16 opacity-20" />
          </div>
        </div>
      </motion.div>
      </div>
    </>
  );
}

// Metric Card Component
interface MetricCardProps {
  title: string;
  value: string;
  trend?: number;
  icon: React.ReactNode;
  iconBgColor: string;
  iconColor: string;
  index?: number;
}

function MetricCard({ title, value, trend, icon, iconBgColor, iconColor, index = 0 }: MetricCardProps) {
  const prefersReducedMotion = useReducedMotion();
  const cardId = `metric-card-${index}`;
  const trendId = `trend-${index}`;

  return (
    <motion.div
      whileHover={prefersReducedMotion ? undefined : {
        y: -4,
        transition: { duration: 0.2 },
      }}
      className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 hover:shadow-lg transition-shadow"
      role="article"
      aria-label={`${title}: ${value}${trend !== undefined ? `, trending ${trend >= 0 ? 'up' : 'down'} by ${Math.abs(trend)} percent` : ''}`}
      id={cardId}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={cn('p-3 rounded-lg', iconBgColor, iconColor)} aria-hidden="true">
          {icon}
        </div>
        {trend !== undefined && (
          <div 
            id={trendId}
            className={cn('flex items-center gap-1 text-sm font-medium', trend >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}
            aria-label={`Trend: ${trend >= 0 ? 'increasing' : 'decreasing'} by ${Math.abs(trend)} percent`}
          >
            {trend >= 0 ? (
              <TrendingUpIcon className="w-4 h-4" aria-hidden="true" />
            ) : (
              <TrendingDownIcon className="w-4 h-4" aria-hidden="true" />
            )}
            <span aria-hidden="true">{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1" id={`${cardId}-label`}>{title}</p>
      <p className="text-2xl font-bold text-gray-900 dark:text-white" aria-labelledby={`${cardId}-label`}>{value}</p>
    </motion.div>
  );
}
