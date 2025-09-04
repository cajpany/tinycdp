import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { getBackendClient, handleApiError, apiKeyManager } from '@/lib/api';
import { ArrowLeft, User, Calendar, Activity, Zap, Database, Clock } from 'lucide-react';
import { ApiKeyRequired } from '@/components/ApiKeyRequired';

export function UserDetail() {
  const { userId } = useParams<{ userId: string }>();
  const backend = getBackendClient();
  const hasApiKey = apiKeyManager.hasKey();

  const { data: user, isLoading, error } = useQuery({
    queryKey: ['user-detail', userId],
    queryFn: async () => {
      if (!userId) throw new Error('User ID is required');
      try {
        return await backend.admin.getUserDetail({ userId });
      } catch (error) {
        handleApiError(error);
        throw error;
      }
    },
    enabled: !!userId && hasApiKey,
  });

  if (!hasApiKey) {
    return <ApiKeyRequired pageName="User Details" />;
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="outline" asChild>
            <Link to="/users">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Users
            </Link>
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">User Not Found</h1>
        </div>
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-red-600">
              Failed to load user details. The user may not exist.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button variant="outline" asChild>
          <Link to="/users">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Users
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Details</h1>
          {userId && (
            <p className="text-gray-600 mt-1 font-mono text-sm">{userId}</p>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-6 w-48 mb-4" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </CardContent>
          </Card>
        </div>
      ) : user ? (
        <div className="space-y-6">
          {/* User Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="w-5 h-5 mr-2" />
                  Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">User ID</p>
                  <p className="font-mono text-sm">{user.user.id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Created</p>
                  <p className="text-sm">{new Date(user.user.created_at).toLocaleString()}</p>
                </div>
                {user.user.aliases.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Aliases</p>
                    <div className="space-y-1">
                      {user.user.aliases.map((alias, index) => (
                        <Badge key={index} variant="outline" className="text-xs mr-2">
                          {alias.kind}: {alias.value}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="w-5 h-5 mr-2" />
                  Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Total Events</p>
                    <p className="text-2xl font-bold">{user.user.eventCounts.total}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Last 24h</p>
                    <p className="text-2xl font-bold">{user.user.eventCounts.last_24h}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Last 7d</p>
                    <p className="text-xl font-semibold">{user.user.eventCounts.last_7d}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Last 30d</p>
                    <p className="text-xl font-semibold">{user.user.eventCounts.last_30d}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Database className="w-5 h-5 mr-2" />
                  Segments
                </CardTitle>
              </CardHeader>
              <CardContent>
                {user.user.segments.length > 0 ? (
                  <div className="space-y-2">
                    {user.user.segments.map((segment) => (
                      <div key={segment.key} className="flex justify-between items-center">
                        <span className="text-sm">{segment.key}</span>
                        <Badge variant={segment.inSegment ? "default" : "secondary"}>
                          {segment.inSegment ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No segments computed</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Traits */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Zap className="w-5 h-5 mr-2" />
                Computed Traits
              </CardTitle>
              <CardDescription>
                User traits calculated from events and profile data
              </CardDescription>
            </CardHeader>
            <CardContent>
              {user.user.traits.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {user.user.traits.map((trait) => (
                    <div key={trait.key} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium">{trait.key}</h4>
                        <Badge variant="outline" className="text-xs">
                          {typeof trait.value}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        Value: <code className="bg-gray-100 px-1 rounded">
                          {JSON.stringify(trait.value)}
                        </code>
                      </p>
                      <p className="text-xs text-gray-500">
                        Updated: {new Date(trait.updated_at).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No traits computed for this user</p>
              )}
            </CardContent>
          </Card>

          {/* Recent Events */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="w-5 h-5 mr-2" />
                Recent Events
              </CardTitle>
              <CardDescription>
                Last 50 events for this user
              </CardDescription>
            </CardHeader>
            <CardContent>
              {user.user.recentEvents.length > 0 ? (
                <div className="space-y-4">
                  {user.user.recentEvents.map((event) => (
                    <div key={event.id} className="border-l-4 border-blue-200 pl-4 py-2">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium">{event.name}</h4>
                        <Badge variant="outline" className="text-xs">
                          {new Date(event.ts).toLocaleString()}
                        </Badge>
                      </div>
                      {event.props && (
                        <pre className="text-xs text-gray-600 bg-gray-50 p-2 rounded overflow-x-auto">
                          {JSON.stringify(event.props, null, 2)}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No events found for this user</p>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
