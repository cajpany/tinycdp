import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { getBackendClient, handleApiError, apiKeyManager } from '@/lib/api';
import { Users, Activity, Database, Flag, TrendingUp, Clock, AlertCircle, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Dashboard() {
  const backend = getBackendClient();
  const hasApiKey = apiKeyManager.hasKey();

  const { data: metrics, isLoading, error } = useQuery({
    queryKey: ['metrics'],
    queryFn: async () => {
      try {
        return await backend.admin.getSystemMetrics({});
      } catch (error) {
        handleApiError(error);
        throw error;
      }
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    enabled: hasApiKey, // Only run if we have an API key
  });

  // Show API key setup message if no key is configured
  if (!hasApiKey) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              To access the dashboard, please configure your API key first.
            </span>
            <Button asChild variant="outline" size="sm">
              <Link to="/settings">
                <Settings className="w-4 h-4 mr-2" />
                Go to Settings
              </Link>
            </Button>
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
            <CardDescription>
              Follow these steps to set up your TinyCDP console
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium">1. Create an Admin API Key</h4>
              <p className="text-sm text-gray-600">
                Run this command in your TinyCDP backend directory:
              </p>
              <code className="block bg-gray-100 p-2 rounded text-sm">
                npx tsx scripts/create-admin-key.ts
              </code>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">2. Configure the API Key</h4>
              <p className="text-sm text-gray-600">
                Copy the generated API key and paste it in the Settings page.
              </p>
              <Button asChild variant="outline">
                <Link to="/settings">
                  <Settings className="w-4 h-4 mr-2" />
                  Open Settings
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <Card>
          <CardContent className="py-8">
            <div className="text-center space-y-4">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
              <div>
                <p className="text-red-600 font-medium">Failed to load dashboard data</p>
                <p className="text-sm text-gray-500 mt-1">
                  Check your API key configuration or try refreshing the page
                </p>
              </div>
              <Button asChild variant="outline">
                <Link to="/settings">
                  <Settings className="w-4 h-4 mr-2" />
                  Check Settings
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stats = [
    {
      title: 'Total Users',
      value: metrics?.metrics.users.total || 0,
      subtitle: `${metrics?.metrics.users.activeLastDay || 0} active today`,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Events (24h)',
      value: metrics?.metrics.events.lastDay || 0,
      subtitle: `${metrics?.metrics.events.total || 0} total`,
      icon: Activity,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Trait Definitions',
      value: metrics?.metrics.traits.definitionCount || 0,
      subtitle: `${metrics?.metrics.traits.computedCount || 0} computed values`,
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: 'Segment Definitions',
      value: metrics?.metrics.segments.definitionCount || 0,
      subtitle: `${metrics?.metrics.segments.computedCount || 0} memberships`,
      icon: Database,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
    {
      title: 'Feature Flags',
      value: metrics?.metrics.flags.definitionCount || 0,
      subtitle: 'Active flags',
      icon: Flag,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100',
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Overview of your TinyCDP instance
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    {stat.title}
                  </p>
                  {isLoading ? (
                    <Skeleton className="h-8 w-16 mt-2" />
                  ) : (
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {stat.value.toLocaleString()}
                    </p>
                  )}
                  {isLoading ? (
                    <Skeleton className="h-4 w-24 mt-1" />
                  ) : (
                    <p className="text-xs text-gray-500 mt-1">
                      {stat.subtitle}
                    </p>
                  )}
                </div>
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Additional Info Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="w-5 h-5 mr-2" />
              System Activity
            </CardTitle>
            <CardDescription>
              User and event activity over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Active Users (30d)</span>
                  <Badge variant="secondary">
                    {metrics?.metrics.users.activeLastMonth || 0}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Active Users (7d)</span>
                  <Badge variant="secondary">
                    {metrics?.metrics.users.activeLastWeek || 0}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Events (7d)</span>
                  <Badge variant="secondary">
                    {metrics?.metrics.events.lastWeek || 0}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Events (30d)</span>
                  <Badge variant="secondary">
                    {metrics?.metrics.events.lastMonth || 0}
                  </Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Events */}
        <Card>
          <CardHeader>
            <CardTitle>Top Event Types</CardTitle>
            <CardDescription>
              Most frequent events (last 30 days)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : (
              <div className="space-y-3">
                {metrics?.metrics.events.topEventTypes.slice(0, 5).map((event, index) => (
                  <div key={event.name} className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">
                      {index + 1}. {event.name}
                    </span>
                    <Badge variant="outline">
                      {event.count.toLocaleString()}
                    </Badge>
                  </div>
                )) || (
                  <p className="text-sm text-gray-500">No events found</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Database Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Database Statistics</CardTitle>
          <CardDescription>
            Row counts for each table
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-3 gap-4">
              {Array.from({ length: 9 }).map((_, i) => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {metrics?.metrics.database.tables.map((table) => (
                <div key={table.name} className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 capitalize">
                    {table.name.replace(/_/g, ' ')}
                  </span>
                  <Badge variant="outline">
                    {table.rowCount.toLocaleString()}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
