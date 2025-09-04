import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { getBackendClient, handleApiError, apiKeyManager } from '@/lib/api';
import { Search, User, Calendar, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ApiKeyRequired } from '@/components/ApiKeyRequired';

export function Users() {
  const [searchQuery, setSearchQuery] = useState('');
  const backend = getBackendClient();
  const hasApiKey = apiKeyManager.hasKey();

  const { data: users, isLoading, refetch } = useQuery({
    queryKey: ['users', searchQuery],
    queryFn: async () => {
      try {
        return await backend.admin.searchUsers({
          query: searchQuery || undefined,
          limit: 50,
        });
      } catch (error) {
        handleApiError(error);
        throw error;
      }
    },
    enabled: hasApiKey,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    refetch();
  };

  if (!hasApiKey) {
    return <ApiKeyRequired pageName="Users" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Users</h1>
        <p className="text-gray-600 mt-2">
          Search and explore user profiles, events, and segments
        </p>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSearch} className="flex space-x-2">
            <div className="flex-1">
              <Input
                placeholder="Search by user ID, device ID, or external ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button type="submit">
              <Search className="w-4 h-4 mr-2" />
              Search
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Results */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-64" />
                  </div>
                  <Skeleton className="h-8 w-24" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {users?.users.map((user) => (
            <Card key={user.id}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <User className="w-5 h-5 text-gray-400" />
                      <span className="font-mono text-sm text-gray-600">
                        {user.id}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4" />
                        <span>Created {new Date(user.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Activity className="w-4 h-4" />
                        <span>{user.eventCount} events</span>
                      </div>
                      {user.lastEventTime && (
                        <span>
                          Last active {new Date(user.lastEventTime).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    {/* Aliases */}
                    {user.aliases.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {user.aliases.map((alias, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {alias.kind}: {alias.value}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Active Segments */}
                    {user.activeSegments.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {user.activeSegments.map((segment) => (
                          <Badge key={segment} variant="secondary" className="text-xs">
                            {segment}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <Button asChild variant="outline">
                    <Link to={`/users/${user.id}`}>
                      View Details
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )) || (
            <Card>
              <CardContent className="py-8">
                <p className="text-center text-gray-500">
                  {searchQuery
                    ? `No users found matching "${searchQuery}"`
                    : 'Enter a search query to find users'}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Results Summary */}
      {users && users.users.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-center text-sm text-gray-600">
              <span>
                Showing {users.users.length} of {users.total} users
              </span>
              {users.hasMore && (
                <span className="text-blue-600">
                  More results available - refine your search
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
